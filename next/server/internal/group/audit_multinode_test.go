package group

import (
	"context"
	"fmt"
	"testing"
	"time"
)

// Hold inserts after DELETE has executed. Without the user row parent lock,
// both replacements finish DELETE on the initially empty set before either
// insert, and their two disjoint requested grants get merged.
func TestAuditConcurrentGroupReplacementDoesNotMerge(t *testing.T) {
	e := setup(t)
	background := context.Background()
	var first, second int64
	if err := e.db.Pool.QueryRow(background, `INSERT INTO groups(name) VALUES('first') RETURNING id`).Scan(&first); err != nil {
		t.Fatal(err)
	}
	if err := e.db.Pool.QueryRow(background, `INSERT INTO groups(name) VALUES('second') RETURNING id`).Scan(&second); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Pool.Exec(background, `CREATE FUNCTION audit_group_insert_barrier() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(78190001); RETURN NEW; END $$;
	CREATE TRIGGER audit_group_insert_barrier BEFORE INSERT ON user_groups FOR EACH ROW EXECUTE FUNCTION audit_group_insert_barrier()`); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(background, 60*time.Second)
	defer cancel()
	barrier, err := e.db.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer barrier.Rollback(background)
	if _, err := barrier.Exec(ctx, `SELECT pg_advisory_xact_lock(78190001)`); err != nil {
		t.Fatal(err)
	}
	waitLocks := func(want int) {
		t.Helper()
		for {
			var n int
			if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'`).Scan(&n); err != nil {
				t.Fatal(err)
			}
			if n >= want {
				return
			}
			select {
			case <-ctx.Done():
				t.Fatalf("waiting for %d locks", want)
			case <-time.After(10 * time.Millisecond):
			}
		}
	}
	type result struct {
		code int
		body map[string]any
	}
	completed := make(chan result, 2)
	put := func(group int64) {
		code, body := e.do(e.admin, "PUT", fmt.Sprintf("/users/%d/groups", e.user), map[string]any{"group_ids": []int64{group}})
		completed <- result{code, body}
	}
	go put(first)
	waitLocks(1)
	go put(second)
	waitLocks(2)
	if err := barrier.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		r := <-completed
		if r.code != 200 {
			t.Fatalf("replace status=%d: %v", r.code, r.body)
		}
	}
	var ids []int64
	if err := e.db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(group_id ORDER BY group_id),'{}') FROM user_groups WHERE user_id=$1`, e.user).Scan(&ids); err != nil {
		t.Fatal(err)
	}
	if len(ids) != 1 || ids[0] != second {
		t.Fatalf("concurrent replacements merged or lost ordering: %v", ids)
	}
}
