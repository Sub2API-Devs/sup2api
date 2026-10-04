package pluginsdk

import (
	"context"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

type countClient struct {
	pluginv1.HostServiceClient
	count int64
	seen  string
}

func TestTaskEstimatorCannotFallBackToText(t *testing.T) {
	for _, test := range []struct {
		name      string
		protocols map[string]bool
		meta      *pluginv1.RequestMeta
	}{
		{"submit protocol", map[string]bool{"video.submit": true}, &pluginv1.RequestMeta{Protocol: "video.submit"}},
		{"client protocol", map[string]bool{"video.submit": true}, &pluginv1.RequestMeta{Protocol: "other", ClientProtocol: "video.submit"}},
		{"no manifest", nil, &pluginv1.RequestMeta{Protocol: "video.submit"}},
	} {
		t.Run(test.name, func(t *testing.T) {
			client := &countClient{}
			s := platformServer{impl: taskTestPlatform{}, runtime: &runtime{taskProtocols: test.protocols, host: &host{client: client}}}
			report, err := s.EstimateUsage(context.Background(), &pluginv1.EstimateUsageRequest{Meta: test.meta, Prompt: "must not tokenize", PreConsumeTokens: 0})
			if status.Code(err) != codes.Unimplemented || report != nil || client.seen != "" {
				t.Fatalf("task used text fallback: report=%v err=%v tokenizer=%q", report, err, client.seen)
			}
		})
	}
}

func TestMixedPlatformTextStillReturnsUnimplemented(t *testing.T) {
	client := &countClient{count: 12}
	s := platformServer{impl: taskTestPlatform{}, runtime: &runtime{taskProtocols: map[string]bool{"video.submit": true}, host: &host{client: client}}}
	report, err := s.EstimateUsage(context.Background(), &pluginv1.EstimateUsageRequest{Meta: &pluginv1.RequestMeta{Protocol: "text.chat"}, Prompt: "hello", PreConsumeTokens: 500})
	if status.Code(err) != codes.Unimplemented || report != nil {
		t.Fatalf("text estimate should return Unimplemented: %v %v", report, err)
	}
}

type explicitTaskEstimator struct{ taskTestPlatform }

func (explicitTaskEstimator) EstimateUsage(context.Context, *pluginv1.EstimateUsageRequest) (*pluginv1.UsageReport, error) {
	return &pluginv1.UsageReport{Facts: map[string]string{"video_seconds": "5"}}, nil
}

func TestTaskUsesExplicitEstimator(t *testing.T) {
	s := platformServer{impl: explicitTaskEstimator{}}
	report, err := s.EstimateUsage(context.Background(), &pluginv1.EstimateUsageRequest{})
	if err != nil || report.GetFacts()["video_seconds"] != "5" {
		t.Fatalf("task estimate: %v %v", report, err)
	}
}

func (c *countClient) CountTokens(_ context.Context, r *pluginv1.CountTokensRequest, _ ...grpc.CallOption) (*pluginv1.CountTokensResponse, error) {
	c.seen = r.Text
	return &pluginv1.CountTokensResponse{Tokens: c.count, Encoding: "o200k_base"}, nil
}
func TestDefaultEstimatorReturnsUnimplemented(t *testing.T) {
	client := &countClient{count: 12}
	s := platformServer{impl: ordinaryTestPlatform{}, runtime: &runtime{host: &host{client: client}}}
	r, err := s.EstimateUsage(context.Background(), &pluginv1.EstimateUsageRequest{Prompt: "hello", PreConsumeTokens: 500})
	if status.Code(err) != codes.Unimplemented || r != nil {
		t.Fatalf("default estimator should return Unimplemented: %v %v", r, err)
	}
}
