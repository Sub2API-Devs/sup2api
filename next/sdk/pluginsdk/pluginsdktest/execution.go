package pluginsdktest

import (
	"context"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (h *FakeHost) ForwardUpstream(ctx context.Context, in *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
	if h.ForwardUpstreamFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no ForwardUpstream handler")
	}
	return h.ForwardUpstreamFunc(ctx, in)
}
func (h *FakeHost) RecordUsage(ctx context.Context, in *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
	if h.RecordUsageFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no RecordUsage handler")
	}
	return h.RecordUsageFunc(ctx, in)
}
func (h *FakeHost) ReserveAndWatch(ctx context.Context, in *pluginv1.ReserveAndWatchRequest) (*pluginv1.ExecutionReceipt, error) {
	if h.ReserveAndWatchFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no ReserveAndWatch handler")
	}
	return h.ReserveAndWatchFunc(ctx, in)
}
func (h *FakeHost) ReportTaskProgress(ctx context.Context, in *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error) {
	if h.ReportTaskProgressFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no ReportTaskProgress handler")
	}
	return h.ReportTaskProgressFunc(ctx, in)
}
