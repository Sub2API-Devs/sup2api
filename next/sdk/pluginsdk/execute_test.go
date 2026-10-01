package pluginsdk

import (
	"context"
	"errors"
	"reflect"
	"sync"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type executionTestClient struct {
	pluginv1.HostServiceClient
	forward  func(context.Context, *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error)
	record   func(context.Context, *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error)
	watch    func(context.Context, *pluginv1.ReserveAndWatchRequest) (*pluginv1.ExecutionReceipt, error)
	progress func(context.Context, *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error)
}

func (c executionTestClient) ForwardUpstream(ctx context.Context, in *pluginv1.ForwardUpstreamRequest, _ ...grpc.CallOption) (*pluginv1.ForwardUpstreamResponse, error) {
	return c.forward(ctx, in)
}
func (c executionTestClient) RecordUsage(ctx context.Context, in *pluginv1.RecordUsageRequest, _ ...grpc.CallOption) (*pluginv1.ExecutionReceipt, error) {
	return c.record(ctx, in)
}
func (c executionTestClient) ReserveAndWatch(ctx context.Context, in *pluginv1.ReserveAndWatchRequest, _ ...grpc.CallOption) (*pluginv1.ExecutionReceipt, error) {
	return c.watch(ctx, in)
}
func (c executionTestClient) ReportTaskProgress(ctx context.Context, in *pluginv1.ReportTaskProgressRequest, _ ...grpc.CallOption) (*pluginv1.ExecutionReceipt, error) {
	return c.progress(ctx, in)
}

type executionTestPlatform struct {
	Platform
	execute  func(context.Context, *pluginv1.ExecuteRequest) (*pluginv1.ExecuteResponse, error)
	monitor  func(context.Context, *pluginv1.PollRequest) error
	build    func(context.Context, *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error)
	classify func(context.Context, *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error)
	extract  func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error)
	parse    func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.TaskSubmission, error)
}

func (p executionTestPlatform) Execute(c context.Context, i *pluginv1.ExecuteRequest) (*pluginv1.ExecuteResponse, error) {
	return p.execute(c, i)
}
func (p executionTestPlatform) Monitor(c context.Context, i *pluginv1.PollRequest) error {
	return p.monitor(c, i)
}
func (p executionTestPlatform) BuildUpstreamRequest(c context.Context, i *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	return p.build(c, i)
}
func (p executionTestPlatform) ClassifyError(c context.Context, i *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	return p.classify(c, i)
}
func (p executionTestPlatform) ExtractUsage(c context.Context, i *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
	return p.extract(c, i)
}
func (p executionTestPlatform) ParseTaskSubmission(c context.Context, i *pluginv1.ExtractUsageRequest) (*pluginv1.TaskSubmission, error) {
	return p.parse(c, i)
}

