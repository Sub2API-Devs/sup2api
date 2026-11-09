package gateway

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"sync"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

// requestBoundConverter binds the request body as its response.
type requestBoundConverter struct{ option string }

func (c requestBoundConverter) From() string         { return "openai.chat" }
func (c requestBoundConverter) To() string           { return "anthropic.messages" }
func (c requestBoundConverter) Grade() convert.Grade { return convert.GradeFair }
func (c requestBoundConverter) Prepare(body []byte, _ convert.Options) (convert.Converter, []byte, error) {
	return requestBoundConverter{option: string(body)}, append([]byte(nil), body...), nil
}
func (c requestBoundConverter) Response([]byte) ([]byte, error)    { return []byte(c.option), nil }
func (c requestBoundConverter) NewStream() convert.StreamConverter { return nil }

func policyCall(body string) *call {
	return &call{body: []byte(body), principal: &core.APIKeyPrincipal{}}
}

// Each request binds its own converter; a route converts once per body.
func TestPreparedConversionDoesNotShareRequestOptions(t *testing.T) {
	shared := requestBoundConverter{}
	var wg sync.WaitGroup
	for i := range 32 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			want := fmt.Sprintf("request-%d", i)
			c, route := policyCall(want), &typeRoute{conv: shared}
			if !c.prepareRoute(context.Background(), route) || string(route.body) != want {
				t.Errorf("prepare %s: %s", want, route.body)
				return
			}
			c.body = []byte("retry carrier") // same body version: not converted again
			if !c.prepareRoute(context.Background(), route) || string(route.body) != want {
				t.Errorf("retry %s: %s", want, route.body)
			}
			if got, err := route.conv.Response(nil); err != nil || string(got) != want {
				t.Errorf("response %s: %s %v", want, got, err)
			}
		}()
	}
	wg.Wait()
}

type failedPrepared struct {
	requestBoundConverter
	calls *int
	err   error
	bound convert.Converter
}

func (c failedPrepared) Prepare([]byte, convert.Options) (convert.Converter, []byte, error) {
	*c.calls++
	return c.bound, []byte("x"), c.err
}

// A failed conversion is kept for the body version: the type is skipped
// without converting again.
func TestPreparedFailureIsKeptPerBodyVersion(t *testing.T) {
	count := 0
	refused := &convert.RequestError{Cause: errors.New("n > 1")}
	c, route := policyCall("a"), &typeRoute{conv: failedPrepared{calls: &count, err: refused}, upstream: "anthropic.messages"}
	ref := &core.AccountRef{}
	c.routes = map[core.AccountTypeKey]*typeRoute{{}: route}
	for range 2 {
		if c.usable(context.Background(), ref) || c.routed(ref) {
			t.Fatal("failed route usable")
		}
	}
	if count != 1 || route.body != nil {
		t.Fatalf("prepared %d times, body %q", count, route.body)
	}
	if e := c.unsupportedConversion(); e == nil || e.Status != 400 || e.Code != "unsupported_conversion" ||
		e.Message != "request cannot be converted to anthropic.messages: n > 1" {
		t.Fatalf("refusal %+v", e)
	}
	c.bodyVersion++
	c.prepareRoute(context.Background(), route)
	if count != 2 {
		t.Fatal("a new body version was not converted again")
	}

	// A converter failure refuses the type too.
	other := policyCall("a")
	other.prepareRoute(context.Background(), &typeRoute{conv: failedPrepared{calls: &count, err: errors.New("bug")}, upstream: "y"})
	if e := other.unsupportedConversion(); e == nil || e.Message != "request cannot be converted to y: bug" || other.conversion.rejected[0].Error != "bug" {
		t.Fatalf("converter failure %+v", other.conversion)
	}
	// A bound converter of another pair is a failure too.
	if other.prepareRoute(context.Background(), &typeRoute{conv: failedPrepared{calls: &count, bound: stubPair{"a", "b"}}}) {
		t.Fatal("bound converter of another pair accepted")
	}
}

type stubPair struct{ from, to string }

