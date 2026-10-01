package moderation

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// Freeze automatic banning after COUNT but before INSERT. The old code lets
// manual unblock finish here, then resurrects the block from that old count.
// The per-user transaction now orders the whole decision before the unblock.
func TestUnblockCannotBeOvertakenByAnOldAutoBan(t *testing.T) {
	llm := mockLLM(t)
	settings := map[string]any{"ban_threshold": 2, "ban_window_hours": 1, "ban_duration_hours": 0}
	p, _, fh := startDB(t, llm, settings)
	p2 := New()
	fh2 := pluginsdktest.NewFakeHost()
	fh2.SetDSN(fh.DSNValue, fh.SchemaValue)
	pluginsdktest.Start(t, p2, pluginsdktest.Options{Host: fh2, SDK: sdkOpts(), Config: settingsMap(llm.srv.URL, ModeEnforce, settings)})
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	db, err := p.db(ctx)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	if _, err := db.Exec(ctx, `INSERT INTO blocks(user_id,source,created_at) VALUES (3,'manual',$1)`, now.Add(-time.Hour)); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO events(user_id,mode,verdict,action,created_at)
		VALUES (3,'observe','block','allow',$1),(3,'observe','block','allow',$1)`, now.Add(-time.Minute)); err != nil {
		t.Fatal(err)
	}
	barrier, err := db.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer barrier.Release()
	var key int64
	if err := barrier.QueryRow(ctx, `SELECT pg_backend_pid()`).Scan(&key); err != nil {
		t.Fatal(err)
	}
	if _, err := barrier.Exec(ctx, `SELECT pg_advisory_lock($1)`, key); err != nil {
		t.Fatal(err)
	}
	var releaseOnce sync.Once
	unpause := func() {
		releaseOnce.Do(func() {
			if _, err := barrier.Exec(context.Background(), `SELECT pg_advisory_unlock($1)`, key); err != nil {
				t.Errorf("release test barrier: %v", err)
			}
		})
	}
	defer unpause()
	// The advisory lock exists only in this test trigger, not production code.
	if _, err := db.Exec(ctx, fmt.Sprintf(`CREATE FUNCTION pause_auto_ban() RETURNS trigger LANGUAGE plpgsql AS $$
		BEGIN PERFORM pg_advisory_xact_lock(%d); RETURN NEW; END $$;
		CREATE TRIGGER pause_auto_ban BEFORE INSERT ON blocks FOR EACH ROW
		WHEN (NEW.source = 'auto') EXECUTE FUNCTION pause_auto_ban()`, key)); err != nil {
		t.Fatal(err)
	}
	autoDone := make(chan struct{})
	go func() {
		defer close(autoDone)
		p.applyBans(ctx, []eventRec{{UserID: 3, Verdict: VerdictBlock}})
	}()
	var autoPID int
	for autoPID == 0 {
		if err := db.QueryRow(ctx, `SELECT coalesce((SELECT pid FROM pg_locks
			WHERE locktype='advisory' AND objid=$1 AND NOT granted LIMIT 1),0)`, key).Scan(&autoPID); err != nil {
			t.Fatal(err)
		}
		if autoPID == 0 {
			time.Sleep(10 * time.Millisecond)
		}
	}
	type result struct {
		resp *pluginv1.HTTPResponse
		err  error
	}
	unblockDone := make(chan result, 1)
	go func() {
		resp, err := p2.deleteBlock(ctx, &pluginv1.HTTPRequest{PathParams: map[string]string{"user_id": "3"}})
		unblockDone <- result{resp, err}
	}()
	var unblock *result
	for unblock == nil {
		var waiting bool
		if err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM pg_locks
			WHERE relation='block_subjects'::regclass AND pid<>$1 AND cardinality(pg_blocking_pids(pid))>0)`, autoPID).Scan(&waiting); err != nil {
			t.Fatal(err)
		}
		if waiting {
			break
		}
		select {
		case r := <-unblockDone:
			unblock = &r
		case <-ctx.Done():
			t.Fatal("unblock neither finished nor waited for the automatic decision")
		case <-time.After(10 * time.Millisecond):
		}
	}
	unpause()
	select {
	case <-autoDone:
	case <-ctx.Done():
		t.Fatal("automatic ban did not finish")
	}
	if unblock == nil {
		r := <-unblockDone
		unblock = &r
	}
	if unblock.err != nil || unblock.resp.GetStatus() != 200 {
		t.Fatalf("unblock: %v %v", unblock.resp, unblock.err)
	}
	var blocked bool
	if err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM blocks WHERE user_id=3)`).Scan(&blocked); err != nil || blocked {
		t.Fatalf("completed unblock was undone: blocked=%v err=%v", blocked, err)
	}
	// A late event batch from another node must also observe the new baseline.
	p.applyBans(ctx, []eventRec{{UserID: 3, Verdict: VerdictBlock}})
	if err := db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM blocks WHERE user_id=3)`).Scan(&blocked); err != nil || blocked {
		t.Fatalf("old events re-banned the user: blocked=%v err=%v", blocked, err)
	}
}
