package features

import "regexp"

// RequestAgentContextCapability: the CLI builds each request as the kind the
// client sent (main thread, subagent, compaction) from the Worker's agent
// context: Claude Code's own code then writes the request-class, agent and
// prompt headers, the cache lifetime and the billing header's subagent field.
// Request IDs reach upstream mapped with the account key, keeping every
// equality the client's requests had (2026-10-22).
const RequestAgentContextCapability = "request_agent_context_v1"

// ClientUserAgentCapability: the agent context also carries the client's own
// Claude Code User-Agent, and the CLI names the request's entrypoint the way
// Claude Code does, once for the billing header and the User-Agent alike: a
// request that keeps the client's header keeps its User-Agent, any other
// gets the native one for the entrypoint its header carries (2026-10-23,
// audit D1).
const ClientUserAgentCapability = "client_user_agent_v1"

// AgentHeader is one client header of Claude Code's request context: the
// plugin forwards it to the Worker, and the Worker hands it to its CLI as the
// agent context's Field. A value of another shape is dropped on both sides.
type AgentHeader struct {
	Field   string
	Header  string // canonical HTTP form; the plugin host passes it lowercase
	Pattern *regexp.Regexp
}

// MaxAgentHeaderBytes bounds one context header's value.
const MaxAgentHeaderBytes = 4096

// Valid says whether value has the header's shape.
func (h AgentHeader) Valid(value string) bool {
	return len(value) <= MaxAgentHeaderBytes && h.Pattern.MatchString(value)
}

var compactionKind = regexp.MustCompile(`^[a-z][a-z_]{0,31}$`)

// AgentContextHeaders are the CC context headers (2.1.304): the request
// class, the agent and prompt IDs, the previous turn's tool timings and the
// compaction kind.
var AgentContextHeaders = []AgentHeader{
	{"request_class", "X-Claude-Code-Request-Class", regexp.MustCompile(`^[a-z][a-z_]{0,31}$`)},
	{"agent_id", "X-Claude-Code-Agent-Id", regexp.MustCompile(`^[!-~]{1,256}$`)},
	{"parent_agent_id", "X-Claude-Code-Parent-Agent-Id", regexp.MustCompile(`^[!-~]{1,256}$`)},
	{"agent_type", "X-Claude-Code-Agent-Type", regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$`)},
	{"prompt_id", "X-Claude-Code-Prompt-Id", regexp.MustCompile(`^(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)},
	// g4t: up to 32 "tool=ms" entries joined by ";", sent on as the client
	// sent them.
	{"prev_tool_durations", "X-Claude-Code-Prev-Tool-Durations", regexp.MustCompile(`^[!-:<>-~]+=[0-9]+(;[!-:<>-~]+=[0-9]+){0,31}$`)},
	// Zmn2: the compaction kind, on the compaction request and on the first
	// request after one.
	{"cc_compaction_request", "X-Cc-Compaction-Request", compactionKind},
	{"claude_code_compaction", "X-Claude-Code-Compaction", compactionKind},
	{"cc_context_compacted", "X-Cc-Context-Compacted", compactionKind},
	{"claude_code_context_compacted", "X-Claude-Code-Context-Compacted", compactionKind},
}

// ClientUserAgent is the client's own User-Agent, when it is Claude Code's
// (2.1.304 dN: the version, "external", the entrypoint and up to three
// qualifiers: the agent SDK version, the client app, the workload). Only a CLI
// with ClientUserAgentCapability takes it: it keeps it on a request that keeps
// the client's billing header, so the two agree as in Claude Code (audit D1).
var ClientUserAgent = AgentHeader{"user_agent", "User-Agent", regexp.MustCompile(`^claude-cli/[0-9]+\.[0-9]+\.[0-9]+ \(external, [a-z][a-z0-9-]{0,31}(, [a-z-]{1,32}/[!-~]{1,64}){0,3}\)$`)}

// RequestIDPattern is the shape of a request ID the Worker names a request's
// log by: the core's, which the plugin passes as X-Request-ID, or a query's.
var RequestIDPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,128}$`)
