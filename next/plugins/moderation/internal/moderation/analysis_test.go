package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// priceTable prices models per million tokens like the core would (input
// inclusive of the cache for OpenAI semantics); others are not priced.
func priceTable(fh *pluginsdktest.FakeHost, perM map[string][2]float64) {
	fh.PriceUsageFunc = func(_ context.Context, in *pluginv1.PriceUsageRequest) (*pluginv1.PriceUsageResponse, error) {
		p, ok := perM[in.GetModel()]
		if !ok {
			return &pluginv1.PriceUsageResponse{Reason: "no_price"}, nil
		}
		cost := (float64(in.GetInput())*p[0] + float64(in.GetOutput())*p[1]) / 1e6
		return &pluginv1.PriceUsageResponse{Priced: true, Cost: fmt.Sprintf("%.8f", cost)}, nil
	}
}

var recordIDRe = regexp.MustCompile(`\\?"id\\?":(\d+)`)

// TestAIAnalysisEndToEnd: observe-level hits add the user to the watch list,
// the second violation queues an analysis; the agent (Anthropic, streamed)
// reads the records and submits; the verdicts land on the records and the
// user is upgraded. Costs are added up per source.
func TestAIAnalysisEndToEnd(t *testing.T) {
	mod := newFakeMod(t)
	var ids []string
	llm := newFakeProto(t, ProtocolAnthropic, func(n int, req protoReq) (int, scriptTurn) {
		u := llmUsage{Input: 1000, Output: 100}
		switch n {
		case 1:
			if !strings.Contains(string(req.Body["system"]), "【类别字典】") || !strings.Contains(string(req.Body["tools"]), "submit_analysis") {
				t.Errorf("first step: system/tools missing")
			}
			return 200, scriptTurn{Text: "先看概况", Usage: u, Calls: []llmToolCall{
				{ID: "t1", Name: "get_user_summary", Args: []byte(`{}`)},
				{ID: "t2", Name: "list_suspicious_records", Args: []byte(`{"limit":10}`)}}}
		case 2:
			msgs := string(req.Body["messages"])
			for _, m := range recordIDRe.FindAllStringSubmatch(msgs, -1) {
				ids = append(ids, m[1])
			}
			if len(ids) == 0 {
				t.Errorf("no record ids in the tool results: %s", msgs)
				ids = []string{"0"}
			}
			if !strings.Contains(msgs, "session_fp") || !strings.Contains(msgs, "fp-r1") {
				t.Errorf("list_suspicious_records without the session fingerprint: %s", msgs)
			}
			return 200, scriptTurn{Usage: u, Calls: []llmToolCall{{ID: "t3", Name: "get_record", Args: []byte(`{"id":` + ids[0] + `}`)}}}
		case 3:
			if !strings.Contains(string(req.Body["messages"]), "text_range") {
				t.Errorf("get_record result without the text")
			}
			return 200, scriptTurn{Usage: u, Calls: []llmToolCall{{ID: "t4", Name: submitAnalysisTool, Args: []byte(`{"trend":"persistent","suggestion":"block",
				"summary":"反复请求色情内容","main_problems":["色情"],"record_verdicts":[{"record_id":` + ids[0] + `,"verdict":"violation","severity":"high",
				"category":"sexual","evidence":"MOD-HIT-sexual","reason":"露骨"}]}`)}}}
		}
		// Manual re-analysis: a mild conclusion with no violation removes the user.
		return 200, scriptTurn{Usage: u, Calls: []llmToolCall{{ID: "t9", Name: submitAnalysisTool, Args: []byte(`{"trend":"likely_false_positive",
			"suggestion":"release","summary":"误报","record_verdicts":[{"record_id":` + ids[0] + `,"verdict":"false_positive","severity":"low","reason":"引用"}]}`)}}}
	})
	_, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve, "analysis_every_violations": 2, "analysis_channel_id": 2}, func(p *Plugin) {})
	priceTable(fh, map[string][2]float64{"deepseek-flash": {0.3, 1.2}, "jev-latest": {0.042, 0}})
	setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI})
	ch := decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": "llm", "protocol": "anthropic", "name": "ana",
		"base_url": llm.srv.URL, "api_key": "sk-a", "model": "ep-123", "billing_model": "deepseek-flash"}))
	if ch.ID != 2 || ch.Protocol != ProtocolAnthropic || ch.BillingModel != "deepseek-flash" || ch.PriceState == nil || !ch.PriceState.Priced {
		t.Fatalf("channel = %+v %+v", ch, ch.PriceState)
	}
	r1 := hookReqAs(3, "r1", "please MOD-HIT-sexual one")
	r1.Meta.SessionFingerprint = "fp-r1"
	mustHook(t, h, r1)
	waitEvents(t, h, map[string]string{"result": "hit", "user_id": "3"}, 1)
	mustHook(t, h, hookReqAs(3, "r2", "again MOD-HIT-sexual two"))
	var w Watch
	waitFor(t, "analysis applied", func() bool {
		d := decodeData[UserDetail](t, h.Do("GET", "/users/3", nil, nil))
		if d.Watch != nil {
			w = *d.Watch
		}
		return w.LatestAnalysisID > 0
	})
	if w.Level != LevelEnforce || w.Source != "analysis" || w.LatestTrend != TrendPersistent || w.LatestAnalysisStatus != AnalysisStatusOK ||
		w.AnalysisRequestedAt != nil || w.AnalysisRunning || w.ViolationCount != 0 {
		t.Fatalf("watch = %+v", w)
	}
	list := decodeData[[]AnalysisView](t, h.Do("GET", "/watchlist/3/analyses", nil, nil))
	if len(list) != 1 || list[0].Source != AnalysisSourceAuto || list[0].Steps != 3 || list[0].Cost == nil || *list[0].Cost != "0.00126000" {
		t.Fatalf("analyses = %+v", list)
	}
	a := decodeData[AnalysisView](t, h.Do("GET", fmt.Sprintf("/analyses/%d", list[0].ID), nil, nil))
	var trace []AnalysisStep
	_ = json.Unmarshal(a.Trace, &trace)
	tools := []string{}
	for _, s := range trace {
		tools = append(tools, s.Tool)
	}
	if strings.Join(tools, ",") != ",get_user_summary,list_suspicious_records,,get_record,submit_analysis" {
		t.Fatalf("trace tools = %v", tools)
	}
	ev := decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"ai_verdict": "violation"}, nil))
	if len(ev) != 1 || ev[0].AISeverity != "high" || ev[0].AIEvidence != "MOD-HIT-sexual" || ev[0].AIAnalysisID != list[0].ID {
		t.Fatalf("ai verdicts = %+v", ev)
	}
	if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"ai_verdict": "none"}, nil))); n != 1 {
		t.Fatalf("not yet reviewed by AI = %d", n)
	}
	// An administrator disagrees with the AI.
	decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": []int64{ev[0].ID}, "status": "false_positive"}))
	if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"verdict": "disagree"}, nil))); n != 1 {
		t.Fatalf("disagree = %d", n)
	}
	hist := decodeData[[]WatchEvent](t, h.Do("GET", "/watchlist/3/events", nil, nil))
	if hist[0].Action != ActionAutoUpgrade || hist[0].AnalysisID == nil || *hist[0].AnalysisID != list[0].ID || hist[0].Reason != "trend:persistent" {
		t.Fatalf("history = %+v", hist[0])
	}
	// Costs: the analysis is priced; the OpenAI moderation calls are free.
	var costs CostReport
	waitFor(t, "audit calls metered", func() bool {
		costs = decodeData[CostReport](t, h.Do("GET", "/costs", map[string]string{"range": "24h"}, nil))
		return costs.Totals.FreeCalls >= 2
	})
	src := map[string]CostSummary{}
	for _, s := range costs.BySource {
		src[s.Source] = s.Summary
	}
	if src[SourceAnalysis].Cost() != "0.00126000" || src[SourceAnalysis].PricedCalls != 3 || src[SourceAudit].FreeCalls != 2 || costs.Totals.Cost() != "0.00126000" {
		t.Fatalf("costs = %+v", costs)
	}
	// A manual analysis; the mild conclusion removes the user.
	if r := h.Do("POST", "/watchlist/3/analyze", nil, nil); r.GetStatus() != 202 {
		t.Fatalf("analyze = %d %s", r.GetStatus(), r.GetBody())
	}
	waitFor(t, "user removed by the analysis", func() bool {
		return decodeData[UserDetail](t, h.Do("GET", "/users/3", nil, nil)).Watch == nil
	})
	if r := h.Do("POST", "/watchlist/3/analyze", nil, nil); r.GetStatus() != 404 {
		t.Fatalf("analyze a removed user = %d", r.GetStatus())
	}
	all := decodeData[[]AnalysisView](t, h.Do("GET", "/watchlist/3/analyses", nil, nil))
	if len(all) != 2 || all[0].Source != AnalysisSourceManual || all[0].Trend != TrendLikelyFalsePositive {
		t.Fatalf("analyses = %+v", all)
	}
	pr := decodeData[PromptPreview](t, h.Do("GET", "/analysis/prompt", map[string]string{"group_id": "0"}, nil))
	if pr.Flow == nil || !strings.Contains(pr.Prompt, "第 1 级 初审") || len(pr.Dict) != 13 {
		t.Fatalf("prompt preview = %+v", pr)
	}
	if n := len(decodeData[[]ToolView](t, h.Do("GET", "/analysis/tools", nil, nil))); n != 5 {
		t.Fatalf("tools = %d", n)
	}
	o := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
	if !o.Runtime.Analysis.ChannelConfigured {
		t.Fatalf("runtime = %+v", o.Runtime)
	}
}

