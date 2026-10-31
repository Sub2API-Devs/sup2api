package dynweight

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

// attempt is a finished attempt of the test key: ttfb < 0 for none (a
// non-streaming request), whole the attempt's duration; fail answers 500.
type attempt struct {
	stream      bool
	fail        bool
	ttfb, whole int64 // ms
}

func attempts(n int, a attempt) []attempt {
	out := make([]attempt, n)
	for i := range out {
		out[i] = a
	}
	return out
}

var (
	// longStream is a normal long answer: first token after 2 s, done after
	// 5 minutes.
	longStream = attempt{stream: true, ttfb: 2000, whole: 300000}
	plainOK    = attempt{ttfb: -1, whole: 3000}
	plainFail  = attempt{fail: true, ttfb: -1, whole: 1000}
)

// windowOf records the attempts in the current window, moves the clock past
// its close and evaluates, as window does.
func (e *env) windowOf(ctx context.Context, list ...attempt) string {
	e.t.Helper()
	res := e.p.cfg.Load().Resolve(testAccount, testGroup)
	start := rules.WindowStart(testAccount, e.clock.Load(), res.WindowSeconds)
	end := time.Unix(start+int64(res.WindowSeconds)-1, 0).UnixMilli()
	var batch pluginv1.ObservationBatch
	for _, a := range list {
		o := &pluginv1.RequestObservation{Phase: observation.AttemptFinished, AccountId: testAccount, GroupId: testGroup, Model: testModel,
			Stream: a.stream, Success: !a.fail, UpstreamStatusCode: http.StatusOK, AttemptStartedAtUnixMs: end - a.whole, OccurredAtUnixMs: end}
		if a.fail {
			o.UpstreamStatusCode = http.StatusInternalServerError
		}
		if a.stream && a.ttfb >= 0 {
			o.FirstStreamEventAtUnixMs = o.AttemptStartedAtUnixMs + a.ttfb
		}
		batch.Observations = append(batch.Observations, o)
	}
	if _, err := e.p.OnObservations(ctx, &batch); err != nil {
		e.t.Fatal(err)
	}
	e.clock.Store(start + int64(res.WindowSeconds) + rules.CloseGraceSeconds)
	resp, err := e.p.RunJob(ctx, &pluginv1.RunJobRequest{JobId: JobEvaluate})
	if err != nil {
		e.t.Fatal(err)
	}
	return resp.GetMessage()
}

func (e *env) events(query map[string]string) []eventItem {
	e.t.Helper()
	var events struct {
		Data []eventItem `json:"data"`
	}
	e.decode(e.h.Do("GET", "/events", query, nil), http.StatusOK, &events)
	return events.Data
}

func (e *env) pendingClears() []pendingClear {
	e.t.Helper()
	s, err := e.p.store(context.Background())
	if err != nil {
		e.t.Fatal(err)
	}
	rows, err := s.db.Query(context.Background(), `SELECT account_id, group_id, model, salt, percent, zero, attempts FROM sticky_pending ORDER BY account_id`)
	if err != nil {
		e.t.Fatal(err)
	}
	defer rows.Close()
	var out []pendingClear
	for rows.Next() {
		var c pendingClear
		if err := rows.Scan(&c.AccountID, &c.GroupID, &c.Model, &c.Salt, &c.Percent, &c.Zero, &c.Attempts); err != nil {
			e.t.Fatal(err)
		}
		out = append(out, c)
	}
	return out
}

// Normal long streams leave the default rules alone; a key with
// non-streaming traffic only degrades and climbs back.
func TestLongStreamsAndNonStreamOnly(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	e.configure(nil)
	e.rank(100)
	for range 3 {
		if msg := e.windowOf(ctx, attempts(10, longStream)...); msg != "evaluated 1 keys, 0 changed" {
			t.Fatalf("long streams: %s", msg)
		}
	}
	if w := e.rank(100); w != 0 {
		t.Fatalf("long streams degraded the account to %d", w)
	}
	bad := append(attempts(5, plainOK), attempts(5, plainFail)...)
	e.windowOf(ctx, bad...)
	e.windowOf(ctx, bad...)
	if w := e.rank(100); w != 70 {
		t.Fatalf("degraded weight %d", w)
	}
	if msg := e.windowOf(ctx, attempts(20, plainOK)...); msg != "evaluated 1 keys, 1 changed" {
		t.Fatalf("non-streaming recovery: %s", msg)
	}
	if w := e.rank(100); w != 80 {
		t.Fatalf("weight after a healthy non-streaming window %d", w)
	}
}

