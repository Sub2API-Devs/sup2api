package e2e

import (
	"fmt"
	"net/http"
	"testing"
	"time"
)

// AC 7: a user creates a key in a group available to them, calls
// /v1/messages (stream and non-stream) successfully, and only accounts of
// that group are scheduled.
func TestAC07_GatewayGroupScheduling(t *testing.T) {
	e := Setup(t)
	e.Pending("gateway (G), a2-resources (groups, keys), b-billing (usage), anthropic plugin")
	admin := e.Admin()
	mine := e.NewTenant(admin, TenantOpts{Accounts: 2})
	other := e.NewTenant(admin, TenantOpts{Accounts: 1})

	// The user only sees the groups granted to them.
	groups := mine.User.OK(t, http.MethodGet, "/me/groups", nil).Array()
	if _, ok := Find(groups, "id", mine.GroupID); !ok {
		t.Fatalf("/me/groups lacks own group: %v", groups)
	}
	if _, ok := Find(groups, "id", other.GroupID); ok {
		t.Fatal("/me/groups exposes another restricted group")
	}
	// Creating a key in a group not available to the user is rejected.
	r := mine.User.API(t, http.MethodPost, "/me/api-keys", map[string]any{"name": e.Name("x"), "group_id": other.GroupID})
	if r.Status != 403 && r.Status != 400 {
		t.Fatalf("key in foreign group: %s", r)
	}

	m := e.Mock()
	mark := m.Mark(t)
	var rids []string
	for i := 0; i < 6; i++ {
		stream := i%2 == 0
		g := e.MustMessages(mine.APIKey, MessagesBody(mine.Model, fmt.Sprintf("hello %d", i), stream), nil)
		if g.Text() == "" {
			t.Fatalf("empty assistant text (stream=%v)", stream)
		}
		if stream {
			// Usage events reach the client unchanged.
			start := g.Events[0].Data.Get("message.usage")
			if start.Get("input_tokens").Int() != MockInputTokens {
				t.Fatalf("message_start usage: %s", start.Raw)
			}
		} else if g.JSON().Get("usage.output_tokens").Int() != MockOutputTokens {
			t.Fatalf("usage: %s", g.Body)
		}
		rids = append(rids, g.RequestID)
	}

	// Only this group's accounts were used upstream, and the client's key
	// was replaced by the account key.
	allowed := mine.AccountKeys()
	used := KeysUsed(m.Since(t, mark), "/v1/messages")
	if len(used) < 6 {
		t.Fatalf("mock saw %d requests, want >= 6", len(used))
	}
	for _, k := range used {
		if k == mine.APIKey {
			t.Fatal("client API key leaked to the upstream")
		}
		if allowed[k] {
			continue
		}
		for _, a := range other.Accounts {
			if a.Key == k {
				t.Fatalf("request scheduled on another group's account %s", k)
			}
		}
	}

	// Usage records point at this group's accounts with the mock usage.
	accIDs := map[int64]bool{}
	for _, a := range mine.Accounts {
		accIDs[a.ID] = true
	}
	for _, rid := range rids {
		u := e.UsageByRequest(admin, mine.User.UserID, rid)
		if u.Get("group_id").Int() != mine.GroupID || !accIDs[u.Get("account_id").Int()] {
			t.Fatalf("usage group/account: %s", u.Raw)
		}
		// platform/protocol are the client endpoint's; plugin_key/account_type
		// the account type's; upstream_protocol what was sent upstream.
		if u.Get("api_key_id").Int() != mine.KeyID || u.Get("platform").String() != "anthropic" ||
			u.Get("protocol").String() != "anthropic.messages" || !u.Get("success").Bool() ||
			u.Get("plugin_key").String() != AnthropicPlugin || u.Get("account_type").String() != AnthropicAPIKey ||
			u.Get("upstream_protocol").String() != "anthropic.messages" {
			t.Fatalf("usage identity: %s", u.Raw)
		}
		if u.Get("input_tokens").Int() != MockInputTokens || u.Get("output_tokens").Int() != MockOutputTokens ||
			u.Get("cache_read_tokens").Int() != MockCacheReadTokens || u.Get("cache_creation_tokens").Int() != MockCacheCreationTokens {
			t.Fatalf("usage tokens: %s", u.Raw)
		}
	}

	// The user sees their own usage only.
	own := mine.User.ListAll(t, "/me/usage")
	if len(own) < len(rids) {
		t.Fatalf("/me/usage has %d rows, want >= %d", len(own), len(rids))
	}
	for _, u := range own {
		if u.Get("user_id").Exists() && u.Get("user_id").Int() != mine.User.UserID {
			t.Fatalf("/me/usage leaks other users: %s", u.Raw)
		}
	}

	// Invalid key -> 401 in Anthropic error format.
	g := e.Messages("sk-s2a-invalid-"+e.RunID, MessagesBody(mine.Model, "x", false), nil)
	if g.Status != 401 || g.JSON().Get("type").String() != "error" {
		t.Fatalf("invalid key: %d %s", g.Status, g.Body)
	}
	// count_tokens (billing=free) works with the same key.
	ct := e.Gateway(t, e.BaseURL, "/v1/messages/count_tokens", mine.APIKey, MessagesBody(mine.Model, "count me", false), nil)
	if ct.Status != 200 || ct.JSON().Get("input_tokens").Int() <= 0 {
		t.Fatalf("count_tokens: %d %s", ct.Status, ct.Body)
	}
}

