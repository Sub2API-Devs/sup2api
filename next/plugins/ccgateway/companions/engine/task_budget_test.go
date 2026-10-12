package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
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

func TestTaskBudgetPlan(t *testing.T) {
	for _, budget := range []any{nil, Object{"type": "tokens", "total": 64000}, Object{"type": "tokens", "total": 64000, "remaining": nil}, Object{"type": "tokens", "total": 64000, "remaining": 0}} {
		body := basic()
		body["output_config"] = Object{"effort": "high", "task_budget": budget}
		raw, _ := json.Marshal(body)
		req, err := parsePolicyRequest(raw, http.Header{"Anthropic-Beta": []string{taskBudgetBeta}})
		if err != nil {
			t.Fatal(err)
		}
		cfg, err := req.passthroughBodies()
		if err != nil {
			t.Fatal(err)
		}
		want, _ := json.Marshal(body["output_config"])
		if string(cfg.First["output_config"]) != string(want) || string(cfg.Rest["output_config"]) != string(want) {
			t.Fatal("task budget changed")
		}
	}
	for _, extra := range []Object{{}, {"format": Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{}, "additionalProperties": false}}}} {
		body := basic()
		extra["task_budget"] = Object{"type": "tokens", "total": 20000}
		body["output_config"] = extra
		raw, _ := json.Marshal(body)
		req, err := parsePolicyRequest(raw, http.Header{"Anthropic-Beta": []string{taskBudgetBeta}})
		if err != nil {
			t.Fatal(err)
		}
		cfg, err := req.passthroughBodies()
		if err != nil {
			t.Fatal(err)
		}
		want, _ := json.Marshal(extra)
		if string(cfg.First["output_config"]) != string(want) || string(cfg.Rest["output_config"]) != string(want) {
			t.Fatal("task-only or format+task config overwritten")
		}
	}
	// The retained plan validator still rejects invalid advisory budgets.
	// Native admission sends output_config unchanged; it does not invoke
	// this legacy validator or invent a gateway-owned token countdown.
	for _, budget := range []any{Object{"type": "time", "total": 1}, Object{"type": "tokens"}, Object{"type": "tokens", "total": -1}, Object{"type": "tokens", "total": 1.5}, Object{"type": "tokens", "total": 20000, "remaining": -1}, Object{"type": "tokens", "total": 20000, "extra": true}} {
		raw, _ := json.Marshal(Object{"output_config": Object{"task_budget": budget}})
		body, err := decodeObject(raw)
		if err != nil {
			t.Fatal(err)
		}
		before := digest(body)
		plan := &RequestPlan{}
		if err := plan.takeTaskBudget(body); err == nil || len(plan.taskBudget) != 0 || digest(body) != before {
			t.Fatal("invalid task budget changed plan or source", err)
		}
	}
}

func TestTaskBudgetCompactionBoundary(t *testing.T) {
	plan := &RequestPlan{taskBudget: json.RawMessage(`{"type":"tokens","total":64000,"remaining":0}`), fields: map[string]json.RawMessage{"compaction": json.RawMessage(`{"type":"summarize"}`)}}
	req := &Request{Plan: plan, Betas: []string{taskBudgetBeta}}
	if err := plan.validateTaskBudget(req); err == nil {
		t.Fatal("remaining accepted with compaction request")
	}
	delete(plan.fields, "compaction")
	req.Messages = []Message{{Role: "assistant", Content: []Object{{"type": "compaction", "content": "fixture", "signature": "fixture"}}}}
	if err := plan.validateTaskBudget(req); err == nil {
		t.Fatal("remaining accepted with signed compaction history")
	}
	plan.taskBudget = json.RawMessage(`{"type":"tokens","total":64000}`)
	if err := plan.validateTaskBudget(req); err != nil {
		t.Fatal(err)
	}
}

func TestRealCLITaskBudgetCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated task budget test")
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
	var wire Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		if r.Header.Get(helperhistory.Header) != "" || bytes.Contains(raw, []byte(`"attempt_id"`)) {
			t.Error("ordinary budget acquired private carrier")
		}
		if bytes.Contains(raw, []byte("<ccgateway-request:")) {
			t.Error("marker leaked")
		}
		if !strings.Contains(r.Header.Get("anthropic-beta"), taskBudgetBeta) {
			t.Error("task budget beta missing")
		}
		mu.Lock()
		wire = body
		mu.Unlock()
		writeDocumentProbeReply(w, str(body, "model"), false)
	}))
	defer fake.Close()
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}
	gateway := func() *Gateway {
		cache, e := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
		if e != nil {
			t.Fatal(e)
		}
		return &Gateway{Runner: runner, Cache: cache, Timeout: 30 * time.Second, Slots: make(chan struct{}, 2)}
	}
	g := gateway()
	body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": "TASK_START"}}, "output_config": Object{"effort": "high", "task_budget": Object{"type": "tokens", "total": 64000}}}
	post := func(label string, g *Gateway) Object {
		t.Helper()
		raw, _ := json.Marshal(body)
		g.Key = "budget-fixture"
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		req.Header.Set("x-api-key", g.Key)
		req.Header.Set("anthropic-beta", taskBudgetBeta)
		setTestSession(t, req, "task-budget-fixture")
		res := httptest.NewRecorder()
		g.ServeHTTP(res, req)
		if res.Code != 200 {
			t.Fatalf("%s HTTP%d %s", label, res.Code, res.Body.String())
		}
		mu.Lock()
		out := wire
		mu.Unlock()
		if digest(out["output_config"]) != digest(body["output_config"]) {
			t.Fatalf("%s budget changed", label)
		}
		t.Logf("%s history=%s", label, res.Header().Get("X-CCGateway-History"))
		if body["stream"] == true {
			if !strings.Contains(res.Body.String(), "message_stop") {
				t.Fatal("SSE did not finish")
			}
			return nil
		}
		answer, e := decodeObject(res.Body.Bytes())
		if e != nil {
			t.Fatal(e)
		}
		return answer
	}
	first := post("new", g)
	base := append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]})
	body["messages"] = append(append([]any(nil), base...), Object{"role": "user", "content": "TASK_NEXT"})
	second := post("continue", g)
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "TASK_CHANGED"})
	body["output_config"].(Object)["task_budget"] = Object{"type": "tokens", "total": 80000, "remaining": 42000}
	post("changed-budget", g)
	body["messages"] = append(append([]any(nil), base...), Object{"role": "user", "content": "TASK_BRANCH"})
	post("rollback", g)
	post("import", gateway())
	body["stream"] = true
	post("SSE", gateway())
}
