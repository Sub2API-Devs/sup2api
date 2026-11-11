package dynweight

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

const (
	testAccount = 7
	testGroup   = 2
	testModel   = "claude-sonnet-5"
)

// env is the plugin against a fresh schema, with a fake clock and a host
// that records notifications and sticky clears.
type env struct {
	t     *testing.T
	p     *Plugin
	h     *pluginsdktest.Harness
	fh    *pluginsdktest.FakeHost
	clock atomic.Int64 // unix seconds
	base  int32        // the weight rank last offered the account with

	mu       sync.Mutex
	notified []*pluginv1.NotifyRequest
	cleared  []*pluginv1.ClearStickyBindingsRequest
}

func newEnv(t *testing.T) *env {
	t.Helper()
	dsn, schema := pluginsdktest.NewSchema(t, "plg_dynweight_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
	e := &env{t: t}
	e.clock.Store(1_700_000_000)
	fh := pluginsdktest.NewFakeHost()
	e.fh = fh
	fh.SetDSN(dsn, schema)
	fh.ListNotificationChannelsFunc = func(context.Context, *pluginv1.ListNotificationChannelsRequest) (*pluginv1.ListNotificationChannelsResponse, error) {
		return &pluginv1.ListNotificationChannelsResponse{Channels: []*pluginv1.NotificationChannel{{Id: "email", PluginKey: "mailer", Recipient: "email"}}}, nil
	}
	fh.NotifyFunc = func(_ context.Context, in *pluginv1.NotifyRequest) (*pluginv1.NotifyResponse, error) {
		e.mu.Lock()
		defer e.mu.Unlock()
		e.notified = append(e.notified, in)
		return &pluginv1.NotifyResponse{Id: int64(len(e.notified))}, nil
	}
	fh.ClearStickyBindingsFunc = func(_ context.Context, in *pluginv1.ClearStickyBindingsRequest) (*pluginv1.ClearStickyBindingsResponse, error) {
		e.mu.Lock()
		defer e.mu.Unlock()
		e.cleared = append(e.cleared, in)
		return &pluginv1.ClearStickyBindingsResponse{Matched: 4, Cleared: 2}, nil
	}
	e.p = New()
	e.p.now = func() time.Time { return time.Unix(e.clock.Load(), 0) }
	e.h = pluginsdktest.Start(t, e.p, pluginsdktest.Options{Host: fh, SDK: []pluginsdk.Option{pluginsdk.WithInfo("dynweight", "0.1.0")}})
	return e
}

// configure saves the default configuration, enabled, with the mutation.
func (e *env) configure(mutate func(*rules.Config)) {
	e.t.Helper()
	var current struct {
		Data configBody `json:"data"`
	}
	e.decode(e.h.Do("GET", "/config", nil, nil), http.StatusOK, &current)
	c := current.Data.Config
	c.Enabled = true
	if mutate != nil {
		mutate(&c)
	}
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c, Version: current.Data.Version}), http.StatusOK, nil)
}

func (e *env) decode(resp *pluginv1.HTTPResponse, want int, v any) {
	e.t.Helper()
	if int(resp.GetStatus()) != want {
		e.t.Fatalf("status %d, want %d: %s", resp.GetStatus(), want, resp.GetBody())
	}
	if v != nil {
		if err := json.Unmarshal(resp.GetBody(), v); err != nil {
			e.t.Fatal(err)
		}
	}
}

// rank schedules a request and returns the weight the plugin gives the
// account (0 = left as it is).
func (e *env) rank(weight int32) int32 {
	e.t.Helper()
	e.base = weight
	resp, err := e.p.RankAccounts(context.Background(), &pluginv1.RankAccountsRequest{
		Meta:       &pluginv1.RequestMeta{GroupId: testGroup, Model: testModel},
		Candidates: []*pluginv1.RankCandidate{{AccountId: testAccount, Name: "main", Priority: 5, Weight: weight}},
	})
	if err != nil {
		e.t.Fatal(err)
	}
	if len(resp.GetAccounts()) == 0 {
		return 0
	}
	if resp.GetAccounts()[0].GetPriority() != 5 {
		e.t.Fatalf("priority changed: %v", resp.GetAccounts()[0])
	}
	return resp.GetAccounts()[0].GetWeight()
}

// window records attempts in the current window (scheduling offered the
// account for them, with the weight rank last gave), then moves the clock
// past its close and evaluates.
func (e *env) window(ok, fail int) string {
	e.t.Helper()
	res := e.p.cfg.Load().Resolve(testAccount, testGroup)
	start := rules.WindowStart(testAccount, e.clock.Load(), res.WindowSeconds)
	if ok+fail > 0 && e.base > 0 {
		e.rank(e.base)
	}
	e.observe(start+min(10, int64(res.WindowSeconds)-1), ok, fail)
	e.clock.Store(start + int64(res.WindowSeconds) + rules.CloseGraceSeconds)
	resp, err := e.p.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: JobEvaluate})
	if err != nil {
		e.t.Fatal(err)
	}
	return resp.GetMessage()
}

// observe records ok successful and fail failed streaming attempts that
// ended at the unix second.
func (e *env) observe(second int64, ok, fail int) {
	e.t.Helper()
	at := time.Unix(second, 0).UnixMilli()
	var batch pluginv1.ObservationBatch
	for i := range ok + fail {
		status := int32(http.StatusOK)
		if i >= ok {
			status = http.StatusInternalServerError
		}
		batch.Observations = append(batch.Observations, &pluginv1.RequestObservation{Phase: observation.AttemptFinished,
			AccountId: testAccount, GroupId: testGroup, Model: testModel, Stream: true, Success: i < ok, UpstreamStatusCode: status,
			AttemptStartedAtUnixMs: at - 3000, FirstStreamEventAtUnixMs: at - 2000, OccurredAtUnixMs: at})
	}
	if _, err := e.p.OnObservations(context.Background(), &batch); err != nil {
		e.t.Fatal(err)
	}
}

