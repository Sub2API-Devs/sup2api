package engine

import (
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

// Exercise the CLI loader, not just the Go-selected UUID list. The fixture
// has the parallel parent topology observed in native CLI transcripts and a
// later, unrelated chat branch in the same canonical file.
func TestRealCLINativeParallelContextReplay(t *testing.T) {
	for _, duplicate := range []bool{false, true} {
		t.Run(fmt.Sprintf("duplicate-uuid=%t", duplicate), func(t *testing.T) {
			testRealCLINativeParallelContextReplay(t, duplicate)
		})
	}
}

func testRealCLINativeParallelContextReplay(t *testing.T, duplicate bool) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for native parallel context compatibility")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	root, session := t.TempDir(), uuid()
	var rows []json.RawMessage
	add := func(role, parent, message string, content []Object) string {
		raw, id := transcriptRow(Message{Role: role, Content: content}, parent, session, root, version, "claude-opus-5-5")
		if message != "" {
			row, _ := decodeObject(raw)
			m := row["message"].(Object)
			m["id"], m["stop_reason"] = message, "tool_use"
			raw, _ = json.Marshal(row)
		}
		rows = append(rows, raw)
		return id
	}
	text := func(s string) []Object { return []Object{{"type": "text", "text": s}} }
	u := add("user", "", "", text("ORIGINAL_QUESTION"))
	message := "msg_" + strings.ReplaceAll(uuid(), "-", "")
	a := add("assistant", u, message, []Object{{"type": "tool_use", "id": "parallel_a", "name": "Read", "input": Object{"file_path": "/a"}}})
	b := add("assistant", a, message, []Object{{"type": "tool_use", "id": "parallel_b", "name": "Read", "input": Object{"file_path": "/b"}}})
	rb := add("user", b, "", []Object{{"type": "tool_result", "tool_use_id": "parallel_b", "content": "RESULT_B"}})
	ra := add("user", a, "", []Object{{"type": "tool_result", "tool_use_id": "parallel_a", "content": "RESULT_A"}})
	leaf := add("assistant", ra, "", text("BOTH_TOOLS_COMPLETED"))
	other := add("user", u, "", text("EXCLUDED_BRANCH_QUESTION"))
	add("assistant", other, "", text("EXCLUDED_BRANCH_ANSWER"))
	resultB := "RESULT_B"
	if duplicate {
		resultB = "RESULT_B_UPDATED"
		for _, raw := range rows {
			if id, _, _ := rowIdentity(raw); id == rb {
				row, _ := decodeObject(raw)
				row["message"].(Object)["content"] = []Object{{"type": "tool_result", "tool_use_id": "parallel_b", "content": resultB}}
				updated, _ := json.Marshal(row)
				rows = append(rows, updated)
				break
			}
		}
	}
	path := filepath.Join(root, session+".jsonl")
	if err := writeNative(path, branchView(rows, leaf)); err != nil {
		t.Fatal(err)
	}
	var mu sync.Mutex
	var seen []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":10}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		mu.Lock()
		seen = append(seen, body)
		mu.Unlock()
		writeSurfaceFixture(w, str(body, "model"), text("REPLAY_OK"))
	}))
	defer fake.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, cli, "-p", "CONTINUE_ORIGINAL", "--resume", path, "--resume-session-at", leaf,
		"--model", "claude-opus-5-5", "--max-turns", "1", "--output-format", "json", "--verbose",
		"--tools", "", "--strict-mcp-config", "--mcp-config", `{"mcpServers":{}}`, "--setting-sources", "",
		"--settings", `{"disableAllHooks":true}`, "--disable-slash-commands")
	cmd.Dir = root
	cmd.Env = envWith(messageProbeEnv(root, fake.URL), map[string]string{
		"DISABLE_AUTO_COMPACT": "1", "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1", "CLAUDE_CODE_DISABLE_CLAUDE_MDS": "1",
	})
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("CLI %s: %v: %s", version, err, out)
	}
	mu.Lock()
	defer mu.Unlock()
	if len(seen) != 1 {
		t.Fatalf("upstream calls=%d, want 1; output=%s", len(seen), out)
	}
	calls, results := map[string]int{}, map[string]string{}
	for _, v := range seen[0]["messages"].([]any) {
		blocks, _ := historyContent(v.(Object)["content"])
		for _, block := range blocks {
			switch str(block, "type") {
			case "tool_use":
				calls[str(block, "id")]++
			case "tool_result":
				b, _ := json.Marshal(block["content"])
				results[str(block, "tool_use_id")] = string(b)
			}
		}
	}
	for id, want := range map[string]string{"parallel_a": "RESULT_A", "parallel_b": resultB} {
		if calls[id] != 1 || !strings.Contains(results[id], want) {
			t.Errorf("CLI %s replay %s: calls=%d result=%q, want one call and %s", version, id, calls[id], results[id], want)
		}
	}
	encoded, _ := json.Marshal(seen[0]["messages"])
	if strings.Contains(string(encoded), "EXCLUDED_BRANCH") {
		t.Fatal("unrelated branch reached upstream")
	}
	t.Logf("CLI=%s upstream replayed both parallel calls/results and excluded the other branch", version)
}
