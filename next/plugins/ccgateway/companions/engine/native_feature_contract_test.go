package engine

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// A missing executable makes accidental admission observable as a failure,
// while the private upstream independently proves rejected bodies never run.
func TestNativeFeatureHTTPRefusals(t *testing.T) {
	var calls atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		http.Error(w, "rejected request reached upstream", http.StatusInternalServerError)
	}))
	defer upstream.Close()
	root := t.TempDir()
	cache, err := newCache(filepath.Join(root, "cache"), 1<<20)
	require.NoError(t, err)
	runner := &Runner{CLI: filepath.Join(root, "must-not-launch"), Version: "2.1.296", Work: root, Env: nativeProbeEnv(root, upstream.URL)}
	gateway := &Gateway{Runner: runner, Cache: cache, Timeout: 5 * time.Second, Slots: make(chan struct{}, 1)}
	definition := Object{"name": "lookup", "input_schema": Object{"type": "object"}}
	cases := []struct {
		name     string
		patch    Object
		fragment string
	}{
		{"advisor", Object{"tools": []any{Object{"type": "advisor_20260301", "name": "advisor", "model": "claude-opus-5-5", "max_tokens": 2048}}}, "not supported"},
		{"code-execution", Object{"tools": []any{Object{"type": "code_execution_20250825", "name": "code_execution"}}}, "provider execution requires trusted resource output registration"},
		{"remote-mcp", Object{"mcp_servers": []any{Object{"type": "url", "url": "https://fixture.invalid/sse", "name": "fixture"}}}, "not supported"},
		{"typed-toolset", Object{"tools": []any{Object{"type": "computer_toolset_20260801"}}}, "not supported"},
		{"typed-toolset-history", Object{"tools": []any{Object{"type": "computer_toolset_20260801"}}, "messages": []any{user("fixture"), Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_set", "name": "screenshot", "toolset_name": "computer", "input": Object{}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_set", "toolset_name": "computer", "content": "fixture"}}}}}, "not supported"},
		{"compaction-history", Object{"messages": []any{user("fixture"), Object{"role": "assistant", "content": []any{Object{"type": "compaction", "content": "fixture summary", "signature": "fixture-signature"}}}, user("continue")}}, "not supported"},
		{"inline-addition", Object{"tools": []any{definition}, "messages": []any{user("fixture"), Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_reference", "name": "lookup"}}}}}}, "inline tool definitions is not supported"},
		{"container", Object{"container": Object{"id": "container_fixture"}}, "resource ownership verification unavailable"},
		{"fallback-credit", Object{"fallback_credit_token": "fixture"}, "not supported"},
		{"assistant-prefill", Object{"messages": []any{user("fixture"), Object{"role": "assistant", "content": "partial"}}}, "not supported"},
	}
	for _, tc := range cases {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/stream=%t", tc.name, stream), func(t *testing.T) {
				body := Object{"model": "claude-sonnet-4-6", "max_tokens": 64, "stream": stream, "messages": []any{user("fixture")}}
				for k, v := range tc.patch {
					body[k] = v
				}
				raw, err := json.Marshal(body)
				require.NoError(t, err)
				req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(raw))
				req.Header.Set(policyHeader, `{"relay_mode":"native"}`)
				req.Header.Set("Anthropic-Beta", "advisor-tool-2026-03-01,inline-tools-2026-09-15,compact-2026-09-04")
				res := httptest.NewRecorder()
				gateway.ServeHTTP(res, req)
				assert.Equal(t, http.StatusBadRequest, res.Code, res.Body.String())
				assert.Contains(t, res.Body.String(), "invalid_request_error")
				assert.Contains(t, res.Body.String(), tc.fragment)
				assert.Zero(t, calls.Load())
			})
		}
	}
}

