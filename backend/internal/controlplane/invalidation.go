package controlplane

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"

	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

const invalidationHistorySize = 4096

// InvalidationHub converts the backend's existing Redis auth invalidation
// channel into ordered data-plane events. A bounded history supports normal
// reconnects; a gap produces FULL_RESYNC so no stale authorization survives.
type InvalidationHub struct {
	cache service.APIKeyCache

	mu          sync.Mutex
	sequence    int64
	history     []*controlv1.InvalidationEvent
	subscribers map[chan *controlv1.InvalidationEvent]struct{}
	cancel      context.CancelFunc
	wg          sync.WaitGroup
}

func NewInvalidationHub(cache service.APIKeyCache) *InvalidationHub {
	return &InvalidationHub{cache: cache, subscribers: make(map[chan *controlv1.InvalidationEvent]struct{})}
}

func (h *InvalidationHub) Start(parent context.Context) {
	if h == nil || h.cache == nil || h.cancel != nil {
		return
	}
	ctx, cancel := context.WithCancel(parent)
	h.cancel = cancel
	h.wg.Add(1)
	go h.run(ctx)
}

func (h *InvalidationHub) Stop() {
	if h == nil {
		return
	}
	if h.cancel != nil {
		h.cancel()
	}
	h.wg.Wait()
	h.mu.Lock()
	for subscriber := range h.subscribers {
		close(subscriber)
		delete(h.subscribers, subscriber)
	}
	h.mu.Unlock()
}

func (h *InvalidationHub) run(ctx context.Context) {
	defer h.wg.Done()
	backoff := time.Second
	for ctx.Err() == nil {
		err := h.cache.SubscribeAuthCacheInvalidation(ctx, func(credentialDigest string) {
			if credentialDigest != "" {
				h.publish(controlv1.InvalidationKind_INVALIDATION_KIND_API_KEY, credentialDigest, "")
			}
		})
		if ctx.Err() != nil {
			return
		}
		if err == nil {
			err = errors.New("auth invalidation subscription closed")
		}
		// Redis Pub/Sub has no replay. Any disconnect may have lost an event,
		// therefore all connected and reconnecting data planes must resync.
		h.publish(controlv1.InvalidationKind_INVALIDATION_KIND_FULL_RESYNC, "", "")
		slog.Warn("data-plane auth invalidation bridge disconnected", "error", err, "retry_in", backoff)
		timer := time.NewTimer(backoff)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
		backoff *= 2
		if backoff > 30*time.Second {
			backoff = 30 * time.Second
		}
	}
}

func (h *InvalidationHub) publish(kind controlv1.InvalidationKind, subject, version string) {
	if h == nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.sequence++
	event := &controlv1.InvalidationEvent{
		Sequence:         h.sequence,
		Kind:             kind,
		Subject:          subject,
		Version:          version,
		OccurredAtUnixMs: time.Now().UnixMilli(),
	}
	h.history = append(h.history, event)
	if len(h.history) > invalidationHistorySize {
		h.history = append([]*controlv1.InvalidationEvent(nil), h.history[len(h.history)-invalidationHistorySize:]...)
	}
	for subscriber := range h.subscribers {
		select {
		case subscriber <- event:
		default:
			// A slow subscriber cannot block invalidation publication. Closing
			// forces it to reconnect; history or FULL_RESYNC repairs the gap.
			close(subscriber)
			delete(h.subscribers, subscriber)
		}
	}
}

func (h *InvalidationHub) subscribe(after int64) (<-chan *controlv1.InvalidationEvent, func()) {
	channel := make(chan *controlv1.InvalidationEvent, invalidationHistorySize+1)
	if h == nil {
		close(channel)
		return channel, func() {}
	}
	h.mu.Lock()
	if after > h.sequence {
		// The control-plane process restarted while the data plane retained a
		// sequence from the previous epoch. Advance past it and force a resync;
		// otherwise every new event would look stale forever.
		h.sequence = after + 1
		event := &controlv1.InvalidationEvent{
			Sequence:         h.sequence,
			Kind:             controlv1.InvalidationKind_INVALIDATION_KIND_FULL_RESYNC,
			OccurredAtUnixMs: time.Now().UnixMilli(),
		}
		h.history = append(h.history, event)
		channel <- event
	} else if len(h.history) > 0 && after > 0 && after < h.history[0].GetSequence()-1 {
		channel <- &controlv1.InvalidationEvent{
			Sequence:         h.sequence,
			Kind:             controlv1.InvalidationKind_INVALIDATION_KIND_FULL_RESYNC,
			OccurredAtUnixMs: time.Now().UnixMilli(),
		}
	} else {
		for _, event := range h.history {
			if event.GetSequence() > after {
				channel <- event
			}
		}
	}
	h.subscribers[channel] = struct{}{}
	h.mu.Unlock()

	var once sync.Once
	cancel := func() {
		once.Do(func() {
			h.mu.Lock()
			if _, exists := h.subscribers[channel]; exists {
				delete(h.subscribers, channel)
				close(channel)
			}
			h.mu.Unlock()
		})
	}
	return channel, cancel
}
