package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/batch"
)

func TestStatsAPIs(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI}, []string{AuditorTypeSafe})
	mustHook(t, h, hookReq("MOD-HIT-hate words"))   // overturned by stage 2
	mustHook(t, h, hookReq("MOD-HIT-sexual words")) // blocked
	mustHook(t, h, hookReq("clean text"))
	mustHook(t, h, hookReq("clean text")) // pass cache
	waitEvents(t, h, map[string]string{"result": "block"}, 1)

	st := decodeData[Status](t, h.Do("GET", "/status", map[string]string{"tz_offset_minutes": "480"}, nil))
	if st.Today.Audited != 4 || st.Today.Suspicious != 1 || st.Today.Blocked != 1 || st.Today.Overturned != 1 || st.Today.CacheSkipped != 1 {
		t.Fatalf("today = %+v", st.Today)
	}
	if len(st.Funnels) != 1 || st.Funnels[0].FlowID != flow || len(st.Funnels[0].Stages) != 2 ||
		st.Funnels[0].Stages[0].Received != 3 || st.Funnels[0].Stages[1].Received != 2 || st.Funnels[0].Stages[1].Hit != 1 {
		t.Fatalf("funnels = %+v", st.Funnels)
	}
	if len(st.Auditors) != 2 || len(st.Channels) != 2 || st.AlertPercent != 5 || st.Watch.Watching != 1 || st.Watch.WatchingWithNew != 1 {
		t.Fatalf("status = %+v", st)
	}
	tr := decodeData[TrendResult](t, h.Do("GET", "/stats/trend", map[string]string{"granularity": "hour"}, nil))
	if len(tr.Flows) != 1 || len(tr.Flows[0].Points) != 1 || tr.Flows[0].Points[0].Hit != 1 || len(tr.Auditors) != 2 {
		t.Fatalf("trend = %+v", tr)
	}
	perf := decodeData[PerformanceResult](t, h.Do("GET", "/stats/performance", nil, nil))
	if perf.Summary.Count != 3 || len(perf.Auditors) != 2 { // the cached request adds no latency sample
		t.Fatalf("performance = %+v", perf.Summary)
	}
	if resp := h.Do("GET", "/stats/trend", map[string]string{"granularity": "week"}, nil); resp.GetStatus() != 400 {
		t.Fatalf("bad granularity = %d", resp.GetStatus())
	}
	cats := decodeData[CategoryStats](t, h.Do("GET", "/stats/categories", nil, nil))
	if cats.SuspiciousRequests != 1 || len(cats.Items) == 0 || cats.Items[0].Category != "sexual" {
		t.Fatalf("categories = %+v", cats)
	}
	flows := decodeData[[]FlowView](t, h.Do("GET", "/flows", nil, nil))
	if flows[0].Stats24h == nil || flows[0].Stats24h.Audited != 4 || flows[0].Stats24h.Suspicious != 1 {
		t.Fatalf("flow stats = %+v", flows[0].Stats24h)
	}
	auds := decodeData[[]AuditorView](t, h.Do("GET", "/auditors", nil, nil))
	if auds[0].Today == nil || auds[0].Today.Calls != 3 || auds[0].ChannelName == "" || !auds[0].ChannelEnabled {
		t.Fatalf("auditor = %+v", auds[0])
	}
	chans := decodeData[[]ChannelView](t, h.Do("GET", "/channels", nil, nil))
	if chans[0].Stats == nil || chans[0].Stats.Calls1h != 3 || len(chans[0].UsedBy) != 1 {
		t.Fatalf("channel = %+v", chans[0])
	}
	// The cleanup keeps statistics younger than stats_retention_days.
	if _, err := p.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: JobCleanup}); err != nil {
		t.Fatal(err)
	}
	if st := decodeData[Status](t, h.Do("GET", "/status", nil, nil)); st.Today.Audited != 4 {
		t.Fatalf("after cleanup = %+v", st.Today)
	}
}

