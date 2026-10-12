package engine

import (
	"bytes"
	"context"
	"encoding/json"
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

const inlineMetadataBetas = "mid-conversation-system-clear-at-2026-08-21,mid-conversation-output-config-2026-07-01"

func TestInlineMetadataWireCopyAndHistoryIdentity(t *testing.T) {
	body := basic()
	body["messages"] = []any{
		Object{"role": "user", "content": "same"},
		Object{"role": "assistant", "content": "answer"},
		Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "high"}},
		Object{"role": "user", "content": "same"},
		Object{"role": "system", "content": "temporary permissions", "clear_at": "next_user_message"},
	}
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	req, err := parsePolicyRequest(raw, http.Header{})
	require.NoError(t, err)
	require.Len(t, req.Messages, 5)
	assert.Equal(t, []int{0, 1, 2, 3, 4}, req.origin)
	assert.Equal(t, 3, req.pendingStart())
	before := fingerprints(req.Messages)
	wire := req.wireMessage(req.Messages[2])
	assert.True(t, wire.directiveOnly())
	assert.NotNil(t, wire.Content, "directive-only content must stay an empty array")
	assert.Equal(t, `{"effort":"high"}`, string(wire.OutputConfig))
	wire.OutputConfig[0] = '['
	assert.Equal(t, `{"effort":"high"}`, string(req.Messages[2].OutputConfig), "wire mutation must not corrupt the client history")
	wire = req.wireMessage(req.Messages[4])
	assert.Equal(t, `"next_user_message"`, string(wire.ClearAt))
	wire.ClearAt[0] = '['
	assert.Equal(t, `"next_user_message"`, string(req.Messages[4].ClearAt))
	assert.Equal(t, before, fingerprints(req.Messages))
	req.Messages[2].OutputConfig = json.RawMessage(`{"effort":"medium"}`)
	assert.NotEqual(t, before, fingerprints(req.Messages), "per-turn effort changes must not reuse incompatible history")
	assert.Equal(t, "same", str(req.Messages[0].Content[0], "text"))
	assert.Equal(t, "same", str(req.Messages[3].Content[0], "text"), "repeated client turns must remain separate")
}

func TestInlineMetadataAdmissionAndFingerprint(t *testing.T) {
	body := basic()
	body["messages"] = []any{Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "high"}}, Object{"role": "user", "content": "q"}, Object{"role": "system", "content": "temporary", "clear_at": "next_user_message"}}
	raw, _ := json.Marshal(body)
	headers := http.Header{"Anthropic-Beta": []string{inlineMetadataBetas}}
	req, err := parsePolicyRequest(raw, headers)
	if err != nil {
		t.Fatal(err)
	}
	if req.pendingStart() != 1 || len(req.Messages[0].OutputConfig) == 0 {
		t.Fatal("directive position lost")
	}
	withoutBeta, err := parsePolicyRequest(raw, http.Header{})
	require.NoError(t, err, "native inline controls do not use the old beta whitelist")
	assert.Empty(t, withoutBeta.Betas)
	assert.Equal(t, fingerprints(req.Messages), fingerprints(withoutBeta.Messages))
	legacy := headers.Clone()
	policy := defaultRequestPolicy()
	policy.AllowEffort = false
	legacy.Set(policyHeader, policyHeaders(policy).Get(policyHeader))
	withLegacyPolicy, err := parsePolicyRequest(raw, legacy)
	require.NoError(t, err)
	assert.Equal(t, fingerprints(req.Messages), fingerprints(withLegacyPolicy.Messages), "legacy policy must not erase inline metadata")
	before := fingerprints(req.Messages)
	req.Messages[2].ClearAt = json.RawMessage(`"never"`)
	if digest(before) == digest(fingerprints(req.Messages)) {
		t.Fatal("clear_at missing from fingerprint")
	}
	for _, bad := range []Object{
		{"role": "system", "content": "x", "clear_at": "next_user_message", "output_config": Object{"effort": "high"}},
		{"role": "system", "content": []any{}, "output_config": Object{}},
		{"role": "system", "content": "x", "output_config": Object{"format": Object{}}},
	} {
		body["messages"] = []any{Object{"role": "user", "content": "q"}, bad}
		raw, _ = json.Marshal(body)
		_, err := parsePolicyRequest(raw, headers)
		require.Error(t, err, "accepted incompatible inline metadata: %v", bad)
	}
}

