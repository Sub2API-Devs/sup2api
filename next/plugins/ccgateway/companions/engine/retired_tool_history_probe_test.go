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
	"strings"
	"testing"
	"time"
)

// Read-only feasibility probe. No gateway admission is relaxed.
func TestRealCLIRetiredToolHistoryProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("isolated real CLI probe")
	}
	version, e := checkVersion(cli)
	if e != nil {
		t.Fatal(e)
	}
	for _, name := range []string{"retired_fixture", "bash", "screenshot"} {
		t.Run(name, func(t *testing.T) {
			call := Object{"type": "tool_use", "id": "retired_call", "name": name, "input": Object{"fixture": "historical only"}}
			result := Object{"type": "tool_result", "tool_use_id": "retired_call", "content": "fixture result"}
			if name == "screenshot" {
				call["toolset_name"] = "computer"
				result["toolset_name"] = "computer"
			}
			msgs := []Message{{Role: "user", Content: []Object{{"type": "text", "text": "fixture"}}}, {Role: "assistant", Content: []Object{call}}, {Role: "user", Content: []Object{result}}, {Role: "assistant", Content: []Object{{"type": "text", "text": "done"}}}}
			request := basic()
			request["messages"] = []any{Object{"role": "user", "content": "fixture"}, Object{"role": "assistant", "content": []any{call}}, Object{"role": "user", "content": []any{result}}, Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "next"}}
			raw, _ := json.Marshal(request)
			parsed, admission := parsePolicyRequest(raw, nil)
			if admission != nil {
				t.Logf("gateway gate: %v", admission)
			} else {
				t.Logf("gateway accepted; original=%s wire=%s", name, str(parsed.wireMessage(msgs[1]).Content[0], "name"))
			}
			var wire Object
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				b, _ := io.ReadAll(r.Body)
				wire, _ = decodeObject(b)
				writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "done"}})
			}))
			defer fake.Close()
			root := t.TempDir()
			sid := uuid()
			parent := ""
			rows := []json.RawMessage{}
			for _, m := range msgs {
				row, id := transcriptRow(m, parent, sid, root, version, "claude-opus-5-5")
				rows = append(rows, row)
				parent = id
			}
			path := filepath.Join(root, "import.jsonl")
			if e := os.WriteFile(path, nativeBytes(rows), 0600); e != nil {
				t.Fatal(e)
			}
			ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, cli, "-p", "NEXT_FIXTURE", "--resume", path, "--fork-session", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
			cmd.Dir = root
			cmd.Env = messageProbeEnv(root, fake.URL)
			out, e := cmd.CombinedOutput()
			if e != nil {
				t.Fatalf("CLI failed %v bytes%d", e, len(out))
			}
			encoded, _ := json.Marshal(wire["messages"])
			if !bytes.Contains(encoded, []byte("retired_call")) {
				t.Fatal("history tool call dropped")
			}
			calls := 0
			sets := 0
			for _, v := range wire["messages"].([]any) {
				m := v.(Object)
				blocks, _ := historyContent(m["content"])
				for _, b := range blocks {
					if str(b, "type") == "tool_use" && str(b, "id") == "retired_call" {
						calls++
						if str(b, "name") != name || digest(b["input"]) != digest(call["input"]) {
							t.Fatal("historical name/input changed")
						}
						if b["toolset_name"] != nil {
							sets++
						}
					}
				}
			}
			tools, _ := historyContent(wire["tools"])
			if calls != 1 || len(tools) != 0 {
				t.Fatal("history missing or registered executable tools")
			}
			t.Logf("CLI%s no executable catalog: history call preserved, toolset fields=%d", version, sets)
		})
	}
}
