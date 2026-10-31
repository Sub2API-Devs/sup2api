package registry_test

import (
	"context"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
)

type notifierExt struct{ ext }

func (notifierExt) Notifier() core.NotificationChannelPlugin { return notifierStub{} }

type notifierStub struct{}

func (notifierStub) DeliverNotification(context.Context, *pluginv1.DeliverNotificationRequest) (*pluginv1.DeliverNotificationResponse, error) {
	return &pluginv1.DeliverNotificationResponse{}, nil
}

func channelManifest(key string, ids ...string) *manifest.Manifest {
	m := registrytest.Manifest(key, "1.0.0")
	m.Platforms = nil
	m.Capabilities = append(m.Capabilities, manifest.Capability{ID: manifest.CapNotifyChannel})
	m.Notifications = &manifest.Notifications{}
	for _, id := range ids {
		m.Notifications.Channels = append(m.Notifications.Channels, manifest.NotificationChannel{ID: id, Label: manifest.LocalizedText{"en": id}})
	}
	return m
}

// Channel ids are unique: the first claimant keeps one, the later plugin is
// abnormal; plugins without the capability or the service declare nothing.
func TestNotificationChannels(t *testing.T) {
	early, late := load(t, channelManifest("mailer", "email")), load(t, channelManifest("aaa", "email", "webhook"))
	base := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	early.ClaimedAt, late.ClaimedAt = base, base.Add(time.Hour)
	noService := load(t, channelManifest("plain", "sms"))
	g := registry.New().Publish([]registry.Extension{notifierExt{ext{pkg: late}}, notifierExt{ext{pkg: early}}, ext{pkg: noService}})
	channels := g.(core.NotificationGeneration).NotificationChannels()
	if len(channels) != 2 || channels[0].Channel.ID != "email" || channels[0].Plugin.Key != "mailer" ||
		channels[1].Channel.ID != "webhook" || channels[1].Plugin.Key != "aaa" || channels[0].Client == nil {
		t.Fatalf("channels = %+v", channels)
	}
	if info, _ := g.Plugin("aaa"); len(info.Conflicts) != 1 || info.Conflicts[0].Resource != "notification_channel" || info.Conflicts[0].ID != "email" {
		t.Fatalf("conflicts = %+v", info.Conflicts)
	}
}