func TestInlineMetadataEffectiveEffort(t *testing.T) {
	user := Object{"role": "user", "content": "new input"}
	answer := Object{"role": "assistant", "content": "answer"}
	call := Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_inline", "name": "read", "input": Object{}}}}
	result := Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_inline", "content": "tool output"}}}
	low := Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "low"}}
	medium := Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "medium"}}
	for _, tc := range []struct {
		name     string
		messages []any
		want     string
	}{
		{"after-new-input", []any{user, low}, "low"},
		{"before-new-input", []any{low, user}, "low"},
		{"between-users", []any{user, low, user}, "low"},
		{"last-effective", []any{user, low, answer, medium, user}, "medium"},
		{"null-does-not-reset", []any{user, low, Object{"role": "system", "content": "retained", "output_config": nil}, Object{"role": "system", "content": "also retained", "output_config": Object{"effort": nil}}}, "low"},
		{"tool-loop-holds-effort", []any{user, low, call, result}, "low"},
		{"after-tool-result-waits", []any{user, call, result, low}, "high"},
		{"before-tool-result-waits", []any{user, call, low, result}, "high"},
		{"later-tool-directive-waits", []any{user, medium, call, result, low}, "medium"},
		{"tool-directive-next-input", []any{user, call, result, low, answer, user}, "low"},
		{"tool-result-with-new-input", []any{user, call, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_inline", "content": "tool output"}, Object{"type": "text", "text": "new task"}}}, low}, "low"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body := basic()
			body["tools"] = []any{Object{"name": "read", "input_schema": Object{"type": "object"}}}
			body["messages"] = tc.messages
			body["output_config"] = Object{"effort": "high", "future": json.RawMessage(`9007199254740993`)}
			r := policyRequest(t, body)
			before := fingerprints(r.Messages)
			assert.Equal(t, tc.want, r.Effort)
			assert.Equal(t, tc.want, r.passthroughEffort())
			cfg, err := r.passthroughBodies()
			require.NoError(t, err)
			assert.JSONEq(t, `{"effort":"`+tc.want+`","future":9007199254740993}`, string(cfg.First["output_config"]))
			assert.Contains(t, string(cfg.First["output_config"]), `9007199254740993`)
			assert.Equal(t, cfg.First["output_config"], cfg.Rest["output_config"])
			assert.NotContains(t, cfg.First, "messages")
			assert.NotContains(t, cfg.Rest, "messages")
			assert.Equal(t, before, fingerprints(r.Messages))
		})
	}
}

func TestInlineMetadataClearAtProjection(t *testing.T) {
	for _, clear := range []string{"", "null", `"never"`, `"next_user_message"`} {
		for _, later := range []string{"none", "assistant", "user", "tool-result"} {
			t.Run(clear+"/"+later, func(t *testing.T) {
				messages := []Message{
					{Role: "user", Content: []Object{{"type": "text", "text": "user retained"}}},
					{Role: "system", Content: []Object{{"type": "text", "text": "ordinary retained"}}},
					{Role: "system", Content: []Object{{"type": "text", "text": "temporary permissions"}}, ClearAt: json.RawMessage(clear)},
				}
				if later != "none" {
					messages = append(messages, Message{Role: "assistant", Content: []Object{{"type": "text", "text": "answer retained"}}})
				}
				if later == "user" {
					messages = append(messages, Message{Role: "user", Content: []Object{{"type": "text", "text": "next retained"}}})
				}
				if later == "tool-result" {
					messages = append(messages, Message{Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "toolu_inline", "content": "tool retained"}}})
				}
				r := &Request{Messages: messages}
				before := fingerprints(r.Messages)
				p := &Prepared{SessionID: uuid()}
				p.seedRows(r, 0, len(messages)-1, "", "2.1.292")
				expired := clear == `"next_user_message"` && (later == "user" || later == "tool-result")
				assert.Equal(t, !expired, bytes.Contains(nativeBytes(p.Rows), []byte("temporary permissions")))
				groups, err := json.Marshal(r.systemGroups())
				require.NoError(t, err)
				assert.Equal(t, !expired, bytes.Contains(groups, []byte("temporary permissions")))
				assert.Contains(t, string(nativeBytes(p.Rows)), "ordinary retained")
				assert.Contains(t, string(nativeBytes(p.Rows)), "user retained")
				if later == "tool-result" {
					assert.Contains(t, string(nativeBytes(p.Rows)), "tool retained")
				}
				assert.Equal(t, before, fingerprints(r.Messages))
			})
		}
	}
}

