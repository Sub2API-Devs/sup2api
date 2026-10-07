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
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestRealCLIMetadataGatewayCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for real-client metadata compatibility")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	var mu sync.Mutex
	var wireMetadata []any
	var wireHeaders []http.Header
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		mu.Lock()
		wireMetadata = append(wireMetadata, body["metadata"])
		wireHeaders = append(wireHeaders, r.Header.Clone())
		mu.Unlock()
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "METADATA_OK"}})
	}))
	defer fake.Close()
	for _, auth := range []string{"apikey", "oauth"} {
		t.Run(auth, func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			if err != nil {
				t.Fatal(err)
			}
			env := messageProbeEnv(root, fake.URL)
			if auth == "oauth" {
				env = envWith(env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "dummy-inner-oauth-metadata"})
			} else {
				env = envWith(env, map[string]string{"ANTHROPIC_API_KEY": "dummy-inner-key-metadata"})
			}
			cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
			if err != nil {
				t.Fatal(err)
			}
			g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 2), RequestLogDir: filepath.Join(root, "request-logs")}
			var clientMetadata any
			var clientSystem any
			var clientMessages any
			var cancelOuter context.CancelFunc
			clientKeys := []string{}
			var gatewayError string
			front := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				clientMetadata = body["metadata"]
				clientSystem = body["system"]
				clientMessages = body["messages"]
				for key := range body {
					clientKeys = append(clientKeys, key)
				}
				r.Body = io.NopCloser(bytes.NewReader(raw))
				recorder := httptest.NewRecorder()
				g.ServeHTTP(recorder, r)
				if recorder.Code != 200 {
					gatewayError = recorder.Body.String()
					t.Logf("gateway status=%d error=%s", recorder.Code, gatewayError)
					if cancelOuter != nil {
						cancelOuter()
					}
				}
				for key, values := range recorder.Header() {
					w.Header()[key] = values
				}
				w.WriteHeader(recorder.Code)
				w.Write(recorder.Body.Bytes())
			}))
			defer front.Close()
			outerRoot := t.TempDir()
			outerEnv := messageProbeEnv(outerRoot, front.URL)
			outerEnv = envWith(outerEnv, map[string]string{"ANTHROPIC_API_KEY": "dummy-outer-platform-key", "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1", "MAX_THINKING_TOKENS": "0"})
			ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
			cancelOuter = cancel
			defer cancel()
			cmd := exec.CommandContext(ctx, cli, "-p", "Reply METADATA_OK", "--model", "claude-sonnet-4-6", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
			cmd.Dir = outerRoot
			cmd.Env = outerEnv
			out, err := cmd.CombinedOutput()
			sort.Strings(clientKeys)
			if err != nil || !bytes.Contains(out, []byte("METADATA_OK")) {
				metadataSystemShape(t, g.RequestLogDir, clientSystem, clientMessages)
				t.Fatalf("real outer CLI failed: %v request_keys=%v output_bytes=%d gateway_error=%s", err, clientKeys, len(out), gatewayError)
			}
			mu.Lock()
			actual := wireMetadata[len(wireMetadata)-1]
			headers := wireHeaders[len(wireHeaders)-1]
			mu.Unlock()
			if clientMetadata == nil || digest(clientMetadata) != digest(actual) {
				t.Fatal("real CLI metadata was rejected or changed")
			}
			metadata := clientMetadata.(map[string]any)
			id, ok := metadata["user_id"].(string)
			if !ok || id == "" {
				t.Fatal("outer CLI did not emit user_id")
			}
			shape := []string{}
			if decoded, err := decodeObject([]byte(id)); err == nil {
				for key := range decoded {
					shape = append(shape, key)
				}
				sort.Strings(shape)
			}
			if auth == "oauth" {
				if headers.Get("Authorization") != "Bearer dummy-inner-oauth-metadata" {
					t.Fatal("inner OAuth authorization changed")
				}
			} else {
				if headers.Get("X-Api-Key") != "dummy-inner-key-metadata" {
					t.Fatal("inner API authorization changed")
				}
			}
			if headers.Get("X-Claude-Code-Session-Id") == "" {
				t.Fatal("inner CLI session header lost")
			}
			t.Logf("CLI=%s auth=%s real client user_id bytes=%d JSON keys=%v; exact metadata and independent inner auth preserved", version, auth, len(id), shape)
			messages := []any{Object{"role": "user", "content": "METADATA_OBJECT_CASE"}}
			for i, metadata := range []Object{{}, {"user_id": nil}, {"user_id": strings.Repeat("界", 512)}, {"user_id": `{ "session_id": "client-opaque-session", "custom": "kept as string" }`}, nil} {
				body := Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "metadata": metadata, "messages": messages}
				if metadata == nil {
					delete(body, "metadata")
				}
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				req.Header.Set("X-CCGateway-Session-ID", "metadata-object-cases")
				res := httptest.NewRecorder()
				g.ServeHTTP(res, req)
				if res.Code != 200 {
					t.Fatalf("metadata variant %d HTTP%d %s", i, res.Code, res.Body.String())
				}
				mu.Lock()
				got := wireMetadata[len(wireMetadata)-1]
				headers := wireHeaders[len(wireHeaders)-1]
				mu.Unlock()
				if metadata != nil && digest(got) != digest(metadata) {
					t.Fatalf("metadata variant %d changed on final wire", i)
				}
				if metadata == nil {
					inner, ok := got.(map[string]any)
					if !ok || str(inner, "user_id") == "" {
						t.Fatal("missing client metadata lost inner default attribution")
					}
				}
				if auth == "oauth" && headers.Get("Authorization") != "Bearer dummy-inner-oauth-metadata" {
					t.Fatal("metadata changed OAuth header")
				}
				if auth == "apikey" && headers.Get("X-Api-Key") != "dummy-inner-key-metadata" {
					t.Fatal("metadata changed API key header")
				}
				if i > 0 && res.Header().Get("X-CCGateway-History") != "prefix-hit" {
					t.Fatal("metadata change discarded history")
				}
				answer, _ := decodeObject(res.Body.Bytes())
				messages = append(messages, Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "METADATA_NEXT"})
			}
		})
	}
}

