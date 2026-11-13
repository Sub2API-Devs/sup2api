package moderation

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// The statements of 0.9.3 (2dc20f2363) on the tables migration 0011 adds
// columns to, verbatim.
const (
	// routes_flows.go:202 (createFlow).
	v093InsertFlow = `INSERT INTO flows (name, draft, created_at, updated_at) VALUES ($1,$2,$3,$3) RETURNING id`
	// routes_flows.go:236 (updateFlow).
	v093UpdateFlow = `UPDATE flows SET name=$2, draft=$3, updated_at=$4 WHERE id=$1 AND deleted_at IS NULL`
	// routes_flows.go:417 (publishSpec).
	v093PublishFlow = `UPDATE flows SET draft=$2, published=$3, version=$4, published_at=$5, published_by=$6, updated_at=$5 WHERE id=$1`
	// routes_flows.go:473 (setFlowEnabled).
	v093EnableFlow = `UPDATE flows SET enabled=$2, updated_at=$3 WHERE id=$1 AND deleted_at IS NULL`
	// snapshot.go:317 (loadSnapshot).
	v093LiveFlows = `SELECT id, name, version, published FROM flows
		WHERE deleted_at IS NULL AND enabled AND published IS NOT NULL`
	// routes_flows.go:52-58 (flowViews).
	v093FlowViews = `SELECT f.id, f.name, f.enabled, f.draft, f.published, f.version, f.published_at, f.published_by,
			coalesce((SELECT array_agg(group_id ORDER BY group_id) FROM flow_groups g WHERE g.flow_id = f.id), '{}'),
			coalesce((SELECT jsonb_agg(jsonb_build_object('group_id', a.group_id, 'account_id', a.account_id) ORDER BY a.account_id, a.group_id)
				FROM flow_accounts a WHERE a.flow_id = f.id), '[]'),
			coalesce((SELECT v.auto_timeout FROM flow_versions v WHERE v.flow_id = f.id AND v.version = f.version), false),
			f.created_at, f.updated_at
		FROM flows f WHERE f.deleted_at IS NULL  ORDER BY f.id`
	// store.go:183-193 (writeEvents).
	v093InsertEvent = `INSERT INTO events (created_at, request_id, user_id, api_key_id, group_id, model, protocol, mode,
				verdict, action, categories, severity, reason, error, text, text_chars, text_hash, cached,
				llm_model, turns, latency_ms, prompt_tokens, completion_tokens,
				result, timing, flow_id, flow_version, highest_category, highest_score, hit_categories, trace,
				input_format, input_message, input_message_size, image_count, keep_until, queue_ms, endpoint, session_fp, replayed)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'','',$13,$14,$15,false,'',0,$16,0,0,
				$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33) RETURNING id`
	// routes.go:265-268 (eventColumns) with routes.go:473 (getEvent).
	v093GetEvent = `SELECT id, created_at, request_id, user_id, api_key_id, group_id, model, protocol, endpoint, session_fp, mode, timing, result,
	flow_id, flow_version, severity, hit_categories, highest_category, highest_score, review_status, reviewed_by, reviewed_at,
	counted, input_format, text_chars, image_count, input_message_size, latency_ms, queue_ms, keep_until, replayed,
	ai_verdict, ai_severity, ai_category, ai_evidence, ai_reason, ai_analysis_id, verdict, reason, error, llm_model, text, trace FROM events WHERE id = $1`
)

// Migration 0011 during a rolling upgrade: 0.9.3 nodes write and read flows
// and records with their own statements before and after it, and a 0.10.0
// node reads what they wrote - a flow without a scope runs with all and shows
// null, a record without a flow source shows none.
func TestMigration0011Rolling(t *testing.T) {
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, migrationDir(t, func(n string) bool { return n < "0011" }))
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	now := time.Now().UTC()
	spec := `{"model_filter":{"type":"all","models":[]},"sample_rate":100,"total_timeout_ms":5000,"stages":[]}`
	write := func(name string) int64 {
		t.Helper()
		var id int64
		if err := conn.QueryRow(ctx, v093InsertFlow, name, spec, now).Scan(&id); err != nil {
			t.Fatalf("0.9.3 insert flow: %v", err)
		}
		for _, step := range []struct {
			sql  string
			args []any
		}{
			{v093UpdateFlow, []any{id, name, spec, now}},
			{v093PublishFlow, []any{id, spec, spec, 1, now, nil}},
			{v093EnableFlow, []any{id, true, now}},
			{v093InsertEvent, []any{now, name, 3, 5, 9, "m", "anthropic.messages", ModeEnforce,
				VerdictBlock, ActionDeny, []string{"sexual"}, "high", nil, 4, "h", 1,
				ResultBlock, TimingPre, id, 1, "sexual", 0.99, []string{"sexual"}, []byte(`{}`),
				"anthropic.messages", nil, 0, 0, now.Add(time.Hour), 0, "/v1/messages", "", false}},
		} {
			if _, err := conn.Exec(ctx, step.sql, step.args...); err != nil {
				t.Fatalf("0.9.3 statement %.40q: %v", step.sql, err)
			}
		}
		return id
	}
	read := func() {
		t.Helper()
		for _, q := range []string{v093LiveFlows, v093FlowViews} {
			rows, err := conn.Query(ctx, q)
			if err == nil {
				_, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (int, error) { return 0, nil })
			}
			if err != nil {
				t.Fatalf("0.9.3 query %.40q: %v", q, err)
			}
		}
		rows, _ := conn.Query(ctx, `SELECT id FROM events`)
		ids, err := pgx.CollectRows(rows, pgx.RowTo[int64])
		if err != nil {
			t.Fatal(err)
		}
		for _, id := range ids {
			rows, err := conn.Query(ctx, v093GetEvent, id)
			if err == nil {
				_, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (int, error) { return 0, nil })
			}
			if err != nil {
				t.Fatalf("0.9.3 getEvent: %v", err)
			}
		}
	}
	before := write("before")
	read()
	// 0.9.3 ran beside 0.10.0, on the migrations up to 0012 (0013 drops the
	// ai_* columns 0.9.3 reads; 0.11.0 needs 0.10.0 before it).
	pluginsdktest.ApplyMigrations(t, dsn, schema, migrationDir(t, func(n string) bool { return n < "0013" }))
	after := write("after")
	read()
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))

	fh := pluginsdktest.NewFakeHost()
	fh.SetDSN(dsn, schema)
	fh.Authz = func(int64, string) bool { return false }
	p, h := startNode(t, fh, map[string]any{"mode": ModeEnforce})
	waitFor(t, "the flows of 0.9.3 in the snapshot", func() bool { return len(p.snap.Load().flows) == 2 })
	for _, id := range []int64{before, after} {
		if f := p.snap.Load().flows[id]; f.scope != ScopeAll {
			t.Fatalf("flow %d runs with scope %q", id, f.scope)
		}
	}
	body := h.Do("GET", "/flows", nil, nil).GetBody()
	for _, f := range gjson.GetBytes(body, "data").Array() {
		if v := f.Get("scope"); !v.Exists() || v.Type != gjson.Null {
			t.Fatalf("flow of 0.9.3 = %s", f.Raw)
		}
	}
	body = h.Do("GET", "/events", nil, nil).GetBody()
	evs := gjson.GetBytes(body, "data").Array()
	if len(evs) != 2 {
		t.Fatalf("records = %s", body)
	}
	for _, ev := range evs {
		if ev.Get("flow_source").Exists() || ev.Get("flow_fallback").Exists() {
			t.Fatalf("record of 0.9.3 = %s", ev.Raw)
		}
	}
}
