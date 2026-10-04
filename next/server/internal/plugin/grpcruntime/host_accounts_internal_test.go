package grpcruntime

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
)

// fakeAccounts is a core.PluginAccountReader that records the plugin key it
// was called with: the whole point of the two RPCs is that the host, not the
// plugin, decides whose accounts are read.
type fakeAccounts struct {
	// rows per plugin key.
	rows  map[string][]core.PluginAccountSummary
	creds map[int64]string
	// calls records "<method>:<pluginKey>" in order.
	calls []string
	// lastQuery is the query of the last ListPluginAccounts call.
	lastQuery core.PluginAccountQuery
	// audits counts ReadPluginAccountCredentials calls that returned a
	// credential (the real implementation writes one audit row per such call).
	audits int
}

func (f *fakeAccounts) ListPluginAccounts(_ context.Context, key string, q core.PluginAccountQuery) ([]core.PluginAccountSummary, error) {
	f.calls = append(f.calls, "list:"+key)
	f.lastQuery = q
	rows := f.rows[key]
	if q.Limit > 0 && len(rows) > q.Limit {
		rows = rows[:q.Limit]
	}
	return rows, nil
}

func (f *fakeAccounts) ReadPluginAccountCredentials(_ context.Context, key string, id int64) (*core.PluginAccountCredentials, error) {
	f.calls = append(f.calls, "read:"+key)
	for _, a := range f.rows[key] {
		if a.ID == id {
			f.audits++
			return &core.PluginAccountCredentials{PluginAccountSummary: a,
				Credentials: json.RawMessage(f.creds[id])}, nil
		}
	}
	return nil, core.ErrNotFound.WithMessage("account not found")
}

func accountsEnv(t *testing.T, grants registry.Grants) (*hostServer, *fakeAccounts) {
	t.Helper()
	m := registrytest.Manifest("volc", "1.0.0")
	pkg, err := registry.LoadPackage(t.TempDir(), registrytest.Package(t, m, []byte("bin"), nil), "", "unsigned")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = pkg.Close() })
	acc := &fakeAccounts{
		rows: map[string][]core.PluginAccountSummary{
			"volc": {
				{ID: 1, Name: "a1", Type: "apikey", Status: "active", Schedulable: true,
					Settings: json.RawMessage(`{"base_url":"https://ark"}`)},
				{ID: 2, Name: "a2", Type: "apikey", Status: "disabled", Schedulable: false},
			},
			"other": {{ID: 9, Name: "theirs", Type: "relay_key", Status: "active", Schedulable: true}},
		},
		creds: map[int64]string{1: `{"access_key":"AK","secret_key":"SK"}`, 9: `{"api_key":"theirs"}`},
	}
	rt := &Runtime{o: Options{Node: staticNode{"n", "b"}, Concurrency: Concurrency{Hot: 4, Console: 4, Background: 4, Execute: 4}, DataDir: t.TempDir(), Accounts: acc},
		log: slog.Default()}
	i := newInstance(rt, pkg, "", "", &settings{configJSON: "{}", grants: grants})
	return &hostServer{i: i}, acc
}

func TestHostListAccountsNeedsGrant(t *testing.T) {
	ctx := context.Background()
	h, acc := accountsEnv(t, registry.Grants{})
	if _, err := h.ListAccounts(ctx, &pluginv1.ListAccountsRequest{}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("list without accounts.read: %v", err)
	}
	if len(acc.calls) != 0 {
		t.Fatalf("the account module was reached without a grant: %v", acc.calls)
	}
}

