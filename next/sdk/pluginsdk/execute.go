package pluginsdk

import (
	"context"
	"log/slog"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
)

// Executor owns one request's execution after the host has selected an account.
// ExecuteDefault implements the normal Build -> Forward -> Record/Watch flow.
// Forwarding still uses the host's transport, conversions, limits and proxy.
// Requires platform.execute.v1 and host API 4.
type Executor interface {
	Execute(context.Context, *pluginv1.ExecuteRequest) (*pluginv1.ExecuteResponse, error)
}

// TaskMonitor observes one task and calls ReportTaskProgress before returning.
// The host chooses the node, time and original account, and owns retries,
// leases and atomic financial settlement. No plugin timer is needed.
// Requires platform.monitor.v1 and host API 4.
type TaskMonitor interface {
	Monitor(context.Context, *pluginv1.PollRequest) error
}

func scopedExecution(ctx context.Context, operation, kind string) (executionContext, error) {
	if err := ctx.Err(); err != nil {
		return executionContext{}, status.FromContextError(err).Err()
	}
	ex, ok := ctx.Value(executionContextKey{}).(executionContext)
	if !ok || ex.client == nil || ex.token == "" || ex.kind != kind {
		return executionContext{}, status.Errorf(codes.FailedPrecondition, "%s requires an active %s context", operation, kind)
	}
	return ex, nil
}

// ForwardUpstream sends the request through the selected account's host
// transport. The full body stays in the host. A stream is forwarded as it
// arrives; only bounded usage observations are returned to the plugin.
func ForwardUpstream(ctx context.Context, request *pluginv1.BuildUpstreamRequestResponse) (*pluginv1.ForwardUpstreamResponse, error) {
	ex, err := scopedExecution(ctx, "ForwardUpstream", "Execute")
	if err != nil {
		return nil, err
	}
	if request == nil {
		return nil, status.Error(codes.InvalidArgument, "upstream request is required")
	}
	return ex.client.ForwardUpstream(ctx, &pluginv1.ForwardUpstreamRequest{ExecutionToken: ex.token, Request: proto.Clone(request).(*pluginv1.BuildUpstreamRequestResponse)})
}

// RecordUsage commits upstream facts against the host's immutable request
// identity. A nil report acknowledges host-collected declarative usage (or
// fallback after extraction failed). There are no price or identity inputs.
// The acknowledgement means persistence succeeded, not just queue admission.
func RecordUsage(ctx context.Context, report *pluginv1.UsageReport) (*pluginv1.ExecutionReceipt, error) {
	ex, err := scopedExecution(ctx, "RecordUsage", "Execute")
	if err != nil {
		return nil, err
	}
	if report != nil {
		report = proto.Clone(report).(*pluginv1.UsageReport)
	}
	return ex.client.RecordUsage(ctx, &pluginv1.RecordUsageRequest{ExecutionToken: ex.token, Report: report})
}

// ReserveAndWatch atomically records an accepted submission, its optional
// estimated usage/precharge and the host-managed monitoring registration.
// It never starts a plugin goroutine. Task identity and account come from the
// active Execute invocation. The same payload may be retried after a lost ACK.
func ReserveAndWatch(ctx context.Context, task *pluginv1.TaskSubmission) (*pluginv1.ExecutionReceipt, error) {
	ex, err := scopedExecution(ctx, "ReserveAndWatch", "Execute")
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, status.Error(codes.InvalidArgument, "task submission is required")
	}
	return ex.client.ReserveAndWatch(ctx, &pluginv1.ReserveAndWatchRequest{ExecutionToken: ex.token, Task: proto.Clone(task).(*pluginv1.TaskSubmission)})
}

// ReportTaskProgress atomically stores one observation. A terminal result
// settles/refunds and closes monitoring in the same transaction. The host
// validates the active claim and complete network observation before accepting
// it. Acknowledgement means committed; retry only the identical payload.
func ReportTaskProgress(ctx context.Context, result *pluginv1.ReconcileResult) (*pluginv1.ExecutionReceipt, error) {
	ex, err := scopedExecution(ctx, "ReportTaskProgress", "Monitor")
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, status.Error(codes.InvalidArgument, "task result is required")
	}
	return ex.client.ReportTaskProgress(ctx, &pluginv1.ReportTaskProgressRequest{ExecutionToken: ex.token, Result: proto.Clone(result).(*pluginv1.ReconcileResult)})
}

