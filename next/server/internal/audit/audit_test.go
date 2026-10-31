package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/assert"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// recorder captures the last Exec call.
type recorder struct {
	sql  string
	args []any
}

func (r *recorder) Exec(_ context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	r.sql, r.args = sql, args
	return pgconn.CommandTag{}, nil
}

func (r *recorder) Query(context.Context, string, ...any) (pgx.Rows, error) { return nil, nil }
func (r *recorder) QueryRow(context.Context, string, ...any) pgx.Row        { return nil }

func TestAudit(t *testing.T) {
	ctx := WithClientIP(context.Background(), strings.Repeat("1", 70))
	if ClientIP(context.Background()) != "" || ClientIP(ctx) == "" {
		t.Fatal("ClientIP")
	}
	rec := &recorder{}
	if err := Audit(ctx, rec, 7, "proxy.update", "proxy", "12", map[string]any{"fields": []string{"name"}}); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(rec.sql, "INSERT INTO audit_logs") || len(rec.args) != 6 {
		t.Fatalf("exec %s %v", rec.sql, rec.args)
	}
	if uid := rec.args[0].(*int64); uid == nil || *uid != 7 {
		t.Fatalf("user_id %v", rec.args[0])
	}
	if rec.args[1] != "proxy.update" || rec.args[2] != "proxy" || rec.args[3] != "12" {
		t.Fatalf("args %v", rec.args)
	}
	var detail map[string]any
	if err := json.Unmarshal(rec.args[4].([]byte), &detail); err != nil || detail["fields"].([]any)[0] != "name" {
		t.Fatalf("detail %s", rec.args[4])
	}
	if ip := rec.args[5].(string); len(ip) != 64 {
		t.Fatalf("ip not truncated: %d", len(ip))
	}

	// System actor and nil detail.
	if err := Audit(context.Background(), rec, 0, "x", "", "", nil); err != nil {
		t.Fatal(err)
	}
	if rec.args[0].(*int64) != nil || string(rec.args[4].([]byte)) != "{}" || rec.args[5] != "" {
		t.Fatalf("system row %v", rec.args)
	}
}

func TestContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/", nil)
	c.Request.RemoteAddr = "203.0.113.9:1234"
	if ip := ClientIP(Context(c)); ip != "203.0.113.9" {
		t.Fatalf("ip %q", ip)
	}
}

func TestBodySummary(t *testing.T) {
	long := strings.Repeat("a", 300)
	cases := []struct {
		body string
		want string
	}{
		{`{"name":"r","api_key":"sk-1","Password":"p","nested":{"accessToken":"t","ok":1}}`,
			`{"Password":"[REDACTED]","api_key":"[REDACTED]","name":"r","nested":{"accessToken":"[REDACTED]","ok":1}}`},
		{`{"note":"` + long + `"}`, `{"note":"` + long[:200] + `…"}`},
		{`[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]`, `[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,"…"]`},
		{`{"a":{"b":{"c":{"d":{"e":1}}}}}`, `{"a":{"b":{"c":{"d":"{…}"}}}}`},
		{`not json`, `{"bytes":8,"non_json":true}`},
		// Secret-looking names: plurals, whole words, camelCase.
		{`{"api_keys":["k"],"authHeader":"a","author":"Ann","db_dsn":"d","smtp-pass":"p","pwd":"p","bypass":true,"sessionId":"s","request_signature":"s","Bearer":"b"}`,
			`{"Bearer":"[REDACTED]","api_keys":"[REDACTED]","authHeader":"[REDACTED]","author":"Ann","bypass":true,"db_dsn":"[REDACTED]","pwd":"[REDACTED]","request_signature":"[REDACTED]","sessionId":"[REDACTED]","smtp-pass":"[REDACTED]"}`},
		// Acronyms end before the next word.
		{`{"SMTPPass":"p","DBPwd":"p","APIAuth":"a","HTTPServer":"h"}`,
			`{"APIAuth":"[REDACTED]","DBPwd":"[REDACTED]","HTTPServer":"h","SMTPPass":"[REDACTED]"}`},
		// {name, value} pairs naming a secret.
		{`{"headers":[{"name":"Authorization","value":"Bearer x"},{"name":"Accept","value":"*/*"},{"key":"X-Api-Key","value":"k"}]}`,
			`{"headers":[{"name":"Authorization","value":"[REDACTED]"},{"name":"Accept","value":"*/*"},{"key":"[REDACTED]","value":"[REDACTED]"}]}`},
		// URLs: no userinfo or query; URL fields keep scheme and host only.
		{`{"note":"https://u:p@example.com/a?sig=1#f","base_url":"https://api.example.com/v1?key=k","hooks":{"webhook":"https://hooks.example.com/T0/B1/xyz"},"callback_uris":["http://cb.example.com:8080/x/y"]}`,
			`{"base_url":"https://api.example.com","callback_uris":["http://cb.example.com:8080"],"hooks":{"webhook":"https://hooks.example.com"},"note":"https://example.com/a"}`},
		// Cut at a rune boundary.
		{`{"note":"` + strings.Repeat("é", 101) + `"}`, `{"note":"` + strings.Repeat("é", 100) + `…"}`},
	}
	for _, c := range cases {
		got, _ := json.Marshal(bodySummary([]byte(c.body)))
		assert.Equal(t, c.want, string(got), c.body)
	}
	// Too large even after the cuts: only the field names are kept.
	big := map[string]string{}
	for i := 0; i < 40; i++ {
		big[fmt.Sprintf("f%02d", i)] = strings.Repeat("x", 150)
	}
	raw, _ := json.Marshal(big)
	got, _ := json.Marshal(bodySummary(raw))
	if !strings.HasPrefix(string(got), `{"bytes":`) || !strings.Contains(string(got), `"fields":["f00","f01"`) || !strings.Contains(string(got), `"truncated":true`) {
		t.Errorf("oversized summary = %s", got)
	}
}

