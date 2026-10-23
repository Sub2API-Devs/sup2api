package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/gin-gonic/gin"
)

const leveledWorkerState = `{"enabled":true,"level":"full","full_until":"2026-10-23T15:04:05+08:00","levels":["off","summary","full"],` +
	`"limits":{"summary":{"retention_hours":168,"storage_budget_bytes":134217728,"per_request_limit_bytes":262144},` +
	`"full":{"retention_hours":24,"storage_budget_bytes":536870912,"per_request_limit_bytes":67108864}},` +
	`"usage":{"summary_bytes":2048,"full_bytes":4096,"requests":3},` +
	`"per_request_limit_bytes":67108864,"retention_hours":24,"storage_budget_bytes":536870912,"overflow_behavior":"retain_partial_with_metadata","private_data":"must-not-leak"}`

// requestLogsService points a fresh Service at a fake controller/Worker.
func requestLogsService(t *testing.T, handler http.HandlerFunc) (*Service, *store.DB) {
	t.Helper()
	db := testutil.DB(t)
	cipher, _ := secret.New(make([]byte, 32))
	s := New(db, cipher)
	upstream := httptest.NewServer(handler)
	t.Cleanup(upstream.Close)
	t.Setenv("CCGATEWAY_URL", upstream.URL)
	raw, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret"})
	encrypted, _ := cipher.Encrypt(raw, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, e := db.Pool.Exec(context.Background(), `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); e != nil {
		t.Fatal(e)
	}
	return s, db
}

func serveRequestLogsOnce(s *Service, method, body string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, "/request-logs", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	s.serveRequestLogs(c, context.Background(), accountDesired{Enabled: true, Key: "25", Revision: "revision", AccountID: 25})
	return w
}

func TestRequestLogsRuntimePassThrough(t *testing.T) {
	s, _ := requestLogsService(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/accounts/25/admin/request-logs" || r.Header.Get("Authorization") != "Bearer controller-secret" || r.Header.Get("X-CCG-Revision") != "revision" {
			t.Errorf("wrong runtime request: %s %v", r.URL.Path, r.Header)
		}
		if r.Method == "PUT" {
			var body map[string]any
			_ = json.NewDecoder(r.Body).Decode(&body)
			if body["enabled"] != false || len(body) != 1 {
				t.Errorf("unsafe body projection: %v", body)
			}
		}
		_, _ = w.Write([]byte(`{"enabled":false,"private_data":"must-not-leak"}`))
	})
	for _, method := range []string{"GET", "PUT"} {
		w := serveRequestLogsOnce(s, method, `{"enabled":false}`)
		if w.Code != 200 || strings.Contains(w.Body.String(), "private_data") || !strings.Contains(w.Body.String(), `"enabled":false`) || strings.Contains(w.Body.String(), "levels") {
			t.Fatalf("%s: %d %s", method, w.Code, w.Body.String())
		}
	}
}

// Each accepted PUT form reaches the Worker in canonical form, the richer
// state is projected back, and the audit row names the level and expiry.
func TestRequestLogsLevelsForwardAndAudit(t *testing.T) {
	var mu sync.Mutex
	var forwarded []string
	s, db := requestLogsService(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			b, _ := io.ReadAll(r.Body)
			mu.Lock()
			forwarded = append(forwarded, string(b))
			mu.Unlock()
		}
		_, _ = w.Write([]byte(leveledWorkerState))
	})
	w := serveRequestLogsOnce(s, "GET", "")
	if w.Code != 200 {
		t.Fatalf("GET: %d %s", w.Code, w.Body.String())
	}
	var got struct {
		Data map[string]any `json:"data"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &got)
	if strings.Contains(w.Body.String(), "private_data") || got.Data["level"] != "full" || got.Data["full_until"] != "2026-10-23T07:04:05Z" ||
		got.Data["retention_hours"] != float64(24) || got.Data["usage"] == nil || got.Data["limits"] == nil {
		t.Fatalf("GET projection: %s", w.Body.String())
	}
	for _, tc := range []struct{ in, want string }{
		{`{"level":"off"}`, `{"level":"off"}`},
		{`{"level":"summary"}`, `{"level":"summary"}`},
		{`{"full_for_hours":4,"level":"full"}`, `{"full_for_hours":4,"level":"full"}`},
		{`{"clear_full":true}`, `{"clear_full":true}`},
		{`{"enabled":true}`, `{"enabled":true}`},
	} {
		if w := serveRequestLogsOnce(s, "PUT", tc.in); w.Code != 200 {
			t.Fatalf("PUT %s: %d %s", tc.in, w.Code, w.Body.String())
		}
		mu.Lock()
		last := forwarded[len(forwarded)-1]
		mu.Unlock()
		if last != tc.want {
			t.Fatalf("PUT %s forwarded %s", tc.in, last)
		}
	}
	var n int
	_ = db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action='ccgateway.account.25.request-logs'
		AND detail->>'level'='full' AND detail->>'full_until'='2026-10-23T07:04:05Z'`).Scan(&n)
	if n != 5 {
		t.Fatalf("audit rows with level and full_until: %d", n)
	}
	_ = db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action='ccgateway.account.25.request-logs'
		AND detail->>'change'='level' AND detail->>'full_for_hours'='4'`).Scan(&n)
	if n != 1 {
		t.Fatalf("audit row for full_for_hours: %d", n)
	}
	_ = db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE detail::text LIKE '%must-not-leak%'`).Scan(&n)
	if n != 0 {
		t.Fatal("Worker data leaked into the audit log")
	}
}

func TestRequestLogsRejectMalformedChange(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, body := range []string{
		`{}`, `{"enabled":null}`, `{"enabled":"false"}`, `[]`, `{`, `null`,
		`{"enabled":false,"extra":"ignore"}`,
		`{"level":"full"}`, `{"level":"full","full_for_hours":2}`, `{"level":"full","full_for_hours":0}`,
		`{"level":"full","full_for_hours":"4"}`, `{"level":"full","full_for_hours":4.5}`, `{"level":"full","full_for_hours":null}`,
		`{"level":"summary","full_for_hours":4}`, `{"full_for_hours":4}`,
		`{"level":"debug"}`, `{"level":null}`, `{"level":"FULL","full_for_hours":4}`,
		`{"level":"off","enabled":false}`, `{"level":"summary","clear_full":true}`, `{"enabled":true,"clear_full":true}`,
		`{"clear_full":false}`, `{"clear_full":"true"}`, `{"clear_full":null}`,
	} {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("PUT", "/request-logs", strings.NewReader(body))
		c.Request.Header.Set("Content-Type", "application/json")
		(&Service{}).serveRequestLogs(c, context.Background(), accountDesired{Enabled: true})
		if w.Code != 400 {
			t.Fatalf("body %s: status %d", body, w.Code)
		}
	}
}

func TestRequestLogsManagementRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, method := range []string{"GET", "PUT"} {
		engine := gin.New()
		auth := ccgRouteAuth{false}
		(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
		req := httptest.NewRequest(method, "/api/v1/system/ccgateway/accounts/25/request-logs", strings.NewReader(`{"level":"summary"}`))
		req.Header.Set("Authorization", "Bearer test")
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		if w.Code != 403 {
			t.Fatalf("unauthorized %s: %d", method, w.Code)
		}
	}
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("POST", "/request-logs", nil)
	(&Service{}).serveRequestLogs(c, context.Background(), accountDesired{Enabled: true})
	if w.Code != 404 {
		t.Fatalf("POST accepted: %d", w.Code)
	}
}
