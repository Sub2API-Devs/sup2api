package pluginsdk

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// ClearStickyBindings deletes a share of the sticky session bindings that
// point at an account and could serve (group, model). It needs the
// "sticky.clear" grant (CONTRACTS §73.2).
func ClearStickyBindings(ctx context.Context, h Host, in *pluginv1.ClearStickyBindingsRequest) (*pluginv1.ClearStickyBindingsResponse, error) {
	if h == nil || h.Client() == nil {
		return nil, ErrHostNotReady
	}
	if h.Info().HostAPIVersion < protocol.StickyClearHostAPIVersion {
		return nil, status.Errorf(codes.FailedPrecondition, "sticky binding clearing requires host API %d", protocol.StickyClearHostAPIVersion)
	}
	return h.Client().ClearStickyBindings(ctx, in)
}

// GetEnvironment resolves the environment variables of a group and
// optionally an account (CONTRACTS §73.3). Gateway requests already carry
// theirs in RequestMeta.environment; this is for background work.
func GetEnvironment(ctx context.Context, h Host, groupID, accountID int64) (map[string]int64, error) {
	if h == nil || h.Client() == nil {
		return nil, ErrHostNotReady
	}
	if h.Info().HostAPIVersion < protocol.EnvironmentHostAPIVersion {
		return nil, status.Errorf(codes.FailedPrecondition, "environment variables require host API %d", protocol.EnvironmentHostAPIVersion)
	}
	resp, err := h.Client().GetEnvironment(ctx, &pluginv1.GetEnvironmentRequest{GroupId: groupID, AccountId: accountID})
	if err != nil {
		return nil, err
	}
	return resp.GetEnvironment(), nil
}

// ListNotificationChannels lists the notification channels of the enabled
// plugins; it needs the "notify.send" grant (CONTRACTS §73.4).
func ListNotificationChannels(ctx context.Context, h Host) ([]*pluginv1.NotificationChannel, error) {
	if err := notifyReady(h); err != nil {
		return nil, err
	}
	resp, err := h.Client().ListNotificationChannels(ctx, &pluginv1.ListNotificationChannelsRequest{})
	if err != nil {
		return nil, err
	}
	return resp.GetChannels(), nil
}

// Notify queues a notification on a channel by its id; the core delivers it
// through the plugin declaring the channel. It needs the "notify.send" grant.
func Notify(ctx context.Context, h Host, in *pluginv1.NotifyRequest) (*pluginv1.NotifyResponse, error) {
	if err := notifyReady(h); err != nil {
		return nil, err
	}
	return h.Client().Notify(ctx, in)
}

func notifyReady(h Host) error {
	if h == nil || h.Client() == nil {
		return ErrHostNotReady
	}
	if h.Info().HostAPIVersion < protocol.NotificationHostAPIVersion {
		return status.Errorf(codes.FailedPrecondition, "notifications require host API %d", protocol.NotificationHostAPIVersion)
	}
	return nil
}