func TestExecuteDefaultOrderingAndCommitFailure(t *testing.T) {
	for _, mode := range []string{"rules", "plugin", "fallback", "task", "upstream_error", "commit_error"} {
		t.Run(mode, func(t *testing.T) {
			var steps []string
			failed := errors.New("storage failed")
			client := executionTestClient{
				forward: func(_ context.Context, in *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
					steps = append(steps, "forward")
					if in.ExecutionToken != "issued" || in.Request.Url != "https://example.test" {
						t.Fatal("wrong execution authority/request")
					}
					out := &pluginv1.ForwardUpstreamResponse{Observation: &pluginv1.ExtractUsageRequest{Body: []byte(`{"id":"task"}`)}}
					out.ExtractUsage = mode == "plugin" || mode == "fallback"
					out.TaskSubmission = mode == "task"
					if mode == "upstream_error" {
						out.Error = &pluginv1.ClassifyErrorRequest{Status: 429}
					}
					return out, nil
				},
				record: func(_ context.Context, in *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
					steps = append(steps, "record")
					if in.ExecutionToken != "issued" {
						t.Fatal("wrong record token")
					}
					if (in.Report != nil) != (mode == "plugin") {
						t.Fatalf("unexpected usage report: %v", in.Report)
					}
					if mode == "commit_error" {
						return nil, failed
					}
					return &pluginv1.ExecutionReceipt{}, nil
				},
				watch: func(_ context.Context, in *pluginv1.ReserveAndWatchRequest) (*pluginv1.ExecutionReceipt, error) {
					steps = append(steps, "watch")
					if in.ExecutionToken != "issued" || in.Task.UpstreamRefId != "task" {
						t.Fatal("wrong watch facts")
					}
					return &pluginv1.ExecutionReceipt{TaskId: "public"}, nil
				},
			}
			p := executionTestPlatform{
				build: func(context.Context, *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
					steps = append(steps, "build")
					return &pluginv1.BuildUpstreamRequestResponse{Url: "https://example.test"}, nil
				},
				classify: func(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
					steps = append(steps, "classify")
					if in.Status != 429 {
						t.Fatal("missing status")
					}
					return &pluginv1.ClassifyErrorResponse{ClientStatus: 429}, nil
				},
				extract: func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error) {
					steps = append(steps, "extract")
					if mode == "fallback" {
						return &pluginv1.UsageReport{}, failed
					}
					return &pluginv1.UsageReport{Tokens: &pluginv1.UsageTokens{OutputTokens: 3}}, nil
				},
				parse: func(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.TaskSubmission, error) {
					steps = append(steps, "parse")
					return &pluginv1.TaskSubmission{UpstreamRefId: "task"}, nil
				},
			}
			ctx := context.WithValue(context.Background(), executionContextKey{}, executionContext{client: client, token: "issued", kind: "Execute"})
			out, err := ExecuteDefault(ctx, p, &pluginv1.ExecuteRequest{Request: &pluginv1.BuildUpstreamRequestRequest{}, ExecutionToken: "caller-cannot-override"})
			if mode == "commit_error" {
				if !errors.Is(err, failed) || out != nil {
					t.Fatalf("uncommitted success returned: %v %v", out, err)
				}
			} else if err != nil {
				t.Fatal(err)
			}
			want := []string{"build", "forward", "record"}
			if mode == "plugin" || mode == "fallback" {
				want = []string{"build", "forward", "extract", "record"}
			}
			if mode == "task" {
				want = []string{"build", "forward", "parse", "watch"}
			}
			if mode == "upstream_error" {
				want = []string{"build", "forward", "classify"}
				if out.GetClassification().GetClientStatus() != 429 {
					t.Fatal("lost classification")
				}
			}
			if !reflect.DeepEqual(steps, want) {
				t.Fatalf("order %v, want %v", steps, want)
			}
		})
	}
}

func TestExecutionScopesIsolateExpireAndDenyWrongOperations(t *testing.T) {
	var mu sync.Mutex
	seen := map[string]string{}
	contexts := map[string]context.Context{}
	client := executionTestClient{record: func(_ context.Context, in *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
		mu.Lock()
		seen[in.Report.UpstreamModel] = in.ExecutionToken
		mu.Unlock()
		in.Report.UpstreamModel = "host-mutated-copy"
		return &pluginv1.ExecutionReceipt{}, nil
	}}
	p := executionTestPlatform{execute: func(ctx context.Context, in *pluginv1.ExecuteRequest) (*pluginv1.ExecuteResponse, error) {
		id := in.Request.Meta.Model
		mu.Lock()
		contexts[id] = ctx
		mu.Unlock()
		if _, err := ReportTaskProgress(ctx, &pluginv1.ReconcileResult{}); status.Code(err) != codes.FailedPrecondition {
			t.Errorf("Execute could report Monitor progress: %v", err)
		}
		report := &pluginv1.UsageReport{UpstreamModel: id}
		_, err := RecordUsage(ctx, report)
		if report.UpstreamModel != id {
			t.Error("RecordUsage mutated caller report")
		}
		return &pluginv1.ExecuteResponse{}, err
	}}
	s := platformServer{impl: p, runtime: &runtime{host: newHost(HostInfo{}, client, nil, false, 0)}}
	var wg sync.WaitGroup
	for _, id := range []string{"one", "two"} {
		wg.Go(func() {
			_, err := s.Execute(context.Background(), &pluginv1.ExecuteRequest{ExecutionToken: "token-" + id, Request: &pluginv1.BuildUpstreamRequestRequest{Meta: &pluginv1.RequestMeta{Model: id}}})
			if err != nil {
				t.Error(err)
			}
		})
	}
	wg.Wait()
	for _, id := range []string{"one", "two"} {
		if seen[id] != "token-"+id {
			t.Fatal("tokens crossed concurrent invocations")
		}
		if _, err := RecordUsage(contexts[id], nil); status.Code(err) != codes.Canceled {
			t.Fatalf("authority survived Execute: %v", err)
		}
	}
	if _, err := RecordUsage(context.Background(), nil); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("out of scope: %v", err)
	}
}

