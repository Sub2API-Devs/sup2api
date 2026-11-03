package account

import (
	"context"
	"slices"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func candidateIDs(t *testing.T, s *Service, groupID int64) []int64 {
	t.Helper()
	refs, err := s.Candidates(context.Background(), groupID, nil)
	if err != nil {
		t.Fatal(err)
	}
	ids := make([]int64, len(refs))
	for i, r := range refs {
		ids[i] = r.ID
	}
	return ids
}

// A timed automatic disable expires by itself: routing serves the account as
// soon as its release time passes, before the recovery sweep writes it back
// (lazy expiry, as the legacy temp_unschedulable_until). A disable without a
// release time keeps the account out.
func TestTimedAutoDisableExpiresLazily(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	g := e.exec1(`INSERT INTO groups (name) VALUES ('default') RETURNING id`)
	mk := func(name string) int64 {
		id := e.mkRawAccount("anthropic", "apikey", name, "sk-good-key-123", true)
		if _, err := e.db.Pool.Exec(ctx, `INSERT INTO account_groups (account_id, group_id) VALUES ($1, $2)`, id, g); err != nil {
			t.Fatal(err)
		}
		return id
	}
	active, expired, pending, longTerm, offSwitch := mk("active"), mk("expired"), mk("pending"), mk("long-term"), mk("unschedulable")
	for id, set := range map[int64]string{
		expired:   `status='auto_disabled',auto_disabled_until=clock_timestamp()-interval '1 minute'`,
		pending:   `status='auto_disabled',auto_disabled_until=clock_timestamp()+interval '1 hour'`,
		longTerm:  `status='auto_disabled',auto_disabled_until=NULL`,
		offSwitch: `status='auto_disabled',auto_disabled_until=clock_timestamp()-interval '1 minute',schedulable=false`,
	} {
		if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET `+set+` WHERE id=$1`, id); err != nil {
			t.Fatal(err)
		}
	}
	e.svc.invalidate()
	got := candidateIDs(t, e.svc, g)
	slices.Sort(got)
	want := []int64{active, expired}
	slices.Sort(want)
	if !slices.Equal(got, want) {
		t.Fatalf("candidates %v, want %v", got, want)
	}
	if e.accountStatus(expired) != "auto_disabled" {
		t.Fatal("routing must not depend on the sweep having run")
	}

	// A disable written through the service lapses at its release time even
	// while the group snapshot stays cached.
	timed := mk("timed")
	e.svc.invalidate()
	out, err := e.svc.ApplyAccountAutomaticState(ctx, timed, &pluginv1.AccountAutomaticState{
		Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Reason: "rate limited",
		Release: &pluginv1.AccountAutomaticState_DurationSeconds{DurationSeconds: 1}})
	if err != nil || out.GetStatus() != "auto_disabled" {
		t.Fatalf("disable: %v %v", out, err)
	}
	if slices.Contains(candidateIDs(t, e.svc, g), timed) {
		t.Fatal("served before its release time")
	}
	time.Sleep(time.Until(time.Unix(out.GetUntilUnix()+1, 0))) // the reply rounds down to the second
	if !slices.Contains(candidateIDs(t, e.svc, g), timed) {
		t.Fatal("not served after its release time")
	}
}

// The task that writes expired disables back runs once when a node takes
// over, for what expired while the core was down.
func TestAutomaticRecoveryTaskRunsAtStart(t *testing.T) {
	e := setup(t)
	id := e.mkRawAccount("anthropic", "apikey", "overdue", "sk-good-key-123", true)
	if _, err := e.db.Pool.Exec(t.Context(), `UPDATE accounts SET status='auto_disabled',auto_disabled_until=clock_timestamp()-interval '1 hour' WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	tasks := registerTasks(t, New(e.svc.d))
	spec := tasks.spec(t, AutomaticRecoveryTask)
	if spec.Scope != core.TaskCluster || !spec.RunOnStart || spec.Every != time.Minute {
		t.Fatalf("automatic recovery spec: %+v", spec)
	}
	res, err := spec.Handler(t.Context(), core.TaskRun{Name: spec.Name, Attempt: 1})
	if err != nil || res.Count != 1 || e.accountStatus(id) != "active" {
		t.Fatalf("expired disable not written back: %+v %v %s", res, err, e.accountStatus(id))
	}
}

func TestCandidatesSkipPendingRelease(t *testing.T) {
	s := New(Deps{})
	s.groups[7] = groupSnap{at: time.Now(), refs: []core.AccountRef{{ID: 1}, {ID: 2}, {ID: 3}},
		releases: map[int64]time.Time{2: time.Now().Add(time.Hour), 3: time.Now().Add(-time.Second)}}
	if got := candidateIDs(t, s, 7); !slices.Equal(got, []int64{1, 3}) {
		t.Fatalf("candidates %v", got)
	}
}

func (e *env) accountStatus(id int64) string {
	e.t.Helper()
	var status string
	if err := e.db.Pool.QueryRow(context.Background(), `SELECT status FROM accounts WHERE id=$1`, id).Scan(&status); err != nil {
		e.t.Fatal(err)
	}
	return status
}
