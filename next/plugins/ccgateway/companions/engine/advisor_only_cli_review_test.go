package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIAdvisorOnlyHistoryReview(t *testing.T) {
	for _, mode := range []string{"plain", "inline", "fallback"} {
		t.Run(mode, func(t *testing.T) { runAdvisorOnlyHistoryReview(t, mode) })
	}
}

func runAdvisorOnlyHistoryReview(t *testing.T, mode string) {
	blocks := advisorFixture("advisor_redacted_result")[:2]
	if mode == "fallback" {
		blocks = append(blocks, fallbackFixture())
	}
	var calls atomic.Int32
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		n := calls.Add(1)
		if n == 1 {
			writeSurfaceFixture(w, str(body, "model"), blocks)
			return
		}
		for _, block := range blocks {
			if !messageProbeContainsBlock(body, block) {
				t.Error("advisor-only history block lost")
			}
		}
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "CONTINUED"}})
	})
	endpoint, initialCache := newThinkingOutputFixture(t, handler)
	body := advisorTestBody()
	if mode == "inline" {
		body["messages"] = append(body["messages"].([]any), Object{"role": "system", "content": "ADVISOR_INLINE_REVIEW", "clear_at": "never"})
	}
	post := func(endpoint, label string) Object {
		t.Helper()
		raw, _ := json.Marshal(body)
		req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
		req.Header.Set("anthropic-beta", "advisor-tool-2026-03-01,"+inlineMetadataBetas)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		out, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 {
			_ = filepath.Walk(filepath.Join(filepath.Dir(initialCache.dir), "request-logs"), func(path string, info os.FileInfo, err error) error {
				if err != nil || info.IsDir() || !strings.Contains(info.Name(), "upstream-refused-") {
					return nil
				}
				raw, _ := os.ReadFile(path)
				wire, _ := decodeObject(raw)
				messages, _ := wire["messages"].([]any)
				for _, v := range messages {
					m, _ := v.(Object)
					if str(m, "role") == "assistant" {
						c, _ := historyContent(m["content"])
						for _, b := range c {
							t.Logf("synthetic-only assistant block type=%s text=%q", str(b, "type"), str(b, "text"))
							t.Logf("block keys: %v", b)
						}
					}
				}
				return nil
			})
			t.Fatalf("%s HTTP%d %s", label, res.StatusCode, out)
		}
		answer, err := decodeObject(out)
		if err != nil {
			t.Fatal(err)
		}
		t.Logf("%s mode=%s", label, res.Header.Get("X-CCGateway-History"))
		return answer
	}
	first := post(endpoint, "new")
	if digest(first["content"]) != digest(blocks) {
		t.Fatal("advisor-only result did not end the request")
	}
	base := append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]})
	body["messages"] = append(append([]any(nil), base...), Object{"role": "user", "content": "continue"})
	post(endpoint, "continue")
	body["messages"] = append(append([]any(nil), base...), Object{"role": "user", "content": "branch"})
	post(endpoint, "rollback")
	imported, _ := newThinkingOutputFixture(t, handler)
	post(imported, "import")
	if calls.Load() != 4 {
		t.Fatalf("unexpected additional model call %d", calls.Load())
	}
}
