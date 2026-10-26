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
	"time"

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
	`"per_request_limit_bytes":67108864,"retention_hours":24,"storage_budget_bytes":536870912,"overflow_behavior":"retain_partial_with_metadata","viewer":true,"private_data":"must-not-leak"}`

// requestLogsService points a fresh Service at a fake controller/Worker and
// creates account 25, whose runtime serveRequestLogsOnce addresses.
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
	if _, e := db.Pool.Exec(context.Background(), `INSERT INTO accounts(id,name,plugin_key,type,credentials_enc) VALUES(25,'ccg-25','ccgateway','managed',''::bytea)`); e != nil {
		t.Fatal(e)
	}
	return s, db
}

func serveRequestLogsOnce(s *Service, method, body string) *httptest.ResponseRecorder {
	return serveRequestLogsFor(s, accountDesired{Enabled: true, Key: "25", Revision: "revision", AccountID: 25}, method, body)
}

func serveRequestLogsFor(s *Service, d accountDesired, method, body string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, "/request-logs", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	s.serveRequestLogs(c, context.Background(), d)
	return w
}

type requestLogAnswer struct {
	Data struct {
		Setting struct {
			Level     string  `json:"level"`
			FullUntil *string `json:"full_until"`
		} `json:"setting"`
		Default   string         `json:"default"`
		Effective string         `json:"effective"`
		Worker    map[string]any `json:"worker"`
	} `json:"data"`
}

func decodeRequestLogAnswer(t *testing.T, w *httptest.ResponseRecorder) requestLogAnswer {
	t.Helper()
	var out requestLogAnswer
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &out) != nil {
		t.Fatalf("%d %s", w.Code, w.Body.String())
	}
	return out
}

// A legacy Worker's state (no levels) is passed through under worker, its
// unknown fields dropped; the old switch {"enabled":…} is no longer accepted.
func TestRequestLogsRuntimePassThrough(t *testing.T) {
	s, _ := requestLogsService(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/accounts/25/admin/request-logs" || r.Header.Get("Authorization") != "Bearer controller-secret" || r.Header.Get("X-CCG-Revision") != "revision" {
			t.Errorf("wrong runtime request: %s %v", r.URL.Path, r.Header)
		}
		if r.Method != "GET" {
			t.Errorf("forwarded %s", r.Method)
		}
		_, _ = w.Write([]byte(`{"enabled":false,"private_data":"must-not-leak"}`))
	})
	w := serveRequestLogsOnce(s, "GET", "")
	got := decodeRequestLogAnswer(t, w)
	if strings.Contains(w.Body.String(), "private_data") || got.Data.Worker["enabled"] != false || got.Data.Worker["levels"] != nil ||
		got.Data.Setting.Level != "follow" || got.Data.Default != "summary" || got.Data.Effective != "summary" {
		t.Fatalf("GET: %s", w.Body.String())
	}
	if w := serveRequestLogsOnce(s, "PUT", `{"enabled":false}`); w.Code != 400 {
		t.Fatalf("legacy switch: %d %s", w.Code, w.Body.String())
	}
}

// GET merges the core's setting, the default rule and the Worker's state
// (under worker only: its level is its local fallback, not what applies).
// PUT level writes the core's table and is never forwarded; clear_full and
// clear_all are forwarded in canonical form. Every change is audited.
func TestRequestLogsLevelsSavedInTheCoreAndAudited(t *testing.T) {
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
	ctx := context.Background()
	w := serveRequestLogsOnce(s, "GET", "")
	got := decodeRequestLogAnswer(t, w)
	if strings.Contains(w.Body.String(), "private_data") || got.Data.Setting.Level != "follow" || got.Data.Setting.FullUntil != nil ||
		got.Data.Default != "summary" || got.Data.Effective != "summary" ||
		got.Data.Worker["level"] != "full" || got.Data.Worker["full_until"] != "2026-10-23T07:04:05Z" ||
		got.Data.Worker["usage"] == nil || got.Data.Worker["limits"] == nil || got.Data.Worker["viewer"] != true {
		t.Fatalf("GET projection: %s", w.Body.String())
	}
	put := func(body string) requestLogAnswer {
		t.Helper()
		return decodeRequestLogAnswer(t, serveRequestLogsOnce(s, "PUT", body))
	}
	// off / summary are stored as such; effective follows them.
	for _, level := range []string{"off", "summary"} {
		got = put(`{"level":"` + level + `"}`)
		if got.Data.Setting.Level != level || got.Data.Effective != level || got.Data.Worker == nil {
			t.Fatalf("PUT %s: %+v", level, got.Data)
		}
	}
	before := time.Now().UTC().Truncate(time.Second)
	got = put(`{"full_for_hours":4,"level":"full"}`)
	if got.Data.Setting.Level != "full" || got.Data.Effective != "full" || got.Data.Setting.FullUntil == nil {
		t.Fatalf("PUT full: %+v", got.Data)
	}
	until, err := time.Parse(time.RFC3339, *got.Data.Setting.FullUntil)
	if err != nil || until.Before(before.Add(4*time.Hour)) || until.After(time.Now().Add(4*time.Hour)) {
		t.Fatalf("full_until %v", got.Data.Setting.FullUntil)
	}
	var level string
	var stored *time.Time
	var by *int64
	if err := db.Pool.QueryRow(ctx, `SELECT level, full_until, updated_by FROM ccgateway_account_request_logs WHERE account_id=25`).Scan(&level, &stored, &by); err != nil ||
		level != "full" || stored == nil || !stored.Equal(until) {
		t.Fatalf("stored %s %v %v", level, stored, err)
	}
	got = put(`{"level":"follow"}`)
	if got.Data.Setting.Level != "follow" || got.Data.Effective != "summary" {
		t.Fatalf("PUT follow: %+v", got.Data)
	}
	var rows int
	_ = db.Pool.QueryRow(ctx, `SELECT count(*) FROM ccgateway_account_request_logs`).Scan(&rows)
	if rows != 0 {
		t.Fatal("follow kept the row")
	}
	mu.Lock()
	if len(forwarded) != 0 {
		t.Fatalf("a level change reached the Worker: %q", forwarded)
	}
	mu.Unlock()
	for _, tc := range []struct{ in, want string }{
		{`{"clear_full":true}`, `{"clear_full":true}`},
		{`{"clear_all":true}`, `{"clear_all":true}`},
	} {
		got = put(tc.in)
		if got.Data.Worker["level"] != "full" {
			t.Fatalf("PUT %s: %+v", tc.in, got.Data)
		}
		mu.Lock()
		last := forwarded[len(forwarded)-1]
		mu.Unlock()
		if last != tc.want {
			t.Fatalf("PUT %s forwarded %s", tc.in, last)
		}
	}
	count := func(where string) int {
		t.Helper()
		var n int
		if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action='ccgateway.account.25.request-logs' AND `+where).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	if n := count(`detail->>'change'='level'`); n != 4 {
		t.Fatalf("level audit rows: %d", n)
	}
	if n := count(`detail->>'level'='full' AND detail->>'full_for_hours'='4' AND detail->>'full_until'='` + until.Format(time.RFC3339) + `' AND detail->>'previous'='summary'`); n != 1 {
		t.Fatalf("full audit row: %d", n)
	}
	if n := count(`detail->>'level'='follow' AND detail->>'previous'='full'`); n != 1 {
		t.Fatalf("follow audit row: %d", n)
	}
	if n := count(`detail->>'change' IN ('clear_full','clear_all')`); n != 2 {
		t.Fatalf("clear audit rows: %d", n)
	}
	var n int
	_ = db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE detail::text LIKE '%must-not-leak%'`).Scan(&n)
	if n != 0 {
		t.Fatal("Worker data leaked into the audit log")
	}
}

