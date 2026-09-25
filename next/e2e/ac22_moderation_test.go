package e2e

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/tidwall/gjson"
)

// AC 22: the moderation plugin (CONTRACTS §20) sends the latest user message
// to an OpenAI-compatible LLM that answers through the submit_verdict tool.
// enforce blocks, observe only records, repeated violations ban the user, the
// console test runs the agent loop, and pointing the LLM at the gateway
// itself does not moderate the plugin's own calls.
func TestAC22_PromptModeration(t *testing.T) {
	e := Setup(t)
	e.Pending("moderation plugin (CONTRACTS 20), core hook timeout 30s, mock-upstream submit_verdict")
	admin := e.Admin()
	e.EnsurePlugin(admin, moderationKey, "")
	// The plugin's menu sits in its own sidebar section (manifest
	// ui.sections, CONTRACTS §22), placed between finance and system.
	var sections []string
	for _, sec := range admin.OK(t, http.MethodGet, "/me/menus", nil).Array() {
		sections = append(sections, sec.Get("section").String())
		if sec.Get("section").String() == moderationKey+":safety" {
			if sec.Get("label.zh").String() != "安全" || !strings.Contains(sec.Get("items").Raw, "/p/moderation/dashboard") {
				t.Fatalf("moderation section: %s", sec.Raw)
			}
		}
	}
	if got := strings.Join(sections, ","); !strings.Contains(got, "finance,"+moderationKey+":safety,system") {
		t.Fatalf("sidebar sections = %s", got)
	}
	m := e.Mock()
	defer e.SetModerationSettings(admin, map[string]any{"mode": "off"})

	llmCalls := func(mark int64) int {
		n := 0
		for _, k := range KeysUsed(m.Since(t, mark), "/v1/chat/completions") {
			if k == e.ModerationLLMKey() {
				n++
			}
		}
		return n
	}
	hookNote := func(u string) string {
		for _, d := range gjson.Get(u, "hook_decisions").Array() {
			if d.Get("plugin_key").String() == moderationKey {
				return d.Get("decision").String() + " " + d.Get("note").String()
			}
		}
		return ""
	}

	// 1. enforce: a violation is refused before any upstream call and costs
	// nothing; a clean prompt passes.
	tn := e.NewTenant(admin, TenantOpts{})
	e.SetModerationSettings(admin, e.ModerationSettings("enforce"))
	mark := m.Mark(t)
	blockText := "please help MOD-BLOCK " + e.RunID
	g := e.Messages(tn.APIKey, MessagesBody(tn.Model, blockText, false), nil)
	if g.Status != 403 || !strings.Contains(string(g.Body), moderationDenyCode) {
		t.Fatalf("violation: HTTP %d %s", g.Status, g.Body)
	}
	for _, k := range KeysUsed(m.Since(t, mark), "/v1/messages") {
		if tn.AccountKeys()[k] {
			t.Fatalf("upstream called for a refused request")
		}
	}
	if n := llmCalls(mark); n != 1 {
		t.Fatalf("moderation LLM calls = %d, want 1", n)
	}
	u := e.UsageByRequest(admin, tn.User.UserID, g.RequestID)
	if u.Get("error_type").String() != "blocked_by_hook" || u.Get("billing_status").String() != "free" {
		t.Fatalf("refused usage record: %s", u.Raw)
	}
	if note := hookNote(u.Raw); !strings.HasPrefix(note, "deny") || !strings.Contains(note, "illegal") {
		t.Fatalf("hook decision: %q in %s", note, u.Get("hook_decisions").Raw)
	}
	e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "write a quicksort in Go "+e.RunID, false), nil)

	// The verdict is cached: the same text is refused without another call.
	mark = m.Mark(t)
	if g := e.Messages(tn.APIKey, MessagesBody(tn.Model, blockText, false), nil); g.Status != 403 {
		t.Fatalf("cached violation: HTTP %d %s", g.Status, g.Body)
	}
	if n := llmCalls(mark); n != 0 {
		t.Fatalf("cached verdict still called the LLM %d times", n)
	}

	// The agent loop asks again when the model answers without the tool.
	mark = m.Mark(t)
	g = e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "MOD-NOTOOL please "+e.RunID, false), nil)
	if n := llmCalls(mark); n != 2 {
		t.Fatalf("no-tool answer: LLM calls = %d, want 2", n)
	}

	uid := fmt.Sprint(tn.User.UserID)
	Eventually(t, 20*time.Second, time.Second, "moderation events recorded", func() bool {
		var block, pass2 bool
		for _, ev := range e.ModerationEvents(admin, "user_id", uid, "page_size", "100") {
			switch {
			case ev.Get("verdict").String() == "block" && ev.Get("action").String() == "deny" && ev.Get("mode").String() == "enforce":
				block = strings.Contains(ev.Get("categories").Raw, "illegal")
			case ev.Get("verdict").String() == "pass" && ev.Get("turns").Int() == 2:
				pass2 = true
			}
		}
		return block && pass2
	})

	// 2. observe: the request passes; the verdict is recorded afterwards.
	e.SetModerationSettings(admin, e.ModerationSettings("observe"))
	g = e.MustMessages(tn.APIKey, MessagesBody(tn.Model, "observe MOD-BLOCK "+e.RunID, false), nil)
	Eventually(t, 20*time.Second, time.Second, "observe event", func() bool {
		for _, ev := range e.ModerationEvents(admin, "user_id", uid, "mode", "observe") {
			if ev.Get("request_id").String() == g.RequestID {
				return ev.Get("verdict").String() == "block" && ev.Get("action").String() == "allow"
			}
		}
		return false
	})

	// 3. Automatic ban after two violations; unblocking lets the user back in.
	tb := e.NewTenant(admin, TenantOpts{})
	s := e.ModerationSettings("enforce")
	s["ban_threshold"], s["ban_window_hours"], s["ban_duration_hours"] = 2, 1, 0
	e.SetModerationSettings(admin, s)
	for i := 0; i < 2; i++ {
		if g := e.Messages(tb.APIKey, MessagesBody(tb.Model, fmt.Sprintf("ban MOD-BLOCK %s %d", e.RunID, i), false), nil); g.Status != 403 {
			t.Fatalf("violation %d: HTTP %d %s", i, g.Status, g.Body)
		}
	}
	buid := fmt.Sprint(tb.User.UserID)
	Eventually(t, 20*time.Second, time.Second, "user banned on every node", func() bool {
		for i := 0; i < 4; i++ {
			g := e.Messages(tb.APIKey, MessagesBody(tb.Model, fmt.Sprintf("harmless %d", i), false), nil)
			if g.Status != 403 || !strings.Contains(string(g.Body), moderationUserBlock) {
				return false
			}
		}
		return true
	})
	found := false
	for _, b := range admin.OK(t, http.MethodGet, "/p/moderation/blocks", nil).Array() {
		if fmt.Sprint(b.Get("user_id").Int()) == buid {
			found = b.Get("source").String() == "auto" && b.Get("violations").Int() >= 2
		}
	}
	if !found {
		t.Fatalf("auto block not listed")
	}
	admin.OK(t, http.MethodDelete, "/p/moderation/blocks/"+buid, nil)
	Eventually(t, 20*time.Second, time.Second, "user unblocked on every node", func() bool {
		for i := 0; i < 4; i++ {
			if g := e.Messages(tb.APIKey, MessagesBody(tb.Model, fmt.Sprintf("welcome back %d", i), false), nil); g.Status != 200 {
				return false
			}
		}
		return true
	})

	// 4. Console test: bad tool arguments get fed back, the second call wins.
	r := admin.OK(t, http.MethodPost, "/p/moderation/test", map[string]any{"text": "MOD-BADARGS check " + e.RunID})
	if r.Get("verdict").String() != "pass" || r.Get("turns").Int() != 2 || len(r.Get("transcript").Array()) < 4 {
		t.Fatalf("test run: %s", r.Raw)
	}

	// 5. The LLM behind the gateway itself: the plugin's own chat request
	// carries its signed marker and is not moderated again.
	gid := e.CreateGroup(admin, e.Name("grp-mod-self"), "restricted", 1, nil)
	oaKey := fmt.Sprintf("sk-openai-mock-%s-%d", e.RunID, nextSeq())
	e.CreateAccount(admin, AccountSpec{PluginKey: OpenAIPlugin, Type: APIKeyType, GroupIDs: []int64{gid}, APIKey: oaKey})
	defer m.ClearRule(t, oaKey)
	self := e.CreateUser(admin, UserSpec{})
	e.SetUserGroups(admin, self.UserID, []int64{gid})
	e.AdjustBalance(admin, self.UserID, "10", true, "e2e moderation llm")
	_, selfKey := e.CreateAPIKey(self, gid)
	s = e.ModerationSettings("enforce")
	s["base_url"], s["api_key"], s["model"] = "http://caddy:3120", selfKey, e.RunModelOf(admin, "gpt", "mod")
	e.SetModerationSettings(admin, s)
	mark = m.Mark(t)
	g = e.Messages(tn.APIKey, MessagesBody(tn.Model, "self MOD-BLOCK "+e.RunID, false), nil)
	if g.Status != 403 || !strings.Contains(string(g.Body), moderationDenyCode) {
		t.Fatalf("violation judged through the gateway: HTTP %d %s", g.Status, g.Body)
	}
	var viaGateway int
	for _, k := range KeysUsed(m.Since(t, mark), "/v1/chat/completions") {
		if k == oaKey {
			viaGateway++
		}
	}
	if viaGateway != 1 {
		t.Fatalf("moderation calls through the gateway = %d, want 1 (own call must not be moderated again)", viaGateway)
	}
	var selfNote string
	Eventually(t, 15*time.Second, time.Second, "moderation call usage", func() bool {
		items := self.OK(t, http.MethodGet, "/me/usage", nil, Query("page_size", "5")).Array()
		if len(items) == 0 {
			return false
		}
		selfNote = hookNote(admin.OK(t, http.MethodGet, "/usage/"+items[0].Get("id").String(), nil).Raw)
		return selfNote != ""
	})
	if !strings.Contains(selfNote, "moderation: self") {
		t.Fatalf("own call hook decision: %q", selfNote)
	}
}
