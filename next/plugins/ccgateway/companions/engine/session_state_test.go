package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

const fixtureHash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

func mainReport(prompt, turn int) sessionState {
	return sessionState{Thread: mainThread, Turn: &turnPosition{Prompt: prompt, Turn: turn}, PromptHash: fixtureHash}
}

func messagesOf(t *testing.T, messages string) messageHistory {
	t.Helper()
	return readMessages(parseRequestBody([]byte(`{"messages":` + messages + `}`)))
}

func TestSessionStatesKeepTheLastAnswerOfEachThread(t *testing.T) {
	var s sessionStates
	main, agent := sessionKey("s1", mainThread), sessionKey("s1", "agent-1")
	state, _ := s.latest(main)
	require.Nil(t, state, "a session the Worker never answered")
	one := messagesOf(t, `[{"role":"user","content":"a"}]`).all()
	s.answered(main, "req_one", one, mainReport(0, 1))
	s.answered(agent, "req_sub", one, sessionState{Thread: "agent-1", Turn: &turnPosition{Turn: 1}, PromptHash: fixtureHash})
	state, history := s.latest(main)
	require.Equal(t, &sessionState{Thread: mainThread, RequestID: "req_one", Turn: &turnPosition{Prompt: 0, Turn: 1}, PromptHash: fixtureHash}, state)
	require.Equal(t, one, history)
	// A subagent thread keeps only its request-id: its header has no turn.
	state, _ = s.latest(agent)
	require.Equal(t, &sessionState{Thread: "agent-1", RequestID: "req_sub"}, state)
	// The next answer moves the main thread on. One the memory cannot keep
	// whole (no usable request-id, or on the main thread no usable turn)
	// leaves it as it was: never a new request-id with an old turn.
	two := messagesOf(t, `[{"role":"user","content":"a"},{"role":"assistant","content":"b"},{"role":"user","content":"c"}]`).all()
	s.answered(main, "req_two", two, mainReport(0, 2))
	s.answered(main, "not-a-request-id", historyDigest{}, mainReport(3, 3))
	s.answered(main, "req_no_turn", historyDigest{}, sessionState{Thread: mainThread})
	s.answered(main, "req_bad_turn", historyDigest{}, sessionState{Thread: mainThread, Turn: &turnPosition{Prompt: 3, Turn: 2}, PromptHash: fixtureHash})
	s.answered(main, "req_bad_hash", historyDigest{}, sessionState{Thread: mainThread, Turn: &turnPosition{Prompt: 0, Turn: 3}, PromptHash: "x"})
	state, history = s.latest(main)
	require.Equal(t, &sessionState{Thread: mainThread, RequestID: "req_two", Turn: &turnPosition{Prompt: 0, Turn: 2}, PromptHash: fixtureHash}, state)
	require.Equal(t, two, history, "the messages go with their request-id")
	// What latest returns is a copy.
	state.Turn.Turn = 99
	state, _ = s.latest(main)
	require.Equal(t, 2, state.Turn.Turn)
	// An answer the memory cannot keep creates no entry.
	s.answered(sessionKey("s2", mainThread), "req_x", historyDigest{}, sessionState{Thread: mainThread})
	s.answered(sessionKey("s2", "agent-2"), "", historyDigest{}, sessionState{Thread: "agent-2"})
	require.Equal(t, 2, s.order.Len())
	require.Len(t, s.entries, 2)
}

func TestSessionStatesForgetIdleAndOldestSessions(t *testing.T) {
	now := time.Unix(1_000_000, 0)
	s := sessionStates{now: func() time.Time { return now }}
	s.answered(sessionKey("idle", mainThread), "req_idle", historyDigest{}, mainReport(0, 1))
	now = now.Add(sessionStatesIdle)
	state, _ := s.latest(sessionKey("idle", mainThread))
	require.Nil(t, state, "an idle session counts from its history again")
	for i := 0; i <= sessionStatesMax; i++ {
		s.answered(sessionKey(fmt.Sprint(i), mainThread), "req_x", historyDigest{}, mainReport(0, 1))
	}
	state, _ = s.latest(sessionKey("0", mainThread))
	require.Nil(t, state, "the least recently answered goes first")
	state, _ = s.latest(sessionKey("1", mainThread))
	require.NotNil(t, state)
	require.Equal(t, sessionStatesMax, s.order.Len())
}

