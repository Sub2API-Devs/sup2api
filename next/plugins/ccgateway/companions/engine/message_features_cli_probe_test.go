package engine

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// Feasibility probe only: raw CLI bypasses gateway admission. The test logs
// unsupported observations explicitly; no provider fetch or inference occurs.
func TestRealCLIMessageFeaturesProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated message codec probe")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	pdf := messageProbePDF()
	var mu sync.Mutex
	var requests []Object
	assetHits := 0
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/fixture.pdf" {
			mu.Lock()
			assetHits++
			mu.Unlock()
			w.Header().Set("Content-Type", "application/pdf")
			w.Write(pdf)
			return
		}
		if r.URL.Path == "/fixture.png" {
			mu.Lock()
			assetHits++
			mu.Unlock()
			w.Header().Set("Content-Type", "image/png")
			image, _ := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jU1sAAAAASUVORK5CYII=")
			w.Write(image)
			return
		}
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		request, _ := decodeObject(raw)
		mu.Lock()
		requests = append(requests, request)
		mu.Unlock()
		canonical, _ := json.Marshal(request)
		writeDocumentProbeReply(w, str(request, "model"), bytes.Contains(canonical, []byte(`"media_type":"text/plain"`)))
	}))
	defer fake.Close()
	for _, tc := range []struct {
		name  string
		block Object
	}{
		{"document-text", Object{"type": "document", "source": Object{"type": "text", "media_type": "text/plain", "data": "DOCUMENT_SENTINEL"}, "title": "Fixture", "context": "Fixture context", "citations": Object{"enabled": true}}},
		{"document-content", Object{"type": "document", "source": Object{"type": "content", "content": []any{Object{"type": "text", "text": "DOCUMENT_SENTINEL"}}}, "citations": Object{"enabled": true}}},
		{"document-pdf-base64", Object{"type": "document", "source": Object{"type": "base64", "media_type": "application/pdf", "data": base64.StdEncoding.EncodeToString(pdf)}, "citations": Object{"enabled": true}}},
		{"document-pdf-url", Object{"type": "document", "source": Object{"type": "url", "url": fake.URL + "/fixture.pdf"}, "citations": Object{"enabled": true}}},
		{"document-file", Object{"type": "document", "source": Object{"type": "file", "file_id": "file_fixture_synthetic"}, "citations": Object{"enabled": true}}},
		{"image-url", Object{"type": "image", "source": Object{"type": "url", "url": fake.URL + "/fixture.png"}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			env := messageProbeEnv(root, fake.URL)
			mu.Lock()
			start := len(requests)
			mu.Unlock()
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()
			args := []string{"-p", "--model", "claude-opus-5-5", "--input-format", "stream-json", "--output-format", "stream-json", "--include-partial-messages", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", ""}
			cmd := exec.CommandContext(ctx, cli, args...)
			cmd.Dir = root
			cmd.Env = env
			out, runErr := runMessageFeatureInput(cmd, Object{"role": "user", "content": []any{tc.block, Object{"type": "text", "text": "Inspect the fixture document."}}})
			mu.Lock()
			count := len(requests) - start
			var wire Object
			if count > 0 {
				wire = requests[start]
			}
			mu.Unlock()
			preserved := messageProbeContainsBlock(wire, tc.block)
			t.Logf("CLI=%s initial exit_error=%v upstream_calls=%d exact_block=%t output_bytes=%d", version, runErr, count, preserved, len(out))
			if runErr != nil || !preserved {
				t.Fatalf("CLI failed raw codec preservation: error=%v calls=%d exact=%t", runErr, count, preserved)
			}
			if tc.name == "document-text" && !bytes.Contains(out, []byte("char_location")) {
				t.Fatal("CLI response dropped document citation")
			}
			sid := ""
			for _, line := range bytes.Split(out, []byte{'\n'}) {
				frame, _ := decodeObject(line)
				if str(frame, "session_id") != "" {
					sid = str(frame, "session_id")
				}
			}
			if sid == "" {
				t.Fatal("no session id")
			}
			resumeCtx, resumeCancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer resumeCancel()
			resumed := exec.CommandContext(resumeCtx, cli, "-p", "DOCUMENT_CONTINUE", "--resume", sid, "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
			resumed.Dir = root
			resumed.Env = env
			next, resumeErr := resumed.CombinedOutput()
			mu.Lock()
			last := requests[len(requests)-1]
			mu.Unlock()
			if resumeErr != nil || !messageProbeContainsBlock(last, tc.block) {
				t.Fatalf("resume lost block: exit_error=%v output_bytes=%d", resumeErr, len(next))
			}
			if tc.name == "document-text" {
				history, _ := json.Marshal(last["messages"])
				if bytes.Contains(history, []byte(`"type":"char_location"`)) {
					t.Fatal("CLI native citation behavior changed; reassess restoration requirement")
				}
				t.Log("EXPECTED LIMITATION: raw native history drops citations_delta location; gateway must restore from exact client history")
			}
			t.Log("resume exact block preserved")
		})
	}
	mu.Lock()
	defer mu.Unlock()
	t.Logf("total fake message calls=%d local asset fetches=%d", len(requests), assetHits)
}

func writeDocumentProbeReply(w http.ResponseWriter, model string, cite bool) {
	if !cite {
		writeSurfaceFixture(w, model, []Object{{"type": "text", "text": "DOCUMENT_PROBE_OK"}})
		return
	}
	recorder := httptest.NewRecorder()
	writeSurfaceFixture(recorder, model, []Object{{"type": "text", "text": "DOCUMENT_PROBE_OK"}})
	w.Header().Set("Content-Type", "text/event-stream")
	for _, part := range strings.Split(recorder.Body.String(), "\n\n") {
		if part == "" {
			continue
		}
		fmt.Fprint(w, part+"\n\n")
		if strings.Contains(part, `"type":"text_delta"`) {
			event := Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "citations_delta", "citation": Object{"type": "char_location", "cited_text": "DOCUMENT_SENTINEL", "document_index": 0, "document_title": "Fixture", "start_char_index": 0, "end_char_index": 17}}}
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "event: content_block_delta\ndata: %s\n\n", data)
		}
	}
}

