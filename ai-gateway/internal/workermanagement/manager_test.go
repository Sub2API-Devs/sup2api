package workermanagement

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
)

func TestManagerKeepsOAuthExchangeAndRefreshInsideWorker(t *testing.T) {
	var mu sync.Mutex
	grants := make([]string, 0, 2)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/token":
			if err := r.ParseForm(); err != nil {
				t.Fatal(err)
			}
			mu.Lock()
			grants = append(grants, r.Form.Get("grant_type"))
			mu.Unlock()
			sequence := len(grants)
			claims, _ := json.Marshal(map[string]any{
				"email":                       "worker@example.com",
				"https://api.openai.com/auth": map[string]any{"chatgpt_account_id": "chatgpt-worker-a"},
			})
			idToken := "header." + base64.RawURLEncoding.EncodeToString(claims) + ".signature"
			_ = json.NewEncoder(w).Encode(map[string]any{
				"access_token":  "access-" + string(rune('0'+sequence)),
				"refresh_token": "refresh-" + string(rune('0'+sequence)),
				"id_token":      idToken, "expires_in": 3600,
			})
		case "/oauth/models":
			if r.Header.Get("Authorization") != "Bearer access-2" || r.Header.Get("ChatGPT-Account-ID") != "chatgpt-worker-a" {
				http.Error(w, "wrong Worker-local OAuth credential", http.StatusUnauthorized)
				return
			}
			_, _ = w.Write([]byte(`{"data":[]}`))
		case "/v1/models":
			if r.Header.Get("Authorization") != "Bearer sk-worker-secret" {
				http.Error(w, "wrong API key", http.StatusUnauthorized)
				return
			}
			_, _ = w.Write([]byte(`{"data":[]}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	manager, err := New(Config{
		WorkerID: "worker-a", InstanceID: "instance-a", ManagementKey: strings.Repeat("m", 32),
		Version: "test", VaultPath: filepath.Join(t.TempDir(), "vault.db"), VaultKey: bytes.Repeat([]byte{3}, 32),
		AuthorizeURL: upstream.URL + "/authorize", TokenURL: upstream.URL + "/token",
	})
	if err != nil {
		t.Fatal(err)
	}
	defer manager.Close()

	started, err := manager.StartOAuth(AccountInput{Name: "oauth", BaseURL: upstream.URL + "/oauth"})
	if err != nil {
		t.Fatal(err)
	}
	authorizeURL, err := url.Parse(started["authorize_url"].(string))
	if err != nil {
		t.Fatal(err)
	}
	callback := "http://localhost:1455/auth/callback?code=worker-code&state=" + url.QueryEscape(authorizeURL.Query().Get("state"))
	account, err := manager.CompleteOAuth(context.Background(), OAuthCompleteInput{SessionID: started["session_id"].(string), Input: callback})
	if err != nil {
		t.Fatal(err)
	}
	if account.Kind != "openai_oauth" || account.Email != "worker@example.com" {
		t.Fatalf("unexpected OAuth account summary: %+v", account)
	}
	if _, err := manager.Refresh(context.Background(), account.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := manager.TestAccount(context.Background(), account.ID, TestInput{}); err != nil {
		t.Fatal(err)
	}

	apiKey, err := manager.CreateAPIKeyAccount(AccountInput{Name: "api", APIKey: "sk-worker-secret", BaseURL: upstream.URL})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := manager.TestAccount(context.Background(), apiKey.ID, TestInput{}); err != nil {
		t.Fatal(err)
	}
	mu.Lock()
	defer mu.Unlock()
	if strings.Join(grants, ",") != "authorization_code,refresh_token" {
		t.Fatalf("token lifecycle did not execute in the Worker: %v", grants)
	}
	accounts, err := manager.ListAccounts()
	if err != nil || len(accounts) != 2 {
		t.Fatalf("unexpected Worker-local accounts: %+v, %v", accounts, err)
	}
}

func TestManagerUpdatesAccountMetadataWithoutReplacingCredentials(t *testing.T) {
	manager, err := New(Config{
		WorkerID: "worker-edit", InstanceID: "instance-edit", ManagementKey: strings.Repeat("m", 32),
		VaultPath: filepath.Join(t.TempDir(), "vault.db"), VaultKey: bytes.Repeat([]byte{8}, 32),
	})
	if err != nil {
		t.Fatal(err)
	}
	defer manager.Close()

	created, err := manager.CreateAPIKeyAccount(AccountInput{
		Name: "before", APIKey: "sk-worker-secret", Models: "gpt-old", Group: "old",
	})
	if err != nil {
		t.Fatal(err)
	}
	updated, err := manager.UpdateAccount(created.ID, AccountInput{
		Name: "after", Kind: "openai_api_key", Models: "gpt-new", Group: "new", TestModel: "gpt-test",
	})
	if err != nil {
		t.Fatal(err)
	}
	if updated.Name != "after" || updated.Models != "gpt-new" || updated.Group != "new" || updated.TestModel != "gpt-test" {
		t.Fatalf("unexpected updated account: %+v", updated)
	}
	stored, err := manager.vault.Get(created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if stored.APIKey != "sk-worker-secret" {
		t.Fatal("metadata update replaced the Worker-local credential")
	}
	if _, err := manager.UpdateAccount(created.ID, AccountInput{Name: "bad", Kind: "anthropic_api_key"}); err == nil {
		t.Fatal("expected account kind changes to be rejected")
	}
}

func TestManagerStoresAPIKeyAccountsAndIPProxiesWithoutExposingSecrets(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer listener.Close()
	go func() {
		for {
			conn, acceptErr := listener.Accept()
			if acceptErr != nil {
				return
			}
			_ = conn.Close()
		}
	}()
	host, portRaw, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	port, _ := strconv.Atoi(portRaw)

	manager, err := New(Config{
		WorkerID: "worker-proxy", InstanceID: "instance-proxy", ManagementKey: strings.Repeat("m", 32),
		VaultPath: filepath.Join(t.TempDir(), "vault.db"), VaultKey: bytes.Repeat([]byte{9}, 32),
	})
	if err != nil {
		t.Fatal(err)
	}
	defer manager.Close()

	account, err := manager.CreateAccount(AccountInput{
		Name: "anthropic", Kind: "anthropic_api_key", APIKey: "sk-ant-secret",
		BaseURL: "https://api.anthropic.com",
	})
	if err != nil || account.Kind != "anthropic_api_key" {
		t.Fatalf("create generic account: %+v %v", account, err)
	}
	encodedAccount, _ := json.Marshal(account)
	if bytes.Contains(encodedAccount, []byte("sk-ant-secret")) {
		t.Fatalf("account summary leaked API key: %s", encodedAccount)
	}

	proxy, err := manager.CreateProxy(ProxyInput{
		Name: "edge", Protocol: "http", Host: host, Port: port, Username: "user", Password: "proxy-secret",
	})
	if err != nil || proxy.Host != host || !proxy.HasAuth {
		t.Fatalf("create proxy: %+v %v", proxy, err)
	}
	encodedProxy, _ := json.Marshal(proxy)
	if bytes.Contains(encodedProxy, []byte("proxy-secret")) {
		t.Fatalf("proxy summary leaked password: %s", encodedProxy)
	}
	if _, err := manager.TestProxy(context.Background(), proxy.ID); err != nil {
		t.Fatal(err)
	}
	proxies, err := manager.ListProxies()
	if err != nil || len(proxies) != 1 {
		t.Fatalf("list proxies: %+v %v", proxies, err)
	}
	if err := manager.DeleteProxy(proxy.ID); err != nil {
		t.Fatal(err)
	}
	if remaining, err := manager.ListProxies(); err != nil || len(remaining) != 0 {
		t.Fatalf("delete proxy left leftovers: %+v %v", remaining, err)
	}
}

func TestNormalizeProxyHostRejectsEmbeddedPortsAndNormalizesIPv6(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "hostname", input: "proxy.internal", want: "proxy.internal"},
		{name: "ipv4", input: "127.0.0.1", want: "127.0.0.1"},
		{name: "ipv6", input: "2001:db8::1", want: "2001:db8::1"},
		{name: "bracketed ipv6", input: "[2001:db8::1]", want: "2001:db8::1"},
		{name: "embedded port", input: "proxy.internal:8080", wantErr: true},
		{name: "control character", input: "proxy.internal\nother", wantErr: true},
		{name: "invalid brackets", input: "[proxy.internal]", wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := normalizeProxyHost(test.input)
			if test.wantErr {
				if err == nil {
					t.Fatalf("normalizeProxyHost(%q) = %q, want error", test.input, got)
				}
				return
			}
			if err != nil || got != test.want {
				t.Fatalf("normalizeProxyHost(%q) = %q, %v; want %q", test.input, got, err, test.want)
			}
		})
	}
}

func TestManagerTestsNonOpenAIAccountsWithKindSpecificAuth(t *testing.T) {
	var seen []string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen = append(seen, r.URL.Path+" "+r.Header.Get("x-api-key")+r.Header.Get("x-goog-api-key"))
		switch {
		case r.URL.Path == "/v1/models" && r.Header.Get("x-api-key") == "sk-ant-secret":
			_, _ = w.Write([]byte(`{"data":[]}`))
		case r.URL.Path == "/v1beta/models" && r.Header.Get("x-goog-api-key") == "gemini-secret":
			_, _ = w.Write([]byte(`{"models":[]}`))
		default:
			http.Error(w, "unexpected probe", http.StatusUnauthorized)
		}
	}))
	defer upstream.Close()

	manager, err := New(Config{
		WorkerID: "worker-kinds", InstanceID: "instance-kinds", ManagementKey: strings.Repeat("m", 32),
		VaultPath: filepath.Join(t.TempDir(), "vault.db"), VaultKey: bytes.Repeat([]byte{4}, 32),
	})
	if err != nil {
		t.Fatal(err)
	}
	defer manager.Close()

	anthropic, err := manager.CreateAccount(AccountInput{
		Name: "anthropic", Kind: "anthropic_api_key", APIKey: "sk-ant-secret", BaseURL: upstream.URL,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := manager.TestAccount(context.Background(), anthropic.ID, TestInput{}); err != nil {
		t.Fatalf("anthropic test: %v seen=%v", err, seen)
	}
	gemini, err := manager.CreateAccount(AccountInput{
		Name: "gemini", Kind: "gemini_api_key", APIKey: "gemini-secret", BaseURL: upstream.URL,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := manager.TestAccount(context.Background(), gemini.ID, TestInput{}); err != nil {
		t.Fatalf("gemini test: %v seen=%v", err, seen)
	}
}

func TestManagerTestsTheSelectedModelInsteadOfOnlyListingModels(t *testing.T) {
	var seenPath string
	var seenModel string
	var seenMaxTokens int
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seenPath = r.URL.Path
		if r.Method != http.MethodPost || r.Header.Get("Authorization") != "Bearer sk-worker-secret" {
			http.Error(w, "unexpected request", http.StatusUnauthorized)
			return
		}
		var payload struct {
			Model     string `json:"model"`
			MaxTokens int    `json:"max_tokens"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		seenModel = payload.Model
		seenMaxTokens = payload.MaxTokens
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []any{map[string]any{"message": map[string]any{"content": "hello from Worker"}}},
		})
	}))
	defer upstream.Close()

	manager, err := New(Config{
		WorkerID: "worker-model", InstanceID: "instance-model", ManagementKey: strings.Repeat("m", 32),
		VaultPath: filepath.Join(t.TempDir(), "vault.db"), VaultKey: bytes.Repeat([]byte{6}, 32),
	})
	if err != nil {
		t.Fatal(err)
	}
	defer manager.Close()

	account, err := manager.CreateAPIKeyAccount(AccountInput{
		Name: "model-test", APIKey: "sk-worker-secret", BaseURL: upstream.URL, Models: "gpt-5.4,gpt-5.6",
	})
	if err != nil {
		t.Fatal(err)
	}
	result, err := manager.TestAccount(context.Background(), account.ID, TestInput{Model: "gpt-5.6"})
	if err != nil {
		t.Fatal(err)
	}
	if seenPath != "/v1/chat/completions" || seenModel != "gpt-5.6" || seenMaxTokens != 256 || result["model"] != "gpt-5.6" || result["response_text"] != "hello from Worker" {
		t.Fatalf("selected model test mismatch: path=%q model=%q max_tokens=%d result=%+v", seenPath, seenModel, seenMaxTokens, result)
	}
}

