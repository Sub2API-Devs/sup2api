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
// header the CLI writes may bring a shortened history or none; the CLI names
// the request and keeps the turn from going back with these, and reports the
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
// its agent ID (the main thread's carries none, as Claude Code sends it).
func sessionThread(h http.Header) string {
	for _, field := range features.AgentContextHeaders {
		if field.Field == "agent_id" {
			if value := h.Get(field.Header); value != "" && field.Valid(value) {
				return value
			}
		}
	}
	return mainThread
}

// sessionStates is the Worker's memory, by upstream session and thread. It is
// process memory only: a restart or an eviction makes a thread one the Worker
// has not answered, and its next request counts from its own history, as a
// new conversation's does. Concurrent requests of the main thread overwrite it
// in the order they finish; a subagent thread with a request already in
// flight is not used at all (Claude Code runs one request of a subagent at a
// time, so which one comes next is unknown). The zero value is ready to use.
type sessionStates struct {
	mu      sync.Mutex
	order   *list.List // front: most recently answered
	entries map[string]*list.Element
	busy    map[string]int // requests in flight per subagent thread
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

// historyDigest identifies a request's messages, each in canonical JSON (a
// client that re-encodes a message keeps its digest): Count of them, and
// Digest over their digests in order.
type historyDigest struct {
	count  int
	digest [32]byte
}

// messageDigests are the digests of a body's messages, in order; nil when it
// has none it can read.
func messageDigests(body *requestBody) [][32]byte {
	if body == nil || body.top == nil {
		return nil
	}
	var messages []json.RawMessage
	if json.Unmarshal(body.top["messages"], &messages) != nil {
		return nil
	}
	out := make([][32]byte, 0, len(messages))
	for _, message := range messages {
		var value any
		if json.Unmarshal(message, &value) != nil {
			return nil
		}
		canonical, _ := json.Marshal(value)
		out = append(out, sha256.Sum256(canonical))
	}
	return out
}

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

// continues says whether a request with these messages continues the
// answered one: its messages begin with the answered request's and go on past
// them (at least its answer).
func (h historyDigest) continues(digests [][32]byte) bool {
	return h.count > 0 && len(digests) > h.count && prefix(digests, h.count) == h
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

// answered records a successful answer of the thread: its request-id, the
// answered request's messages and, on the main thread, the turn the CLI
// reported. A value Claude Code would not write is not kept (an answer
// without a request-id leaves the earlier one, as CC's own lookup skips such a
// message).
func (s *sessionStates) answered(key, requestID string, history historyDigest, reported sessionState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.entries == nil {
		s.entries, s.order = map[string]*list.Element{}, list.New()
	}
	element := s.entries[key]
	if element == nil {
		element = s.order.PushFront(&sessionEntry{key: key, state: sessionState{Thread: reported.Thread}})
		s.entries[key] = element
	} else {
		s.order.MoveToFront(element)
	}
	entry := element.Value.(*sessionEntry)
	entry.at = s.clock()
	if upstreamRequestID.MatchString(requestID) {
		entry.state.RequestID, entry.history = requestID, history
	}
	if reported.Thread == mainThread && reported.Turn.valid() && promptHashPattern.MatchString(reported.PromptHash) {
		turn := *reported.Turn
		entry.state.Turn, entry.state.PromptHash = &turn, reported.PromptHash
	}
	for s.order.Len() > sessionStatesMax {
		oldest := s.order.Back()
		s.order.Remove(oldest)
		delete(s.entries, oldest.Value.(*sessionEntry).key)
	}
}

// enter claims a subagent thread for one request; false when another request
// of it is in flight. leave gives the claim back.
func (s *sessionStates) enter(key string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.busy == nil {
		s.busy = map[string]int{}
	}
	if s.busy[key] > 0 {
		s.busy[key]++
		return false
	}
	s.busy[key] = 1
	return true
}

func (s *sessionStates) leave(key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.busy[key]--; s.busy[key] <= 0 {
		delete(s.busy, key)
	}
}

// requestSession is one request's place in the memory: its key and thread,
// its messages, and whether it claimed a subagent thread (claimed: leave it
// when done).
type requestSession struct {
	key, thread string
	messages    [][32]byte
	claimed     bool
	usable      bool // no other request of a subagent thread was in flight
}

// attachSessionState gives the request's identity context what the Worker
// remembers of its thread, for a CLI that uses it, as far as it is this
// conversation's (Claude Code reads both off the conversation's own
// transcript, so a wrong one is worse than none):
//   - only for a session the client names (its metadata.user_id carries one):
//     a session the Worker derives from the conversation's first message is
//     shared by every conversation that opens alike, so a later turn of one
//     would be given another's request and turn;
//   - the request-id only when the request's messages continue the answered
//     request's (a shortened or rewritten history names none).
//
// Console tests are the gateway's own requests, not a conversation's.
func (g *Gateway) attachSessionState(p *requestPlan, h http.Header, body *requestBody) {
	if p.identity == nil || !p.identity.named || p.identity.Session == "" || p.probe || !g.CLIInfo.supports(features.SessionStateCapability) {
		return
	}
	thread := sessionThread(h)
	p.session = &requestSession{key: sessionKey(p.identity.Session, thread), thread: thread, messages: messageDigests(body), usable: true}
	if thread != mainThread {
		p.session.claimed = true
		p.session.usable = g.sessionStates.enter(p.session.key)
	}
	if !p.session.usable || p.session.messages == nil {
		p.session.usable = false
		return
	}
	state, history := g.sessionStates.latest(p.session.key)
	if state == nil {
		return
	}
	state.Thread = thread
	if !history.continues(p.session.messages) {
		state.RequestID = ""
	}
	if state.RequestID != "" || state.Turn != nil {
		p.identity.Previous = state
	}
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
	g.sessionStates.answered(s.key, o.requestID, prefix(s.messages, len(s.messages)), *o.session)
}

// releaseSessionState gives back a subagent thread the request claimed.
func (g *Gateway) releaseSessionState(p *requestPlan) {
	if p.session != nil && p.session.claimed {
		g.sessionStates.leave(p.session.key)
	}
}
