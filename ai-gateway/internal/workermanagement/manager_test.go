package workermanagement

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
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