func TestMonitorScopeClonesReportAndExpires(t *testing.T) {
	var saved context.Context
	client := executionTestClient{progress: func(_ context.Context, in *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error) {
		if in.ExecutionToken != "monitor-token" {
			t.Fatal("wrong monitor token")
		}
		in.Result.Reason = "mutated"
		return &pluginv1.ExecutionReceipt{TaskId: "task"}, nil
	}}
	p := executionTestPlatform{monitor: func(ctx context.Context, _ *pluginv1.PollRequest) error {
		saved = ctx
		if _, err := RecordUsage(ctx, nil); status.Code(err) != codes.FailedPrecondition {
			t.Fatalf("Monitor recorded gateway usage: %v", err)
		}
		r := &pluginv1.ReconcileResult{Reason: "original"}
		_, err := ReportTaskProgress(ctx, r)
		if r.Reason != "original" {
			t.Fatal("mutated report")
		}
		return err
	}}
	s := platformServer{impl: p, runtime: &runtime{host: newHost(HostInfo{}, client, nil, false, 0)}}
	if _, err := s.Monitor(context.Background(), &pluginv1.PollRequest{ExecutionToken: "monitor-token"}); err != nil {
		t.Fatal(err)
	}
	if _, err := ReportTaskProgress(saved, &pluginv1.ReconcileResult{}); status.Code(err) != codes.Canceled {
		t.Fatalf("authority survived Monitor: %v", err)
	}
}

func TestExecutionCapabilitiesRejectOldHostsAndMissingImplementation(t *testing.T) {
	for _, capability := range []string{manifest.CapPlatformExecute, manifest.CapPlatformMonitor} {
		for _, inited := range []bool{false, true} {
			for version := int32(0); version < 4; version++ {
				rt := runtime{capabilities: []string{capability}, inited: inited}
				if _, err := rt.InitHost(context.Background(), &pluginv1.InitHostRequest{HostApiVersion: version}); status.Code(err) != codes.FailedPrecondition {
					t.Fatalf("host %d accepted %s", version, capability)
				}
			}
		}
		caps := map[string]bool{capability: true, manifest.CapPlatformAdapter: true}
		if err := checkTaskManifest(ordinaryTestPlatform{}, &manifest.Manifest{}, caps); err == nil {
			t.Fatalf("missing %s implementation accepted", capability)
		}
		if err := checkTaskManifest(executionTestPlatform{}, &manifest.Manifest{}, caps); err != nil {
			t.Fatal(err)
		}
	}
}

func TestInferredExecutionCapabilityRequiresRegisteredPlatform(t *testing.T) {
	for _, p := range []any{struct{ Executor }{}, struct{ TaskMonitor }{}} {
		if _, err := newRuntime(p, options{key: "test", version: "0.1.0"}, nil); err == nil {
			t.Fatalf("inferred execution capability has no Platform service: %T", p)
		}
	}
}
