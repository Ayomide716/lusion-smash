package main

import (
	"context"
	"encoding/json"
	"math"
	"math/rand/v2"
	"sync"
	"time"
)

// Wire format (JSON, tiny on purpose):
//
//	client → server  {"x":0.12,"y":-0.4}   cursor in viewport NDC (-1..1, y up)
//	                 {"x":null}            cursor left the page
//	server → client  {"n":3,"p":[[id,x,y],...]}   visitors online and the
//	                                              other visitors' cursors
//
// Nothing else is exchanged: no names, no IPs, no page contents. Ids are
// random per connection and mean nothing outside it.

const (
	broadcastEvery = 100 * time.Millisecond // 10 Hz snapshots
	maxPeersSent   = 12                     // cursors per snapshot
	idleCursor     = 20 * time.Second       // stop showing a cursor that hasn't moved
	maxMessage     = 128                    // bytes per client message
	ratePerSecond  = 20                     // cursor updates allowed per second
	rateBurst      = 40
	maxDropped     = 400 // over-limit messages tolerated before disconnecting
)

type inbound struct {
	X *float64 `json:"x"`
	Y *float64 `json:"y"`
}

type snapshot struct {
	N int          `json:"n"`
	P [][3]float64 `json:"p"`
}

type client struct {
	id     uint32
	send   chan []byte // capacity 1: only the latest snapshot matters
	x, y   float64
	active bool
	moved  time.Time

	// Token bucket for cursor updates.
	tokens  float64
	refill  time.Time
	dropped int
}

type Hub struct {
	mu      sync.Mutex
	clients map[*client]struct{}
	max     int
	version uint64 // bumps on any change, so idle rooms send nothing
	now     func() time.Time
}

func NewHub(maxClients int) *Hub {
	return &Hub{clients: make(map[*client]struct{}), max: maxClients, now: time.Now}
}

// Join registers a client, or returns nil if the hub is full.
func (h *Hub) Join() *client {
	h.mu.Lock()
	defer h.mu.Unlock()
	if len(h.clients) >= h.max {
		return nil
	}
	now := h.now()
	c := &client{id: rand.Uint32() & 0xffffff, send: make(chan []byte, 1), tokens: rateBurst, refill: now}
	h.clients[c] = struct{}{}
	h.version++
	return c
}

func (h *Hub) Leave(c *client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		h.version++
	}
}

func (h *Hub) Count() int {
	h.mu.Lock()
	defer h.mu.Unlock()
	return len(h.clients)
}

// Handle applies one message from c. It returns false if the client should be
// disconnected for flooding.
func (h *Hub) Handle(c *client, raw []byte) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	now := h.now()
	c.tokens = math.Min(rateBurst, c.tokens+now.Sub(c.refill).Seconds()*ratePerSecond)
	c.refill = now
	if c.tokens < 1 {
		c.dropped++
		return c.dropped < maxDropped
	}
	c.tokens--

	var m inbound
	if json.Unmarshal(raw, &m) != nil {
		return true // ignore junk, but it still cost a token
	}
	if m.X == nil || m.Y == nil {
		if c.active {
			c.active = false
			h.version++
		}
		return true
	}
	x, y := *m.X, *m.Y
	if math.IsNaN(x) || math.IsNaN(y) || math.IsInf(x, 0) || math.IsInf(y, 0) {
		return true
	}
	c.x, c.y = clamp(x), clamp(y)
	c.active = true
	c.moved = now
	h.version++
	return true
}

func clamp(v float64) float64 {
	v = math.Max(-1, math.Min(1, v))
	return math.Round(v*1000) / 1000 // 3 decimals is plenty and keeps frames small
}

// Run sends each client a snapshot of everyone else whenever something changed.
func (h *Hub) Run(ctx context.Context) {
	tick := time.NewTicker(broadcastEvery)
	defer tick.Stop()
	var sent uint64
	idleSweep := time.Time{}
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
		h.mu.Lock()
		now := h.now()
		// Cursors going idle is a change too; check once a second.
		if now.Sub(idleSweep) > time.Second {
			idleSweep = now
			for c := range h.clients {
				if c.active && now.Sub(c.moved) > idleCursor {
					c.active = false
					h.version++
				}
			}
		}
		if h.version == sent {
			h.mu.Unlock()
			continue
		}
		sent = h.version
		n := len(h.clients)
		for c := range h.clients {
			snap := snapshot{N: n, P: make([][3]float64, 0, maxPeersSent)}
			for o := range h.clients {
				if o == c || !o.active {
					continue
				}
				snap.P = append(snap.P, [3]float64{float64(o.id), o.x, o.y})
				if len(snap.P) == maxPeersSent {
					break
				}
			}
			msg, _ := json.Marshal(snap)
			// Replace any unsent snapshot: a slow client just skips frames.
			select {
			case <-c.send:
			default:
			}
			c.send <- msg
		}
		h.mu.Unlock()
	}
}
