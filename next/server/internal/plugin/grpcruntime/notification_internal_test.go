package grpcruntime

import (
	"context"
	"encoding/json"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

type fakeNotifier struct {
	source string
	got    core.Notification
}

func (f *fakeNotifier) Notify(_ context.Context, source string, n core.Notification) (core.NotifyResult, error) {
	if n.Channel != "email" {
		return core.NotifyResult{}, core.ErrInvalidArgument
	}
	f.source, f.got = source, n
	return core.NotifyResult{ID: 7, Deduplicated: true}, nil
}

func (f *fakeNotifier) NotificationChannels() []core.NotificationChannelBinding {
	return []core.NotificationChannelBinding{{Plugin: core.PluginInfo{Key: "mailer"},
		Channel: manifest.NotificationChannel{ID: "email", Label: manifest.LocalizedText{"en": "Email"}}}}
}

func TestHostNotify(t *testing.T) {
	ctx := context.Background()
	i, _ := testInstance(t, nil, nil, registry.Grants{})
	if _, err := (&hostServer{i: i}).Notify(ctx, &pluginv1.NotifyRequest{Channel: "email"}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("notify without grant: %v", err)
	}
	i, _ = testInstance(t, nil, nil, registry.Grants{"notify.send": json.RawMessage(`{}`)})
	if _, err := (&hostServer{i: i}).ListNotificationChannels(ctx, nil); status.Code(err) != codes.Unavailable {
		t.Fatalf("no notifier: %v", err)
	}
	n := &fakeNotifier{}
	i.rt.o.Notifier = n
	h := &hostServer{i: i}
	list, err := h.ListNotificationChannels(ctx, nil)
	if err != nil || len(list.Channels) != 1 || list.Channels[0].Id != "email" || list.Channels[0].PluginKey != "mailer" || list.Channels[0].Recipient != "text" {
		t.Fatalf("channels: %v %v", list, err)
	}
	r, err := h.Notify(ctx, &pluginv1.NotifyRequest{Channel: "email", Recipients: []string{"a@b.co"}, Subject: "s", DedupeKey: "k", DedupeSeconds: 60})
	if err != nil || r.Id != 7 || !r.Deduplicated || n.source != "bc" || n.got.DedupeSeconds != 60 || n.got.Recipients[0] != "a@b.co" {
		t.Fatalf("notify: %v %v %+v", r, err, n)
	}
	if _, err := h.Notify(ctx, &pluginv1.NotifyRequest{Channel: "sms"}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("invalid: %v", err)
	}
}
