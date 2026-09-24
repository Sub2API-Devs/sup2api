package cluster

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Bus implements core.Bus on Redis pub/sub. A single PubSub connection
// carries every channel; go-redis re-dials and re-subscribes all channels
// after a connection error, and Run keeps receiving across reconnects.
type Bus struct {
	rdb redis.UniversalClient
	log *slog.Logger
	ps  *redis.PubSub

	mu       sync.Mutex
	nextID   uint64
	handlers map[string]map[uint64]func([]byte)
}

// NewBus builds a bus. Subscribe may be called before Run; messages are
// delivered once Run is running.
func NewBus(rdb redis.UniversalClient, logger *slog.Logger) *Bus {
	return &Bus{
		rdb:      rdb,
		log:      orDefault(logger),
		ps:       rdb.Subscribe(context.Background()),
		handlers: map[string]map[uint64]func([]byte){},
	}
}

// Publish sends payload to every subscriber of channel on every node.
func (b *Bus) Publish(ctx context.Context, channel string, payload []byte) error {
	return b.rdb.Publish(ctx, channel, payload).Err()
}

// Subscribe registers handler for channel. Handlers run sequentially on the
// receive goroutine and must not block for long. cancel is idempotent.
func (b *Bus) Subscribe(channel string, handler func(payload []byte)) (cancel func()) {
	b.mu.Lock()
	b.nextID++
	id := b.nextID
	hs := b.handlers[channel]
	first := hs == nil
	if first {
		hs = map[uint64]func([]byte){}
		b.handlers[channel] = hs
	}
	hs[id] = handler
	b.mu.Unlock()
	if first {
		ctx, c := context.WithTimeout(context.Background(), 3*time.Second)
		// On error the channel is still recorded and subscribed on reconnect.
		if err := b.ps.Subscribe(ctx, channel); err != nil {
			b.log.Warn("bus subscribe failed, will retry on reconnect", "channel", channel, "err", err)
		}
		c()
	}
	var once sync.Once
	return func() {
		once.Do(func() {
			b.mu.Lock()
			hs := b.handlers[channel]
			delete(hs, id)
			last := len(hs) == 0
			if last {
				delete(b.handlers, channel)
			}
			b.mu.Unlock()
			if last {
				ctx, c := context.WithTimeout(context.Background(), 3*time.Second)
				_ = b.ps.Unsubscribe(ctx, channel)
				c()
			}
		})
	}
}

// Run receives messages until ctx is done, then closes the subscription.
func (b *Bus) Run(ctx context.Context) {
	stop := context.AfterFunc(ctx, func() { _ = b.ps.Close() })
	defer stop()
	backoff := 100 * time.Millisecond
	for ctx.Err() == nil {
		msg, err := b.ps.ReceiveTimeout(ctx, 30*time.Second)
		if err != nil {
			if ctx.Err() != nil || errors.Is(err, redis.ErrClosed) {
				return
			}
			var ne interface{ Timeout() bool }
			if errors.As(err, &ne) && ne.Timeout() {
				// Idle: ping so a dead connection is detected and replaced.
				_ = b.ps.Ping(ctx)
				continue
			}
			b.log.Warn("bus receive failed, reconnecting", "err", err)
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}
			backoff = min(backoff*2, 5*time.Second)
			continue
		}
		backoff = 100 * time.Millisecond
		if m, ok := msg.(*redis.Message); ok {
			b.dispatch(m.Channel, []byte(m.Payload))
		}
	}
}

func (b *Bus) dispatch(channel string, payload []byte) {
	b.mu.Lock()
	hs := make([]func([]byte), 0, len(b.handlers[channel]))
	for _, h := range b.handlers[channel] {
		hs = append(hs, h)
	}
	b.mu.Unlock()
	for _, h := range hs {
		func() {
			defer func() {
				if p := recover(); p != nil {
					b.log.Error("bus handler panic", "channel", channel, "panic", p)
				}
			}()
			h(payload)
		}()
	}
}
