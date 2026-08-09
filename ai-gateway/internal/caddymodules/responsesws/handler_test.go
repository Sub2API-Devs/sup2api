package responsesws

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2"
)

type noopNativeTransformer struct{}

type rejectingTurnLeaseRuntime struct{}

func (rejectingTurnLeaseRuntime) OpenRequest(context.Context, *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error) {
	return nil, nil
}

func (rejectingTurnLeaseRuntime) RenewLease(context.Context, *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error) {
	return &controlv1.RenewLeaseResponse{Renewed: false}, nil
}

func (rejectingTurnLeaseRuntime) AbortRequest(context.Context, *controlv1.AbortRequestRequest) error {
	return nil
}

func (rejectingTurnLeaseRuntime) SubmitSettlement(*controlv1.SettleRequestRequest) error { return nil }

func (rejectingTurnLeaseRuntime) RenewAuthGrant(context.Context, string, *requeststate.AuthGrant) (*requeststate.AuthGrant, error) {
	return nil, nil
}

func (noopNativeTransformer) TransformRequest(*http.Request, *controlv1.ExecutionPlan, *requeststate.State) error {
	return nil
}

func (noopNativeTransformer) TransformResponse(*http.Response, *controlv1.ExecutionPlan, *requeststate.State) error {
	return nil
}

func TestParseTurnDefaultsTypeAndReusesSessionModel(t *testing.T) {
	first, err := parseTurn([]byte(`{"model":"gpt-client","max_output_tokens":123,"service_tier":"fast","reasoning_effort":"low","reasoning":{"effort":"high"},"input":"hello"}`), "")
	if err != nil || first.model != "gpt-client" || first.maxOutputTokens != 123 || first.serviceTier != "fast" || first.reasoningEffort != "high" {
		t.Fatalf("first=%+v err=%v", first, err)
	}
	second, err := parseTurn([]byte(`{"type":"response.create","input":"continue"}`), first.model)
	if err != nil || second.model != first.model || !bytes.Contains(second.raw, []byte(`"model":"gpt-client"`)) {
		t.Fatalf("second=%+v err=%v", second, err)
	}
}

func TestBridgeRequestRemovesWebSocketEnvelopeAndMapsModel(t *testing.T) {
	bridged, err := bridgeRequest([]byte(`{"type":"response.create","generate":true,"model":"client","stream":false,"input":"hello"}`), "upstream")
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(bridged, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded["type"] != nil || decoded["generate"] != nil || decoded["model"] != "upstream" || decoded["stream"] != true {
		t.Fatalf("bridged=%s", bridged)
	}
}

func TestRestoreModelRewritesNestedResponseModelsOnly(t *testing.T) {
	payload := restoreModel([]byte(`{"type":"response.completed","model":"upstream","response":{"model":"upstream","output":[{"text":"upstream"}]}}`), "upstream", "client")
	if !bytes.Contains(payload, []byte(`"model":"client"`)) || !bytes.Contains(payload, []byte(`"text":"upstream"`)) {
		t.Fatalf("payload=%s", payload)
	}
}

func TestClientEventAcceptsCreateAndCancelOnly(t *testing.T) {
	if event, _, err := clientEvent([]byte(`{"model":"gpt"}`)); err != nil || event != "response.create" {
		t.Fatalf("implicit create event=%q err=%v", event, err)
	}
	if event, responseID, err := clientEvent([]byte(`{"type":"response.cancel","response_id":"resp-1"}`)); err != nil || event != "response.cancel" || responseID != "resp-1" {
		t.Fatalf("cancel event=%q response=%q err=%v", event, responseID, err)
	}
	if _, _, err := clientEvent([]byte(`{"type":"session.update"}`)); err == nil {
		t.Fatal("unsupported event was accepted")
	}
}

func TestPrepareNativeRequestMapsModelAndUsesOnlyPlanCredentials(t *testing.T) {
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: "wss://api.example.test/v1/responses", MappedModel: "gpt-upstream",
		UpstreamHeaders: map[string]string{"Authorization": "Bearer upstream-secret", "X-Plan": "snapshot", "Connection": "unsafe"},
	}
	target, _ := url.Parse(plan.GetUpstreamUrl())
	payload, headers, err := prepareNativeRequest(
		[]byte(`{"type":"response.create","model":"gpt-client","input":"hello"}`), target, plan,
		&requeststate.State{Auth: &requeststate.AuthGrant{APIKeyID: 1}}, noopNativeTransformer{},
	)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Contains(payload, []byte(`"type":"response.create"`)) || !bytes.Contains(payload, []byte(`"model":"gpt-upstream"`)) {
		t.Fatalf("native payload = %s", payload)
	}
	if headers.Get("Authorization") != "Bearer upstream-secret" || headers.Get("X-Plan") != "snapshot" || headers.Get("Connection") != "" {
		t.Fatalf("native headers = %#v", headers)
	}
}

