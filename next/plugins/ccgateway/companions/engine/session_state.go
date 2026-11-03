package engine

import (
	"container/list"
	"crypto/sha256"
	"encoding/json"
	"net/http"
	"regexp"
	"slices"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// sessionState is what the Worker remembers of one thread of an upstream
// session (features.SessionStateCapability). Claude Code reads the same facts
// off each thread's own transcript: the last assistant message's request-id
// (its billing header's cc_prev_req) and, on the main thread, the last
// prompt's turn position (cc_prompt_index, cc_turn_index). A request whose
// header the CLI writes brings the conversation's messages, not CC's
// transcript; when they continue the answered request, the CLI names that
// request and keeps the turn from going back with these, and reports the
// thread and the turn it used in its response metadata.
type sessionState struct {
	// Thread is mainThread or the subagent's agent ID.
	Thread     string        `json:"thread,omitempty"`
	RequestID  string        `json:"request_id,omitempty"`
	Turn       *turnPosition `json:"turn_position,omitempty"`
	PromptHash string        `json:"prompt_hash,omitempty"`
	// For a request converted to the first-party shape
	// (features.FirstPartyShapeCapability, 2026-11-03): the answer's message
	// ID (read off the answer, answer_observer.go), the prompt ID the
	// thread's header used and a subagent's agent type (both reported by the
	// CLI). Only a CLI with the capability is given them.
	MessageID string `json:"message_id,omitempty"`
	PromptID  string `json:"prompt_id,omitempty"`
	AgentType string `json:"agent_type,omitempty"`
}

// spawnContext is what a subagent's first request is given of the Agent call
// that spawned it (first-party shape): the parent thread's prompt ID and the
// agent type the call asked for.
type spawnContext struct {
	PromptID  string `json:"prompt_id,omitempty"`
	AgentType string `json:"agent_type,omitempty"`
}

// turnPosition is Claude Code's prompt and turn count (native turnPosition).
type turnPosition struct {
	Prompt int `json:"prompt_index"`
	Turn   int `json:"turn_index"`
}

const (
	mainThread = "main"
	// sessionStatesMax bounds the memory. A Worker serves one account and a
	// few requests at a time, so far fewer threads than this are active in a
	// day; the least recently answered goes first.
	sessionStatesMax = 4096
	// sessionStatesIdle forgets a thread that has not been answered for a
	// day. Claude Code keeps the chain for as long as its transcript lives;
	// the Worker keeps it for a conversation resumed the same day, and one
	// resumed later counts from its own history again.
	sessionStatesIdle = 24 * time.Hour
	// maxTurnIndex is Claude Code's own bound on a turn count (native tTt).
	maxTurnIndex = 10_000_000
)

var (
	// upstreamRequestID is the request-id Claude Code accepts as cc_prev_req
	// (the native header's own test); anything else is not kept.
	upstreamRequestID = regexp.MustCompile(`^req_[A-Za-z0-9_-]{1,36}$`)
	promptHashPattern = regexp.MustCompile(`^[0-9a-f]{64}$`)
	// promptIDPattern is a prompt ID Claude Code writes (a UUID).
	promptIDPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

// valid reports whether p is a position Claude Code writes (native $3).
func (p *turnPosition) valid() bool {
	return p != nil && p.Turn >= 1 && p.Turn <= maxTurnIndex && p.Prompt >= 0 && p.Prompt <= p.Turn
}

// sessionThread is the thread a request names: a subagent's request carries
// its agent ID (the main thread's carries none, as Claude Code sends it). A
// request of a subagent or workflow class without one names no thread the
// Worker can tell apart from the others: ok is false.
func sessionThread(h http.Header) (thread string, ok bool) {
	var class, agent string
	for _, field := range features.AgentContextHeaders {
		value := h.Get(field.Header)
		if value == "" || !field.Valid(value) {
			continue
		}
		switch field.Field {
		case "request_class":
			class = value
		case "agent_id":
			agent = value
		}
	}
	if agent != "" {
		return agent, true
	}
	return mainThread, class != "subagent" && class != "workflow"
}

// sessionStates is the Worker's memory, by upstream session and thread. It is
// process memory only: a restart or an eviction makes a thread one the Worker
// has not answered, and its next request counts from its own history, as a
// new conversation's does. A thread with more than one request in flight is
// not used at all, by any of them (Claude Code runs one request of a thread
// at a time, so which answer the conversation goes on with is unknown). The
// zero value is ready to use.
type sessionStates struct {
	mu      sync.Mutex
	order   *list.List // front: most recently answered
	entries map[string]*list.Element
	busy    map[string]*threadClaim // the threads with a request in flight
	now     func() time.Time
}

type sessionEntry struct {
	key   string
	state sessionState
	// history is the answered request's messages: the next request names it
	// only if its own messages continue them.
	history historyDigest
	// spawns are the answer's Agent calls (first-party shape): a subagent
	// whose first prompt is one of them is this thread's.
	spawns []agentSpawn
	at     time.Time
}

// threadClaim is a thread's requests in flight. shared: another request came
// while one was in flight, so none of them moves the thread on.
type threadClaim struct {
	requests int
	shared   bool
}

// historyDigest identifies a request's messages, each in canonical JSON (a
// client that re-encodes a message keeps its digest): Count of them, and
// Digest over their digests in order.
type historyDigest struct {
	count  int
	digest [32]byte
}

// messageHistory is a request's messages as the memory compares them: their
// digests in order (nil when the body has none it can read) and the position
// of the last assistant message (-1: none).
type messageHistory struct {
	digests       [][32]byte
	lastAssistant int
	// prompts are the digests of the first user message's texts (its text
	// blocks, or its string content): a subagent's first prompt is one.
	prompts [][32]byte
}

// readMessages is the body's messageHistory.
func readMessages(body *requestBody) messageHistory {
	none := messageHistory{lastAssistant: -1}
	if body == nil || body.top == nil {
		return none
	}
	var messages []json.RawMessage
	if json.Unmarshal(body.top["messages"], &messages) != nil {
		return none
	}
	out := messageHistory{digests: make([][32]byte, 0, len(messages)), lastAssistant: -1}
	for i, message := range messages {
		var value any
		if json.Unmarshal(message, &value) != nil {
			return none
		}
		object, _ := value.(map[string]any)
		if object["role"] == "assistant" {
			out.lastAssistant = i
		}
		if object["role"] == "user" && out.prompts == nil {
			out.prompts = promptTexts(object["content"])
		}
		canonical, _ := json.Marshal(canonicalMessage(object, value))
		out.digests = append(out.digests, sha256.Sum256(canonical))
	}
	return out
}

// canonicalMessage is a message as the memory compares it: what Claude Code
// changes in a message it sends again is not part of it. CC marks the last
// blocks of a request for the prompt cache and moves the markers on as the
// conversation grows, and writes a message whose one text block lost its
// marker as a string (2.1.316, a third-party client's environment message:
// a block with cache_control first, the bare string on the next request).
// So a content string is its one text block, and cache_control is dropped
// from every block; nothing else changes.
func canonicalMessage(object map[string]any, value any) any {
	if object == nil {
		return value
	}
	out := make(map[string]any, len(object))
	for key, field := range object {
		out[key] = field
	}
	if text, ok := object["content"].(string); ok {
		out["content"] = []any{map[string]any{"type": "text", "text": text}}
	} else if blocks, ok := object["content"].([]any); ok {
		out["content"] = withoutCacheMarkers(blocks)
	}
	return out
}

// withoutCacheMarkers is blocks without their cache_control, a tool result's
// own content blocks included.
func withoutCacheMarkers(blocks []any) []any {
	out := make([]any, len(blocks))
	for i, item := range blocks {
		block, ok := item.(map[string]any)
		if !ok {
			out[i] = item
			continue
		}
		copied := make(map[string]any, len(block))
		for key, field := range block {
			if key == "cache_control" {
				continue
			}
			if nested, ok := field.([]any); ok && key == "content" {
				field = withoutCacheMarkers(nested)
			}
			copied[key] = field
		}
		out[i] = copied
	}
	return out
}

// promptTexts are the digests of a user message's texts.
func promptTexts(content any) [][32]byte {
	out := [][32]byte{}
	switch value := content.(type) {
	case string:
		out = append(out, sha256.Sum256([]byte(value)))
	case []any:
		for _, item := range value {
			block, _ := item.(map[string]any)
			if text, ok := block["text"].(string); ok && block["type"] == "text" {
				out = append(out, sha256.Sum256([]byte(text)))
			}
		}
	}
	return out
}

// all is the digest of every message.
func (m messageHistory) all() historyDigest { return prefix(m.digests, len(m.digests)) }

// prefix is the digest of the first n messages.
func prefix(digests [][32]byte, n int) historyDigest {
	sum := sha256.New()
	for _, digest := range digests[:n] {
		sum.Write(digest[:])
	}
	out := historyDigest{count: n}
	copy(out.digest[:], sum.Sum(nil))
	return out
}

// continuedBy says whether a request with these messages continues the
// answered one so that its last assistant message is that request's answer:
// its messages begin with the answered request's, the next one is an
// assistant message, and no assistant message follows that one. Otherwise
// the remembered request-id would name another answer than the last one.
func (h historyDigest) continuedBy(m messageHistory) bool {
	return h.count > 0 && m.lastAssistant == h.count && prefix(m.digests, h.count) == h
}

func sessionKey(session, thread string) string { return session + "\x00" + thread }

func (s *sessionStates) clock() time.Time {
	if s.now != nil {
		return s.now()
	}
	return time.Now()
}

// latest is what the Worker remembers of the thread and the answered
// request's messages; nil when it has nothing (never answered, idle too long,
// or evicted).
func (s *sessionStates) latest(key string) (*sessionState, historyDigest) {
	s.mu.Lock()
	defer s.mu.Unlock()
	entry := s.entry(key)
	if entry == nil {
		return nil, historyDigest{}
	}
	state := entry.state
	if state.Turn != nil {
		turn := *state.Turn
		state.Turn = &turn
	}
	return &state, entry.history
}

// entry is the thread's live entry (s.mu held), forgetting an idle one.
func (s *sessionStates) entry(key string) *sessionEntry {
	element := s.entries[key]
	if element == nil {
		return nil
	}
	entry := element.Value.(*sessionEntry)
	if s.clock().Sub(entry.at) >= sessionStatesIdle {
		s.order.Remove(element)
		delete(s.entries, key)
		return nil
	}
	return entry
}

// spawned is what the parent thread's last answer says of a subagent whose
// first request has these messages (first-party shape): the Agent call whose
// prompt is one of its first message's texts, with the parent's prompt ID.
// Nothing when the parent has another request in flight (its last answer may
// no longer be the one that spawned it), has no such call, or two calls
// share the prompt with different agent types.
func (s *sessionStates) spawned(parentKey string, messages messageHistory) *spawnContext {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.busy[parentKey] != nil {
		return nil
	}
	entry := s.entry(parentKey)
	if entry == nil {
		return nil
	}
	var found *agentSpawn
	for i := range entry.spawns {
		call := &entry.spawns[i]
		if !slices.Contains(messages.prompts, call.prompt) {
			continue
		}
		if found != nil && found.agentType != call.agentType {
			return nil
		}
		found = call
	}
	if found == nil || entry.state.PromptID == "" && found.agentType == "" {
		return nil
	}
	return &spawnContext{PromptID: entry.state.PromptID, AgentType: found.agentType}
}

// answerFacts are what the Worker read off an answer (answer_observer.go).
type answerFacts struct {
	messageID string
	spawns    []agentSpawn
}

// keptState is what an answer leaves of the thread, whole or not at all: its
// request-id and, on the main thread, the turn the CLI reported with its
// prompt's hash; for a converted request also the prompt ID, a subagent's
// agent type and the answer's message ID, each kept only when Claude Code
// would write it. An answer with a request-id or turn Claude Code would not
// write leaves the thread as it was.
func keptState(requestID string, reported sessionState, facts answerFacts) (sessionState, bool) {
	if !upstreamRequestID.MatchString(requestID) {
		return sessionState{}, false
	}
	state := sessionState{Thread: reported.Thread, RequestID: requestID}
	if answerMessageID.MatchString(facts.messageID) {
		state.MessageID = facts.messageID
	}
	if promptIDPattern.MatchString(reported.PromptID) {
		state.PromptID = reported.PromptID
	}
	if reported.Thread != mainThread {
		if agentTypeName.MatchString(reported.AgentType) {
			state.AgentType = reported.AgentType
		}
		return state, true
	}
	if !reported.Turn.valid() || !promptHashPattern.MatchString(reported.PromptHash) {
		return sessionState{}, false
	}
	turn := *reported.Turn
	state.Turn, state.PromptHash = &turn, reported.PromptHash
	return state, true
}

// answered records a successful answer of the thread with the answered
// request's messages (keptState), unless another request of the thread was
// in flight with it.
func (s *sessionStates) answered(key, requestID string, history historyDigest, reported sessionState) {
	s.answeredWith(key, requestID, history, reported, answerFacts{})
}

// answeredWith is answered with what the Worker read off the answer.
func (s *sessionStates) answeredWith(key, requestID string, history historyDigest, reported sessionState, facts answerFacts) {
	state, ok := keptState(requestID, reported, facts)
	if !ok {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if claim := s.busy[key]; claim != nil && claim.shared {
		return
	}
	if s.entries == nil {
		s.entries, s.order = map[string]*list.Element{}, list.New()
	}
	entry := &sessionEntry{key: key, state: state, history: history, spawns: facts.spawns, at: s.clock()}
	if element := s.entries[key]; element != nil {
		element.Value = entry
		s.order.MoveToFront(element)
	} else {
		s.entries[key] = s.order.PushFront(entry)
	}
	for s.order.Len() > sessionStatesMax {
		oldest := s.order.Back()
		s.order.Remove(oldest)
		delete(s.entries, oldest.Value.(*sessionEntry).key)
	}
}

// enter claims a thread for one request; false when another request of it is
// in flight (the thread is then shared until all of them leave). leave gives
// the claim back.
func (s *sessionStates) enter(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if claim := s.busy[key]; claim != nil {
		claim.requests++
		claim.shared = true
		return false
	}
	if s.busy == nil {
		s.busy = map[string]*threadClaim{}
	}
	s.busy[key] = &threadClaim{requests: 1}
	return true
}

func (s *sessionStates) leave(key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	claim := s.busy[key]
	if claim == nil {
		return
	}
	if claim.requests--; claim.requests <= 0 {
		delete(s.busy, key)
	}
}

// requestSession is one request's place in the memory: the thread it claimed
// (releaseSessionState gives it back) and its messages.
type requestSession struct {
	key, thread string
	messages    messageHistory
	usable      bool // no other request of the thread was in flight
	// kept: the answer was taken (once); left: the claim was given back
	// (once, as soon as the answer was taken).
	kept, left bool
}

// attachSessionState gives the request's identity context what the Worker
// remembers of its thread, for a CLI that uses it, as far as it is this
// conversation's (Claude Code reads both off the conversation's own
// transcript, so a wrong one is worse than none):
//   - only for a session the client names (its metadata.user_id carries one):
//     a session the Worker derives from the conversation's first message is
//     shared by every conversation that opens alike, so a later turn of one
//     would be given another's request and turn;
//   - for a request carrying the client's own billing header only when the
//     request may be converted to the first-party shape (p.shape: the CLI
//     converts a third-party header and uses the memory then, and keeps any
//     other header as it is); otherwise one whose system opens with it is
//     left before its messages are read;
//   - only for a thread the Worker can tell apart, with no other request of
//     it in flight;
//   - only when the request's messages continue the answered request's
//     (historyDigest.continuedBy): a shortened or rewritten history is given
//     nothing, and its turn counts from its own history;
//   - a converted subagent's first request (no answer in its messages yet)
//     is given the Agent call of its parent thread's last answer that
//     spawned it (sessionStates.spawned), when there is exactly one.
//
// Console tests are the gateway's own requests, not a conversation's.
func (g *Gateway) attachSessionState(p *requestPlan, h http.Header, body *requestBody) {
	if p.identity == nil || !p.identity.named || p.identity.Session == "" || p.probe || !g.CLIInfo.supports(features.SessionStateCapability) || !p.shape && body.leadsWithBillingHeader() {
		return
	}
	thread, ok := sessionThread(h)
	if !ok {
		return
	}
	key := sessionKey(p.identity.Session, thread)
	p.session = &requestSession{key: key, thread: thread, messages: readMessages(body), usable: g.sessionStates.enter(key)}
	if p.session.messages.digests == nil {
		p.session.usable = false
	}
	if !p.session.usable {
		return
	}
	if p.shape && thread != mainThread && p.session.messages.lastAssistant < 0 {
		p.identity.Spawn = g.sessionStates.spawned(sessionKey(p.identity.Session, parentThread(h)), p.session.messages)
	}
	state, history := g.sessionStates.latest(key)
	if state == nil || !history.continuedBy(p.session.messages) {
		return
	}
	state.Thread = thread
	if !p.shape {
		// Only a converting CLI is given the first-party shape's facts.
		state.MessageID, state.PromptID, state.AgentType = "", "", ""
	}
	p.identity.Previous = state
}

// parentThread is the thread that spawned a subagent: the agent its request
// names as its parent, else the main thread (Claude Code sends a parent
// agent ID only for a subagent of a subagent).
func parentThread(h http.Header) string {
	for _, field := range features.AgentContextHeaders {
		if field.Field != "parent_agent_id" {
			continue
		}
		if value := h.Get(field.Header); value != "" && field.Valid(value) {
			return value
		}
	}
	return mainThread
}

// rememberSessionState keeps a request answered in full whose header the CLI
// wrote itself (it reports session) for the thread the Worker looked up: the
// CLI uses and reports only the thread it builds, and a request carrying the
// client's header, in any thread, neither reads nor moves the memory. A failed
// request does not move the thread on.
//
// It runs once: when the Worker has read the answer's end (its message_stop,
// answer_observer.go), before the bytes carrying it reach the client, else
// when the CLI has finished. The client sends the conversation's next request
// (a tool result, the first request of the subagent an Agent call spawns) as
// soon as it has the whole answer; the memory and the thread's claim must be
// ready by then, or that request finds the thread busy and is given nothing
// (2026-11-03). The thread is given back at once.
func (g *Gateway) rememberSessionState(p *requestPlan, o *requestCommandOutput) {
	s := p.session
	if s == nil || s.kept || !s.usable || o.session == nil || o.session.Thread != s.thread || o.status < 200 || o.status > 299 {
		return
	}
	s.kept = true
	messageID, spawns := o.observer.facts()
	g.sessionStates.answeredWith(s.key, o.requestID, s.messages.all(), *o.session, answerFacts{messageID: messageID, spawns: spawns})
	g.releaseSessionState(p)
}

// releaseSessionState gives back the thread the request claimed, once.
func (g *Gateway) releaseSessionState(p *requestPlan) {
	if p.session != nil && !p.session.left {
		p.session.left = true
		g.sessionStates.leave(p.session.key)
	}
}