func (s stubPair) From() string         { return s.from }
func (s stubPair) To() string           { return s.to }
func (s stubPair) Grade() convert.Grade { return convert.GradeFair }
func (s stubPair) Prepare([]byte, convert.Options) (convert.Converter, []byte, error) {
	return s, nil, nil
}
func (s stubPair) Response(b []byte) ([]byte, error)  { return b, nil }
func (s stubPair) NewStream() convert.StreamConverter { return nil }

func TestLossPolicies(t *testing.T) {
	tool := convert.Loss{Category: convert.LossTool, Path: "tools[1]", Hop: 1}
	other := convert.Loss{Category: convert.LossOther, Path: "top_k"}
	for _, tc := range []struct {
		policy string
		losses []convert.Loss
		refuse *convert.Loss
	}{
		{core.LossPolicyAllow, []convert.Loss{tool, other}, nil},
		{core.LossPolicySafe, []convert.Loss{other}, nil},
		{core.LossPolicySafe, []convert.Loss{other, tool}, &tool},
		{core.LossPolicyStrict, []convert.Loss{other, tool}, &other},
		{core.LossPolicyStrict, nil, nil},
	} {
		if got := refusingLoss(tc.losses, tc.policy); !reflect.DeepEqual(got, tc.refuse) {
			t.Errorf("%s %v: %v", tc.policy, tc.losses, got)
		}
	}
	for _, tc := range [][3]string{{"", "", "allow"}, {"", "safe", "safe"}, {"strict", "safe", "strict"}, {"allow", "strict", "allow"}} {
		if got := core.EffectiveLossPolicy(tc[0], tc[1]); got != tc[2] {
			t.Errorf("effective(%q, %q) = %s", tc[0], tc[1], got)
		}
	}

	// Verdicts are cached per policy; a refusal is recorded once.
	c := policyCall("{}")
	rt := &typeRoute{upstream: "anthropic.messages", binding: core.AccountTypeBinding{Plugin: core.PluginInfo{Key: "p"}}}
	rt.prepared.losses = []convert.Loss{tool}
	rt.binding.Type.ID = "k"
	for range 2 {
		if c.admits(rt, core.LossPolicySafe) || !c.admits(rt, core.LossPolicyAllow) {
			t.Fatal("verdicts")
		}
	}
	want := []core.ConversionRejection{{Type: "p/k", Policy: "safe", Category: "tool", Path: "1:tools[1]"}}
	if !reflect.DeepEqual(c.conversion.rejected, want) {
		t.Fatalf("rejected %+v", c.conversion.rejected)
	}
	if e := c.unsupportedConversion(); e.Message != "request cannot be converted to anthropic.messages: 1:tools[1] would be lost (tool, policy safe)" {
		t.Fatalf("refusal %q", e.Message)
	}
}

func TestConversionTrace(t *testing.T) {
	c := policyCall("{}")
	if c.conversionTrace() != nil {
		t.Fatal("trace without a route")
	}
	native := &typeRoute{grade: convert.GradeNative}
	c.serveRoute(native, &core.AccountRef{})
	if c.conversionTrace() != nil {
		t.Fatal("trace of a native request")
	}
	c.conversion.rejected = []core.ConversionRejection{{Type: "p/k", Error: "n > 1"}}
	if tr := c.conversionTrace(); tr == nil || tr.Grade != "native" || tr.Hops != nil || len(tr.Rejected) != 1 {
		t.Fatalf("native with rejections %+v", tr)
	}

	f := &fakeConv{from: "anthropic.messages", to: "openai.chat"}
	for i := range 45 {
		f.losses = append(f.losses, convert.Loss{Category: convert.LossOther, Path: fmt.Sprintf("p%02d", i)})
	}
	f.losses[0] = convert.Loss{Category: convert.LossTool, Path: "tools[0]", Hop: 1}
	f.losses[1] = convert.Loss{Category: convert.LossReasoning, Path: "response." + strings.Repeat("x", 200)}
	rt := &typeRoute{conv: f, grade: convert.GradeDiscouraged, hops: []string{"a", "openai.responses", "b"}}
	c = policyCall("{}")
	c.principal.Group.ConversionLossPolicy = core.LossPolicySafe
	c.serveRoute(rt, &core.AccountRef{})
	tr := c.conversionTrace()
	if tr.V != 1 || tr.Grade != "discouraged" || tr.Policy != "safe" || len(tr.Hops) != 3 || tr.Omitted != 5 ||
		!reflect.DeepEqual(tr.Lost["tool"], []string{"1:tools[0]"}) || len(tr.Lost["other"]) != 38 ||
		len(tr.ResponseLost["reasoning"][0]) != maxTracePathBytes {
		t.Fatalf("trace %+v", tr)
	}
}