func TestAccountTestResponseTextSupportsProviderResponseShapes(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want string
	}{
		{name: "openai chat", raw: `{"choices":[{"message":{"content":"hello"}}]}`, want: "hello"},
		{name: "openai reasoning fallback", raw: `{"choices":[{"message":{"content":null,"reasoning":"thinking text"}}]}`, want: "thinking text"},
		{name: "openai responses", raw: `{"output":[{"content":[{"type":"output_text","text":"response text"}]}]}`, want: "response text"},
		{name: "anthropic", raw: `{"content":[{"type":"text","text":"claude text"}]}`, want: "claude text"},
		{name: "gemini", raw: `{"candidates":[{"content":{"parts":[{"text":"gemini text"}]}}]}`, want: "gemini text"},
		{name: "nonstandard json", raw: `{"result":"ok"}`, want: `{"result":"ok"}`},
		{name: "plain text", raw: "plain upstream body", want: "plain upstream body"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := accountTestResponseText([]byte(test.raw)); got != test.want {
				t.Fatalf("accountTestResponseText() = %q, want %q", got, test.want)
			}
		})
	}
}

func TestManagerStatusReportsConfiguredLogTransport(t *testing.T) {
	manager, err := New(Config{
		WorkerID: "worker-nats", InstanceID: "instance-nats", ManagementKey: strings.Repeat("m", 32),
		LogTransport: "nats_jetstream", VaultPath: filepath.Join(t.TempDir(), "vault.db"), VaultKey: bytes.Repeat([]byte{7}, 32),
	})
	if err != nil {
		t.Fatal(err)
	}
	defer manager.Close()

	if got := manager.Status(context.Background())["log_transport"]; got != "nats_jetstream" {
		t.Fatalf("log_transport = %v", got)
	}
}