func nativeFeatureGatewayFixture(t *testing.T, handler http.HandlerFunc) (*Gateway, *httptest.Server) {
	t.Helper()
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated native feature tests")
	}
	version, err := checkVersion(cli)
	require.NoError(t, err)
	root := t.TempDir()
	plugin, err := extractMod(root)
	require.NoError(t, err)
	upstream := httptest.NewTLSServer(handler)
	t.Cleanup(upstream.Close)
	ca := filepath.Join(root, "fixture-ca.pem")
	require.NoError(t, os.WriteFile(ca, pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: upstream.Certificate().Raw}), 0600))
	env := envWith(nativeProbeEnv(root, upstream.URL), map[string]string{"NODE_EXTRA_CA_CERTS": ca})
	cache, err := newCache(filepath.Join(root, "cache"), 8<<20)
	require.NoError(t, err)
	t.Logf("isolated real CLI=%s; local TLS upstream; fake credentials", version)
	return &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 1)}, upstream
}

// This proves input document and output citation association in one request.
// It deliberately makes no claim that the CLI replays historical citations.
func TestRealCLINativeDocumentCitationResponse(t *testing.T) {
	for _, sourceName := range []string{"text", "content", "pdf-base64", "pdf-url"} {
		t.Run(sourceName, func(t *testing.T) {
			for _, stream := range []bool{false, true} {
				t.Run(fmt.Sprint(stream), func(t *testing.T) {
					document := Object{"type": "document", "source": Object{"type": "text", "media_type": "text/plain", "data": "DOCUMENT_SENTINEL"}, "title": "Fixture", "citations": Object{"enabled": true}}
					pdf := messageProbePDF()
					switch sourceName {
					case "content":
						document["source"] = Object{"type": "content", "content": []any{Object{"type": "text", "text": "DOCUMENT_SENTINEL"}}}
					case "pdf-base64":
						document["source"] = Object{"type": "base64", "media_type": "application/pdf", "data": base64.StdEncoding.EncodeToString(pdf)}
					}
					var calls atomic.Int64
					var assetCalls atomic.Int64
					captured := make(chan passthroughWire, 8)
					var gateway *Gateway
					var upstream *httptest.Server
					gateway, upstream = nativeFeatureGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
						if r.URL.Path == "/fixture.pdf" {
							assetCalls.Add(1)
							w.Header().Set("Content-Type", "application/pdf")
							_, err := w.Write(pdf)
							assert.NoError(t, err)
							return
						}
						if !strings.HasSuffix(r.URL.Path, "/messages") {
							fmt.Fprint(w, `{}`)
							return
						}
						calls.Add(1)
						raw, err := io.ReadAll(r.Body)
						require.NoError(t, err)
						wire, err := decodeObject(raw)
						require.NoError(t, err)
						captured <- passthroughWire{header: r.Header.Clone(), body: wire, raw: raw}
						assert.True(t, messageProbeContainsBlock(wire, document), "document source/title/citations must remain associated")
						if sourceName == "pdf-url" {
							// The fake provider fetches the forwarded local URL, never a public asset.
							asset, err := upstream.Client().Get(upstream.URL + "/fixture.pdf")
							require.NoError(t, err)
							data, err := io.ReadAll(asset.Body)
							require.NoError(t, err)
							require.NoError(t, asset.Body.Close())
							assert.Equal(t, pdf, data)
						}
						writeDocumentProbeReply(w, str(wire, "model"), sourceName == "text")
					})
					if sourceName == "pdf-url" {
						document["source"] = Object{"type": "url", "url": upstream.URL + "/fixture.pdf"}
					}
					raw, err := json.Marshal(Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "stream": stream, "messages": []any{Object{"role": "user", "content": []any{document, Object{"type": "text", "text": "cite the fixture"}}}}})
					require.NoError(t, err)
					req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(raw))
					req.Header.Set(policyHeader, `{"relay_mode":"native"}`)
					res := httptest.NewRecorder()
					gateway.ServeHTTP(res, req)
					var wires []passthroughWire
					for len(captured) > 0 {
						wires = append(wires, <-captured)
					}
					saveNativeComparison(t, gateway.Runner.Version, raw, wires, res)
					require.Equal(t, http.StatusOK, res.Code, res.Body.String())
					assert.Equal(t, int64(1), calls.Load())
					if sourceName == "pdf-url" {
						assert.GreaterOrEqual(t, assetCalls.Load(), int64(1))
						t.Logf("source=%s forwarded as document URL; fake-provider local TLS asset fetches=%d", sourceName, assetCalls.Load())
					} else {
						t.Logf("source=%s source/title/citations preserved in upstream document block", sourceName)
					}
					if sourceName != "text" {
						assert.Contains(t, res.Body.String(), "DOCUMENT_PROBE_OK")
						if stream {
							assert.Contains(t, res.Body.String(), "event: message_stop")
						}
						return
					}
					citation := Object{"type": "char_location", "cited_text": "DOCUMENT_SENTINEL", "document_index": 0, "document_title": "Fixture", "start_char_index": 0, "end_char_index": 17}
					if !stream {
						answer, err := decodeObject(res.Body.Bytes())
						require.NoError(t, err)
						content := answer["content"].([]any)
						require.Len(t, content, 1)
						block := content[0].(Object)
						assert.Equal(t, "DOCUMENT_PROBE_OK", block["text"])
						assert.Equal(t, normalizeJSON(t, []any{citation}), normalizeJSON(t, block["citations"]))
					} else {
						seen := false
						for _, line := range strings.Split(res.Body.String(), "\n") {
							if !strings.HasPrefix(line, "data: ") {
								continue
							}
							event, err := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
							require.NoError(t, err)
							delta, _ := event["delta"].(Object)
							if str(delta, "type") == "citations_delta" {
								assert.Equal(t, normalizeJSON(t, citation), normalizeJSON(t, delta["citation"]))
								seen = true
							}
						}
						assert.True(t, seen, "citation SSE event missing")
						assert.Contains(t, res.Body.String(), "DOCUMENT_PROBE_OK")
						assert.Contains(t, res.Body.String(), "event: message_stop")
					}
				})
			}
		})
	}
}

