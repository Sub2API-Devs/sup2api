package features

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
