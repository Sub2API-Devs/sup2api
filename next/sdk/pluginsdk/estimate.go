package pluginsdk

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// UsageEstimator reports units before upstream work starts. Core pricing and
// account balance operations never belong to the estimator.
type UsageEstimator interface {
	EstimateUsage(context.Context, *pluginv1.EstimateUsageRequest) (*pluginv1.UsageReport, error)
}

func CountTokens(ctx context.Context, host Host, text, encoding string) (*pluginv1.CountTokensResponse, error) {
	if host == nil {
		return nil, ErrHostNotReady
	}
	return host.Client().CountTokens(ctx, &pluginv1.CountTokensRequest{Text: text, Encoding: encoding})
}

func (s platformServer) EstimateUsage(ctx context.Context, in *pluginv1.EstimateUsageRequest) (*pluginv1.UsageReport, error) {
	if estimator, ok := s.impl.(UsageEstimator); ok {
		return estimator.EstimateUsage(ctx, in)
	}
	// Task units cannot be inferred from text. Require a plugin estimator
	// before calling the text tokenizer, even when the requested floor is zero.
	if s.requiresTaskEstimator(in) {
		return nil, status.Error(codes.Unimplemented, "task submissions require UsageEstimator")
	}
	if s.runtime == nil {
		return nil, status.Error(codes.FailedPrecondition, "host not initialized")
	}
	s.runtime.mu.Lock()
	h := s.runtime.host
	s.runtime.mu.Unlock()
	count, err := CountTokens(ctx, h, in.GetPrompt(), "")
	if err != nil {
		return nil, err
	}
	return &pluginv1.UsageReport{Tokens: &pluginv1.UsageTokens{InputTokens: max(count.Tokens, in.GetPreConsumeTokens())}}, nil
}

func (s platformServer) requiresTaskEstimator(in *pluginv1.EstimateUsageRequest) bool {
	if s.runtime != nil && s.runtime.taskProtocols != nil {
		meta := in.GetMeta()
		return s.runtime.taskProtocols[meta.GetProtocol()] || s.runtime.taskProtocols[meta.GetClientProtocol()]
	}
	// Without a manifest there is no way to distinguish a task endpoint from
	// a text endpoint of the same plugin. Never silently estimate task units.
	_, task := s.impl.(TaskSubmissionParser)
	return task
}
