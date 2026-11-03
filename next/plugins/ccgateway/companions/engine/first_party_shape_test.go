package engine

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

// The first-party shape (features.FirstPartyShapeCapability, 2026-11-03):
// the Worker turns the CLI's conversion on unless the core's policy says
// false, and gives a converting CLI the conversation's memory, including for
// a request carrying the client's own billing header, the answer's message
// ID and the Agent calls that spawn subagents.

func agentStream(id string, calls ...string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":%q,\"type\":\"message\"}}\n\n", id)
	for i, input := range calls {
		fmt.Fprintf(&b, "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":%d,\"content_block\":{\"type\":\"tool_use\",\"id\":\"toolu_%d\",\"name\":\"Agent\",\"input\":{}}}\n\n", i, i)
		// The input arrives in pieces, split anywhere.
		half := len(input) / 2
		for _, part := range []string{input[:half], input[half:]} {
			piece, _ := json.Marshal(part)
			fmt.Fprintf(&b, "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":%d,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":%s}}\n\n", i, piece)
		}
		fmt.Fprintf(&b, "event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":%d}\n\n", i)
	}
	b.WriteString("event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n")
	return b.String()
}

func TestAnswerObserverReadsTheMessageIDAndAgentCalls(t *testing.T) {
	stream := agentStream("msg_01ABC", `{"description":"d","prompt":"LEVEL1: go","subagent_type":"general-purpose"}`, `{"prompt":"other"}`)
	for _, size := range []int{1, 7, 64, len(stream)} {
		o := newAnswerObserver("text/event-stream; charset=utf-8")
		for at := 0; at < len(stream); at += size {
			o.write([]byte(stream[at:min(at+size, len(stream))]))
		}
		id, spawns := o.facts()
		require.Equal(t, "msg_01ABC", id, size)
		require.Equal(t, []agentSpawn{{prompt: sha256.Sum256([]byte("LEVEL1: go")), agentType: "general-purpose"}, {prompt: sha256.Sum256([]byte("other"))}}, spawns, size)
	}
	// A JSON answer.
	o := newAnswerObserver("application/json")
	o.write([]byte(`{"id":"msg_2","content":[{"type":"text","text":"x"},{"type":"tool_use","name":"Agent","input":{"prompt":"p","subagent_type":"Explore"}},{"type":"tool_use","name":"Bash","input":{"prompt":"no"}}]}`))
	id, spawns := o.facts()
	require.Equal(t, "msg_2", id)
	require.Equal(t, []agentSpawn{{prompt: sha256.Sum256([]byte("p")), agentType: "Explore"}}, spawns)
	// An unfinished call, a bad ID, an encoded or other answer: what is not
	// certain is left out.
	unfinished := newAnswerObserver("text/event-stream")
	unfinished.write([]byte(strings.Split(agentStream("msg_3", `{"prompt":"p"}`), "event: content_block_stop")[0]))
	id, spawns = unfinished.facts()
	require.Equal(t, "msg_3", id)
	require.Nil(t, spawns)
	bad := newAnswerObserver("text/event-stream")
	bad.write([]byte(agentStream("not-a-message-id")))
	id, _ = bad.facts()
	require.Empty(t, id)
	require.Nil(t, newAnswerObserver("text/plain"))
	// The answer's end: a stream's message_stop, a JSON answer once whole.
	ending := newAnswerObserver("text/event-stream")
	ending.write([]byte(strings.Split(agentStream("msg_4"), "event: message_stop")[0]))
	require.False(t, ending.ended())
	ending.write([]byte("event: message_stop\ndata: {\"type\":\"message_stop\"}\n"))
	require.True(t, ending.ended())
	whole := newAnswerObserver("application/json")
	whole.write([]byte(`{"id":"msg_5","content":[{"type":"text","text":"}"}`))
	require.False(t, whole.ended())
	whole.write([]byte(`]}` + "\n"))
	require.True(t, whole.ended())
	var none *answerObserver
	none.write([]byte("x"))
	require.False(t, none.ended())
	id, spawns = none.facts()
	require.Empty(t, id)
	require.Nil(t, spawns)
}

