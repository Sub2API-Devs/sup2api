package volcengine

// Database-backed tests of the video task line: ExtractUsage persists a task
// and reserves, ResolveModel reads the model back, and a succeeded task with
// no usage settles on the stored estimate. They reuse startRoutes (which
// applies migrations 0001 and 0002 and registers account id 1) and are
// skipped when TEST_DATABASE_URL is unset.

import (
	"context"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// submitTask drives ExtractUsage for one submit and returns the task id.
func submitTask(t *testing.T, p *Plugin, accountID, userID int64, model, taskID string) *pluginv1.Reservation {
	t.Helper()
	rep, err := p.ExtractUsage(context.Background(), &pluginv1.ExtractUsageRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolVideoSubmit, Model: model, UserId: userID},
		Account: &pluginv1.Account{Id: accountID},
		Status:  200,
		Body:    []byte(`{"id":"` + taskID + `"}`),
	})
	if err != nil {
		t.Fatalf("ExtractUsage: %v", err)
	}
	if rep.GetReserve() == nil {
		t.Fatal("no reservation")
	}
	return rep.GetReserve()
}

// TestVideoExtractUsagePersists submits a task and checks the ledger row: the
// model, user and estimate are stored, and the reservation carries the same
// estimate and the 7-day deadline.
func TestVideoExtractUsagePersists(t *testing.T) {
	p, _, _ := startRoutes(t)
	ctx := context.Background()

	rv := submitTask(t, p, 1, 42, "doubao-seedance-2-0-260128", "cgt-persist-1")
	wantEst := EstimateTokens(EstimateDurationSec, Res4K)
	if rv.GetTokens().GetOutputTokens() != wantEst {
		t.Fatalf("reservation tokens = %d, want %d", rv.GetTokens().GetOutputTokens(), wantEst)
	}
	if rv.GetDeadlineSec() != DeadlineSec {
		t.Fatalf("deadline_sec = %d", rv.GetDeadlineSec())
	}

	db, _ := p.host.DB(ctx)
	var (
		accountID, userID, est int64
		model, state           string
	)
	if err := db.QueryRow(ctx,
		`SELECT account_id, user_id, model, state, est_tokens FROM video_tasks WHERE task_id = $1`, "cgt-persist-1").
		Scan(&accountID, &userID, &model, &state, &est); err != nil {
		t.Fatalf("row: %v", err)
	}
	if accountID != 1 || userID != 42 || model != "doubao-seedance-2-0-260128" || state != TaskRunning || est != wantEst {
		t.Fatalf("row = account %d user %d model %q state %q est %d", accountID, userID, model, state, est)
	}

	// A resubmit of the same upstream id updates the one row instead of
	// duplicating it.
	submitTask(t, p, 1, 99, "doubao-seedance-1-0-pro-250528", "cgt-persist-1")
	var count int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM video_tasks WHERE task_id = $1`, "cgt-persist-1").Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("resubmit produced %d rows", count)
	}
}

// TestVideoResolveModel resolves the model of a poll from the task id, and
// returns an empty model (a 400) for a task the ledger does not know.
func TestVideoResolveModel(t *testing.T) {
	p, _, _ := startRoutes(t)
	ctx := context.Background()
	submitTask(t, p, 1, 1, "doubao-seedance-1-5-pro-251215", "cgt-resolve-1")

	r, err := p.ResolveModel(ctx, &pluginv1.ResolveModelRequest{
		Meta: &pluginv1.RequestMeta{Protocol: ProtocolVideoQuery, PathParams: map[string]string{"task_id": "cgt-resolve-1"}},
	})
	if err != nil || r.GetModel() != "doubao-seedance-1-5-pro-251215" || r.GetStream() {
		t.Fatalf("resolve = %q stream=%v (%v)", r.GetModel(), r.GetStream(), err)
	}

	// An unknown task id resolves to an empty model, which the core turns into
	// a 400.
	r, err = p.ResolveModel(ctx, &pluginv1.ResolveModelRequest{
		Meta: &pluginv1.RequestMeta{Protocol: ProtocolVideoQuery, PathParams: map[string]string{"task_id": "cgt-unknown"}},
	})
	if err != nil || r.GetModel() != "" {
		t.Fatalf("unknown task = %q (%v)", r.GetModel(), err)
	}
}

// TestVideoReconcileEstimateFallback checks the money case the est_tokens
// column exists for: a task Ark reports as succeeded but with NO usage numbers
// settles on the stored estimate, not on 0, and the ledger row is marked done.
func TestVideoReconcileEstimateFallback(t *testing.T) {
	p, _, _ := startRoutes(t)
	ctx := context.Background()
	rv := submitTask(t, p, 1, 1, "doubao-seedance-1-0-pro-250528", "cgt-nousage")
	wantEst := rv.GetTokens().GetOutputTokens()

	// Succeeded, but the body carries no usage at all.
	res, err := p.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
		Entry: &pluginv1.ReconcileEntry{RefId: "cgt-nousage"}, Status: 200,
		Body: []byte(`{"status":"succeeded","content":{"video_url":"https://x/v.mp4"}}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.GetState() != pluginv1.ReconcileResult_SETTLED {
		t.Fatalf("state = %v", res.GetState())
	}
	if res.GetTokens().GetOutputTokens() != wantEst {
		t.Fatalf("settled tokens = %d, want the estimate %d (settling on 0 would give the video away)",
			res.GetTokens().GetOutputTokens(), wantEst)
	}

	// The ledger state was updated to done.
	db, _ := p.host.DB(ctx)
	var state string
	if err := db.QueryRow(ctx, `SELECT state FROM video_tasks WHERE task_id = $1`, "cgt-nousage").Scan(&state); err != nil {
		t.Fatal(err)
	}
	if state != TaskDone {
		t.Fatalf("state after succeeded = %q", state)
	}

	// A real usage figure wins over the estimate, and a failed status marks
	// the row failed.
	res, _ = p.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
		Entry: &pluginv1.ReconcileEntry{RefId: "cgt-nousage"}, Status: 200,
		Body: []byte(`{"status":"succeeded","usage":{"completion_tokens":5},"content":{"resolution":"480p"}}`),
	})
	if res.GetTokens().GetOutputTokens() != 5 || res.GetFacts()[FactResolution] != Res480 {
		t.Fatalf("real usage should win: %v", res)
	}

	submitTask(t, p, 1, 1, "m", "cgt-fail")
	p.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
		Entry: &pluginv1.ReconcileEntry{RefId: "cgt-fail"}, Status: 200,
		Body: []byte(`{"status":"failed","error":{"message":"boom"}}`),
	})
	if err := db.QueryRow(ctx, `SELECT state FROM video_tasks WHERE task_id = $1`, "cgt-fail").Scan(&state); err != nil {
		t.Fatal(err)
	}
	if state != TaskFailed {
		t.Fatalf("state after failed = %q", state)
	}
}
