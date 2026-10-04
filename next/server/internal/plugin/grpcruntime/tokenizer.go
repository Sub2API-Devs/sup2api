package grpcruntime

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/tokenizer"
)

func (h *hostServer) CountTokens(ctx context.Context, in *pluginv1.CountTokensRequest) (*pluginv1.CountTokensResponse, error) {
	n, encoding, err := tokenizer.Count(ctx, in.GetText(), in.GetEncoding())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	return &pluginv1.CountTokensResponse{Tokens: n, Encoding: encoding}, nil
}

func (a platformAdapter) EstimateUsage(ctx context.Context, in *pluginv1.EstimateUsageRequest) (out *pluginv1.UsageReport, err error) {
	err = a.i.call(ctx, TimeoutPlatformHot, func(ctx context.Context, p *proc) (e error) { out, e = p.platform.EstimateUsage(ctx, in); return })
	return
}
