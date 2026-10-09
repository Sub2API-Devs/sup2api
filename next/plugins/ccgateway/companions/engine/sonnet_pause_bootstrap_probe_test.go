package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// This probe never supplies a provider response or fabricates an assistant.
func TestRealCLISonnetPauseBootstrapNativeProbe(t *testing.T) {
	reached := make(chan struct{}, 1)
	var runtimeEnv []string
	var phaseTwo atomic.Bool
	var finalWire Object
	endpoint, cache := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		if phaseTwo.Load() {
			finalWire, _ = decodeObject(raw)
			blocks := webFixture("web_search")
			writeSurfaceFixture(w, str(finalWire, "model"), []Object{blocks[1], {"type": "text", "text": "DONE"}})
			return
		}
		select {
		case reached <- struct{}{}:
		default:
		}
		<-r.Context().Done()
	}, func(env []string) []string { runtimeEnv = env; return env })
	body := webTestBody("web_search_20250305")
	body["model"] = "claude-sonnet-4-6"
	// No session (§53.12): this probes the CLI's --session-id transcript,
	// written to its projects directory before the provider responds.
	body["metadata"] = Object{}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	request, _ := http.NewRequestWithContext(ctx, "POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
	done := make(chan struct{})
	go func() {
		defer close(done)
		response, _ := http.DefaultClient.Do(request)
		if response != nil {
			response.Body.Close()
		}
	}()
	select {
	case <-reached:
		for i := 0; i < 100; i++ {
			paths, _ := filepath.Glob(filepath.Join(filepath.Dir(cache.dir), "config", "projects", "*", "*.jsonl"))
			if len(paths) > 0 {
				break
			}
			time.Sleep(25 * time.Millisecond)
		}
		cancel()
	case <-time.After(15 * time.Second):
		t.Fatal("bootstrap not reached")
	}
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("cancellation blocked")
	}
	// Wait for the CLI process cancellation/writer cleanup, without inventing a completed response anchor.
	root := filepath.Dir(cache.dir)
	var paths []string
	for i := 0; i < 50; i++ {
		paths, _ = filepath.Glob(filepath.Join(root, "config", "projects", "*", "*.jsonl"))
		if len(paths) > 0 {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if len(paths) == 0 {
		t.Fatal("no native transcript before provider response")
	}
	for _, path := range paths {
		raw, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		for _, line := range strings.Split(string(raw), "\n") {
			if strings.TrimSpace(line) == "" {
				continue
			}
			row, err := decodeObject([]byte(line))
			if err != nil {
				t.Fatal(err)
			}
			m, _ := row["message"].(Object)
			a, _ := row["attachment"].(Object)
			t.Logf("native type=%s role=%s attachment=%s hasUUID=%v messagekeys=%v", str(row, "type"), str(m, "role"), str(a, "type"), str(row, "uuid") != "", len(m))
			if str(m, "role") == "assistant" {
				t.Fatal("bootstrap produced assistant before provider response")
			}
		}
	}
	if len(paths) != 1 {
		t.Fatal("ambiguous native bootstrap")
	}
	raw, err := os.ReadFile(paths[0])
	if err != nil {
		t.Fatal(err)
	}
	var native []json.RawMessage
	parent := ""
	for _, line := range strings.Split(string(raw), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		o, err := decodeObject([]byte(line))
		if err != nil {
			t.Fatal(err)
		}
		native = append(native, json.RawMessage(line))
		if str(o, "uuid") != "" {
			parent = str(o, "uuid")
		}
	}
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": []Object{webFixture("web_search")[0]}})
	delete(body, "metadata") // phase one only: the plain parser takes no generation controls
	req, err := parseRequest(mustMCPJSON(body))
	if err != nil {
		t.Fatal(err)
	}
	prepared, err := prepareHistory(req, cache, testBranch("bootstrap-probe"), t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	sid := strings.TrimSuffix(filepath.Base(paths[0]), ".jsonl")
	for _, record := range prepared.Rows {
		row, _ := decodeObject(record)
		m, _ := row["message"].(Object)
		if str(m, "role") != "assistant" {
			continue
		}
		row["sessionId"] = sid
		row["parentUuid"] = parent
		parent = str(row, "uuid")
		encoded, _ := json.Marshal(row)
		native = append(native, encoded)
	}
	prepared.SessionID = sid
	prepared.Rows = native
	prepared.LastUUID = parent
	// The CLI appends to a resumed file named by its records' session.
	prepared.Path = filepath.Join(filepath.Dir(prepared.Path), sid+".jsonl")
	if err := writeNative(prepared.Path, native); err != nil {
		t.Fatal(err)
	}
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	phaseTwo.Store(true)
	runner := &Runner{CLI: os.Getenv("CCG_REAL_CLI"), Version: "2.1.292", Plugin: plugin, Work: root, Env: runtimeEnv}
	result, err := runner.run(context.Background(), req, prepared, t.TempDir(), func(Object) error { return nil })
	if err != nil {
		t.Fatal(err)
	}
	if str(result, "stop_reason") != "end_turn" {
		t.Fatal("not completed")
	}
	facts := sonnetSafetyFacts(finalWire)
	if len(facts) != 1 || facts[0]["message"] != 0 {
		t.Fatalf("native safety position mismatch: %s", mustMCPJSON(facts))
	}
	messages := finalWire["messages"].([]any)
	last := messages[len(messages)-1].(Object)
	if str(last, "role") != "assistant" || digest(last["content"]) != digest([]Object{webFixture("web_search")[0]}) {
		t.Fatal("tail changed")
	}
	t.Log(fmt.Sprintf("native bootstrap reused same session; AutoMode remains original firstuser; final tool pause resumed"))

}
