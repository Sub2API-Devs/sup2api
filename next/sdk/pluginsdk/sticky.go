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