func TestInlineMetadataClearAtSnapshotLifecycle(t *testing.T) {
	cache, err := newCache(t.TempDir(), 32<<20)
	require.NoError(t, err)
	branch := testBranch("inline-clear-at-lifecycle")
	prepare := func(messages []any) (*Request, *Prepared) {
		t.Helper()
		body := basic()
		body["messages"] = messages
		r := policyRequest(t, body)
		p, err := prepareHistory(r, cache, branch, t.TempDir(), "2.1.292")
		require.NoError(t, err)
		return r, p
	}
	finish := func(r *Request, p *Prepared, text string) Object {
		t.Helper()
		rows := append([]json.RawMessage(nil), p.Rows...)
		parent := p.LastUUID
		if texts := r.pendingSystems(); len(texts) > 0 {
			row, id := systemRow(texts, parent, p.SessionID, p.Work, "2.1.292")
			rows, parent = append(rows, row), id
		}
		answer := Message{Role: "assistant", Content: []Object{{"type": "text", "text": text}}}
		row, id := transcriptRow(answer, parent, p.SessionID, p.Work, "2.1.292", r.Model)
		p.NativeRows, p.NativeAll, p.NativeAnchor = append(rows, row), append(rows, row), id
		require.NoError(t, p.commit(r, Object{"id": "msg_" + text, "role": "assistant", "stop_reason": "end_turn", "content": answer.Content}, cache, branch.Logical, "", "2.1.292", time.Now()))
		return Object{"role": "assistant", "content": answer.Content}
	}
	assertCleared := func(p *Prepared) {
		t.Helper()
		assert.NotContains(t, string(nativeBytes(p.Rows)), "temporary permissions")
		assert.NotContains(t, string(nativeBytes(p.base)), "temporary permissions")
		data, err := os.ReadFile(p.Path)
		require.NoError(t, err)
		assert.NotContains(t, string(data), "temporary permissions")
		assert.Contains(t, string(data), "ordinary retained")
		assert.Contains(t, string(data), "first user")
		assert.Contains(t, string(data), "first answer")
	}
	base := []any{user("first user"), Object{"role": "system", "content": "ordinary retained"}, Object{"role": "system", "content": "temporary permissions", "clear_at": "next_user_message"}}
	r, p := prepare(base)
	base = append(base, finish(r, p, "first answer"))
	assert.Contains(t, string(nativeBytes(p.NativeRows)), "temporary permissions")
	require.Len(t, cache.entries, 1)
	for _, snapshot := range cache.entries {
		require.NotEmpty(t, snapshot.InlineSystemState)
	}
	second := append(append([]any(nil), base...), user("second user"))
	r, p = prepare(second)
	assert.Equal(t, "rebuild", p.Mode)
	assertCleared(p)
	second = append(second, finish(r, p, "second answer"))
	assert.NotContains(t, string(nativeBytes(p.NativeRows)), "temporary permissions")
	migrated := false
	for key, snapshot := range cache.entries {
		if len(snapshot.Hashes) != len(second) {
			continue
		}
		original := cache.get(key)
		legacy := *original
		legacy.InlineSystemState = ""
		require.NoError(t, cache.put(key, &legacy))
		_, imported := prepare(append(append([]any(nil), second...), user("legacy snapshot user")))
		assert.Equal(t, "rebuild", imported.Mode)
		assertCleared(imported)
		require.NoError(t, cache.put(key, original))
		migrated = true
		break
	}
	require.True(t, migrated)
	r, p = prepare(append(append([]any(nil), second...), user("third user")))
	assert.Equal(t, "prefix-hit", p.Mode)
	assertCleared(p)
	finish(r, p, "third answer")
	_, p = prepare(append(append([]any(nil), second...), user("fork user")))
	assert.Equal(t, "fork", p.Mode)
	assertCleared(p)
	_, p = prepare(append(append([]any(nil), base...), user("rollback user")))
	assert.Equal(t, "rebuild", p.Mode)
	assertCleared(p)
	cache, err = newCache(cache.dir, 32<<20)
	require.NoError(t, err)
	_, p = prepare(append(append([]any(nil), second...), user("restart user")))
	assert.Equal(t, "fork", p.Mode)
	assertCleared(p)
	cache, err = newCache(t.TempDir(), 32<<20)
	require.NoError(t, err)
	_, p = prepare(append(append([]any(nil), second...), user("cold import user")))
	assert.Equal(t, "rebuild", p.Mode)
	assertCleared(p)
}

