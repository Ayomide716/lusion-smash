// Presence: a tiny WebSocket hub that shares anonymous cursor positions
// between people viewing the portfolio at the same time, plus a live count.
//
// Environment:
//
//	PORT             listen port (Render sets this)
//	ALLOWED_ORIGINS  comma-separated origin host patterns allowed to connect,
//	                 e.g. "ayomide.dev,*.vercel.app,localhost:3000"
//	MAX_CLIENTS      simultaneous connections (default 200)
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/coder/websocket"
)

func main() {
	port := env("PORT", "8080")
	maxClients, err := strconv.Atoi(env("MAX_CLIENTS", "200"))
	if err != nil || maxClients < 1 {
		log.Fatalf("MAX_CLIENTS must be a positive integer")
	}
	origins := splitList(os.Getenv("ALLOWED_ORIGINS"))
	if len(origins) == 0 {
		log.Printf("warning: ALLOWED_ORIGINS is empty, so browsers on other sites cannot connect")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	hub := NewHub(maxClients)
	go hub.Run(ctx)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           NewServer(hub, origins),
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdown)
	}()
	log.Printf("presence listening on :%s (max %d clients)", port, maxClients)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

// NewServer wires the routes: /ws for browsers, /count and /healthz for checks.
func NewServer(hub *Hub, origins []string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, map[string]bool{"ok": true})
	})
	mux.HandleFunc("GET /count", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		writeJSON(w, map[string]int{"n": hub.Count()})
	})
	mux.HandleFunc("GET /ws", func(w http.ResponseWriter, r *http.Request) {
		serveWS(hub, origins, w, r)
	})
	return mux
}

func serveWS(hub *Hub, origins []string, w http.ResponseWriter, r *http.Request) {
	c := hub.Join()
	if c == nil {
		http.Error(w, "busy, try again later", http.StatusServiceUnavailable)
		return
	}
	defer hub.Leave(c)

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{OriginPatterns: origins})
	if err != nil {
		return // Accept has already written the error response (e.g. 403 for a bad origin)
	}
	conn.SetReadLimit(maxMessage)
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Writer: forward snapshots and ping so proxies keep the socket open.
	go func() {
		defer cancel()
		ping := time.NewTicker(25 * time.Second)
		defer ping.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case msg := <-c.send:
				wctx, done := context.WithTimeout(ctx, 3*time.Second)
				err := conn.Write(wctx, websocket.MessageText, msg)
				done()
				if err != nil {
					return
				}
			case <-ping.C:
				pctx, done := context.WithTimeout(ctx, 10*time.Second)
				err := conn.Ping(pctx)
				done()
				if err != nil {
					return
				}
			}
		}
	}()

	for {
		_, raw, err := conn.Read(ctx)
		if err != nil {
			conn.CloseNow()
			return
		}
		if !hub.Handle(c, raw) {
			conn.Close(websocket.StatusPolicyViolation, "too many messages")
			return
		}
	}
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(w).Encode(v)
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if p := strings.TrimSpace(part); p != "" {
			// Accept full origins too ("https://ayomide.dev"): patterns match hosts.
			p = strings.TrimPrefix(strings.TrimPrefix(p, "https://"), "http://")
			out = append(out, strings.TrimSuffix(p, "/"))
		}
	}
	return out
}
