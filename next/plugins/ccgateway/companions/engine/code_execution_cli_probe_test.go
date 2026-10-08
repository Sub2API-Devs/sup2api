package engine

import (
	"bufio"
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
	"strings"
	"sync"
	"testing"
	"time"
)

// Isolated codec evidence only. It intentionally bypasses gateway admission;
// no provider credential, code execution or remote file operation is involved.
func TestRealCLICodeExecutionCodecProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated provider-block codec probe")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range [][3]string{{"code_execution", "code_execution_tool_result", "code_execution_result"}, {"code_execution", "code_execution_tool_result", "encrypted_code_execution_result"}, {"bash_code_execution", "bash_code_execution_tool_result", "bash_code_execution_result"}, {"text_editor_code_execution", "text_editor_code_execution_tool_result", "text_editor_code_execution_view_result"}, {"text_editor_code_execution", "text_editor_code_execution_tool_result", "text_editor_code_execution_create_result"}, {"text_editor_code_execution", "text_editor_code_execution_tool_result", "text_editor_code_execution_str_replace_result"}} {
		t.Run(tc[2], func(t *testing.T) {
			blocks := []Object{{"type": "server_tool_use", "id": "srv_exec", "name": tc[0], "input": Object{}}, codeResultFixture(tc[1], tc[2]), {"type": "text", "text": "CODEC_PROBE_DONE"}}
			var mu sync.Mutex
			var captured Object
			calls := 0
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				wire, _ := decodeObject(raw)
				mu.Lock()
				captured = wire
				calls++
				mu.Unlock()
				writeSurfaceFixture(w, str(wire, "model"), blocks)
			}))
			defer fake.Close()
			root := t.TempDir()
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, cli, "-p", "CODEC_PROBE_INPUT", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--include-partial-messages", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
			cmd.Dir = root
			cmd.Env = messageProbeEnv(root, fake.URL)
			out, err := cmd.CombinedOutput()
			if err != nil {
				t.Fatalf("CLI probe failed: %v bytes=%d", err, len(out))
			}
			var starts []Object
			scan := bufio.NewScanner(bytes.NewReader(out))
			scan.Buffer(make([]byte, 4096), 4<<20)
			for scan.Scan() {
				frame, e := decodeObject(scan.Bytes())
				if e != nil {
					continue
				}
				if str(frame, "type") == "stream_event" {
					event, _ := frame["event"].(Object)
					if str(event, "type") == "content_block_start" {
						block, _ := event["content_block"].(Object)
						if str(block, "type") != "text" {
							starts = append(starts, block)
						}
					}
				}
			}
			if digest(starts) != digest(blocks[:2]) {
				t.Fatalf("provider code blocks changed by CLI: want=%s actual=%s", digest(blocks[:2]), digest(starts))
			}
			// Cold JSONL import tests the other direction independently of output.
			sid := uuid()
			first, id := transcriptRow(Message{Role: "user", Content: []Object{{"type": "text", "text": "CODEC_HISTORY_INPUT"}}}, "", sid, root, version, "claude-opus-5-5")
			last, _ := transcriptRow(Message{Role: "assistant", Content: blocks}, id, sid, root, version, "claude-opus-5-5")
			path := filepath.Join(root, "import.jsonl")
			if err := os.WriteFile(path, nativeBytes([]json.RawMessage{first, last}), 0600); err != nil {
				t.Fatal(err)
			}
			cmd = exec.CommandContext(ctx, cli, "-p", "CODEC_HISTORY_NEXT", "--resume", path, "--fork-session", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
			cmd.Dir = root
			cmd.Env = messageProbeEnv(root, fake.URL)
			if output, err := cmd.CombinedOutput(); err != nil {
				t.Fatalf("cold import failed: %v bytes=%d", err, len(output))
			}
			mu.Lock()
			wire := captured
			count := calls
			mu.Unlock()
			if count != 2 {
				t.Fatalf("unexpected model rounds in isolated codec probe: %d", count)
			}
			present := messageProbeContainsBlock(wire, blocks[0]) && messageProbeContainsBlock(wire, blocks[1])
			if !present {
				t.Fatal("known provider call/result cold history transport changed")
			}
			t.Logf("CLI=%s source stream preserved; cold-import provider blocks retained=%v", version, present)
		})
	}
}

func TestRealCLIPTCCallerCodecProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	parent := Object{"type": "server_tool_use", "id": "srv_ptc", "name": "code_execution", "input": Object{}}
	child := Object{"type": "tool_use", "id": "tool_ptc", "name": "ptc_fixture_unsupported", "input": Object{}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_ptc"}}
	var mu sync.Mutex
	var wires []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		wire, _ := decodeObject(raw)
		mu.Lock()
		wires = append(wires, wire)
		count := len(wires)
		mu.Unlock()
		if count == 1 {
			writeSurfaceFixture(w, str(wire, "model"), []Object{parent, child})
		} else {
			writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "PTC_PROBE_DONE"}})
		}
	}))
	defer fake.Close()
	root := t.TempDir()
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	run := func(args ...string) []byte {
		t.Helper()
		cmd := exec.CommandContext(ctx, cli, args...)
		cmd.Dir = root
		cmd.Env = messageProbeEnv(root, fake.URL)
		out, err := cmd.CombinedOutput()
		if err != nil {
			maxTurns := false
			for _, line := range bytes.Split(out, []byte{'\n'}) {
				frame, _ := decodeObject(line)
				maxTurns = maxTurns || str(frame, "type") == "result" && str(frame, "subtype") == "error_max_turns" && str(frame, "terminal_reason") == "max_turns"
			}
			if !maxTurns {
				t.Fatalf("PTC codec command %v bytes=%d", err, len(out))
			}
		}
		return out
	}
	out := run("-p", "PTC_PROBE_INPUT", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--include-partial-messages", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
	callerPreserved := false
	for _, line := range bytes.Split(out, []byte{'\n'}) {
		frame, _ := decodeObject(line)
		event, _ := frame["event"].(Object)
		block, _ := event["content_block"].(Object)
		if str(block, "id") == "tool_ptc" {
			callerPreserved = digest(block["caller"]) == digest(child["caller"])
		}
	}
	if !callerPreserved {
		t.Fatal("source PTC caller lost in CLI output")
	}
	result := codeResultFixture("code_execution_tool_result", "code_execution_result")
	result["tool_use_id"] = "srv_ptc"
	messages := []Message{{Role: "user", Content: []Object{{"type": "text", "text": "PTC_BEFORE"}}}, {Role: "assistant", Content: []Object{parent, child}}, {Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "tool_ptc", "content": "CLIENT_RESULT"}}}, {Role: "assistant", Content: []Object{result, {"type": "text", "text": "PTC_DONE"}}}}
	var rows []json.RawMessage
	sid := uuid()
	previous := ""
	for _, message := range messages {
		row, id := transcriptRow(message, previous, sid, root, version, "claude-opus-5-5")
		rows = append(rows, row)
		previous = id
	}
	path := filepath.Join(root, "ptc-import.jsonl")
	if err := os.WriteFile(path, nativeBytes(rows), 0600); err != nil {
		t.Fatal(err)
	}
	run("-p", "PTC_NEXT", "--resume", path, "--fork-session", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
	mu.Lock()
	wire := wires[len(wires)-1]
	count := len(wires)
	mu.Unlock()
	if count != 2 {
		t.Fatalf("unexpected PTC codec model rounds=%d", count)
	}
	omitted, _ := jsonCopyObject(child)
	delete(omitted, "caller")
	if messageProbeContainsBlock(wire, child) || !messageProbeContainsBlock(wire, omitted) {
		t.Fatal("known PTC caller omission changed; reassess the scoped history adapter")
	}
	t.Logf("CLI=%s source stream preserves caller; cold native history removes only caller, so relay restoration is required", version)
}
