package moderation

import (
	"encoding/json"
	"fmt"
	"testing"
)

// TestStatsEndpoints runs a hit and a pass through a one-stage pre flow and
// reads them back from /status, /stats/trend, /stats/performance and
// /stats/categories (CONTRACTS §72.14.2).
func TestStatsEndpoints(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	if r := mustHook(t, h, hookReq("MOD-HIT-sexual words")); !denied(r) {
		t.Fatalf("hit allowed: %+v", r)
	}
	if r := mustHook(t, h, hookReq("hello world")); denied(r) {
		t.Fatalf("pass denied: %+v", r)
	}
	waitEvents(t, h, map[string]string{"result": "block"}, 1)

	st := decodeData[Status](t, h.Do("GET", "/status", map[string]string{"tz": "480"}, nil))
	if st.Today.Audited != 2 || st.Today.Suspicious != 1 || st.Today.Blocked != 1 || st.Today.AuditorCalls != 2 {
		t.Fatalf("today = %+v", st.Today)
	}
	if len(st.Funnels) != 1 || st.Funnels[0].FlowID != flow || len(st.Funnels[0].Stages) != 1 ||
		st.Funnels[0].Stages[0] != (FunnelStage{Stage: 1, Received: 2, Hit: 1, Passed: 1}) {
		t.Fatalf("funnels = %+v", st.Funnels)
	}
	if len(st.Auditors) != 1 || st.Auditors[0].Audited != 2 || st.Auditors[0].Hits != 1 || st.Auditors[0].Flagged {
		t.Fatalf("auditor health = %+v", st.Auditors)
	}
	if len(st.Channels) != 1 || st.Channels[0].Calls != 2 || st.Channels[0].Errors != 0 {
		t.Fatalf("channel health = %+v", st.Channels)
	}
	if st.Watch.Watching != 1 || st.Watch.WatchingWithNew != 1 || len(st.Attention) != 1 ||
		st.Attention[0].UserID != 3 || st.Attention[0].HitsSinceSeen != 1 {
		t.Fatalf("watch = %+v attention = %+v", st.Watch, st.Attention)
	}
	if len(st.StatusLine.BoundGroups) != 1 || st.StatusLine.BoundGroups[0] != 9 || st.StatusLine.EnabledFlows != 1 {
		t.Fatalf("status line = %+v", st.StatusLine)
	}

	tr := decodeData[TrendResult](t, h.Do("GET", "/stats/trend", map[string]string{"granularity": "day"}, nil))
	if len(tr.Flows) != 1 || len(tr.Flows[0].Points) != 14 {
		t.Fatalf("trend = %+v", tr)
	}
	last := tr.Flows[0].Points[13]
	if last.Audited != 2 || last.Hit != 1 || last.Blocked != 1 || last.SuspiciousRate != 0.5 {
		t.Fatalf("trend point = %+v", last)
	}
	if len(tr.Auditors) != 1 || tr.Auditors[0].Stage != 1 || tr.Auditors[0].Points[13].HitRate != 0.5 {
		t.Fatalf("auditor trend = %+v", tr.Auditors)
	}

	perf := decodeData[PerformanceResult](t, h.Do("GET", "/stats/performance", nil, nil))
	if perf.Summary.Count != 2 || len(perf.Auditors) != 1 || perf.Auditors[0].Count != 2 {
		t.Fatalf("performance = %+v", perf)
	}
	byFlow := decodeData[PerformanceResult](t, h.Do("GET", "/stats/performance", map[string]string{"flow_id": fmt.Sprint(flow)}, nil))
	if byFlow.Summary.Count != 2 {
		t.Fatalf("flow performance = %+v", byFlow.Summary)
	}

	cats := decodeData[CategoryStats](t, h.Do("GET", "/stats/categories", nil, nil))
	if cats.SuspiciousRequests != 1 || len(cats.Items) != 1 || cats.Items[0].Category != "sexual" || cats.Truncated {
		t.Fatalf("categories = %+v", cats)
	}

	for _, bad := range []map[string]string{{"granularity": "week"}, {"tz": "abc"}, {"from": "yesterday"}, {"flow_id": "-1"}} {
		if r := h.Do("GET", "/stats/trend", bad, nil); r.GetStatus() != 400 {
			t.Errorf("trend %v = %d", bad, r.GetStatus())
		}
	}

	// A level change resets the new-hit count.
	w := decodeData[Watch](t, h.Do("PATCH", "/watchlist/3", nil, map[string]any{"level": LevelEnforce}))
	if w.HitsSinceSeen != 0 {
		t.Fatalf("hits_since_seen after a level change = %d", w.HitsSinceSeen)
	}
}

// TestListFigures checks the list columns, the channel delete checks, the
// tested URL and trying an unsaved auditor (CONTRACTS §72.14.3).
func TestListFigures(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	mustHook(t, h, hookReq("MOD-HIT-sexual words"))
	waitEvents(t, h, map[string]string{"result": "block"}, 1)
	h.Do("GET", "/status", nil, nil) // flushes this node's counts

	flows := decodeData[[]FlowView](t, h.Do("GET", "/flows", nil, nil))
	if len(flows) != 1 || flows[0].ID != flow || flows[0].Stats24h == nil || flows[0].Stats24h.Audited != 1 || flows[0].Stats24h.SuspiciousRate != 1 {
		t.Fatalf("flow stats = %+v", flows[0].Stats24h)
	}
	auds := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", map[string]string{"tz": "480"}, nil))
	if len(auds) != 1 || auds[0].Today == nil || auds[0].Today.Calls != 1 {
		t.Fatalf("auditor today = %+v", auds[0].Today)
	}
	chans := decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))
	ch := chans[0]
	if ch.Health == nil || ch.Health.Calls1h != 1 || len(ch.UsedBy) != 1 || ch.UsedBy[0].ID != auds[0].ID || ch.IsAnalysis {
		t.Fatalf("channel figures = %+v used_by %+v", ch.Health, ch.UsedBy)
	}

	r := h.Do("DELETE", fmt.Sprintf("/channels/%d", ch.ID), nil, nil)
	var conflict struct {
		Error struct {
			Code    string `json:"code"`
			Details struct {
				Auditors []IDName `json:"auditors"`
			} `json:"details"`
		} `json:"error"`
	}
	_ = json.Unmarshal(r.GetBody(), &conflict)
	if r.GetStatus() != 409 || conflict.Error.Code != "channel_in_use" || len(conflict.Error.Details.Auditors) != 1 {
		t.Fatalf("delete in use = %d %s", r.GetStatus(), r.GetBody())
	}

	test := decodeData[ChannelTestResult](t, h.Do("POST", fmt.Sprintf("/channels/%d/test", ch.ID), nil, nil))
	if test.URL != mod.srv.URL+"/v1/moderations" {
		t.Fatalf("tested url = %q", test.URL)
	}

	// An unsaved auditor: type and channel from the body, no stored row.
	try := decodeData[TryResult](t, h.Do("POST", "/auditors/0/try", nil, map[string]any{
		"text": "MOD-HIT-sexual words", "type": AuditorOpenAI, "channel_id": ch.ID, "config": map[string]any{"thresholds": map[string]float64{"sexual": 1}}}))
	if try.Outcome.Hit {
		t.Fatalf("draft threshold not applied: %+v", try.Outcome)
	}
	if r := h.Do("POST", "/auditors/0/try", nil, map[string]any{"text": "x", "type": AuditorTypeSafe, "channel_id": ch.ID}); r.GetStatus() != 400 {
		t.Fatalf("type mismatch = %d", r.GetStatus())
	}
}
