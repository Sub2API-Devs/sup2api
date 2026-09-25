package audit

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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