// Sticky clears run after the events and the notifications; one that fails
// stays queued for the next run, which clears the same bindings (same salt);
// one the host refuses is given up with the error in its event.
func TestStickyClearQueued(t *testing.T) {
	e := newEnv(t)
	e.configure(func(c *rules.Config) {
		c.Notify = rules.Notify{Enabled: true, Channel: "email", Recipients: []string{"ops@example.com"}}
		c.Strategies[0].Actions = append(c.Strategies[0].Actions, rules.Action{Type: rules.ActionAffinityClear, Percent: 50})
	})
	clearErr := status.Error(codes.Unavailable, "sticky store unavailable")
	var calls []*pluginv1.ClearStickyBindingsRequest
	e.fh.ClearStickyBindingsFunc = func(_ context.Context, in *pluginv1.ClearStickyBindingsRequest) (*pluginv1.ClearStickyBindingsResponse, error) {
		calls = append(calls, in)
		if clearErr != nil {
			return nil, clearErr
		}
		return &pluginv1.ClearStickyBindingsResponse{Matched: 6, Cleared: 3}, nil
	}
	e.rank(100)
	e.window(5, 5)
	e.window(5, 5)
	if len(e.notified) != 1 || len(calls) != 1 {
		t.Fatalf("notified %d, clear calls %d", len(e.notified), len(calls))
	}
	if ev := e.events(nil); len(ev) != 1 || ev[0].Kind != rules.EventWeightDown {
		t.Fatalf("events %+v", ev)
	}
	pending := e.pendingClears()
	if len(pending) != 1 || pending[0].Attempts != 1 || pending[0].Percent != 50 || pending[0].Salt != calls[0].GetSalt() {
		t.Fatalf("pending %+v", pending)
	}
	clearErr = nil
	e.window(0, 0)
	if len(calls) != 2 || calls[1].GetSalt() != calls[0].GetSalt() || calls[1].GetPercent() != 50 || len(e.pendingClears()) != 0 {
		t.Fatalf("retry %+v, pending %+v", calls, e.pendingClears())
	}
	ev := e.events(map[string]string{"kind": rules.EventAffinityClear})
	if len(ev) != 1 || ev[0].Detail["cleared"] != float64(3) || ev[0].Detail["strategy"] != "错误率过高" || ev[0].From != 70 {
		t.Fatalf("clear event %+v", ev)
	}

	// Refused: given up at once.
	clearErr = status.Error(codes.PermissionDenied, "sticky.clear not granted")
	e.window(5, 5)
	e.window(5, 5)
	ev = e.events(map[string]string{"kind": rules.EventAffinityClear})
	if len(e.pendingClears()) != 0 || len(ev) != 2 || !strings.Contains(ev[0].Detail["error"].(string), "not granted") {
		t.Fatalf("refused: pending %+v, events %+v", e.pendingClears(), ev)
	}
}