func TestFlowDraftTimeoutAndDelete(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI}, []string{AuditorTypeSafe})
	f := decodeData[FlowView](t, h.Do("GET", fmt.Sprintf("/flows/%d", flow), nil, nil))
	draft, _ := ParseSpec(f.Draft)
	pub, _ := ParseSpec(f.Published)
	// The draft keeps "automatic"; the published spec has the computed sum.
	if draft.TotalTimeoutMs != 0 || pub.TotalTimeoutMs != 3000+8000 || f.StageTimeoutSumMs != 11000 || f.Dirty || f.HasDraftChanges {
		t.Fatalf("flow = %+v draft %d published %d", f, draft.TotalTimeoutMs, pub.TotalTimeoutMs)
	}
	if resp := h.Do("DELETE", fmt.Sprintf("/flows/%d", flow), nil, nil); resp.GetStatus() != 409 || !strings.Contains(string(resp.GetBody()), "flow_in_use") {
		t.Fatalf("delete in use = %d %s", resp.GetStatus(), resp.GetBody())
	}
	decodeData[FlowView](t, h.Do("PUT", fmt.Sprintf("/flows/%d/enabled", flow), nil, map[string]any{"enabled": false}))
	decodeData[map[string]any](t, h.Do("DELETE", fmt.Sprintf("/flows/%d", flow), nil, nil))
}