func TestRealCLINativeFineGrainedToolStream(t *testing.T) {
	var calls atomic.Int64
	captured := make(chan passthroughWire, 8)
	gateway, _ := nativeFeatureGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{}`)
			return
		}
		calls.Add(1)
		assert.Contains(t, r.Header.Get("Anthropic-Beta"), "fine-grained-tool-streaming-2025-05-14")
		raw, err := io.ReadAll(r.Body)
		require.NoError(t, err)
		wire, err := decodeObject(raw)
		require.NoError(t, err)
		captured <- passthroughWire{header: r.Header.Clone(), body: wire, raw: raw}
		w.Header().Set("Content-Type", "text/event-stream")
		send := func(e Object) {
			b, err := json.Marshal(e)
			require.NoError(t, err)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(e, "type"), b)
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
		send(Object{"type": "message_start", "message": Object{"id": "msg_native_feature_stream", "type": "message", "role": "assistant", "model": wire["model"], "content": []any{}, "usage": Object{"input_tokens": 2, "output_tokens": 0}}})
		send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "tool_use", "id": "toolu_native_feature", "name": "mcp__ccgateway__lookup", "input": Object{}}})
		for _, part := range []string{`{"value":"中文`, `\nline","n":7}`} {
			send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": part}})
		}
		send(Object{"type": "content_block_stop", "index": 0})
		send(Object{"type": "message_delta", "delta": Object{"stop_reason": "tool_use"}, "usage": Object{"output_tokens": 4}})
		send(Object{"type": "message_stop"})
	})
	body := Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "stream": true, "tools": []any{Object{"name": "lookup", "input_schema": Object{"type": "object", "properties": Object{"value": Object{"type": "string"}, "n": Object{"type": "integer"}}}}}, "messages": []any{user("call fixture")}}
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(raw))
	req.Header.Set(policyHeader, `{"relay_mode":"native"}`)
	req.Header.Set("Anthropic-Beta", "fine-grained-tool-streaming-2025-05-14")
	res := httptest.NewRecorder()
	gateway.ServeHTTP(res, req)
	var wires []passthroughWire
	for len(captured) > 0 {
		wires = append(wires, <-captured)
	}
	saveNativeComparison(t, gateway.Runner.Version, raw, wires, res)
	require.Equal(t, http.StatusOK, res.Code, res.Body.String())
	var parts strings.Builder
	toolName := ""
	for _, line := range strings.Split(res.Body.String(), "\n") {
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		event, err := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
		require.NoError(t, err)
		if block, ok := event["content_block"].(Object); ok {
			toolName = str(block, "name")
		}
		if delta, ok := event["delta"].(Object); ok && str(delta, "type") == "input_json_delta" {
			parts.WriteString(str(delta, "partial_json"))
		}
	}
	var input Object
	require.NoError(t, json.Unmarshal([]byte(parts.String()), &input), res.Body.String())
	assert.Equal(t, "lookup", toolName)
	assert.Equal(t, "中文\nline", input["value"])
	assert.Equal(t, float64(7), input["n"])
	assert.Contains(t, res.Body.String(), "event: message_stop")
	assert.Equal(t, int64(1), calls.Load())
}

// Exercise every public Files/Skills method through the current fixed-route
// parser and real management HTTP transport, with fake credentials and TLS.
func TestNativeFeatureResourceMethods(t *testing.T) {
	cases := []struct{ method, path string }{
		{"POST", "/v1/files"}, {"GET", "/v1/files"}, {"GET", "/v1/files/file_fixture"},
		{"GET", "/v1/files/file_fixture/content"}, {"DELETE", "/v1/files/file_fixture"},
		{"POST", "/v1/skills"}, {"GET", "/v1/skills"}, {"GET", "/v1/skills/skill_fixture"},
		{"DELETE", "/v1/skills/skill_fixture"}, {"POST", "/v1/skills/skill_fixture/versions"},
		{"GET", "/v1/skills/skill_fixture/versions"}, {"GET", "/v1/skills/skill_fixture/versions/version_fixture"},
		{"DELETE", "/v1/skills/skill_fixture/versions/version_fixture"},
	}
	for _, tc := range cases {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			var calls atomic.Int64
			var payload []byte
			if tc.method == http.MethodPost {
				payload = []byte("--fixture\r\nContent-Disposition: form-data; name=\"file\"; filename=\"fixture.txt\"\r\n\r\nfixture\r\n--fixture--\r\n")
			}
			responseBody := []byte(`{"id":"fixture","object":"list","data":[]}`)
			if strings.HasSuffix(tc.path, "/content") {
				responseBody = []byte{0, 1, 2, 255}
			}
			up := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				assert.Equal(t, tc.method, r.Method)
				assert.Equal(t, tc.path, r.URL.Path)
				assert.Equal(t, "fixture-secret", r.Header.Get("X-Api-Key"))
				assert.Empty(t, r.Header.Get("Authorization"))
				got, err := io.ReadAll(r.Body)
				require.NoError(t, err)
				assert.Equal(t, string(payload), string(got))
				w.Header().Set("Content-Type", "application/octet-stream")
				w.Write(responseBody)
			}))
			defer up.Close()
			r := httptest.NewRequest(tc.method, resourcePrefix+tc.path, bytes.NewReader(payload))
			if len(payload) > 0 {
				r.Header.Set("Content-Type", "multipart/form-data; boundary=fixture")
			}
			route, err := parseResourceRoute(r)
			require.NoError(t, err)
			op := &resourceExchange{route: route, dir: t.TempDir(), limit: 4096, budget: &resourceSpoolBudget{limit: 8192}}
			if route.upload {
				op.input, err = spoolResource(context.Background(), op.dir, io.NopCloser(bytes.NewReader(payload)), int64(len(payload)), op.limit, op.budget)
				require.NoError(t, err)
				defer op.input.Close()
			}
			env := []string{"ANTHROPIC_BASE_URL=" + up.URL}
			auth := &resourceAuthorization{method: "api_key", header: http.Header{"X-Api-Key": {"fixture-secret"}}}
			response, err := resourceManagementHTTP(context.Background(), env, op, auth, resourceManagementTestClient(t, up, env))
			require.NoError(t, err)
			got, err := io.ReadAll(response.body)
			require.NoError(t, err)
			require.NoError(t, response.body.Close())
			assert.Equal(t, 200, response.status)
			assert.Equal(t, responseBody, got)
			assert.Equal(t, int64(1), calls.Load())
		})
	}
}
