package install

import (
	"context"
	"errors"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type recBus struct {
	channel string
	payload string
	err     error
}

func (b *recBus) Publish(_ context.Context, ch string, p []byte) error {
	b.channel, b.payload = ch, string(p)
	return b.err
}
func (b *recBus) Subscribe(string, func([]byte)) func() { return func() {} }

// Resource limit changes are broadcast as {"type":"resources"} so every
// node restarts the plugin's instances (CONTRACTS §14.3).
func TestNotifyResources(t *testing.T) {
	ctx := context.Background()
	b := &recBus{}
	if !NotifyResources(ctx, b, "guard") {
		t.Fatal("not notified")
	}
	if b.channel != core.ChannelPluginEvents || b.payload != `{"plugin_key":"guard","type":"resources"}` {
		t.Fatalf("published %s %s", b.channel, b.payload)
	}
	Notify(ctx, b, "guard")
	if b.payload != `{"plugin_key":"guard","type":"config"}` {
		t.Fatalf("config event = %s", b.payload)
	}
	if NotifyResources(ctx, nil, "guard") {
		t.Fatal("nil bus reported as notified")
	}
	if NotifyResources(ctx, &recBus{err: errors.New("down")}, "guard") {
		t.Fatal("failed publish reported as notified")
	}
}
