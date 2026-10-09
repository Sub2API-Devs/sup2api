package engine

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
)

// sessionBranch is one client conversation thread and its native CLI files
// (CONTRACTS §53.12).
//
// The client session S comes from the request's metadata.user_id: its
// session_id, or a digest of an opaque user_id. The branch key (S, agent ID)
// fixes the internal CLI session ID, so one client session keeps one native
// file across turns, rewinds, concurrent requests and caller scopes (the
// scope header still separates message and resource ownership, not
// sessions). A request without a user_id is a new session: a random internal
// ID, a full rebuild, and no index lookup or registration.
//
// Upstream, every request of S (main thread, subagents, auxiliary requests)
// carries the session U, a fixed one-way digest of S that shares nothing with
// the client's identifiers; the main thread's internal CLI session is U
// itself. A request without a session uses its random internal ID as U. A
// client subagent A is sent upstream as the derived A', never as A. The
// client's metadata never reaches the upstream API.
//
// A branch file that reaches its size or branch point limit is sealed; later
// requests of the branch write generation n+1 (fileID). Registered nodes
// record their generation and keep resuming from their own file.
type sessionBranch struct {
	Client        string // S; empty for a new session
	AgentID       string // client x-claude-code-agent-id A; empty for the main thread
	ID            string // internal CLI session ID of generation 0
	Upstream      string // U, the session the upstream API sees
	UpstreamAgent string // A', the subagent ID the upstream API sees; empty for the main thread
	Logical       string // index namespace; empty for a new session
}

// indexed reports whether the branch looks up and registers native nodes.
func (b sessionBranch) indexed() bool { return b.Logical != "" }

// fileID is the internal CLI session ID, and native file name, of a branch
// generation.
func (b sessionBranch) fileID(generation int) string {
	if generation == 0 || !b.indexed() {
		return b.ID
	}
	raw, _ := json.Marshal([]any{"ccgateway-native-v2", b.Client, b.AgentID, generation})
	return digestUUID(sha256.Sum256(raw))
}

// digestUUID formats the first 16 bytes of a SHA-256 sum as a version 4 UUID.
func digestUUID(sum [32]byte) string {
	var b [16]byte
	copy(b[:], sum[:16])
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	s := hex.EncodeToString(b[:])
	return s[:8] + "-" + s[8:12] + "-" + s[12:16] + "-" + s[16:20] + "-" + s[20:]
}

// nativeBranchID is the internal CLI session ID of subagent branch (S, A).
// The parts are JSON-encoded so that no two keys share an input.
func nativeBranchID(session, agent string) string {
	raw, _ := json.Marshal([]string{"ccgateway-native-v2", session, agent})
	return digestUUID(sha256.Sum256(raw))
}

// upstreamSessionID is U: what the upstream API sees as the session of every
// request of client session S. It is a one-way digest, so it never equals or
// reveals the client's session ID.
func upstreamSessionID(session string) string {
	raw, _ := json.Marshal([]string{"ccgateway-upstream-v2", session})
	return digestUUID(sha256.Sum256(raw))
}

// upstreamAgentID is A', the subagent ID the upstream API sees for client
// subagent A of session S: fixed, distinct per A, unrelated to A, and in the
// CLI's own format ("a" and 16 lowercase hex digits, as CLI 2.1.292 sends).
func upstreamAgentID(session, agent string) string {
	raw, _ := json.Marshal([]string{"ccgateway-agent-v2", session, agent})
	sum := sha256.Sum256(raw)
	return "a" + hex.EncodeToString(sum[:8])
}

// metadataUserID is the client's metadata.user_id string, if any. It only
// selects the session; the client's metadata is never sent upstream.
func (r *Request) metadataUserID() string {
	if r.Plan == nil || len(r.Plan.metadata) == 0 {
		return ""
	}
	var metadata struct {
		UserID *string `json:"user_id"`
	}
	if json.Unmarshal(r.Plan.metadata, &metadata) != nil || metadata.UserID == nil {
		return ""
	}
	return *metadata.UserID
}

// clientSessionID derives S from metadata.user_id (§53.12): its session_id
// when it is JSON with a UUID session_id, otherwise a digest UUID of the whole
// string. Without a user_id the request is a new session (""). The legacy
// X-CCGateway-Session-ID header is ignored.
func clientSessionID(r *Request) string {
	userID := r.metadataUserID()
	if userID == "" {
		return ""
	}
	var structured map[string]any
	if json.Unmarshal([]byte(userID), &structured) == nil {
		if id, ok := structured["session_id"].(string); ok && nativeSessionName.MatchString(id) {
			return id
		}
	}
	return digestUUID(sha256.Sum256([]byte("ccgateway-session-v1" + userID)))
}

// clientAgentID is the client's subagent ID: printable ASCII without spaces.
// It only selects the branch; upstream sees upstreamAgentID instead.
func clientAgentID(h http.Header) (string, error) {
	agent := h.Get("X-Claude-Code-Agent-Id")
	if len(agent) > 256 {
		return "", fmt.Errorf("Invalid Claude Code agent ID")
	}
	for i := 0; i < len(agent); i++ {
		if agent[i] <= ' ' || agent[i] > '~' {
			return "", fmt.Errorf("Invalid Claude Code agent ID")
		}
	}
	return agent, nil
}

// newSessionBranch resolves the request's branch. extra namespaces the index
// (helper history, resource identity) without changing the native file.
// Without a session the agent ID is ignored.
func newSessionBranch(r *Request, h http.Header, extra ...[]string) (sessionBranch, error) {
	s := clientSessionID(r)
	b := sessionBranch{Client: s}
	if s == "" {
		b.ID = uuid()
		b.Upstream = b.ID
		return b, nil
	}
	agent, err := clientAgentID(h)
	if err != nil {
		return sessionBranch{}, err
	}
	b.AgentID = agent
	b.Upstream = upstreamSessionID(s)
	b.ID = b.Upstream
	if agent != "" {
		b.ID = nativeBranchID(s, agent)
		b.UpstreamAgent = upstreamAgentID(s, agent)
	}
	b.Logical = digest([]string{"ccgateway-branch-v2", s, agent})
	for _, parts := range extra {
		b.Logical = digest(append([]string{b.Logical}, parts...))
	}
	return b, nil
}
