package ccgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestConfigSafety(t *testing.T) {
	old := Config{Mode: "ssh", Host: "host", Port: 22, User: "user", AuthMode: "password", Password: "secret", HostKeyFingerprint: "SHA256:" + strings.Repeat("A", 43), AdminKey: "admin", APIKey: "api"}
	c := old
	c.Password = ""
	c.AdminKey = ""
	c.APIKey = ""
	v, e := mergeConfig(c, old)
	if e != nil || v.Password != "secret" || v.APIKey != "api" {
		t.Fatal("same target did not retain credentials", e)
	}
	c.Host = "other"
	if _, e := mergeConfig(c, old); e == nil {
		t.Fatal("new target retained credentials")
	}
	raw, _ := json.Marshal(old.Public())
	if strings.Contains(string(raw), "secret") || strings.Contains(string(raw), `"admin"`) {
		t.Fatal("public credentials leaked")
	}
	v, e = mergeConfig(Config{Mode: "disabled"}, old)
	if e != nil || v.Password != "" || v.AdminKey != "" {
		t.Fatal("disable retained secret")
	}
	s := &Service{}
	v, e = s.decode(nil)
	if e != nil || v.Mode != "disabled" {
		t.Fatal("missing configuration enabled sidecar")
	}
	if _, _, _, e = s.open(context.Background(), v); e == nil {
		t.Fatal("disabled config opened client")
	}
}
func TestResponseAllowlist(t *testing.T) {
	for _, path := range []string{"/status", "/proxy", "/auth/logout"} {
		raw := []byte(`{"mode":"proxy","url_redacted":"http://u:secret@host:123/path?q=secret","url":"https://evil/secret","admin_key":"secret","healthy":true,"logged_in":true,"success":true}`)
		v, e := safeResult(path, raw)
		if e != nil {
			t.Fatal(e)
		}
		out, _ := json.Marshal(v)
		if strings.Contains(string(out), "secret") || strings.Contains(string(out), "evil") {
			t.Fatalf("%s leaked: %s", path, out)
		}
	}
	if _, e := safeResult("/auth/start", []byte(`{"url":"https://evil/auth?state=s&code_challenge=c&code_challenge_method=S256"}`)); e == nil {
		t.Fatal("evil OAuth URL accepted")
	}
}
func TestManagedBoundary(t *testing.T) {
	for _, tc := range []struct {
		p, k, u string
		ok      bool
	}{{"ccgateway", "managed", VirtualURL, true}, {"ccgateway", "managed", VirtualCountURL, true}, {"ccgateway", "apikey", VirtualCountURL, true}, {"ccgateway", "managed", VirtualCountURL + "?x=1", false}, {"ccgateway", "managed", VirtualCountURL + "/extra", false}, {"other", "managed", VirtualURL, false}, {"ccgateway", "other", VirtualURL, false}, {"ccgateway", "managed", VirtualURL + "?x=1", false}, {"ccgateway", "managed", "http://127.0.0.1/v1/messages", false}} {
		if IsManaged(tc.p, tc.k, tc.u) != tc.ok {
			t.Fatal(tc)
		}
	}
	req, _ := http.NewRequest("GET", VirtualURL, nil)
	if _, e := (modelTransport{}).RoundTrip(req); e == nil {
		t.Fatal("GET accepted")
	}
}
func TestDBEncryptedAuditAndModelForward(t *testing.T) {
	db := testutil.DB(t)
	cipher, _ := secret.New(bytes.Repeat([]byte{4}, 32))
	s := New(db, cipher)
	gin.SetMode(gin.TestMode)
	save := func(body string) int {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("PUT", "/", strings.NewReader(body))
		c.Request.Header.Set("Content-Type", "application/json")
		s.save(c)
		if w.Code != 200 {
			t.Log(w.Body.String())
		}
		return w.Code
	}
	if save(`{"mode":"local","admin_key":"secret-admin","api_key":"secret-api"}`) != 200 {
		t.Fatal("save failed")
	}
	var persisted string
	if e := db.Pool.QueryRow(context.Background(), "SELECT value::text FROM settings WHERE key=$1", settingKey).Scan(&persisted); e != nil {
		t.Fatal(e)
	}
	if strings.Contains(persisted, "secret") {
		t.Fatal("plaintext settings")
	}
	var detail string
	if e := db.Pool.QueryRow(context.Background(), "SELECT detail::text FROM audit_logs WHERE action='ccgateway.config.update'").Scan(&detail); e != nil {
		t.Fatal(e)
	}
	if detail != "{}" {
		t.Fatalf("audit copied sensitive body %s", detail)
	}
	upstreamCanceled := make(chan struct{})
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != "secret-api" || r.Header.Get("Authorization") != "" || (r.URL.Path != "/v1/messages" && r.URL.Path != "/v1/messages/count_tokens") {
			t.Error("incorrect injected authorization")
		}

		var policy RequestPolicy
		if json.Unmarshal([]byte(r.Header.Get("X-CCGateway-Request-Policy")), &policy) != nil || policy.UnknownBeta != "ignore" {
			t.Error("trusted request policy not injected")
		}
		if !strings.Contains(r.Header.Get("X-CCGateway-Request-Policy"), `"pass_upstream_errors":false`) || policy.PassUpstreamErrors {
			t.Error("request policy header lacks pass_upstream_errors=false")
		}
		if policy.AttachmentSource != "client" {
			t.Error("request policy header lacks attachment_source=client")
		}
		if r.URL.Path == "/v1/messages/count_tokens" {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"input_tokens":42}`))
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = w.Write([]byte("data: ok\n\n"))
		w.(http.Flusher).Flush()
		<-r.Context().Done()
		close(upstreamCanceled)
	}))
	defer up.Close()
	t.Setenv("CCGATEWAY_URL", up.URL)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "POST", VirtualURL, strings.NewReader(`{}`))
	req.Header.Set("x-api-key", "attacker")
	req.Header.Set("Authorization", "Bearer attacker")
	req.Header.Set("X-CCGateway-Request-Policy", `{"unknown_beta":"reject"}`)
	res, e := s.ModelClient().Do(req)
	if e != nil {
		t.Fatal(e)
	}
	buf := make([]byte, 10)
	if _, e = io.ReadFull(res.Body, buf); e != nil {
		t.Fatal(e)
	}
	_ = res.Body.Close()
	select {
	case <-upstreamCanceled:
	case <-time.After(2 * time.Second):
		t.Fatal("body close did not cancel upstream")
	}
	countReq, _ := http.NewRequest("POST", VirtualCountURL, strings.NewReader(`{"model":"fixture","messages":[]}`))
	countReq.Header.Set("Authorization", "Bearer attacker")
	countRes, err := s.ModelClient().Do(countReq)
	if err != nil {
		t.Fatal(err)
	}
	defer countRes.Body.Close()
	countBody, err := io.ReadAll(countRes.Body)
	if err != nil || countRes.StatusCode != 200 || string(countBody) != `{"input_tokens":42}` {
		t.Fatal("count route/auth/response changed", err, countRes.StatusCode, string(countBody))
	}
}
