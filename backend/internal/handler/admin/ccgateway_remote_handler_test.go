package admin

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type ccgatewayConfigStub struct{ cfg service.CCGatewayRemoteConfig }

func TestCCGatewayConnectUsesBridgeBeforeSwitchingToSSH(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `{"logged_in":true}`)
	}))
	defer upstream.Close()
	t.Setenv("CCGATEWAY_URL", upstream.URL)
	t.Setenv("CCG_API_KEY", "test-gateway-key")
	t.Setenv("CCG_ADMIN_KEY", "test-admin-key")
	cfg := &config.Config{}
	cfg.Server.Port = 8080
	h := &PluginHandler{serverConfig: cfg, remoteConfig: &ccgatewayConfigStub{cfg: service.CCGatewayRemoteConfig{Mode: "local"}}}
	accounts := &ccgatewayAccounts{}
	r := gin.New()
	r.POST("/connect", h.ConnectRemoteCCGateway(&AccountHandler{adminService: accounts}))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("POST", "/connect", strings.NewReader(`{"name":"bridge"}`)))
	if w.Code != 200 || accounts.input == nil {
		t.Fatalf("connect failed: %d", w.Code)
	}
	if accounts.input.Credentials["base_url"] != "http://127.0.0.1:8080/builtin/ccgateway" {
		t.Fatal("account bypasses the bridge and cannot follow later SSH configuration changes")
	}
}

func (s *ccgatewayConfigStub) Get(context.Context) (service.CCGatewayRemoteConfig, error) {
	return s.cfg, nil
}
func (s *ccgatewayConfigStub) Save(_ context.Context, c service.CCGatewayRemoteConfig) (service.CCGatewayRemoteConfig, error) {
	s.cfg = c
	return c, nil
}

