package engine

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// sessionStore is where the Worker keeps what it remembers of each upstream
// session (SESSION-MEMORY-TOOLS-USED-DESIGN.md §4.1): each thread's state and
// the session's tools-used set. Every call is bounded (storeOpTimeout) and
// never fails a request: an error is "nothing remembered". Each call names the
// lifetime of what it reads or writes (the request's
// features.SessionMemoryPolicy): a write keeps it that long, a read of a
// session's tools renews it, a read of a thread only uses it for a local copy.
//
// The threads' claims (sessionStates.enter/leave) are not here: they are the
// requests in flight of this one Worker process, which a restart ends anyway.
type sessionStore interface {
	// loadThread is the thread's state; nil, nil when there is none.
	loadThread(ctx context.Context, session, thread string, ttl time.Duration) (*sessionEntry, error)
	saveThread(ctx context.Context, session, thread string, e *sessionEntry, ttl time.Duration) error
	// loadTools is the session's tools-used set in first-use order; nil, nil
	// when there is none.
	loadTools(ctx context.Context, session string, ttl time.Duration) ([]string, error)
	// mergeTools appends the names the set does not have yet, in order.
	mergeTools(ctx context.Context, session string, names []string, ttl time.Duration) error
	// close ends the store's background work (fallbackStore's writes).
	close()
}

const (
	// storeOpTimeout bounds one store operation (§4.2).
	storeOpTimeout = 30 * time.Millisecond
	// storeReadBudget bounds all of a request's reads together: they run at
	// once (sessionStates.read).
	storeReadBudget = 60 * time.Millisecond
	// storeValueMax bounds one stored value, a thread's or a session's tools
	// (§5.2): a larger one is not written.
	storeValueMax = 16 << 10
	// toolsUsedMax bounds a session's set (§5.2), and the memory handed to the
	// CLI (§4.6).
	toolsUsedMax = 256
	// threadRecordVersion is the stored form's version; a value of another
	// version is no memory (§5.2).
	threadRecordVersion = 1
)

var (
	// errStoreValueTooLarge: the value was not written (storeValueMax). It is
	// not a failure of the store.
	errStoreValueTooLarge = errors.New("session memory value too large")
	// errStoreUnavailable: the store was not asked (its breaker is open).
	errStoreUnavailable = errors.New("session memory store unavailable")
)

func ttlSeconds(seconds int) time.Duration { return time.Duration(seconds) * time.Second }

// memoryTTLs are the request's lifetimes of a thread's state and of a
// session's tools (the defaults when the policy names none).
func memoryTTLs(p *features.SessionMemoryPolicy) (thread, tools time.Duration) {
	return ttlSeconds(p.ThreadTTL()), ttlSeconds(p.ToolsTTL())
}

// storeDigest is how an ID appears in a store key: the first 32 hex digits of
// its SHA-256 (§4.5), so no character or length of it reaches the key.
func storeDigest(id string) string {
	sum := sha256.Sum256([]byte(id))
	return hex.EncodeToString(sum[:16])
}

// threadRecord is a thread's stored form (§5.2): IDs, digests and names only,
// never a message's content.
type threadRecord struct {
	V       int            `json:"v"`
	State   sessionState   `json:"state"`
	History *historyRecord `json:"history,omitempty"`
	Spawns  []spawnRecord  `json:"spawns,omitempty"`
	Answers []answerJSON   `json:"answers,omitempty"`
	At      time.Time      `json:"at"`
}

// answerJSON is an answerRecord (a later field of version 1: a record
// without it has no answers).
type answerJSON struct {
	Key       string `json:"key"`
	RequestID string `json:"request_id"`
	MessageID string `json:"message_id,omitempty"`
}

type historyRecord struct {
	Count  int    `json:"count"`
	Digest string `json:"digest"`
}

type spawnRecord struct {
	Prompt    string `json:"prompt"`
	AgentType string `json:"agent_type,omitempty"`
}

// encodeThread is e's stored form, or errStoreValueTooLarge.
func encodeThread(e *sessionEntry) ([]byte, error) {
	record := threadRecord{V: threadRecordVersion, State: e.state, At: e.at.UTC(), History: &historyRecord{Count: e.history.count, Digest: hex.EncodeToString(e.history.digest[:])}}
	for _, spawn := range e.spawns {
		record.Spawns = append(record.Spawns, spawnRecord{Prompt: hex.EncodeToString(spawn.prompt[:]), AgentType: spawn.agentType})
	}
	for _, answer := range e.answers {
		record.Answers = append(record.Answers, answerJSON{Key: hex.EncodeToString(answer.key[:]), RequestID: answer.requestID, MessageID: answer.messageID})
	}
	raw, err := json.Marshal(record)
	if err != nil {
		return nil, err
	}
	if len(raw) > storeValueMax {
		return nil, errStoreValueTooLarge
	}
	return raw, nil
}

