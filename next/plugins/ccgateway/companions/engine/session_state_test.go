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

func digestsOf(t *testing.T, messages string) [][32]byte {
	t.Helper()
	return messageDigests(parseRequestBody([]byte(`{"messages":` + messages + `}`)))
}

func TestSessionStatesKeepTheLastAnswerOfEachThread(t *testing.T) {
	var s sessionStates
	main, agent := sessionKey("s1", mainThread), sessionKey("s1", "agent-1")
	state, _ := s.latest(main)
	require.Nil(t, state, "a session the Worker never answered")
	one := prefix(digestsOf(t, `[{"role":"user","content":"a"}]`), 1)
	s.answered(main, "req_one", one, mainReport(0, 1))
	s.answered(agent, "req_sub", one, sessionState{Thread: "agent-1", Turn: &turnPosition{Turn: 1}, PromptHash: fixtureHash})
	state, history := s.latest(main)
	require.Equal(t, &sessionState{Thread: mainThread, RequestID: "req_one", Turn: &turnPosition{Prompt: 0, Turn: 1}, PromptHash: fixtureHash}, state)
	require.Equal(t, one, history)
	// A subagent thread keeps only its request-id: its header has no turn.
	state, _ = s.latest(agent)
	require.Equal(t, &sessionState{Thread: "agent-1", RequestID: "req_sub"}, state)
	// The next answer moves the main thread on; one without a usable
	// request-id or turn keeps the earlier ones (CC skips such a message).
	s.answered(main, "req_two", one, mainReport(0, 2))
	s.answered(main, "not-a-request-id", historyDigest{}, sessionState{Thread: mainThread, Turn: &turnPosition{Prompt: 3, Turn: 2}, PromptHash: fixtureHash})
	state, history = s.latest(main)
	require.Equal(t, "req_two", state.RequestID)
	require.Equal(t, one, history, "the messages go with their request-id")
	require.Equal(t, &turnPosition{Prompt: 0, Turn: 2}, state.Turn)
	// What latest returns is a copy.
	state.Turn.Turn = 99
	state, _ = s.latest(main)
	require.Equal(t, 2, state.Turn.Turn)
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

func TestSessionStatesClaimOneRequestPerSubagentThread(t *testing.T) {
	var s sessionStates
	key := sessionKey("s1", "agent-1")
	require.True(t, s.enter(key))
	require.False(t, s.enter(key), "a second request of the thread in flight")
	s.leave(key)
	s.leave(key)
	require.True(t, s.enter(key), "both claims given back")
	s.leave(key)
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
	state, _ := s.latest(sessionKey("s1", mainThread))
	require.NotEmpty(t, state.RequestID)
}

// A request names the answered one only when its messages continue it: begin
// with its messages, in canonical JSON, and go on past them.
func TestHistoryDigestContinuesTheAnsweredMessages(t *testing.T) {
	answered := prefix(digestsOf(t, `[{"role":"user","content":"a"}]`), 1)
	require.True(t, answered.continues(digestsOf(t, `[{"content":"a","role":"user"},{"role":"assistant","content":"b"},{"role":"user","content":"c"}]`)), "re-encoded keys")
	require.False(t, answered.continues(digestsOf(t, `[{"role":"user","content":"a"}]`)), "the same messages again: no answer after them")
	require.False(t, answered.continues(digestsOf(t, `[{"role":"user","content":"x"},{"role":"assistant","content":"b"}]`)), "another conversation")
	require.False(t, historyDigest{}.continues(digestsOf(t, `[{"role":"user","content":"a"}]`)))
	require.Nil(t, messageDigests(parseRequestBody([]byte(`{"messages":"not a list"}`))))
}

// A conversation through the Worker: the CLI is told what the Worker
// remembers of the session's main thread, as far as it is this conversation's,
// and the Worker keeps what the CLI reports for an answered request whose
// header it wrote; a request carrying the client's header (no report), another
// thread, a console test and a CLI without the capability neither read nor
// move it.
func TestRequestCommandRemembersTheSessionThread(t *testing.T) {
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
	named := `"metadata":{"user_id":"{\"device_id\":\"d\",\"session_id\":\"3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8\"}"},`
	send := func(answer, body string, headers map[string]string) (int, requestIdentity) {
		g.Runner = &Runner{CLI: exe, Work: root, Env: envWith(os.Environ(), map[string]string{
			"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
			"CCG_TEST_REQUEST_ENV_CAPTURE": target, "CCG_TEST_REQUEST_ANSWER": answer,
			"HOME": config, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config,
		}, "CLAUDE_CODE_USER_EMAIL", "ANTHROPIC_API_KEY")}
		request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"fixture",`+body+`}`))
		request.Header.Set("x-api-key", "fixture")
		for name, value := range headers {
			request.Header.Set(name, value)
		}
		response := httptest.NewRecorder()
		g.ServeHTTP(response, request)
		data, err := os.ReadFile(target)
		require.NoError(t, err)
		var env map[string]string
		require.NoError(t, json.Unmarshal(data, &env))
		var identity requestIdentity
		require.NoError(t, json.Unmarshal([]byte(env[requestIdentityEnv]), &identity))
		return response.Code, identity
	}
	report := func(turn int) string {
		return fmt.Sprintf(`{"thread":"main","turn_position":{"prompt_index":0,"turn_index":%d},"prompt_hash":"%s"}`, turn, fixtureHash)
	}
	turn1 := `"messages":[{"role":"user","content":"hello"}]`
	turn2 := `"messages":[{"role":"user","content":"hello"},{"role":"assistant","content":"ok"},{"role":"user","content":"next"}]`
	turn3 := `"messages":[{"role":"user","content":"hello"},{"role":"assistant","content":"ok"},{"role":"user","content":"next"},{"role":"assistant","content":"ok"},{"role":"user","content":"again"}]`
	code, first := send("req_first "+report(1), named+turn1, nil)
	require.Equal(t, http.StatusOK, code)
	require.Nil(t, first.Previous, "a session's first request")
	_, second := send("req_second "+report(2), named+turn2, nil)
	require.Equal(t, &sessionState{Thread: mainThread, RequestID: "req_first", Turn: &turnPosition{Prompt: 0, Turn: 1}, PromptHash: fixtureHash}, second.Previous)
	require.Equal(t, first.Session, second.Session, "one conversation, one upstream session")
	// A request whose header is the client's reports nothing: the memory stays.
	_, third := send("req_client null", named+turn3, nil)
	require.Equal(t, "req_second", third.Previous.RequestID)
	// A report for another thread than the one looked up is not kept.
	_, fourth := send(`req_other {"thread":"agent-9"}`, named+turn3, nil)
	require.Equal(t, "req_second", fourth.Previous.RequestID)
	// A shortened history does not continue the answered messages: no
	// request-id, but the client's session keeps its turn.
	_, short := send("req_short "+report(3), named+`"messages":[{"role":"user","content":"again"}]`, nil)
	require.Equal(t, &sessionState{Thread: mainThread, Turn: &turnPosition{Prompt: 0, Turn: 2}, PromptHash: fixtureHash}, short.Previous)
	// A subagent's request is told its own thread's memory, not the main one's.
	_, sub := send(`req_sub {"thread":"agent-1"}`, named+turn1, map[string]string{"X-Claude-Code-Agent-Id": "agent-1"})
	require.Nil(t, sub.Previous)
	_, subNext := send(`req_sub2 {"thread":"agent-1"}`, named+turn2, map[string]string{"X-Claude-Code-Agent-Id": "agent-1"})
	require.Equal(t, &sessionState{Thread: "agent-1", RequestID: "req_sub"}, subNext.Previous)
	// A session derived from the first message is shared by conversations
	// that open alike: it uses no memory at all.
	_, derived := send("req_derived "+report(1), turn1, nil)
	require.Nil(t, derived.Previous)
	_, derivedNext := send("req_derived2 "+report(2), turn2, nil)
	require.Nil(t, derivedNext.Previous)
	// A CLI without the capability is never told (it would refuse the field).
	g.CLIInfo.Capabilities = g.CLIInfo.Capabilities[:len(g.CLIInfo.Capabilities)-1]
	_, older := send("req_older "+report(4), named+turn3, nil)
	require.Nil(t, older.Previous)
}

// A request whose upstream answer failed does not move the session on; a
// console test and a second request of one subagent thread in flight do not
// use it.
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
	next := plan()
	g.attachSessionState(next, http.Header{}, two)
	require.Equal(t, "req_ok", next.identity.Previous.RequestID)
	require.Equal(t, 1, next.identity.Previous.Turn.Turn)
	probe := &requestPlan{probe: true, identity: &requestIdentity{Session: "s1", named: true}}
	g.attachSessionState(probe, http.Header{}, two)
	require.Nil(t, probe.identity.Previous)
	h := http.Header{"X-Claude-Code-Agent-Id": {"agent-1"}}
	a, b := plan(), plan()
	g.attachSessionState(a, h, one)
	g.attachSessionState(b, h, one)
	require.True(t, a.session.usable)
	require.False(t, b.session.usable)
	report := sessionState{Thread: "agent-1"}
	g.rememberSessionState(b, &requestCommandOutput{status: 200, requestID: "req_b", session: &report})
	g.releaseSessionState(b)
	g.rememberSessionState(a, &requestCommandOutput{status: 200, requestID: "req_a", session: &report})
	g.releaseSessionState(a)
	c := plan()
	g.attachSessionState(c, h, two)
	require.Equal(t, "req_a", c.identity.Previous.RequestID)
	g.releaseSessionState(c)
}
