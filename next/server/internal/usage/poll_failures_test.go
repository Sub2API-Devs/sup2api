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

func TestManagedPollFailuresPersistResetAndRefundAtomically(t *testing.T) {
	rf := reconcileFixtureWith(t, &core.Account{AccountRef: core.AccountRef{ID: 7, PluginKey: "vid", Type: "vid_key"}, Status: "active"})
	f, ctx := rf.fixture, context.Background()
	gen := f.svc.rec.Registry.Current().(*recGen)
	gen.pf.Endpoints = append(gen.pf.Endpoints, manifest.Endpoint{ID: "query", Protocol: "vid.query", Task: &manifest.AsyncTaskEndpoint{Action: manifest.TaskActionQuery, Kind: "video", IDParam: "id", IDPaths: []string{"id"}}})
	r := f.reserved("poll-failures", "raw-poll", core.UsageTokens{Input: 1000, Output: 100})
	before := f.balance()
	id, err := f.svc.BeginTask(ctx, core.TaskIntent{RequestID: r.RequestID, PluginKey: r.PluginKey, Kind: "video", UserID: r.UserID, APIKeyID: r.APIKeyID, GroupID: r.GroupID, AccountID: 7, Model: r.Model, Protocol: r.Protocol})
	if err != nil {
		t.Fatal(err)
	}
	body := []byte(`{"id":"raw-poll","status":"queued"}`)
	if err = f.svc.ReceiveTask(ctx, r.RequestID, 200, body, ""); err != nil {
		t.Fatal(err)
	}
	if err = f.svc.RegisterTask(ctx, core.TaskRegistration{PublicID: id, UpstreamID: "raw-poll", Kind: "video", Snapshot: body, IDPaths: []string{"id"}, Deadline: time.Hour, Record: r}); err != nil {
		t.Fatal(err)
	}
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := f.db.Pool.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	claim := func(s *Service) *settleEntry {
		t.Helper()
		exec(`UPDATE async_tasks SET next_check_at=now() WHERE public_id=$1`, id)
		es, err := s.claimTasks(ctx, 1)
		if err != nil || len(es) != 1 {
			t.Fatalf("claim %v %v", es, err)
		}
		return es[0]
	}
	rf.plugin.parse = func(*pluginv1.ParseReconcileResponseRequest) (*pluginv1.ReconcileResult, error) {
		return &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_POLL_FAILED, Reason: "HTTP 503"}, nil
	}
	f.svc.reconcileTask(ctx, claim(f.svc))
	if got := f.scalar(`SELECT poll_failures FROM async_tasks WHERE public_id=$1`, id); got != "1" {
		t.Fatal(got)
	}
	// A new core instance resumes the same counter; a busy original account does not spend it.
	nodeB := New(f.db, f.ledger, nil, Options{})
	nodeB.rec = f.svc.rec
	e := claim(nodeB)
	row, err := nodeB.loadReserved(ctx, e.usageLogID)
	if err != nil {
		t.Fatal(err)
	}
	nodeB.handlePollError(ctx, e, row, nodeB.reconcileSettings(ctx), errTaskDeferred)
	if got := f.scalar(`SELECT poll_failures FROM async_tasks WHERE public_id=$1`, id); got != "1" {
		t.Fatal(got)
	}
	nodeB.reconcileTask(ctx, claim(nodeB))
	if got := f.scalar(`SELECT poll_failures FROM async_tasks WHERE public_id=$1`, id); got != "2" {
		t.Fatal(got)
	}
	// More than the old total-attempt limit still permits a valid pending observation.
	exec(`UPDATE async_tasks SET attempts=1000 WHERE public_id=$1`, id)
	rf.plugin.parse = func(*pluginv1.ParseReconcileResponseRequest) (*pluginv1.ReconcileResult, error) {
		return &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_PENDING, TaskSnapshotJson: `{"id":"raw-poll","status":"running"}`}, nil
	}
	nodeB.reconcileTask(ctx, claim(nodeB))
	if f.scalar(`SELECT poll_failures FROM async_tasks WHERE public_id=$1`, id) != "0" || f.scalar(`SELECT observation_status FROM async_tasks WHERE public_id=$1`, id) != "pending" {
		t.Fatal("valid progress failed to reset")
	}
	exec(`UPDATE async_tasks SET poll_failures=19 WHERE public_id=$1`, id)
	e = claim(nodeB)
	row, err = nodeB.loadReserved(ctx, e.usageLogID)
	if err != nil {
		t.Fatal(err)
	}
	e.monitor = &monitorOutcome{ctx: ctx, id: "failure-claim", digest: strings.Repeat("a", 64), taskID: id}
	result := &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_POLL_FAILED, Reason: "HTTP 503"}
	reserved := f.balance()
	f.ledger.fail.Store(1)
	if err = nodeB.applyMonitorResult(ctx, e, row, result); err == nil {
		t.Fatal("failed refund acknowledged")
	}
	if !f.balance().Equal(reserved) || f.scalar(`SELECT poll_failures FROM async_tasks WHERE public_id=$1`, id) != "19" || f.scalar(`SELECT observation_status FROM async_tasks WHERE public_id=$1`, id) != "pending" {
		t.Fatal("failed transaction leaked state")
	}
	if err = nodeB.applyMonitorResult(ctx, e, row, result); err != nil {
		t.Fatal(err)
	}
	if err = nodeB.applyMonitorResult(ctx, e, row, result); err != nil {
		t.Fatal("receipt retry", err)
	}
	if !f.balance().Equal(before) || f.scalar(`SELECT poll_failures FROM async_tasks WHERE public_id=$1`, id) != "20" || f.scalar(`SELECT failure_code FROM async_tasks WHERE public_id=$1`, id) != "task_poll_failed" {
		t.Fatal("cutoff/refund incorrect")
	}
	if got := f.scalar(`SELECT count(*) FROM balance_ledger WHERE kind='refund'`); got != "1" {
		t.Fatal("duplicate refund", got)
	}
}

