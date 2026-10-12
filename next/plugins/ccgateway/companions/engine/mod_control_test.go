package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeModGateNeverSubmitsAfterCancellation(t *testing.T) {
	for _, ready := range []bool{false, true} {
		t.Run(fmt.Sprintf("ready=%t", ready), func(t *testing.T) {
			c, err := startModControl(&runConfig{}, "http://127.0.0.1:8787")
			require.NoError(t, err)
			t.Cleanup(c.Close)
			if ready {
				r := httptest.NewRequest(http.MethodPost, c.URL, strings.NewReader(`{"event":"ready","version":"ccgateway-v3"}`))
				r.RemoteAddr = "127.0.0.1:1234"
				r.Header.Set("Authorization", "Bearer "+c.token)
				w := httptest.NewRecorder()
				c.ServeHTTP(w, r)
				require.Equal(t, http.StatusOK, w.Code)
			}
			ctx, cancel := context.WithCancel(t.Context())
			cancel()
			reader, writer, err := os.Pipe()
			require.NoError(t, err)
			t.Cleanup(func() { _ = reader.Close(); _ = writer.Close() })
			s := &cliSession{ctx: ctx, initID: "init", cfg: &runConfig{native: &nativeRunState{}, control: c}, proc: &cliProcess{stdin: writer}}
			err = s.onControlResponse(Object{"response": Object{"request_id": "init", "subtype": "success"}})
			require.ErrorIs(t, err, context.Canceled)
			require.False(t, s.initialized)
			require.NoError(t, writer.Close())
			data, err := io.ReadAll(reader)
			require.NoError(t, err)
			require.Empty(t, data)
		})
	}
}

func TestModControlAcknowledgementsAndIsolation(t *testing.T) {
	c, err := startModControl(&runConfig{env: map[string]string{}, systems: []string{"one", "two"}}, "http://127.0.0.1:8787")
	require.NoError(t, err)
	defer c.Close()
	call := func(token, remote, body string) int {
		r := httptest.NewRequest("POST", c.URL, strings.NewReader(body))
		r.RemoteAddr = remote
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		require.True(t, serveModControl(w, r), "callback route missing")
		return w.Code
	}
	assert.Equal(t, 404, call("wrong", "127.0.0.1:1234", `{"event":"ready","version":"ccgateway-v3"}`))
	assert.Equal(t, 404, call(c.token, "10.0.0.2:1234", `{"event":"ready","version":"ccgateway-v3"}`))
	require.Error(t, c.verify(), "missing ready must be rejected")
	assert.Equal(t, 400, call(c.token, "127.0.0.1:1234", `{"event":"ready","version":"ccgateway-v2"}`))
	assert.False(t, c.ready, "old Mod protocol must not unlock native input")
	assert.Equal(t, 400, call(c.token, "127.0.0.1:1234", `{"event":"system","systems":2}`))
	assert.Equal(t, 400, call(c.token, "127.0.0.1:1234", `{"event":"ready","version":"ccgateway-v3"} {}`))
	require.Equal(t, 200, call(c.token, "127.0.0.1:1234", `{"event":"ready","version":"ccgateway-v3"}`))
	require.NoError(t, c.waitReady(t.Context()))
	require.Error(t, c.verify(), "missing system acknowledgement must be rejected")
	assert.Equal(t, 400, call(c.token, "127.0.0.1:1234", `{"event":"system","systems":1}`))
	require.Equal(t, 200, call(c.token, "127.0.0.1:1234", `{"event":"system","systems":2}`))
	require.NoError(t, c.verify())
	c.Close()
	assert.False(t, serveModControl(httptest.NewRecorder(), httptest.NewRequest("GET", c.URL, nil)), "closed route retained")
}

func TestModConfigurationLargeSystemsAndDeferredTools(t *testing.T) {
	text := strings.Repeat("large system ", 20000)
	c, err := startModControl(&runConfig{env: map[string]string{"CCGATEWAY_TOOL_SEARCH": "1"}, systems: []string{text}, deferral: []byte(`{"mcp__ccgateway__echo":true}`)}, "")
	require.NoError(t, err)
	defer c.Close()
	r, err := http.NewRequestWithContext(t.Context(), "GET", c.URL, nil)
	require.NoError(t, err)
	r.Header.Set("Authorization", "Bearer "+c.token)
	res, err := http.DefaultClient.Do(r)
	require.NoError(t, err)
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	require.NoError(t, err)
	assert.Equal(t, 200, res.StatusCode)
	assert.Contains(t, string(data), text)
	assert.Contains(t, string(data), `"mcp__ccgateway__echo":true`)
}

func TestModExtraBodyKeepsRawNumbersUntilCLI(t *testing.T) {
	first := map[string]json.RawMessage{
		"output_config": json.RawMessage(`{"format":{"type":"json_schema","schema":{"const":9007199254740993,"description":"<>&"}}}`),
		"temperature":   json.RawMessage(`0.2500`),
		"tool_choice":   json.RawMessage(`{"type":"auto","disable_parallel_tool_use":false}`),
	}
	rest := map[string]json.RawMessage{"output_config": first["output_config"], "temperature": first["temperature"]}
	control, err := startModControl(&runConfig{passthrough: &passthroughConfig{First: first, Rest: rest}}, "http://127.0.0.1:8787")
	require.NoError(t, err)
	t.Cleanup(control.Close)
	config, err := decodeObject(control.config)
	require.NoError(t, err)
	bodies, ok := config["passthrough"].(Object)
	require.True(t, ok)
	for name, fields := range map[string]map[string]json.RawMessage{"first": first, "rest": rest} {
		body, ok := bodies[name].(string)
		require.True(t, ok, "Mod must receive raw JSON text, not parsed generation fields")
		var received map[string]json.RawMessage
		require.NoError(t, json.Unmarshal([]byte(body), &received))
		assert.Len(t, received, len(fields))
		assert.Equal(t, "0.2500", string(received["temperature"]))
		assert.Contains(t, string(received["output_config"]), "9007199254740993")
		if name == "first" {
			assert.JSONEq(t, string(first["tool_choice"]), string(received["tool_choice"]))
		} else {
			assert.NotContains(t, received, "tool_choice")
		}
	}
}