// shapeGateway is sessionGateway with a CLI that converts, and an answer body.
func shapeGateway(t *testing.T, capable bool) func(id, report, body, answer, policy string, headers map[string]string) (int, requestIdentity, map[string]string) {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	target := filepath.Join(root, "identity-env.json")
	config := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"account@example.invalid"}}`), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"fixture"}}`), 0600))
	capabilities := []string{"request_direct", "request_build", features.RequestIdentityCapability, features.BuildContentPreservationCapability, features.SessionStateCapability, features.RequestLevelsCapability, features.DirectBillingCapability}
	if capable {
		capabilities = append(capabilities, features.FirstPartyShapeCapability)
	}
	g := &Gateway{RequestMode: "build", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
		CLIInfo: cliRequestInfo{Version: "2.1.316", Capabilities: capabilities}}
	require.NoError(t, g.configureRequestIdentity(root))
	return func(id, report, body, answer, policy string, headers map[string]string) (int, requestIdentity, map[string]string) {
		g.Runner = &Runner{CLI: exe, Work: root, Version: "2.1.316", Env: envWith(os.Environ(), map[string]string{
			"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
			"CCG_TEST_REQUEST_ENV_CAPTURE": target, "CCG_TEST_REQUEST_ANSWER_ID": id, "CCG_TEST_REQUEST_ANSWER_SESSION": report, "CCG_TEST_REQUEST_FRAME": "",
			"CCG_TEST_REQUEST_ANSWER_BODY": answer,
			"HOME":                         config, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config,
		}, "CLAUDE_CODE_USER_EMAIL", "ANTHROPIC_API_KEY")}
		request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"fixture",`+body+`}`))
		request.Header.Set("x-api-key", "fixture")
		if policy != "" {
			request.Header.Set(features.PolicyHeader, policy)
		}
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
		if raw := env[requestIdentityEnv]; raw != "" {
			require.NoError(t, json.Unmarshal([]byte(raw), &identity))
		}
		return response.Code, identity, env
	}
}

const (
	thirdPartyHeader = `"system":[{"type":"text","text":"x-anthropic-billing-header: cc_version=2.1.316.057; cc_entrypoint=sdk-cli;"}],`
	shapePromptID    = "4368f726-6311-4a6e-89ed-f4170bde06a6"
)

func shapeReport(turn int) string {
	return fmt.Sprintf(`{"thread":"main","turn_position":{"prompt_index":0,"turn_index":%d},"prompt_hash":"%s","prompt_id":"%s"}`, turn, fixtureHash, shapePromptID)
}

// The switch: absent or true turns the CLI's conversion on for build; false,
// direct, a console test and a CLI without the capability leave it off, and
// none of them is refused.
func TestFirstPartyShapeSwitch(t *testing.T) {
	send := shapeGateway(t, true)
	policy := func(mode, extra string) string {
		return `{"schema_version":1,"relay_mode":"` + mode + `","cli_version":"2.1.316"` + extra + `}`
	}
	for name, c := range map[string]struct {
		policy string
		on     bool
	}{
		"no policy":       {"", true},
		"absent":          {policy("build", ""), true},
		"true":            {policy("build", `,"first_party_shape":true`), true},
		"false":           {policy("build", `,"first_party_shape":false`), false},
		"direct":          {policy("direct", ""), false},
		"direct and true": {policy("direct", `,"first_party_shape":true`), false},
	} {
		code, _, env := send("req_x", "null", thirdPartyHeader+namedSession+sessionTurn1, "", c.policy, nil)
		require.Equal(t, http.StatusOK, code, name)
		_, set := env[firstPartyShapeEnv]
		require.Equal(t, c.on, set, name)
		if c.on {
			require.Equal(t, "1", env[firstPartyShapeEnv], name)
		}
	}
	older := shapeGateway(t, false)
	code, _, env := older("req_x", "null", thirdPartyHeader+namedSession+sessionTurn1, "", policy("build", `,"first_party_shape":true`), nil)
	require.Equal(t, http.StatusOK, code, "never refused")
	require.NotContains(t, env, firstPartyShapeEnv)
}

// A converting CLI's conversation: a request carrying the client's header is
// looked up and kept, with the answer's message ID and prompt ID; its
// subagents' first requests get the spawning Agent call; a CLI that does not
// convert is given none of the shape's facts.
func TestFirstPartyShapeRemembersTheConversation(t *testing.T) {
	send := shapeGateway(t, true)
	spawn := agentStream("msg_main1", `{"description":"d","prompt":"LEVEL1: use a subagent","subagent_type":"general-purpose"}`)
	code, first, _ := send("req_main1", shapeReport(1), thirdPartyHeader+namedSession+sessionTurn1, spawn, "", nil)
	require.Equal(t, http.StatusOK, code)
	require.Nil(t, first.Previous)
	require.Nil(t, first.Spawn)
	// The subagent's first request: its prompt is the Agent call's.
	subagent := map[string]string{"X-Claude-Code-Agent-Id": "a16670868ac7cd62f"}
	subTurn1 := `"messages":[{"role":"user","content":[{"type":"text","text":"<system-reminder>r</system-reminder>"},{"type":"text","text":"LEVEL1: use a subagent"}]}]`
	_, sub, _ := send("req_sub1", `{"thread":"a16670868ac7cd62f","prompt_id":"`+shapePromptID+`","agent_type":"general-purpose"}`, thirdPartyHeader+namedSession+subTurn1, agentStream("msg_sub1"), "", subagent)
	require.Equal(t, &spawnContext{PromptID: shapePromptID, AgentType: "general-purpose"}, sub.Spawn)
	require.Nil(t, sub.Previous)
	// Its next request continues its own thread.
	subTurn2 := `"messages":[{"role":"user","content":[{"type":"text","text":"<system-reminder>r</system-reminder>"},{"type":"text","text":"LEVEL1: use a subagent"}]},{"role":"assistant","content":"ok"},{"role":"user","content":[{"type":"tool_result","tool_use_id":"t","content":"x"}]}]`
	_, subNext, _ := send("req_sub2", `{"thread":"a16670868ac7cd62f"}`, thirdPartyHeader+namedSession+subTurn2, "", "", subagent)
	require.Equal(t, &sessionState{Thread: "a16670868ac7cd62f", RequestID: "req_sub1", MessageID: "msg_sub1", PromptID: shapePromptID, AgentType: "general-purpose"}, subNext.Previous)
	require.Nil(t, subNext.Spawn, "only a first request is given its spawn")
	// Another prompt is not this call's subagent.
	_, stranger, _ := send("req_x", `{"thread":"a2"}`, thirdPartyHeader+namedSession+`"messages":[{"role":"user","content":"something else"}]`, "", "", map[string]string{"X-Claude-Code-Agent-Id": "a2"})
	require.Nil(t, stranger.Spawn)
	// The main thread's next request: its answer's message ID and prompt ID.
	_, second, _ := send("req_main2", shapeReport(2), thirdPartyHeader+namedSession+sessionTurn2, "", "", nil)
	require.Equal(t, &sessionState{Thread: mainThread, RequestID: "req_main1", Turn: &turnPosition{Prompt: 0, Turn: 1}, PromptHash: fixtureHash, MessageID: "msg_main1", PromptID: shapePromptID}, second.Previous)
	// Switched off, a request with the client's header is not looked up.
	off := `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.316","first_party_shape":false}`
	_, unconverted, _ := send("req_main3", shapeReport(3), thirdPartyHeader+namedSession+sessionTurn3, "", off, nil)
	require.Nil(t, unconverted.Previous)
	// A request without a header (the CLI writes its own) is looked up, but
	// a non-converting request is never given the shape's facts.
	_, plain, _ := send("req_main4", turnReport(3), namedSession+sessionTurn3, "", off, nil)
	require.Equal(t, &sessionState{Thread: mainThread, RequestID: "req_main2", Turn: &turnPosition{Prompt: 0, Turn: 2}, PromptHash: fixtureHash}, plain.Previous)
}

