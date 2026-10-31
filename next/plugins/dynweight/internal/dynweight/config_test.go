package dynweight

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"

	"github.com/Sub2API-Devs/sup2api/next/plugins/dynweight/internal/rules"
)

// Until the stored configuration is read, the jobs refuse to run on the
// factory one standing in: evaluating would pin every degraded key to its
// base. Once it reads, they run on it and the degraded weight stands.
func TestJobsWaitForConfig(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	e.configure(nil)
	e.rank(100)
	e.window(5, 5)
	e.window(5, 5)
	if w := e.rank(100); w != 70 {
		t.Fatalf("degraded weight %d", w)
	}
	s, err := e.p.store(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var doc []byte
	if err := s.db.QueryRow(ctx, `SELECT doc FROM config`).Scan(&doc); err != nil {
		t.Fatal(err)
	}
	// As if Init could not read it, and it still does not decode.
	if _, err := s.db.Exec(ctx, `UPDATE config SET doc = '{"window_seconds":"x"}'`); err != nil {
		t.Fatal(err)
	}
	e.p.cfg.Store(&compiledConfig{Compiled: rules.Compile(rules.DefaultConfig())})
	for _, job := range []string{JobEvaluate, JobCleanup} {
		if _, err := e.p.RunJob(ctx, &pluginv1.RunJobRequest{JobId: job}); status.Code(err) != codes.Unavailable {
			t.Fatalf("%s: %v", job, err)
		}
	}
	if _, err := e.p.resetKeys(ctx, filter{AccountID: testAccount}, rules.ReasonManual, 1); err == nil {
		t.Fatal("reset ran without the configuration")
	}
	e.decode(e.h.Do("GET", "/status", nil, nil), http.StatusServiceUnavailable, nil)
	if err := e.p.reloadWeights(ctx); err != nil || len(*e.p.weights.Load()) != 1 {
		t.Fatalf("degraded keys %v (%v) while the configuration is not loaded", *e.p.weights.Load(), err)
	}
	if _, err := s.db.Exec(ctx, `UPDATE config SET doc = $1`, doc); err != nil {
		t.Fatal(err)
	}
	if msg := e.window(0, 0); msg != "evaluated 1 keys, 0 changed" {
		t.Fatalf("run once loaded: %s", msg)
	}
	if w := e.rank(100); !e.p.cfg.Load().loaded || w != 70 {
		t.Fatalf("weight %d once loaded, want the degraded one kept", w)
	}
}

// A stored group that no longer validates is dropped with a warning, and
// the rest of the configuration is in force.
func TestStoredBadGroupDropped(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	s, err := e.p.store(ctx)
	if err != nil {
		t.Fatal(err)
	}
	doc := `{"enabled": true, "window_seconds": 30, "min_samples": 0, "min_weight_mode": "base_percent", "min_weight": 0,
		"groups": {"2": {"min_weight": null}, "3": {"window_seconds": 99999}, "4": {"window_seconds": 120}}}`
	if _, err := s.db.Exec(ctx, `INSERT INTO config (id, doc, version) VALUES (1, $1, 1)`, doc); err != nil {
		t.Fatal(err)
	}
	if err := e.p.reloadConfig(ctx); err != nil {
		t.Fatal(err)
	}
	got := e.p.cfg.Load()
	if !got.loaded || !got.Enabled || got.WindowSeconds != 30 || got.MinSamples != rules.DefaultLayer().MinSamples {
		t.Fatalf("global layer: %+v", got.Layer)
	}
	if len(got.Groups) != 1 || got.GroupLayer(4).WindowSeconds != 120 || got.GroupLayer(2).WindowSeconds != 30 {
		t.Fatalf("groups %v", got.Groups)
	}
	var current struct {
		Data configBody `json:"data"`
	}
	e.decode(e.h.Do("GET", "/config", nil, nil), http.StatusOK, &current)
	if len(current.Data.Warnings) != 3 {
		t.Fatalf("warnings %q", current.Data.Warnings)
	}
}

// A null field in a group layer is refused rather than read as the default.
func TestGroupNullRefused(t *testing.T) {
	e := newEnv(t)
	body := json.RawMessage(`{"version": 0, "config": {"window_seconds": 60, "min_samples": 10, "min_weight_mode": "base_percent",
		"groups": {"2": {"window_seconds": 60, "min_samples": null}}}}`)
	resp := e.h.Do("PUT", "/config", nil, body)
	e.decode(resp, http.StatusBadRequest, nil)
	if want := "groups.2: min_samples must not be null"; !strings.Contains(string(resp.GetBody()), want) {
		t.Fatalf("body %s, want %q", resp.GetBody(), want)
	}
}

// Version 0 saves only while nothing is stored, any other only over itself.
func TestSaveConfigVersion(t *testing.T) {
	e := newEnv(t)
	c := rules.DefaultConfig()
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c, Version: 5}), http.StatusConflict, nil)
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c, Version: 0}), http.StatusOK, nil)
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c, Version: 0}), http.StatusConflict, nil)
	e.decode(e.h.Do("PUT", "/config", nil, configBody{Config: c, Version: 1}), http.StatusOK, nil)
}

// The event log grants at most eventLogLimit lines per eventLogSeconds and
// reports what a window refused once, when the next one starts.
func TestEventLogCap(t *testing.T) {
	var l eventLog
	for _, step := range []struct {
		n, at, granted, dropped int
	}{
		{eventLogLimit - 1, 100, eventLogLimit - 1, 0},
		{3, 110, 1, 0},
		{2, 159, 0, 0},
		{1, 100 + eventLogSeconds, 1, 4},
		{1, 101 + eventLogSeconds, 1, 0},
	} {
		if g, d := l.take(step.n, int64(step.at)); g != step.granted || d != step.dropped {
			t.Fatalf("take(%d) at %d: granted %d dropped %d, want %d %d", step.n, step.at, g, d, step.granted, step.dropped)
		}
	}
}
