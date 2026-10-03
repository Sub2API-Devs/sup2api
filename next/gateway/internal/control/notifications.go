package control

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

func (s *Store) upgradeChannel() string { return "updater:wakeup:" + s.Cluster }

// NotifyUpgrade is a best-effort post-commit hint, never a command or a journal.
// Missing publication is repaired by the engine's periodic authoritative read.
func (s *Store) NotifyUpgrade(ctx context.Context) {
	if s.Redis == nil {
		return
	}
	bounded, cancel := context.WithTimeout(ctx, 150*time.Millisecond)
	defer cancel()
	_ = s.Redis.Publish(bounded, s.upgradeChannel(), "changed").Err()
}

func (s *Store) upgradeWakeups(ctx context.Context) <-chan struct{} {
	wakes := make(chan struct{}, 1)
	if s.Redis == nil {
		return wakes
	}
	sub := s.Redis.Subscribe(ctx, s.upgradeChannel())
	// go-redis resubscribes after connection loss. Periodic reads remain active
	// during reconnect; bounded buffers intentionally discard redundant hints.
	messages := sub.Channel(redis.WithChannelSize(1), redis.WithChannelSendTimeout(time.Millisecond))
	go func() {
		defer sub.Close()
		for {
			select {
			case <-ctx.Done():
				return
			case _, ok := <-messages:
				if !ok {
					return
				}
				select {
				case wakes <- struct{}{}:
				default:
				}
			}
		}
	}()
	return wakes
}
