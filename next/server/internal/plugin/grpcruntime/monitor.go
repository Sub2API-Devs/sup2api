package grpcruntime

import (
	"context"
	"errors"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"time"
)

func (h *hostServer) ReportTaskProgress(ctx context.Context, in *pluginv1.ReportTaskProgressRequest) (out *pluginv1.ExecutionReceipt, err error) {
	if h.p == nil || len(in.GetExecutionToken()) != 64 {
		return nil, status.Error(codes.PermissionDenied, "invalid execution token")
	}
	h.p.polls.mu.Lock()
	sc := h.p.polls.byToken[in.ExecutionToken]
	h.p.polls.mu.Unlock()
	if sc == nil {
		return nil, status.Error(codes.PermissionDenied, "unknown execution token")
	}
	sc.mu.Lock()
	if sc.closed || sc.ctx.Err() != nil || sc.report == nil {
		sc.mu.Unlock()
		return nil, status.Error(codes.PermissionDenied, "expired monitor execution")
	}
	if sc.reportBusy || (sc.used && !sc.complete) {
		sc.mu.Unlock()
		return nil, status.Error(codes.FailedPrecondition, "report already in progress")
	}
	if in.Result == nil {
		sc.mu.Unlock()
		return nil, status.Error(codes.InvalidArgument, "missing task result")
	}
	if in.Result.State != pluginv1.ReconcileResult_PENDING && in.Result.State != pluginv1.ReconcileResult_POLL_FAILED && !(sc.used && sc.complete && sc.safe) {
		sc.mu.Unlock()
		return nil, status.Error(codes.FailedPrecondition, "terminal result has no complete HTTP observation")
	}
	sc.reportSealed = true
	sc.reportBusy = true
	sc.reportDone = make(chan struct{})
	sc.mu.Unlock()
	defer func() {
		if recover() != nil {
			out = nil
			err = status.Error(codes.Internal, "monitor callback failed internally")
		}
		sc.mu.Lock()
		sc.reportBusy = false
		if err == nil {
			sc.reported = true
		}
		close(sc.reportDone)
		sc.mu.Unlock()
	}()
	cctx, cancel := context.WithCancel(sc.ctx)
	defer cancel()
	stop := context.AfterFunc(ctx, cancel)
	if ctx.Err() != nil {
		cancel()
	}
	defer stop()
	return sc.report(cctx, in)
}
func (a platformAdapter) Monitor(ctx context.Context, in *pluginv1.PollRequest, execute core.ExecutionHTTP, report func(context.Context, *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error)) error {
	if !a.i.has(manifest.CapPlatformMonitor) || in == nil || report == nil {
		return errors.New("Monitor requires platform.monitor.v1")
	}
	return a.i.call(ctx, 30*time.Second, func(ctx context.Context, p *proc) error {
		token, sc, err := p.polls.open(ctx, execute)
		if err != nil {
			return err
		}
		sc.report = report
		defer p.polls.close(token, sc)
		req := proto.Clone(in).(*pluginv1.PollRequest)
		req.ExecutionToken = token
		_, err = p.platform.Monitor(ctx, req)
		sc.mu.Lock()
		reported := sc.reported
		sc.mu.Unlock()
		if err == nil && !reported {
			return errors.New("Monitor returned without a committed progress report")
		}
		return err
	})
}

var _ core.MonitorPlugin = platformAdapter{}