func TestWatchListFiltersAndSeen(t *testing.T) {
	mod := newFakeMod(t)
	_, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	mustHook(t, h, hookReqAs(11, "", "MOD-HIT-violence one"))
	mustHook(t, h, hookReqAs(12, "", "MOD-HIT-sexual one"))
	mustHook(t, h, hookReqAs(12, "", "MOD-HIT-sexual two"))
	list := func(q map[string]string) []WatchItem {
		var items []WatchItem
		waitFor(t, "watch list", func() bool {
			items = decodeData[[]WatchItem](t, h.Do("GET", "/watchlist", q, nil))
			return q["new_only"] != "" || len(items) > 0
		})
		return items
	}
	waitFor(t, "both users", func() bool { return len(list(map[string]string{})) == 2 })
	waitFor(t, "user 12 hits", func() bool { return list(map[string]string{"user_id": "12"})[0].HitsSinceSeen == 2 })
	items := list(map[string]string{"sort": "total"})
	if items[0].UserID != 12 || items[0].SuspiciousTotal != 2 || items[0].GroupID != 9 || items[0].Flow == nil ||
		len(items[0].TopCategories) == 0 || items[0].TopCategories[0].Category != "sexual" {
		t.Fatalf("watch items = %+v", items)
	}
	if got := list(map[string]string{"category": "violence"}); len(got) != 1 || got[0].UserID != 11 {
		t.Fatalf("category filter = %+v", got)
	}
	if got := list(map[string]string{"user_ids": "11,99"}); len(got) != 1 || got[0].UserID != 11 {
		t.Fatalf("user_ids filter = %+v", got)
	}
	decodeData[map[string]any](t, h.Do("POST", "/watchlist/12/seen", nil, nil))
	if got := list(map[string]string{"new_only": "true"}); len(got) != 1 || got[0].UserID != 11 {
		t.Fatalf("new_only after seen = %+v", got)
	}
	// Absolute expiry, reason and the analysis link go to the history. The
	// answer is the entry as stored: a level change resets the new hits and
	// makes the entry manual.
	w := decodeData[Watch](t, h.Do("PATCH", "/watchlist/11", nil, map[string]any{"level": "enforce", "expires_at": "2099-01-01T00:00:00Z", "reason": "manual check"}))
	if w.ExpiresAt == nil || w.ExpiresAt.Year() != 2099 || w.HitsSinceSeen != 0 || w.Source != "manual" {
		t.Fatalf("absolute expiry = %+v", w)
	}
	evs := decodeData[[]WatchEvent](t, h.Do("GET", "/watchlist/11/events", nil, nil))
	if evs[0].Action != "set_level" || evs[0].Reason != "manual check" {
		t.Fatalf("history = %+v", evs[0])
	}
	// The detail drawer answers for any user; a level change resets the new hits.
	d := decodeData[UserDetail](t, h.Do("GET", "/users/11", nil, nil))
	if d.Watch == nil || d.Watch.Level != LevelEnforce || d.Watch.HitsSinceSeen != 0 || d.Summary.Total != 1 || d.Summary.Pending != 1 ||
		d.Summary.AIVerdicts.None != 1 || d.Context.GroupID == nil || *d.Context.GroupID != 9 || d.Context.Flow == nil ||
		len(d.Context.Sources) != 1 || !d.Context.Sources[0].Current || len(d.Daily) != 1 || d.Daily[0].Suspicious != 1 {
		t.Fatalf("detail = %+v", d)
	}
	if d := decodeData[UserDetail](t, h.Do("GET", "/users/55", nil, nil)); d.Watch != nil || d.Summary.Total != 0 || d.Context.GroupID != nil ||
		d.Daily == nil || d.Context.Sources == nil {
		t.Fatalf("unknown user detail = %+v", d)
	}
	// Removing can record the reason and the analysis whose suggestion was applied.
	if resp := h.Do("DELETE", "/watchlist/12", map[string]string{"reason": "AI suggests release", "analysis_id": "7"}, nil); resp.GetStatus() != 200 {
		t.Fatalf("delete with reason = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if evs := decodeData[[]WatchEvent](t, h.Do("GET", "/watchlist/12/events", nil, nil)); evs[0].Action != "remove" || evs[0].Reason != "AI suggests release" ||
		evs[0].AnalysisID == nil || *evs[0].AnalysisID != 7 {
		t.Fatalf("remove history = %+v", evs[0])
	}
	// Without days or expires_at, enforce never expires and observe gets
	// watch_days (new-api addModerationWatch / updateModerationWatch).
	if w := decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 31, "level": "enforce"})); w.ExpiresAt != nil {
		t.Fatalf("new enforce entry expires %v", w.ExpiresAt)
	}
	if w := decodeData[Watch](t, h.Do("PATCH", "/watchlist/31", nil, map[string]any{"level": "observe"})); w.ExpiresAt == nil {
		t.Fatal("observe entry without expiry")
	}
	if w := decodeData[Watch](t, h.Do("PATCH", "/watchlist/31", nil, map[string]any{"level": "enforce"})); w.ExpiresAt != nil {
		t.Fatalf("enforce kept the observe expiry %v", w.ExpiresAt)
	}
	if w := decodeData[Watch](t, h.Do("PATCH", "/watchlist/31", nil, map[string]any{"level": "observe", "days": 0})); w.ExpiresAt != nil {
		t.Fatalf("explicit days 0 = %v", w.ExpiresAt)
	}
	if resp := h.Do("DELETE", "/watchlist/31", map[string]string{"analysis_id": "0"}, nil); resp.GetStatus() != 400 {
		t.Fatalf("delete with analysis_id 0 = %d", resp.GetStatus())
	}
	// Moderators are not put on the watch list by hand.
	fh.Authz = func(uid int64, _ string) bool { return uid == 77 }
	if resp := h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 77}); resp.GetStatus() != 400 {
		t.Fatalf("staff watch = %d %s", resp.GetStatus(), resp.GetBody())
	}
}

func TestErrorRateAlertAndNotice(t *testing.T) {
	mod := newFakeMod(t)
	var mu sync.Mutex
	var got []notice
	hook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var n notice
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &n)
		if !strings.HasPrefix(r.Header.Get("X-Signature"), "sha256=") {
			n.Event = "unsigned"
		}
		mu.Lock()
		got = append(got, n)
		mu.Unlock()
	}))
	t.Cleanup(hook.Close)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "notify_webhook_url": hook.URL, "notify_webhook_secret": "s3"})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	for i := range minAlertSamples {
		mustHook(t, h, hookReqAs(3, "", fmt.Sprintf("MOD-500 %d", i)))
	}
	waitFor(t, "errors counted", func() bool {
		st := decodeData[Status](t, h.Do("GET", "/status", nil, nil))
		return st.Today.Errors == minAlertSamples
	})
	for range 2 { // the second run sees the same state: no second notice
		if _, err := p.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: JobAlerts}); err != nil {
			t.Fatal(err)
		}
	}
	waitFor(t, "notice", func() bool {
		mu.Lock()
		defer mu.Unlock()
		return len(got) > 0
	})
	mu.Lock()
	defer mu.Unlock()
	if len(got) != 1 || got[0].Event != NoticeFlowErrorRate || got[0].Data["audited"] != float64(minAlertSamples) {
		t.Fatalf("notices = %+v", got)
	}
}

