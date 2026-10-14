package engine

import (
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The real CLI renders the Worker's attachments once (a rendering run that
// never reaches upstream); every request then carries them in place of the
// client's, byte for byte the same each time.
func TestRealCLIGatewayAttachmentReplace(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for the attachment replacement integration test")
	}
	version, err := checkVersion(cli)
	require.NoError(t, err)
	root := t.TempDir()
	plugin, err := extractMod(root)
	require.NoError(t, err)
	var mu sync.Mutex
	var wires []Object
	fake := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{}`)
			return
		}
		body, _ := io.ReadAll(r.Body)
		wire, err := decodeObject(body)
		if !assert.NoError(t, err) {
			return
		}
		mu.Lock()
		wires = append(wires, wire)
		mu.Unlock()
		writeSurfaceFixture(w, "claude-sonnet-4-6", []Object{{"type": "text", "text": "REPLACED_OK"}})
	}))
	defer fake.Close()
	ca := filepath.Join(root, "mock-ca.pem")
	require.NoError(t, os.WriteFile(ca, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: fake.Certificate().Raw}), 0600))
	env := envWith(nativeProbeEnv(root, fake.URL), map[string]string{"NODE_EXTRA_CA_CERTS": ca})
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
	cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
	require.NoError(t, err)
	g := &Gateway{Runner: runner, Cache: cache, Timeout: 60 * time.Second, Slots: make(chan struct{}, 1)}
	clientEnv := "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /home/u/CLIENT-DIR\n - Is a git repository: true\n - Platform: linux\n - Shell: bash\n"
	body, _ := json.Marshal(Object{"model": "claude-sonnet-4-6", "max_tokens": 64,
		"system": []any{Object{"type": "text", "text": "You are terse.\n\n" + clientEnv}},
		"messages": []any{
			Object{"role": "user", "content": []any{Object{"type": "text", "text": "<system-reminder>\nAs you answer the user's questions, you can use the following context:\n# userEmail\nclient@example.com\n</system-reminder>\n"}, Object{"type": "text", "text": "<system-reminder>\nToday's date is 2020-01-01.\n</system-reminder>\n"}, Object{"type": "text", "text": "You are powered by the model named Client. The exact model ID is client-model-x. Assistant knowledge cutoff is May 2026.\n\n<total_tokens>4242 tokens left</total_tokens>"}, Object{"type": "text", "text": "question"}}},
		}})
	policy := `{"relay_mode":"native","replace_client_attachments":["environment","model","date","total_tokens_reminder","session_context"]}`
	for i := 0; i < 2; i++ {
		req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(string(body)))
		req.Header.Set(policyHeader, policy)
		res := httptest.NewRecorder()
		g.ServeHTTP(res, req)
		require.Equal(t, 200, res.Code, res.Body.String())
		assert.Contains(t, res.Body.String(), "REPLACED_OK")
	}
	mu.Lock()
	defer mu.Unlock()
	// The rendering run answered locally: upstream saw the two requests only.
	require.Len(t, wires, 2)
	system, _ := json.Marshal(wires[0]["system"])
	messages, _ := json.Marshal(wires[0]["messages"])
	all := string(system) + string(messages)
	// The Worker's Claude Code renders no session context here (no CLAUDE.md,
	// git or account email), so the client's is removed.
	for _, gone := range []string{"CLIENT-DIR", "client-model-x", "4242 tokens left", "2020-01-01", "client@example.com"} {
		assert.NotContains(t, all, gone)
	}
	workspace, _ := json.Marshal(filepath.Join(root, "cache", "workspace"))
	assert.Contains(t, string(system), strings.Trim(string(workspace), `"`), "the Worker's own working directory, where the client's was")
	assert.Contains(t, string(system), "You are terse.")
	assert.Contains(t, string(messages), "The exact model ID is claude-sonnet-4-6.")
	assert.Contains(t, string(messages), "15000000 tokens left")
	assert.Contains(t, string(messages), "Today's date is "+time.Now().Format("2006-01-02")+".")
	assert.Contains(t, string(messages), "question")
	// Same bytes on the next turn: the cached rendering keeps the prompt cache prefix.
	system2, _ := json.Marshal(wires[1]["system"])
	messages2, _ := json.Marshal(wires[1]["messages"])
	assert.Equal(t, string(system), string(system2))
	assert.Equal(t, string(messages), string(messages2))
}