func TestHostListAccounts(t *testing.T) {
	ctx := context.Background()
	h, acc := accountsEnv(t, registry.Grants{"accounts.read": json.RawMessage(`{}`)})

	out, err := h.ListAccounts(ctx, &pluginv1.ListAccountsRequest{})
	if err != nil {
		t.Fatal(err)
	}
	// The host, not the request, decides whose accounts are read.
	if len(acc.calls) != 1 || acc.calls[0] != "list:volc" {
		t.Fatalf("calls = %v", acc.calls)
	}
	if len(out.GetAccounts()) != 2 {
		t.Fatalf("accounts = %v", out.GetAccounts())
	}
	a := out.GetAccounts()[0]
	if a.GetId() != 1 || a.GetName() != "a1" || a.GetType() != "apikey" || a.GetStatus() != "active" ||
		!a.GetEnabled() || a.GetSettingsJson() != `{"base_url":"https://ark"}` {
		t.Fatalf("summary = %v", a)
	}
	if out.GetAccounts()[1].GetEnabled() || out.GetAccounts()[1].GetSettingsJson() != "{}" {
		t.Fatalf("second summary = %v", out.GetAccounts()[1])
	}
	// No field of the response may carry a credential.
	if b, _ := json.Marshal(out.GetAccounts()); strings.Contains(strings.ToLower(string(b)), "secret") ||
		strings.Contains(string(b), "AK") {
		t.Fatalf("credential in the list response: %s", b)
	}

	// Paging: a full page yields a cursor, a short page does not.
	out, err = h.ListAccounts(ctx, &pluginv1.ListAccountsRequest{Limit: 1})
	if err != nil || out.GetNextCursor() != "1" || len(out.GetAccounts()) != 1 {
		t.Fatalf("page: %v %v", out, err)
	}
	if out, _ := h.ListAccounts(ctx, &pluginv1.ListAccountsRequest{Limit: 2}); out.GetNextCursor() != "2" {
		t.Fatalf("cursor on a full page: %q", out.GetNextCursor())
	}
	if out, _ := h.ListAccounts(ctx, &pluginv1.ListAccountsRequest{Limit: 50}); out.GetNextCursor() != "" {
		t.Fatalf("cursor on a short page: %q", out.GetNextCursor())
	}

	// The limit is capped: there is no way to ask for everything at once.
	if _, err := h.ListAccounts(ctx, &pluginv1.ListAccountsRequest{Limit: 100000}); err != nil {
		t.Fatal(err)
	}
	if acc.lastQuery.Limit != AccountsDefaultListLimit {
		t.Fatalf("limit = %d", acc.lastQuery.Limit)
	}
	if _, err := h.ListAccounts(ctx, &pluginv1.ListAccountsRequest{Cursor: "7", Type: "apikey", IncludeInactive: true}); err != nil {
		t.Fatal(err)
	}
	if acc.lastQuery.AfterID != 7 || acc.lastQuery.Type != "apikey" || !acc.lastQuery.IncludeInactive {
		t.Fatalf("query = %+v", acc.lastQuery)
	}
	for _, c := range []string{"abc", "-1", "1;drop"} {
		if _, err := h.ListAccounts(ctx, &pluginv1.ListAccountsRequest{Cursor: c}); status.Code(err) != codes.InvalidArgument {
			t.Fatalf("cursor %q: %v", c, err)
		}
	}
}

func TestHostGetAccountCredentials(t *testing.T) {
	ctx := context.Background()

	// No grant at all.
	h, acc := accountsEnv(t, registry.Grants{"accounts.read": json.RawMessage(`{}`)})
	if _, err := h.GetAccountCredentials(ctx, &pluginv1.GetAccountCredentialsRequest{AccountId: 1}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("read without accounts.credentials: %v", err)
	}
	if acc.audits != 0 || len(acc.calls) != 0 {
		t.Fatalf("account module reached without a grant: %v", acc.calls)
	}

	// The grant exists but with a scope that was never approved.
	h, _ = accountsEnv(t, registry.Grants{"accounts.credentials": json.RawMessage(`{"types":"all"}`)})
	if _, err := h.GetAccountCredentials(ctx, &pluginv1.GetAccountCredentialsRequest{AccountId: 1}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("read with a widened scope: %v", err)
	}

	h, acc = accountsEnv(t, registry.Grants{"accounts.credentials": json.RawMessage(`{"types":"own"}`)})
	out, err := h.GetAccountCredentials(ctx, &pluginv1.GetAccountCredentialsRequest{AccountId: 1})
	if err != nil {
		t.Fatal(err)
	}
	if out.GetCredentialsJson() != `{"access_key":"AK","secret_key":"SK"}` || out.GetAccount().GetId() != 1 {
		t.Fatalf("credentials = %v", out)
	}
	if acc.audits != 1 {
		t.Fatalf("audits = %d", acc.audits)
	}

	// An account of another plugin's account type is NOT_FOUND, never
	// PERMISSION_DENIED: the two must be indistinguishable to the caller, or
	// the call becomes an account-id oracle.
	_, err = h.GetAccountCredentials(ctx, &pluginv1.GetAccountCredentialsRequest{AccountId: 9})
	if status.Code(err) != codes.NotFound {
		t.Fatalf("other plugin's account: %v (%v)", status.Code(err), err)
	}
	_, missing := h.GetAccountCredentials(ctx, &pluginv1.GetAccountCredentialsRequest{AccountId: 4242})
	if status.Code(missing) != codes.NotFound || missing.Error() != err.Error() {
		t.Fatalf("existence leak: %v vs %v", err, missing)
	}
	if acc.audits != 1 {
		t.Fatalf("a refused read was audited as a disclosure: %d", acc.audits)
	}

	if _, err := h.GetAccountCredentials(ctx, &pluginv1.GetAccountCredentialsRequest{}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("missing account id: %v", err)
	}
}

// Without an account module wired in, both calls fail closed.
func TestHostAccountsUnavailable(t *testing.T) {
	ctx := context.Background()
	h, _ := accountsEnv(t, registry.Grants{
		"accounts.read":        json.RawMessage(`{}`),
		"accounts.credentials": json.RawMessage(`{"types":"own"}`),
	})
	h.i.rt.o.Accounts = nil
	if _, err := h.ListAccounts(ctx, &pluginv1.ListAccountsRequest{}); status.Code(err) != codes.Unavailable {
		t.Fatalf("list: %v", err)
	}
	if _, err := h.GetAccountCredentials(ctx, &pluginv1.GetAccountCredentialsRequest{AccountId: 1}); status.Code(err) != codes.Unavailable {
		t.Fatalf("read: %v", err)
	}
}