func TestParseOAuthCallbackRejectsMismatchedStateAtManagerBoundary(t *testing.T) {
	manager, err := New(Config{
		WorkerID: "w", InstanceID: "i", ManagementKey: strings.Repeat("x", 32),
		VaultPath: filepath.Join(t.TempDir(), "vault.db"), VaultKey: bytes.Repeat([]byte{5}, 32),
	})
	if err != nil {
		t.Fatal(err)
	}
	defer manager.Close()
	started, err := manager.StartOAuth(AccountInput{Name: "oauth"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = manager.CompleteOAuth(context.Background(), OAuthCompleteInput{
		SessionID: started["session_id"].(string),
		Input:     "http://localhost:1455/auth/callback?code=code&state=wrong",
	})
	if err == nil || !strings.Contains(err.Error(), "state") {
		t.Fatalf("expected state mismatch, got %v", err)
	}
}

func TestCompleteOAuthConsumesSessionOnce(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/token" {
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"access_token": "access-1", "refresh_token": "refresh-1", "expires_in": 3600,
		})
	}))
	defer upstream.Close()

	manager, err := New(Config{
		WorkerID: "worker-a", InstanceID: "instance-a", ManagementKey: strings.Repeat("m", 32),
		VaultPath: filepath.Join(t.TempDir(), "vault.db"), VaultKey: bytes.Repeat([]byte{7}, 32),
		TokenURL: upstream.URL + "/token",
	})
	if err != nil {
		t.Fatal(err)
	}
	defer manager.Close()

	started, err := manager.StartOAuth(AccountInput{Name: "oauth"})
	if err != nil {
		t.Fatal(err)
	}
	sessionID := started["session_id"].(string)
	input := OAuthCompleteInput{SessionID: sessionID, Input: "auth-code"}

	first, err := manager.CompleteOAuth(context.Background(), input)
	if err != nil || first == nil {
		t.Fatalf("first complete failed: %v", err)
	}
	if _, err := manager.CompleteOAuth(context.Background(), input); err == nil {
		t.Fatal("expected second complete of the same OAuth session to fail")
	}
	accounts, err := manager.ListAccounts()
	if err != nil || len(accounts) != 1 {
		t.Fatalf("expected exactly one account after one-shot complete, got %+v err=%v", accounts, err)
	}
}
