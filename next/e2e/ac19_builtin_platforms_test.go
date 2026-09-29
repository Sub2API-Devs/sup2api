package e2e

import (
	"net/http"
	"slices"
	"strings"
	"testing"
)

// AC 19: the core has built-in platforms (ARCHITECTURE 6.6, CONTRACTS 13).
// GET /platforms lists at least anthropic, openai and gemini, built in and
// each with its endpoints. The endpoints of a built-in platform always exist,
// so /v1/chat/completions is never a 404 for an API key whose group only has
// anthropic-type accounts: it is 503 no_available_account (in the endpoint's
// openai error format, no upstream called) while no protocol converter is
// registered, and a served 200 once one is.
func TestAC19_BuiltinPlatforms(t *testing.T) {
	e := Setup(t)
	admin := e.Admin()

	// 1. Built-in platforms with their endpoints.
	platforms := e.Platforms(admin)
	wantEndpoint := map[string]string{
		"anthropic": "POST /v1/messages",
		"openai":    "POST /v1/chat/completions",
		"gemini":    "POST generateContent",
	}
	for _, id := range BuiltinPlatforms {
		p, ok := Find(platforms, "id", id)
		if !ok {
			t.Fatalf("/platforms lacks built-in platform %s: %v", id, PlatformIDs(admin.OK(t, http.MethodGet, "/platforms", nil)))
		}
		if !p.Get("builtin").Bool() || p.Get("plugin_key").String() != "" || p.Get("label.en").String() == "" {
			t.Fatalf("platform %s: builtin/plugin_key/label: %s", id, p.Raw)
		}
		eps := p.Get("endpoints").Array()
		if len(eps) == 0 {
			t.Fatalf("platform %s has no endpoints: %s", id, p.Raw)
		}
		found := false
		for _, ep := range eps {
			if !strings.HasPrefix(ep.Get("protocol").String(), id+".") || !strings.HasPrefix(ep.Get("path").String(), "/") ||
				ep.Get("method").String() == "" || !slices.Contains([]string{"usage", "free"}, ep.Get("billing").String()) {
				t.Fatalf("platform %s endpoint: %s", id, ep.Raw)
			}
			method, path, _ := strings.Cut(wantEndpoint[id], " ")
			found = found || ep.Get("method").String() == method && strings.Contains(ep.Get("path").String(), path)
		}
		if !found {
			t.Fatalf("platform %s lacks endpoint %s: %s", id, wantEndpoint[id], p.Get("endpoints").Raw)
		}
	}
	// The built-in anthropic plugin's account type serves anthropic.
	anthropic, _ := Find(platforms, "id", "anthropic")
	if _, ok := PlatformAccountType(anthropic, AnthropicPlugin, AnthropicAPIKey); !ok {
		t.Fatalf("/platforms anthropic lacks anthropic/apikey: %s", anthropic.Get("account_types").Raw)
	}

	// 2. A group with only anthropic accounts serves only anthropic.
	tn := e.NewTenant(admin, TenantOpts{})
	if ids := e.GroupPlatforms(admin, tn.GroupID); !slices.Equal(ids, []string{"anthropic"}) {
		t.Fatalf("group platforms = %v, want [anthropic]", ids)
	}
	if ids := e.APIKeyPlatforms(tn.User, tn.KeyID); !slices.Equal(ids, []string{"anthropic"}) {
		t.Fatalf("api key platforms = %v, want [anthropic]", ids)
	}

	// 3. /v1/chat/completions exists (it is built in) but which outcome is
	// correct depends on whether the core registers an
	// openai.chat -> anthropic.messages converter
	// (server/internal/gateway/convert): with one, anthropic/apikey lists the
	// endpoint as convertible and must serve it; without one, nothing in the
	// group can serve it and the answer is 503 in the endpoint's openai error
	// format. Both are asserted below - a skip here would swallow the 503
	// branch the day the first converter lands, and would also mask the
	// assertions this function already made.
	at, ok := FindAccountType(admin.OK(t, http.MethodGet, "/account-types", nil).Array(), AnthropicPlugin, AnthropicAPIKey)
	if !ok {
		t.Fatal("anthropic/apikey not offered")
	}
	convEP, converted := AccountTypeEndpoint(at, http.MethodPost, "/v1/chat/completions")
	m := e.Mock()
	mark := m.Mark(t)
	body := map[string]any{
		"model":    tn.Model,
		"messages": []any{map[string]any{"role": "user", "content": "no openai account"}},
	}
	g := e.Gateway(t, e.BaseURL, "/v1/chat/completions", "", body, map[string]string{"Authorization": "Bearer " + tn.APIKey})
	j := g.JSON()
	keysUsed := KeysUsed(m.Since(t, mark), "")

	if converted {
		// Conversion path: the request is served by an anthropic account and
		// answered in the OpenAI chat-completion shape.
		if g.Status != http.StatusOK {
			t.Fatalf("/v1/chat/completions with a convertible anthropic/apikey (%s): HTTP %d %s (want 200)", convEP.Raw, g.Status, g.Body)
		}
		if j.Get("choices.0.message.role").String() != "assistant" || j.Get("object").String() == "" {
			t.Fatalf("/v1/chat/completions converted response is not in openai shape: %s", g.Body)
		}
		used := false
		for _, k := range keysUsed {
			used = used || tn.AccountKeys()[k]
		}
		if !used {
			t.Fatalf("converted /v1/chat/completions answered 200 without calling any of the tenant's upstream accounts (keys used: %v)", keysUsed)
		}
	} else {
		if g.Status != http.StatusServiceUnavailable {
			t.Fatalf("/v1/chat/completions with only anthropic accounts: HTTP %d %s (want 503, not 404)", g.Status, g.Body)
		}
		// OpenAI error format: {"error": {"message", "type", "code", "param"}},
		// without Anthropic's top-level "type": "error".
		if j.Get("error.code").String() != "no_available_account" || j.Get("error.message").String() == "" ||
			j.Get("error.type").String() == "" || j.Get("type").Exists() {
			t.Fatalf("/v1/chat/completions error body (want openai format, no_available_account): %s", g.Body)
		}
		for _, k := range keysUsed {
			if tn.AccountKeys()[k] {
				t.Fatalf("an upstream was called with account key %s for an unservable endpoint", k)
			}
		}
	}
	// The anthropic endpoint still works for the same key.
	e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "anthropic still served", false), nil)
}
