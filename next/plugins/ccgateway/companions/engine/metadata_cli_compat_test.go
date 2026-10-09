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
			metadata, _ := clientMetadata.(map[string]any)
			id, ok := metadata["user_id"].(string)
			if !ok || id == "" {
				t.Fatal("outer CLI did not emit user_id")
			}
			// §53.12: the client's user_id selects the session and never reaches
			// upstream; upstream gets the inner CLI's own user_id with session U.
			var client map[string]string
			if err := json.Unmarshal([]byte(id), &client); err != nil || client["session_id"] == "" {
				t.Fatalf("outer CLI user_id shape changed: %s", id)
			}
			u := upstreamSessionID(client["session_id"])
			checkUpstream := func(label string, got any, headers http.Header) {
				t.Helper()
				raw, _ := json.Marshal(got)
				for _, part := range []string{client["session_id"], client["device_id"]} {
					if part != "" && strings.Contains(string(raw)+fmt.Sprint(headers), part) {
						t.Fatalf("%s: client user_id part %s sent upstream", label, part)
					}
				}
				inner, _ := got.(map[string]any)
				var upstream map[string]string
				if err := json.Unmarshal([]byte(str(inner, "user_id")), &upstream); err != nil || upstream["session_id"] != u || upstream["device_id"] == "" || headers.Get("X-Claude-Code-Session-Id") != u {
					t.Fatalf("%s: upstream user_id %v / session %q, want session %s", label, got, headers.Get("X-Claude-Code-Session-Id"), u)
				}
			}
			checkUpstream("real client", actual, headers)
			shape := []string{}
			for key := range client {
				shape = append(shape, key)
			}
			sort.Strings(shape)
			if auth == "oauth" {
				if headers.Get("Authorization") != "Bearer dummy-inner-oauth-metadata" {
					t.Fatal("inner OAuth authorization changed")
				}
			} else {
				if headers.Get("X-Api-Key") != "dummy-inner-key-metadata" {
					t.Fatal("inner API authorization changed")
				}
			}
			t.Logf("CLI=%s auth=%s real client user_id bytes=%d JSON keys=%v; client metadata kept off the wire, upstream session U, independent inner auth preserved", version, auth, len(id), shape)
			// Every metadata shape is admitted and none reaches upstream. With one
			// session (fixed session_id, other fields varying) history continues.
			const variantSession = "5e551011-0000-4000-8000-00000000000a"
			messages := []any{Object{"role": "user", "content": "METADATA_OBJECT_CASE"}}
			for i, metadata := range []Object{
				{"user_id": `{"device_id":"variant-device-1","account_uuid":"","session_id":"` + variantSession + `"}`},
				{"user_id": `{ "session_id": "` + variantSession + `", "custom": "kept as string" }`},
				{"user_id": `{"device_id":"variant-device-2","account_uuid":"variant-account","session_id":"` + variantSession + `"}`},
			} {
				body := Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "metadata": metadata, "messages": messages}
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				res := httptest.NewRecorder()
				g.ServeHTTP(res, req)
				if res.Code != 200 {
					t.Fatalf("metadata variant %d HTTP%d %s", i, res.Code, res.Body.String())
				}
				mu.Lock()
				got := wireMetadata[len(wireMetadata)-1]
				headers := wireHeaders[len(wireHeaders)-1]
				mu.Unlock()
				raw, _ = json.Marshal(got)
				for _, part := range []string{variantSession, "variant-device", "variant-account", "kept as string"} {
					if strings.Contains(string(raw)+fmt.Sprint(headers), part) {
						t.Fatalf("metadata variant %d sent %s upstream", i, part)
					}
				}
				inner, _ := got.(map[string]any)
				if !strings.Contains(str(inner, "user_id"), `"session_id":"`+upstreamSessionID(variantSession)+`"`) {
					t.Fatalf("metadata variant %d upstream user_id %v", i, got)
				}
				if auth == "oauth" && headers.Get("Authorization") != "Bearer dummy-inner-oauth-metadata" {
					t.Fatal("metadata changed OAuth header")
				}
				if auth == "apikey" && headers.Get("X-Api-Key") != "dummy-inner-key-metadata" {
					t.Fatal("metadata changed API key header")
				}
				if i > 0 && res.Header().Get("X-CCGateway-History") != "prefix-hit" {
					t.Fatal("same session with other metadata fields discarded history")
				}
				answer, _ := decodeObject(res.Body.Bytes())
				messages = append(messages, Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "METADATA_NEXT"})
			}
			// Shapes without a session: admitted, new session each, nothing
			// of the client's upstream.
			for i, metadata := range []Object{{}, {"user_id": nil}, {"user_id": strings.Repeat("界", 512)}, nil} {
				body := Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "metadata": metadata, "messages": []any{Object{"role": "user", "content": "METADATA_NO_SESSION"}}}
				if metadata == nil {
					delete(body, "metadata")
				}
				raw, _ := json.Marshal(body)
				res := httptest.NewRecorder()
				g.ServeHTTP(res, httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw)))
				if res.Code != 200 {
					t.Fatalf("metadata shape %d HTTP%d %s", i, res.Code, res.Body.String())
				}
				mu.Lock()
				got := wireMetadata[len(wireMetadata)-1]
				mu.Unlock()
				raw, _ = json.Marshal(got)
				if strings.Contains(string(raw), "界") {
					t.Fatalf("metadata shape %d sent the client's user_id upstream", i)
				}
				if inner, ok := got.(map[string]any); !ok || str(inner, "user_id") == "" {
					t.Fatal("missing client metadata lost inner default attribution")
				}
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