// Clears that outlast their budget are handed back to the next run; the
// events and the notification of the run that decided them are not lost.
func TestSlowStickyClearKeepsEvents(t *testing.T) {
	e := newEnv(t)
	e.configure(func(c *rules.Config) {
		c.Notify = rules.Notify{Enabled: true, Channel: "email", Recipients: []string{"ops@example.com"}}
		c.Strategies[0].Actions = append(c.Strategies[0].Actions, rules.Action{Type: rules.ActionAffinityClear, Percent: 50})
	})
	stall := true
	e.fh.ClearStickyBindingsFunc = func(ctx context.Context, in *pluginv1.ClearStickyBindingsRequest) (*pluginv1.ClearStickyBindingsResponse, error) {
		if stall {
			<-ctx.Done()
			return nil, ctx.Err()
		}
		return &pluginv1.ClearStickyBindingsResponse{Matched: 1, Cleared: 1}, nil
	}
	e.rank(100)
	e.window(5, 5)
	// The job's deadline leaves the clears stickyMargin less: 2 s.
	ctx, cancel := context.WithTimeout(context.Background(), stickyMargin+2*time.Second)
	defer cancel()
	started := time.Now()
	e.windowOf(ctx, append(attempts(5, plainOK), attempts(5, plainFail)...)...)
	if took := time.Since(started); took > stickyMargin+time.Second {
		t.Fatalf("the run took %v", took)
	}
	if len(e.notified) != 1 {
		t.Fatalf("notified %d", len(e.notified))
	}
	if ev := e.events(nil); len(ev) != 1 || ev[0].Kind != rules.EventWeightDown {
		t.Fatalf("events %+v", ev)
	}
	if pending := e.pendingClears(); len(pending) != 1 {
		t.Fatalf("pending %+v", pending)
	}
	stall = false
	e.window(0, 0)
	if len(e.pendingClears()) != 0 || len(e.events(map[string]string{"kind": rules.EventAffinityClear})) != 1 {
		t.Fatalf("not cleared on the next run: %+v", e.pendingClears())
	}
}

// A key dropping to 0 clears all its sticky bindings without an
// affinity_clear strategy, unless clear_sticky_on_zero is off.
func TestZeroClearsStickyBindings(t *testing.T) {
	for _, on := range []bool{true, false} {
		e := newEnv(t)
		e.configure(func(c *rules.Config) {
			c.Strategies[0].Actions[0] = rules.Action{Type: rules.ActionWeightDegrade, Mode: rules.ModeCurrentPercent, Value: 100}
			c.ClearStickyOnZero = on
		})
		e.rank(100)
		e.window(5, 5)
		e.window(5, 5)
		if w := e.rank(100); w != 1 {
			t.Fatalf("a tier at 0 is split evenly: %d", w)
		}
		e.mu.Lock()
		cleared := e.cleared
		e.mu.Unlock()
		if !on {
			if len(cleared) != 0 {
				t.Fatalf("cleared while off: %+v", cleared)
			}
			continue
		}
		if len(cleared) != 1 || cleared[0].GetPercent() != 100 {
			t.Fatalf("cleared %+v", cleared)
		}
		ev := e.events(map[string]string{"kind": rules.EventAffinityClear})
		if len(ev) != 1 || ev[0].Detail["zero"] != true || ev[0].Detail["strategy"] != "" || ev[0].To != 0 {
			t.Fatalf("events %+v", ev)
		}
	}
}

