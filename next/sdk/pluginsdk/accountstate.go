package pluginsdk

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

func SetAccountAutomaticState(ctx context.Context, h Host, in *pluginv1.SetAccountAutomaticStateRequest) (*pluginv1.SetAccountAutomaticStateResponse, error) {
	if err := requireHostAPI(h, protocol.AccountAutomaticStateHostAPIVersion, "account automatic state"); err != nil {
		return nil, err
	}
	return h.Client().SetAccountAutomaticState(ctx, in)
}