func TestScopedNativeResumeKeepsCompletedWork(t *testing.T) {
	for _, mode := range []string{"complete", "interleaved", "wrong-origin", "imported", "missing-result", "duplicate-identity"} {
		t.Run(mode, func(t *testing.T) {
			dir, sid := t.TempDir(), uuid()
			p := &Prepared{SessionID: sid, dir: dir, Path: filepath.Join(dir, sid+".jsonl")}
			input, inputID := transcriptRow(Message{Role: "user", Content: []Object{{"type": "text", "text": "SAME_TEXT"}}}, "", sid, dir, "2.1.296", "fixture-model")
			p.InputUUID = inputID
			attachment, attachmentID := systemRow([]string{"SAME_TEXT", "SAME_TEXT"}, inputID, sid, dir, "2.1.296")
			tools := []Object{{"type": "tool_use", "name": "ToolSearch", "id": "toolu_one", "input": Object{"query": "one"}}, {"type": "tool_use", "name": "ToolSearch", "id": "toolu_two", "input": Object{"query": "two"}}}
			results := []Object{{"type": "tool_result", "tool_use_id": "toolu_one", "content": "SAME_TEXT"}, {"type": "tool_result", "tool_use_id": "toolu_two", "content": "SAME_TEXT"}}
			first, parent := transcriptRow(Message{Role: "assistant", Content: tools}, attachmentID, sid, dir, "2.1.296", "fixture-model")
			var response Object
			require.NoError(t, json.Unmarshal(first, &response))
			messageID := str(response["message"].(Object), "id")
			rows := []json.RawMessage{input, attachment, first}
			if mode == "interleaved" {
				response["message"].(Object)["content"] = tools[:1]
				rows[2], _ = json.Marshal(response)
				row, id := transcriptRow(Message{Role: "user", Content: results[:1]}, parent, sid, dir, "2.1.296", "fixture-model")
				rows, parent = append(rows, row), id
				row, id = transcriptRow(Message{Role: "assistant", Content: tools[1:]}, parent, sid, dir, "2.1.296", "fixture-model")
				require.NoError(t, json.Unmarshal(row, &response))
				response["message"].(Object)["id"] = messageID
				row, _ = json.Marshal(response)
				rows, parent = append(rows, row), id
				results = results[1:]
			}
			if mode == "missing-result" {
				results = results[:1]
			}
			row, resultID := transcriptRow(Message{Role: "user", Content: results}, parent, sid, dir, "2.1.296", "fixture-model")
			rows = append(rows, row)
			switch mode {
			case "wrong-origin":
				var own Object
				require.NoError(t, json.Unmarshal(attachment, &own))
				own["attachment"].(Object)["hookName"] = "business"
				rows[1], _ = json.Marshal(own)
			case "imported":
				p.Rows = []json.RawMessage{attachment}
			case "duplicate-identity":
				rows = append(rows, attachment)
			}
			require.NoError(t, writeNative(p.Path, rows))
			answer := Object{"id": messageID, "content": tools}
			view := &Request{Native: map[string]bool{"ToolSearch": true}, Tools: []Tool{{Name: "ToolSearch"}}}
			pending, id, err := p.resumeScopedTurn(nil, attachmentID, []string{"SAME_TEXT", "SAME_TEXT"}, []string{"SAME_TEXT"}, answer, view)
			after, readErr := readNativeFile(p.Path)
			require.NoError(t, readErr)
			if mode != "complete" && mode != "interleaved" {
				require.Error(t, err)
				assert.Equal(t, rows, after, "invalid evidence must not change native history")
				return
			}
			require.NoError(t, err)
			assert.Equal(t, resultID, id)
			assert.Equal(t, results, pending.Content, "submit only results removed by resume-at, never replay a tool")
			assert.Equal(t, parent, p.Anchor)
			assert.Equal(t, 1, countSystemRows(after, []string{"SAME_TEXT"}))
			require.Len(t, after, len(rows))
			for i := range rows {
				if i != 1 {
					assert.Equal(t, rows[i], after[i], "completed assistant, usage and business/tool-result text must remain byte-for-byte")
				}
			}
		})
	}
}

func TestRealCLIInlineScopedFailureNeverReplays(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated scoped continuation failures")
	}
	version, err := checkVersion(cli)
	require.NoError(t, err)
	for _, mode := range []string{"cancel-boundary", "reject-boundary", "wrong-attachment", "resume-error", "cancel-resumed-call"} {
		t.Run(mode, func(t *testing.T) {
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			var mu sync.Mutex
			mainCalls, childCalls, pauses := 0, 0, 0
			control := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method == http.MethodPost {
					raw, err := io.ReadAll(r.Body)
					if !assert.NoError(t, err) {
						return
					}
					var ack Object
					require.NoError(t, json.Unmarshal(raw, &ack))
					if str(ack, "event") == "scope_pause" {
						mu.Lock()
						pauses++
						mu.Unlock()
						if mode == "cancel-boundary" {
							cancel()
						}
						if mode == "reject-boundary" {
							w.WriteHeader(http.StatusServiceUnavailable)
							return
						}
					}
					if str(ack, "event") == "scope_attachment" && mode == "wrong-attachment" {
						ack["detail"] = Object{"uuid": uuid()}
						raw, err = json.Marshal(ack)
						require.NoError(t, err)
					}
					r.Body = io.NopCloser(bytes.NewReader(raw))
				}
				assert.True(t, serveModControl(w, r))
			}))
			defer control.Close()
			provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				raw, err := io.ReadAll(r.Body)
				require.NoError(t, err)
				body, err := decodeObject(raw)
				require.NoError(t, err)
				tools, err := json.Marshal(body["tools"])
				require.NoError(t, err)
				if bytes.Contains(tools, []byte(`"web_search_20250305"`)) {
					mu.Lock()
					childCalls++
					mu.Unlock()
					writeNativeWebSearchFixture(t, w, str(body, "model"), []Object{
						{"type": "server_tool_use", "id": "srvtoolu_scope_failure", "name": "web_search", "input": Object{"query": "fixture"}},
						{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_scope_failure", "content": []any{Object{"type": "web_search_result", "title": "completed child result", "url": "https://example.com/fixture", "encrypted_content": "fixture-opaque"}}},
						{"type": "text", "text": "completed child result"},
					}, Object{"input_tokens": 20, "output_tokens": 8, "server_tool_use": Object{"web_search_requests": 1}})
					return
				}
				assert.Equal(t, "claude-opus-5-5", str(body, "model"), "a scope continuation is not a model fallback")
				mu.Lock()
				mainCalls++
				call := mainCalls
				mu.Unlock()
				if call == 1 {
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_scope_failure", "name": "WebSearch", "input": Object{"query": "fixture"}}})
					return
				}
				assert.NotContains(t, string(raw), "SCOPED_FAILURE_TEXT")
				assert.Contains(t, string(raw), "completed child result")
				if mode == "cancel-resumed-call" {
					cancel()
					<-r.Context().Done()
					return
				}
				w.WriteHeader(http.StatusServiceUnavailable)
				fmt.Fprint(w, `{"type":"error","error":{"type":"overloaded_error","message":"isolated resumed failure"}}`)
			}))
			defer provider.Close()
			root := t.TempDir()
			plugin, err := extractMod(root)
			require.NoError(t, err)
			cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
			require.NoError(t, err)
			g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, provider.URL), InternalBaseURL: control.URL}, Cache: cache, Timeout: 30 * time.Second, Slots: make(chan struct{}, 1)}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": []any{user("failure fixture"), Object{"role": "system", "content": "SCOPED_FAILURE_TEXT", "clear_at": "next_user_message"}}, "tools": []any{Object{"type": "web_search_20250305", "name": "web_search", "max_uses": 1}}, "fallbacks": []any{Object{"model": "claude-opus-4-8"}}}
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw)).WithContext(ctx)
			req.Header.Set("anthropic-beta", inlineMetadataBetas+",server-side-fallback-2026-07-01")
			setTestSession(t, req, "scoped-failure")
			res := httptest.NewRecorder()
			g.ServeHTTP(res, req)
			if strings.HasPrefix(mode, "cancel-") {
				assert.ErrorIs(t, ctx.Err(), context.Canceled)
				assert.Empty(t, res.Body.String(), "disconnected requests must not publish a completed answer")
			} else {
				assert.NotEqual(t, 200, res.Code, res.Body.String())
				if mode != "reject-boundary" {
					assert.Equal(t, "request", res.Header().Get(errorScopeHeader))
				}
			}
			mu.Lock()
			defer mu.Unlock()
			wantMain := 1
			if mode == "resume-error" || mode == "cancel-resumed-call" {
				wantMain = 2
			}
			assert.Equal(t, wantMain, mainCalls, "no model request or fallback may replay completed work")
			assert.Equal(t, 1, childCalls, "search work is not replayable")
			assert.Equal(t, 1, pauses, "continuation is bounded to one boundary")
			assert.Empty(t, cache.entries, "failed continuation must not commit a checkpoint")
		})
	}
}

func TestRealCLIInlineMetadataCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated inline metadata test")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("native CLI version: %s", version)
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	var mu sync.Mutex
	var wires []Object
	searchChildren := 0
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		tools, err := json.Marshal(body["tools"])
		if !assert.NoError(t, err) {
			return
		}
		if bytes.Contains(tools, []byte(`"web_search_20250305"`)) {
			mu.Lock()
			searchChildren++
			mu.Unlock()
			// An isolated native WebSearch side query; never a real provider.
			writeNativeWebSearchFixture(t, w, str(body, "model"), []Object{
				{"type": "server_tool_use", "id": "srvtoolu_inline_web", "name": "web_search", "input": Object{"query": "inline fixture"}},
				{"type": "web_search_tool_result", "tool_use_id": "srvtoolu_inline_web", "content": []any{Object{"type": "web_search_result", "title": "TOOL_RESULT_RETAINED", "url": "https://example.com/inline", "encrypted_content": "fixture-opaque"}}},
				{"type": "text", "text": "TOOL_RESULT_RETAINED"},
			}, Object{"input_tokens": 20, "output_tokens": 8, "server_tool_use": Object{"web_search_requests": 1}})
			return
		}
		for _, beta := range strings.Split(inlineMetadataBetas, ",") {
			if !strings.Contains(r.Header.Get("anthropic-beta"), beta) {
				t.Errorf("required beta missing on final wire: %s", beta)
			}
		}
		if bytes.Contains(raw, []byte("<ccgateway-request:")) {
			t.Error("scope marker leaked")
		}
		mu.Lock()
		wires = append(wires, body)
		call := len(wires)
		mu.Unlock()
		// Real responses have distinct IDs, including the hidden internal turn.
		response := httptest.NewRecorder()
		target := w
		defer func() {
			target.Header().Set("Content-Type", "text/event-stream")
			fmt.Fprint(target, strings.ReplaceAll(response.Body.String(), "msg_surface_probe", fmt.Sprintf("msg_inline_%d", call)))
		}()
		w = response
		messages, err := json.Marshal(body["messages"])
		if !assert.NoError(t, err) {
			return
		}
		later := bytes.Contains(messages, []byte("SECOND")) || bytes.Contains(messages, []byte("THIRD")) || bytes.Contains(messages, []byte("BRANCH")) || bytes.Contains(messages, []byte("toolu_inline_metadata"))
		if !later && bytes.Contains(messages, []byte("FIRST_SEARCH")) && !bytes.Contains(messages, []byte("toolu_inline_search")) {
			if bytes.Contains(messages, []byte("PERSISTENT_META_TEXT")) {
				assert.Contains(t, string(messages), "INLINE_META_TEXT", "scoped instruction must reach the first model request")
			}
			if bytes.Contains(messages, []byte("SAME_TEXT")) {
				assert.Equal(t, 3, bytes.Count(messages, []byte("INLINE_META_TEXT")), "user, persistent system, and scoped system must all reach the first request")
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "HIDDEN_SEARCH_PREFACE"}, {"type": "tool_use", "id": "toolu_inline_search", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__inline_probe"}}})
			return
		}
		if !later && bytes.Contains(messages, []byte("FIRST_WEB")) && !bytes.Contains(messages, []byte("toolu_inline_web")) {
			assert.Contains(t, string(messages), "INLINE_META_TEXT", "scoped instruction must reach the first model request")
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "WEB_SEARCH_PREFACE"}, {"type": "tool_use", "id": "toolu_inline_web", "name": "WebSearch", "input": Object{"query": "inline fixture"}}})
			return
		}
		if !later && (bytes.Contains(messages, []byte("FIRST_TOOL")) || bytes.Contains(messages, []byte("CLIENT_HANDOFF"))) && !bytes.Contains(messages, []byte("toolu_inline_metadata")) {
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_inline_metadata", "name": "mcp__ccgateway__inline_probe", "input": Object{}}})
			return
		}
		writeDocumentProbeReply(w, str(body, "model"), false)
	}))
	defer fake.Close()
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}
	gateway := func() *Gateway {
		cache, e := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
		if e != nil {
			t.Fatal(e)
		}
		return &Gateway{Runner: runner, Cache: cache, Timeout: 30 * time.Second, Slots: make(chan struct{}, 2), RequestLogDir: filepath.Join(t.TempDir(), "request-logs")}
	}
	for _, mode := range []string{"clear-at", "clear-at-tool-result", "clear-at-internal-search", "clear-at-internal-search-same-text", "clear-at-internal-search-handoff", "clear-at-internal-web-search", "clear-at-internal-web-search-stream", "effort-internal-search", "effort-text", "effort-only", "effort-between-users", "effort-after-assistant", "effort-long", "default-effort", "top-effort"} {
		t.Run(mode, func(t *testing.T) {
			g := gateway()
			internalSearch := strings.HasPrefix(mode, "clear-at-internal-search") || mode == "effort-internal-search"
			internalWebSearch := strings.HasPrefix(mode, "clear-at-internal-web-search")
			stream := strings.HasSuffix(mode, "-stream")
			directive := Object{"role": "system", "content": "INLINE_META_TEXT", "clear_at": "next_user_message"}
			// Use a nondefault effort: the CLI's generated "high" is not
			// evidence that the client's per-turn metadata survived.
			if mode == "effort-text" {
				directive = Object{"role": "system", "content": "INLINE_META_TEXT", "output_config": Object{"effort": "low"}}
			}
			if strings.HasPrefix(mode, "effort-") && mode != "effort-text" {
				directive = Object{"role": "system", "content": []any{}, "output_config": Object{"effort": "low"}}
			}
			messages := []any{Object{"role": "user", "content": "FIRST"}, directive}
			if strings.HasPrefix(mode, "clear-at") {
				messages = []any{Object{"role": "user", "content": "FIRST"}, Object{"role": "system", "content": "PERSISTENT_META_TEXT"}, directive}
			}
			if strings.HasPrefix(mode, "effort-") && mode != "effort-text" {
				messages = []any{directive, Object{"role": "user", "content": "FIRST"}}
			}
			if mode == "clear-at-tool-result" {
				messages[0] = user("FIRST_TOOL")
			}
			if internalSearch {
				messages[0] = user("FIRST_SEARCH")
				if mode == "effort-internal-search" {
					messages = []any{directive, user("FIRST_SEARCH")}
				}
			}
			if internalWebSearch {
				messages[0] = user("FIRST_WEB")
			}
			if mode == "clear-at-internal-search-same-text" {
				messages[0] = user("FIRST_SEARCH SAME_TEXT INLINE_META_TEXT")
				messages[1] = Object{"role": "system", "content": "PERSISTENT_META_TEXT\nINLINE_META_TEXT"}
			}
			if mode == "clear-at-internal-search-handoff" {
				messages[0] = user("FIRST_SEARCH CLIENT_HANDOFF")
			}
			post := func(label string, g *Gateway) Object {
				t.Helper()
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": messages, "stream": stream}
				if mode == "clear-at-tool-result" || internalSearch {
					body["tools"] = []any{Object{"name": "inline_probe", "defer_loading": internalSearch, "input_schema": Object{"type": "object"}}}
				}
				if internalWebSearch {
					body["tools"] = []any{Object{"type": "web_search_20250305", "name": "web_search", "max_uses": 1}}
				}
				if internalSearch || internalWebSearch {
					body["tool_choice"] = Object{"type": "auto", "disable_parallel_tool_use": true}
				}
				if mode == "top-effort" {
					body["output_config"] = Object{"effort": "high"}
				}
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				req.Header.Set("anthropic-beta", inlineMetadataBetas)
				if internalSearch {
					policy := defaultRequestPolicy()
					policy.ToolSearch = "true"
					req.Header.Set(policyHeader, policyHeaders(policy).Get(policyHeader))
				}
				setTestSession(t, req, "inline-metadata-fixture")
				res := httptest.NewRecorder()
				mu.Lock()
				before, childBefore := len(wires), searchChildren
				mu.Unlock()
				g.ServeHTTP(res, req)
				if res.Code != 200 {
					metadataSystemShape(t, g.RequestLogDir, nil, messages)
					t.Fatalf("%s HTTP%d %s", label, res.Code, res.Body.String())
				}
				var answer Object
				if stream {
					assert.Equal(t, 1, strings.Count(res.Body.String(), "event: message_start\n"))
					assert.Equal(t, 1, strings.Count(res.Body.String(), "event: message_stop\n"))
					answer = replaySSE(t, res.Body.String())
				} else {
					var e error
					answer, e = decodeObject(res.Body.Bytes())
					require.NoError(t, e)
				}
				mu.Lock()
				wire := wires[len(wires)-1]
				rounds, childCalls := len(wires)-before, searchChildren-childBefore
				firstWire := wires[before]
				mu.Unlock()
				if internalSearch || internalWebSearch {
					wantCalls, wantInput, wantOutput := 1, 20, 8
					if label == "new" {
						wantCalls, wantInput, wantOutput = 2, 40, 16
					}
					assert.Equal(t, wantCalls, rounds, "native continuation must not repeat completed calls")
					wantChildren := 0
					if internalWebSearch && label == "new" {
						wantChildren, wantInput, wantOutput = 1, 60, 24
						assert.Equal(t, 1, strings.Count(res.Body.String(), "WEB_SEARCH_PREFACE"), "partial text survives exactly once")
					}
					assert.Equal(t, wantChildren, childCalls, "completed search children must not replay")
					usage, _ := answer["usage"].(Object)
					assert.Equal(t, wantInput, tokenCount(usage["input_tokens"]))
					assert.Equal(t, wantOutput, tokenCount(usage["output_tokens"]))
					if internalWebSearch && label == "new" {
						serverUsage, _ := usage["server_tool_use"].(Object)
						assert.Equal(t, 1, tokenCount(serverUsage["web_search_requests"]))
					}
					assert.NotContains(t, res.Body.String(), "HIDDEN_SEARCH_PREFACE")
					choice, _ := firstWire["tool_choice"].(Object)
					assert.Equal(t, true, choice["disable_parallel_tool_use"])
					if label == "new" {
						choice, _ = wire["tool_choice"].(Object)
						assert.NotContains(t, choice, "disable_parallel_tool_use", "first-round control must not be reset by resume")
					}
				}
				if mode == "clear-at-internal-search-handoff" && label == "new" {
					assert.Equal(t, "tool_use", str(answer, "stop_reason"))
					blocks, err := historyContent(answer["content"])
					require.NoError(t, err)
					require.Len(t, blocks, 1)
					assert.Equal(t, "inline_probe", str(blocks[0], "name"))
					assert.Equal(t, "toolu_inline_metadata", str(blocks[0], "id"))
				}
				parsedBody, err := parsePolicyRequest(raw, req.Header)
				require.NoError(t, err)
				// Native CLI owns system wrapping; compare client text without
				// requiring the deleted relay to reconstruct block boundaries.
				for _, message := range parsedBody.Messages {
					if message.Role != "user" {
						continue
					}
					for _, block := range message.Content {
						if str(block, "type") != "text" {
							continue
						}
						found := false
						for _, value := range wire["messages"].([]any) {
							m := value.(map[string]any)
							if str(m, "role") != "user" {
								continue
							}
							blocks, err := historyContent(m["content"])
							require.NoError(t, err)
							for _, actual := range blocks {
								found = found || strings.Contains(str(actual, "text"), str(block, "text"))
							}
						}
						assert.True(t, found, "%s lost client user text", label)
					}
				}
				wireJSON, err := json.Marshal(wire)
				require.NoError(t, err)
				if mode == "clear-at-tool-result" && label != "new" {
					want := "TOOL_RESULT_RETAINED"
					if label == "rollback" || label == "new-cache-import" {
						want = "TOOL_RESULT_BRANCH_RETAINED"
					}
					assert.Contains(t, string(wireJSON), want)
					assert.Contains(t, string(wireJSON), "toolu_inline_metadata")
				}
				if strings.HasPrefix(mode, "clear-at") {
					foundPersistent := false
					for _, value := range wire["messages"].([]any) {
						m := value.(map[string]any)
						if str(m, "role") == "assistant" {
							break
						}
						content, err := json.Marshal(m["content"])
						require.NoError(t, err)
						foundPersistent = foundPersistent || str(m, "role") == "system" && bytes.Contains(content, []byte("PERSISTENT_META_TEXT"))
					}
					assert.True(t, foundPersistent, "%s persistent system must remain before its original assistant", label)
				}
				if internalSearch && label == "new" {
					assert.Contains(t, string(wireJSON), "toolu_inline_search", "must reach the native round after internal tool_result")
					assert.Contains(t, string(wireJSON), `"type":"tool_result"`)
					assert.Contains(t, string(wireJSON), `"type":"tool_reference"`, "ToolSearch result must remain intact")
				}
				if internalWebSearch {
					assert.Contains(t, string(wireJSON), "toolu_inline_web")
					assert.Contains(t, string(wireJSON), "TOOL_RESULT_RETAINED")
					assert.Contains(t, string(wireJSON), `"type":"tool_result"`)
				}
				if mode == "clear-at-internal-search-same-text" {
					assert.Equal(t, 2, bytes.Count(wireJSON, []byte("INLINE_META_TEXT")), "only scoped text expires; identical user and persistent system text survive")
				} else if strings.HasPrefix(mode, "clear-at") && (label != "new" || internalSearch || internalWebSearch) {
					assert.NotContains(t, string(wireJSON), "INLINE_META_TEXT", "%s expired system text", label)
				} else if strings.HasPrefix(mode, "clear-at") || mode == "effort-text" {
					assert.Contains(t, string(wireJSON), "INLINE_META_TEXT")
				}
				if strings.HasPrefix(mode, "effort-") {
					config, ok := wire["output_config"].(map[string]any)
					require.True(t, ok, "%s missing effective effort", label)
					effective := str(config, "effort")
					for _, value := range wire["messages"].([]any) {
						m := value.(map[string]any)
						if m["role"] == "system" {
							if control, ok := m["output_config"].(map[string]any); ok && control["effort"] != nil {
								effective = str(control, "effort")
							}
						}
					}
					assert.Equal(t, "low", effective, "%s actual upstream effort", label)
				}
				if mode == "top-effort" {
					config, ok := wire["output_config"].(map[string]any)
					require.True(t, ok)
					assert.Equal(t, "high", str(config, "effort"), "top effort changed")
				}
				// With no client effort, the CLI owns its native defaults; there
				// is no gateway response-body rewriter to strip generated effort.
				expectedHistory := map[string]string{"new": "rebuild", "continue": "prefix-hit", "longer": "prefix-hit", "rollback": "fork", "fork-after-restart": "fork", "new-cache-import": "rebuild"}
				if strings.HasPrefix(mode, "clear-at") {
					expectedHistory["continue"], expectedHistory["rollback"] = "rebuild", "rebuild"
				}
				assert.Equal(t, expectedHistory[label], res.Header().Get("X-CCGateway-History"), "%s native session lifecycle", label)
				t.Logf("%s history=%s", label, res.Header().Get("X-CCGateway-History"))
				return answer
			}
			if mode == "effort-between-users" {
				messages = []any{Object{"role": "user", "content": "FIRST_A"}, directive, Object{"role": "user", "content": "FIRST_B"}}
			}
			if mode == "effort-after-assistant" {
				messages = []any{Object{"role": "user", "content": "OLD"}, Object{"role": "assistant", "content": "OLD_ANSWER"}, directive, Object{"role": "user", "content": "FIRST"}}
			}
			if mode == "effort-long" {
				messages = []any{directive}
				for i := 0; i < 12; i++ {
					messages = append(messages, Object{"role": "user", "content": strings.Repeat("long repeated fixture context ", 256)}, Object{"role": "assistant", "content": "same repeated answer"})
				}
				messages = append(messages, Object{"role": "user", "content": "FIRST"})
			}
			if mode == "default-effort" || mode == "top-effort" {
				messages = []any{Object{"role": "user", "content": "FIRST"}}
			}
			first := post("new", g)
			if internalSearch || internalWebSearch {
				require.Len(t, g.Cache.entries, 1, "completed native checkpoint must be durable")
				for _, snapshot := range g.Cache.entries {
					require.False(t, snapshot.ResponseOnly)
					rows, err := g.Cache.readCanonical(snapshot.SessionID)
					require.NoError(t, err)
					chain := nativeChain(rows, snapshot.LastUUID)
					require.NotEmpty(t, chain)
					assert.Contains(t, string(nativeBytes(chain)), `"tool_result"`, "actual completed tool result must be checkpointed")
					if strings.HasPrefix(mode, "clear-at") {
						persistent := "PERSISTENT_META_TEXT"
						if mode == "clear-at-internal-search-same-text" {
							persistent += "\nINLINE_META_TEXT"
						}
						assert.Equal(t, 1, countSystemRows(chain, []string{persistent}))
						assert.Zero(t, countSystemRows(chain, []string{persistent, "INLINE_META_TEXT"}))
					}
				}
			}
			base := append([]any(nil), messages...)
			base = append(base, Object{"role": "assistant", "content": first["content"]})
			messages = append(append([]any(nil), base...), Object{"role": "user", "content": "SECOND"})
			if mode == "clear-at-tool-result" || mode == "clear-at-internal-search-handoff" {
				require.Equal(t, "tool_use", str(first, "stop_reason"))
				messages[len(messages)-1] = Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_inline_metadata", "content": "TOOL_RESULT_RETAINED"}}}
			}
			second := post("continue", g)
			messages = append(messages, Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "THIRD"})
			post("longer", g)
			if internalSearch || internalWebSearch {
				g.Cache, err = newCache(g.Cache.dir, 32<<20)
				require.NoError(t, err)
				messages[len(messages)-1] = user("THIRD_BRANCH")
				post("fork-after-restart", g)
			}
			messages = append(append([]any(nil), base...), Object{"role": "user", "content": "BRANCH"})
			if mode == "clear-at-tool-result" || mode == "clear-at-internal-search-handoff" {
				messages[len(messages)-1] = Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_inline_metadata", "content": "TOOL_RESULT_BRANCH_RETAINED"}}}
			}
			post("rollback", g)
			post("new-cache-import", gateway())
		})
	}
}
