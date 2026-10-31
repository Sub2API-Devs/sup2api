package pluginsdktest

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func (f *FakeHost) ClearStickyBindings(ctx context.Context, in *pluginv1.ClearStickyBindingsRequest) (*pluginv1.ClearStickyBindingsResponse, error) {
	if f.ClearStickyBindingsFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no ClearStickyBindings handler")
	}
	return f.ClearStickyBindingsFunc(ctx, in)
}

func (f *FakeHost) ListNotificationChannels(ctx context.Context, in *pluginv1.ListNotificationChannelsRequest) (*pluginv1.ListNotificationChannelsResponse, error) {
	if f.ListNotificationChannelsFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no ListNotificationChannels handler")
	}
	return f.ListNotificationChannelsFunc(ctx, in)
}

func (f *FakeHost) Notify(ctx context.Context, in *pluginv1.NotifyRequest) (*pluginv1.NotifyResponse, error) {
	if f.NotifyFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no Notify handler")
	}
	return f.NotifyFunc(ctx, in)
}