// The raw native attachment retains text but does not transport API message
// metadata. This negative observation requires relay restoration, not dropping
// clear_at or moving an effort change to the top level.
func TestRealCLIInlineMessageMetadataProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for inline message metadata probe")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name   string
		extras Object
	}{{"clear-at", Object{"clear_at": "next_user_message"}}, {"inline-effort", Object{"output_config": Object{"effort": "high"}}}} {
		t.Run(tc.name, func(t *testing.T) {
			var wire Object
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				wire, _ = decodeObject(raw)
				writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "INLINE_PROBE_OK"}})
			}))
			defer fake.Close()
			root := t.TempDir()
			sid := uuid()
			parent := ""
			rows := []json.RawMessage{}
			u, id := transcriptRow(Message{Role: "user", Content: []Object{{"type": "text", "text": "INLINE_BEFORE"}}}, parent, sid, root, version, "claude-opus-5-5")
			rows = append(rows, u)
			parent = id
			s, id := systemRow([]string{"INLINE_METADATA_SENTINEL"}, parent, sid, root, version)
			row, _ := decodeObject(s)
			for key, value := range tc.extras {
				row[key] = value
				row["attachment"].(map[string]any)[key] = value
				row["rendered"].([]any)[0].(map[string]any)[key] = value
			}
			s, _ = json.Marshal(row)
			rows = append(rows, s)
			parent = id
			a, _ := transcriptRow(Message{Role: "assistant", Content: []Object{{"type": "text", "text": "INLINE_ANSWER"}}}, parent, sid, root, version, "claude-opus-5-5")
			rows = append(rows, a)
			path := filepath.Join(root, "import.jsonl")
			if err := os.WriteFile(path, nativeBytes(rows), 0600); err != nil {
				t.Fatal(err)
			}
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, cli, "-p", "INLINE_NEXT_USER", "--resume", path, "--fork-session", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
			cmd.Dir = root
			cmd.Env = messageProbeEnv(root, fake.URL)
			out, err := cmd.CombinedOutput()
			if err != nil {
				t.Fatalf("import failed: %v bytes=%d", err, len(out))
			}
			encoded, _ := json.Marshal(wire["messages"])
			if !bytes.Contains(encoded, []byte("INLINE_METADATA_SENTINEL")) {
				t.Fatal("carrier lost system text")
			}
			for _, v := range wire["messages"].([]any) {
				m := v.(map[string]any)
				for key, want := range tc.extras {
					if digest(m[key]) == digest(want) {
						t.Fatalf("native transport behavior changed: %s survived, reassess direct support", key)
					}
				}
			}
			t.Logf("CLI=%s expected negative: native JSONL retained system text but dropped client %s metadata; CLI-generated effort is not client effort", version, tc.name)
		})
	}
}