// One request of a thread at a time uses the memory; while another is in
// flight with it, none of them moves the thread on.
func TestSessionStatesClaimOneRequestPerThread(t *testing.T) {
	var s sessionStates
	key := sessionKey("s1", "agent-1")
	require.True(t, s.enter(key))
	s.answered(key, "req_alone", historyDigest{}, sessionState{Thread: "agent-1"})
	require.False(t, s.enter(key), "a second request of the thread in flight")
	s.answered(key, "req_first", historyDigest{}, sessionState{Thread: "agent-1"})
	state, _ := s.latest(key)
	require.Equal(t, "req_alone", state.RequestID, "the first of two requests in flight does not move the thread")
	s.leave(key)
	s.leave(key)
	require.True(t, s.enter(key), "both claims given back")
	s.answered(key, "req_next", historyDigest{}, sessionState{Thread: "agent-1"})
	state, _ = s.latest(key)
	require.Equal(t, "req_next", state.RequestID)
	s.leave(key)
	s.leave(key) // an extra leave is harmless
	require.Empty(t, s.busy)
	// The memory is safe for concurrent requests.
	var wg sync.WaitGroup
	for i := 0; i < 32; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			s.answered(sessionKey("s1", mainThread), fmt.Sprintf("req_%d", i), historyDigest{}, mainReport(0, 1+i))
			_, _ = s.latest(sessionKey("s1", mainThread))
		}(i)
	}
	wg.Wait()
	state, _ = s.latest(sessionKey("s1", mainThread))
	require.NotEmpty(t, state.RequestID)
}

// A request names the answered one only when its last assistant message is
// that request's answer: its messages begin with the answered request's (in
// canonical JSON), the next one is an assistant message, and no assistant
// message follows it.
func TestHistoryDigestContinuedByTheAnswer(t *testing.T) {
	answered := messagesOf(t, `[{"role":"user","content":"a"}]`).all()
	require.True(t, answered.continuedBy(messagesOf(t, `[{"content":"a","role":"user"},{"role":"assistant","content":"b"},{"role":"user","content":"c"}]`)), "re-encoded keys")
	require.True(t, answered.continuedBy(messagesOf(t, `[{"role":"user","content":"a"},{"role":"assistant","content":"b"}]`)), "the answer as the last message (a prefill)")
	require.False(t, answered.continuedBy(messagesOf(t, `[{"role":"user","content":"a"}]`)), "the same messages again: no answer after them")
	require.False(t, answered.continuedBy(messagesOf(t, `[{"role":"user","content":"x"},{"role":"assistant","content":"b"}]`)), "another conversation")
	require.False(t, answered.continuedBy(messagesOf(t, `[{"role":"user","content":"a"},{"role":"user","content":"more"},{"role":"assistant","content":"b"}]`)), "the next message is not the answer")
	require.False(t, answered.continuedBy(messagesOf(t, `[{"role":"user","content":"a"},{"role":"assistant","content":"b"},{"role":"user","content":"c"},{"role":"assistant","content":"d"},{"role":"user","content":"e"}]`)), "a later answer is the last one")
	require.False(t, historyDigest{}.continuedBy(messagesOf(t, `[{"role":"user","content":"a"}]`)))
	unreadable := readMessages(parseRequestBody([]byte(`{"messages":"not a list"}`)))
	require.Nil(t, unreadable.digests)
	require.Equal(t, -1, unreadable.lastAssistant)
}

// A request names the thread it is built as; a subagent's without its agent
// ID names none the Worker can tell apart.
func TestSessionThreadOfARequest(t *testing.T) {
	for _, c := range []struct {
		headers map[string]string
		thread  string
		ok      bool
	}{
		{nil, mainThread, true},
		{map[string]string{"X-Claude-Code-Request-Class": "main"}, mainThread, true},
		{map[string]string{"X-Claude-Code-Request-Class": "compaction"}, mainThread, true},
		{map[string]string{"X-Claude-Code-Agent-Id": "agent-1"}, "agent-1", true},
		{map[string]string{"X-Claude-Code-Request-Class": "subagent", "X-Claude-Code-Agent-Id": "agent-1"}, "agent-1", true},
		{map[string]string{"X-Claude-Code-Request-Class": "subagent"}, mainThread, false},
		{map[string]string{"X-Claude-Code-Request-Class": "workflow"}, mainThread, false},
		{map[string]string{"X-Claude-Code-Request-Class": "subagent", "X-Claude-Code-Agent-Id": "bad id"}, mainThread, false},
	} {
		h := http.Header{}
		for name, value := range c.headers {
			h.Set(name, value)
		}
		thread, ok := sessionThread(h)
		require.Equal(t, c.thread, thread, c.headers)
		require.Equal(t, c.ok, ok, c.headers)
	}
}