// policyEnv is convEnv whose converter loses a tool definition; the q
// account (priority 100) outranks the native ones (99, 50, 10).
func policyEnv(t *testing.T, groupPolicy string) (*env, *qUpstream, *fakePlatform, *fakeConv) {
	f := &fakeConv{losses: []convert.Loss{{Category: convert.LossTool, Path: "tools[1]"}}}
	e, q, qp := convEnv(t, f)
	e.auth.keys[testKey].Group.ConversionLossPolicy = groupPolicy
	return e, q, qp, f
}

func disableNative(e *env) {
	for _, id := range []int64{1, 2, 3} {
		e.accounts.disabled[id] = "test"
	}
}

// A refused account is skipped without a slot, an attempt or a failover;
// the next account serves the request and the trace names the refusal.
func TestLossPolicyRefusalSkipsAccount(t *testing.T) {
	e, q, qp, _ := policyEnv(t, core.LossPolicySafe)
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	rec := e.record()
	if rec.Attempts != 1 || rec.AccountID == nil || *rec.AccountID != 1 || qp.buildCount() != 0 || len(q.bodies) != 0 {
		t.Fatalf("record %+v builds %d", rec, qp.buildCount())
	}
	want := []core.ConversionRejection{{Type: "qplug/q_key", Policy: "safe", Category: "tool", Path: "tools[1]"}}
	if rec.Conversion == nil || rec.Conversion.Grade != "native" || !reflect.DeepEqual(rec.Conversion.Rejected, want) {
		t.Fatalf("trace %+v", rec.Conversion)
	}
}

// The account's policy overrides the group's.
func TestLossPolicyAccountOverridesGroup(t *testing.T) {
	e, _, _, _ := policyEnv(t, core.LossPolicyStrict)
	e.accounts.accounts[6].ConversionLossPolicy = core.LossPolicyAllow
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	rec := e.record()
	if *rec.AccountID != 6 || rec.Conversion == nil || rec.Conversion.Grade != "fair" || rec.Conversion.Policy != "allow" ||
		!reflect.DeepEqual(rec.Conversion.Lost, map[string][]string{"tool": {"tools[1]"}}) || rec.Conversion.Rejected != nil {
		t.Fatalf("record %+v trace %+v", rec, rec.Conversion)
	}
}

// When every candidate is refused the request ends with 400
// unsupported_conversion and no attempt.
func TestLossPolicyAllRefused(t *testing.T) {
	e, q, qp, f := policyEnv(t, core.LossPolicySafe)
	disableNative(e)
	r := e.messages(body(testModel, false))
	if r.status != 400 || r.json().Get("error.code").String() != "unsupported_conversion" ||
		!strings.Contains(r.json().Get("error.message").String(), "tools[1] would be lost (tool, policy safe)") {
		t.Fatalf("response %d %s", r.status, r.body)
	}
	rec := e.record()
	if rec.Attempts != 0 || rec.ErrorType != errTypeInvalidRequest || rec.Success || qp.buildCount() != 0 || len(q.bodies) != 0 {
		t.Fatalf("record %+v", rec)
	}
	if f.prepares != 1 || len(rec.Conversion.Rejected) != 1 || rec.Conversion.Grade != "" {
		t.Fatalf("prepares %d trace %+v", f.prepares, rec.Conversion)
	}
}

// Only the types pick reaches convert the request: a native account that
// takes the request leaves the converting type untouched.
func TestConversionOnlyWhenConsidered(t *testing.T) {
	e, _, _, f := policyEnv(t, "")
	e.accounts.accounts[6].Priority = 1
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d", r.status)
	}
	if rec := e.record(); *rec.AccountID != 1 || rec.Conversion != nil || f.prepares != 0 {
		t.Fatalf("record %+v prepares %d", rec, f.prepares)
	}
}
