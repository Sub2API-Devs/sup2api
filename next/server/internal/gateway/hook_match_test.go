package gateway

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// A hook matching protocols "*" (or with no protocols) runs on every
// endpoint served by the pipeline, count_tokens and embeddings included, so
// a ban check covers them (CONTRACTS §20.1, §72.3). A field the request does
// not have is simply absent.
func TestHookWildcardProtocolCoversEveryEndpoint(t *testing.T) {
	for _, protocols := range [][]string{{"*"}, nil} {
		e, _, _, _ := apiEnv(t)
		var seen []string
		e.addHook(manifest.Hook{ID: "ban", Point: pointGatewayRequest, Match: manifest.HookMatch{Protocols: protocols},
			Needs: []string{"model", "messages"}, Failure: "open"}, []string{"model", "messages"},
			&fakeHook{fn: func(_ context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
				seen = append(seen, in.GetMeta().GetProtocol())
				return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_DENY,
					DenyStatus: 403, DenyCode: "moderation_user_blocked", DenyMessage: "blocked"}, nil
			}})
		for _, tc := range []struct {
			path string
			body any
			h    map[string]string
		}{
			{"/v1/messages", body(testModel, false), nil},
			{"/v1/messages/count_tokens", body(testModel, false), nil},
			{"/v1/embeddings", map[string]any{"model": "text-embedding-3-small", "input": "abc"}, bearer()},
			{"/v1/chat/completions", chatBody(false), bearer()},
		} {
			var r result
			if tc.h == nil {
				r = e.do(tc.path, tc.body, nil)
			} else {
				r = e.post(tc.path, tc.body, tc.h)
			}
			assert.Equal(t, 403, r.status, "%v %s: %s", protocols, tc.path, r.body)
			e.record()
		}
		require.Equal(t, []string{"anthropic.messages", "anthropic.count_tokens", "openai.embeddings", "openai.chat"}, seen, "%v", protocols)
	}
}