// Failover: 429 on the first account moves the request to the next one and
// cools the failed account down (ClassifyError of the anthropic plugin).
func TestGatewayFailoverAndCooldown(t *testing.T) {
	e := Setup(t)
	e.Pending("gateway (G), anthropic ClassifyError, a2-resources (cooldown)")
	admin := e.Admin()
	tn := e.NewTenant(admin, TenantOpts{Accounts: 2, Priorities: []int{1, 50}})
	primary, backup := tn.Accounts[0], tn.Accounts[1]
	m := e.Mock()

	m.SetRule(t, MockRule{APIKey: primary.Key, Status: 429, Remaining: 1})
	defer m.ClearRule(t, primary.Key)
	mark := m.Mark(t)
	e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "failover", false), nil)
	used := KeysUsed(m.Since(t, mark), "/v1/messages")
	if len(used) != 2 || used[0] != primary.Key || used[1] != backup.Key {
		t.Fatalf("expected primary(429) then backup, got %v", used)
	}
	acct := admin.OK(t, http.MethodGet, fmt.Sprintf("/accounts/%d", primary.ID), nil)
	if acct.Get("cooldown_until").String() == "" {
		t.Fatalf("primary not cooled down after 429: %s", acct.Raw)
	}
	// While cooling down (retry-after: 2s) new requests go to the backup.
	mark = m.Mark(t)
	e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "during cooldown", false), nil)
	if used = KeysUsed(m.Since(t, mark), "/v1/messages"); len(used) != 1 || used[0] != backup.Key {
		t.Fatalf("during cooldown got %v", used)
	}

	// Once the cooldown is over, 401 fails over and disables the account.
	Eventually(t, 10*time.Second, 500*time.Millisecond, "primary cooldown over", func() bool {
		a := admin.OK(t, http.MethodGet, fmt.Sprintf("/accounts/%d", primary.ID), nil)
		return a.Get("cooldown_until").String() == ""
	})
	m.SetRule(t, MockRule{APIKey: primary.Key, Status: 401, Remaining: 1})
	mark = m.Mark(t)
	e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "auth failure", false), nil)
	if used = KeysUsed(m.Since(t, mark), "/v1/messages"); len(used) != 2 || used[1] != backup.Key {
		t.Fatalf("401 failover got %v", used)
	}
	acct = admin.OK(t, http.MethodGet, fmt.Sprintf("/accounts/%d", primary.ID), nil)
	if acct.Get("status").String() != "disabled" && acct.Get("status").String() != "error" {
		t.Fatalf("primary not disabled after 401: %s", acct.Raw)
	}

	// 400 is returned to the client as is, without failover.
	m.SetRule(t, MockRule{APIKey: backup.Key, Status: 400, Remaining: 1})
	defer m.ClearRule(t, backup.Key)
	g := e.Messages(tn.APIKey, MessagesBody(tn.Model, "bad request", false), nil)
	if g.Status != 400 || g.JSON().Get("error.type").String() != "invalid_request_error" {
		t.Fatalf("400 should be returned as is, got %d %s", g.Status, g.Body)
	}
}

// Sticky sessions: requests with the same metadata.user_id stick to one
// account (default rule claude-code-session of the anthropic plugin).
func TestGatewayStickySession(t *testing.T) {
	e := Setup(t)
	e.Pending("gateway (G) sticky sessions, anthropic stickyRules")
	admin := e.Admin()
	tn := e.NewTenant(admin, TenantOpts{Accounts: 3})
	m := e.Mock()
	for s := 0; s < 3; s++ {
		session := fmt.Sprintf("user_%s_account__session_%d", e.RunID, s)
		mark := m.Mark(t)
		for i := 0; i < 5; i++ {
			e.MustMessages(tn.APIKey, WithSession(MessagesBody(tn.Model, "sticky", i%2 == 0), session), nil)
		}
		used := KeysUsed(m.Since(t, mark), "/v1/messages")
		for _, k := range used[1:] {
			if k != used[0] {
				t.Fatalf("session %s spread over accounts: %v", session, used)
			}
		}
	}
	rules := admin.OK(t, http.MethodGet, "/sticky-rules", nil).Array()
	// The rule ships with the built-in anthropic platform (source "builtin",
	// CONTRACTS §15.5); a plugin-declared one would be "plugin_default".
	r, ok := Find(rules, "name", "claude-code-session")
	if !ok || (r.Get("source").String() != "builtin" && r.Get("source").String() != "plugin_default") {
		t.Fatalf("default sticky rule: %v", rules)
	}
	stats := admin.OK(t, http.MethodGet, "/sticky-rules/stats", nil).Array()
	if len(stats) == 0 {
		t.Fatal("no sticky stats")
	}
}
