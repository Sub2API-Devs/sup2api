package grpcruntime

import (
	"context"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"sync/atomic"
	"testing"
	"time"
)

func TestMonitorReportSealsHTTPAndJoinsAccounting(t *testing.T) {
	ctx := context.Background()
	p := &proc{}
	h := &hostServer{p: p}
	var hits atomic.Int32
	token, scope, err := p.polls.open(ctx, func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		hits.Add(1)
		return &pluginv1.ExecutionHTTPResponse{Status: 200}, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	scope.report = func(context.Context, *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error) {
		return &pluginv1.ExecutionReceipt{}, nil
	}
	pending := &pluginv1.ReportTaskProgressRequest{ExecutionToken: token, Result: &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_PENDING}}
	if _, err = h.ReportTaskProgress(ctx, pending); err != nil {
		t.Fatal(err)
	}
	if _, err = h.ExecuteHTTP(ctx, &pluginv1.ExecutionHTTPRequest{ExecutionToken: token}); status.Code(err) != codes.PermissionDenied || hits.Load() != 0 {
		t.Fatal("HTTP ran after claim released", err, hits.Load())
	}
	if _, err = h.ReportTaskProgress(ctx, pending); err != nil {
		t.Fatal("same claim cannot retry report", err)
	}
	p.polls.close(token, scope)

	entered, release := make(chan struct{}), make(chan struct{})
	token, scope, err = p.polls.open(ctx, func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		close(entered)
		<-release
		return &pluginv1.ExecutionHTTPResponse{Status: 200}, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	var reports atomic.Int32
	scope.report = func(context.Context, *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error) {
		reports.Add(1)
		return &pluginv1.ExecutionReceipt{}, nil
	}
	httpDone := make(chan struct{})
	go func() {
		_, _ = h.ExecuteHTTP(ctx, &pluginv1.ExecutionHTTPRequest{ExecutionToken: token})
		close(httpDone)
	}()
	<-entered
	pending.ExecutionToken = token
	if _, err = h.ReportTaskProgress(ctx, pending); status.Code(err) != codes.FailedPrecondition || reports.Load() != 0 {
		t.Fatal("report released claim while HTTP active", err)
	}
	close(release)
	<-httpDone
	if _, err = h.ReportTaskProgress(ctx, pending); err != nil {
		t.Fatal(err)
	}
	p.polls.close(token, scope)

	entered, release = make(chan struct{}), make(chan struct{})
	canceled := make(chan struct{})
	token, scope, err = p.polls.open(ctx, func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		return nil, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	scope.report = func(ctx context.Context, _ *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error) {
		close(entered)
		<-ctx.Done()
		close(canceled)
		<-release
		return nil, ctx.Err()
	}
	pending.ExecutionToken = token
	reportDone := make(chan struct{})
	go func() { _, _ = h.ReportTaskProgress(ctx, pending); close(reportDone) }()
	<-entered
	closed := make(chan struct{})
	go func() { p.polls.close(token, scope); close(closed) }()
	<-canceled
	select {
	case <-closed:
		t.Fatal("close skipped active accounting")
	case <-time.After(20 * time.Millisecond):
	}
	close(release)
	<-reportDone
	<-closed
}

func TestExecutionCallbackPanicStillReleasesScope(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	timer := time.AfterFunc(time.Second, cancel)
	defer timer.Stop()
	p := &proc{}
	token, scope, err := p.executions.open(ctx, cancel, timer, core.ExecutionCallbacks{FinishTimeout: time.Second, Forward: func(context.Context, *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
		panic("test panic")
	}})
	if err != nil {
		t.Fatal(err)
	}
	_, err = (&hostServer{p: p}).ForwardUpstream(ctx, &pluginv1.ForwardUpstreamRequest{ExecutionToken: token})
	if status.Code(err) != codes.Internal {
		t.Fatal(err)
	}
	p.executions.close(token, scope)
}

func TestMonitorQueryErrorCanBeReportedWithoutCompleteResponse(t *testing.T) {
	for _, tc := range []struct {
		state    pluginv1.ReconcileResult_State
		complete bool
		want     codes.Code
	}{
		{pluginv1.ReconcileResult_POLL_FAILED, false, codes.OK},
		{pluginv1.ReconcileResult_NOT_FOUND, false, codes.FailedPrecondition},
		{pluginv1.ReconcileResult_NOT_FOUND, true, codes.OK},
	} {
		p := &proc{}
		h := &hostServer{p: p}
		ctx := context.Background()
		token, scope, err := p.polls.open(ctx, func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
			return &pluginv1.ExecutionHTTPResponse{Status: 404}, nil
		})
		if err != nil {
			t.Fatal(err)
		}
		scope.report = func(context.Context, *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error) {
			return &pluginv1.ExecutionReceipt{}, nil
		}
		if tc.complete {
			if _, err = h.ExecuteHTTP(ctx, &pluginv1.ExecutionHTTPRequest{ExecutionToken: token}); err != nil {
				t.Fatal(err)
			}
		}
		_, err = h.ReportTaskProgress(ctx, &pluginv1.ReportTaskProgressRequest{ExecutionToken: token, Result: &pluginv1.ReconcileResult{State: tc.state}})
		if status.Code(err) != tc.want {
			t.Fatalf("%+v: %v", tc, err)
		}
		p.polls.close(token, scope)
	}
}
