package gateway

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
)

type executeTestPlatform struct {
	core.PlatformPlugin
	beforeRecord func()
	afterRecord  func(context.Context, core.ExecutionCallbacks, *pluginv1.ForwardUpstreamResponse) error
	calls        atomic.Int64
}

func (p *executeTestPlatform) Execute(ctx context.Context, in *pluginv1.ExecuteRequest, cb core.ExecutionCallbacks) (*pluginv1.ExecuteResponse, error) {
	p.calls.Add(1)
	built, err := p.BuildUpstreamRequest(ctx, in.Request)
	if err != nil {
		return nil, err
	}
	out, err := cb.Forward(ctx, &pluginv1.ForwardUpstreamRequest{Request: built})
	if err != nil {
		return nil, err
	}
	if out.Error != nil {
		cls, err := p.ClassifyError(ctx, out.Error)
		return &pluginv1.ExecuteResponse{Classification: cls}, err
	}
	if p.beforeRecord != nil {
		p.beforeRecord()
	}
	if out.TaskSubmission {
		parsed, err := p.ParseTaskSubmission(ctx, out.Observation)
		if err != nil {
			return nil, err
		}
		_, err = cb.Watch(ctx, &pluginv1.ReserveAndWatchRequest{Task: parsed})
		if err != nil {
			return nil, err
		}
	} else {
		var report *pluginv1.UsageReport
		if out.ExtractUsage {
			report, err = p.ExtractUsage(ctx, out.Observation)
			if err != nil {
				return nil, err
			}
		}
		_, err = cb.Record(ctx, &pluginv1.RecordUsageRequest{Report: report})
		if err != nil {
			return nil, err
		}
	}
	if p.afterRecord != nil {
		if err := p.afterRecord(ctx, cb, out); err != nil {
			return nil, err
		}
	}
	return &pluginv1.ExecuteResponse{}, nil
}

type brokenExecutionCommit struct{ *usage.Service }

func (*brokenExecutionCommit) CommitExecution(context.Context, core.ExecutionCommit) (*pluginv1.ExecutionReceipt, error) {
	return nil, errors.New("forced commit outage")
}

func executeFixture(t *testing.T, svc core.Settler) (*env, *executeTestPlatform) {
	var p *executeTestPlatform
	e := newEnv(t, func(e *env) {
		p = &executeTestPlatform{PlatformPlugin: e.plat}
		e.gen.accountTypes[0].Client = p
		e.man.Capabilities = append(e.man.Capabilities, manifest.Capability{ID: manifest.CapPlatformExecute})
		for i := range e.gen.endpoints {
			e.gen.endpoints[i].Endpoint.Billing = "free"
		}
	})
	e.gw.d.Settler = svc
	return e, p
}

func TestExecuteGatewayRecordBeforePublishAndAbortUnconfirmedSSE(t *testing.T) {
	db := testutil.DB(t)
	svc := usage.New(db, nil, nil, usage.Options{})
	ctx := context.Background()
	t.Run("non_stream_waits_for_commit", func(t *testing.T) {
		e, p := executeFixture(t, svc)
		entered := make(chan struct{})
		release := make(chan struct{})
		defer func() {
			select {
			case <-release:
			default:
				close(release)
			}
		}()
		p.beforeRecord = func() { close(entered); <-release }
		type response struct {
			r   *http.Response
			err error
		}
		done := make(chan response, 1)
		go func() {
			req, _ := http.NewRequest("POST", e.srv.URL+"/v1/messages", strings.NewReader(`{"model":"`+testModel+`","messages":[]}`))
			req.Header.Set("x-api-key", testKey)
			r, err := http.DefaultClient.Do(req)
			done <- response{r, err}
		}()
		select {
		case <-entered:
		case <-time.After(5 * time.Second):
			t.Fatal("Execute did not reach Record")
		}
		select {
		case r := <-done:
			if r.r != nil {
				r.r.Body.Close()
			}
			t.Fatal("successful response published before record", r.err)
		case <-time.After(40 * time.Millisecond):
		}
		close(release)
		r := <-done
		if r.err != nil {
			t.Fatal(r.err)
		}
		defer r.r.Body.Close()
		raw, err := io.ReadAll(r.r.Body)
		if err != nil || r.r.StatusCode != 200 || len(raw) == 0 {
			t.Fatal(r.r.StatusCode, string(raw), err)
		}
		var state string
		if err = db.Pool.QueryRow(ctx, `SELECT state FROM plugin_executions WHERE request_id=$1`, r.r.Header.Get("X-Request-Id")).Scan(&state); err != nil || state != "committed" {
			t.Fatal(state, err)
		}
		if p.calls.Load() != 1 || len(e.up.keys()) != 1 {
			t.Fatal("execution replayed")
		}
		e.noRecord()
	})
	t.Run("unconfirmed_sse_aborts_and_releases_slots", func(t *testing.T) {
		e, p := executeFixture(t, &brokenExecutionCommit{svc})
		req, _ := http.NewRequest("POST", e.srv.URL+"/v1/messages", strings.NewReader(`{"model":"`+testModel+`","stream":true,"messages":[]}`))
		req.Header.Set("x-api-key", testKey)
		r, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer r.Body.Close()
		raw, err := io.ReadAll(r.Body)
		if len(raw) == 0 || err == nil {
			t.Fatalf("unconfirmed SSE ended cleanly: %s / %v", raw, err)
		}
		if p.calls.Load() != 1 {
			t.Fatal("SSE executed again")
		}
		e.slots.mu.Lock()
		for key, n := range e.slots.inUse {
			if n != 0 {
				t.Errorf("leaked slot %s=%d", key, n)
			}
		}
		e.slots.mu.Unlock()
		var state string
		if err = db.Pool.QueryRow(ctx, `SELECT state FROM plugin_executions WHERE request_id=$1`, r.Header.Get("X-Request-Id")).Scan(&state); err != nil || state != "observed" {
			t.Fatal(state, err)
		}
		e.noRecord()
	})
	t.Run("upstream_error_still_classifies_and_fails_over", func(t *testing.T) {
		e, p := executeFixture(t, svc)
		e.up.set("acc-1", &upstreamRule{status: 429})
		out := e.messages(body(testModel, false))
		if out.status != 200 || p.calls.Load() != 2 || strings.Join(e.up.keys(), ",") != "acc-1,acc-2" {
			t.Fatal(out.status, p.calls.Load(), e.up.keys())
		}
		e.noRecord()
	})
}

