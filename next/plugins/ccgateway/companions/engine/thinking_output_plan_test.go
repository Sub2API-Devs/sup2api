package engine

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

func TestThinkingOutputPlanAdmissionAndDefaults(t *testing.T) {
	body := basic()
	body["max_tokens"] = 2048
	body["thinking"] = Object{"type": "enabled", "budget_tokens": 4096}
	raw, _ := json.Marshal(body)
	if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
		t.Fatal("manual thinking exceeded per-response limit without interleaved beta")
	}
	h := http.Header{}
	h.Set("anthropic-beta", "interleaved-thinking-2025-05-14")
	if _, err := parsePolicyRequest(raw, h); err != nil {
		t.Fatal("interleaved manual turn budget was incorrectly bounded by max_tokens", err)
	}
	req := plannedRequest(t, nil)
	cfg, err := req.passthroughBodies()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.First["thinking"] != nil || cfg.First["output_config"] != nil || digest(req.passthroughThinkingArgs()) != digest([]string{"--thinking", "disabled"}) || req.passthroughEffort() != "high" {
		t.Fatal("native generation defaults changed")
	}
	for _, extra := range []Object{
		{"thinking": Object{"type": "disabled"}, "output_config": Object{"effort": "high"}},
		{"thinking": Object{"type": "adaptive", "display": "omitted"}},
		{"output_format": Object{"type": "json_schema", "schema": Object{"type": "object"}}},
	} {
		req = plannedRequest(t, extra)
		cfg, err = req.passthroughBodies()
		if err != nil {
			t.Fatal(err)
		}
		for name, value := range extra {
			want, _ := json.Marshal(value)
			if string(cfg.First[name]) != string(want) || string(cfg.Rest[name]) != string(want) {
				t.Fatalf("native generation field %s changed", name)
			}
		}
	}
}

func TestResponseOnlyCheckpointSurvivesRestartWithoutNativeResume(t *testing.T) {
	cache, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	req := responseHistoryRequest(t)
	p, err := prepareHistory(req, cache, testBranch("scope"), t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	answer := responseHistoryAnswer("msg_partial", "{\"ok\":")
	answer["stop_reason"] = "max_tokens"
	if err := p.commitResponseOnly(req, answer, cache, "scope", time.Now()); err != nil {
		t.Fatal(err)
	}
	cache, err = newCache(cache.dir, cache.limit)
	if err != nil || len(cache.entries) != 1 {
		t.Fatal("response-only persistence failed", err)
	}
	req.Messages = append(req.Messages, Message{Role: "assistant", Content: answer["content"].([]Object)}, Message{Role: "user", Content: []Object{{"type": "text", "text": "continue"}}})
	next, err := prepareHistory(req, cache, testBranch("scope"), t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	count := 0
	for _, raw := range next.Rows {
		row, _ := decodeObject(raw)
		message, _ := row["message"].(Object)
		if str(row, "type") != "assistant" {
			continue
		}
		blocks, _ := message["content"].([]any)
		for _, value := range blocks {
			block, _ := value.(Object)
			if str(block, "text") == str(answer["content"].([]Object)[0], "text") {
				count++
			}
		}
	}
	if next.Mode != "rebuild" || count != 1 {
		t.Fatal("response-only record reused as native checkpoint or replayed twice", next.Mode)
	}
}
