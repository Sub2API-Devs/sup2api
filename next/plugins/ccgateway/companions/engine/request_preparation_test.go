package engine

import (
	"crypto/sha256"
	"encoding/hex"
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

// bodyDigest is the digest the log records for a body.
func bodyDigest(body []byte) string {
	sum := sha256.Sum256(body)
	return hex.EncodeToString(sum[:])
}

// wholeRequestBodies are the request shapes end-to-end preparation must treat
// the same as it did: a plain Claude Code request, one with metadata.user_id in
// its string carrier, with credentials, and with tools.
func wholeRequestBodies() map[string]string {
	return map[string]string{
		"plain": `{"model":"fixture","max_tokens":16,"stream":true,"system":"s","messages":[{"role":"user","content":"hello"}]}`,
		"history": `{"model":"fixture","max_tokens":16,"messages":[` +
			`{"role":"user","content":[{"type":"text","text":"one"}]},` +
			`{"role":"assistant","content":[{"type":"tool_use","id":"t","name":"Bash","input":{"n":9007199254740993}}]},` +
			`{"role":"user","content":[{"type":"tool_result","tool_use_id":"t","content":"ok"}]}]}`,
		"identity": `{"model":"fixture","max_tokens":16,"metadata":{"user_id":"{\"device_id\":\"d\",\"session_id\":\"3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8\"}"},"messages":[{"role":"user","content":"hello"}]}`,
		"tools": `{"model":"fixture","max_tokens":16,"tools":[{"name":"Bash","description":"x","input_schema":{"type":"object"},"strict":true},` +
			`{"type":"web_search_20250305","name":"web_search"}],"messages":[{"role":"user","content":"hello"}]}`,
		"credential": `{"model":"fixture","max_tokens":16,"mcp_servers":[{"authorization_token":"SENTINEL"}],"messages":[{"role":"user","content":"hello"}]}`,
		"spacing":    "{\n \"model\" : \"fixture\" ,\n \"max_tokens\" : 16 ,\n \"messages\" : [ { \"role\" : \"user\" , \"content\" : \"hello\" } ]\n}\n",
	}
}

// logFields is what the request log recorded about a body, in the two levels'
// own files. It is compared field by field, so a reformatted log would fail.
type requestLogSnapshot struct {
	Metadata Object
	Events   []Object
}

// runLoggedBody sends one body through a real Gateway (the test binary stands
// in for the CLI) and returns what the CLI received on stdin and what the log
// kept.
func runLoggedBody(t *testing.T, mode, body string) (stdin []byte, log requestLogSnapshot) {
	t.Helper()
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	store := fullLogStore(t, t.TempDir())
	account := map[string]string{
		"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
		"HOME": root, "CLAUDE_CONFIG_DIR": root, "CLAUDE_SECURESTORAGE_CONFIG_DIR": root,
	}
	g := &Gateway{RequestMode: mode, Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second, CLIInfo: buildCLI,
		Runner: &Runner{CLI: exe, Work: root, Env: envWith(os.Environ(), account, "ANTHROPIC_API_KEY", "CLAUDE_CODE_USER_EMAIL")}, RequestLogs: store}
	request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body))
	request.Header.Set("x-api-key", "fixture")
	request.Header.Set("anthropic-beta", "test-beta")
	response := httptest.NewRecorder()
	g.ServeHTTP(response, request)
	require.Equal(t, 200, response.Code, response.Body.String())
	store.flush()
	stdin, err = os.ReadFile(filepath.Join(root, "input.jsonl"))
	require.NoError(t, err)
	// The peer writes one line per request, so it appends the separator.
	stdin = []byte(strings.TrimSuffix(string(stdin), "\n"))
	entries, err := os.ReadDir(store.root)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	directory := filepath.Join(store.root, entries[0].Name())
	metadata, err := os.ReadFile(filepath.Join(directory, "metadata.json"))
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(metadata, &log.Metadata))
	events, err := os.ReadFile(filepath.Join(directory, "events.jsonl"))
	require.NoError(t, err)
	for _, line := range strings.Split(strings.TrimSpace(string(events)), "\n") {
		var event Object
		require.NoError(t, json.Unmarshal([]byte(line), &event))
		// The time of an event is the clock, not the request: its own field
		// and the duration depend on when it ran.
		delete(event, "time")
		delete(event["detail"].(map[string]any), "duration")
		log.Events = append(log.Events, event)
	}
	// These two move with the clock and with random ids.
	delete(log.Metadata, "duration_ms")
	return stdin, log
}

