package volcengine

import (
	"context"
	"errors"
	"net"
	"sync/atomic"
	"testing"
	"time"

	"github.com/tidwall/gjson"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// Poll must use the invocation-scoped host RPC, never the asset client or the
// general egress tunnel. No database or real upstream is needed for observation.
func startPoll(t *testing.T, execute func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error)) *pluginsdktest.Harness {
	t.Helper()
	return startVideoRPC(t, func(fh *pluginsdktest.FakeHost) { fh.ExecuteHTTPFunc = execute })
}

func startVideoRPC(t *testing.T, configure func(*pluginsdktest.FakeHost)) *pluginsdktest.Harness {
	t.Helper()
	denyDial := func(context.Context, string, string) (net.Conn, error) {
		t.Error("scoped execution used a general network dialer")
		return nil, errors.New("general network is forbidden in scoped execution")
	}
	fh := pluginsdktest.NewFakeHost()
	configure(fh)
	fh.DialFunc = denyDial
	p := New()
	p.SetDialer(denyDial)
	h := pluginsdktest.Start(t, p, pluginsdktest.Options{
		Host: fh, SDK: []pluginsdk.Option{pluginsdk.WithInfo("volcengine", "0.10.0")},
	})
	t.Cleanup(func() {
		if dials := fh.Dials(); len(dials) != 0 {
			t.Errorf("scoped execution used general egress: %v", dials)
		}
	})
	return h
}

