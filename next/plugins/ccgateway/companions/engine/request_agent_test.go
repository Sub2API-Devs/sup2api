package engine

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

// The CLI gets the client's CC context headers and a key scoped to the client
// session: the same session always gives the same key (so mapped IDs keep
// their equalities across requests), another session another key. Build on an
// OAuth account maps the IDs; direct keeps them, and adopts the client's
// session so the session header agrees with the unchanged metadata.
func TestRequestAgentContext(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	const sessionA, sessionB = "475d3bc6-d49a-4c42-8d1a-f5d9ab945851", "5d0c0d44-0f5b-4b1c-9d2b-0d7f3b6a9c11"
	body := func(session string) string {
		if session == "" {
			return `{"model":"fixture","messages":[{"role":"user","content":"hello"}]}`
		}
		return `{"model":"fixture","messages":[{"role":"user","content":"hello"}],"metadata":{"user_id":"{\"device_id\":\"d\",\"session_id\":\"` + session + `\"}"}}`
	}
	for _, mode := range []string{"build", "direct"} {
		for _, apiKey := range []bool{false, true} {
			name := mode
			if apiKey {
				name += "/api-key"
			}
			t.Run(name, func(t *testing.T) {
				root := t.TempDir()
				target := filepath.Join(root, "agent-env.json")
				config := t.TempDir()
				require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"account@example.invalid"}}`), 0600))
				require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"fixture"}}`), 0600))
				account := map[string]string{
					"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
					"CCG_TEST_REQUEST_ENV_CAPTURE": target, requestAgentEnv: "untrusted",
					"HOME": config, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config,
				}
				remove := []string{"CLAUDE_CODE_USER_EMAIL"}
				if apiKey {
					account["ANTHROPIC_API_KEY"] = "fixture"
				} else {
					remove = append(remove, "ANTHROPIC_API_KEY")
				}
				g := &Gateway{RequestMode: mode, Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
					CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_direct", "request_build", features.RequestIdentityCapability, features.RequestAgentContextCapability}},
					Runner:  &Runner{CLI: exe, Work: root, Env: envWith(os.Environ(), account, remove...)}}
				require.NoError(t, g.configureRequestIdentity(root))
				send := func(session string, headers map[string]string) (requestAgent, map[string]string) {
					request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body(session)))
					request.Header.Set("x-api-key", "fixture")
					for k, v := range headers {
						request.Header.Set(k, v)
					}
					response := httptest.NewRecorder()
					g.ServeHTTP(response, request)
					require.Equal(t, 200, response.Code, response.Body.String())
					data, err := os.ReadFile(target)
					require.NoError(t, err)
					var env map[string]string
					require.NoError(t, json.Unmarshal(data, &env))
					var agent requestAgent
					require.NoError(t, json.Unmarshal([]byte(env[requestAgentEnv]), &agent), "the inherited value is replaced")
					return agent, env
				}
				headers := map[string]string{
					"X-Claude-Code-Request-Class": "subagent", "X-Claude-Code-Agent-Id": "a12268251d7ed891f",
					"X-Claude-Code-Parent-Agent-Id": "ad870fd7d5b0b15e6", "X-Claude-Code-Agent-Type": "general-purpose",
					"X-Claude-Code-Prompt-Id": "a606b757-b9e1-4f6f-8eb0-88ffd9569a8d", "X-Claude-Code-Prev-Tool-Durations": "Agent=76",
				}
				first, env := send(sessionA, headers)
				require.Equal(t, 1, first.Version)
				require.Equal(t, map[string]string{"request_class": "subagent", "agent_id": "a12268251d7ed891f", "parent_agent_id": "ad870fd7d5b0b15e6", "agent_type": "general-purpose", "prompt_id": "a606b757-b9e1-4f6f-8eb0-88ffd9569a8d", "prev_tool_durations": "Agent=76"}, first.Client)
				if apiKey {
					// No Claude account to map for: the client's IDs go unchanged.
					require.False(t, first.Map)
					require.Empty(t, first.Key)
				} else {
					require.Equal(t, mode == "build", first.Map)
					require.Regexp(t, `^[0-9a-f]{64}$`, first.Key)
					again, _ := send(sessionA, map[string]string{"X-Claude-Code-Agent-Type": "bad type", "X-Claude-Code-Prompt-Id": "not-a-uuid"})
					require.Equal(t, first.Key, again.Key, "one session, one key")
					require.Empty(t, again.Client, "malformed headers are ignored")
					other, _ := send(sessionB, nil)
					require.NotEqual(t, first.Key, other.Key)
					none, _ := send("", nil)
					noneAgain, _ := send("", nil)
					require.Equal(t, none.Key, noneAgain.Key, "a session-less request still maps stably")
					require.NotEqual(t, first.Key, none.Key)
				}
				if mode == "direct" {
					// The session header follows the metadata the body carries.
					var identity requestIdentity
					require.NoError(t, json.Unmarshal([]byte(env[requestIdentityEnv]), &identity))
					require.Equal(t, requestIdentity{Version: 2, Mode: "client", Session: sessionA, Carrier: "json"}, identity)
				}
			})
		}
	}
}

// A CLI without the capability, and the console test, get no agent context.
func TestRequestAgentContextNeedsTheCapability(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	for _, tc := range []struct {
		name         string
		capabilities []string
		path         string
	}{
		{"old CLI", []string{"request_direct", "request_build"}, "/v1/messages"},
		{"probe", []string{"request_direct", "request_build", features.RequestAgentContextCapability}, "/v1/ccgateway/probe"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			target := filepath.Join(root, "agent-env.json")
			g := &Gateway{RequestMode: "build", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
				CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: tc.capabilities},
				Runner: &Runner{CLI: exe, Work: root, Env: envWith(os.Environ(), map[string]string{
					"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
					"CCG_TEST_REQUEST_ENV_CAPTURE": target, requestAgentEnv: "untrusted",
				})}}
			request := httptest.NewRequest("POST", tc.path, strings.NewReader(`{"model":"fixture","messages":[{"role":"user","content":"hello"}]}`))
			request.Header.Set("x-api-key", "fixture")
			request.Header.Set("X-Claude-Code-Request-Class", "subagent")
			response := httptest.NewRecorder()
			g.ServeHTTP(response, request)
			require.Equal(t, 200, response.Code, response.Body.String())
			data, err := os.ReadFile(target)
			require.NoError(t, err)
			var env map[string]string
			require.NoError(t, json.Unmarshal(data, &env))
			require.Empty(t, env[requestAgentEnv])
		})
	}
}

// The CLI gets every tool with the client's key order; only input_schema is
// renamed, in place.
func TestBuildInputKeepsToolKeyOrder(t *testing.T) {
	body := `{"model":"m","messages":[{"role":"user","content":"hi"}],"tools":[{"name":"Read","description":"d","input_schema":{"type":"object","z":1,"a":2},"cache_control":{"type":"ephemeral"}},{"type":"web_search_20250305","name":"web_search","max_uses":1}]}`
	out, err := messagesBuildComponentsPolicy([]byte(body), &buildRequestPolicy{}, "/w")
	require.NoError(t, err)
	var components struct {
		Tools []json.RawMessage `json:"tools"`
	}
	require.NoError(t, json.Unmarshal(out, &components))
	require.Equal(t, `{"name":"Read","description":"d","inputSchema":{"type":"object","z":1,"a":2},"cache_control":{"type":"ephemeral"}}`, string(components.Tools[0]))
	require.Equal(t, `{"type":"web_search_20250305","name":"web_search","max_uses":1}`, string(components.Tools[1]))
}