// One request body prepares into the same CLI stdin and the same request log
// as it did before the body was parsed once: the fields the log keeps and the
// events it writes are those of the inline preparation, in the same order.
func TestWholeRequestPreparationIsUnchanged(t *testing.T) {
	for _, mode := range []string{"direct", "build"} {
		for name, body := range wholeRequestBodies() {
			t.Run(mode+"/"+name, func(t *testing.T) {
				stdin, log := runLoggedBody(t, mode, body)
				if mode == "direct" {
					require.Equal(t, body, string(stdin), "direct altered the body")
				} else {
					require.NotEqual(t, body, string(stdin), "build did not write the envelope")
				}
				// The description of the body is the one the inline summary
				// wrote, from the same bytes. It is compared as JSON: the log
				// file's numbers come back as float64.
				for key, want := range legacySummary([]byte(body)) {
					encoded, err := json.Marshal(want)
					require.NoError(t, err, key)
					var decoded any
					require.NoError(t, json.Unmarshal(encoded, &decoded))
					require.Equal(t, decoded, log.Metadata[key], key)
				}
				require.Equal(t, len(body), int(log.Metadata["body_bytes"].(float64)))
				require.Equal(t, bodyDigest([]byte(body)), log.Metadata["body_sha256"])
				require.Equal(t, "test-beta", log.Metadata["anthropic_beta"])
				require.Equal(t, "request_received", log.Events[0]["event"])
				require.Equal(t, "request_command", log.Events[1]["event"])
				require.Equal(t, "request_finished", log.Events[len(log.Events)-1]["event"])
			})
		}
	}
}

// The envelope of the same body is the same whether it was parsed once or
// whole, byte for byte.
func TestWholeBuildEnvelopeIsUnchanged(t *testing.T) {
	policy := &features.CLIPolicy{ContractVersion: 2}
	for name, body := range wholeRequestBodies() {
		stdin, _ := runLoggedBody(t, "build", body)
		want, err := legacyBuildComponents([]byte(body), policy, "")
		require.NoError(t, err, name)
		require.Equal(t, string(want), string(stdin), name)
	}
}

// A credential-bearing body keeps its redacted structured capture, and its
// summary, with the detection still on.
func TestWholeCredentialRequestStillRedacts(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	store := fullLogStore(t, t.TempDir())
	account := map[string]string{
		"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
		"HOME": root, "CLAUDE_CONFIG_DIR": root, "CLAUDE_SECURESTORAGE_CONFIG_DIR": root,
	}
	g := &Gateway{RequestMode: "build", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second, CLIInfo: buildCLI,
		Runner: &Runner{CLI: exe, Work: root, Env: envWith(os.Environ(), account, "ANTHROPIC_API_KEY", "CLAUDE_CODE_USER_EMAIL")}, RequestLogs: store}
	body := `{"model":"fixture","max_tokens":16,"mcp_servers":[{"authorization_token":"CREDIT_SENTINEL"}],"messages":[{"role":"user","content":"hello"}]}`
	request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body))
	request.Header.Set("x-api-key", "fixture")
	response := httptest.NewRecorder()
	g.ServeHTTP(response, request)
	require.Equal(t, 200, response.Code, response.Body.String())
	store.flush()
	entries, err := os.ReadDir(store.root)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	directory := filepath.Join(store.root, entries[0].Name())
	for _, name := range []string{"request.body", "metadata.json", "events.jsonl", "request-headers.json"} {
		data, err := os.ReadFile(filepath.Join(directory, name))
		require.NoError(t, err, name)
		require.NotContains(t, string(data), "CREDIT_SENTINEL", name)
	}
	var metadata Object
	raw, err := os.ReadFile(filepath.Join(directory, "metadata.json"))
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(raw, &metadata))
	require.Equal(t, "structured_redacted_only", metadata["capture_policy"])
	require.Equal(t, "fixture", metadata["model"])
}