// The parent's Agent call is given only when it is certain: the parent has no
// request in flight, exactly one call has the subagent's prompt (or all with
// one type), and the parent's prompt ID or the type is known.
func TestFirstPartyShapeSpawnOnlyWhenCertain(t *testing.T) {
	var s sessionStates
	prompt := sha256.Sum256([]byte("go"))
	messages := messageHistory{prompts: [][32]byte{sha256.Sum256([]byte("reminder")), prompt}, lastAssistant: -1}
	parent := sessionKey("s", mainThread)
	report := sessionState{Thread: mainThread, Turn: &turnPosition{Turn: 1}, PromptHash: fixtureHash, PromptID: shapePromptID}
	s.answeredWith(parent, "req_1", historyDigest{}, report, answerFacts{messageID: "msg_1", spawns: []agentSpawn{{prompt: prompt, agentType: "Explore"}}})
	require.Equal(t, &spawnContext{PromptID: shapePromptID, AgentType: "Explore"}, s.spawned(parent, messages))
	require.Nil(t, s.spawned(sessionKey("s", "other"), messages))
	require.Nil(t, s.spawned(parent, messageHistory{prompts: [][32]byte{sha256.Sum256([]byte("else"))}}))
	require.True(t, s.enter(parent))
	require.Nil(t, s.spawned(parent, messages), "the parent's last answer may change")
	s.leave(parent)
	s.answeredWith(parent, "req_2", historyDigest{}, report, answerFacts{spawns: []agentSpawn{{prompt: prompt, agentType: "Explore"}, {prompt: prompt, agentType: "general-purpose"}}})
	require.Nil(t, s.spawned(parent, messages), "two calls, two types")
	s.answeredWith(parent, "req_3", historyDigest{}, report, answerFacts{spawns: []agentSpawn{{prompt: prompt}, {prompt: prompt}}})
	require.Equal(t, &spawnContext{PromptID: shapePromptID}, s.spawned(parent, messages))
	s.answeredWith(parent, "req_4", historyDigest{}, sessionState{Thread: mainThread, Turn: &turnPosition{Turn: 1}, PromptHash: fixtureHash}, answerFacts{spawns: []agentSpawn{{prompt: prompt}}})
	require.Nil(t, s.spawned(parent, messages), "nothing to give")
	// Values Claude Code would not write are not kept.
	s.answeredWith(parent, "req_5", historyDigest{}, sessionState{Thread: mainThread, Turn: &turnPosition{Turn: 1}, PromptHash: fixtureHash, PromptID: "no", AgentType: "x"}, answerFacts{messageID: "bad id"})
	state, _ := s.latest(parent)
	require.Equal(t, &sessionState{Thread: mainThread, RequestID: "req_5", Turn: &turnPosition{Turn: 1}, PromptHash: fixtureHash}, state)
}