func TestRequestBodyLeadsWithBillingHeader(t *testing.T) {
	for system, leads := range map[string]bool{
		`"x-anthropic-billing-header: cc_version=2.1.312.abc;"`:                                                          true,
		`[{"type":"text","text":"x-anthropic-billing-header: cc_version=2.1.312.abc;"},{"type":"text","text":"system"}]`: true,
		`[{"type":"text","text":"system"},{"type":"text","text":"x-anthropic-billing-header: cc_version=2.1.312.abc;"}]`: false,
		`"plain system"`: false,
		`[]`:             false,
		`null`:           false,
		`[{"type":"image","text":"x-anthropic-billing-header: cc_version=2.1.312.abc;"}]`: false,
	} {
		require.Equal(t, leads, parseRequestBody([]byte(`{"system":`+system+`}`)).leadsWithBillingHeader(), system)
	}
	require.False(t, parseRequestBody([]byte(`{}`)).leadsWithBillingHeader())
	require.False(t, parseRequestBody([]byte(`not json`)).leadsWithBillingHeader())
}

// sessionGateway is a build Worker whose CLI keeps session state, and its
// request: answer is the upstream request-id and the session report (JSON)
// the CLI gives, fail makes the answer fail after its first event.
func sessionGateway(t *testing.T) (*Gateway, func(id, report, body string, headers map[string]string, fail bool) (int, requestIdentity)) {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	target := filepath.Join(root, "identity-env.json")
	config := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"account@example.invalid"}}`), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"fixture"}}`), 0600))
	g := &Gateway{RequestMode: "build", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
		CLIInfo: cliRequestInfo{Version: "2.1.312", Capabilities: []string{"request_direct", "request_build", features.RequestIdentityCapability, features.BuildContentPreservationCapability, features.SessionStateCapability}}}
	require.NoError(t, g.configureRequestIdentity(root))
	send := func(id, report, body string, headers map[string]string, fail bool) (int, requestIdentity) {
		frame := ""
		if fail {
			frame = "1"
		}
		g.Runner = &Runner{CLI: exe, Work: root, Env: envWith(os.Environ(), map[string]string{
			"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
			"CCG_TEST_REQUEST_ENV_CAPTURE": target, "CCG_TEST_REQUEST_ANSWER_ID": id, "CCG_TEST_REQUEST_ANSWER_SESSION": report, "CCG_TEST_REQUEST_FRAME": frame,
			"HOME": config, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config,
		}, "CLAUDE_CODE_USER_EMAIL", "ANTHROPIC_API_KEY")}
		request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"fixture",`+body+`}`))
		request.Header.Set("x-api-key", "fixture")
		for name, value := range headers {
			request.Header.Set(name, value)
		}
		response := httptest.NewRecorder()
		func() {
			// An answer failing after its start aborts the response.
			defer func() {
				if fail {
					require.Equal(t, http.ErrAbortHandler, recover())
				}
			}()
			g.ServeHTTP(response, request)
		}()
		data, err := os.ReadFile(target)
		require.NoError(t, err)
		var env map[string]string
		require.NoError(t, json.Unmarshal(data, &env))
		var identity requestIdentity
		require.NoError(t, json.Unmarshal([]byte(env[requestIdentityEnv]), &identity))
		return response.Code, identity
	}
	return g, send
}

func turnReport(turn int) string {
	return fmt.Sprintf(`{"thread":"main","turn_position":{"prompt_index":0,"turn_index":%d},"prompt_hash":"%s"}`, turn, fixtureHash)
}

const (
	namedSession = `"metadata":{"user_id":"{\"device_id\":\"d\",\"session_id\":\"3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8\"}"},`
	sessionTurn1 = `"messages":[{"role":"user","content":"hello"}]`
	sessionTurn2 = `"messages":[{"role":"user","content":"hello"},{"role":"assistant","content":"ok"},{"role":"user","content":"next"}]`
	sessionTurn3 = `"messages":[{"role":"user","content":"hello"},{"role":"assistant","content":"ok"},{"role":"user","content":"next"},{"role":"assistant","content":"ok"},{"role":"user","content":"again"}]`
)

// A conversation through the Worker: the CLI is told what the Worker
// remembers of the session's main thread, as far as it is this conversation's,
// and the Worker keeps what the CLI reports for an answered request whose
// header it wrote; a request carrying the client's header (no report), another
// thread, a console test and a CLI without the capability neither read nor
// move it.
func TestRequestCommandRemembersTheSessionThread(t *testing.T) {
	g, send := sessionGateway(t)
	code, first := send("req_first", turnReport(1), namedSession+sessionTurn1, nil, false)
	require.Equal(t, http.StatusOK, code)
	require.Nil(t, first.Previous, "a session's first request")
	_, second := send("req_second", turnReport(2), namedSession+sessionTurn2, nil, false)
	require.Equal(t, &sessionState{Thread: mainThread, RequestID: "req_first", Turn: &turnPosition{Prompt: 0, Turn: 1}, PromptHash: fixtureHash}, second.Previous)
	require.Equal(t, first.Session, second.Session, "one conversation, one upstream session")
	// A request whose header is the client's reports nothing: the memory stays.
	_, third := send("req_client", "null", namedSession+sessionTurn3, nil, false)
	require.Equal(t, "req_second", third.Previous.RequestID)
	// A report for another thread than the one looked up is not kept.
	_, fourth := send("req_other", `{"thread":"agent-9"}`, namedSession+sessionTurn3, nil, false)
	require.Equal(t, "req_second", fourth.Previous.RequestID)
	// A request whose system opens with the client's billing header is not
	// looked up at all.
	_, billed := send("req_billed", turnReport(3), `"system":[{"type":"text","text":"x-anthropic-billing-header: cc_version=2.1.312.abc;"}],`+namedSession+sessionTurn3, nil, false)
	require.Nil(t, billed.Previous)
	_, after := send("req_after", "null", namedSession+sessionTurn3, nil, false)
	require.Equal(t, "req_second", after.Previous.RequestID, "nor does it move the memory")
	// Messages whose last assistant message is not the answered request's
	// answer are given nothing: neither its request-id nor its turn.
	_, later := send("req_later", "null", namedSession+`"messages":[{"role":"user","content":"hello"},{"role":"assistant","content":"ok"},{"role":"user","content":"next"},{"role":"assistant","content":"ok"},{"role":"user","content":"again"},{"role":"assistant","content":"more"},{"role":"user","content":"go"}]`, nil, false)
	require.Nil(t, later.Previous)
	// A shortened history does not continue the answered messages: nothing,
	// its turn counts from its own history.
	_, short := send("req_short", turnReport(3), namedSession+`"messages":[{"role":"user","content":"again"}]`, nil, false)
	require.Nil(t, short.Previous)
	// A subagent's request is told its own thread's memory, not the main one's.
	_, sub := send("req_sub", `{"thread":"agent-1"}`, namedSession+sessionTurn1, map[string]string{"X-Claude-Code-Agent-Id": "agent-1"}, false)
	require.Nil(t, sub.Previous)
	_, subNext := send("req_sub2", `{"thread":"agent-1"}`, namedSession+sessionTurn2, map[string]string{"X-Claude-Code-Agent-Id": "agent-1"}, false)
	require.Equal(t, &sessionState{Thread: "agent-1", RequestID: "req_sub"}, subNext.Previous)
	// A subagent's request without its agent ID names no thread: it neither
	// reads the main thread's memory nor moves it.
	_, anonymous := send("req_anonymous", turnReport(9), namedSession+`"messages":[{"role":"user","content":"again"},{"role":"assistant","content":"ok"},{"role":"user","content":"x"}]`, map[string]string{"X-Claude-Code-Request-Class": "subagent"}, false)
	require.Nil(t, anonymous.Previous)
	state, _ := g.sessionStates.latest(sessionKey(first.Session, mainThread))
	require.Equal(t, "req_short", state.RequestID)
	// A session derived from the first message is shared by conversations
	// that open alike: it uses no memory at all.
	_, derived := send("req_derived", turnReport(1), sessionTurn1, nil, false)
	require.Nil(t, derived.Previous)
	_, derivedNext := send("req_derived2", turnReport(2), sessionTurn2, nil, false)
	require.Nil(t, derivedNext.Previous)
	// A CLI without the capability is never told (it would refuse the field).
	g.CLIInfo.Capabilities = g.CLIInfo.Capabilities[:len(g.CLIInfo.Capabilities)-1]
	_, older := send("req_older", turnReport(4), namedSession+sessionTurn3, nil, false)
	require.Nil(t, older.Previous)
}

// An answer that fails after its output started does not move the thread on.
func TestRequestCommandAnswerFailingAfterItsStartKeepsTheSessionThread(t *testing.T) {
	g, send := sessionGateway(t)
	_, first := send("req_first", turnReport(1), namedSession+sessionTurn1, nil, false)
	key := sessionKey(first.Session, mainThread)
	before, history := g.sessionStates.latest(key)
	require.Equal(t, "req_first", before.RequestID)
	code, failed := send("req_failed", turnReport(2), namedSession+sessionTurn2, nil, true)
	require.Equal(t, http.StatusOK, code, "the status was already sent")
	require.Equal(t, "req_first", failed.Previous.RequestID)
	after, afterHistory := g.sessionStates.latest(key)
	require.Equal(t, before, after)
	require.Equal(t, history, afterHistory)
	require.Empty(t, g.sessionStates.busy, "the claim is given back")
}

// A request whose upstream answer failed does not move the session on; a
// console test does not use it, and neither does any request of a thread
// (main or subagent) while another of it is in flight.
func TestRequestCommandFailedRequestKeepsTheSessionThread(t *testing.T) {
	g := &Gateway{CLIInfo: cliRequestInfo{Capabilities: []string{features.SessionStateCapability}}}
	one := parseRequestBody([]byte(`{"messages":[{"role":"user","content":"a"}]}`))
	two := parseRequestBody([]byte(`{"messages":[{"role":"user","content":"a"},{"role":"assistant","content":"b"},{"role":"user","content":"c"}]}`))
	plan := func() *requestPlan { return &requestPlan{identity: &requestIdentity{Session: "s1", named: true}} }
	p := plan()
	g.attachSessionState(p, http.Header{}, one)
	ok := mainReport(0, 1)
	g.rememberSessionState(p, &requestCommandOutput{status: 200, requestID: "req_ok", session: &ok})
	failed := mainReport(0, 2)
	g.rememberSessionState(p, &requestCommandOutput{status: 529, requestID: "req_failed", session: &failed})
	g.releaseSessionState(p)
	next := plan()
	g.attachSessionState(next, http.Header{}, two)
	require.Equal(t, "req_ok", next.identity.Previous.RequestID)
	require.Equal(t, 1, next.identity.Previous.Turn.Turn)
	// The main thread with a request in flight: the second is told nothing,
	// and neither moves the thread on.
	concurrent := plan()
	g.attachSessionState(concurrent, http.Header{}, two)
	require.False(t, concurrent.session.usable)
	require.Nil(t, concurrent.identity.Previous)
	report := mainReport(0, 2)
	g.rememberSessionState(next, &requestCommandOutput{status: 200, requestID: "req_next", session: &report})
	g.rememberSessionState(concurrent, &requestCommandOutput{status: 200, requestID: "req_concurrent", session: &report})
	g.releaseSessionState(next)
	g.releaseSessionState(concurrent)
	state, _ := g.sessionStates.latest(sessionKey("s1", mainThread))
	require.Equal(t, "req_ok", state.RequestID)
	probe := &requestPlan{probe: true, identity: &requestIdentity{Session: "s1", named: true}}
	g.attachSessionState(probe, http.Header{}, two)
	require.Nil(t, probe.identity.Previous)
	require.Nil(t, probe.session)
	// The same for a subagent thread.
	h := http.Header{"X-Claude-Code-Agent-Id": {"agent-1"}}
	a, b := plan(), plan()
	g.attachSessionState(a, h, one)
	g.attachSessionState(b, h, one)
	require.True(t, a.session.usable)
	require.False(t, b.session.usable)
	sub := sessionState{Thread: "agent-1"}
	g.rememberSessionState(b, &requestCommandOutput{status: 200, requestID: "req_b", session: &sub})
	g.releaseSessionState(b)
	g.rememberSessionState(a, &requestCommandOutput{status: 200, requestID: "req_a", session: &sub})
	g.releaseSessionState(a)
	c := plan()
	g.attachSessionState(c, h, one)
	require.Nil(t, c.identity.Previous)
	g.rememberSessionState(c, &requestCommandOutput{status: 200, requestID: "req_c", session: &sub})
	g.releaseSessionState(c)
	d := plan()
	g.attachSessionState(d, h, two)
	require.Equal(t, "req_c", d.identity.Previous.RequestID)
	g.releaseSessionState(d)
	require.Empty(t, g.sessionStates.busy)
}
