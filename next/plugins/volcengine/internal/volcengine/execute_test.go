package volcengine

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/tidwall/gjson"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

func TestExecuteSynchronousUsesHostUsage(t *testing.T) {
	var stage atomic.Int32
	h := startVideoRPC(t, func(fh *pluginsdktest.FakeHost) {
		fh.ForwardUpstreamFunc = func(_ context.Context, in *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
			if !stage.CompareAndSwap(0, 1) || in.GetExecutionToken() != "request-1" {
				t.Error("Execute must forward once under its invocation")
			}
			r := in.GetRequest()
			if r.GetMethod() != "POST" || r.GetUrl() != "https://relay.test/v1/chat/completions" || len(r.GetPatches()) != 1 ||
				r.GetPatches()[0].GetPath() != "stream_options.include_usage" {
				t.Errorf("chat execution lost its route/usage patch: %v", r)
			}
			return &pluginv1.ForwardUpstreamResponse{}, nil
		}
		fh.RecordUsageFunc = func(_ context.Context, in *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
			if !stage.CompareAndSwap(1, 2) || in.GetExecutionToken() != "request-1" || in.GetReport() != nil {
				t.Errorf("chat must acknowledge the host's rules exactly once: %v", in)
			}
			return &pluginv1.ExecutionReceipt{}, nil
		}
	})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	r, err := h.Platform.Execute(ctx, &pluginv1.ExecuteRequest{ExecutionToken: "request-1", Request: &pluginv1.BuildUpstreamRequestRequest{
		Meta: &pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "doubao-test", Stream: true}, Account: relayAccount("/v1", "/doubao/api/v3"),
	}})
	if err != nil || r.GetClassification() != nil || stage.Load() != 2 {
		t.Fatalf("chat execution: stage=%d result=%v err=%v", stage.Load(), r, err)
	}
}

func TestExecuteVideoReservesAndRegistersOnce(t *testing.T) {
	for _, tc := range []struct {
		name      string
		body      string
		watchErr  error
		wantCode  codes.Code
		wantWatch int32
	}{
		{name: "accepted", body: `{"id":"ark-1"}`, wantWatch: 1},
		{name: "registration_failed", body: `{"id":"ark-1"}`, watchErr: status.Error(codes.Unavailable, "database unavailable"), wantCode: codes.Unavailable, wantWatch: 1},
		{name: "missing_task_id", body: `{}`, wantCode: codes.DataLoss},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var forwarded, watched, recorded atomic.Int32
			meta := &pluginv1.RequestMeta{Protocol: ProtocolVideoSubmit, Model: "doubao-seedance-2-0-260128", UserId: 42}
			acc := account(testKey, "{}")
			h := startVideoRPC(t, func(fh *pluginsdktest.FakeHost) {
				fh.ForwardUpstreamFunc = func(_ context.Context, in *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
					forwarded.Add(1)
					if in.GetExecutionToken() != "submit-1" || in.GetRequest().GetMethod() != "POST" ||
						in.GetRequest().GetUrl() != DefaultBaseURL+"/api/v3/contents/generations/tasks" {
						t.Errorf("video submission request = %v", in)
					}
					return &pluginv1.ForwardUpstreamResponse{TaskSubmission: true, Observation: &pluginv1.ExtractUsageRequest{
						Meta: meta, Account: acc, Status: 200, Body: []byte(tc.body), Fields: requested(Res720, Ratio169, 5),
					}}, nil
				}
				fh.ReserveAndWatchFunc = func(_ context.Context, in *pluginv1.ReserveAndWatchRequest) (*pluginv1.ExecutionReceipt, error) {
					watched.Add(1)
					task := in.GetTask()
					if in.GetExecutionToken() != "submit-1" || task.GetUpstreamRefId() != "ark-1" ||
						task.GetUsage().GetReserve().GetTokens().GetOutputTokens() <= 0 ||
						gjson.Get(task.GetSnapshotJson(), "status").String() != "queued" {
						t.Errorf("video reservation = %v", in)
					}
					return &pluginv1.ExecutionReceipt{TaskId: "s2task_public"}, tc.watchErr
				}
				fh.RecordUsageFunc = func(context.Context, *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
					recorded.Add(1)
					return &pluginv1.ExecutionReceipt{}, nil
				}
			})
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, err := h.Platform.Execute(ctx, &pluginv1.ExecuteRequest{ExecutionToken: "submit-1",
				Request: &pluginv1.BuildUpstreamRequestRequest{Meta: meta, Account: acc}})
			if status.Code(err) != tc.wantCode || forwarded.Load() != 1 || watched.Load() != tc.wantWatch || recorded.Load() != 0 {
				t.Fatalf("video submission: forward=%d watch=%d record=%d err=%v", forwarded.Load(), watched.Load(), recorded.Load(), err)
			}
		})
	}
}

func TestMonitorObservesThenReportsOnce(t *testing.T) {
	for _, tc := range []struct {
		name       string
		response   *pluginv1.ExecutionHTTPResponse
		pollErr    error
		reportErr  error
		wantCode   codes.Code
		wantState  pluginv1.ReconcileResult_State
		wantReport int32
	}{
		{name: "running", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"running"}`)}, wantReport: 1},
		{name: "succeeded", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"succeeded","usage":{"completion_tokens":17}}`)}, wantReport: 1, wantState: pluginv1.ReconcileResult_SETTLED},
		{name: "failed", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"failed"}`)}, wantReport: 1, wantState: pluginv1.ReconcileResult_FAILED},
		{name: "truncated", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"succeeded"}`), Truncated: true}, wantReport: 1, wantState: pluginv1.ReconcileResult_POLL_FAILED},
		{name: "poll_rejected", pollErr: status.Error(codes.PermissionDenied, "lease expired"), wantCode: codes.PermissionDenied},
		{name: "report_rejected", response: &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte(`{"status":"running"}`)}, reportErr: status.Error(codes.Unavailable, "database unavailable"), wantReport: 1, wantCode: codes.Unavailable},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var polled, reported atomic.Int32
			h := startVideoRPC(t, func(fh *pluginsdktest.FakeHost) {
				fh.ExecuteHTTPFunc = func(_ context.Context, in *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error) {
					polled.Add(1)
					if in.GetExecutionToken() != "monitor-1" || in.GetMethod() != "GET" ||
						in.GetUrl() != "https://relay.test/doubao/api/v3/contents/generations/tasks/ark-1" {
						t.Errorf("monitor observation = %v", in)
					}
					return tc.response, tc.pollErr
				}
				fh.ReportTaskProgressFunc = func(_ context.Context, in *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error) {
					reported.Add(1)
					if polled.Load() != 1 || in.GetExecutionToken() != "monitor-1" || in.GetResult().GetState() != tc.wantState {
						t.Errorf("monitor report = %v", in)
					}
					if tc.response.GetTruncated() && in.GetResult().GetTaskSnapshotJson() != "" {
						t.Error("truncated observation must not replace the snapshot")
					}
					return &pluginv1.ExecutionReceipt{}, tc.reportErr
				}
			})
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, err := h.Platform.Monitor(ctx, &pluginv1.PollRequest{ExecutionToken: "monitor-1",
				Entry: &pluginv1.ReconcileEntry{RefId: "ark-1", TaskKind: "video"}, Account: relayAccount("/v1", "/doubao/api/v3")})
			if status.Code(err) != tc.wantCode || polled.Load() != 1 || reported.Load() != tc.wantReport {
				t.Fatalf("monitor: poll=%d report=%d err=%v", polled.Load(), reported.Load(), err)
			}
		})
	}
}
