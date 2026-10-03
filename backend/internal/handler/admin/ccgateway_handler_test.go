package admin

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type ccgatewayAccounts struct {
	service.AdminService
	input *service.CreateAccountInput
}

func (a *ccgatewayAccounts) CreateAccount(_ context.Context, input *service.CreateAccountInput) (*service.Account, error) {
	a.input = input
	return &service.Account{ID: 42, Name: input.Name}, nil
}
func TestCCGatewayConnectRequiresLoginAndKeepsSecretsServerSide(t *testing.T) {
	loggedIn := false
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if loggedIn {
			_, _ = io.WriteString(w, `{"logged_in":true}`)
		} else {
			_, _ = io.WriteString(w, `{"logged_in":false}`)
		}
	}))
	defer upstream.Close()
	t.Setenv("CCGATEWAY_URL", upstream.URL)
	t.Setenv("CCG_API_KEY", "gateway-secret")
	t.Setenv("CCG_ADMIN_KEY", "management-secret")
	accounts := &ccgatewayAccounts{}
	handler := &AccountHandler{adminService: accounts}
	router := gin.New()
	router.POST("/connect", handler.ConnectCCGateway)
	request := func() *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest("POST", "/connect", strings.NewReader(`{"name":"local","group_ids":[7]}`)))
		return w
	}
	if request().Code != 400 || accounts.input != nil {
		t.Fatal("connected unauthenticated gateway")
	}
	loggedIn = true
	w := request()
	if w.Code != 200 {
		t.Fatalf("connect: %s", w.Body.String())
	}
	if accounts.input.Credentials["api_key"] != "gateway-secret" || accounts.input.Credentials["base_url"] != upstream.URL || accounts.input.GroupIDs[0] != 7 {
		t.Fatal("incorrect account credentials or group")
	}
	if accounts.input.Platform != service.PlatformAnthropic || accounts.input.Type != service.AccountTypeAPIKey {
		t.Fatal("incorrect account type")
	}
	if strings.Contains(w.Body.String(), "secret") {
		t.Fatal("credential leaked")
	}
}

func TestCCGatewayManagementProxy(t *testing.T) {
	t.Setenv("CCG_ADMIN_KEY", "management-secret")
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer management-secret" {
			t.Error("missing management key")
		}
		if r.URL.Path != "/admin/auth/complete" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		b, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(b), `"session_id":"test"`) {
			t.Error("missing body")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"success":true}`)
	}))
	defer upstream.Close()
	t.Setenv("CCGATEWAY_URL", upstream.URL)
	router := gin.New()
	h := &PluginHandler{}
	router.POST("/auth/:action", h.CCGateway)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest("POST", "/auth/complete", strings.NewReader(`{"session_id":"test","code":"code#state"}`)))
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"data":{"success":true}`) {
		t.Fatalf("unexpected response %d %s", w.Code, w.Body.String())
	}
	if strings.Contains(w.Body.String(), "secret") {
		t.Fatal("secret exposed")
	}
	w = httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest("POST", "/auth/arbitrary", nil))
	if w.Code != 400 {
		t.Fatal("unrecognized action accepted")
	}
}

func TestCCGatewayRequiresConfigurationAndRejectsRedirect(t *testing.T) {
	router := gin.New()
	h := &PluginHandler{}
	router.GET("/status", h.CCGateway)
	t.Setenv("CCG_ADMIN_KEY", "")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest("GET", "/status", nil))
	if w.Code != 503 {
		t.Fatal(w.Code)
	}
	reached := false
	destination := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { reached = true }))
	defer destination.Close()
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, destination.URL, 302) }))
	defer upstream.Close()
	t.Setenv("CCG_ADMIN_KEY", "secret")
	t.Setenv("CCGATEWAY_URL", upstream.URL)
	w = httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest("GET", "/status", nil))
	if w.Code == 200 || reached {
		t.Fatal("followed redirect with management credential")
	}
}
