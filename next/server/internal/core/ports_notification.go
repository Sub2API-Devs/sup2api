package core

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Notifications (CONTRACTS §73.4): a provider plugin declares channels
// ("notify.channel.v1", e.g. the mailer's "email"); the core queues what
// plugins (HostService.Notify) and the core itself send, and delivers it
// through the channel's provider. Senders only know channel ids.

// NotificationChannelPlugin delivers the notifications of the channels a
// plugin declares.
type NotificationChannelPlugin interface {
	DeliverNotification(context.Context, *pluginv1.DeliverNotificationRequest) (*pluginv1.DeliverNotificationResponse, error)
}

// NotificationChannelBinding is one channel of an enabled plugin. Channel ids
// are unique across a generation: the first claimant wins.
type NotificationChannelBinding struct {
	Plugin  PluginInfo
	Channel manifest.NotificationChannel
	Client  NotificationChannelPlugin
}

// NotificationGeneration is implemented by generations that know channels.
type NotificationGeneration interface {
	NotificationChannels() []NotificationChannelBinding
}

// NotificationSourceCore is the source of notifications the core sends.
const NotificationSourceCore = "core"

// Notification severities.
const (
	SeverityInfo     = "info"
	SeverityWarning  = "warning"
	SeverityCritical = "critical"
)

// Notification is one message to send.
type Notification struct {
	Channel    string
	Recipients []string
	Subject    string
	Body       string // plain text
	Severity   string // SeverityInfo when empty
	// DedupeKey drops a second notification with the same key from the same
	// source within DedupeSeconds (0 = the default window).
	DedupeKey     string
	DedupeSeconds int
}

// NotifyResult is the queued notification, or the earlier one a duplicate
// was folded into.
type NotifyResult struct {
	ID           int64
	Deduplicated bool
}

// Notifier (owner: notify) queues notifications and lists the channels.
type Notifier interface {
	// Notify validates and queues n for source (a plugin key or
	// NotificationSourceCore). Unknown channels, bad recipients and an
	// exceeded rate limit are errors.
	Notify(ctx context.Context, source string, n Notification) (NotifyResult, error)
	NotificationChannels() []NotificationChannelBinding
}
