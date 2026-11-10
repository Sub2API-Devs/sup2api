package grpcruntime

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

// SendPluginAccountRequest makes fakeAccounts a core.PluginAccountRequester.
func (f *fakeAccounts) SendPluginAccountRequest(_ context.Context, key string, in *pluginv1.SendAccountRequestRequest) (*pluginv1.ExecutionHTTPResponse, error) {
	f.calls = append(f.calls, "request:"+key)
	for _, a := range f.rows[key] {
		if a.ID == in.GetAccountId() {
			return &pluginv1.ExecutionHTTPResponse{Status: 200, Body: []byte("ok")}, nil
		}
	}
	return nil, core.ErrNotFound.WithMessage("account not found")
}

func requestEnv(t *testing.T, grants registry.Grants) (*hostServer, *fakeAccounts) {
	t.Helper()
	h, acc := accountsEnv(t, grants)
	h.i.pkg.Manifest.ExternalServices = []string{"chatgpt.com", " API.Example.com:8443 "}
	return h, acc
}

var ownCredentials = registry.Grants{"accounts.credentials": json.RawMessage(`{"types":"own"}`)}

func TestHostSendAccountRequestNeedsOwnCredentials(t *testing.T) {
	in := &pluginv1.SendAccountRequestRequest{AccountId: 1, Url: "https://chatgpt.com/reset"}
	for _, grants := range []registry.Grants{
		{}, {"accounts.read": json.RawMessage(`{}`)},
		{"accounts.credentials": json.RawMessage(`{"types":"all"}`)},
	} {
		h, acc := requestEnv(t, grants)
		if _, err := h.SendAccountRequest(t.Context(), in); status.Code(err) != codes.PermissionDenied || len(acc.calls) != 0 {
			t.Fatalf("grant %v: %v, calls %v", grants, err, acc.calls)
		}
	}
}

func TestHostSendAccountRequestArguments(t *testing.T) {
	h, acc := requestEnv(t, ownCredentials)
	for name, in := range map[string]*pluginv1.SendAccountRequestRequest{
		"no account": {Url: "https://chatgpt.com/reset"},
		"no url":     {AccountId: 1},
		"long url":   {AccountId: 1, Url: "https://chatgpt.com/" + strings.Repeat("a", AccountRequestMaxURL)},
		"long verb":  {AccountId: 1, Url: "https://chatgpt.com/reset", Method: strings.Repeat("P", AccountRequestMaxMethod+1)},
		"large body": {AccountId: 1, Url: "https://chatgpt.com/reset", Body: make([]byte, AccountRequestMaxBody+1)},
		"bad url":    {AccountId: 1, Url: "https://chatgpt.com/%zz"},
	} {
		if _, err := h.SendAccountRequest(t.Context(), in); status.Code(err) != codes.InvalidArgument {
			t.Fatalf("%s: %v", name, err)
		}
	}
	if len(acc.calls) != 0 {
		t.Fatalf("invalid requests reached accounts: %v", acc.calls)
	}
	in := &pluginv1.SendAccountRequestRequest{AccountId: 1, Url: "https://chatgpt.com/reset", Body: make([]byte, AccountRequestMaxBody)}
	if _, err := h.SendAccountRequest(t.Context(), in); err != nil {
		t.Fatalf("body at the limit: %v", err)
	}
}

func TestHostSendAccountRequestExternalServicesOnly(t *testing.T) {
	h, acc := requestEnv(t, ownCredentials)
	for _, u := range []string{
		"https://chatgpt.com/backend-api/reset", "http://CHATGPT.COM:443/x", "https://sub.chatgpt.com/x",
		"https://api.example.com/x", "https://api.example.com:9000/x", "https://deep.api.example.com/x",
	} {
		out, err := h.SendAccountRequest(t.Context(), &pluginv1.SendAccountRequestRequest{AccountId: 1, Url: u})
		if err != nil || out.GetStatus() != 200 {
			t.Fatalf("%s refused: %v", u, err)
		}
	}
	calls := len(acc.calls)
	for _, u := range []string{
		"https://evilchatgpt.com/x", "https://chatgpt.com.evil.net/x", "https://chatgpt.com@evil.net/x",
		"https://evil.net/?h=chatgpt.com", "ftp://chatgpt.com/x", "chatgpt.com/x", "https://example.com/x",
		"https://127.0.0.1/x", "https:///x",
	} {
		if _, err := h.SendAccountRequest(t.Context(), &pluginv1.SendAccountRequestRequest{AccountId: 1, Url: u}); status.Code(err) != codes.PermissionDenied {
			t.Fatalf("%s: %v", u, err)
		}
	}
	if len(acc.calls) != calls {
		t.Fatalf("refused hosts reached accounts: %v", acc.calls[calls:])
	}
	h.i.pkg.Manifest.ExternalServices = nil
	if _, err := h.SendAccountRequest(t.Context(), &pluginv1.SendAccountRequestRequest{AccountId: 1, Url: "https://chatgpt.com/x"}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("no externalServices: %v", err)
	}
}

func TestHostSendAccountRequestOwnAccountsOnly(t *testing.T) {
	h, acc := requestEnv(t, ownCredentials)
	if _, err := h.SendAccountRequest(t.Context(), &pluginv1.SendAccountRequestRequest{AccountId: 9, Url: "https://chatgpt.com/x"}); status.Code(err) != codes.NotFound {
		t.Fatalf("another plugin's account: %v", err)
	}
	if acc.calls[0] != "request:volc" {
		t.Fatalf("called as %v", acc.calls)
	}
	h.i.rt.o.Accounts = nil
	if _, err := h.SendAccountRequest(t.Context(), &pluginv1.SendAccountRequestRequest{AccountId: 1, Url: "https://chatgpt.com/x"}); status.Code(err) != codes.Unavailable {
		t.Fatalf("no account module: %v", err)
	}
}