// ExecuteDefault is the shared execution algorithm for ordinary platform
// adapters. Vendor-specific building/classification/parsing stays in p; the
// host owns forwarding, the effective declarative usage rules and persistence.
// It never opens a socket or creates its own background work.
func ExecuteDefault(ctx context.Context, p Platform, in *pluginv1.ExecuteRequest) (*pluginv1.ExecuteResponse, error) {
	if p == nil || in.GetRequest() == nil {
		return nil, status.Error(codes.InvalidArgument, "platform and execution request are required")
	}
	request, err := p.BuildUpstreamRequest(ctx, in.Request)
	if err != nil {
		return nil, err
	}
	observed, err := ForwardUpstream(ctx, request)
	if err != nil {
		return nil, err
	}
	if observed == nil {
		return nil, status.Error(codes.Internal, "host returned no upstream observation")
	}
	if observed.Error != nil {
		classified, err := p.ClassifyError(ctx, observed.Error)
		if err != nil {
			return nil, err
		}
		if classified == nil {
			return nil, status.Error(codes.Internal, "platform returned no error classification")
		}
		return &pluginv1.ExecuteResponse{Classification: classified}, nil
	}
	if observed.TaskSubmission {
		parser, ok := p.(TaskSubmissionParser)
		if !ok || observed.Observation == nil {
			return nil, status.Error(codes.FailedPrecondition, "task submission parser and observation are required")
		}
		task, err := parser.ParseTaskSubmission(ctx, observed.Observation)
		if err != nil {
			return nil, err
		}
		if _, err := ReserveAndWatch(ctx, task); err != nil {
			return nil, err
		}
	} else {
		var report *pluginv1.UsageReport
		if observed.ExtractUsage {
			// Failure explicitly falls back to the host's online accumulator.
			// The host records that fallback; no second extraction is scheduled.
			if extractor, ok := p.(UsageExtractor); ok && observed.Observation != nil {
				report, err = extractor.ExtractUsage(ctx, observed.Observation)
				if err != nil {
					slog.Default().Warn("plugin usage extraction failed, falling back to host accumulator", "error", err.Error())
					report = nil
				}
			}
		}
		if _, err := RecordUsage(ctx, report); err != nil {
			return nil, err
		}
	}
	return &pluginv1.ExecuteResponse{}, nil
}

func (s platformServer) bindExecution(ctx context.Context, token, kind string) (context.Context, context.CancelFunc, error) {
	if token == "" {
		return nil, nil, status.Errorf(codes.InvalidArgument, "%s execution token is required", kind)
	}
	if s.runtime == nil {
		return nil, nil, status.Error(codes.FailedPrecondition, "host is not initialised")
	}
	s.runtime.mu.Lock()
	h := s.runtime.host
	s.runtime.mu.Unlock()
	if h == nil {
		return nil, nil, status.Error(codes.FailedPrecondition, "host is not initialised")
	}
	ctx, cancel := context.WithCancel(ctx)
	return context.WithValue(ctx, executionContextKey{}, executionContext{client: h.Client(), token: token, kind: kind}), cancel, nil
}

func (s platformServer) Execute(ctx context.Context, in *pluginv1.ExecuteRequest) (*pluginv1.ExecuteResponse, error) {
	p, ok := s.impl.(Executor)
	if !ok {
		return nil, status.Error(codes.Unimplemented, "this platform does not implement Execute")
	}
	ctx, cancel, err := s.bindExecution(ctx, in.GetExecutionToken(), "Execute")
	if err != nil {
		return nil, err
	}
	defer cancel()
	return p.Execute(ctx, in)
}

func (s platformServer) Monitor(ctx context.Context, in *pluginv1.PollRequest) (*pluginv1.MonitorResponse, error) {
	p, ok := s.impl.(TaskMonitor)
	if !ok {
		return nil, status.Error(codes.Unimplemented, "this platform does not implement Monitor")
	}
	ctx, cancel, err := s.bindExecution(ctx, in.GetExecutionToken(), "Monitor")
	if err != nil {
		return nil, err
	}
	defer cancel()
	if err := p.Monitor(ctx, in); err != nil {
		return nil, err
	}
	return &pluginv1.MonitorResponse{}, nil
}