// AuditPluginWrite keeps the row with a redacted body and Purge deletes only
// its own rows past the retention; GET /audit-logs filters by target, actor and
// time and names the actor.
func TestPluginWritesAndList(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	var uid int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO users (email, display_name, password_hash) VALUES ('a@x', 'Ann', 'x') RETURNING id`).Scan(&uid); err != nil {
		t.Fatal(err)
	}
	for _, action := range []string{ActionPluginWrite, "plugin.enable"} {
		if _, err := db.Pool.Exec(ctx, `INSERT INTO audit_logs (action, target_type, target_id, created_at) VALUES ($1, 'plugin', 'demo', now() - interval '2 days')`, action); err != nil {
			t.Fatal(err)
		}
	}
	w := &PluginWrites{DB: db, Retention: 24 * time.Hour}
	w.AuditPluginWrite(ctx, core.PluginWrite{UserID: uid, Plugin: "demo", Method: "PUT", Path: "/rules/7",
		Route: "/rules/:id", Status: 200, RequestID: "req-1", ClientIP: "203.0.113.9", Body: []byte(`{"name":"r","token":"t"}`)})
	if !w.Flush(ctx) {
		t.Fatal("flush")
	}
	if err := w.Purge(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `INSERT INTO audit_logs (action, target_type, target_id) VALUES ('plugin.enable', 'plugin', 'other')`); err != nil {
		t.Fatal(err)
	}

	gin.SetMode(gin.TestMode)
	engine := gin.New()
	RegisterRoutes(httpapi.NewRouter(engine, allowAll{}, allowAll{}), db)
	list := func(query string) []map[string]any {
		t.Helper()
		req := httptest.NewRequest("GET", "/api/v1/audit-logs?"+query, nil)
		req.Header.Set("Authorization", "Bearer x")
		rec := httptest.NewRecorder()
		engine.ServeHTTP(rec, req)
		var out struct {
			Data []map[string]any `json:"data"`
		}
		if rec.Code != 200 || json.Unmarshal(rec.Body.Bytes(), &out) != nil {
			t.Fatalf("list %s = %d %s", query, rec.Code, rec.Body)
		}
		return out.Data
	}
	rows := list("target_type=plugin&target_id=demo")
	if len(rows) != 2 || rows[0]["action"] != ActionPluginWrite || rows[1]["action"] != "plugin.enable" {
		t.Fatalf("plugin rows (the old write purged, the old enable kept) = %v", rows)
	}
	detail, _ := json.Marshal(rows[0]["detail"])
	want := `{"body":{"name":"r","token":"[REDACTED]"},"method":"PUT","path":"/rules/7","request_id":"req-1","route":"/rules/:id","status":200}`
	if string(detail) != want || rows[0]["user_email"] != "a@x" || rows[0]["user_name"] != "Ann" || rows[0]["ip"] != "203.0.113.9" {
		t.Fatalf("write row = %v (detail %s)", rows[0], detail)
	}
	if rows := list(fmt.Sprintf("user_id=%d", uid)); len(rows) != 1 {
		t.Fatalf("by user = %v", rows)
	}
	if rows := list("from=" + time.Now().Add(-time.Hour).UTC().Format(time.RFC3339)); len(rows) != 2 {
		t.Fatalf("by time = %v", rows)
	}
}

type allowAll struct{}

func (allowAll) VerifyAccessToken(context.Context, string) (int64, error) { return 1, nil }
func (allowAll) Can(context.Context, int64, string) (bool, error)         { return true, nil }
func (allowAll) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{Superuser: true}, nil
}
func (allowAll) CanGrant(context.Context, int64, []string) error { return nil }
func (allowAll) CanActOn(context.Context, int64, []string) error { return nil }