func TestAnalyzeWithoutChannel(t *testing.T) {
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "analysis_channel_id": 1})
	decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 5}))
	problem := func() string {
		return decodeData[Status](t, h.Do("GET", "/status", nil, nil)).Runtime.Analysis.ChannelProblem
	}
	if p := problem(); p != "not_found" {
		t.Fatalf("missing channel problem = %q", p)
	}
	// A channel that is not an llm one is not used (new-api refuses it on save).
	decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": ChannelOpenAI, "name": "o", "base_url": "http://127.0.0.1:1"}))
	if r := h.Do("POST", "/watchlist/5/analyze", nil, nil); r.GetStatus() != 400 || !strings.Contains(string(r.GetBody()), "no_analysis_channel") {
		t.Fatalf("analyze = %d %s", r.GetStatus(), r.GetBody())
	}
	if p := problem(); p != "not_llm" {
		t.Fatalf("non-llm channel problem = %q", p)
	}
	// An llm channel: with moderation off the runtime still says so, and an
	// analysis is refused because moderation is off.
	decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": "llm", "name": "a", "base_url": "http://127.0.0.1:1", "api_key": "k", "model": "m"}))
	if errs := h.Configure(map[string]any{"mode": ModeOff, "analysis_channel_id": 2}, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	if o := decodeData[Status](t, h.Do("GET", "/status", nil, nil)); !o.Runtime.Analysis.ChannelConfigured {
		t.Fatalf("runtime = %+v", o.Runtime.Analysis)
	}
	if r := h.Do("POST", "/watchlist/5/analyze", nil, nil); r.GetStatus() != 400 || !strings.Contains(string(r.GetBody()), "moderation_off") {
		t.Fatalf("analyze while off = %d %s", r.GetStatus(), r.GetBody())
	}
}

