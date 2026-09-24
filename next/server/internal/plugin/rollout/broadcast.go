package rollout

import (
	"context"
	"encoding/json"
	"log/slog"
	"sort"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grpcruntime"
)

// broadcastMaxInflight bounds concurrent OnBroadcast deliveries per plugin;
// messages beyond are dropped (broadcasts are best effort).
const broadcastMaxInflight = 32

// broadcastHub subscribes to plugin:broadcast:{key} for every plugin served
// on this node that declares app.broadcast.v1, and hands messages published
// by other nodes to the local serving instance.
type broadcastHub struct {
	bus    core.Bus
	bootID string
	lookup func(key string) Instance // serving instance of key, nil if none
	log    *slog.Logger

	mu       sync.Mutex
	subs     map[string]func()
	inflight map[string]int
	closed   bool
	wg       sync.WaitGroup
}

func newBroadcastHub(bus core.Bus, bootID string, lookup func(string) Instance, log *slog.Logger) *broadcastHub {
	return &broadcastHub{bus: bus, bootID: bootID, lookup: lookup, log: log,
		subs: map[string]func(){}, inflight: map[string]int{}}
}

// sync subscribes to the channels of keys and drops the other ones.
func (h *broadcastHub) sync(keys []string) {
	if h == nil || h.bus == nil {
		return
	}
	want := map[string]bool{}
	for _, k := range keys {
		want[k] = true
	}
	h.mu.Lock()
	if h.closed {
		h.mu.Unlock()
		return
	}
	var add []string
	var drop []func()
	for k := range want {
		if _, ok := h.subs[k]; !ok {
			add = append(add, k)
		}
	}
	for k, cancel := range h.subs {
		if !want[k] {
			drop = append(drop, cancel)
			delete(h.subs, k)
		}
	}
	h.mu.Unlock()
	for _, cancel := range drop {
		cancel()
	}
	sort.Strings(add)
	for _, k := range add {
		key := k
		cancel := h.bus.Subscribe(grpcruntime.BroadcastChannel(key), func(payload []byte) { h.handle(key, payload) })
		h.mu.Lock()
		if h.closed || h.subs[key] != nil {
			h.mu.Unlock()
			cancel()
			continue
		}
		h.subs[key] = cancel
		h.mu.Unlock()
	}
}

// subscribed lists the keys with an active subscription (tests).
func (h *broadcastHub) subscribed() []string {
	h.mu.Lock()
	defer h.mu.Unlock()
	out := make([]string, 0, len(h.subs))
	for k := range h.subs {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}

// handle runs on the bus receive goroutine and must not block: delivery
// happens on its own goroutine with grpcruntime.BroadcastTimeout.
func (h *broadcastHub) handle(key string, payload []byte) {
	var msg grpcruntime.BroadcastMessage
	if err := json.Unmarshal(payload, &msg); err != nil || msg.Topic == "" {
		h.log.Warn("plugin broadcast: malformed message", "plugin", key)
		return
	}
	if msg.SourceBootID == h.bootID {
		return // published by this node
	}
	inst := h.lookup(key)
	if inst == nil {
		return
	}
	r, ok := inst.(broadcastReceiver)
	if !ok || !r.HandlesBroadcast() {
		return
	}
	h.mu.Lock()
	if h.closed {
		h.mu.Unlock()
		return
	}
	if h.inflight[key] >= broadcastMaxInflight {
		h.mu.Unlock()
		h.log.Warn("plugin broadcast dropped: too many deliveries in flight", "plugin", key, "topic", msg.Topic)
		return
	}
	h.inflight[key]++
	h.wg.Add(1)
	h.mu.Unlock()
	go func() {
		defer func() {
			h.mu.Lock()
			h.inflight[key]--
			if h.inflight[key] <= 0 {
				delete(h.inflight, key)
			}
			h.mu.Unlock()
			h.wg.Done()
		}()
		ctx, cancel := context.WithTimeout(context.Background(), grpcruntime.BroadcastTimeout)
		defer cancel()
		if err := r.OnBroadcast(ctx, msg); err != nil {
			h.log.Warn("plugin broadcast delivery failed", "plugin", key, "topic", msg.Topic,
				"source_node", msg.SourceNodeID, "err", err)
		}
	}()
}

// close drops every subscription and waits for running deliveries.
func (h *broadcastHub) close() {
	if h == nil {
		return
	}
	h.mu.Lock()
	h.closed = true
	subs := h.subs
	h.subs = map[string]func(){}
	h.mu.Unlock()
	for _, cancel := range subs {
		cancel()
	}
	h.wg.Wait()
}