func TestDegradeNotifyAndReset(t *testing.T) {
	e := newEnv(t)
	e.configure(func(c *rules.Config) {
		c.Notify = rules.Notify{Enabled: true, Channel: "email", Recipients: []string{"ops@example.com"}}
		c.Strategies[0].Actions[1].Percent = 50 // the default clears 30%
		// A second strategy clearing on the same hit shares the call.
		c.Strategies = append(c.Strategies, rules.Strategy{Name: "clear", When: c.Strategies[0].When,
			Actions: []rules.Action{{Type: rules.ActionAffinityClear, Percent: 80}}})
	})
	if w := e.rank(100); w != 0 {
		t.Fatalf("healthy account rewritten to %d", w)
	}
	if msg := e.window(5, 5); msg != "evaluated 1 keys, 0 changed" {
		t.Fatalf("first window: %s", msg)
	}
	if msg := e.window(5, 5); msg != "evaluated 1 keys, 1 changed" {
		t.Fatalf("second window: %s", msg)
	}
	if w := e.rank(100); w != 70 {
		t.Fatalf("degraded weight %d", w)
	}
	e.mu.Lock()
	if len(e.notified) != 1 || e.notified[0].GetSeverity() != "warning" || e.notified[0].GetRecipients()[0] != "ops@example.com" {
		t.Fatalf("notified %v", e.notified)
	}
	if len(e.cleared) != 1 || e.cleared[0].GetPercent() != 80 || e.cleared[0].GetModel() != testModel {
		t.Fatalf("cleared %v", e.cleared)
	}
	e.mu.Unlock()

	var events struct {
		Data []eventItem `json:"data"`
	}
	e.decode(e.h.Do("GET", "/events", map[string]string{"account_id": "7"}, nil), http.StatusOK, &events)
	kinds := []string{}
	for _, ev := range events.Data {
		kinds = append(kinds, ev.Kind)
	}
	if len(kinds) != 2 || kinds[0] != rules.EventAffinityClear || kinds[1] != rules.EventWeightDown {
		t.Fatalf("events %v", kinds)
	}
	var status struct {
		Data []keyStatus `json:"data"`
	}
	e.decode(e.h.Do("GET", "/status", map[string]string{"degraded": "1"}, nil), http.StatusOK, &status)
	if len(status.Data) != 1 || status.Data[0].AccountName != "main" || status.Data[0].Effective != 70 || !status.Data[0].Rules[0].Fired {
		t.Fatalf("status %+v", status.Data)
	}
	st := status.Data[0]
	// The rule fired (2 of 3) and cleared its bitmap; the p95 rule needs 20
	// samples and the whole retention holds 10: strict (min_samples_strict),
	// it is not judged and its bitmap stays empty (0.2.0 judged it "00"); the
	// revival rule has a weight condition only.
	r0, r1 := st.Rules[0], st.Rules[1]
	if st.State != "degrading" || st.WeightMin != 0 || st.NextEvalAt <= st.EvalWindow || !st.ErrorEvaluable || st.TTFBSamples != 5 ||
		r0.Bitmap != "" || r0.Periods != 3 || r0.HitPeriods != 2 || r0.Scope != rules.ScopeAll ||
		r1.Bitmap != "" || !r1.Unjudged || r1.Samples != 10 || !st.Rules[4].NoSamples {
		t.Fatalf("status detail %+v", st)
	}
	var weights struct {
		Data map[string]accountWeight `json:"data"`
	}
	e.decode(e.h.Do("GET", "/weights", map[string]string{"account_ids": "7,8"}, nil), http.StatusOK, &weights)
	if w := weights.Data["7"]; len(weights.Data) != 1 || w.Degraded != 1 || w.Lowest != 70 || w.Base != 100 || w.AdjustOff || st.ChangedAt == 0 ||
		!slices.Equal(w.Keys, []weightKey{{GroupID: testGroup, Model: testModel, Eff: 70, Base: 100, State: rules.TrendDegrading, ChangedAt: st.ChangedAt}}) {
		t.Fatalf("weights %+v", weights.Data)
	}

	// A batch reset: account 99 has nothing to reset and still gets its event.
	var reset struct {
		Data map[string]int `json:"data"`
	}
	e.decode(e.h.Do("POST", "/reset", nil, map[string]any{"account_ids": []int64{testAccount, 99}, "model": testModel}), http.StatusOK, &reset)
	if w := e.rank(100); w != 0 || reset.Data["reset"] != 1 {
		t.Fatalf("weight after reset %d, %v reset", w, reset.Data)
	}
	e.decode(e.h.Do("GET", "/events", map[string]string{"kind": rules.EventReset}, nil), http.StatusOK, &events)
	if len(events.Data) != 2 || events.Data[0].AccountID != 99 || events.Data[0].Detail["matched"] != float64(0) ||
		events.Data[1].Reason != rules.ReasonManual || events.Data[1].AccountName != "main" || events.Data[1].From != 70 || events.Data[1].To != 100 {
		t.Fatalf("reset events %+v", events.Data)
	}
}

// The console posts a one-element account_ids for a single row (UI 3.6);
// POST /reset treats it exactly like account_id.
func TestResetOneElementArrayEqualsSingle(t *testing.T) {
	e := newEnv(t)
	e.configure(nil)
	bodies := []map[string]any{
		{"account_id": testAccount, "model": testModel},
		{"account_ids": []int64{testAccount}, "model": testModel},
	}
	for i, body := range bodies {
		e.rank(100)
		e.window(5, 5)
		e.window(5, 5)
		if w := e.rank(100); w != 70 {
			t.Fatalf("body %d: weight before reset %d", i, w)
		}
		var reset struct {
			Data map[string]int `json:"data"`
		}
		e.decode(e.h.Do("POST", "/reset", nil, body), http.StatusOK, &reset)
		if w := e.rank(100); w != 0 || reset.Data["reset"] != 1 {
			t.Fatalf("body %d: weight after reset %d, %v reset", i, w, reset.Data)
		}
		var events struct {
			Data []eventItem `json:"data"`
		}
		e.decode(e.h.Do("GET", "/events", map[string]string{"kind": rules.EventReset}, nil), http.StatusOK, &events)
		// The event names the caller; "matched" 0 would mean no state was found.
		ev := events.Data[0]
		if len(events.Data) != i+1 || ev.AccountID != testAccount || ev.GroupID != testGroup || ev.Model != testModel ||
			ev.Reason != rules.ReasonManual || ev.From != 70 || ev.To != 100 || ev.Detail["user_id"] != float64(1) || ev.Detail["matched"] != nil {
			t.Fatalf("body %d: reset events %+v", i, events.Data)
		}
	}
}

