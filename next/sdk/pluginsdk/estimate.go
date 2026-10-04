package pluginsdk

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// ErrUnimplemented returns a gRPC Unimplemented status error with the given message.
func ErrUnimplemented(msg string) error {
	return status.Error(codes.Unimplemented, msg)
}

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
	// Default: return Unimplemented to signal that the plugin does not provide
	// usage estimation. Core will fall back to its own local tokenizer.
	return nil, status.Error(codes.Unimplemented, "usage estimation not implemented by plugin")
}
