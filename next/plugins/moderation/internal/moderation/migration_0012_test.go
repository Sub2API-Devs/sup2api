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

// The statements of 0.9.3 (2dc20f2363) on the tables 0012 extends, copied
// verbatim: during a rolling upgrade 0.9.3 nodes run them on the migrated
// tables.
const (
	// store.go:183
	insertEvent093 = `INSERT INTO events (created_at, request_id, user_id, api_key_id, group_id, model, protocol, mode,
				verdict, action, categories, severity, reason, error, text, text_chars, text_hash, cached,
				llm_model, turns, latency_ms, prompt_tokens, completion_tokens,
				result, timing, flow_id, flow_version, highest_category, highest_score, hit_categories, trace,
				input_format, input_message, input_message_size, image_count, keep_until, queue_ms, endpoint, session_fp, replayed)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'','',$13,$14,$15,false,'',0,$16,0,0,
				$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33) RETURNING id`
	// store.go:302 (auto_watch)
	insertAutoWatch093 = `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $4)`
	// watch.go:290 (POST /watchlist)
	insertManualWatch093 = `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, note, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$4)`
	// watch.go:357 (PATCH /watchlist/:user_id)
	updateWatch093 = `UPDATE watchlist SET level = $2, expires_at = $3, note = $4, updated_at = $6,
			source = CASE WHEN $5 THEN 'manual' ELSE source END,
			since_at = CASE WHEN $5 THEN $6 ELSE since_at END,
			violation_count = CASE WHEN $5 THEN 0 ELSE violation_count END,
			violation_epoch = CASE WHEN $5 THEN $7 ELSE violation_epoch END,
			hits_since_seen = CASE WHEN $5 THEN 0 ELSE hits_since_seen END
			WHERE user_id = $1`
	// watch.go:48 (watchColumns, read by loadWatch :79, the user detail
	// routes.go:588 and the watch list watch_list.go:137)
	watchColumns093 = `user_id, level, source, since_at, expires_at, hit_count, violation_count, violation_epoch, last_hit_at, hits_since_seen, note, updated_at,
	analysis_requested_at, analysis_source, analysis_claim_until, analysis_token, latest_analysis_id, latest_analysis_status,
	latest_trend, latest_suggestion, analyzed_at`
	// routes.go:265 (eventColumns, read by GET /events and /events/:id)
	eventColumns093 = `id, created_at, request_id, user_id, api_key_id, group_id, model, protocol, endpoint, session_fp, mode, timing, result,
	flow_id, flow_version, severity, hit_categories, highest_category, highest_score, review_status, reviewed_by, reviewed_at,
	counted, input_format, text_chars, image_count, input_message_size, latency_ms, queue_ms, keep_until, replayed,
	ai_verdict, ai_severity, ai_category, ai_evidence, ai_reason, ai_analysis_id, verdict, reason, error, llm_model`
	// snapshot.go:468 (reloadWatch)
	reloadWatch093 = `SELECT user_id, level, expires_at FROM watchlist WHERE expires_at IS NULL OR expires_at > $1`
)

// Migration 0012 is rolling-safe: on a 0.9.3 database (migrations up to
// 0010; 0012 does not depend on 0011) 0.9.3 writes and reads its rows before
// and after it, the new code reads 0.9.3 rows (locked false, no handling),
// and it can run twice.
func TestMigration0012Rolling(t *testing.T) {
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, migrationDir(t, func(n string) bool { return n < "0011" }))
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	now := time.Now().UTC().Truncate(time.Second)
	write093 := func(uid int64) int64 {
		t.Helper()
		exp := now.Add(time.Hour)
		if _, err := conn.Exec(ctx, insertAutoWatch093, uid, LevelObserve, "auto", now, exp, int64(7)); err != nil {
			t.Fatal(err)
		}
		if _, err := conn.Exec(ctx, insertManualWatch093, uid+1, LevelEnforce, "manual", now, nil, int64(8), "n"); err != nil {
			t.Fatal(err)
		}
		if _, err := conn.Exec(ctx, updateWatch093, uid, LevelEnforce, nil, "x", true, now, int64(9)); err != nil {
			t.Fatal(err)
		}
		var id int64
		if err := conn.QueryRow(ctx, insertEvent093, now, "r", uid, int64(1), int64(2), "m", "openai", ModeObserve,
			VerdictFlag, ActionAllow, []string{"violence"}, "high", nil, 0, "h", 5,
			ResultHit, TimingPost, int64(3), 1, "violence", 0.9, []string{"violence"}, []byte(`{}`),
			"openai", nil, 0, 0, now.Add(time.Hour), 0, "/v1/x", "", false).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	read093 := func() {
		t.Helper()
		rows, err := conn.Query(ctx, `SELECT `+watchColumns093+` FROM watchlist`)
		if err != nil {
			t.Fatal(err)
		}
		rows.Close()
		if rows.Err() != nil {
			t.Fatal(rows.Err())
		}
		for _, q := range []string{`SELECT ` + eventColumns093 + ` FROM events`, reloadWatch093} {
			args := []any{}
			if q == reloadWatch093 {
				args = append(args, now)
			}
			rows, err := conn.Query(ctx, q, args...)
			if err != nil {
				t.Fatal(err)
			}
			rows.Close()
			if rows.Err() != nil {
				t.Fatalf("%.40s: %v", q, rows.Err())
			}
		}
	}
	before := write093(10)
	read093()
	only0012 := migrationDir(t, func(n string) bool { return strings.HasPrefix(n, "0012_") })
	pluginsdktest.ApplyMigrations(t, dsn, schema, only0012)
	pluginsdktest.ApplyMigrations(t, dsn, schema, only0012)
	after := write093(20)
	read093()
	// A 0.10.0 node runs with every migration applied.
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
	for _, uid := range []int64{10, 11, 20, 21} {
		w, err := scanWatch(conn.QueryRow(ctx, `SELECT `+watchColumns+` FROM watchlist WHERE user_id = $1`, uid))
		if err != nil || w.Locked || w.UserID != uid {
			t.Fatalf("user %d: %+v (%v)", uid, w, err)
		}
	}
	for _, id := range []int64{before, after} {
		var e Event
		if err := conn.QueryRow(ctx, `SELECT `+eventColumns+` FROM events WHERE id = $1`, id).Scan(e.scanTargets()...); err != nil {
			t.Fatal(err)
		}
		if e.Level != nil || e.LevelSource != nil || e.Result != ResultHit {
			t.Fatalf("record %d = %+v", id, e)
		}
	}
}
