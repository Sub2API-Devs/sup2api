package gateway

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// These tests enter the HTTP gateway, use its real dispatcher and ModelClient,
// decrypt the setting from PostgreSQL, and consume actual upstream JSON/SSE.
// Only the adapter RPC and accounting sink use the existing gateway doubles.
func managedCCGatewayEnv(t *testing.T, configured bool) *env {
	t.Helper()
	db := testutil.DB(t)
	cipher, err := secret.New(make([]byte, 32))
	if err != nil {
		t.Fatal(err)
	}
	e := newEnv(t, func(e *env) {
		info := e.gen.accountTypes[0].Plugin
		info.Key = "ccgateway"
		typ := e.gen.accountTypes[0].Type
		typ.ID = "managed"
		e.gen.plugins = []core.PluginInfo{info}
		e.gen.accountTypes = []core.AccountTypeBinding{{Plugin: info, Type: typ, Client: e.plat}}
		e.plat.route = func(*pluginv1.BuildUpstreamRequestRequest) string { return ccgateway.VirtualURL }
		e.accounts = newFakeAccounts()
		e.accounts.addTyped(testGroup, 1, 1, "", "ccgateway", "managed")
		e.accounts.accounts[1].Credentials = json.RawMessage(`{}`)
	})
	// The managed transport checks the authoritative account type before
	// allowing the legacy shared runtime. Match the scheduler fixture in PG.
	if _, err := db.Pool.Exec(context.Background(), `INSERT INTO accounts(id,name,plugin_key,type,credentials_enc) VALUES(1,'managed-test','ccgateway','managed',''::bytea)`); err != nil {
		t.Fatal(err)
	}
	e.gw.allowPrivate = false // the managed path must not require disabling SSRF.
	e.gw.d.CCGateway = ccgateway.New(db, cipher)
	t.Setenv("CCGATEWAY_URL", e.up.srv.URL)
	t.Setenv("CCG_API_KEY", "")
	t.Setenv("CCG_ADMIN_KEY", "")
	if configured {
		plain, _ := json.Marshal(ccgateway.Config{Mode: "local", APIKey: "managed-sidecar-secret", AdminKey: "managed-admin-secret"})
		encrypted, err := cipher.Encrypt(plain, []byte("system:ccgateway:v1"))
		if err != nil {
			t.Fatal(err)
		}
		envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
		if _, err = db.Pool.Exec(context.Background(), `INSERT INTO settings(key,value) VALUES('ccgateway_remote',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, envelope); err != nil {
			t.Fatal(err)
		}
	}
	return e
}

func TestCCGatewayManagedGatewayJSONAndSSEUsage(t *testing.T) {
	for _, stream := range []bool{false, true} {
		name := "json"
		if stream {
			name = "sse"
		}
		t.Run(name, func(t *testing.T) {
			e := managedCCGatewayEnv(t, true)
			r := e.do("/v1/messages", body(testModel, stream), nil)
			if r.status != 200 {
				t.Fatalf("HTTP %d: %s", r.status, r.body)
			}
			if stream && (!strings.Contains(r.header.Get("Content-Type"), "text/event-stream") || !strings.Contains(string(r.body), "event: message_stop")) {
				t.Fatalf("incomplete SSE: %s", r.body)
			}
			if !stream && r.json().Get("usage.output_tokens").Int() != upOutput {
				t.Fatalf("bad JSON: %s", r.body)
			}
			rec := e.record()
			want := core.UsageTokens{Input: upInput, Output: upOutput, CacheRead: upCacheRead, CacheCreation: upCacheCreation - upCacheCreate1h, CacheCreation1h: upCacheCreate1h}
			if !rec.Success || !rec.Billable || rec.Stream != stream || rec.Tokens != want || rec.UsageSemantics != "exclusive" || rec.Price == nil || rec.Price.ID != 9 || rec.RateMultiplier.String() != "1.5" {
				t.Fatalf("incorrect usage/billing: %+v", rec)
			}
			if rec.AccountID == nil || *rec.AccountID != 1 || rec.Protocol != "anthropic.messages" || rec.Attempts != 1 {
				t.Fatalf("incorrect attribution: %+v", rec)
			}
			calls := e.up.keys()
			if len(calls) != 1 || calls[0] != "managed-sidecar-secret" {
				t.Fatalf("not forwarded through managed transport: %v", calls)
			}
			if e.up.last().header.Get("Authorization") != "" {
				t.Fatal("unexpected upstream authorization header")
			}
			for _, sensitive := range []string{"managed-sidecar-secret", "managed-admin-secret", testKey} {
				if strings.Contains(string(r.body), sensitive) {
					t.Fatal("credential leaked to client")
				}
			}
			select {
			case extra := <-e.settler.ch:
				t.Fatalf("duplicate settlement: %+v", extra)
			default:
			}
		})
	}
}

func TestCCGatewayManagedGatewayUnconfigured(t *testing.T) {
	e := managedCCGatewayEnv(t, false)
	r := e.messages(body(testModel, false))
	if r.status < 400 {
		t.Fatalf("unconfigured gateway succeeded: %d %s", r.status, r.body)
	}
	if len(e.up.keys()) != 0 {
		t.Fatal("unconfigured gateway reached upstream")
	}
	rec := e.record()
	if rec.Success || rec.Billable || rec.Tokens != (core.UsageTokens{}) {
		t.Fatalf("unconfigured failure charged usage: %+v", rec)
	}
	if strings.Contains(string(r.body), "managed-sidecar-secret") {
		t.Fatal("secret in error")
	}
}

func TestCCGatewayAPIKeyRejectsLegacySharedRuntime(t *testing.T) {
	e := managedCCGatewayEnv(t, true)
	e.gen.accountTypes[0].Type.ID = "apikey"
	e.accounts.accounts[1].Type = "apikey"
	if _, err := e.gw.d.CCGateway.DB.Pool.Exec(context.Background(), `UPDATE accounts SET type='apikey' WHERE id=1`); err != nil {
		t.Fatal(err)
	}
	r := e.messages(body(testModel, false))
	if r.status < 400 || len(e.up.keys()) != 0 {
		t.Fatal("API Key account used legacy shared runtime")
	}
}