func TestPollFailurePolicyAndLegacyMonitorReceipt(t *testing.T) {
	for _, state := range []pluginv1.ReconcileResult_State{pluginv1.ReconcileResult_NOT_FOUND, pluginv1.ReconcileResult_POLL_FAILED} {
		t.Run(state.String(), func(t *testing.T) {
			rf := reconcileFixtureWith(t, &core.Account{AccountRef: core.AccountRef{ID: 7, PluginKey: "vid", Type: "vid_key"}, Status: "active"})
			f, ctx := rf.fixture, context.Background()
			before := f.balance()
			f.svc.process(ctx, []*core.UsageRecord{f.reserved("legacy-poll", "raw", core.UsageTokens{Input: 1000, Output: 100})})
			f.due()
			es, err := f.svc.claimDue(ctx, 1)
			if err != nil || len(es) != 1 {
				t.Fatal(err, len(es))
			}
			e := es[0]
			row, err := f.svc.loadReserved(ctx, e.usageLogID)
			if err != nil {
				t.Fatal(err)
			}
			e.monitor = &monitorOutcome{ctx: ctx, id: "legacy-poll", digest: strings.Repeat("b", 64)}
			result := &pluginv1.ReconcileResult{State: state, Reason: "query failed"}
			if err = f.svc.applyMonitorResult(ctx, e, row, result); err != nil {
				t.Fatal(err)
			}
			if err = f.svc.applyMonitorResult(ctx, e, row, result); err != nil {
				t.Fatal("retry", err)
			}
			if state == pluginv1.ReconcileResult_NOT_FOUND {
				if !f.balance().Equal(before) {
					t.Fatal("missing refund")
				}
			} else if f.scalar(`SELECT poll_failures FROM pending_settlements`) != "1" {
				t.Fatal("receipt did not deduplicate failure count")
			}
		})
	}
	if DefaultReconcileSettings().resolve().maxPollFailures != 20 {
		t.Fatal("default cutoff")
	}
	if (ReconcileSettings{MaxPollFailures: 0}).resolve().maxPollFailures != 0 {
		t.Fatal("disabled cutoff")
	}
}