func TestFirstPartyShapeIsReported(t *testing.T) {
	g := &Gateway{CLIInfo: cliRequestInfo{Capabilities: []string{"request_build", features.FirstPartyShapeCapability}}}
	require.Contains(t, g.requestCapabilities(), features.FirstPartyShapeCapability)
	g.CLIInfo.Capabilities = []string{"request_build"}
	require.NotContains(t, g.requestCapabilities(), features.FirstPartyShapeCapability)
}

// Claude Code moves its cache markers on as the conversation grows and sends
// a message whose one text block lost its marker as a string: the memory
// compares the messages without either (2.1.316, the third-party client's
// environment message on its second request).
func TestSessionMemoryIgnoresCacheMarkersAndStringContent(t *testing.T) {
	first := parseRequestBody([]byte(`{"messages":[{"role":"user","content":[{"type":"text","text":"hi","cache_control":{"type":"ephemeral"}}]},{"role":"system","content":[{"type":"text","text":"# Environment","cache_control":{"type":"ephemeral","ttl":"1h"}}]}]}`))
	next := parseRequestBody([]byte(`{"messages":[{"role":"user","content":[{"type":"text","text":"hi"}]},{"role":"system","content":"# Environment"},{"role":"assistant","content":"ok"},{"role":"user","content":[{"type":"tool_result","tool_use_id":"t","content":[{"type":"text","text":"x","cache_control":{"type":"ephemeral"}}]}]}]}`))
	require.True(t, readMessages(first).all().continuedBy(readMessages(next)))
	// Other changes still count.
	edited := parseRequestBody([]byte(`{"messages":[{"role":"user","content":[{"type":"text","text":"hi!"}]},{"role":"system","content":"# Environment"},{"role":"assistant","content":"ok"},{"role":"user","content":"x"}]}`))
	require.False(t, readMessages(first).all().continuedBy(readMessages(edited)))
	twoBlocks := parseRequestBody([]byte(`{"messages":[{"role":"user","content":[{"type":"text","text":"hi"},{"type":"text","text":""}]},{"role":"system","content":"# Environment"},{"role":"assistant","content":"ok"},{"role":"user","content":"x"}]}`))
	require.False(t, readMessages(first).all().continuedBy(readMessages(twoBlocks)))
	// The first user message's texts are a subagent's prompts.
	require.Equal(t, [][32]byte{sha256.Sum256([]byte("hi"))}, readMessages(first).prompts)
}