func TestDraftTryAndChannelProxy(t *testing.T) {
	mod := newFakeMod(t)
	var proxied sync.Map
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// An HTTP proxy gets the absolute URL; forward it to the fake upstream.
		proxied.Store(r.URL.Path, true)
		req, _ := http.NewRequest(r.Method, mod.srv.URL+r.URL.Path, r.Body)
		req.Header = r.Header
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			w.WriteHeader(502)
			return
		}
		defer resp.Body.Close()
		w.WriteHeader(resp.StatusCode)
		_, _ = io.Copy(w, resp.Body)
	}))
	t.Cleanup(proxy.Close)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	ch := decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": ChannelOpenAI, "name": "o", "base_url": "http://upstream.invalid",
		"api_key": "k", "proxy": "http://user:pw@" + strings.TrimPrefix(proxy.URL, "http://")}))
	if !ch.HasProxy || strings.Contains(ch.Proxy, "pw") || !strings.Contains(ch.Proxy, "user") {
		t.Fatalf("channel proxy = %+v", ch)
	}
	ct := decodeData[ChannelTestResult](t, h.Do("POST", fmt.Sprintf("/channels/%d/test", ch.ID), nil, nil))
	if _, ok := proxied.Load("/v1/moderations"); !ct.OK || !ok {
		t.Fatalf("test through proxy = %+v", ct)
	}
	if ct.URL != "http://upstream.invalid/v1/moderations" {
		t.Fatalf("test url = %q", ct.URL)
	}
	// Sending back the redacted proxy the console was shown keeps the real one.
	if resp := h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, map[string]any{"name": "o2", "base_url": "http://upstream.invalid", "proxy": ch.Proxy}); resp.GetStatus() != 200 {
		t.Fatalf("redacted proxy round trip = %d %s", resp.GetStatus(), resp.GetBody())
	}
	proxied.Clear()
	if ct := decodeData[ChannelTestResult](t, h.Do("POST", fmt.Sprintf("/channels/%d/test", ch.ID), nil, nil)); !ct.OK {
		t.Fatalf("test after round trip = %+v", ct)
	}
	if _, ok := proxied.Load("/v1/moderations"); !ok {
		t.Fatal("the proxy was lost by the round trip")
	}
	if resp := h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, map[string]any{"name": "o", "base_url": "http://upstream.invalid", "proxy": ""}); resp.GetStatus() != 400 ||
		!strings.Contains(string(resp.GetBody()), "api_key") {
		t.Fatalf("proxy change without key = %d %s", resp.GetStatus(), resp.GetBody())
	}
	if resp := h.Do("PUT", fmt.Sprintf("/channels/%d", ch.ID), nil, map[string]any{"name": "o", "base_url": "http://upstream.invalid", "proxy": "ftp://x"}); resp.GetStatus() != 400 {
		t.Fatalf("bad proxy = %d", resp.GetStatus())
	}
	// An unsaved auditor can be tried against a saved channel.
	try := decodeData[TryResult](t, h.Do("POST", "/auditors/try", nil, map[string]any{"text": "MOD-HIT-violence",
		"draft": map[string]any{"name": "d", "type": AuditorOpenAI, "channel_id": ch.ID}}))
	if !try.Hit || try.TopCategory != "violence" {
		t.Fatalf("draft try = %+v", try)
	}
	if resp := h.Do("POST", "/auditors/try", nil, map[string]any{"text": "x"}); resp.GetStatus() != 400 {
		t.Fatalf("try without draft = %d", resp.GetStatus())
	}
	if resp := h.Do("POST", "/auditors/try", nil, map[string]any{"text": "x", "draft": map[string]any{"config": "nope"}}); resp.GetStatus() != 400 {
		t.Fatalf("try with a malformed draft = %d", resp.GetStatus())
	}
	if resp := h.Do("POST", "/auditors/try", nil, map[string]any{"text": "x", "draft": map[string]any{"type": AuditorTypeSafe, "channel_id": ch.ID}}); resp.GetStatus() != 400 ||
		!strings.Contains(string(resp.GetBody()), "type_mismatch") {
		t.Fatalf("try on a channel of another type = %d %s", resp.GetStatus(), resp.GetBody())
	}
}

