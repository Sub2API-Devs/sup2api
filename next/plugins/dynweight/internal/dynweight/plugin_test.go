package dynweight

import (
	"context"
	"encoding/json"
	"net/http"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"

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
	clock atomic.Int64 // unix seconds

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

// window records attempts in the current window, then moves the clock past
// its close and evaluates.
func (e *env) window(ok, fail int) string {
	e.t.Helper()
	res := e.p.cfg.Load().Resolve(testAccount, testGroup)
	start := rules.WindowStart(testAccount, e.clock.Load(), res.WindowSeconds)
	at := time.Unix(start+10, 0).UnixMilli()
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
	e.clock.Store(start + int64(res.WindowSeconds) + rules.CloseGraceSeconds)
	resp, err := e.p.RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: JobEvaluate})
	if err != nil {
		e.t.Fatal(err)
	}
	return resp.GetMessage()
}

func TestDegradeNotifyAndReset(t *testing.T) {
	e := newEnv(t)
	e.configure(func(c *rules.Config) {
		c.Notify = rules.Notify{Enabled: true, Channel: "email", Recipients: []string{"ops@example.com"}}
		c.Strategies[0].Actions = append(c.Strategies[0].Actions, rules.Action{Type: rules.ActionAffinityClear, Percent: 50})
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
	if len(e.cleared) != 1 || e.cleared[0].GetPercent() != 50 || e.cleared[0].GetModel() != testModel {
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
	var weights struct {
		Data map[string]accountWeight `json:"data"`
	}
	e.decode(e.h.Do("GET", "/weights", map[string]string{"account_ids": "7,8"}, nil), http.StatusOK, &weights)
	if weights.Data["7"] != (accountWeight{Degraded: 1, Lowest: 70, Base: 100}) || len(weights.Data) != 1 {
		t.Fatalf("weights %v", weights.Data)
	}

	e.decode(e.h.Do("POST", "/reset", nil, map[string]any{"account_id": testAccount}), http.StatusOK, nil)
	if w := e.rank(100); w != 0 {
		t.Fatalf("weight after reset %d", w)
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

func TestConfigRoutes(t *testing.T) {
	e := newEnv(t)
	var current struct {
		Data configBody `json:"data"`
	}
	e.decode(e.h.Do("GET", "/config", nil, nil), http.StatusOK, &current)
	c := current.Data.Config
	c.Notify = rules.Notify{Enabled: true, Channel: "sms", Recipients: []string{"x"}}
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusBadRequest, nil)
	c.Notify.Channel = "email"
	c.WindowSeconds = 1
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusBadRequest, nil)
	c.WindowSeconds = 30
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusOK, nil)
	// A second save from the same read is refused.
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c}), http.StatusConflict, nil)
	if got := e.p.cfg.Load(); got.version != 1 || got.WindowSeconds != 30 {
		t.Fatalf("config in force: %d %d", got.version, got.WindowSeconds)
	}
	e.decode(e.h.Do("POST", "/reset", nil, map[string]any{}), http.StatusBadRequest, nil)
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
	failed := *base
	failed.Success, failed.UpstreamStatusCode = false, 529
	if _, s, _ := sampleOf(&failed); !s.Fail || s.FailStatus != 529 || s.TTFBMs != -1 || s.LatencyMs != -1 {
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
