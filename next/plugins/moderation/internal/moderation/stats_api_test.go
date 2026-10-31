package moderation

import (
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