func TestMessageParts(t *testing.T) {
	parts, ok := MessageParts("openai.chat", `[{"role":"user","content":[{"type":"text","text":"hi"},{"type":"image_url","image_url":{"url":"https://x/a.png"}},
		{"type":"image_url","image_url":"iVBORw0KGgoAAA"}]}]`)
	if !ok || len(parts) != 3 || parts[1].Kind != "url" || parts[2].Src != "data:image/png;base64,iVBORw0KGgoAAA" {
		t.Fatalf("openai parts = %+v", parts)
	}
	parts, _ = MessageParts("gemini.generate", `[{"role":"user","parts":[{"text":"a"},{"inlineData":{"mimeType":"image/jpeg","data":"/9j/x"}}]}]`)
	if len(parts) != 2 || parts[1].Mime != "image/jpeg" {
		t.Fatalf("gemini parts = %+v", parts)
	}
	if got := MessageText("anthropic.messages", `[{"role":"user","content":"a  b"},{"role":"user","content":[{"type":"image","source":{"data":"zz"}}]}]`); got != "a b [图片]" {
		t.Fatalf("text = %q", got)
	}
	// The display shows what the hook moderated: a Gemini PDF is no image.
	parts, _ = MessageParts("gemini.generate", `[{"role":"user","parts":[{"text":"a"},{"inlineData":{"mimeType":"application/pdf","data":"JVBERi0x"}}]}]`)
	if len(parts) != 1 || parts[0].Type != "text" {
		t.Fatalf("gemini pdf parts = %+v", parts)
	}
	if _, ok := MessageParts("openai.chat", "not json"); ok {
		t.Fatal("invalid JSON parsed")
	}
}

// testRec is a record as finish builds it.
func testRec(uid int64, requestID, result, highest string, cats ...string) eventRec {
	now := time.Now().UTC()
	r := eventRec{At: now, RequestID: requestID, UserID: uid, GroupID: 9, Mode: ModeObserve, Timing: TimingPost, Result: result,
		HighestCategory: highest, HitCategories: append([]string{}, cats...), Trace: []byte(`{}`), KeepUntil: now.Add(time.Hour)}
	if result == ResultHit {
		r.Severity = "high"
	}
	return r
}

// Suspicious records drive the watch list and must not be lost: a failed
// batch writes them again one by one, a full queue writes them at once.
func TestSuspiciousRecordsAreKept(t *testing.T) {
	mod := newFakeMod(t)
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "record_pass": true})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	ctx := context.Background()
	bad := testRec(40, "bad", ResultPass, "")
	text := "nul \x00 byte"
	bad.Text = &text
	evs := []eventRec{bad, testRec(41, "kept", ResultHit, "violence", "violence")}
	if err := p.storeEvents(ctx, evs); err == nil {
		t.Fatal("a batch with a NUL byte was written")
	}
	if kept := p.retrySuspicious(ctx, evs); kept != 1 {
		t.Fatalf("retried %d suspicious records", kept)
	}
	waitEvents(t, h, map[string]string{"request_id": "kept"}, 1)
	if d := decodeData[UserDetail](t, h.Do("GET", "/users/41", nil, nil)); d.Watch == nil {
		t.Fatal("the retried hit did not reach the watch list")
	}

	// A writer that no longer reads, with its one slot taken: the queue is full.
	full := batch.New(ctx, 1, func(context.Context, []eventRec) error { return nil }, nil)
	if err := full.Stop(); err != nil {
		t.Fatal(err)
	}
	full.Send(eventRec{})
	p.eventWriter = full
	mustHook(t, h, hookReqAs(42, "full-hit", "MOD-HIT-violence queue full"))
	mustHook(t, h, hookReqAs(42, "full-pass", "a clean request while full"))
	waitEvents(t, h, map[string]string{"request_id": "full-hit"}, 1)
	waitFor(t, "the pass dropped", func() bool {
		for _, q := range decodeData[Status](t, h.Do("GET", "/status", nil, nil)).Queue {
			if q.Name == "records" && q.Dropped == 1 {
				return true
			}
		}
		return false
	})
	if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"request_id": "full-pass"}, nil))); n != 0 {
		t.Fatalf("pass written while the queue was full: %d", n)
	}
}

