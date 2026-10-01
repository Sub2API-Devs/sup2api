package core

import (
	"context"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// ExecutionCallbacks are capabilities of one selected account and request.
// The runtime binds them to the exact process chosen for Execute.
type ExecutionCallbacks struct {
	PrepareTimeout time.Duration
	FinishTimeout  time.Duration
	Forward        func(context.Context, *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error)
	Record         func(context.Context, *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error)
	Watch          func(context.Context, *pluginv1.ReserveAndWatchRequest) (*pluginv1.ExecutionReceipt, error)
}

type ExecutePlugin interface {
	Execute(context.Context, *pluginv1.ExecuteRequest, ExecutionCallbacks) (*pluginv1.ExecuteResponse, error)
}

type MonitorPlugin interface {
	Monitor(context.Context, *pluginv1.PollRequest, ExecutionHTTP, func(context.Context, *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error)) error
}

// ExecutionRecords persists the trusted identity before network side effects,
// recoverable host observations afterwards, and the accepted fact digest in
// the same transaction as usage, billing and task registration.
type ExecutionRecords interface {
	BeginExecution(context.Context, ExecutionIntent) error
	ObserveExecution(context.Context, string, *UsageRecord, []byte) error
	CommitExecution(context.Context, ExecutionCommit) (*pluginv1.ExecutionReceipt, error)
}

type ExecutionIntent struct {
	TaskSubmit               bool
	Record                   *UsageRecord
	ID, RequestID, PluginKey string
	AccountID                int64
	Attempt                  int
}

type ExecutionCommit struct {
	ID, Operation, Digest string
	Record                *UsageRecord
	Task                  *TaskRegistration
}
