package moderation

import (
	"context"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// The statements of 0.10.0 (48339b0668) on the tables 0013 changes, copied
// verbatim: during the rollout, and after a rollback, 0.10.0 runs them on
// the contracted tables.
const (
	// store.go:200
	insertEvent0100 = `INSERT INTO events (created_at, request_id, user_id, api_key_id, group_id, model, protocol, mode,
				verdict, action, categories, severity, reason, error, text, text_chars, text_hash, cached,
				llm_model, turns, latency_ms, prompt_tokens, completion_tokens,
				result, timing, flow_id, flow_version, highest_category, highest_score, hit_categories, trace,
				input_format, input_message, input_message_size, image_count, keep_until, queue_ms, endpoint, session_fp, replayed,
				flow_source, flow_fallback_id, flow_fallback_reason, level, level_source)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'','',$13,$14,$15,false,'',0,$16,0,0,
				$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,
				NULLIF($34,''),$35,$36, NULLIF($37, ''), NULLIF($38, '')) RETURNING id`
	// routes.go:264 (eventColumns, read by GET /events and /events/:id)
	eventColumns0100 = `id, created_at, request_id, user_id, api_key_id, group_id, model, protocol, endpoint, session_fp, mode, timing, result,
	flow_id, flow_version, severity, hit_categories, highest_category, highest_score, review_status, reviewed_by, reviewed_at,
	counted, input_format, text_chars, image_count, input_message_size, latency_ms, queue_ms, keep_until, replayed,
	verdict, reason, error, llm_model, flow_source, flow_fallback_id, flow_fallback_reason, level, level_source`
	// watch.go:43 (watchColumns, read by loadWatch, the user detail and the
	// watch list)
	watchColumns0100 = `user_id, level, source, since_at, expires_at, hit_count, violation_count, violation_epoch, last_hit_at, hits_since_seen, note, updated_at, locked`
	// store.go:338 (auto_watch)
	insertAutoWatch0100 = `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $4)`
	// watch.go:260 (POST /watchlist)
	insertManualWatch0100 = `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, note, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$4)`
	// watch.go:324 (PATCH /watchlist/:user_id)
	updateWatch0100 = `UPDATE watchlist SET level = $2, expires_at = $3, note = $4, updated_at = $6,
			source = CASE WHEN $5 THEN 'manual' ELSE source END,
			since_at = CASE WHEN $5 THEN $6 ELSE since_at END,
			violation_count = CASE WHEN $5 THEN 0 ELSE violation_count END,
			violation_epoch = CASE WHEN $5 THEN $7 ELSE violation_epoch END,
			hits_since_seen = CASE WHEN $5 THEN 0 ELSE hits_since_seen END
			WHERE user_id = $1`
	// locks.go:175 (the reconcile of the locked entries)
	lockWatch0100 = `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, locked, updated_at)
			VALUES ($1, $2, 'manual', $3, NULL, $4, true, $3)
			ON CONFLICT (user_id) DO UPDATE SET level = EXCLUDED.level, source = 'manual', expires_at = NULL, locked = true,
				updated_at = EXCLUDED.updated_at,
				since_at = CASE WHEN watchlist.level = EXCLUDED.level THEN watchlist.since_at ELSE EXCLUDED.since_at END,
				violation_count = CASE WHEN watchlist.level = EXCLUDED.level THEN watchlist.violation_count ELSE 0 END,
				violation_epoch = CASE WHEN watchlist.level = EXCLUDED.level THEN watchlist.violation_epoch ELSE EXCLUDED.violation_epoch END`
	// snapshot.go:586 (reloadWatch)
	reloadWatch0100 = `SELECT user_id, level, expires_at, locked FROM watchlist WHERE expires_at IS NULL OR expires_at > $1`
)

// Migration 0013 is rolling-safe and leaves a rollback possible: on a
// 0.10.0 database 0.10.0 writes and reads its rows before and after it, the
// new code reads them, and it can run twice.
func TestMigration0013Rolling(t *testing.T) {
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, migrationDir(t, func(n string) bool { return n < "0013" }))
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	now := time.Now().UTC().Truncate(time.Second)
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := conn.Exec(ctx, sql, args...); err != nil {
			t.Fatalf("%.50s: %v", sql, err)
		}
	}
	write0100 := func(uid int64) int64 {
		t.Helper()
		exec(insertAutoWatch0100, uid, LevelObserve, "auto", now, now.Add(time.Hour), int64(7))
		exec(insertManualWatch0100, uid+1, LevelEnforce, "manual", now, nil, int64(8), "n")
		exec(updateWatch0100, uid, LevelEnforce, nil, "x", true, now, int64(9))
		exec(lockWatch0100, uid+2, LevelObserve, now, int64(10))
		var id int64
		if err := conn.QueryRow(ctx, insertEvent0100, now, "r", uid, int64(1), int64(2), "m", "openai", ModeObserve,
			VerdictFlag, ActionAllow, []string{"violence"}, "high", nil, 0, "h", 5,
			ResultHit, TimingPost, int64(3), 1, "violence", 0.9, []string{"violence"}, []byte(`{}`),
			"openai", nil, 0, 0, now.Add(time.Hour), 0, "/v1/x", "", false,
			"group", nil, "", LevelObserve, LevelSourceDefault).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	read0100 := func() {
		t.Helper()
		for _, q := range []struct {
			sql  string
			args []any
		}{
			{`SELECT ` + watchColumns0100 + ` FROM watchlist`, nil},
			{`SELECT ` + eventColumns0100 + ` FROM events`, nil},
			{reloadWatch0100, []any{now}},
		} {
			rows, err := conn.Query(ctx, q.sql, q.args...)
			if err != nil {
				t.Fatal(err)
			}
			rows.Close()
			if rows.Err() != nil {
				t.Fatalf("%.40s: %v", q.sql, rows.Err())
			}
		}
	}
	before := write0100(10)
	read0100()
	only0013 := migrationDir(t, func(n string) bool { return strings.HasPrefix(n, "0013_") })
	pluginsdktest.ApplyMigrations(t, dsn, schema, only0013)
	pluginsdktest.ApplyMigrations(t, dsn, schema, only0013)
	after := write0100(20)
	read0100()
	var left int
	if err := conn.QueryRow(ctx, `SELECT count(*) FROM information_schema.columns WHERE table_schema = $1
		AND (column_name LIKE 'ai\_%' OR column_name LIKE 'latest\_%' OR column_name LIKE 'analysis\_%' OR column_name = 'analyzed_at')`,
		schema).Scan(&left); err != nil || left != 1 { // watch_events.analysis_id stays
		t.Fatalf("%d analysis columns left (%v)", left, err)
	}
	var gone bool
	if err := conn.QueryRow(ctx, `SELECT to_regclass($1) IS NULL`, pgx.Identifier{schema, "user_analyses"}.Sanitize()).Scan(&gone); err != nil || !gone {
		t.Fatalf("user_analyses dropped = %v (%v)", gone, err)
	}
	// 0.11.0 runs with every migration applied and reads the 0.10.0 rows.
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
	for uid, lock := range map[int64]string{10: "", 11: "", 12: LockAllowlist, 20: "", 21: "", 22: LockAllowlist} {
		w, err := scanWatch(conn.QueryRow(ctx, `SELECT `+watchColumns+` FROM watchlist WHERE user_id = $1`, uid))
		if err != nil || w.Lock != lock || w.UserID != uid {
			t.Fatalf("user %d: %+v (%v)", uid, w, err)
		}
	}
	for _, id := range []int64{before, after} {
		var e Event
		if err := conn.QueryRow(ctx, `SELECT `+eventColumns+` FROM events WHERE id = $1`, id).Scan(e.scanTargets()...); err != nil {
			t.Fatal(err)
		}
		if e.Level == nil || *e.Level != LevelObserve || e.Result != ResultHit {
			t.Fatalf("record %d = %+v", id, e)
		}
	}
	var imported bool
	if err := conn.QueryRow(ctx, `SELECT lists_imported FROM config_state WHERE id = 1`).Scan(&imported); err != nil || imported {
		t.Fatalf("lists_imported = %v (%v)", imported, err)
	}
}