func messageProbeEnv(root, endpoint string) []string {
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	return envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-document-fixture", "ANTHROPIC_BASE_URL": endpoint, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1", "ENABLE_TOOL_SEARCH": "false"})
}

func messageProbeContainsBlock(request Object, want Object) bool {
	messages, _ := request["messages"].([]any)
	for _, v := range messages {
		message, _ := v.(map[string]any)
		blocks, _ := message["content"].([]any)
		for _, v := range blocks {
			block, _ := v.(map[string]any)
			if str(block, "type") == "tool_result" {
				nested, _ := citationContent(block["content"])
				items := make([]any, len(nested))
				for i, value := range nested {
					items[i] = value
				}
				if messageProbeContainsBlock(Object{"messages": []any{Object{"content": items}}}, want) {
					return true
				}
			}
			copy := Object{}
			for k, v := range block {
				if k != "cache_control" {
					copy[k] = v
				}
			}
			if digest(copy) == digest(want) {
				return true
			}
		}
	}
	return false
}

func runMessageFeatureInput(cmd *exec.Cmd, message Object) ([]byte, error) {
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	cmd.Stderr = io.Discard
	if err := cmd.Start(); err != nil {
		return nil, err
	}
	defer func() {
		stdin.Close()
		if cmd.ProcessState == nil {
			cmd.Process.Kill()
			cmd.Wait()
		}
	}()
	encode := json.NewEncoder(stdin)
	if err := encode.Encode(Object{"type": "control_request", "request_id": "message-probe-init", "request": Object{"subtype": "initialize", "systemPrompt": []string{"Document codec fixture"}, "systemPromptSnapshot": false, "sdkMcpServers": []any{}, "hooks": Object{}, "supportedDialogKinds": []string{}, "promptSuggestions": false}}); err != nil {
		return nil, err
	}
	var out bytes.Buffer
	scanner := bufio.NewScanner(stdout)
	scanner.Buffer(make([]byte, 65536), 8<<20)
	for scanner.Scan() {
		line := scanner.Bytes()
		out.Write(line)
		out.WriteByte('\n')
		frame, _ := decodeObject(line)
		if str(frame, "type") == "control_response" {
			response, _ := frame["response"].(map[string]any)
			if str(response, "request_id") == "message-probe-init" {
				if str(response, "subtype") != "success" {
					return out.Bytes(), fmt.Errorf("initialize rejected")
				}
				if err := encode.Encode(Object{"type": "user", "message": message}); err != nil {
					return out.Bytes(), err
				}
				stdin.Close()
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return out.Bytes(), err
	}
	return out.Bytes(), cmd.Wait()
}

func messageProbePDF() []byte {
	var b bytes.Buffer
	b.WriteString("%PDF-1.4\n")
	offsets := []int{0}
	text := "BT /F1 12 Tf 20 100 Td (DOCUMENT_SENTINEL) Tj ET"
	objects := []string{"<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", len(text), text)}
	for i, obj := range objects {
		offsets = append(offsets, b.Len())
		fmt.Fprintf(&b, "%d 0 obj\n%s\nendobj\n", i+1, obj)
	}
	xref := b.Len()
	fmt.Fprintf(&b, "xref\n0 %d\n0000000000 65535 f \n", len(offsets))
	for _, offset := range offsets[1:] {
		fmt.Fprintf(&b, "%010d 00000 n \n", offset)
	}
	fmt.Fprintf(&b, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(offsets), xref)
	return b.Bytes()
}