func TestCCGatewayRemoteConfigNeverReturnsSecrets(t *testing.T) {
	store := &ccgatewayConfigStub{cfg: service.CCGatewayRemoteConfig{Mode: "ssh", Password: "password-canary", PrivateKey: "private-canary", Passphrase: "phrase-canary"}}
	h := &PluginHandler{remoteConfig: store}
	r := gin.New()
	r.GET("/remote", h.CCGatewayRemoteConfig)
	r.PUT("/remote", h.CCGatewayRemoteConfig)
	for _, method := range []string{"GET", "PUT"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(method, "/remote", strings.NewReader(`{"mode":"ssh","password":"password-canary","private_key":"private-canary","passphrase":"phrase-canary"}`)))
		if w.Code != 200 || strings.Contains(w.Body.String(), "canary") {
			t.Fatalf("unsafe response: status %d", w.Code)
		}
		var result struct {
			Data map[string]any `json:"data"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		for _, key := range []string{"password", "private_key", "passphrase"} {
			if _, ok := result.Data[key]; ok {
				t.Fatalf("returned %s", key)
			}
		}
		if result.Data["has_password"] != true {
			t.Fatal("missing credential indicator")
		}
	}
}

func TestCCGatewayRemoteRejectsArbitraryActionAndLocalMode(t *testing.T) {
	h := &PluginHandler{remoteConfig: &ccgatewayConfigStub{cfg: service.CCGatewayRemoteConfig{Mode: "local"}}}
	r := gin.New()
	r.POST("/action", h.CCGatewayRemoteAction)
	r.POST("/test", h.CCGatewayRemoteTest)
	for _, item := range []struct{ path, body string }{{"/action", `{"action":"exec; id"}`}, {"/action", `{"action":"status"}`}, {"/test", `{}`}} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("POST", item.path, strings.NewReader(item.body)))
		if w.Code != 400 {
			t.Fatalf("expected rejection, got %d", w.Code)
		}
	}
}

func TestCCGatewayBridgeAuthenticationAndSSE(t *testing.T) {
	t.Setenv("CCG_API_KEY", "test-gateway-key")
	calls := 0
	sse := "event: message_start\ndata: {\"type\":\"message_start\"}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.URL.Path != "/v1/messages" || r.URL.RawQuery != "" || r.Header.Get("x-api-key") != "test-gateway-key" || r.Header.Get("Authorization") != "" {
			t.Error("incorrect forwarding target or authentication")
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, sse)
	}))
	defer upstream.Close()
	t.Setenv("CCGATEWAY_URL", upstream.URL)
	h := &PluginHandler{}
	r := gin.New()
	r.POST("/builtin/ccgateway/v1/messages", h.CCGatewayMessages)
	for _, item := range []struct {
		remote, key string
		status      int
	}{{"192.0.2.1:5000", "test-gateway-key", 401}, {"127.0.0.1:5000", "", 401}, {"127.0.0.1:5000", "wrong", 401}, {"127.0.0.1:5000", "test-gateway-key", 200}} {
		req := httptest.NewRequest("POST", "/builtin/ccgateway/v1/messages?ignored=true", strings.NewReader(`{"stream":true}`))
		req.RemoteAddr = item.remote
		req.Header.Set("Authorization", "Bearer "+item.key)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		if w.Code != item.status {
			t.Fatalf("got %d want %d", w.Code, item.status)
		}
		if w.Code == 200 && w.Body.String() != sse {
			t.Fatal("SSE changed")
		}
	}
	if calls != 1 {
		t.Fatalf("unexpected upstream calls %d", calls)
	}
}

func TestCCGatewayBridgeCancelsUpstream(t *testing.T) {
	t.Setenv("CCG_API_KEY", "test-gateway-key")
	cancelled := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(200)
		_ = http.NewResponseController(w).Flush()
		<-r.Context().Done()
		close(cancelled)
	}))
	defer upstream.Close()
	t.Setenv("CCGATEWAY_URL", upstream.URL)
	r := gin.New()
	r.POST("/builtin/ccgateway/v1/messages", (&PluginHandler{}).CCGatewayMessages)
	server := httptest.NewServer(r)
	defer server.Close()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, "POST", server.URL+"/builtin/ccgateway/v1/messages", strings.NewReader(`{}`))
	req.Header.Set("x-api-key", "test-gateway-key")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	cancel()
	select {
	case <-cancelled:
	case <-time.After(3 * time.Second):
		t.Fatal("upstream request not cancelled")
	}
}

func TestCCGatewayProxyForwardsWithManagementKeyAndRedacts(t *testing.T) {
	t.Setenv("CCG_ADMIN_KEY", "management-canary")
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/admin/proxy" || r.Header.Get("Authorization") != "Bearer management-canary" {
			t.Error("incorrect proxy management request")
		}
		if r.Method == http.MethodPut {
			var in map[string]any
			if json.NewDecoder(r.Body).Decode(&in) != nil || in["mode"] != "proxy" {
				t.Error("configuration body missing")
			}
		}
		_, _ = io.WriteString(w, `{"mode":"proxy","configured":true,"revision":2,"url_redacted":"http://user:proxy-canary@proxy.example:8080/?token=canary","password":"other-canary"}`)
	}))
	defer upstream.Close()
	t.Setenv("CCGATEWAY_URL", upstream.URL)
	r := gin.New()
	h := &PluginHandler{}
	r.GET("/proxy", h.CCGatewayProxy)
	r.PUT("/proxy", h.CCGatewayProxy)
	for _, method := range []string{"GET", "PUT"} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(method, "/proxy", strings.NewReader(`{"mode":"proxy","url":"http://proxy.example:8080"}`)))
		if w.Code != 200 || strings.Contains(w.Body.String(), "canary") || strings.Contains(w.Body.String(), "user:") {
			t.Fatalf("unsafe proxy view: status %d", w.Code)
		}
		if !strings.Contains(w.Body.String(), "http://proxy.example:8080") {
			t.Fatal("missing sanitized proxy URL")
		}
	}
}