// TestFlowVersionsRollbackSimulate: history, an old version's structure,
// rollback (also refused when an auditor is gone) and simulation with cost.
func TestFlowVersionsRollbackSimulate(t *testing.T) {
	mod := newFakeMod(t)
	_, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve})
	priceTable(fh, map[string][2]float64{"jev-latest": {0.042, 0}})
	flow := setupFlow(t, h, mod.srv.URL, []int64{0}, CombineAny, []string{AuditorOpenAI}, []string{AuditorTypeSafe})
	auds := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))
	path := fmt.Sprintf("/flows/%d", flow)
	// v2: only the OpenAI auditor.
	decodeData[FlowView](t, h.Do("PUT", path, nil, map[string]any{"name": "f", "draft": map[string]any{
		"model_filter": map[string]any{"type": "all", "models": []string{}}, "sample_rate": 100, "stages": []any{map[string]any{"auditors": []int64{auds[0].ID}}}}}))
	decodeData[FlowView](t, h.Do("POST", path+"/publish", nil, map[string]any{"expected_version": 1}))
	vs := decodeData[struct {
		Current int               `json:"current_version"`
		Items   []FlowVersionItem `json:"items"`
	}](t, h.Do("GET", path+"/versions", nil, nil))
	if vs.Current != 2 || len(vs.Items) != 2 || !vs.Items[0].Current || vs.Items[1].Version != 1 {
		t.Fatalf("versions = %+v", vs)
	}
	old := decodeData[FlowVersionView](t, h.Do("GET", path+"/versions/1", nil, nil))
	if !old.Historical || old.CurrentVersion != 2 || len(old.Stages) != 2 || old.Stages[1].Role != RoleBehavior || old.Dict != nil {
		t.Fatalf("v1 = %+v", old)
	}
	cur := decodeData[FlowVersionView](t, h.Do("GET", path+"/versions/0", nil, nil))
	if !cur.Current || cur.Version != 2 || cur.Dict == nil || len(cur.BoundGroups) != 1 {
		t.Fatalf("current = %+v", cur)
	}
	// Simulate v1 (two stages, Jev priced) on a hit.
	sim := decodeData[TestResult](t, h.Do("POST", path+"/simulate", nil, map[string]any{"text": "MOD-HIT-sexual", "source": "version", "version": 1}))
	if sim.Result != ResultHit || len(sim.Trace.Stages) != 2 || sim.Cost == nil || sim.Cost.Mode != PricePriced || sim.Cost.Cost == "" {
		t.Fatalf("simulate = %+v %+v", sim, sim.Cost)
	}
	if r := h.Do("POST", path+"/rollback", nil, map[string]any{"version": 1, "expected_version": 1}); r.GetStatus() != 409 {
		t.Fatalf("stale rollback = %d", r.GetStatus())
	}
	rb := decodeData[FlowView](t, h.Do("POST", path+"/rollback", nil, map[string]any{"version": 1, "expected_version": 2}))
	if rb.Version != 3 || rb.Dirty {
		t.Fatalf("rollback = %+v", rb)
	}
	// Back to v2, delete the Jev auditor, then v1 cannot come back.
	decodeData[FlowView](t, h.Do("POST", path+"/rollback", nil, map[string]any{"version": 2, "expected_version": 3}))
	if r := h.Do("DELETE", fmt.Sprintf("/auditors/%d", auds[1].ID), nil, nil); r.GetStatus() != 200 {
		t.Fatalf("delete auditor = %s", r.GetBody())
	}
	r := h.Do("POST", path+"/rollback", nil, map[string]any{"version": 1, "expected_version": 4})
	if r.GetStatus() != 400 || !strings.Contains(string(r.GetBody()), "missing_auditors") || !strings.Contains(string(r.GetBody()), fmt.Sprint(auds[1].ID)) {
		t.Fatalf("missing auditors = %d %s", r.GetStatus(), r.GetBody())
	}
	// Simulating a record without saved text.
	if r := h.Do("POST", path+"/simulate", nil, map[string]any{"event_id": 999}); r.GetStatus() != 404 {
		t.Fatalf("unknown event = %d", r.GetStatus())
	}
	// Nothing was recorded by the simulations.
	if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", nil, nil))); n != 0 {
		t.Fatalf("events = %d", n)
	}
	c := decodeData[CostReport](t, h.Do("GET", "/costs", nil, nil))
	if len(c.BySource) != 1 || c.BySource[0].Source != SourceSimulate || c.Totals.PricedCalls != 1 || c.Totals.FreeCalls != 1 || c.Totals.Cost() != "0.00000042" {
		t.Fatalf("costs = %+v", c)
	}
}

