package engine

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"regexp"
)

// requestAgentEnv carries the client's request context to the CLI: the CC
// headers that say which kind of request this is (main thread, subagent,
// compaction) and which agent and prompt it belongs to, and the key the CLI
// maps their IDs with. The CLI hands the result to Claude Code's own code,
// which writes the headers, the cache lifetime and the billing header's
// subagent field (SUBAGENT-REQUEST-CONTEXT-DESIGN.md).
const requestAgentEnv = "CCG_REQUEST_AGENT"

// clientAgentHeaders are the CC context headers the plugin forwards, with the
// shape each must have. A value of another shape is ignored.
var clientAgentHeaders = []struct {
	name, header string
	valid        *regexp.Regexp
}{
	{"request_class", "X-Claude-Code-Request-Class", regexp.MustCompile(`^[a-z][a-z_]{0,31}$`)},
	{"agent_id", "X-Claude-Code-Agent-Id", regexp.MustCompile(`^[!-~]{1,256}$`)},
	{"parent_agent_id", "X-Claude-Code-Parent-Agent-Id", regexp.MustCompile(`^[!-~]{1,256}$`)},
	{"agent_type", "X-Claude-Code-Agent-Type", regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$`)},
	{"prompt_id", "X-Claude-Code-Prompt-Id", regexp.MustCompile(`^(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)},
	// The previous turn's tool timings, sent on as the client sent them.
	{"prev_tool_durations", "X-Claude-Code-Prev-Tool-Durations", regexp.MustCompile(`^[!-:<>-~]+=[0-9]+(;[!-:<>-~]+=[0-9]+){0,31}$`)},
}

// requestAgent is the CLI's agent context. Map says the IDs go upstream
// mapped (build on an OAuth account); otherwise the client's own values go,
// as direct forwards the body that carries them unchanged. Key is the
// session's mapping key: it maps IDs, and in either mode derives an ID the
// client never sent (a request that is not Claude Code's gets a subagent ID).
type requestAgent struct {
	Version int               `json:"version"`
	Map     bool              `json:"map"`
	Key     string            `json:"key,omitempty"`
	Client  map[string]string `json:"client,omitempty"`
}

// readClientAgentHeaders reads the forwarded CC context headers.
func readClientAgentHeaders(h http.Header) map[string]string {
	out := map[string]string{}
	for _, field := range clientAgentHeaders {
		if value := h.Get(field.header); len(value) <= 4096 && field.valid.MatchString(value) {
			out[field.name] = value
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
func (g *Gateway) resolveRequestAgent(env []string, raw []byte, h http.Header, mode string) (requestAgent, error) {
	result := requestAgent{Version: 1, Client: readClientAgentHeaders(h)}
	fields, _, err := clientIdentityFields(raw)
	if err != nil {
		return result, err
	}
	key, oauth := requestIdentityKey(g.requestIdentitySecret, env)
	if oauth && key == nil && len(g.requestIdentitySecret) > 0 {
		// The login's email is unknown: the Worker's own secret still keeps
		// the IDs private and stable.
		mac := hmac.New(sha256.New, g.requestIdentitySecret)
		_, _ = mac.Write([]byte("ccgateway-agent-context-key-v1"))
		key = mac.Sum(nil)
	}
	if key != nil {
		sum := identityDigest(key, "agent-context", fields["session_id"])
		result.Key = hex.EncodeToString(sum[:])
		result.Map = mode == "build"
	}
	return result, nil
}

func (a requestAgent) env() string {
	raw, _ := json.Marshal(a)
	return string(raw)
}
