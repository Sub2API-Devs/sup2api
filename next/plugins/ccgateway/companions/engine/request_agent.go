package engine

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// requestAgentEnv carries the client's request context to the CLI: the CC
// headers that say which kind of request this is (main thread, subagent,
// compaction) and which agent and prompt it belongs to, and the key the CLI
// maps their IDs with. The CLI hands the result to Claude Code's own code,
// which writes the headers, the cache lifetime and the billing header's
// subagent field (SUBAGENT-REQUEST-CONTEXT-DESIGN.md).
const requestAgentEnv = "CCG_REQUEST_AGENT"

// requestAgent is the CLI's agent context. Map says the prompt ID goes
// upstream mapped (build on an OAuth account); otherwise the client's own
// value goes, as direct forwards the body that carries it unchanged. Agent IDs
// are always the client's: the conversation names subagents by them. Key is
// the session's mapping key: it maps the prompt ID, and in either mode derives
// an ID the client never sent (a request that is not Claude Code's gets a
// subagent ID).
type requestAgent struct {
	Version int               `json:"version"`
	Map     bool              `json:"map"`
	Key     string            `json:"key,omitempty"`
	Client  map[string]string `json:"client,omitempty"`
}

// readClientAgentHeaders reads the CC context headers the plugin forwards
// (the one table both use), and the client's User-Agent when the CLI takes
// it (ClientUserAgentCapability): an older CLI refuses an unknown field.
func readClientAgentHeaders(h http.Header, userAgent bool) map[string]string {
	out := map[string]string{}
	fields := features.AgentContextHeaders
	if userAgent {
		fields = append(slices.Clone(fields), features.ClientUserAgent)
	}
	for _, field := range fields {
		if value := h.Get(field.Header); field.Valid(value) {
			out[field.Field] = value
		}
	}
	return out
}

// resolveRequestAgent is the agent context of one request. The key is the
// account's mapping key (as for the session) scoped to the client session, so
// one session's IDs keep their equalities: a subagent's ID across its turns,
// a parent ID with that agent's own ID, a prompt ID shared by a main thread
// and its subagents. A session-less request uses the empty session. An
// API-key account has no Claude account to map for: its IDs go unchanged and
// a missing one is derived without a secret.
//
// A metadata.user_id the Worker cannot read (client.err) still gives the
// session-less context, which direct uses (audit C9: the body goes upstream
// as sent, and the upstream judges it); build refuses it.
func (g *Gateway) resolveRequestAgent(env []string, client clientIdentity, h http.Header, mode string) requestAgent {
	result := requestAgent{Version: 1, Client: readClientAgentHeaders(h, g.CLIInfo.supports(features.ClientUserAgentCapability))}
	key, oauth := requestIdentityKey(g.requestIdentitySecret, env)
	if oauth && key == nil && len(g.requestIdentitySecret) > 0 {
		// The login's email is unknown: the Worker's own secret still keeps
		// the IDs private and stable.
		mac := hmac.New(sha256.New, g.requestIdentitySecret)
		_, _ = mac.Write([]byte("ccgateway-agent-context-key-v1"))
		key = mac.Sum(nil)
	}
	if key != nil {
		sum := identityDigest(key, "agent-context", client.fields["session_id"])
		result.Key = hex.EncodeToString(sum[:])
		result.Map = mode == "build"
	}
	return result
}

func (a requestAgent) env() string {
	raw, _ := json.Marshal(a)
	return string(raw)
}