func TestPollExecutesOneScopedRequest(t *testing.T) {
	for _, tc := range []struct {
		name      string
		account   *pluginv1.Account
		wantURL   string
		response  *pluginv1.ExecutionHTTPResponse
		execError error
		wantState pluginv1.ReconcileResult_State
		wantCode  codes.Code
		wantBody  bool
	}{
		{name: "official_success", account: account(testKey, "{}"), wantURL: DefaultBaseURL + "/api/v3/contents/generations/tasks/cgt-1",
			response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"succeeded","usage":{"completion_tokens":17},"content":{"video_url":"https://cdn.invalid/a.mp4"}}`)}, wantState: pluginv1.ReconcileResult_SETTLED, wantBody: true},
		{name: "relay_pending", account: relayAccount("/v1", "/doubao/api/v3"), wantURL: "https://relay.test/doubao/api/v3/contents/generations/tasks/cgt-1",
			response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"running","progress":0.7}`)}, wantBody: true},
		{name: "failed", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"failed","error":{"message":"rejected"}}`)}, wantState: pluginv1.ReconcileResult_FAILED, wantBody: true},
		{name: "estimate", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"succeeded","content":{"video_url":"https://cdn.invalid/a.mp4"}}`)}, wantState: pluginv1.ReconcileResult_SETTLED_ESTIMATE, wantBody: true},
		{name: "truncated", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"succeeded","usage":{"completion_tokens":17}}`), Truncated: true}, wantState: pluginv1.ReconcileResult_POLL_FAILED},
		{name: "malformed", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"failed"`)}, wantState: pluginv1.ReconcileResult_POLL_FAILED},
		{name: "transport_error", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"failed"}`), TransportError: "unexpected EOF"}, wantState: pluginv1.ReconcileResult_POLL_FAILED},
		{name: "http_error", response: &pluginv1.ExecutionHTTPResponse{Status: 503, Body: []byte(`{"status":"failed"}`)}, wantState: pluginv1.ReconcileResult_POLL_FAILED},
		{name: "host_rejected", execError: status.Error(codes.PermissionDenied, "execution permission expired"), wantCode: codes.PermissionDenied},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var calls atomic.Int32
			h := startPoll(t, func(ctx context.Context, req *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
				calls.Add(1)
				wantURL := tc.wantURL
				if wantURL == "" {
					wantURL = DefaultBaseURL + "/api/v3/contents/generations/tasks/cgt-1"
				}
				if req.GetExecutionToken() != "invocation-1" || req.GetMethod() != "GET" || req.GetUrl() != wantURL || len(req.GetBody()) != 0 {
					t.Errorf("scoped request = %v", req)
				}
				if req.GetHeaders()["authorization"] != "Bearer 11111111-2222-3333-4444-555555555555" {
					t.Error("Poll did not use the supplied original account credentials")
				}
				if _, ok := ctx.Deadline(); !ok {
					t.Error("Poll lost its execution deadline")
				}
				return tc.response, tc.execError
			})
			acc := tc.account
			if acc == nil {
				acc = account(testKey, "{}")
			}
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			r, err := h.Platform.Poll(ctx, &pluginv1.PollRequest{
				Entry: &pluginv1.ReconcileEntry{RefId: "cgt-1", TaskKind: "video", Model: "seedance"}, Account: acc, ExecutionToken: "invocation-1",
			})
			if status.Code(err) != tc.wantCode {
				t.Fatalf("Poll error = %v, want %s", err, tc.wantCode)
			}
			if calls.Load() != 1 {
				t.Fatalf("Poll made %d HTTP requests, want exactly one", calls.Load())
			}
			if err != nil {
				return
			}
			if r.GetState() != tc.wantState || (r.GetTaskSnapshotJson() != "") != tc.wantBody {
				t.Fatalf("Poll result = %v", r)
			}
			if tc.wantBody && gjson.Get(r.GetTaskSnapshotJson(), "id").String() != "cgt-1" {
				t.Fatalf("Poll lost task identity: %s", r.GetTaskSnapshotJson())
			}
			if tc.wantState == pluginv1.ReconcileResult_SETTLED && r.GetTokens().GetOutputTokens() != 17 {
				t.Fatalf("Poll lost real usage: %v", r)
			}
		})
	}
}

func TestPollRequiresExecutionContextAndUsableEntry(t *testing.T) {
	var calls atomic.Int32
	h := startPoll(t, func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		calls.Add(1)
		return &pluginv1.ExecutionHTTPResponse{Status: 200}, nil
	})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	for _, in := range []*pluginv1.PollRequest{
		{Entry: &pluginv1.ReconcileEntry{RefId: "cgt-1"}, Account: account(testKey, "{}")},
		{Entry: &pluginv1.ReconcileEntry{}, Account: account(testKey, "{}"), ExecutionToken: "invocation-1"},
		{Entry: &pluginv1.ReconcileEntry{RefId: "cgt-1"}, Account: &pluginv1.Account{}, ExecutionToken: "invocation-1"},
	} {
		if _, err := h.Platform.Poll(ctx, in); err == nil {
			t.Fatal("Poll accepted missing execution permission, task ID or credentials")
		}
	}
	// Setting the field outside the SDK's Poll RPC must not grant network access.
	if _, err := New().Poll(ctx, &pluginv1.PollRequest{
		Entry: &pluginv1.ReconcileEntry{RefId: "cgt-1"}, Account: account(testKey, "{}"), ExecutionToken: "invocation-1",
	}); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("direct call without scoped context = %v", err)
	}
	if calls.Load() != 0 {
		t.Fatalf("unusable Poll reached HTTP %d times", calls.Load())
	}
}

func TestPollCancellationStopsExecutionWithoutRetry(t *testing.T) {
	started, stopped := make(chan struct{}), make(chan struct{})
	var calls atomic.Int32
	h := startPoll(t, func(ctx context.Context, _ *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
		if calls.Add(1) == 1 {
			close(started)
		}
		<-ctx.Done()
		if calls.Load() == 1 {
			close(stopped)
		}
		return nil, status.FromContextError(ctx.Err()).Err()
	})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	done := make(chan error, 1)
	go func() {
		_, err := h.Platform.Poll(ctx, &pluginv1.PollRequest{
			Entry: &pluginv1.ReconcileEntry{RefId: "cgt-1"}, Account: account(testKey, "{}"), ExecutionToken: "invocation-1",
		})
		done <- err
	}()
	select {
	case <-started:
	case <-ctx.Done():
		t.Fatal("Poll did not start its execution")
	}
	cancel()
	select {
	case err := <-done:
		if status.Code(err) != codes.Canceled {
			t.Fatalf("canceled Poll = %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Poll ignored cancellation")
	}
	select {
	case <-stopped:
	case <-time.After(3 * time.Second):
		t.Fatal("scoped HTTP continued after Poll cancellation")
	}
	if calls.Load() != 1 {
		t.Fatalf("canceled Poll retried HTTP: %d calls", calls.Load())
	}
}