func metadataSystemShape(t *testing.T, root string, client any, clientMessages any) {
	t.Helper()
	outer, _ := citationContent(client)
	sizes := []int{}
	for _, b := range outer {
		sizes = append(sizes, len(str(b, "text")))
	}
	t.Logf("outer system block sizes=%v", sizes)
	t.Logf("outer message shape=%v", metadataMessageShape(clientMessages))
	_ = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || !strings.Contains(info.Name(), "upstream-refused-") {
			return nil
		}
		raw, _ := os.ReadFile(path)
		body, _ := decodeObject(raw)
		t.Logf("inner message shape=%v", metadataMessageShape(body["messages"]))
		inner, _ := citationContent(body["system"])
		sizes := []int{}
		for _, b := range inner {
			sizes = append(sizes, len(str(b, "text")))
		}
		t.Logf("inner system block sizes=%v", sizes)
		for i, o := range outer {
			matches := []int{}
			for j, in := range inner {
				if strings.Contains(str(in, "text"), str(o, "text")) {
					matches = append(matches, j)
				}
			}
			t.Logf("outer system %d exact-containing inner blocks=%v", i, matches)
		}
		return nil
	})
}

func metadataMessageShape(value any) []Object {
	var out []Object
	items, _ := value.([]any)
	for _, item := range items {
		m, _ := item.(map[string]any)
		blocks, _ := citationContent(m["content"])
		summary := []Object{}
		for _, block := range blocks {
			summary = append(summary, Object{"type": str(block, "type"), "text_length": len(str(block, "text")), "text_hash": digest(str(block, "text"))[:8]})
		}
		out = append(out, Object{"role": str(m, "role"), "blocks": summary})
	}
	return out
}
