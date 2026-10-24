package pluginsdktest

import (
	"context"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func (f *FakeHost) ForwardUpstream(ctx context.Context, in *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
	if f.ForwardUpstreamFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no ForwardUpstream handler")
	}
	return f.ForwardUpstreamFunc(ctx, in)
}
func (f *FakeHost) RecordUsage(ctx context.Context, in *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
	if f.RecordUsageFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no RecordUsage handler")
	}
	return f.RecordUsageFunc(ctx, in)
}
func (f *FakeHost) ReserveAndWatch(ctx context.Context, in *pluginv1.ReserveAndWatchRequest) (*pluginv1.ExecutionReceipt, error) {
	if f.ReserveAndWatchFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no ReserveAndWatch handler")
	}
	return f.ReserveAndWatchFunc(ctx, in)
}
func (f *FakeHost) ReportTaskProgress(ctx context.Context, in *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error) {
	if f.ReportTaskProgressFunc == nil {
		return nil, status.Error(codes.Unimplemented, "no ReportTaskProgress handler")
	}
	return f.ReportTaskProgressFunc(ctx, in)
}