// A candidate an earlier ranker set to 0 is not this plugin's: no base is
// learned from it, it is left out, and it does not keep its tier live.
func TestRankSkipsZeroCandidates(t *testing.T) {
	e := newEnv(t)
	e.configure(nil)
	e.p.weights.Store(&map[key]weight{{AccountID: 2, GroupID: testGroup, Model: testModel}: {base: 100, eff: 0}})
	resp, err := e.p.RankAccounts(context.Background(), &pluginv1.RankAccountsRequest{
		Meta:       &pluginv1.RequestMeta{GroupId: testGroup, Model: testModel},
		Candidates: []*pluginv1.RankCandidate{{AccountId: 1, Priority: 1, Weight: 0}, {AccountId: 2, Priority: 1, Weight: 100}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got := resp.GetAccounts(); len(got) != 1 || got[0].GetAccountId() != 2 || got[0].GetWeight() != 1 {
		t.Fatalf("ranked %v", got)
	}
	bases := e.p.bases.take()
	if _, ok := bases[pair{1, testGroup}]; ok || len(bases) != 1 {
		t.Fatalf("bases %v", bases)
	}
}

// Migration 0002 moves layers whose rules are exactly the 0.2.0 defaults to
// the 0.3.0 ones, leaves changed ones alone, and runs again as a no-op.
func TestMigrationMovesOldDefaults(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	s, err := e.p.store(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var old []any
	if err := json.Unmarshal([]byte(rules020), &old); err != nil {
		t.Fatal(err)
	}
	changed := strings.Replace(rules020, `"value":30}`, `"value":40}`, 1)
	doc := `{"enabled":true,"window_seconds":60,"min_samples":10,"exempt_status_codes":"400","min_weight_mode":"base_percent","min_weight":0,` +
		`"rules":` + rules020 + `,"strategies":` + strategies020 + `,` +
		`"groups":{"5":{"window_seconds":30,"rules":` + rules020 + `},"6":{"rules":` + changed + `}},"notify":{"enabled":false,"channel":"","recipients":[],"language":"zh"},"log_events":true}`
	if _, err := s.db.Exec(ctx, `INSERT INTO config (id, doc, version) VALUES (1, $1, 4)`, doc); err != nil {
		t.Fatal(err)
	}
	migration, err := os.ReadFile(filepath.Join("..", "..", "migrations", "0002_sticky_pending_defaults.sql"))
	if err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if _, err := s.db.Exec(ctx, string(migration)); err != nil {
			t.Fatal(err)
		}
	}
	c, version, warnings, err := s.loadConfig(ctx)
	if err != nil {
		t.Fatal(err)
	}
	// Two updates (the global layer, the groups), then nothing.
	if version != 6 {
		t.Fatalf("version %d", version)
	}
	def := rules.DefaultLayer()
	if !reflect.DeepEqual(c.Rules, def.Rules) || !reflect.DeepEqual(c.Groups[5].Rules, def.Rules) || c.Groups[5].WindowSeconds != 30 {
		t.Fatalf("not moved: %+v / %+v", c.Rules, c.Groups[5].Rules)
	}
	if c.Groups[6].Rules[0].Conditions[0].Value != 40 || c.Groups[6].Rules[2].Conditions[1].Scope != "" {
		t.Fatalf("a changed layer moved: %+v", c.Groups[6].Rules)
	}
	if len(warnings) != 0 {
		t.Fatalf("load warnings %q", warnings)
	}
	// Saving the changed group warns about what it keeps.
	w, err := c.Normalize()
	if err != nil {
		t.Fatal(err)
	}
	if len(w) != 4 || !strings.HasPrefix(w[0], "groups.6.rules[2]") {
		t.Fatalf("save warnings %q", w)
	}
	// A layer that was saved before 0.3.0 reads the new switches as on.
	if !c.MinSamplesStrict || !c.ClearStickyOnZero || !c.Groups[6].MinSamplesStrict {
		t.Fatalf("switches %+v", c.Layer)
	}
}

// rules020 / strategies020 are the 0.2.0 defaults as 0.2.0 saved them.
const (
	rules020 = `[{"name":"错误率过高","conditions":[{"metric":"error_rate","op":"gte","value":30}],"periods":3,"hit_periods":2},` +
		`{"name":"首字 p95 过慢","conditions":[{"metric":"ttfb","p":95,"op":"gte","value":10000}],"periods":3,"hit_periods":2},` +
		`{"name":"首字挂死","conditions":[{"metric":"ttfb","p":100,"op":"gte","value":60000},{"join":"or","metric":"latency","p":100,"op":"gte","value":120000}],"periods":1,"hit_periods":1},` +
		`{"name":"健康恢复","conditions":[{"metric":"error_rate","op":"lt","value":15},{"join":"and","metric":"ttfb","p":95,"op":"lt","value":10000},{"join":"and","metric":"ttfb","p":100,"op":"lt","value":60000},{"join":"and","metric":"latency","p":100,"op":"lt","value":120000}],"periods":1,"hit_periods":1},` +
		`{"name":"复活探测","conditions":[{"metric":"weight","op":"lte","value":0}],"periods":2,"hit_periods":2}]`
	strategies020 = `[{"name":"错误率过高","when":"错误率过高","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},` +
		`{"name":"首字 p95 过慢","when":"首字 p95 过慢","actions":[{"type":"weight_degrade","mode":"current_percent","value":30}]},` +
		`{"name":"首字挂死","when":"首字挂死","actions":[{"type":"weight_degrade","mode":"current_percent","value":50}]},` +
		`{"name":"自动回升","when":"健康恢复","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]},` +
		`{"name":"复活探测","when":"复活探测","actions":[{"type":"weight_climb","mode":"base_percent","value":10}]}]`
)
