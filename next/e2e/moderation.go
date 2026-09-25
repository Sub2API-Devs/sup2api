package e2e

import (
	"net/http"
	"time"

	"github.com/tidwall/gjson"
)

// Moderation plugin helpers (CONTRACTS §20):
//   PUT /api/v1/plugins/moderation/settings {"values":{...}} (full replace)
//   GET /api/v1/p/moderation/events?user_id=&verdict=  {"data":[...],"pagination":{...}}
//   GET/POST /api/v1/p/moderation/blocks, DELETE /blocks/:user_id
//   POST /api/v1/p/moderation/test {"text"}

const (
	moderationKey       = "moderation"
	moderationDenyCode  = "moderation_blocked"
	moderationUserBlock = "moderation_user_blocked"
)

// ModerationSettings returns settings pointing the moderation LLM at
// mock-upstream (tool calls simulated per CONTRACTS §20.9).
func (e *Env) ModerationSettings(mode string) map[string]any {
	return map[string]any{
		"mode":        mode,
		"base_url":    e.MockInternalURL,
		"api_key":     e.ModerationLLMKey(),
		"model":       "gpt-mod-mock",
		"record_pass": true,
		"max_turns":   3,
		"timeout_ms":  10000,
	}
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

// ModerationEvents lists moderation events filtered by query key/values.
func (e *Env) ModerationEvents(admin *Session, kv ...string) []gjson.Result {
	e.T.Helper()
	return admin.OK(e.T, http.MethodGet, "/p/"+moderationKey+"/events", nil, Query(kv...)).Array()
}