func TestExecuteGatewayTaskUsesSingleWatchAndSharedSnapshot(t *testing.T) {
	db := testutil.DB(t)
	svc := usage.New(db, nil, nil, usage.Options{})
	e, original := taskDraftEnv(t, svc, false)
	p := &executeTestPlatform{PlatformPlugin: original}
	for i := range e.gen.accountTypes {
		if e.gen.accountTypes[i].Plugin.Key == "task-draft" {
			e.gen.accountTypes[i].Client = p
			e.gen.accountTypes[i].Plugin.Manifest.Capabilities = append(e.gen.accountTypes[i].Plugin.Manifest.Capabilities, manifest.Capability{ID: manifest.CapPlatformExecute})
		}
	}
	e.gw.d.Settler = svc
	out := e.do("/task-draft/videos", map[string]any{"model": testModel}, nil)
	if out.status != 200 || !strings.HasPrefix(out.json().Get("id").String(), "s2task_") || p.calls.Load() != 1 {
		t.Fatal(out.status, string(out.body), p.calls.Load())
	}
	other, _ := taskDraftEnv(t, usage.New(db, nil, nil, usage.Options{}), true)
	if got := taskDraftGet(t, other, out.json().Get("id").String(), testKey); got.status != 200 {
		t.Fatal(got.status, string(got.body))
	}
	e.noRecord()
}

func TestExecuteGatewayLargeCaptureAndRejectedReplayPreserveUsage(t *testing.T) {
	db := testutil.DB(t)
	svc := usage.New(db, nil, nil, usage.Options{})
	e, original := usageEnvEP(t, pluginUsageRules(), func(ep *manifest.Endpoint) { ep.Billing = "free"; ep.UsageMaxBytes = 1 << 20 })
	original.extract = func(_ context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
		if len(in.Body) < 600<<10 {
			t.Error("valid large capture lost")
		}
		return report(100, 200), nil
	}
	p := &executeTestPlatform{PlatformPlugin: original}
	for i := range e.gen.accountTypes {
		if e.gen.accountTypes[i].Plugin.Key == "pu" {
			e.gen.accountTypes[i].Client = p
			e.gen.accountTypes[i].Plugin.Manifest.Capabilities = append(e.gen.accountTypes[i].Plugin.Manifest.Capabilities, manifest.Capability{ID: manifest.CapPlatformExecute})
		}
	}
	p.afterRecord = func(ctx context.Context, cb core.ExecutionCallbacks, _ *pluginv1.ForwardUpstreamResponse) error {
		if _, err := cb.Record(ctx, &pluginv1.RecordUsageRequest{Report: report(100, 200)}); err != nil {
			return err
		}
		if _, err := cb.Record(ctx, &pluginv1.RecordUsageRequest{Report: report(9000, 9000)}); err == nil {
			t.Error("conflicting replay accepted")
		}
		return nil
	}
	e.gw.d.Settler = svc
	lim := newFakeLimiter()
	e.gw.d.Limiter = lim
	e.up.set("pu-9", &upstreamRule{status: 200, body: `{"padding":"` + strings.Repeat("x", 600<<10) + `"}`})
	out := e.do("/pu/v1/chat", body(testModel, false), nil)
	if out.status != 200 {
		t.Fatal(out.status, string(out.body))
	}
	lim.mu.Lock()
	got := lim.tokens[9]
	lim.mu.Unlock()
	if got != 300 {
		t.Fatalf("TPM counted rejected or duplicate facts: %d", got)
	}
	var input, output int64
	if err := db.Pool.QueryRow(context.Background(), `SELECT input_tokens,output_tokens FROM usage_logs WHERE request_id=$1`, out.header.Get("X-Request-Id")).Scan(&input, &output); err != nil || input != 100 || output != 200 {
		t.Fatal(input, output, err)
	}
	e.noRecord()
}