// The core's part does not depend on the Worker: an unreachable Worker is
// worker null, a level is still saved, a clear (the Worker's to do) fails.
func TestRequestLogsWithoutWorker(t *testing.T) {
	s, db := requestLogsService(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(502)
	})
	got := decodeRequestLogAnswer(t, serveRequestLogsOnce(s, "GET", ""))
	if got.Data.Worker != nil || got.Data.Effective != "summary" {
		t.Fatalf("GET: %+v", got.Data)
	}
	got = decodeRequestLogAnswer(t, serveRequestLogsOnce(s, "PUT", `{"level":"off"}`))
	if got.Data.Worker != nil || got.Data.Setting.Level != "off" || got.Data.Effective != "off" {
		t.Fatalf("PUT: %+v", got.Data)
	}
	if w := serveRequestLogsOnce(s, "PUT", `{"clear_all":true}`); w.Code == 200 {
		t.Fatalf("clear_all without a Worker: %s", w.Body.String())
	}
	// A runtime the account cannot use is not asked at all.
	got = decodeRequestLogAnswer(t, serveRequestLogsFor(s, accountDesired{Key: "25", AccountID: 25, ProxyUnusable: true}, "GET", ""))
	if got.Data.Worker != nil || got.Data.Setting.Level != "off" {
		t.Fatalf("unusable proxy: %+v", got.Data)
	}
	if w := serveRequestLogsFor(s, accountDesired{Key: "25", AccountID: 25, Deleted: true}, "PUT", `{"level":"summary"}`); w.Code != 400 {
		t.Fatalf("deleted account: %d", w.Code)
	}
	// The row goes with the account (ON DELETE CASCADE).
	if _, err := db.Pool.Exec(context.Background(), `DELETE FROM accounts WHERE id=25`); err != nil {
		t.Fatal(err)
	}
	var n int
	_ = db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM ccgateway_account_request_logs`).Scan(&n)
	if n != 0 {
		t.Fatal("row kept after the account was deleted")
	}
}

func TestRequestLogsRejectMalformedChange(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, body := range []string{
		`{}`, `{"enabled":null}`, `{"enabled":"false"}`, `[]`, `{`, `null`,
		`{"enabled":false}`, `{"enabled":true}`, `{"enabled":false,"extra":"ignore"}`,
		`{"level":"full"}`, `{"level":"full","full_for_hours":2}`, `{"level":"full","full_for_hours":0}`,
		`{"level":"full","full_for_hours":"4"}`, `{"level":"full","full_for_hours":4.5}`, `{"level":"full","full_for_hours":null}`,
		`{"level":"summary","full_for_hours":4}`, `{"level":"follow","full_for_hours":4}`, `{"full_for_hours":4}`,
		`{"level":"debug"}`, `{"level":null}`, `{"level":"FULL","full_for_hours":4}`, `{"level":"FOLLOW"}`, `{"level":""}`,
		`{"level":"off","enabled":false}`, `{"level":"summary","clear_full":true}`, `{"enabled":true,"clear_full":true}`,
		`{"clear_full":false}`, `{"clear_full":"true"}`, `{"clear_full":null}`,
		`{"clear_all":false}`, `{"clear_all":"true"}`, `{"clear_all":true,"clear_full":true}`, `{"clear_all":true,"level":"off"}`,
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
