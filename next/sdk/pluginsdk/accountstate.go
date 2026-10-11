package pluginsdk

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func SetAccountAutomaticState(ctx context.Context, h Host, in *pluginv1.SetAccountAutomaticStateRequest) (*pluginv1.SetAccountAutomaticStateResponse, error) {
	if h == nil || h.Client() == nil {
		return nil, ErrHostNotReady
	}
	if h.Info().HostAPIVersion < protocol.AccountAutomaticStateHostAPIVersion {
		return nil, status.Errorf(codes.FailedPrecondition, "account automatic state requires host API %d", protocol.AccountAutomaticStateHostAPIVersion)
	}
	return h.Client().SetAccountAutomaticState(ctx, in)
}