// decodeThread is the entry a stored value describes; nil for a value of
// another version or one it cannot read (no memory, never an error: §5.2).
// What it keeps passes the same tests as an answer's (keptState).
func decodeThread(raw []byte) *sessionEntry {
	var record threadRecord
	if len(raw) > storeValueMax || json.Unmarshal(raw, &record) != nil || record.V != threadRecordVersion {
		return nil
	}
	state := record.State
	if !upstreamRequestID.MatchString(state.RequestID) || state.Thread == "" {
		return nil
	}
	if state.Turn != nil && !state.Turn.valid() || state.PromptHash != "" && !promptHashPattern.MatchString(state.PromptHash) {
		return nil
	}
	if state.MessageID != "" && !answerMessageID.MatchString(state.MessageID) || state.PromptID != "" && !promptIDPattern.MatchString(state.PromptID) || state.AgentType != "" && !agentTypeName.MatchString(state.AgentType) {
		return nil
	}
	entry := &sessionEntry{state: state, at: record.At}
	if record.History != nil {
		digest, err := hex.DecodeString(record.History.Digest)
		if err != nil || len(digest) != 32 || record.History.Count < 0 {
			return nil
		}
		entry.history.count = record.History.Count
		copy(entry.history.digest[:], digest)
	}
	if len(record.Spawns) > agentSpawnsMax {
		return nil
	}
	for _, spawn := range record.Spawns {
		prompt, err := hex.DecodeString(spawn.Prompt)
		if err != nil || len(prompt) != 32 || spawn.AgentType != "" && !agentTypeName.MatchString(spawn.AgentType) {
			return nil
		}
		call := agentSpawn{agentType: spawn.AgentType}
		copy(call.prompt[:], prompt)
		entry.spawns = append(entry.spawns, call)
	}
	if len(record.Answers) > answersMax {
		return nil
	}
	for _, answer := range record.Answers {
		key, err := hex.DecodeString(answer.Key)
		if err != nil || len(key) != 32 || !upstreamRequestID.MatchString(answer.RequestID) || answer.MessageID != "" && !answerMessageID.MatchString(answer.MessageID) {
			return nil
		}
		kept := answerRecord{requestID: answer.RequestID, messageID: answer.MessageID}
		copy(kept.key[:], key)
		entry.answers = append(entry.answers, kept)
	}
	return entry
}

// validToolName is a name a session's set keeps: one Claude Code keeps
// (features.ToolNamePattern), or its stand-in for one it cannot.
func validToolName(name string) bool {
	return name == features.ToolsUsedUnreadable || features.ToolNamePattern.MatchString(name)
}

// toolNames are names as a set keeps them: an unreadable one becomes the
// stand-in, each appears once, in order, and at most toolsUsedMax.
func toolNames(names []string) []string {
	out := make([]string, 0, min(len(names), toolsUsedMax))
	seen := make(map[string]bool, len(names))
	for _, name := range names {
		if !validToolName(name) {
			name = features.ToolsUsedUnreadable
		}
		if seen[name] || len(out) >= toolsUsedMax {
			continue
		}
		seen[name] = true
		out = append(out, name)
	}
	return out
}

// toolsEncodedSize is the size of names as a JSON array (names never need
// escaping: features.ToolNamePattern).
func toolsEncodedSize(names []string) int {
	size := 2
	for i, name := range names {
		size += len(name) + 2
		if i > 0 {
			size++
		}
	}
	return size
}

// mergeToolNames is current with each of names it does not have appended, in
// order, as long as the set stays within toolsUsedMax and storeValueMax (the
// same rule as the Valkey script, toolsMergeScript). changed reports whether
// anything was appended.
func mergeToolNames(current, names []string) (out []string, changed bool) {
	out = append(make([]string, 0, len(current)+len(names)), current...)
	seen := make(map[string]bool, len(out)+len(names))
	size := 2
	for _, name := range out {
		seen[name] = true
		size += len(name) + 3
	}
	for _, name := range names {
		if seen[name] || len(out) >= toolsUsedMax || size+len(name)+3 > storeValueMax {
			continue
		}
		seen[name] = true
		size += len(name) + 3
		out = append(out, name)
		changed = true
	}
	return out, changed
}

// storeReportKey carries the request's diagnostic to the store, which reports
// what it did there (the request log's events only, never the Worker's own
// log: §4.2).
type storeReportKey struct{}

func withStoreReport(ctx context.Context, d *requestDiagnostic) context.Context {
	if d == nil {
		return ctx
	}
	return context.WithValue(ctx, storeReportKey{}, d)
}

// reportStore records one store operation as a session_store event.
func reportStore(ctx context.Context, backend, op string, started time.Time, err error) {
	d, _ := ctx.Value(storeReportKey{}).(*requestDiagnostic)
	if d == nil {
		return
	}
	detail := Object{"backend": backend, "op": op, "ms": time.Since(started).Milliseconds()}
	if err != nil {
		detail["error"] = err.Error()
	}
	d.trace("session_store", detail)
}
