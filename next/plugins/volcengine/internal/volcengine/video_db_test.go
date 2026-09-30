package volcengine

// Database-backed tests of the video task line: ExtractUsage persists a task
// and reserves, ResolveModel reads the model back, and a succeeded task with
// no usage is closed on the reservation (SETTLED_ESTIMATE) rather than at
// zero. They reuse startRoutes (which applies migrations 0001 and 0002 and
// registers account id 1) and are skipped when TEST_DATABASE_URL is unset.

import (
	"context"
	"strconv"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// submitTask drives ExtractUsage for one submit and returns the reservation.
// fields is the request view the host delivers; nil means the submit stated
// nothing, which is a legitimate request and lands on the model's bounds.
func submitTask(t *testing.T, p *Plugin, accountID, userID int64, model, taskID string, fields map[string]string) *pluginv1.Reservation {
	t.Helper()
	rep, err := p.ExtractUsage(context.Background(), &pluginv1.ExtractUsageRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolVideoSubmit, Model: model, UserId: userID},
		Account: &pluginv1.Account{Id: accountID},
		Status:  200,
		Body:    []byte(`{"id":"` + taskID + `"}`),
		Fields:  fields,
	})
	if err != nil {
		t.Fatalf("ExtractUsage: %v", err)
	}
	if rep.GetReserve() == nil {
		t.Fatal("no reservation")
	}
	return rep.GetReserve()
}

// requested is the field view of a submit that stated a resolution, a ratio
// and a duration.
func requested(resolution, ratio string, seconds int) map[string]string {
	return map[string]string{
		PathResolution:   `"` + resolution + `"`,
		PathRatio:        `"` + ratio + `"`,
		PathDuration:     strconv.Itoa(seconds),
		PathContentCount: `1`,
		"content.0.text": `"a cat yawning at the camera"`,
	}
}

// TestVideoExtractUsagePersists submits a task and checks the ledger row: the
// model, user and estimate are stored, and the reservation carries the same
// estimate and the 7-day deadline.
func TestVideoExtractUsagePersists(t *testing.T) {
	p, _, _ := startRoutes(t)
	ctx := context.Background()

	rv := submitTask(t, p, 1, 42, "doubao-seedance-2-0-260128", "cgt-persist-1", requested(Res1080, Ratio169, 5))
	// The estimate is the request's own 5 seconds of 1080p 16:9, read out of
	// the submit body - not the model's 4k maximum for a guessed ten seconds.
	wantEst := int64(5) * 1920 * 1080 * videoFPS / 1024
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
	submitTask(t, p, 1, 99, "doubao-seedance-1-0-pro-250528", "cgt-persist-1", requested(Res720, Ratio169, 4))
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
	submitTask(t, p, 1, 1, "doubao-seedance-1-5-pro-251215", "cgt-resolve-1", requested(Res720, Ratio169, 5))

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

// TestVideoReconcileEstimateFallback pins the money case this line has always
// had to get right: a task Ark reports as SUCCEEDED but with no usage numbers
// must not be settled at zero, because that reprices the row at zero and
// refunds the whole reservation - a video delivered for free, with nothing in
// the record saying so.
//
// The mechanism changed, the risk did not. It used to be answered with the
// plugin's own est_tokens column; it is now answered with the core's
// SETTLED_ESTIMATE, which keeps the reservation as the final charge and marks
// the row reconcile=estimated. So the assertion is on the STATE, plus the
// invariant that makes the state matter: a succeeded task is never SETTLED
// with zero tokens.
func TestVideoReconcileEstimateFallback(t *testing.T) {
	p, _, _ := startRoutes(t)
	ctx := context.Background()
	rv := submitTask(t, p, 1, 1, "doubao-seedance-1-0-pro-250528", "cgt-nousage", requested(Res720, Ratio169, 5))
	if rv.GetTokens().GetOutputTokens() <= 0 {
		t.Fatal("the submit did not reserve an estimate, so there is nothing for the reconcile to keep")
	}

	// Succeeded, but the body carries no usage at all.
	res, err := p.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
		Entry: &pluginv1.ReconcileEntry{RefId: "cgt-nousage"}, Status: 200,
		Body: []byte(`{"status":"succeeded","content":{"video_url":"https://x/v.mp4"}}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.GetState() != pluginv1.ReconcileResult_SETTLED_ESTIMATE {
		t.Fatalf("state = %v, want SETTLED_ESTIMATE; SETTLED here refunds the whole reservation "+
			"and gives the video away", res.GetState())
	}
	// SETTLED_ESTIMATE ignores tokens and facts, and the core warns when they
	// are sent ("a plugin with real figures should answer SETTLED").
	if res.GetTokens() != nil || len(res.GetFacts()) != 0 {
		t.Fatalf("SETTLED_ESTIMATE must carry no tokens or facts: %v", res)
	}
	if res.GetReason() == "" {
		t.Fatal("SETTLED_ESTIMATE should note why no usage was available")
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

	// est_tokens is still recorded - the figure the task was pre-charged with,
	// which is the first thing asked for when a charge is questioned - but
	// nothing in the plugin reads it any more. Deleting it must therefore NOT
	// change the answer above: that is what "the core holds the estimate now"
	// means, and it is the direct proof, not "the old column is gone".
	if _, err := db.Exec(ctx, `UPDATE video_tasks SET est_tokens = 0 WHERE task_id = $1`, "cgt-nousage"); err != nil {
		t.Fatal(err)
	}
	res, err = p.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
		Entry: &pluginv1.ReconcileEntry{RefId: "cgt-nousage"}, Status: 200,
		Body: []byte(`{"status":"succeeded","content":{"video_url":"https://x/v.mp4"}}`),
	})
	if err != nil || res.GetState() != pluginv1.ReconcileResult_SETTLED_ESTIMATE {
		t.Fatalf("with est_tokens cleared: state = %v (%v), want SETTLED_ESTIMATE", res.GetState(), err)
	}

	// A real usage figure wins: that is a SETTLED with the real number.
	res, _ = p.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
		Entry: &pluginv1.ReconcileEntry{RefId: "cgt-nousage"}, Status: 200,
		Body: []byte(`{"status":"succeeded","usage":{"completion_tokens":5},"content":{"resolution":"480p"}}`),
	})
	if res.GetState() != pluginv1.ReconcileResult_SETTLED ||
		res.GetTokens().GetOutputTokens() != 5 || res.GetFacts()[FactResolution] != Res480 {
		t.Fatalf("real usage should win: %v", res)
	}

	submitTask(t, p, 1, 1, "m", "cgt-fail", nil)
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