// An account that becomes active again starts over from its base; one going
// into a cooldown keeps its degraded weight. The activations of a batch are
// reset together.
func TestStatusChangeResets(t *testing.T) {
	e := newEnv(t)
	e.configure(nil)
	e.rank(100)
	e.window(5, 5)
	e.window(5, 5)
	statusEvent := func(id, account int64, status string) *pluginv1.Event {
		return &pluginv1.Event{Id: id, Type: EventAccountStatusChanged,
			PayloadJson: fmt.Sprintf(`{"account_id":%d,"status":%q,"reason":"x"}`, account, status)}
	}
	resp, err := e.p.OnEvents(context.Background(), &pluginv1.OnEventsRequest{Events: []*pluginv1.Event{
		statusEvent(1, testAccount, "cooldown"), {Id: 2, Type: "account.updated", PayloadJson: `{"account_id":7}`}}})
	if err != nil || resp.GetAckedThroughId() != 2 {
		t.Fatalf("ack %v, %v", resp, err)
	}
	if w := e.rank(100); w != 70 {
		t.Fatalf("weight after a cooldown %d", w)
	}
	resp, err = e.p.OnEvents(context.Background(), &pluginv1.OnEventsRequest{Events: []*pluginv1.Event{
		statusEvent(3, testAccount, "active"), statusEvent(4, 99, "active"), statusEvent(5, testAccount, "active")}})
	if err != nil || resp.GetAckedThroughId() != 5 {
		t.Fatalf("ack %v, %v", resp, err)
	}
	if w := e.rank(100); w != 0 {
		t.Fatalf("weight after re-activation %d", w)
	}
	var events struct {
		Data []eventItem `json:"data"`
	}
	e.decode(e.h.Do("GET", "/events", map[string]string{"kind": rules.EventReset}, nil), http.StatusOK, &events)
	if len(events.Data) != 2 || events.Data[1].Reason != rules.ReasonStatusChange || events.Data[1].Model != testModel ||
		events.Data[1].From != 70 || events.Data[1].To != 100 || events.Data[0].AccountID != 99 || events.Data[0].Detail["matched"] != float64(0) {
		t.Fatalf("events %+v", events.Data)
	}
}

// A priority tier whose every candidate the effective weights take to 0 is
// split evenly, as new-api does; a tier with one left keeps the zeros out.
func TestRankSplitsZeroTier(t *testing.T) {
	e := newEnv(t)
	e.configure(nil)
	at := func(eff float64) weight { return weight{base: 100, eff: eff} }
	k := func(account int64) key { return key{AccountID: account, GroupID: testGroup, Model: testModel} }
	rank := func(weights map[key]weight) map[int64]int32 {
		t.Helper()
		e.p.weights.Store(&weights)
		resp, err := e.p.RankAccounts(context.Background(), &pluginv1.RankAccountsRequest{
			Meta: &pluginv1.RequestMeta{GroupId: testGroup, Model: testModel},
			Candidates: []*pluginv1.RankCandidate{{AccountId: 1, Priority: 1, Weight: 100}, {AccountId: 2, Priority: 1, Weight: 100},
				{AccountId: 3, Priority: 2, Weight: 100}},
		})
		if err != nil {
			t.Fatal(err)
		}
		out := map[int64]int32{}
		for _, a := range resp.GetAccounts() {
			out[a.GetAccountId()] = a.GetWeight()
		}
		return out
	}
	if got := rank(map[key]weight{k(1): at(0), k(2): at(0.4)}); len(got) != 2 || got[1] != 1 || got[2] != 1 {
		t.Fatalf("zero tier %v", got)
	}
	if got := rank(map[key]weight{k(1): at(0), k(2): at(50)}); len(got) != 2 || got[1] != 0 || got[2] != 50 {
		t.Fatalf("live tier %v", got)
	}
}

// A key with traffic but no evaluation yet is listed with its open window.
func TestStatusBeforeFirstEvaluation(t *testing.T) {
	e := newEnv(t)
	e.configure(nil)
	e.rank(100)
	at := e.clock.Load() * 1000
	if _, err := e.p.OnObservations(context.Background(), &pluginv1.ObservationBatch{Observations: []*pluginv1.RequestObservation{
		{Phase: observation.AttemptFinished, AccountId: testAccount, GroupId: testGroup, Model: testModel, Success: true, OccurredAtUnixMs: at},
		{Phase: observation.AttemptFinished, AccountId: testAccount, GroupId: testGroup, Model: testModel, Stream: true, OccurredAtUnixMs: at, UpstreamStatusCode: 500},
	}}); err != nil {
		t.Fatal(err)
	}
	e.p.flush(context.Background())
	var status struct {
		Data []keyStatus `json:"data"`
	}
	e.decode(e.h.Do("GET", "/status", nil, nil), http.StatusOK, &status)
	if len(status.Data) != 1 {
		t.Fatalf("status %+v", status.Data)
	}
	st := status.Data[0]
	if st.EvalWindow != 0 || st.Base != 100 || st.Effective != 100 || st.State != "normal" || len(st.Rules) != 5 ||
		st.Current.Total != 2 || st.Current.Fail != 1 || st.Current.StreamTotal != 1 || st.Current.StreamFail != 1 {
		t.Fatalf("status %+v", st)
	}
	var stats struct {
		Data map[string]any `json:"data"`
	}
	e.decode(e.h.Do("GET", "/stats", nil, nil), http.StatusOK, &stats)
	if stats.Data["observed_total"] != float64(2) || stats.Data["flushed_samples_total"] != float64(2) || stats.Data["enabled"] != true ||
		stats.Data["node_id"] != "test-node" || stats.Data["started_at"] == float64(0) {
		t.Fatalf("stats %v", stats.Data)
	}
}

func TestBaseChangeResets(t *testing.T) {
	e := newEnv(t)
	e.configure(nil)
	e.rank(100)
	e.window(5, 5)
	e.window(5, 5)
	// The administrator lowers the weight: the old state no longer applies.
	if w := e.rank(50); w != 0 {
		t.Fatalf("stale state applied: %d", w)
	}
	e.p.flush(context.Background())
	// Until then the status reads as no state, at the new base.
	var status struct {
		Data []keyStatus `json:"data"`
	}
	e.decode(e.h.Do("GET", "/status", nil, nil), http.StatusOK, &status)
	if st := status.Data[0]; len(status.Data) != 1 || st.Base != 50 || st.Effective != 50 || st.State != "normal" || st.EvalWindow != 0 || st.Rules[0].Fired {
		t.Fatalf("status %+v", status.Data)
	}
	if msg := e.window(20, 0); msg != "evaluated 1 keys, 1 changed" {
		t.Fatalf("reset: %s", msg)
	}
	var events struct {
		Data []eventItem `json:"data"`
	}
	e.decode(e.h.Do("GET", "/events", map[string]string{"kind": rules.EventReset}, nil), http.StatusOK, &events)
	if len(events.Data) != 1 || events.Data[0].Reason != rules.ReasonBaseMismatch {
		t.Fatalf("events %+v", events.Data)
	}
}

