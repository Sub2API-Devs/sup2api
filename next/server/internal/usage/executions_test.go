package usage

import (
	"context"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestExecutionCommitIsAtomicIdempotentAndRecoverable(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	prepare := func(id string, task ...bool) *core.UsageRecord {
		r := f.record(id, true)
		account := int64(7)
		r.AccountID = &account
		if err := f.svc.BeginExecution(ctx, core.ExecutionIntent{TaskSubmit: len(task) > 0 && task[0], ID: id, RequestID: id, PluginKey: r.PluginKey, AccountID: account, Attempt: 1, Record: r}); err != nil {
			t.Fatal(err)
		}
		if err := f.svc.ObserveExecution(ctx, id, r, []byte("bounded observation")); err != nil {
			t.Fatal(err)
		}
		return r
	}
	r := prepare("atomic-usage")
	commit := core.ExecutionCommit{ID: r.RequestID, Operation: "usage", Digest: strings.Repeat("a", 64), Record: r}
	before := f.balance()
	f.ledger.fail.Store(1)
	if _, err := f.svc.CommitExecution(ctx, commit); err == nil {
		t.Fatal("failed ledger transaction acknowledged")
	}
	if f.scalar(`SELECT count(*) FROM usage_logs WHERE request_id=$1`, r.RequestID) != "0" || !before.Equal(f.balance()) || f.scalar(`SELECT state FROM plugin_executions WHERE id=$1`, r.RequestID) != "observed" {
		t.Fatal("failed commit left partial state")
	}
	if _, err := f.svc.CommitExecution(ctx, commit); err != nil {
		t.Fatal(err)
	}
	after := f.balance()
	if !after.LessThan(before) || f.scalar(`SELECT billing_status FROM usage_logs WHERE request_id=$1`, r.RequestID) != StatusBilled {
		t.Fatal("ACK did not include billing")
	}
	if _, err := f.svc.CommitExecution(ctx, commit); err != nil {
		t.Fatal("lost-ACK retry", err)
	}
	if !after.Equal(f.balance()) {
		t.Fatal("retry double charged")
	}
	commit.Digest = strings.Repeat("b", 64)
	if _, err := f.svc.CommitExecution(ctx, commit); err == nil {
		t.Fatal("conflicting facts accepted")
	}
	if f.scalar(`SELECT count(*) FROM plugin_executions WHERE id=$1 AND record IS NULL AND observation IS NULL`, r.RequestID) != "1" {
		t.Fatal("committed payload retained")
	}
	bad := prepare("unpriceable-observation")
	copyPrice := *bad.Price
	copyPrice.Expression = ""
	bad.Price = &copyPrice
	if _, err := f.db.Pool.Exec(ctx, `UPDATE plugin_executions SET record=$2,updated_at=now()-interval '3 minutes' WHERE id=$1`, bad.RequestID, jsonOr(bad, "{}")); err != nil {
		t.Fatal(err)
	}
	// Immutable execution classification outlives independently cleaned task receipts.
	task := prepare("task-receipt-already-cleaned", true)
	if _, err := f.db.Pool.Exec(ctx, `UPDATE plugin_executions SET updated_at=now()-interval '3 minutes' WHERE id=$1`, task.RequestID); err != nil {
		t.Fatal(err)
	}
	recovery := prepare("recover-observation")
	if _, err := f.db.Pool.Exec(ctx, `UPDATE plugin_executions SET updated_at=now()-interval '2 minutes' WHERE id=$1`, recovery.RequestID); err != nil {
		t.Fatal(err)
	}
	if err := f.svc.recoverExecutions(ctx); err != nil {
		t.Fatal(err)
	}
	if f.scalar(`SELECT billing_status FROM usage_logs WHERE request_id=$1`, recovery.RequestID) != StatusBilled {
		t.Fatal("durable observation not recovered")
	}
	if f.scalar(`SELECT count(*) FROM usage_logs WHERE request_id=$1`, task.RequestID) != "0" || f.scalar(`SELECT state FROM plugin_executions WHERE id=$1`, bad.RequestID) != "observed" {
		t.Fatal("task was recovered as sync usage or invalid facts were billed")
	}
}

func TestExecutionWatchAndMonitorReceiptsCommitWithFinance(t *testing.T) {
	rf := reconcileFixtureWith(t, &core.Account{AccountRef: core.AccountRef{ID: 7, PluginKey: "vid", Type: "vid_key"}, Status: "active"})
	f := rf.fixture
	ctx := context.Background()
	r := f.reserved("watch-receipt", "raw-monitor", core.UsageTokens{Input: 1000, Output: 100})
	id, err := f.svc.BeginTask(ctx, core.TaskIntent{RequestID: r.RequestID, PluginKey: r.PluginKey, Kind: "video", UserID: r.UserID, APIKeyID: r.APIKeyID, GroupID: r.GroupID, AccountID: 7, Model: r.Model, Protocol: r.Protocol})
	if err != nil {
		t.Fatal(err)
	}
	body := []byte(`{"id":"raw-monitor","status":"queued"}`)
	if err = f.svc.ReceiveTask(ctx, r.RequestID, 200, body, ""); err != nil {
		t.Fatal(err)
	}
	if err = f.svc.BeginExecution(ctx, core.ExecutionIntent{ID: r.RequestID, RequestID: r.RequestID, PluginKey: r.PluginKey, AccountID: 7, Attempt: 1, Record: r}); err != nil {
		t.Fatal(err)
	}
	if err = f.svc.ObserveExecution(ctx, r.RequestID, r, body); err != nil {
		t.Fatal(err)
	}
	commit := core.ExecutionCommit{ID: r.RequestID, Operation: "watch", Digest: strings.Repeat("c", 64), Record: r, Task: &core.TaskRegistration{PublicID: id, UpstreamID: "raw-monitor", Kind: "video", Snapshot: body, IDPaths: []string{"id"}, Deadline: time.Hour, Record: r}}
	before := f.balance()
	f.ledger.fail.Store(1)
	if _, err = f.svc.CommitExecution(ctx, commit); err == nil {
		t.Fatal("failed reserve acknowledged")
	}
	if f.scalar(`SELECT count(*) FROM async_tasks WHERE public_id=$1`, id) != "0" || f.scalar(`SELECT count(*) FROM usage_logs WHERE request_id=$1`, r.RequestID) != "0" || !before.Equal(f.balance()) {
		t.Fatal("watch transaction leaked partial state")
	}
	out, err := f.svc.CommitExecution(ctx, commit)
	if err != nil || out.TaskId != id {
		t.Fatal(out, err)
	}
	reserved := f.balance()
	if _, err = f.svc.CommitExecution(ctx, commit); err != nil || !f.balance().Equal(reserved) {
		t.Fatal("watch retry changed debit", err)
	}
	if _, err = f.db.Pool.Exec(ctx, `UPDATE async_tasks SET next_check_at=now() WHERE public_id=$1`, id); err != nil {
		t.Fatal(err)
	}
	entries, err := f.svc.claimTasks(ctx, 1)
	if err != nil || len(entries) != 1 {
		t.Fatal(err, len(entries))
	}
	e := entries[0]
	e.task.paths = []string{"id"}
	row, err := f.svc.loadReserved(ctx, e.usageLogID)
	if err != nil {
		t.Fatal(err)
	}
	result := &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_FAILED, TaskSnapshotJson: `{"id":"raw-monitor","status":"failed"}`}
	e.monitor = &monitorOutcome{ctx: ctx, id: "monitor-claim", digest: strings.Repeat("d", 64), taskID: id}
	f.ledger.fail.Store(1)
	if err = f.svc.applyMonitorResult(ctx, e, row, result); err == nil {
		t.Fatal("failed refund acknowledged")
	}
	if f.scalar(`SELECT state FROM async_tasks WHERE public_id=$1`, id) != "pending" || f.scalar(`SELECT count(*) FROM plugin_monitor_receipts`) != "0" || !f.balance().Equal(reserved) {
		t.Fatal("failed monitor transaction published outcome")
	}
	if err = f.svc.applyMonitorResult(ctx, e, row, result); err != nil {
		t.Fatal(err)
	}
	if !e.monitor.done || !f.balance().Equal(before) || f.scalar(`SELECT observation_status FROM async_tasks WHERE public_id=$1`, id) != "closed" {
		t.Fatal("monitor ACK preceded finance/snapshot/close")
	}
	if err = f.svc.applyMonitorResult(ctx, e, row, result); err != nil {
		t.Fatal("lost monitor ACK retry", err)
	}
	e.monitor.digest = strings.Repeat("e", 64)
	if err = f.svc.applyMonitorResult(ctx, e, row, result); err == nil {
		t.Fatal("different result accepted after claim cleared")
	}
	if !f.balance().Equal(before) {
		t.Fatal("monitor retry changed refund")
	}
	// The actual scheduler path selects Monitor and never applies its result
	// again after the callback already committed it.
	gen := f.svc.rec.Registry.Current().(*recGen)
	gen.info.Manifest = &manifest.Manifest{Capabilities: []manifest.Capability{{ID: manifest.CapPlatformMonitor}}}
	gen.client = &receiptMonitor{recPlugin: rf.plugin, url: rf.up.URL}
	legacy := f.reserved("monitor-scheduler", "monitor-raw", core.UsageTokens{Input: 1000, Output: 100})
	f.svc.process(ctx, []*core.UsageRecord{legacy})
	f.due()
	f.svc.ReconcileDue(ctx)
	if f.scalar(`SELECT state FROM pending_settlements WHERE ref_id='monitor-raw'`) != "failed" || f.scalar(`SELECT attempts FROM pending_settlements WHERE ref_id='monitor-raw'`) != "1" || rf.hits.Load() != 1 {
		t.Fatal("Monitor was not selected or was applied twice")
	}
}

type receiptMonitor struct {
	*recPlugin
	url string
}

func (p *receiptMonitor) Monitor(ctx context.Context, in *pluginv1.PollRequest, http core.ExecutionHTTP, report func(context.Context, *pluginv1.ReportTaskProgressRequest) (*pluginv1.ExecutionReceipt, error)) error {
	if _, err := http(ctx, &pluginv1.ExecutionHTTPRequest{Url: p.url}); err != nil {
		return err
	}
	req := &pluginv1.ReportTaskProgressRequest{Result: &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_FAILED, Reason: "failed"}}
	if _, err := report(ctx, req); err != nil {
		return err
	}
	_, err := report(ctx, req)
	return err
}