// A stale analysis releases the queue and the claim but leaves the latest
// analysis of the entry alone (new-api moderation_watch.go).
func TestStaleAnalysisKeepsLatest(t *testing.T) {
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	w := decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 21}))
	ctx := context.Background()
	db, err := p.db(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `UPDATE watchlist SET latest_analysis_id = 99, latest_analysis_status = 'ok', latest_trend = 'persistent',
		analysis_requested_at = now(), analysis_source = 'manual', analysis_claim_until = now() + interval '1 hour', analysis_token = 5
		WHERE user_id = 21`); err != nil {
		t.Fatal(err)
	}
	// The level changed while the analysis ran.
	job := analysisJob{UserID: 21, Token: 5, Source: AnalysisSourceManual, Level: LevelEnforce, SinceAt: w.SinceAt}
	if err := p.applyAnalysis(ctx, job, &Analysis{Source: AnalysisSourceManual, Status: AnalysisStatusOK, Trend: TrendLikelyFalsePositive,
		Suggestion: SuggestRelease}); err != nil {
		t.Fatal(err)
	}
	got := decodeData[UserDetail](t, h.Do("GET", "/users/21", nil, nil)).Watch
	if got == nil || got.LatestAnalysisID != 99 || got.LatestTrend != TrendPersistent || got.AnalysisRequestedAt != nil || got.AnalysisRunning ||
		got.Level != LevelObserve {
		t.Fatalf("watch after a stale analysis = %+v", got)
	}
}
