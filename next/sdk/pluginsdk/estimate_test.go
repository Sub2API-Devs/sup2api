package pluginsdk

import (
	"context"
	"testing"

	"google.golang.org/grpc"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

type countClient struct {
	pluginv1.HostServiceClient
	count int64
	seen  string
}

func (c *countClient) CountTokens(_ context.Context, r *pluginv1.CountTokensRequest, _ ...grpc.CallOption) (*pluginv1.CountTokensResponse, error) {
	c.seen = r.Text
	return &pluginv1.CountTokensResponse{Tokens: c.count, Encoding: "o200k_base"}, nil
}
func TestDefaultEstimatorUsesHostLocalTokenizer(t *testing.T) {
	client := &countClient{count: 12}
	s := platformServer{impl: ordinaryTestPlatform{}, runtime: &runtime{host: &host{client: client}}}
	for _, test := range []struct{ floor, want int64 }{{500, 500}, {0, 12}, {8, 12}} {
		r, err := s.EstimateUsage(context.Background(), &pluginv1.EstimateUsageRequest{Prompt: "hello", PreConsumeTokens: test.floor})
		if err != nil || r.GetTokens().GetInputTokens() != test.want || client.seen != "hello" {
			t.Fatalf("estimate %v %v", r, err)
		}
	}
}
