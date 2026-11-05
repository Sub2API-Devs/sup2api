package engine

import (
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

// toolStream is an event stream with a block per (type, name, server) item:
// each tool block gets an input in pieces and its stop.
func toolStream(blocks ...[3]string) string {
	var b strings.Builder
	b.WriteString("event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_tools\"}}\n\n")
	for i, block := range blocks {
		start := map[string]any{"type": block[0]}
		if block[0] == "text" {
			start["text"] = ""
		} else {
			start["name"] = block[1]
			start["input"] = map[string]any{}
			if block[2] != "" {
				start["server_name"] = block[2]
			}
		}
		raw, _ := json.Marshal(map[string]any{"type": "content_block_start", "index": i, "content_block": start})
		fmt.Fprintf(&b, "event: content_block_start\ndata: %s\n\n", raw)
		fmt.Fprintf(&b, "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":%d,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"{\\\"a\\\":1}\"}}\n\n", i)
		fmt.Fprintf(&b, "event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":%d}\n\n", i)
	}
	b.WriteString("event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n")
	return b.String()
}

var answerToolBlocks = [][3]string{
	{"text", "", ""},
	{"tool_use", "Bash", ""},
	{"server_tool_use", "web_search", ""},
	{"mcp_tool_use", "query", "db"},
	{"tool_use", "mcp__srv__do", ""},
	{"mcp_tool_use", "query", ""},
	{"tool_use", "bad name", ""},
	{"tool_use", "Bash", ""},
}

var answerToolNames = []string{"Bash", "web_search", "db:query", "mcp__srv__do", features.ToolsUsedUnreadable, features.ToolsUsedUnreadable, "Bash"}

// The observer reads every tool block's name in order: a client or server
// tool's name, an MCP connector's server:name, the stand-in for a name it
// cannot keep; only blocks read whole count.
func TestAnswerObserverReadsToolNames(t *testing.T) {
	stream := toolStream(answerToolBlocks...)
	for _, size := range []int{1, 13, len(stream)} {
		for _, calls := range []bool{true, false} {
			o := newAnswerObserver("text/event-stream")
			o.noCalls = !calls
			for at := 0; at < len(stream); at += size {
				o.write([]byte(stream[at:min(at+size, len(stream))]))
			}
			require.True(t, o.ended())
			require.Equal(t, answerToolNames, o.toolNames(), size)
		}
	}
	// A stream cut inside a block: the blocks before it only.
	cut := newAnswerObserver("text/event-stream")
	cut.write([]byte(strings.Split(stream, "\"index\":3,\"delta\"")[0]))
	require.Equal(t, []string{"Bash", "web_search"}, cut.toolNames())
	// A JSON answer.
	content := []map[string]any{}
	for _, block := range answerToolBlocks {
		item := map[string]any{"type": block[0]}
		if block[0] == "text" {
			item["text"] = "x"
		} else {
			item["name"], item["input"] = block[1], map[string]any{"a": 1}
			if block[2] != "" {
				item["server_name"] = block[2]
			}
		}
		content = append(content, item)
	}
	raw, _ := json.Marshal(map[string]any{"id": "msg_json", "content": content})
	o := newAnswerObserver("application/json")
	o.write(raw)
	require.Equal(t, answerToolNames, o.toolNames())
	unfinished := newAnswerObserver("application/json")
	unfinished.write(raw[:len(raw)-2])
	require.Empty(t, unfinished.toolNames())
	// An Agent call too large to keep stops the spawns, not the names, and
	// the observer never keeps a tool's input for its name.
	big := newAnswerObserver("text/event-stream")
	big.noCalls = true
	big.write([]byte("event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"tool_use\",\"name\":\"Agent\",\"input\":{}}}\n\n"))
	piece, _ := json.Marshal(strings.Repeat("x", 64<<10))
	for i := 0; i < 8; i++ {
		fmt.Fprintf(writerFunc(big.write), "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":%s}}\n\n", piece)
	}
	big.write([]byte("event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":0}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"))
	require.Equal(t, []string{"Agent"}, big.toolNames())
	require.Empty(t, big.blocks, "no input kept")
	require.True(t, big.ended())
	withCalls := newAnswerObserver("text/event-stream")
	withCalls.write([]byte("event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"tool_use\",\"name\":\"Agent\",\"input\":{}}}\n\n"))
	for i := 0; i < 8; i++ {
		fmt.Fprintf(writerFunc(withCalls.write), "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":%s}}\n\n", piece)
	}
	withCalls.write([]byte("event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":0}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"))
	_, spawns := withCalls.facts()
	require.Nil(t, spawns)
	require.Equal(t, []string{"Agent"}, withCalls.toolNames())
	var none *answerObserver
	require.Nil(t, none.toolNames())
}

type writerFunc func([]byte)

func (f writerFunc) Write(p []byte) (int, error) { f(p); return len(p), nil }

func TestMemoryForCLIAndReportedTools(t *testing.T) {
	require.Equal(t, []string{"Bash", features.ToolsUsedUnreadable, "Read"}, memoryForCLI([]string{"Bash", "bad name", "Bash", "Read"}))
	many := make([]string, toolsUsedMax+3)
	for i := range many {
		many[i] = fmt.Sprintf("t%d", i)
	}
	got := memoryForCLI(many)
	require.Len(t, got, toolsUsedMax)
	require.Equal(t, many[:toolsUsedMax-1], got[:toolsUsedMax-1])
	require.Equal(t, features.ToolsUsedUnreadable, got[toolsUsedMax-1], "a cut set ends with the stand-in")
	require.Equal(t, many[:toolsUsedMax], memoryForCLI(many[:toolsUsedMax]), "a full set is not cut")
	require.Nil(t, reportedTools(nil))
	require.Equal(t, []string{"Bash", features.ToolsUsedUnreadable}, reportedTools([]string{"Bash", "x y", features.ToolsUsedUnreadable}))
}

// toolsGateway is a build Worker whose CLI has the capabilities given, and
// its request: the CLI reports tools (JSON, "" for none) and answers with
// body ("" for the default answer).
type toolsSend func(tools, body, answer string, headers map[string]string) (int, map[string]string)

func toolsGateway(t *testing.T, capabilities ...string) (*Gateway, toolsSend) {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	target := filepath.Join(root, "identity-env.json")
	config := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"account@example.invalid"}}`), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"fixture"}}`), 0600))
	base := []string{"request_direct", "request_build", features.RequestIdentityCapability, features.BuildContentPreservationCapability, features.SessionStateCapability, features.RequestLevelsCapability, features.RequestAgentContextCapability}
	g := &Gateway{RequestMode: "build", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
		CLIInfo: cliRequestInfo{Version: "2.1.318", Capabilities: append(base, capabilities...)}}
	require.NoError(t, g.configureRequestIdentity(root))
	return g, func(tools, body, answer string, headers map[string]string) (int, map[string]string) {
		g.Runner = &Runner{CLI: exe, Work: root, Version: "2.1.318", Env: envWith(os.Environ(), map[string]string{
			"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
			"CCG_TEST_REQUEST_ENV_CAPTURE": target, "CCG_TEST_REQUEST_ANSWER_ID": "req_tools", "CCG_TEST_REQUEST_ANSWER_SESSION": "null", "CCG_TEST_REQUEST_FRAME": "",
			"CCG_TEST_REQUEST_ANSWER_BODY": answer, "CCG_TEST_REQUEST_ANSWER_TOOLS": tools,
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
		return response.Code, env
	}
}

// agentToolsUsed is the tools_used the CLI was given (nil: none).
func agentToolsUsed(t *testing.T, env map[string]string) *requestToolsUsed {
	t.Helper()
	var agent struct {
		ToolsUsed *requestToolsUsed `json:"tools_used"`
	}
	require.NoError(t, json.Unmarshal([]byte(env[requestAgentEnv]), &agent))
	return agent.ToolsUsed
}

// A session through the Worker: the CLI is given the client's value and the
// session's set; the set keeps what the CLI reports and the answer's tool
// calls, for every thread of the session.
func TestRequestCommandKeepsTheSessionsToolsUsed(t *testing.T) {
	g, send := toolsGateway(t, features.ToolsUsedCapability)
	code, env := send(`["Read"]`, namedSession+sessionTurn1, toolStream(answerToolBlocks[:3]...), nil)
	require.Equal(t, http.StatusOK, code)
	require.Equal(t, &requestToolsUsed{}, agentToolsUsed(t, env), "allowed to send, nothing to send from")
	require.Contains(t, env[requestAgentEnv], `"tools_used":{}`)
	// The next request, a subagent's, is given the set; the client's value
	// goes as it came.
	client := `[{"name":"Bash"},{"name":"Glob"}]`
	code, env = send(`["Read","Bash","Glob"]`, namedSession+sessionTurn2, "", map[string]string{"X-Claude-Code-Agent-Id": "agent-1", features.ToolsUsedHeader: client})
	require.Equal(t, http.StatusOK, code)
	require.Equal(t, &requestToolsUsed{Client: client, Memory: []string{"Read", "Bash", "web_search"}}, agentToolsUsed(t, env))
	_, env = send("", namedSession+sessionTurn3, "", nil)
	require.Equal(t, []string{"Read", "Bash", "web_search", "Glob"}, agentToolsUsed(t, env).Memory)
	// A client value of another shape is not passed on; sending stays allowed.
	_, env = send("", namedSession+sessionTurn3, "", map[string]string{features.ToolsUsedHeader: `[{"name":"bad name"}]`})
	require.Equal(t, &requestToolsUsed{Memory: []string{"Read", "Bash", "web_search", "Glob"}}, agentToolsUsed(t, env))
	// A session the Worker derives itself has no memory, but the CLI may
	// still send the header from the request's history; the client's value
	// still goes.
	_, env = send(`["Edit"]`, sessionTurn1, toolStream(answerToolBlocks[1:2]...), map[string]string{features.ToolsUsedHeader: `[]`})
	require.Equal(t, &requestToolsUsed{Client: `[]`}, agentToolsUsed(t, env))
	_, env = send("", sessionTurn2, "", nil)
	require.Equal(t, &requestToolsUsed{}, agentToolsUsed(t, env))
	require.Len(t, g.sessionStates.memory().tools, 1, "only the named session")
}

// The set lives for the policy's tools TTL: past it, the next request finds
// nothing and starts a new set.
func TestRequestCommandToolsUsedExpire(t *testing.T) {
	g, send := toolsGateway(t, features.ToolsUsedCapability)
	clock := newTestClock()
	g.sessionStates = sessionStates{now: clock.Now}
	policy := `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.318","session_memory":{"thread_ttl_seconds":60,"tools_ttl_seconds":120}}`
	headers := map[string]string{features.PolicyHeader: policy}
	code, _ := send(`["Read"]`, namedSession+sessionTurn1, "", headers)
	require.Equal(t, http.StatusOK, code)
	clock.Add(100 * time.Second)
	_, env := send("", namedSession+sessionTurn2, "", headers)
	require.Equal(t, []string{"Read"}, agentToolsUsed(t, env).Memory, "the read renews it")
	clock.Add(119 * time.Second)
	_, env = send("", namedSession+sessionTurn2, "", headers)
	require.Equal(t, []string{"Read"}, agentToolsUsed(t, env).Memory)
	clock.Add(121 * time.Second)
	_, env = send("", namedSession+sessionTurn2, "", headers)
	require.Nil(t, agentToolsUsed(t, env).Memory, "expired")
}

// Only a CLI with the capability is given tools_used (an older one refuses
// the field), and neither a console test nor a token count is.
func TestRequestAgentToolsUsedOnlyForACapableCLI(t *testing.T) {
	g, send := toolsGateway(t)
	_, env := send(`["Read"]`, namedSession+sessionTurn1, toolStream(answerToolBlocks[1:2]...), map[string]string{features.ToolsUsedHeader: `[]`})
	require.Nil(t, agentToolsUsed(t, env))
	require.NotContains(t, env[requestAgentEnv], "tools_used")
	require.Empty(t, g.sessionStates.memory().tools, "nothing kept for a CLI that does not send")
	require.NotContains(t, g.requestCapabilities(), features.ToolsUsedCapability)
	require.Contains(t, g.requestCapabilities(), features.SessionMemoryCapability)

	capable, _ := toolsGateway(t, features.ToolsUsedCapability)
	require.Contains(t, capable.requestCapabilities(), features.ToolsUsedCapability)
	probe := &requestPlan{probe: true, mode: "build", identity: &requestIdentity{Session: "s1", named: true}, agent: &requestAgent{}}
	capable.attachSessionState(probe, http.Header{}, parseRequestBody([]byte(`{"messages":[]}`)))
	require.Nil(t, probe.agent.ToolsUsed)
	require.Nil(t, probe.tools)
	count := &requestPlan{count: true, identity: &requestIdentity{Session: "s1", named: true}, agent: &requestAgent{}}
	capable.attachSessionState(count, http.Header{}, parseRequestBody([]byte(`{"messages":[]}`)))
	require.Nil(t, count.agent.ToolsUsed)
}

// The store's password never reaches a CLI process.
func TestStatePasswordIsAWorkerSecret(t *testing.T) {
	env := withoutWorkerSecrets([]string{"CCG_STATE_PASSWORD=x", "ccg_state_password=y", "CCG_STATE_USER=acct-a", "CCG_STATE_SOCKET=/run/ccg-state/valkey.sock"})
	require.Equal(t, []string{"CCG_STATE_USER=acct-a", "CCG_STATE_SOCKET=/run/ccg-state/valkey.sock"}, env)
}

// A side query's answer is not the conversation's: Claude Code keeps the
// server and MCP tool calls of its query loop only, so the Worker keeps what
// the CLI reports for a side query but not its answer's calls. A side query
// is one the client names auxiliary, or, naming no class, one that offers
// only server tools (WebSearch's search in the third-party shape).
func TestRequestCommandToolsUsedSkipsSideQueryAnswers(t *testing.T) {
	_, send := toolsGateway(t, features.ToolsUsedCapability)
	search := `"tools":[{"type":"web_search_20250305","name":"web_search","max_uses":8}],`
	client := `"tools":[{"name":"Bash","input_schema":{"type":"object"}},{"type":"web_search_20250305","name":"web_search"}],`
	code, _ := send(`["Read"]`, namedSession+client+sessionTurn1, toolStream(answerToolBlocks[2]), map[string]string{"X-Claude-Code-Request-Class": "auxiliary"})
	require.Equal(t, http.StatusOK, code)
	_, env := send("", namedSession+search+sessionTurn1, toolStream(answerToolBlocks[2]), nil)
	require.Equal(t, []string{"Read"}, agentToolsUsed(t, env).Memory, "an auxiliary answer's web_search is not kept")
	// The third-party shape: no class, only server tools.
	_, env = send("", namedSession+sessionTurn2, "", nil)
	require.Equal(t, []string{"Read"}, agentToolsUsed(t, env).Memory, "nor a classless server-tools-only answer's")
	// The query loop's own answers are kept: client tools offered, or a class
	// other than auxiliary.
	send("", namedSession+client+sessionTurn2, toolStream(answerToolBlocks[2]), nil)
	_, env = send("", namedSession+sessionTurn3, toolStream(answerToolBlocks[1]), map[string]string{"X-Claude-Code-Request-Class": "main"})
	require.Equal(t, []string{"Read", "web_search"}, agentToolsUsed(t, env).Memory)
	_, env = send("", namedSession+sessionTurn3, "", nil)
	require.Equal(t, []string{"Read", "web_search", "Bash"}, agentToolsUsed(t, env).Memory)
}