func TestNativeConnectionKeyIsolatesCredentialAndTransportSnapshots(t *testing.T) {
	state := &requeststate.State{
		RequestID: "session-1", Auth: &requeststate.AuthGrant{CredentialDigest: "client-digest"},
		Admission: &controlv1.OpenRequestResponse{Lease: &controlv1.RequestLease{AccountId: 42}},
	}
	plan := &controlv1.ExecutionPlan{UpstreamUrl: "wss://api.example.test/v1/responses", TransportProfile: "proxy", ProxyUrl: "socks5://proxy-secret@proxy.test", ProtocolProfile: "passthrough"}
	first, firstScope, err := nativeConnectionKey(plan, http.Header{"Authorization": []string{"Bearer first"}}, state, "session-1")
	if err != nil {
		t.Fatal(err)
	}
	second, secondScope, err := nativeConnectionKey(plan, http.Header{"Authorization": []string{"Bearer second"}}, state, "session-1")
	if err != nil {
		t.Fatal(err)
	}
	if first == second || firstScope != secondScope {
		t.Fatalf("credential snapshots were not isolated: first=%x second=%x scopes=%q/%q", first, second, firstScope, secondScope)
	}
	third, _, err := nativeConnectionKey(plan, http.Header{"Authorization": []string{"Bearer first"}}, state, "session-2")
	if err != nil || first == third {
		t.Fatalf("session binding was not isolated: first=%x third=%x err=%v", first, third, err)
	}
}

func TestNativeTargetsConvertsSchemeForHTTPTransportFactory(t *testing.T) {
	target, transportPlan, err := nativeTargets(&controlv1.ExecutionPlan{UpstreamUrl: "wss://api.example.test/v1/responses?mode=native"})
	if err != nil {
		t.Fatal(err)
	}
	if target.Scheme != "wss" || transportPlan.GetUpstreamUrl() != "https://api.example.test/v1/responses?mode=native" {
		t.Fatalf("target=%s transport=%s", target, transportPlan.GetUpstreamUrl())
	}
	if _, _, err := nativeTargets(&controlv1.ExecutionPlan{UpstreamUrl: "wss://api.example.test/v1/responses", UpstreamHost: "other.example.test"}); err == nil {
		t.Fatal("unsafe native upstream_host override was accepted")
	}
}

func TestNativePoolRejectsInvalidLimitsThroughProvisionDefaults(t *testing.T) {
	pool := newNativeWSPool(1, time.Minute)
	if pool.max != 1 || pool.idle != time.Minute || len(pool.entries) != 0 {
		t.Fatalf("pool = %+v", pool)
	}
}

func TestResponsesTurnCancelsWhenLeaseRenewalIsRejected(t *testing.T) {
	handler := &Handler{RenewInterval: caddy.Duration(time.Millisecond), runtime: rejectingTurnLeaseRuntime{}}
	state := &requeststate.State{
		RequestID: "turn-1",
		Admission: &controlv1.OpenRequestResponse{Lease: &controlv1.RequestLease{
			LeaseId: "lease-1", ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli(),
		}},
	}
	ctx, cancel := context.WithCancelCause(context.Background())
	done := make(chan struct{})
	go handler.renewTurn(ctx, cancel, done, state)
	select {
	case <-ctx.Done():
	case <-time.After(time.Second):
		t.Fatal("rejected Responses turn lease did not cancel the turn")
	}
	<-done
	if context.Cause(ctx) != requeststate.ErrLeaseRevoked || state.Finish().ErrorCode != "lease_renewal_rejected" {
		t.Fatalf("cause=%v snapshot=%+v", context.Cause(ctx), state.Finish())
	}
}

func TestResponsesTurnAdmissionRejectsExpiredOrUnreservedLease(t *testing.T) {
	base := &controlv1.OpenRequestResponse{
		Lease: &controlv1.RequestLease{LeaseId: "lease-1", AccountId: 1, ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli()},
		Plan:  &controlv1.ExecutionPlan{UpstreamUrl: "https://api.example.test/v1/responses"},
	}
	if err := validateTurnAdmission(base, time.Now()); err != nil {
		t.Fatal(err)
	}
	expired := &controlv1.OpenRequestResponse{
		Lease: &controlv1.RequestLease{LeaseId: "lease-1", AccountId: 1, ExpiresAtUnixMs: time.Now().Add(-time.Second).UnixMilli()},
		Plan:  base.Plan,
	}
	if err := validateTurnAdmission(expired, time.Now()); err == nil {
		t.Fatal("expired Responses turn lease was accepted")
	}
	unreserved := &controlv1.OpenRequestResponse{
		Lease: &controlv1.RequestLease{LeaseId: "lease-1", AccountId: 1, ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli(), ReservedAmountMicrousd: 1},
		Plan:  base.Plan,
	}
	if err := validateTurnAdmission(unreserved, time.Now()); err == nil {
		t.Fatal("reservation without authoritative ID was accepted")
	}
}
