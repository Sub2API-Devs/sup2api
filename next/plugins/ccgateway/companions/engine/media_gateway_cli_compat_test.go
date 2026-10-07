package engine

import (
	"bytes"
	"encoding/base64"
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
)

func TestRealCLIMediaGatewayCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated media/citation gateway test")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	var mu sync.Mutex
	var requests []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		if bytes.Contains(raw, []byte("<ccgateway-request:")) {
			t.Error("attribution marker leaked")
		}
		mu.Lock()
		requests = append(requests, body)
		mu.Unlock()
		canonical, _ := json.Marshal(body)
		writeDocumentProbeReply(w, str(body, "model"), bytes.Contains(canonical, []byte(`"media_type":"text/plain"`)))
	}))
	defer fake.Close()
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}
	newGateway := func() *Gateway {
		cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
		if err != nil {
			t.Fatal(err)
		}
		return &Gateway{Runner: runner, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 2)}
	}
	for _, tc := range []struct {
		name  string
		block Object
	}{
		{"text", Object{"type": "document", "source": Object{"type": "text", "media_type": "text/plain", "data": "DOCUMENT_SENTINEL"}, "title": "Fixture", "citations": Object{"enabled": true}}},
		{"tool-result-document", Object{"type": "document", "source": Object{"type": "text", "media_type": "text/plain", "data": "DOCUMENT_SENTINEL"}, "title": "Fixture", "citations": Object{"enabled": true}}},
		{"content", Object{"type": "document", "source": Object{"type": "content", "content": []any{Object{"type": "text", "text": "DOCUMENT_SENTINEL"}}}}},
		{"pdf-base64", Object{"type": "document", "source": Object{"type": "base64", "media_type": "application/pdf", "data": base64.StdEncoding.EncodeToString(messageProbePDF())}}},
		{"pdf-url", Object{"type": "document", "source": Object{"type": "url", "url": "https://example.invalid/fixture.pdf"}}},
		{"image-url", Object{"type": "image", "source": Object{"type": "url", "url": "https://example.invalid/fixture.png"}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			g := newGateway()
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": []any{tc.block, Object{"type": "text", "text": "MEDIA_START"}}}}}
			if tc.name == "tool-result-document" {
				body["tools"] = []any{Object{"name": "read_document", "input_schema": Object{"type": "object", "properties": Object{}}}}
				body["messages"] = []any{Object{"role": "user", "content": "read fixture document"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_document", "name": "read_document", "input": Object{}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_document", "content": []any{tc.block}}}}}
			}
			post := func(label string, g *Gateway) (Object, string, Object) {
				t.Helper()
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				req.Header.Set("X-CCGateway-Session-ID", "media-citation-fixture")
				res := httptest.NewRecorder()
				g.ServeHTTP(res, req)
				if res.Code != 200 {
					t.Fatalf("%s HTTP%d %s", label, res.Code, res.Body.String())
				}
				answer, err := decodeObject(res.Body.Bytes())
				if err != nil {
					t.Fatalf("%s invalid JSON %s", label, res.Body.String())
				}
				mu.Lock()
				wire := requests[len(requests)-1]
				mu.Unlock()
				if !messageProbeContainsBlock(wire, tc.block) {
					t.Fatal("media source changed")
				}
				t.Logf("%s history=%s", label, res.Header().Get("X-CCGateway-History"))
				return answer, res.Header().Get("X-CCGateway-History"), wire
			}
			first, _, _ := post("new", g)
			if tc.name == "tool-result-document" {
				citation := first["content"].([]any)[0].(map[string]any)["citations"]
				if citation == nil {
					t.Fatal("tool document response lost citation")
				}
				body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "TOOL_DOC_CONTINUE"})
				_, mode, wire := post("tool-document-continue", g)
				if mode != "prefix-hit" {
					t.Fatal("tool document history lost prefix hit")
				}
				assertCitationOnWire(t, wire, citation)
				return
			}
			if tc.name != "text" {
				return
			}
			firstBlock := first["content"].([]any)[0].(map[string]any)
			if firstBlock["citations"] == nil {
				t.Fatal("HTTP JSON lost citation")
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "MEDIA_CONTINUE"})
			branch := append([]any(nil), body["messages"].([]any)[:2]...)
			second, mode, wire := post("continue", g)
			if mode != "prefix-hit" {
				t.Fatal("citation continuation missed prefix cache")
			}
			assertCitationOnWire(t, wire, firstBlock["citations"])
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "MEDIA_LATER"})
			post("later", g)
			body["messages"] = append(branch, Object{"role": "user", "content": "MEDIA_ALTERNATE"})
			_, mode, wire = post("rollback", g)
			if mode != "fork" {
				t.Fatalf("rollback mode=%s", mode)
			}
			assertCitationOnWire(t, wire, firstBlock["citations"])
			_, mode, wire = post("new-cache-import", newGateway())
			if mode != "rebuild" {
				t.Fatal("new cache failed rebuild")
			}
			assertCitationOnWire(t, wire, firstBlock["citations"])
			body["messages"] = []any{Object{"role": "user", "content": []any{tc.block, Object{"type": "text", "text": "MEDIA_STREAM"}}}}
			body["stream"] = true
			raw, _ := json.Marshal(body)
			res := httptest.NewRecorder()
			g.ServeHTTP(res, httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw)))
			if res.Code != 200 || !strings.Contains(res.Body.String(), `"type":"citations_delta"`) || !strings.Contains(res.Body.String(), "event: message_stop") {
				t.Fatalf("citation SSE lost: %d %s", res.Code, res.Body.String())
			}
		})
	}
	t.Logf("CLI=%s isolated media/citation requests=%d", version, len(requests))
}

func assertCitationOnWire(t *testing.T, wire Object, want any) {
	t.Helper()
	for _, value := range wire["messages"].([]any) {
		message := value.(map[string]any)
		if str(message, "role") != "assistant" {
			continue
		}
		content, _ := citationContent(message["content"])
		if len(content) > 0 && digest(content[0]["citations"]) == digest(want) {
			return
		}
	}
	t.Fatal("final upstream history lost original citation")
}
