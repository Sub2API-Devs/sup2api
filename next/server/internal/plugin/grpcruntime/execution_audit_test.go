package grpcruntime

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestAuditOnlineScopeProcessOrderAndRetry(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	timer := time.AfterFunc(time.Second, cancel)
	defer timer.Stop()
	var records atomic.Int32
	p := &proc{}
	token, scope, err := p.executions.open(ctx, cancel, timer, core.ExecutionCallbacks{
		FinishTimeout: time.Second,
		Forward: func(context.Context, *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
			return &pluginv1.ForwardUpstreamResponse{}, nil
		},
		Record: func(context.Context, *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
			records.Add(1)
			return &pluginv1.ExecutionReceipt{}, nil
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	h := &hostServer{p: p}
	request := &pluginv1.ForwardUpstreamRequest{ExecutionToken: token}
	if _, err := (&hostServer{p: &proc{}}).ForwardUpstream(context.Background(), request); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("different process: %v", err)
	}
	if _, err := h.RecordUsage(context.Background(), &pluginv1.RecordUsageRequest{ExecutionToken: token}); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("record before forward: %v", err)
	}
	if _, err := h.ForwardUpstream(context.Background(), request); err != nil {
		t.Fatal(err)
	}
	if _, err := h.ForwardUpstream(context.Background(), request); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("repeated forward: %v", err)
	}
	for range 2 {
		if _, err := h.RecordUsage(context.Background(), &pluginv1.RecordUsageRequest{ExecutionToken: token}); err != nil {
			t.Fatal(err)
		}
	}
	if records.Load() != 2 {
		t.Fatalf("accounting retry was not delegated to durable idempotency: %d", records.Load())
	}
	p.executions.close(token, scope)
	if _, err := h.RecordUsage(context.Background(), &pluginv1.RecordUsageRequest{ExecutionToken: token}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("record after close: %v", err)
	}
}

func TestAuditOnlineScopePhaseBudgets(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	timer := time.AfterFunc(50*time.Millisecond, cancel)
	defer timer.Stop()
	started, finish := make(chan struct{}), make(chan struct{})
	p := &proc{}
	token, scope, err := p.executions.open(ctx, cancel, timer, core.ExecutionCallbacks{FinishTimeout: 50 * time.Millisecond,
		Forward: func(ctx context.Context, _ *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
			close(started)
			select {
			case <-finish:
				return &pluginv1.ForwardUpstreamResponse{}, nil
			case <-ctx.Done():
				return nil, ctx.Err()
			}
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer p.executions.close(token, scope)
	done := make(chan error, 1)
	go func() {
		_, err := (&hostServer{p: p}).ForwardUpstream(context.Background(), &pluginv1.ForwardUpstreamRequest{ExecutionToken: token})
		done <- err
	}()
	<-started
	select {
	case <-ctx.Done():
		t.Fatal("prepare timer canceled admitted network phase")
	case <-time.After(150 * time.Millisecond):
	}
	close(finish)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	select {
	case <-ctx.Done():
	case <-time.After(time.Second):
		t.Fatal("post-network accounting budget never expired")
	}
}

func TestAuditOnlineCloseJoinsForwardAndAccounting(t *testing.T) {
	for _, operation := range []string{"forward", "record"} {
		t.Run(operation, func(t *testing.T) {
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			timer := time.AfterFunc(2*time.Second, cancel)
			defer timer.Stop()
			started, canceled, finish := make(chan struct{}), make(chan struct{}), make(chan struct{})
			blocking := func(ctx context.Context) { close(started); <-ctx.Done(); close(canceled); <-finish }
			callbacks := core.ExecutionCallbacks{FinishTimeout: time.Second,
				Forward: func(ctx context.Context, _ *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
					if operation == "forward" {
						blocking(ctx)
					}
					return &pluginv1.ForwardUpstreamResponse{}, ctx.Err()
				},
				Record: func(ctx context.Context, _ *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
					blocking(ctx)
					return nil, ctx.Err()
				},
			}
			p := &proc{}
			token, scope, err := p.executions.open(ctx, cancel, timer, callbacks)
			if err != nil {
				t.Fatal(err)
			}
			h := &hostServer{p: p}
			if operation == "record" {
				if _, err := h.ForwardUpstream(context.Background(), &pluginv1.ForwardUpstreamRequest{ExecutionToken: token}); err != nil {
					t.Fatal(err)
				}
			}
			callbackDone := make(chan struct{})
			go func() {
				defer close(callbackDone)
				if operation == "forward" {
					_, _ = h.ForwardUpstream(context.Background(), &pluginv1.ForwardUpstreamRequest{ExecutionToken: token})
				} else {
					_, _ = h.RecordUsage(context.Background(), &pluginv1.RecordUsageRequest{ExecutionToken: token})
				}
			}()
			<-started
			closed := make(chan struct{})
			go func() { p.executions.close(token, scope); close(closed) }()
			<-canceled
			select {
			case <-closed:
				t.Fatal("close returned while an admitted callback still owns request state")
			case <-time.After(20 * time.Millisecond):
			}
			if _, err := h.RecordUsage(context.Background(), &pluginv1.RecordUsageRequest{ExecutionToken: token}); status.Code(err) != codes.PermissionDenied {
				t.Fatalf("late admission: %v", err)
			}
			close(finish)
			<-closed
			<-callbackDone
		})
	}
}
