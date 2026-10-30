package e2e

import (
	"fmt"
	"net/http"
	"time"

	"github.com/tidwall/gjson"
)

// Moderation plugin helpers (CONTRACTS §20, 0.2 per §72):
//   PUT /api/v1/plugins/moderation/settings {"values":{...}} (full replace)
//   /api/v1/p/moderation/{channels,auditors,flows,watchlist,events,blocks,test}

const (
	moderationKey       = "moderation"
	moderationDenyCode  = "moderation_blocked"
	moderationUserBlock = "moderation_user_blocked"
)

// ModerationSettings returns plugin settings for mode. Channels, auditors and
// flows are configured through the plugin routes (ModerationFixture).
func (e *Env) ModerationSettings(mode string) map[string]any {
	return map[string]any{"mode": mode, "record_pass": true}
}

// ModerationLLMKey is the upstream key the moderation plugin sends to the
// mock, so its calls can be told apart from gateway traffic.
func (e *Env) ModerationLLMKey() string { return "sk-mod-mock-" + e.RunID }

// SetModerationSettings stores the moderation settings and waits until every
// node's plugin process runs them (runtime.settings_hash changed and agrees).
func (e *Env) SetModerationSettings(admin *Session, values map[string]any) {
	e.T.Helper()
	hashes := func() []string {
		var out []string
		for _, u := range e.NodeURLs {
			r := e.PluginRoute(admin, u, http.MethodGet, moderationKey, "/overview?range=24h", nil)
			out = append(out, r.Data().Get("runtime.settings_hash").String())
		}
		return out
	}
	before := hashes()
	admin.OK(e.T, http.MethodPut, "/plugins/"+moderationKey+"/settings", map[string]any{"values": values})
	// Settings reach the other nodes' processes through the plugin:events
	// broadcast.
	Eventually(e.T, 30*time.Second, 500*time.Millisecond, "moderation settings on every node", func() bool {
		now := hashes()
		for i, h := range now {
			if h == "" || h != now[0] || (i < len(before) && h == before[i]) {
				return false
			}
		}
		return true
	})
}

// WaitModerationConfig waits until every node runs the same configuration
// version (channels, auditors, flows; config.changed broadcast or the poll).
// The node that served the change reloads before answering, so equal
// versions everywhere mean every node has it.
func (e *Env) WaitModerationConfig(admin *Session) {
	e.T.Helper()
	Eventually(e.T, 30*time.Second, 500*time.Millisecond, "moderation config on every node", func() bool {
		first := int64(-2)
		for _, u := range e.NodeURLs {
			v := e.PluginRoute(admin, u, http.MethodGet, moderationKey, "/overview?range=24h", nil).Data().Get("runtime.config_version").Int()
			if first == -2 {
				first = v
			} else if v != first {
				return false
			}
		}
		return first >= 0
	})
}

// ModerationFixture is the configuration a moderation test creates: an LLM
// channel on mock-upstream, its llm_verdict auditor and a published flow.
type ModerationFixture struct {
	ChannelID, AuditorID, FlowID int64
	cleanup                      []string
}

// NewModerationFixture creates the fixture and binds the flow to groups.
func (e *Env) NewModerationFixture(admin *Session, groups ...int64) *ModerationFixture {
	e.T.Helper()
	f := &ModerationFixture{}
	f.ChannelID = admin.OK(e.T, http.MethodPost, "/p/moderation/channels", map[string]any{
		"type": "llm", "name": e.Name("mod-llm"), "base_url": e.MockInternalURL, "api_key": e.ModerationLLMKey(), "model": "gpt-mod-mock", "timeout_ms": 10000,
	}).Get("id").Int()
	f.AuditorID = admin.OK(e.T, http.MethodPost, "/p/moderation/auditors", map[string]any{
		"name": e.Name("mod-llm"), "type": "llm_verdict", "channel_id": f.ChannelID, "config": map[string]any{"max_turns": 3},
	}).Get("id").Int()
	flow := admin.OK(e.T, http.MethodPost, "/p/moderation/flows", map[string]any{
		"name": e.Name("mod-flow"),
		"draft": map[string]any{"sample_rate": 100, "total_timeout_ms": 20000,
			"stages": []any{map[string]any{"auditors": []int64{f.AuditorID}, "combine": "any"}}},
	})
	f.FlowID = flow.Get("id").Int()
	f.cleanup = []string{fmt.Sprintf("/p/moderation/flows/%d", f.FlowID), fmt.Sprintf("/p/moderation/auditors/%d", f.AuditorID), fmt.Sprintf("/p/moderation/channels/%d", f.ChannelID)}
	f.Bind(e, admin, groups...)
	admin.OK(e.T, http.MethodPost, fmt.Sprintf("/p/moderation/flows/%d/publish", f.FlowID), map[string]any{"expected_version": flow.Get("version").Int()})
	e.WaitModerationConfig(admin)
	return f
}

// Bind replaces the groups of the fixture's flow.
func (f *ModerationFixture) Bind(e *Env, admin *Session, groups ...int64) {
	e.T.Helper()
	admin.OK(e.T, http.MethodPut, fmt.Sprintf("/p/moderation/flows/%d/groups", f.FlowID), map[string]any{"groups": groups, "force": true})
}

// Close deletes what the fixture created (flow, then auditors, then channels).
func (f *ModerationFixture) Close(e *Env, admin *Session) {
	for _, p := range f.cleanup {
		admin.API(e.T, http.MethodDelete, p, nil)
	}
}

// ModerationEvents lists moderation events filtered by query key/values.
func (e *Env) ModerationEvents(admin *Session, kv ...string) []gjson.Result {
	e.T.Helper()
	return admin.OK(e.T, http.MethodGet, "/p/"+moderationKey+"/events", nil, Query(kv...)).Array()
}
