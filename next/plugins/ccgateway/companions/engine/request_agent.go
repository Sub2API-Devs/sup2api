package engine

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"regexp"
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

// clientHeader is one client header the plugin forwards, with the shape it
// must have. A value of another shape is ignored.
type clientHeader struct {
	name, header string
	valid        *regexp.Regexp
}

// clientAgentHeaders are the CC context headers.
var clientAgentHeaders = []clientHeader{
	{"request_class", "X-Claude-Code-Request-Class", regexp.MustCompile(`^[a-z][a-z_]{0,31}$`)},
	{"agent_id", "X-Claude-Code-Agent-Id", regexp.MustCompile(`^[!-~]{1,256}$`)},
	{"parent_agent_id", "X-Claude-Code-Parent-Agent-Id", regexp.MustCompile(`^[!-~]{1,256}$`)},
	{"agent_type", "X-Claude-Code-Agent-Type", regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$`)},
	{"prompt_id", "X-Claude-Code-Prompt-Id", regexp.MustCompile(`^(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)},
	// The previous turn's tool timings, sent on as the client sent them.
	{"prev_tool_durations", "X-Claude-Code-Prev-Tool-Durations", regexp.MustCompile(`^[!-:<>-~]+=[0-9]+(;[!-:<>-~]+=[0-9]+){0,31}$`)},
	// The compaction kind, on the compaction request and on the first request after one.
	{"cc_compaction_request", "X-Cc-Compaction-Request", compactionKind},
	{"claude_code_compaction", "X-Claude-Code-Compaction", compactionKind},
	{"cc_context_compacted", "X-Cc-Context-Compacted", compactionKind},
	{"claude_code_context_compacted", "X-Claude-Code-Context-Compacted", compactionKind},
}

var compactionKind = regexp.MustCompile(`^[a-z][a-z_]{0,31}$`)

// clientUserAgent is the client's own User-Agent, when it is Claude Code's
// (2.1.304 dN: the version, "external", the entrypoint and up to three
// qualifiers: the agent SDK version, the client app, the workload). The CLI
// keeps it on a request that keeps the client's billing header. Only a CLI
// that knows the field gets it (ClientUserAgentCapability): an older one
// refuses an unknown field. Another User-Agent is not a Claude Code client's.
var clientUserAgent = clientHeader{"user_agent", "User-Agent", regexp.MustCompile(`^claude-cli/[0-9]+\.[0-9]+\.[0-9]+ \(external, [a-z][a-z0-9-]{0,31}(, [a-z-]{1,32}/[!-~]{1,64}){0,3}\)$`)}

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

// readClientAgentHeaders reads the forwarded CC context headers, and the
// client's User-Agent when the CLI takes it.
func readClientAgentHeaders(h http.Header, userAgent bool) map[string]string {
	out := map[string]string{}
	fields := clientAgentHeaders
	if userAgent {
		fields = append(slices.Clone(fields), clientUserAgent)
	}
	for _, field := range fields {
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
//
// A metadata.user_id the Worker cannot read is an error; the context is
// still the session-less one, which direct uses (audit C9: the body goes
// upstream as sent, and the upstream judges it).
func (g *Gateway) resolveRequestAgent(env []string, raw []byte, h http.Header, mode string) (requestAgent, error) {
	result := requestAgent{Version: 1, Client: readClientAgentHeaders(h, g.CLIInfo.supports(features.ClientUserAgentCapability))}
	fields, _, unreadable := clientIdentityFields(raw)
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
	return result, unreadable
}

func (a requestAgent) env() string {
	raw, _ := json.Marshal(a)
	return string(raw)
}
