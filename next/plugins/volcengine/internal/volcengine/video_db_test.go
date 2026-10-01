package volcengine

import (
	"context"
	"strconv"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// submitTask uses the synchronous managed task parser. The host owns durable
// task identity and billing; invoking this parser must not write plugin tables.
func submitTask(t *testing.T, p *Plugin, accountID, userID int64, model, taskID string, fields map[string]string) *pluginv1.Reservation {
	t.Helper()
	task, err := p.ParseTaskSubmission(context.Background(), &pluginv1.ExtractUsageRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolVideoSubmit, Model: model, UserId: userID},
		Account: &pluginv1.Account{Id: accountID}, Status: 200,
		Body: []byte(`{"id":"` + taskID + `"}`), Fields: fields,
	})
	if err != nil {
		t.Fatalf("ParseTaskSubmission: %v", err)
	}
	if task.GetUsage().GetReserve() == nil {
		t.Fatal("no reservation")
	}
	return task.GetUsage().GetReserve()
}

func requested(resolution, ratio string, seconds int) map[string]string {
	return map[string]string{
		PathResolution: `"` + resolution + `"`, PathRatio: `"` + ratio + `"`, PathDuration: strconv.Itoa(seconds),
		PathContentCount: `1`, "content.0.text": `"a cat yawning at the camera"`,
	}
}

func TestVideoSubmissionDoesNotWritePluginLedger(t *testing.T) {
	p, h, _ := startRoutes(t)
	rv := submitTask(t, p, 1, 42, "doubao-seedance-2-0-260128", "same-upstream-id", requested(Res1080, Ratio169, 5))
	want := int64(5*videoFPS+1) * 1920 * 1080 / 1024
	if rv.GetTokens().GetOutputTokens() != want || rv.GetDeadlineSec() != DeadlineSec {
		t.Fatalf("reservation=%v", rv)
	}
	// Different accounts may return the same ID. The plugin must not overwrite
	// an identity row: the host assigns independent public task IDs to them.
	submitTask(t, p, 2, 99, "doubao-seedance-1-0-pro-250528", "same-upstream-id", requested(Res720, Ratio169, 4))
	var n int
	if err := h.pool.QueryRow(context.Background(), `SELECT count(*) FROM video_tasks`).Scan(&n); err != nil || n != 0 {
		t.Fatalf("task parser wrote a second identity ledger: rows=%d err=%v", n, err)
	}
}

// Only old manifests still call ResolveModel. Managed queries use the core's
// trusted usage history for legacy IDs, because the old plugin table could
// have been overwritten by a duplicate upstream ID before this release.
func TestLegacyVideoResolveModelChecksOwner(t *testing.T) {
	p, h, _ := startRoutes(t)
	ctx := context.Background()
	if _, err := h.pool.Exec(ctx, `INSERT INTO video_tasks(task_id,account_id,model,user_id,state,est_tokens)
  VALUES ('cgt-legacy',1,'doubao-seedance-1-5-pro-251215',42,'running',123)`); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		uid      int64
		id, want string
	}{
		{42, "cgt-legacy", "doubao-seedance-1-5-pro-251215"},
		{43, "cgt-legacy", ""}, {0, "cgt-legacy", ""}, {42, "missing", ""},
	} {
		r, err := p.ResolveModel(ctx, &pluginv1.ResolveModelRequest{Meta: &pluginv1.RequestMeta{
			Protocol: ProtocolVideoQuery, UserId: tc.uid, PathParams: map[string]string{TaskIDParam: tc.id},
		}})
		if err != nil || r.GetModel() != tc.want || r.GetStream() {
			t.Fatalf("user=%d task=%q: %v %v", tc.uid, tc.id, r, err)
		}
	}
}

// A succeeded task without usage retains the host's reservation. Changing the
// old plugin estimate cannot change the decision or refund delivered work.
func TestVideoReconcileEstimateFallback(t *testing.T) {
	p, h, _ := startRoutes(t)
	ctx := context.Background()
	rv := submitTask(t, p, 1, 1, "doubao-seedance-1-0-pro-250528", "cgt-nousage", requested(Res720, Ratio169, 5))
	if rv.GetTokens().GetOutputTokens() <= 0 {
		t.Fatal("no estimate to retain")
	}
	if _, err := h.pool.Exec(ctx, `INSERT INTO video_tasks(task_id,account_id,model,user_id,state,est_tokens)
  VALUES ('cgt-nousage',1,'m',1,'running',999999)`); err != nil {
		t.Fatal(err)
	}
	for _, estimate := range []int64{999999, 0} {
		if _, err := h.pool.Exec(ctx, `UPDATE video_tasks SET est_tokens=$1 WHERE task_id='cgt-nousage'`, estimate); err != nil {
			t.Fatal(err)
		}
		r, err := p.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
			Entry: &pluginv1.ReconcileEntry{RefId: "cgt-nousage", TaskKind: "video", Model: "m"}, Status: 200,
			Body: []byte(`{"status":"succeeded","content":{"video_url":"https://x/v.mp4"}}`),
		})
		if err != nil || r.GetState() != pluginv1.ReconcileResult_SETTLED_ESTIMATE || r.GetTokens() != nil || len(r.GetFacts()) != 0 || r.GetReason() == "" || r.GetTaskSnapshotJson() == "" {
			t.Fatalf("estimate=%d: %v %v", estimate, r, err)
		}
	}
	var state string
	if err := h.pool.QueryRow(ctx, `SELECT state FROM video_tasks WHERE task_id='cgt-nousage'`).Scan(&state); err != nil || state != "running" {
		t.Fatalf("parser mutated the legacy mirror: %q %v", state, err)
	}
	r, err := p.ParseReconcileResponse(ctx, &pluginv1.ParseReconcileResponseRequest{
		Entry: &pluginv1.ReconcileEntry{RefId: "cgt-nousage", TaskKind: "video"}, Status: 200,
		Body: []byte(`{"status":"succeeded","usage":{"completion_tokens":5},"content":{"resolution":"480p"}}`),
	})
	if err != nil || r.GetState() != pluginv1.ReconcileResult_SETTLED || r.GetTokens().GetOutputTokens() != 5 || r.GetFacts()[FactResolution] != Res480 {
		t.Fatalf("real usage must win: %v %v", r, err)
	}
}