func TestManagedObservationTerminationPolicy(t *testing.T) {
	for _, mode := range []string{"not_found", "timeout", "free", "disabled", "confirmed"} {
		t.Run(mode, func(t *testing.T) {
			rf := reconcileFixtureWith(t, &core.Account{AccountRef: core.AccountRef{ID: 7, PluginKey: "vid", Type: "vid_key"}, Status: "active"})
			f, ctx := rf.fixture, context.Background()
			r := f.reserved("policy-task", "raw-policy", core.UsageTokens{Input: 1000, Output: 100})
			if mode == "free" {
				r.Billable = false
				r.Price = nil
				r.Reservation = nil
			}
			before := f.balance()
			id, err := f.svc.BeginTask(ctx, core.TaskIntent{RequestID: r.RequestID, PluginKey: r.PluginKey, Kind: "video", UserID: r.UserID, APIKeyID: r.APIKeyID, GroupID: r.GroupID, AccountID: 7, Model: r.Model, Protocol: r.Protocol})
			if err != nil {
				t.Fatal(err)
			}
			body := []byte(`{"id":"raw-policy","status":"queued"}`)
			if err = f.svc.ReceiveTask(ctx, r.RequestID, 200, body, ""); err != nil {
				t.Fatal(err)
			}
			if err = f.svc.RegisterTask(ctx, core.TaskRegistration{PublicID: id, UpstreamID: "raw-policy", Kind: "video", Snapshot: body, IDPaths: []string{"id"}, Deadline: time.Hour, Record: r}); err != nil {
				t.Fatal(err)
			}
			if _, err = f.db.Pool.Exec(ctx, `UPDATE async_tasks SET next_check_at=now() WHERE public_id=$1`, id); err != nil {
				t.Fatal(err)
			}
			es, err := f.svc.claimTasks(ctx, 1)
			if err != nil || len(es) != 1 {
				t.Fatal(err, len(es))
			}
			e := es[0]
			row, err := f.svc.loadReserved(ctx, e.usageLogID)
			if err != nil {
				t.Fatal(err)
			}
			switch mode {
			case "timeout":
				e.deadlineAt = time.Now().Add(-time.Second)
				f.svc.reconcileTask(ctx, e)
			case "disabled":
				cfg := f.svc.reconcileSettings(ctx)
				cfg.maxPollFailures = 0
				e.pollFailures = 100
				f.svc.recordPollFailure(ctx, e, row, cfg, "HTTP 503", 0)
			case "confirmed":
				e.task.state = "succeeded"
				if _, err = f.db.Pool.Exec(ctx, `UPDATE async_tasks SET state='succeeded' WHERE public_id=$1`, id); err != nil {
					t.Fatal(err)
				}
				f.svc.failObservation(ctx, e, row, "task_not_found", "expired upstream result")
			default:
				f.svc.handlePollResult(ctx, e, row, f.svc.reconcileSettings(ctx), &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_NOT_FOUND, Reason: "gone"})
			}
			if mode == "disabled" {
				if f.scalar(`SELECT observation_status FROM async_tasks WHERE public_id=$1`, id) != "pending" || f.balance().Equal(before) {
					t.Fatal("disabled cutoff closed/refunded task")
				}
				return
			}
			if mode == "confirmed" {
				if f.scalar(`SELECT state FROM async_tasks WHERE public_id=$1`, id) != "succeeded" || f.balance().Equal(before) {
					t.Fatal("confirmed success revoked")
				}
				return
			}
			want := "task_not_found"
			if mode == "timeout" {
				want = "task_timeout"
			}
			if f.scalar(`SELECT failure_code FROM async_tasks WHERE public_id=$1`, id) != want || f.scalar(`SELECT state FROM async_tasks WHERE public_id=$1`, id) != "failed" || !f.balance().Equal(before) {
				t.Fatal("policy did not close and refund correctly")
			}
			stored, err := f.svc.FindTask(ctx, core.TaskQuery{ID: id, PluginKey: "vid", Kind: "video", UserID: r.UserID, GroupID: r.GroupID})
			if err != nil || stored.FailureCode != want {
				t.Fatal("missing durable query error", stored, err)
			}
		})
	}
}