// The watch list ranks and filters by the highest category of each record;
// reviews only touch suspicious records.
func TestWatchHighestCategoryAndReview(t *testing.T) {
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "record_pass": true})
	ctx := context.Background()
	evs := []eventRec{testRec(51, "a", ResultHit, "violence", "violence", "hate"), testRec(51, "b", ResultHit, ""),
		testRec(51, "c", ResultPass, "")}
	if err := p.storeEvents(ctx, evs); err != nil {
		t.Fatal(err)
	}
	items := decodeData[[]WatchItem](t, h.Do("GET", "/watchlist", map[string]string{"user_id": "51"}, nil))
	if len(items) != 1 || items[0].SuspiciousTotal != 2 || len(items[0].TopCategories) != 1 || items[0].TopCategories[0].Category != "violence" ||
		items[0].TopOther != 1 {
		t.Fatalf("watch item = %+v", items)
	}
	if got := decodeData[[]WatchItem](t, h.Do("GET", "/watchlist", map[string]string{"category": "hate"}, nil)); len(got) != 0 {
		t.Fatalf("category filter by any hit category = %+v", got)
	}
	if got := decodeData[[]WatchItem](t, h.Do("GET", "/watchlist", map[string]string{"category": "violence"}, nil)); len(got) != 1 {
		t.Fatalf("category filter = %+v", got)
	}
	all := waitEvents(t, h, map[string]string{"user_id": "51"}, 3)
	ids := make([]int64, 0, len(all))
	for _, e := range all {
		ids = append(ids, e.ID)
	}
	out := decodeData[map[string]any](t, h.Do("POST", "/events/review", nil, map[string]any{"ids": ids, "status": "confirmed"}))
	if out["updated"] != float64(2) {
		t.Fatalf("review = %v", out)
	}
	if pass := decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"request_id": "c"}, nil)); pass[0].ReviewStatus != "pending" {
		t.Fatalf("pass record reviewed: %+v", pass[0])
	}
}

// failingAuthz makes AuthzCheck fail while fail is set.
type failingAuthz struct {
	pluginsdk.Host
	fail *atomic.Bool
}

func (h failingAuthz) AuthzCheck(ctx context.Context, uid int64, perm string) (bool, error) {
	if h.fail.Load() {
		return false, errors.New("authz unavailable")
	}
	return h.Host.AuthzCheck(ctx, uid, perm)
}

// A user whose moderator check fails keeps the daily counts for a later
// flush instead of being written as a non-moderator.
func TestStaffCheckFailureKeepsDailyCounts(t *testing.T) {
	p, _, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
	var fail atomic.Bool
	fail.Store(true)
	q := New()
	q.host = failingAuthz{Host: p.host, fail: &fail}
	ctx := context.Background()
	db, err := q.db(ctx)
	if err != nil {
		t.Fatal(err)
	}
	suspicious := func() (n int64) {
		if err := db.QueryRow(ctx, `SELECT coalesce(sum(suspicious), 0) FROM user_daily WHERE user_id = 61`).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	q.countUser(61, 9, ResultHit, "high")
	q.flushStats(ctx)
	if n := suspicious(); n != 0 {
		t.Fatalf("written with an unknown staff status: %d", n)
	}
	fail.Store(false)
	q.flushStats(ctx)
	if n := suspicious(); n != 1 {
		t.Fatalf("kept counts not written: %d", n)
	}
}