// The reset of a base change starts the key over at its last evaluated
// window: the first window with traffic at the new weight is evaluated
// (0.5.1 consumed it with the reset), so two bad windows degrade again.
func TestBaseChangeKeepsNewTraffic(t *testing.T) {
	e := newEnv(t)
	e.configure(nil)
	e.rank(100)
	e.window(5, 5)
	e.window(5, 5)
	e.rank(50)
	if msg := e.window(5, 5); msg != "evaluated 1 keys, 1 changed" {
		t.Fatalf("reset: %s", msg)
	}
	var status struct {
		Data []keyStatus `json:"data"`
	}
	e.decode(e.h.Do("GET", "/status", nil, nil), http.StatusOK, &status)
	if st := status.Data[0]; st.Base != 50 || st.Effective != 50 || st.Total != 10 || st.Rules[0].Bitmap != "1" {
		t.Fatalf("the window at the new weight was not evaluated: %+v", st)
	}
	e.window(5, 5)
	if w := e.rank(50); w != 35 {
		t.Fatalf("weight after two bad windows at the new base %d", w)
	}
	kinds := []string{}
	for _, ev := range e.events(nil) {
		kinds = append(kinds, ev.Kind+"/"+ev.Reason)
	}
	if !slices.Equal(kinds, []string{"affinity_cleared/", "weight_down/", "reset/base_mismatch", "affinity_cleared/", "weight_down/"}) {
		t.Fatalf("events %v", kinds)
	}
}

// With windows shorter than the job's interval, the run that notices a
// base change evaluates every window closed since the last evaluation on
// the new base (catch-up), so "2 of 3" fires in that very run.
func TestBaseChangeCatchUp(t *testing.T) {
	e := newEnv(t)
	e.configure(func(c *rules.Config) { c.WindowSeconds = 3 })
	e.rank(100)
	e.window(5, 5)
	e.window(5, 5)
	if w := e.rank(50); w != 0 {
		t.Fatalf("stale state applied: %d", w)
	}
	start := rules.WindowStart(testAccount, e.clock.Load(), 3)
	for i, fail := range []int{5, 0, 5} { // 50%, healthy, 50%
		e.observe(start+int64(i*3)+1, 10-fail, fail)
	}
	e.clock.Store(start + 9 + rules.CloseGraceSeconds)
	if resp, err := e.p.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: JobEvaluate}); err != nil || resp.GetMessage() != "evaluated 1 keys, 1 changed" {
		t.Fatalf("catch-up run: %v %v", resp, err)
	}
	if w := e.rank(50); w != 35 {
		t.Fatalf("weight after three windows at the new base %d", w)
	}
}

// A degraded key of an account scheduling no longer offers (disabled,
// deleted, out of the group) is not evaluated: its weight at 0 is not
// revived and notified, and the account list does not count it. Offered
// again, it is evaluated again, the windows since caught up.
func TestGoneAccountNotEvaluated(t *testing.T) {
	e := newEnv(t)
	e.configure(func(c *rules.Config) {
		c.Notify = rules.Notify{Enabled: true, Channel: "email", Recipients: []string{"ops@example.com"}}
		c.Strategies[0].Actions[0] = rules.Action{Type: rules.ActionWeightDegrade, Mode: rules.ModeCurrentPercent, Value: 100}
	})
	e.rank(100)
	e.window(5, 5)
	e.window(5, 5)
	if w := e.rank(100); w != 1 { // the tier at 0 is split evenly
		t.Fatalf("weight at 0 ranked %d", w)
	}
	degraded := func() string {
		return string(e.h.Do("GET", "/degraded", nil, nil).GetBody())
	}
	if got := degraded(); !strings.Contains(got, `"count":1`) {
		t.Fatalf("degraded %s", got)
	}
	// Not offered for the windows the revival takes.
	for range 4 {
		e.window(0, 0)
	}
	if ev := e.events(map[string]string{"kind": rules.EventWeightRevived}); len(ev) != 0 || len(e.notified) != 1 {
		t.Fatalf("revived while gone: %+v, %d notified", ev, len(e.notified))
	}
	if got := degraded(); !strings.Contains(got, `"count":0`) {
		t.Fatalf("a gone account counted: %s", got)
	}
	if resp := e.h.Do("GET", "/weights", map[string]string{"account_ids": "7"}, nil); string(resp.GetBody()) != `{"data":{}}` {
		t.Fatalf("a gone account listed: %s", resp.GetBody())
	}
	// Offered again: evaluated again, revived on the windows since.
	e.rank(100)
	e.p.flush(context.Background())
	e.window(0, 0)
	if ev := e.events(map[string]string{"kind": rules.EventWeightRevived}); len(ev) != 1 || e.rank(100) != 10 || len(e.notified) != 2 {
		t.Fatalf("not revived once offered again: %+v", ev)
	}
	if got := degraded(); !strings.Contains(got, `"count":1`) {
		t.Fatalf("degraded once offered again %s", got)
	}
}

func TestConfigRoutes(t *testing.T) {
	e := newEnv(t)
	var current struct {
		Data configBody `json:"data"`
	}
	e.decode(e.h.Do("GET", "/config", nil, nil), http.StatusOK, &current)
	c := current.Data.Config
	c.Notify = rules.Notify{Enabled: true, Channel: "sms", Recipients: []string{"x"}}
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusBadRequest, nil)
	// The email channel only takes bare addresses.
	c.Notify.Channel = "email"
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusBadRequest, nil)
	c.Notify.Recipients = []string{"ops@example.com"}
	c.WindowSeconds = 1
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusBadRequest, nil)
	e.decode(e.h.Do("POST", "/config/validate", nil, configBody{Config: c}), http.StatusBadRequest, nil)
	c.WindowSeconds = 30
	// Validating saves nothing and reports the warnings a save would.
	noClimb := c
	noClimb.Strategies = c.Strategies[:3]
	var checked struct {
		Data configBody `json:"data"`
	}
	e.decode(e.h.Do("POST", "/config/validate", nil, configBody{Config: noClimb}), http.StatusOK, &checked)
	if len(checked.Data.Warnings) != 1 || e.p.cfg.Load().version != 0 {
		t.Fatalf("validate: %+v", checked.Data.Warnings)
	}
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusOK, nil)
	// A second save from the same read is refused.
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusConflict, nil)
	if got := e.p.cfg.Load(); got.version != 1 || got.WindowSeconds != 30 {
		t.Fatalf("config in force: %d %d", got.version, got.WindowSeconds)
	}
	e.decode(e.h.Do("POST", "/reset", nil, map[string]any{}), http.StatusBadRequest, nil)
}

