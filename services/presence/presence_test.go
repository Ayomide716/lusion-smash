package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func startServer(t *testing.T, maxClients int, origins ...string) (*Hub, *httptest.Server) {
	t.Helper()
	hub := NewHub(maxClients)
	ctx, cancel := context.WithCancel(context.Background())
	go hub.Run(ctx)
	srv := httptest.NewServer(NewServer(hub, origins))
	t.Cleanup(func() {
		srv.Close()
		cancel()
	})
	return hub, srv
}

func dial(t *testing.T, srv *httptest.Server, origin string) (*websocket.Conn, *http.Response, error) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	h := http.Header{}
	if origin != "" {
		h.Set("Origin", origin)
	}
	return websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http")+"/ws", &websocket.DialOptions{HTTPHeader: h})
}

func mustDial(t *testing.T, srv *httptest.Server) *websocket.Conn {
	t.Helper()
	c, _, err := dial(t, srv, "https://ayomide.dev")
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	t.Cleanup(func() { c.CloseNow() })
	return c
}

// next reads snapshots until one satisfies ok, or fails after a timeout.
func next(t *testing.T, c *websocket.Conn, ok func(snapshot) bool) snapshot {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	for {
		_, raw, err := c.Read(ctx)
		if err != nil {
			t.Fatalf("waiting for snapshot: %v", err)
		}
		var s snapshot
		if err := json.Unmarshal(raw, &s); err != nil {
			t.Fatalf("bad snapshot %q: %v", raw, err)
		}
		if ok(s) {
			return s
		}
	}
}

func send(t *testing.T, c *websocket.Conn, msg string) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := c.Write(ctx, websocket.MessageText, []byte(msg)); err != nil {
		t.Fatalf("write: %v", err)
	}
}

func TestVisitorsSeeEachOther(t *testing.T) {
	_, srv := startServer(t, 10, "ayomide.dev")
	a := mustDial(t, srv)
	b := mustDial(t, srv)

	next(t, b, func(s snapshot) bool { return s.N == 2 })
	send(t, a, `{"x":0.25,"y":-0.5}`)
	s := next(t, b, func(s snapshot) bool { return len(s.P) == 1 })
	if s.P[0][1] != 0.25 || s.P[0][2] != -0.5 {
		t.Fatalf("b should see a's cursor at (0.25,-0.5), got %v", s.P)
	}
	// Nobody is sent their own cursor.
	next(t, a, func(s snapshot) bool { return s.N == 2 && len(s.P) == 0 })

	// Leaving the page hides the cursor; disconnecting lowers the count.
	send(t, a, `{"x":null}`)
	next(t, b, func(s snapshot) bool { return len(s.P) == 0 })
	a.Close(websocket.StatusNormalClosure, "")
	next(t, b, func(s snapshot) bool { return s.N == 1 })
}

func TestForeignOriginsAreRejected(t *testing.T) {
	_, srv := startServer(t, 10, "ayomide.dev", "*.vercel.app")
	if _, res, err := dial(t, srv, "https://evil.example"); err == nil || res == nil || res.StatusCode != http.StatusForbidden {
		t.Fatalf("expected 403 for a foreign origin, got err=%v res=%v", err, res)
	}
	c, _, err := dial(t, srv, "https://preview-123.vercel.app")
	if err != nil {
		t.Fatalf("wildcard origin should be allowed: %v", err)
	}
	c.CloseNow()
}

func TestConnectionCap(t *testing.T) {
	_, srv := startServer(t, 2, "ayomide.dev")
	mustDial(t, srv)
	mustDial(t, srv)
	if _, res, err := dial(t, srv, "https://ayomide.dev"); err == nil || res == nil || res.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 when full, got err=%v res=%v", err, res)
	}
}

func TestGarbageAndOutOfRangeInput(t *testing.T) {
	_, srv := startServer(t, 10, "ayomide.dev")
	a := mustDial(t, srv)
	b := mustDial(t, srv)
	for _, junk := range []string{`hello`, `{"x":"a","y":1}`, `{"x":1e999,"y":0}`, `[]`} {
		send(t, a, junk)
	}
	send(t, a, `{"x":7,"y":-9}`) // clamped to the viewport
	s := next(t, b, func(s snapshot) bool { return len(s.P) == 1 })
	if s.P[0][1] != 1 || s.P[0][2] != -1 {
		t.Fatalf("expected clamped (1,-1), got %v", s.P[0])
	}
	// Oversized messages close the connection.
	send(t, a, `{"x":0.1,"y":0.1,"pad":"`+strings.Repeat("x", 200)+`"}`)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	for {
		if _, _, err := a.Read(ctx); err != nil {
			break
		}
	}
	next(t, b, func(s snapshot) bool { return s.N == 1 })
}

