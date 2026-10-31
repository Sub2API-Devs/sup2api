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
