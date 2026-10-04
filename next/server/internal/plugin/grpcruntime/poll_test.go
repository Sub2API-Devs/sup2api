package grpcruntime

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestExecutionTokenBoundToProcessAndSingleUse(t *testing.T) {
	p, other := &proc{}, &proc{}
	h := &hostServer{p: p}
	var calls atomic.Int32
	token, scope, err := p.polls.open(context.Background(), func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		calls.Add(1)
		return &pluginv1.ExecutionHTTPResponse{Status: 200}, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	req := &pluginv1.ExecutionHTTPRequest{ExecutionToken: token}
	if _, err := (&hostServer{p: other}).ExecuteHTTP(context.Background(), req); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("wrong process: %v", err)
	}
	if _, err := h.ExecuteHTTP(context.Background(), req); err != nil {
		t.Fatal(err)
	}
	if _, err := h.ExecuteHTTP(context.Background(), req); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("reused: %v", err)
	}
	if !p.polls.close(token, scope) {
		t.Fatal("complete response was not accepted")
	}
	if _, err := h.ExecuteHTTP(context.Background(), req); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("expired: %v", err)
	}
	if calls.Load() != 1 {
		t.Fatalf("requests=%d", calls.Load())
	}
}

func TestPollCloseCancelsAndJoinsAdmittedHTTP(t *testing.T) {
	p := &proc{}
	started, canceled, finish := make(chan struct{}), make(chan struct{}), make(chan struct{})
	token, scope, err := p.polls.open(context.Background(), func(ctx context.Context, _ *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		close(started)
		<-ctx.Done()
		close(canceled)
		<-finish
		return nil, ctx.Err()
	})
	if err != nil {
		t.Fatal(err)
	}
	requestDone := make(chan struct{})
	go func() {
		_, _ = (&hostServer{p: p}).ExecuteHTTP(context.Background(), &pluginv1.ExecutionHTTPRequest{ExecutionToken: token})
		close(requestDone)
	}()
	<-started
	closed := make(chan bool, 1)
	go func() { closed <- p.polls.close(token, scope) }()
	<-canceled
	select {
	case <-closed:
		t.Fatal("Poll close returned before HTTP finished")
	case <-time.After(20 * time.Millisecond):
	}
	close(finish)
	if <-closed {
		t.Fatal("unfinished HTTP authorized a terminal result")
	}
	<-requestDone
}

func TestExecuteHTTPCombinesCallbackAndParentCancellation(t *testing.T) {
	for _, parentCanceled := range []bool{false, true} {
		p := &proc{}
		parent, cancelParent := context.WithCancel(context.Background())
		callback, cancelCallback := context.WithCancel(context.Background())
		started := make(chan struct{})
		token, scope, err := p.polls.open(parent, func(ctx context.Context, _ *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
			close(started)
			<-ctx.Done()
			return nil, ctx.Err()
		})
		if err != nil {
			t.Fatal(err)
		}
		done := make(chan error, 1)
		go func() {
			_, err := (&hostServer{p: p}).ExecuteHTTP(callback, &pluginv1.ExecutionHTTPRequest{ExecutionToken: token})
			done <- err
		}()
		<-started
		if parentCanceled {
			cancelParent()
		} else {
			cancelCallback()
		}
		if err := <-done; !errors.Is(err, context.Canceled) {
			t.Fatalf("parent=%v err=%v", parentCanceled, err)
		}
		if p.polls.close(token, scope) {
			t.Fatal("canceled HTTP authorized terminal")
		}
		cancelParent()
		cancelCallback()
	}
}

func TestExecuteHTTPPanicCompletesJoinAndNeverAuthorizesTerminal(t *testing.T) {
	p := &proc{}
	token, scope, err := p.polls.open(context.Background(), func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		panic("internal transport bug")
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = (&hostServer{p: p}).ExecuteHTTP(context.Background(), &pluginv1.ExecutionHTTPRequest{ExecutionToken: token})
	if status.Code(err) != codes.Internal {
		t.Fatalf("panic result: %v", err)
	}
	if p.polls.close(token, scope) {
		t.Fatal("panic authorized terminal")
	}
}

type pollRPC struct {
	pluginv1.PlatformServiceClient
	run func(context.Context, *pluginv1.PollRequest) (*pluginv1.ReconcileResult, error)
}

func (p pollRPC) Poll(ctx context.Context, in *pluginv1.PollRequest, _ ...grpc.CallOption) (*pluginv1.ReconcileResult, error) {
	return p.run(ctx, in)
}

func TestPollDoesNotTrustPluginTerminalOnBadNetworkEvidence(t *testing.T) {
	for _, tc := range []struct {
		name     string
		response *pluginv1.ExecutionHTTPResponse
		call     bool
		wantOK   bool
	}{
		{"complete", &pluginv1.ExecutionHTTPResponse{Status: 200}, true, true},
		{"truncated", &pluginv1.ExecutionHTTPResponse{Status: 200, Truncated: true}, true, false},
		{"transport_error", &pluginv1.ExecutionHTTPResponse{TransportError: "offline"}, true, false},
		{"no_request", nil, false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := &proc{}
			p.platform = pollRPC{run: func(ctx context.Context, in *pluginv1.PollRequest) (*pluginv1.ReconcileResult, error) {
				if tc.call {
					_, _ = (&hostServer{p: p}).ExecuteHTTP(ctx, &pluginv1.ExecutionHTTPRequest{ExecutionToken: in.GetExecutionToken()})
				}
				return &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_SETTLED}, nil
			}}
			i := &Instance{caps: map[string]bool{manifest.CapPlatformPoll: true}, sems: newSemaphores(Concurrency{}.withDefaults())}
			i.proc.Store(p)
			_, err := (platformAdapter{i}).Poll(context.Background(), &pluginv1.PollRequest{}, core.ExecutionHTTP(func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
				return tc.response, nil
			}))
			if (err == nil) != tc.wantOK {
				t.Fatalf("err=%v wantOK=%v", err, tc.wantOK)
			}
			if len(p.polls.byToken) != 0 {
				t.Fatal("Poll leaked execution token")
			}
		})
	}
}