func TestFloodingClientIsDisconnected(t *testing.T) {
	hub, srv := startServer(t, 10, "ayomide.dev")
	a := mustDial(t, srv)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	for i := 0; i < maxDropped+rateBurst+50; i++ {
		if a.Write(ctx, websocket.MessageText, []byte(`{"x":0,"y":0}`)) != nil {
			break
		}
	}
	for {
		if _, _, err := a.Read(ctx); err != nil {
			if websocket.CloseStatus(err) != websocket.StatusPolicyViolation && ctx.Err() != nil {
				t.Fatalf("flooding client should be closed, got %v", err)
			}
			break
		}
	}
	deadline := time.Now().Add(2 * time.Second)
	for hub.Count() != 0 && time.Now().Before(deadline) {
		time.Sleep(20 * time.Millisecond)
	}
	if hub.Count() != 0 {
		t.Fatalf("flooder should have been removed, count=%d", hub.Count())
	}
}

func TestRateLimitRefills(t *testing.T) {
	h := NewHub(1)
	now := time.Unix(0, 0)
	h.now = func() time.Time { return now }
	c := h.Join()
	for i := 0; i < rateBurst; i++ {
		h.Handle(c, []byte(`{"x":0,"y":0}`))
	}
	h.Handle(c, []byte(`{"x":0.5,"y":0}`))
	if c.x == 0.5 {
		t.Fatal("update beyond the burst should be dropped")
	}
	now = now.Add(time.Second)
	h.Handle(c, []byte(`{"x":0.5,"y":0}`))
	if c.x != 0.5 {
		t.Fatal("tokens should refill over time")
	}
}

func TestTapsReachOthersButNotTheTapper(t *testing.T) {
	_, srv := startServer(t, 10, "ayomide.dev")
	a := mustDial(t, srv)
	b := mustDial(t, srv)
	next(t, a, func(s snapshot) bool { return s.N == 2 })
	next(t, b, func(s snapshot) bool { return s.N == 2 })

	send(t, a, `{"t":[0.4,-0.2]}`)
	s := next(t, b, func(s snapshot) bool { return len(s.R) > 0 })
	if len(s.R) != 1 || s.R[0] != [2]float64{0.4, -0.2} {
		t.Fatalf("b should get a's tap at (0.4,-0.2), got %v", s.R)
	}
	// The tap is not a cursor: it doesn't show a ring for a.
	if len(s.P) != 0 {
		t.Fatalf("a tap must not create a cursor, got %v", s.P)
	}
	// a's own snapshot for that change carries no taps.
	send(t, b, `{"x":0.1,"y":0.1}`)
	own := next(t, a, func(s snapshot) bool { return len(s.P) == 1 })
	if len(own.R) != 0 {
		t.Fatalf("a should not receive its own tap, got %v", own.R)
	}
}

func TestTapLimitsAndJunk(t *testing.T) {
	h := NewHub(2)
	now := time.Unix(0, 0)
	h.now = func() time.Time { return now }
	c := h.Join()
	for _, junk := range []string{`{"t":[1e999,0]}`, `{"t":"x"}`, `{"t":[1]}`} {
		h.Handle(c, []byte(junk))
	}
	if len(h.taps) != 0 {
		t.Fatalf("junk taps should be ignored, got %v", h.taps)
	}
	h.Handle(c, []byte(`{"t":[5,-5]}`))
	h.Handle(c, []byte(`{"t":[0,0]}`)) // too soon after the first
	if len(h.taps) != 1 || h.taps[0].x != 1 || h.taps[0].y != -1 {
		t.Fatalf("expected one clamped tap, got %v", h.taps)
	}
	now = now.Add(tapEvery)
	h.Handle(c, []byte(`{"t":[0,0]}`))
	if len(h.taps) != 2 {
		t.Fatalf("a tap after the interval should count, got %d", len(h.taps))
	}
}

func TestCountEndpoint(t *testing.T) {
	_, srv := startServer(t, 10, "ayomide.dev")
	mustDial(t, srv)
	res, err := http.Get(srv.URL + "/count")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var body map[string]int
	_ = json.NewDecoder(res.Body).Decode(&body)
	if body["n"] != 1 || res.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("unexpected /count: %v %v", body, res.Header)
	}
}

func TestSplitList(t *testing.T) {
	got := splitList(" https://ayomide.dev/ , *.vercel.app,,http://localhost:3000")
	want := []string{"ayomide.dev", "*.vercel.app", "localhost:3000"}
	if strings.Join(got, "|") != strings.Join(want, "|") {
		t.Fatalf("got %v", got)
	}
}
