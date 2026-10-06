package ccgateway

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/gin-gonic/gin"
)

func TestRequestLogsRuntimePassThrough(t *testing.T) {
	db := testutil.DB(t)
	cipher, _ := secret.New(make([]byte, 32))
	s := New(db, cipher)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
	}))
	defer upstream.Close()
	t.Setenv("CCGATEWAY_URL", upstream.URL)
	raw, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret"})
	encrypted, _ := cipher.Encrypt(raw, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, e := db.Pool.Exec(context.Background(), `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); e != nil {
		t.Fatal(e)
	}
	for _, method := range []string{"GET", "PUT"} {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(method, "/request-logs", strings.NewReader(`{"enabled":false,"extra":"ignore"}`))
		c.Request.Header.Set("Content-Type", "application/json")
		s.serveRequestLogs(c, context.Background(), accountDesired{Enabled: true, Key: "25", Revision: "revision", AccountID: 25})
		if w.Code != 200 || strings.Contains(w.Body.String(), "private_data") || !strings.Contains(w.Body.String(), `"enabled":false`) {
			t.Fatalf("%s: %d %s", method, w.Code, w.Body.String())
		}
	}
}

func TestRequestLogsRejectMalformedSwitch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, body := range []string{`{}`, `{"enabled":null}`, `{"enabled":"false"}`, `[]`, `{`} {
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
		req := httptest.NewRequest(method, "/api/v1/system/ccgateway/accounts/25/request-logs", strings.NewReader(`{"enabled":false}`))
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
