package engine

import (
	"bytes"
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

// workerCLIFixture is the producer half of the Worker → CLI contract: what the
// Worker actually writes to the CLI (stdin and the identity context) for
// representative policies and components. cli-mods/test/contract-fixtures
// feeds the same bytes to the CLI's own validators and transforms. Regenerate
// with CCG_UPDATE_CONTRACT_FIXTURES=1 after an intended change.
var workerCLIFixture = filepath.Join("..", "contracts", "testdata", "worker-cli-requests.json")

type workerCLICase struct {
	Name     string `json:"name"`
	Mode     string `json:"mode"`
	Stdin    string `json:"stdin"`
	Identity string `json:"identity,omitempty"`
}

func TestWorkerCLIRequestsMatchTheContractFixture(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	session := "12345678-1234-4123-8123-123456789012"
	reminder := "<system-reminder>\n" + buildClientEnvironment + "</system-reminder>"
	scenarios := []struct {
		name, mode, policy, body string
	}{
		{"build-default", "build", `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304"}`,
			`{"model":"fixture","system":"plain system","messages":[{"role":"user","content":"hello"}],"max_tokens":64,"metadata":{"user_id":"{\"device_id\":\"` + strings.Repeat("c", 64) + `\",\"session_id\":\"` + session + `\"}"}}`},
		{"build-sources", "build", `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304","build_attachment_sources":{"platform_name":"worker","os_version":"erase"},"build_billing_sources":{"cc_version":"worker"},"request_identity_sources":{"user_id":"client"}}`,
			mustJSON(t, Object{"model": "fixture", "stream": true, "max_tokens": 128, "temperature": 0.5,
				"system":   []any{Object{"type": "text", "text": "x-anthropic-billing-header: cc_version=2.1.304.abc; cc_entrypoint=cli;"}, Object{"type": "text", "text": "system text", "cache_control": Object{"type": "ephemeral"}}},
				"messages": []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": reminder}, Object{"type": "text", "text": "question"}}}},
				"tools":    []any{Object{"name": "lookup", "description": "find", "input_schema": Object{"type": "object", "properties": Object{"q": Object{"type": "string"}}}}},
				"metadata": Object{"user_id": Object{"device_id": strings.Repeat("d", 64), "session_id": session}}})},
		{"build-identity-worker", "build", `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304","request_identity_sources":{"user_id":"worker"}}`,
			`{"model":"fixture","messages":[{"role":"user","content":"hello"}],"metadata":{"user_id":"user_` + strings.Repeat("e", 64) + `_account__session_` + session + `"}}`},
		{"build-no-identity", "build", `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304"}`,
			`{"model":"fixture","messages":[{"role":"user","content":"hello"},{"role":"assistant","content":"hi"},{"role":"user","content":"again"}]}`},
		{"build-unusable-identity", "build", `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304"}`,
			`{"model":"fixture","messages":[{"role":"user","content":"hello"}],"metadata":{"user_id":{"foo":"x"}}}`},
		{"direct-passthrough", "direct", `{"schema_version":1,"relay_mode":"direct","cli_version":"2.1.304"}`,
			`{"model":"fixture","messages":[{"role":"user","content":"hello"}],"metadata":{"user_id":"{\"device_id\":\"` + strings.Repeat("c", 64) + `\",\"session_id\":\"` + session + `\"}"}}`},
	}
	var cases []workerCLICase
	for _, sc := range scenarios {
		t.Run(sc.name, func(t *testing.T) {
			root := t.TempDir()
			config := t.TempDir()
			require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"account@example.invalid"}}`), 0600))
			require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"fixture"}}`), 0600))
			envCapture := filepath.Join(root, "identity-env.json")
			g := &Gateway{RequestMode: sc.mode, Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
				CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_direct", "request_build", features.BuildContentPreservationCapability,
					features.BuildAttachmentCapabilityV2, features.BuildBillingCapability, features.RequestIdentityCapability}},
				Runner: &Runner{CLI: exe, Version: "2.1.304", Work: root, WorkingDirectory: root, Env: envWith(os.Environ(), map[string]string{
					"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"), "CCG_TEST_REQUEST_ENV_CAPTURE": envCapture,
					"HOME": config, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config,
				}, "CLAUDE_CODE_USER_EMAIL", "ANTHROPIC_API_KEY")}}
			require.NoError(t, g.configureRequestIdentity(root))
			// A fixed account secret keeps the mapped identity reproducible.
			g.requestIdentitySecret = bytes.Repeat([]byte{7}, 32)
			req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(sc.body))
			req.Header.Set("x-api-key", "fixture")
			req.Header.Set(policyHeader, sc.policy)
			out := httptest.NewRecorder()
			g.ServeHTTP(out, req)
			require.Equal(t, 200, out.Code, out.Body.String())
			stdin, err := os.ReadFile(filepath.Join(root, "input.jsonl"))
			require.NoError(t, err)
			var env map[string]string
			raw, err := os.ReadFile(envCapture)
			require.NoError(t, err)
			require.NoError(t, json.Unmarshal(raw, &env))
			// The runtime context names this temporary directory; the CLI side
			// substitutes its own working directory.
			escaped, _ := json.Marshal(root)
			cases = append(cases, workerCLICase{Name: sc.name, Mode: sc.mode,
				Stdin:    strings.ReplaceAll(strings.TrimRight(string(stdin), "\n"), string(escaped[1:len(escaped)-1]), "{{cwd}}"),
				Identity: env[requestIdentityEnv]})
		})
	}
	generated, err := json.MarshalIndent(map[string]any{"cases": cases}, "", "  ")
	require.NoError(t, err)
	generated = append(generated, '\n')
	if os.Getenv("CCG_UPDATE_CONTRACT_FIXTURES") != "" {
		require.NoError(t, os.WriteFile(workerCLIFixture, generated, 0644))
	}
	committed, err := os.ReadFile(workerCLIFixture)
	require.NoError(t, err)
	require.JSONEq(t, string(committed), string(generated), "Worker → CLI requests changed: regenerate with CCG_UPDATE_CONTRACT_FIXTURES=1 and run the cli-mods contract test")
}

func mustJSON(t *testing.T, v any) string {
	t.Helper()
	raw, err := json.Marshal(v)
	require.NoError(t, err)
	return string(raw)
}