// A stored window of 3 (0.1.0 saved it, 0.2.0 to 0.5.1 raised it to 10 on
// load) loads as saved again; one below the minimum still loads, raised to
// it with a warning, and a new one below it is refused.
func TestStoredShortWindowLoads(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	s, err := e.p.store(ctx)
	if err != nil {
		t.Fatal(err)
	}
	c := rules.DefaultConfig()
	c.Enabled, c.WindowSeconds = true, 3
	g := rules.DefaultLayer()
	g.Enabled, g.WindowSeconds = true, 2
	c.Groups = map[int64]*rules.Layer{testGroup: &g}
	raw, _ := json.Marshal(c)
	if _, err := s.db.Exec(ctx, `INSERT INTO config (id, doc, version) VALUES (1, $1, 1)`, raw); err != nil {
		t.Fatal(err)
	}
	if err := e.p.reloadConfig(ctx); err != nil {
		t.Fatal(err)
	}
	if got := e.p.cfg.Load(); got.version != 1 || !got.Enabled || got.WindowSeconds != 3 || got.GroupLayer(testGroup).WindowSeconds != rules.MinWindowSeconds {
		t.Fatalf("config in force: v%d enabled %v window %d", got.version, got.Enabled, got.WindowSeconds)
	}
	var current struct {
		Data configBody `json:"data"`
	}
	e.decode(e.h.Do("GET", "/config", nil, nil), http.StatusOK, &current)
	if current.Data.Config.Groups[testGroup].WindowSeconds != rules.MinWindowSeconds || len(current.Data.Warnings) != 1 {
		t.Fatalf("GET /config: group window %d, warnings %v", current.Data.Config.Groups[testGroup].WindowSeconds, current.Data.Warnings)
	}
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c, Version: 1}), http.StatusBadRequest, nil)
	e.decode(e.h.Do("POST", "/config/validate", nil, configBody{Config: c, Version: 1}), http.StatusBadRequest, nil)
	e.decode(e.h.Do("PUT", "/config", nil, current.Data), http.StatusOK, nil)
}

// A 3-second window closes more than once between two evaluate runs: one
// run evaluates every window closed since the last, so failures in two of
// the last three windows still fire "2 of 3" (evaluating only the newest
// would pad the others as misses). The job then evaluates every run and
// drops the counters past the retention; with every window 10 s or longer,
// it evaluates only the runs on a multiple of 10 s.
func TestShortWindowCatchUp(t *testing.T) {
	e := newEnv(t)
	e.configure(func(c *rules.Config) { c.WindowSeconds = 3 })
	if w := e.rank(100); w != 0 {
		t.Fatalf("healthy account rewritten to %d", w)
	}
	if msg := e.window(10, 0); msg != "evaluated 1 keys, 0 changed" {
		t.Fatalf("first window: %s", msg)
	}
	start := rules.WindowStart(testAccount, e.clock.Load(), 3)
	for i, fail := range []int{5, 0, 5} { // 50%, healthy, 50%
		e.observe(start+int64(i*3)+1, 10-fail, fail)
	}
	e.clock.Store(start + 9 + rules.CloseGraceSeconds)
	run := func(scheduledAt int64) string {
		t.Helper()
		resp, err := e.p.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: JobEvaluate, ScheduledAtUnix: scheduledAt})
		if err != nil {
			t.Fatal(err)
		}
		return resp.GetMessage()
	}
	if msg := run(1_700_000_105); msg != "evaluated 1 keys, 1 changed" {
		t.Fatalf("catch-up run: %s", msg)
	}
	if w := e.rank(100); w != 70 {
		t.Fatalf("weight after three windows %d", w)
	}
	var status struct {
		Data []keyStatus `json:"data"`
	}
	e.decode(e.h.Do("GET", "/status", nil, nil), http.StatusOK, &status)
	if len(status.Data) != 1 || status.Data[0].EvalWindow != start+6 || status.Data[0].Total != 10 || !status.Data[0].Rules[0].Fired {
		t.Fatalf("status %+v", status.Data)
	}
	// Each run drops the counters past twice the retention (7 windows here),
	// not only the hourly cleanup.
	e.clock.Add(2 * 7 * 3)
	run(0)
	s, err := e.p.store(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	var left int
	if err := s.db.QueryRow(context.Background(), `SELECT count(*) FROM obs`).Scan(&left); err != nil || left != 0 {
		t.Fatalf("counters left after the retention: %d %v", left, err)
	}

	e.configure(func(c *rules.Config) { c.WindowSeconds = 60 })
	if msg := run(1_700_000_105); !strings.HasPrefix(msg, "not due") {
		t.Fatalf("off-cadence run with 60 s windows: %s", msg)
	}
	if msg := run(1_700_000_110); strings.HasPrefix(msg, "not due") {
		t.Fatalf("on-cadence run with 60 s windows: %s", msg)
	}
}

// Without the optional notify.send grant there are no channels to pick and
// notifications cannot be turned on.
func TestChannelsWithoutGrant(t *testing.T) {
	e := newEnv(t)
	e.fh.ListNotificationChannelsFunc = func(context.Context, *pluginv1.ListNotificationChannelsRequest) (*pluginv1.ListNotificationChannelsResponse, error) {
		return nil, status.Error(codes.PermissionDenied, "no notify.send grant")
	}
	var channels struct {
		Data []any `json:"data"`
	}
	e.decode(e.h.Do("GET", "/channels", nil, nil), http.StatusOK, &channels)
	if channels.Data == nil || len(channels.Data) != 0 {
		t.Fatalf("channels %v", channels.Data)
	}
	c := rules.DefaultConfig()
	c.Notify = rules.Notify{Enabled: true, Channel: "email", Recipients: []string{"ops@example.com"}}
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusBadRequest, nil)
}

