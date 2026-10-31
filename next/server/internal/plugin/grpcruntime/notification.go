package grpcruntime

import (
	"context"
	"errors"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// TimeoutNotification bounds one DeliverNotification call (an SMTP session,
// a webhook); the core retries on its own schedule.
const TimeoutNotification = 30 * time.Second

func notifierOf(p *proc) pluginv1.NotificationServiceClient { return p.notifier }

// Notifier is the plugin's NotificationService when it implements
// notify.channel.v1 (CONTRACTS §74.4).
func (i *Instance) Notifier() core.NotificationChannelPlugin {
	if !i.has(manifest.CapNotifyChannel) {
		return nil
	}
	return notificationAdapter{i}
}

type notificationAdapter struct{ i *Instance }

// DeliverNotification marks the refusals of an instance that cannot take the
// call (starting, waiting to restart after a crash, draining for an upgrade
// or a stop) with notRunningError: the call never reached the plugin process,
// so notify does not count it as a delivery attempt (CONTRACTS §74.4). An
// error after the call reached the process, a crash in the middle included,
// stays an ordinary failure: it may have been delivered, and a notification
// that crashes the plugin must still run out of attempts.
func (a notificationAdapter) DeliverNotification(ctx context.Context, in *pluginv1.DeliverNotificationRequest) (*pluginv1.DeliverNotificationResponse, error) {
	reached := false
	out, err := invoke(a.i, ctx, classBackground, TimeoutNotification, notifierOf,
		func(c pluginv1.NotificationServiceClient, ctx context.Context, in *pluginv1.DeliverNotificationRequest, opts ...grpc.CallOption) (*pluginv1.DeliverNotificationResponse, error) {
			reached = true
			return c.DeliverNotification(ctx, in, opts...)
		}, in)
	var ce *core.Error
	if err != nil && !reached && errors.As(err, &ce) && ce.Code == core.ErrPluginUnavailable.Code {
		return nil, notRunningError{err}
	}
	return out, err
}

// notRunningError wraps core.ErrPluginUnavailable for a call the instance
// refused before it reached the plugin process. Notify recognizes it by the
// PluginNotRunning method, without depending on this package.
type notRunningError struct{ error }

func (e notRunningError) Unwrap() error        { return e.error }
func (notRunningError) PluginNotRunning() bool { return true }

func (h *hostServer) notifier(ctx context.Context) (core.Notifier, error) {
	if err := h.require(ctx, "notify.send"); err != nil {
		return nil, err
	}
	if h.i.rt.o.Notifier == nil {
		return nil, status.Error(codes.Unavailable, "notifications unavailable")
	}
	return h.i.rt.o.Notifier, nil
}

func (h *hostServer) ListNotificationChannels(ctx context.Context, _ *pluginv1.ListNotificationChannelsRequest) (*pluginv1.ListNotificationChannelsResponse, error) {
	n, err := h.notifier(ctx)
	if err != nil {
		return nil, err
	}
	out := &pluginv1.ListNotificationChannelsResponse{}
	for _, b := range n.NotificationChannels() {
		out.Channels = append(out.Channels, &pluginv1.NotificationChannel{Id: b.Channel.ID, PluginKey: b.Plugin.Key,
			Label: b.Channel.Label, Description: b.Channel.Description, Recipient: b.Channel.RecipientFormat()})
	}
	return out, nil
}

// Notify queues in for the calling plugin; validation, deduplication and the
// rate limit are the notifier's.
func (h *hostServer) Notify(ctx context.Context, in *pluginv1.NotifyRequest) (*pluginv1.NotifyResponse, error) {
	n, err := h.notifier(ctx)
	if err != nil {
		return nil, err
	}
	r, err := n.Notify(ctx, h.key(), core.Notification{Channel: in.GetChannel(), Recipients: in.GetRecipients(), Subject: in.GetSubject(),
		Body: in.GetBody(), Severity: in.GetSeverity(), DedupeKey: in.GetDedupeKey(), DedupeSeconds: int(in.GetDedupeSeconds())})
	if err != nil {
		return nil, toStatus(err)
	}
	return &pluginv1.NotifyResponse{Id: r.ID, Deduplicated: r.Deduplicated}, nil
}
