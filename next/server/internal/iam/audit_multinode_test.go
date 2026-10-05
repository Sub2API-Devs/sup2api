package iam

import (
	"context"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

func auditIAMWaitLocks(t *testing.T, ctx context.Context, db *store.DB, want int) {
	t.Helper()
	for {
		var n int
		if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`).Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n >= want {
			return
		}
		select {
		case <-ctx.Done():
			t.Fatalf("waiting for %d lock waiters: %v", want, ctx.Err())
		case <-time.After(10 * time.Millisecond):
		}
	}
}

// Block the current token's row, queue its rotation, then queue a replay of
// its already-replaced parent. Without the user parent lock the replay's
// UPDATE takes its snapshot before the rotation inserts the new descendant.
func TestAuditRefreshReplayIncludesConcurrentDescendant(t *testing.T) {
	e := setup(t)
	s := e.svc
	background := context.Background()
	if err := s.Bootstrap(background); err != nil {
		t.Fatal(err)
	}
	parent := mustLogin(t, s, adminEmail, adminPassword)
	child, err := s.Refresh(background, parent.RefreshToken)
	if err != nil {
		t.Fatal(err)
	}
	ageRotation(t, s, parent.RefreshToken)
	ctx, cancel := context.WithTimeout(background, 60*time.Second)
	defer cancel()
	barrier, err := s.db.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer barrier.Rollback(background)
	var id int64
	if err := barrier.QueryRow(ctx, `SELECT id FROM refresh_tokens WHERE token_hash=$1 FOR UPDATE`, hashToken(child.RefreshToken)).Scan(&id); err != nil {
		t.Fatal(err)
	}
	type result struct {
		pair *TokenPair
		err  error
	}
	rotation, replay := make(chan result, 1), make(chan result, 1)
	go func() { p, err := s.Refresh(ctx, child.RefreshToken); rotation <- result{p, err} }()
	auditIAMWaitLocks(t, ctx, s.db, 1)
	go func() { p, err := s.Refresh(ctx, parent.RefreshToken); replay <- result{p, err} }()
	auditIAMWaitLocks(t, ctx, s.db, 2)
	if err := barrier.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	rotated, replayed := <-rotation, <-replay
	if rotated.err != nil || rotated.pair == nil {
		t.Fatalf("rotation: %+v", rotated)
	}
	if !isCode(replayed.err, "unauthenticated") {
		t.Fatalf("replay: %+v", replayed)
	}
	var active int
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM refresh_tokens WHERE user_id=$1 AND revoked_at IS NULL`, parent.User.ID).Scan(&active); err != nil {
		t.Fatal(err)
	}
	if active != 0 {
		t.Fatalf("family replay left %d live descendants", active)
	}
}