// Turning the plugin off starts every key over from its base at once, as
// new-api tombstones every key on a global disable: turning it back on
// before the key's next window closes, an evaluation in between or not,
// does not pick up the weight degraded before. While it is off /degraded
// and /weights list nothing, whatever the snapshot holds. Nothing is
// recorded: pinning to the base is no change.
func TestGlobalDisableResetsAtOnce(t *testing.T) {
	e := newEnv(t)
	e.configure(nil)
	degrade := func() {
		t.Helper()
		e.rank(100)
		e.window(5, 5)
		e.window(5, 5)
		if w := e.rank(100); w != 70 {
			t.Fatalf("degraded weight %d", w)
		}
	}
	degrade()
	snapshot := *e.p.weights.Load()
	e.configure(func(c *rules.Config) { c.Enabled = false })
	if n := len(*e.p.weights.Load()); n != 0 {
		t.Fatalf("%d keys still degraded once off", n)
	}
	// Another node may not have reloaded yet: the badges ignore its snapshot.
	e.p.weights.Store(&snapshot)
	resp := e.h.Do("GET", "/degraded", nil, nil)
	if !strings.Contains(string(resp.GetBody()), `"count":0`) {
		t.Fatalf("degraded while off %s", resp.GetBody())
	}
	if resp := e.h.Do("GET", "/weights", map[string]string{"account_ids": "7"}, nil); string(resp.GetBody()) != `{"data":{}}` {
		t.Fatalf("weights while off %s", resp.GetBody())
	}
	if err := e.p.reloadWeights(context.Background()); err != nil {
		t.Fatal(err)
	}
	// Evaluated in the same window, then back on: from the base.
	if _, err := e.p.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: JobEvaluate}); err != nil {
		t.Fatal(err)
	}
	e.configure(nil)
	if w := e.rank(100); w != 0 {
		t.Fatalf("weight after re-enabling %d", w)
	}
	if msg := e.window(0, 0); msg != "evaluated 1 keys, 0 changed" || e.rank(100) != 0 {
		t.Fatalf("first window back on: %s", msg)
	}
	var events struct {
		Data []eventItem `json:"data"`
	}
	e.decode(e.h.Do("GET", "/events", nil, nil), http.StatusOK, &events)
	// Only the degrade's (newest first, with the default clearing).
	if len(events.Data) != 2 || events.Data[0].Kind != rules.EventAffinityClear || events.Data[1].Kind != rules.EventWeightDown {
		t.Fatalf("events %+v", events.Data)
	}

	// A degraded state the reset on turning off missed (written by an
	// evaluation still on the configuration before) is tombstoned by the
	// next evaluation while off, in the same window.
	degrade()
	ctx := context.Background()
	s, err := e.p.store(ctx)
	if err != nil {
		t.Fatal(err)
	}
	k := key{AccountID: testAccount, GroupID: testGroup, Model: testModel}
	states, err := s.loadStates(ctx, filter{})
	if err != nil {
		t.Fatal(err)
	}
	e.configure(func(c *rules.Config) { c.Enabled = false })
	cur, err := s.loadStates(ctx, filter{})
	if err != nil {
		t.Fatal(err)
	}
	if ok, err := s.writeState(ctx, k, states[k].State, cur[k].gen, nil); err != nil || !ok {
		t.Fatalf("write back %v %v", ok, err)
	}
	if msg, err := e.p.RunJob(ctx, &pluginv1.RunJobRequest{JobId: JobEvaluate}); err != nil || msg.GetMessage() != "evaluated 1 keys, 1 changed" {
		t.Fatalf("run while off: %v %v", msg, err)
	}
	if n := len(*e.p.weights.Load()); n != 0 {
		t.Fatalf("%d keys still degraded after the run while off", n)
	}
	e.configure(nil)
	if w := e.rank(100); w != 0 {
		t.Fatalf("weight after re-enabling again %d", w)
	}
}

