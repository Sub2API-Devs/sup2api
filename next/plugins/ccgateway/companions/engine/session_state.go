package engine

import (
	"container/list"
	"crypto/sha256"
	"encoding/json"
	"net/http"
	"regexp"
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
	at      time.Time
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
		if object, _ := value.(map[string]any); object["role"] == "assistant" {
			out.lastAssistant = i
		}
		canonical, _ := json.Marshal(value)
		out.digests = append(out.digests, sha256.Sum256(canonical))
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
	element := s.entries[key]
	if element == nil {
		return nil, historyDigest{}
	}
	entry := element.Value.(*sessionEntry)
	if s.clock().Sub(entry.at) >= sessionStatesIdle {
		s.order.Remove(element)
		delete(s.entries, key)
		return nil, historyDigest{}
	}
	state := entry.state
	if state.Turn != nil {
		turn := *state.Turn
		state.Turn = &turn
	}
	return &state, entry.history
}

// keptState is what an answer leaves of the thread, whole or not at all: its
// request-id and, on the main thread, the turn the CLI reported with its
// prompt's hash. An answer with a value Claude Code would not write leaves
// the thread as it was.
func keptState(requestID string, reported sessionState) (sessionState, bool) {
	if !upstreamRequestID.MatchString(requestID) {
		return sessionState{}, false
	}
	state := sessionState{Thread: reported.Thread, RequestID: requestID}
	if reported.Thread != mainThread {
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
	state, ok := keptState(requestID, reported)
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
	entry := &sessionEntry{key: key, state: state, history: history, at: s.clock()}
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
}

// attachSessionState gives the request's identity context what the Worker
// remembers of its thread, for a CLI that uses it, as far as it is this
// conversation's (Claude Code reads both off the conversation's own
// transcript, so a wrong one is worse than none):
//   - only for a session the client names (its metadata.user_id carries one):
//     a session the Worker derives from the conversation's first message is
//     shared by every conversation that opens alike, so a later turn of one
//     would be given another's request and turn;
//   - never for a request carrying the client's own billing header (the CLI
//     keeps it): one whose system opens with it is left before its messages
//     are read;
//   - only for a thread the Worker can tell apart, with no other request of
//     it in flight;
//   - only when the request's messages continue the answered request's
//     (historyDigest.continuedBy): a shortened or rewritten history is given
//     nothing, and its turn counts from its own history.
//
// Console tests are the gateway's own requests, not a conversation's.
func (g *Gateway) attachSessionState(p *requestPlan, h http.Header, body *requestBody) {
	if p.identity == nil || !p.identity.named || p.identity.Session == "" || p.probe || !g.CLIInfo.supports(features.SessionStateCapability) || body.leadsWithBillingHeader() {
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
	state, history := g.sessionStates.latest(key)
	if state == nil || !history.continuedBy(p.session.messages) {
		return
	}
	state.Thread = thread
	p.identity.Previous = state
}

// rememberSessionState keeps a request answered in full whose header the CLI
// wrote itself (it reports session) for the thread the Worker looked up: the
// CLI uses and reports only the thread it builds, and a request carrying the
// client's header, in any thread, neither reads nor moves the memory. A failed
// request does not move the thread on.
func (g *Gateway) rememberSessionState(p *requestPlan, o *requestCommandOutput) {
	s := p.session
	if s == nil || !s.usable || o.session == nil || o.session.Thread != s.thread || o.status < 200 || o.status > 299 {
		return
	}
	g.sessionStates.answered(s.key, o.requestID, s.messages.all(), *o.session)
}

// releaseSessionState gives back the thread the request claimed.
func (g *Gateway) releaseSessionState(p *requestPlan) {
	if p.session != nil {
		g.sessionStates.leave(p.session.key)
	}
}