// A reset writes every key or none; keys at their base are recorded as one
// event per (account, group).
func TestResetIsAtomic(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	e.configure(nil)
	s, err := e.p.store(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.db.Exec(ctx, `CREATE FUNCTION refuse_bad() RETURNS trigger LANGUAGE plpgsql AS $$
		BEGIN IF NEW.model = 'bad' THEN RAISE EXCEPTION 'refused'; END IF; RETURN NEW; END $$;
		CREATE TRIGGER refuse_bad BEFORE INSERT OR UPDATE ON state FOR EACH ROW EXECUTE FUNCTION refuse_bad()`); err != nil {
		t.Fatal(err)
	}
	for _, model := range []string{"bad", "good"} {
		e.p.obs.add(obsWindow{key: key{AccountID: testAccount, GroupID: testGroup, Model: model}, window: e.clock.Load()},
			rules.Sample{TTFBMs: -1, LatencyMs: -1}, e.p.cfg.Load().GroupLayer(testGroup))
	}
	e.p.flush(ctx)
	if n, err := e.p.resetKeys(ctx, filter{AccountID: testAccount}, rules.ReasonManual, 1); n != 0 || err == nil {
		t.Fatalf("reset %d, error %v", n, err)
	}
	// A status change that cannot reset is not acked.
	_, err = e.p.OnEvents(ctx, &pluginv1.OnEventsRequest{Events: []*pluginv1.Event{{Id: 1, Type: EventAccountStatusChanged,
		PayloadJson: fmt.Sprintf(`{"account_id":%d,"status":"active"}`, testAccount)}}})
	if status.Code(err) != codes.Unavailable {
		t.Fatalf("status change: %v", err)
	}
	var events struct {
		Data []eventItem `json:"data"`
	}
	e.decode(e.h.Do("GET", "/events", nil, nil), http.StatusOK, &events)
	if len(events.Data) != 0 {
		t.Fatalf("events %+v", events.Data)
	}
	if _, err := s.db.Exec(ctx, `DROP TRIGGER refuse_bad ON state`); err != nil {
		t.Fatal(err)
	}
	if n, err := e.p.resetKeys(ctx, filter{AccountID: testAccount}, rules.ReasonManual, 1); n != 2 || err != nil {
		t.Fatalf("reset %d, error %v", n, err)
	}
	e.decode(e.h.Do("GET", "/events", nil, nil), http.StatusOK, &events)
	if len(events.Data) != 1 || events.Data[0].Model != "" || events.Data[0].GroupID != testGroup || events.Data[0].Detail["keys"] != float64(2) {
		t.Fatalf("events %+v", events.Data)
	}
}

func TestSampleOf(t *testing.T) {
	base := &pluginv1.RequestObservation{Phase: observation.AttemptFinished, AccountId: 1, GroupId: 2, Model: "m", Stream: true,
		AttemptStartedAtUnixMs: 1000, FirstStreamEventAtUnixMs: 1400, OccurredAtUnixMs: 3000, Success: true, UpstreamStatusCode: 200}
	_, s, ok := sampleOf(base)
	if !ok || s.TTFBMs != 400 || s.LatencyMs != 2000 || s.Fail {
		t.Fatalf("success: %+v", s)
	}
	transport := &pluginv1.RequestObservation{Phase: observation.AttemptFinished, AccountId: 1, GroupId: 2, Model: "m", StatusCode: 502}
	if _, s, _ := sampleOf(transport); !s.Fail || s.FailStatus != 0 || s.LatencyMs != -1 || s.TTFBMs != -1 {
		t.Fatalf("transport failure: %+v", s)
	}
	// A stream that fails after its first event has no timings (new-api).
	failed := proto.Clone(base).(*pluginv1.RequestObservation)
	failed.Success, failed.UpstreamStatusCode = false, 529
	if _, s, _ := sampleOf(failed); !s.Fail || s.FailStatus != 529 || s.TTFBMs != -1 || s.LatencyMs != -1 {
		t.Fatalf("failed stream: %+v", s)
	}
	for name, o := range map[string]*pluginv1.RequestObservation{
		"no group": {Phase: observation.AttemptFinished, AccountId: 1, Model: "m"},
		"canceled": {Phase: observation.AttemptFinished, AccountId: 1, GroupId: 2, Model: "m", Canceled: true},
		"local":    {Phase: observation.AttemptFinished, AccountId: 1, GroupId: 2, Model: "m", LocalFailure: true},
		"phase":    {Phase: observation.Completed, AccountId: 1, GroupId: 2, Model: "m"},
	} {
		if _, _, ok := sampleOf(o); ok {
			t.Errorf("%s counted", name)
		}
	}
}

// Counters a failed flush could not write are kept for the next one, and a
// flush hands them over in key order.
func TestAggregatorRestore(t *testing.T) {
	a := newAggregator()
	cfg := rules.Compile(rules.DefaultConfig()).Resolve(1, 2)
	a.add(obsWindow{key: key{AccountID: 2, GroupID: 1, Model: "m"}, window: 60}, rules.Sample{Fail: true, TTFBMs: -1, LatencyMs: -1}, &cfg)
	a.add(obsWindow{key: key{AccountID: 1, GroupID: 9, Model: "m"}, window: 60}, rules.Sample{TTFBMs: -1, LatencyMs: 5}, &cfg)
	deltas := a.take()
	if len(deltas) != 2 || deltas[0].AccountID != 1 || a.pending() != 0 {
		t.Fatalf("take: %+v", deltas)
	}
	a.add(obsWindow{key: deltas[0].key, window: 60}, rules.Sample{TTFBMs: -1, LatencyMs: 7}, &cfg)
	a.restore(deltas)
	again := a.take()
	if len(again) != 2 || again[0].counts.Total != 2 || again[1].counts.Fail != 1 {
		t.Fatalf("restored: %+v", again)
	}
}

// The turning points of a run go out as one digest: the worst first, at its
// severity, with a dedupe key independent of the evaluation order, and the
// items past the cap counted.
func TestNotifyDigest(t *testing.T) {
	e := newEnv(t)
	e.configure(func(c *rules.Config) {
		c.Notify = rules.Notify{Enabled: true, Channel: "email", Recipients: []string{"ops@example.com"}, Language: "en"}
	})
	turn := func(account int64, kind string, from, to float64) notice {
		return notice{k: key{AccountID: account, GroupID: testGroup, Model: testModel}, name: "acc",
			ev: rules.Event{Kind: kind, From: from, To: to, Window: &rules.WindowSummary{Start: 600, Total: 10, Fail: 5}}}
	}
	batch := []notice{turn(1, rules.EventWeightDown, 100, 70), turn(2, rules.EventWeightDown, 100, 0), turn(3, rules.EventWeightRestored, 90, 100)}
	cfg := e.p.cfg.Load()
	e.p.notify(context.Background(), cfg, slices.Clone(batch))
	slices.Reverse(batch)
	e.p.notify(context.Background(), cfg, batch)
	many := make([]notice, maxDigestItems+2)
	for i := range many {
		many[i] = turn(int64(i+1), rules.EventWeightDown, 100, 70)
	}
	e.p.notify(context.Background(), cfg, many)

	e.mu.Lock()
	defer e.mu.Unlock()
	if len(e.notified) != 3 {
		t.Fatalf("notified %d times", len(e.notified))
	}
	digest, capped := e.notified[0], e.notified[2]
	if digest.GetSubject() != "Dynamic weight: 3 weight changes" || digest.GetSeverity() != protocol.SeverityCritical {
		t.Fatalf("digest %q at %s", digest.GetSubject(), digest.GetSeverity())
	}
	body := digest.GetBody()
	if !strings.HasPrefix(body, "Account acc (#2): weight degraded 100 → 0\nGroup: #2") || strings.Count(body, "\n\n") != 2 {
		t.Fatalf("digest body:\n%s", body)
	}
	if digest.GetDedupeKey() != e.notified[1].GetDedupeKey() {
		t.Fatal("dedupe key depends on the order")
	}
	if capped.GetSeverity() != protocol.SeverityWarning || !strings.HasSuffix(capped.GetBody(), "\n\nand 2 more") {
		t.Fatalf("capped digest at %s:\n%s", capped.GetSeverity(), capped.GetBody())
	}
}

// The account page routes: the degraded badge lists the accounts below
// their base; /weights details the lowest keys.
func TestAccountRoutes(t *testing.T) {
	e := newEnv(t)
	e.configure(func(c *rules.Config) {
		g := rules.DefaultLayer()
		g.Enabled, g.Strategies = true, g.Strategies[:3] // degrades, never climbs
		c.Groups = map[int64]*rules.Layer{testGroup: &g}
	})
	type degraded struct {
		Count      int     `json:"count"`
		AccountIDs []int64 `json:"account_ids"`
	}
	var low struct {
		Data degraded `json:"data"`
	}
	resp := e.h.Do("GET", "/degraded", nil, nil)
	e.decode(resp, http.StatusOK, &low)
	if low.Data.Count != 0 || !strings.Contains(string(resp.GetBody()), `"account_ids":[]`) {
		t.Fatalf("degraded %s", resp.GetBody())
	}
	e.rank(100)
	e.window(5, 5)
	e.window(5, 5)
	e.decode(e.h.Do("GET", "/degraded", nil, nil), http.StatusOK, &low)
	if low.Data.Count != 1 || !slices.Equal(low.Data.AccountIDs, []int64{testAccount}) {
		t.Fatalf("degraded %+v", low.Data)
	}

	// /weights details the lowest keys, by effective weight, at most
	// maxWeightKeys; /degraded counts every account and lists them in order.
	seen := e.p.now()
	weights := map[key]weight{{AccountID: 8, GroupID: testGroup, Model: "m"}: {base: 100, eff: 50, seenAt: seen}}
	for i := range maxWeightKeys + 2 {
		weights[key{AccountID: testAccount, GroupID: testGroup, Model: fmt.Sprintf("m%02d", i)}] = weight{base: 100, eff: float64(maxWeightKeys + 2 - i), seenAt: seen}
	}
	e.p.weights.Store(&weights)
	var listed struct {
		Data map[string]accountWeight `json:"data"`
	}
	e.decode(e.h.Do("GET", "/weights", map[string]string{"account_ids": "7,8"}, nil), http.StatusOK, &listed)
	keys := listed.Data["7"].Keys
	if len(keys) != maxWeightKeys || keys[0] != (weightKey{GroupID: testGroup, Model: "m11", Eff: 1, Base: 100}) || keys[maxWeightKeys-1].Eff != maxWeightKeys ||
		listed.Data["7"].Degraded != maxWeightKeys+2 || listed.Data["7"].Lowest != 1 || len(listed.Data["8"].Keys) != 1 {
		t.Fatalf("weights %+v", listed.Data)
	}
	e.decode(e.h.Do("GET", "/degraded", nil, nil), http.StatusOK, &low)
	if low.Data.Count != 2 || !slices.Equal(low.Data.AccountIDs, []int64{testAccount, 8}) {
		t.Fatalf("degraded %+v", low.Data)
	}
}

// GET /weights gives each degraded key the direction and time of its last
// change, read from the states, and lists an account whose override turns
// adjusting off even without a degraded key.
func TestWeightsTrendAndAdjustOff(t *testing.T) {
	e := newEnv(t)
	// Account 9 only overrides its floor: it keeps adjusting.
	off, mode, floor := false, rules.ModeFixed, 10
	e.configure(func(c *rules.Config) {
		c.Accounts = map[int64]rules.AccountOverride{8: {Enabled: &off}, 9: {MinWeightMode: &mode, MinWeight: &floor}}
	})
	ctx := context.Background()
	s, err := e.p.store(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for k, st := range map[key]rules.State{
		{AccountID: testAccount, GroupID: testGroup, Model: "up"}:   {WeightBase: 100, WeightEff: 40.4, LastChange: rules.EventWeightUp, LastChangeAt: 1_700_000_300},
		{AccountID: testAccount, GroupID: testGroup, Model: "down"}: {WeightBase: 100, WeightEff: 60, LastChange: rules.EventWeightDown, LastChangeAt: 1_700_000_200},
		{AccountID: testAccount, GroupID: testGroup, Model: "base"}: {WeightBase: 100, WeightEff: 100},
		// Off adjusting until its next evaluation pins it: normal, as /status says.
		{AccountID: 8, GroupID: testGroup, Model: "off"}: {WeightBase: 100, WeightEff: 50, LastChange: rules.EventWeightDown, LastChangeAt: 1_700_000_100},
	} {
		if ok, err := s.writeState(ctx, k, st, 0, nil); err != nil || !ok {
			t.Fatalf("write %v: %v %v", k, ok, err)
		}
	}
	// Scheduling offers both accounts (gone accounts are not listed).
	if err := s.saveBases(ctx, map[pair]base{{testAccount, testGroup}: {Weight: 100, SeenAt: e.p.now()}, {8, testGroup}: {Weight: 100, SeenAt: e.p.now()}}); err != nil {
		t.Fatal(err)
	}
	if err := e.p.reloadWeights(ctx); err != nil {
		t.Fatal(err)
	}
	var listed struct {
		Data map[string]accountWeight `json:"data"`
	}
	resp := e.h.Do("GET", "/weights", map[string]string{"account_ids": "7,8,9,10"}, nil)
	e.decode(resp, http.StatusOK, &listed)
	w := listed.Data["7"]
	if len(listed.Data) != 2 || w.Degraded != 2 || w.Lowest != 40 || w.AdjustOff || !slices.Equal(w.Keys, []weightKey{
		{GroupID: testGroup, Model: "up", Eff: 40.4, Base: 100, State: rules.TrendClimbing, ChangedAt: 1_700_000_300},
		{GroupID: testGroup, Model: "down", Eff: 60, Base: 100, State: rules.TrendDegrading, ChangedAt: 1_700_000_200},
	}) {
		t.Fatalf("weights %+v", listed.Data)
	}
	if o := listed.Data["8"]; !o.AdjustOff || o.Degraded != 1 ||
		!slices.Equal(o.Keys, []weightKey{{GroupID: testGroup, Model: "off", Eff: 50, Base: 100, ChangedAt: 1_700_000_100}}) {
		t.Fatalf("adjust off %+v", listed.Data)
	}
	// /status reads the same trends (rules.Trend).
	var status struct {
		Data []keyStatus `json:"data"`
	}
	e.decode(e.h.Do("GET", "/status", map[string]string{"account_id": "7"}, nil), http.StatusOK, &status)
	trends := map[string]string{}
	for _, st := range status.Data {
		trends[st.Model] = st.State
	}
	if trends["up"] != rules.TrendClimbing || trends["down"] != rules.TrendDegrading || trends["base"] != rules.TrendNormal {
		t.Fatalf("status trends %v", trends)
	}

	// Without degraded keys an account off adjusting is still listed.
	e.p.weights.Store(&map[key]weight{})
	resp = e.h.Do("GET", "/weights", map[string]string{"account_ids": "8"}, nil)
	if !strings.Contains(string(resp.GetBody()), `"8":{"degraded":0,"lowest":0,"base":0,"keys":[],"adjust_off":true}`) {
		t.Fatalf("adjust off without keys %s", resp.GetBody())
	}

	// A key of the snapshot without a state (another node's, not stored
	// yet) has no trend.
	e.p.weights.Store(&map[key]weight{{AccountID: 8, GroupID: testGroup, Model: "m"}: {base: 3, eff: 1, seenAt: e.p.now()}})
	e.decode(e.h.Do("GET", "/weights", map[string]string{"account_ids": "8"}, nil), http.StatusOK, &listed)
	if o := listed.Data["8"]; !o.AdjustOff || o.Degraded != 1 || o.Lowest != 1 || !slices.Equal(o.Keys, []weightKey{{GroupID: testGroup, Model: "m", Eff: 1, Base: 3}}) {
		t.Fatalf("snapshot only %+v", listed.Data)
	}
}

// The evaluation's events keep the steps it executed and the configuration
// version it ran on in their detail; a base mismatch and the other events
// are not the configuration's doing and carry no version.
func TestEventDetailStepsAndVersion(t *testing.T) {
	e := newEnv(t)
	e.configure(nil)
	e.rank(100)
	e.window(5, 5)
	e.window(5, 5)
	down := e.events(map[string]string{"kind": rules.EventWeightDown})
	want := []rules.WeightStep{{Strategy: "错误率过高", Mode: rules.ModeCurrentPercent, Value: 30, From: 100, To: 70}}
	if len(down) != 1 || !slices.Equal(detailSteps(t, down[0]), want) || down[0].Detail["config_version"] != float64(1) || down[0].Detail["window"] == nil {
		t.Fatalf("down event %+v", down)
	}
	if clear := e.events(map[string]string{"kind": rules.EventAffinityClear}); len(clear) != 1 || clear[0].Detail["config_version"] != nil {
		t.Fatalf("affinity event %+v", clear)
	}
	// New rules: the reset names the version that changed them, no steps.
	e.configure(func(c *rules.Config) { c.MinSamples = 5 })
	e.window(20, 0)
	reset := e.events(map[string]string{"kind": rules.EventReset})
	if len(reset) != 1 || reset[0].Reason != rules.ReasonRulesChange || reset[0].Detail["config_version"] != float64(2) || reset[0].Detail["steps"] != nil {
		t.Fatalf("rules change event %+v", reset)
	}
	// A base change is the account's.
	e.rank(50)
	e.window(20, 0)
	if reset = e.events(map[string]string{"kind": rules.EventReset}); len(reset) != 2 || reset[0].Reason != rules.ReasonBaseMismatch || reset[0].Detail["config_version"] != nil {
		t.Fatalf("base mismatch event %+v", reset)
	}
}

// detailSteps reads detail.steps of an event.
func detailSteps(t *testing.T, ev eventItem) []rules.WeightStep {
	t.Helper()
	raw, err := json.Marshal(ev.Detail["steps"])
	if err != nil {
		t.Fatal(err)
	}
	var steps []rules.WeightStep
	if err := json.Unmarshal(raw, &steps); err != nil {
		t.Fatal(err)
	}
	return steps
}
