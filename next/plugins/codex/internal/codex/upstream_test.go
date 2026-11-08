package codex

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

const (
	deviceCreds = `{"access_token":"at-device","refresh_token":"rt-device","chatgpt_account_id":"acct-1"}`
	siwcCreds   = `{"access_token":"at-siwc","refresh_token":"rt-siwc","client_id":"client-9","ext_agent_host_id":"urn:uuid:123e4567-e89b-42d3-a456-426614174000"}`
)

func patchMap(r *pluginv1.BuildUpstreamRequestResponse) (sets map[string]string, dels []string) {
	sets = map[string]string{}
	for _, p := range r.GetPatches() {
		switch p.GetOp() {
		case pluginv1.BodyPatch_OP_SET:
			sets[p.GetPath()] = p.GetValueJson()
		case pluginv1.BodyPatch_OP_DELETE:
			dels = append(dels, p.GetPath())
		}
	}
	sort.Strings(dels)
	return sets, dels
}

func sorted(s []string) []string {
	s = slices.Clone(s)
	sort.Strings(s)
	return s
}

// The client's own headers never reach the upstream: the plugin names
// sup2api, truthfully, and nothing else.
var clientHeaders = map[string]string{"user-agent": "codex_cli_rs/0.99", "openai-beta": "responses=experimental", "x-stainless-lang": "js"}

func TestBuildUpstreamRequestDevice(t *testing.T) {
	h := startPlugin(t, NewWithEndpoints(DefaultEndpoints))
	r, err := h.Platform.BuildUpstreamRequest(context.Background(), &pluginv1.BuildUpstreamRequestRequest{
		Meta:           &pluginv1.RequestMeta{Protocol: ProtocolResponses, ClientProtocol: "openai.chat", Model: "gpt-5.4"},
		Account:        account(TypeDevice, deviceCreds),
		Fields:         map[string]string{"model": `"gpt-5.4"`, FieldHasInstructions: "0", FieldStringInput: `"hello"`},
		InboundHeaders: clientHeaders,
	})
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{
		"authorization":      "Bearer at-device",
		"chatgpt-account-id": "acct-1",
		"originator":         "sup2api",
		"user-agent":         "sup2api-codex/" + Version,
		"accept":             "text/event-stream",
		"content-type":       "application/json",
	}
	if r.GetMethod() != "POST" || r.GetUrl() != "https://chatgpt.com/backend-api/codex/responses" || r.GetUpstreamModel() != "gpt-5.4" {
		t.Fatalf("request = %s %s %s", r.GetMethod(), r.GetUrl(), r.GetUpstreamModel())
	}
	if len(r.GetHeaders()) != len(want) {
		t.Fatalf("headers = %v, want exactly %v", r.GetHeaders(), want)
	}
	for k, v := range want {
		if r.GetHeaders()[k] != v {
			t.Errorf("header %s = %q, want %q", k, r.GetHeaders()[k], v)
		}
	}
	sets, dels := patchMap(r)
	if sets["store"] != "false" || sets["instructions"] != `""` {
		t.Fatalf("sets = %v", sets)
	}
	if _, ok := sets["stream"]; ok {
		t.Fatal("stream is the core's to set (streamOnly)")
	}
	var input []map[string]any
	mustJSON(t, []byte(sets["input"]), &input)
	if len(input) != 1 || input[0]["role"] != "user" || input[0]["type"] != "message" {
		t.Fatalf("input = %s", sets["input"])
	}
	if c, _ := input[0]["content"].([]any); len(c) != 1 || c[0].(map[string]any)["text"] != "hello" {
		t.Fatalf("input content = %s", sets["input"])
	}
	if !slices.Equal(dels, sorted(unsupportedDevice)) {
		t.Fatalf("deletes = %v", dels)
	}

	// Instructions present, input already an array, no account id: no
	// instructions or input patch, no account header.
	r, err = h.Platform.BuildUpstreamRequest(context.Background(), &pluginv1.BuildUpstreamRequestRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolResponses, Model: "gpt-5.1-codex", Stream: true},
		Account: account(TypeDevice, `{"access_token":"at"}`),
		Fields:  map[string]string{"model": `"gpt-5.1-codex"`, FieldHasInstructions: "1"},
	})
	if err != nil {
		t.Fatal(err)
	}
	sets, _ = patchMap(r)
	if _, ok := sets["instructions"]; ok {
		t.Errorf("instructions patched although present: %v", sets)
	}
	if _, ok := sets["input"]; ok {
		t.Errorf("array input patched: %v", sets)
	}
	if _, ok := r.GetHeaders()["chatgpt-account-id"]; ok {
		t.Errorf("empty account id sent: %v", r.GetHeaders())
	}
}

func TestBuildUpstreamRequestSIWC(t *testing.T) {
	h := startPlugin(t, NewWithEndpoints(DefaultEndpoints))
	r, err := h.Platform.BuildUpstreamRequest(context.Background(), &pluginv1.BuildUpstreamRequestRequest{
		Meta:           &pluginv1.RequestMeta{Protocol: ProtocolResponses, Model: "gpt-5.4"},
		Account:        account(TypeSIWC, siwcCreds),
		Fields:         map[string]string{"model": `"gpt-5.4"`, FieldStringInput: `"  "`},
		InboundHeaders: clientHeaders,
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != "https://api.openai.com/v1/responses" || r.GetHeaders()["authorization"] != "Bearer at-siwc" ||
		r.GetHeaders()["user-agent"] != UserAgent || r.GetHeaders()["originator"] != Originator {
		t.Fatalf("request = %s %v", r.GetUrl(), r.GetHeaders())
	}
	if _, ok := r.GetHeaders()["chatgpt-account-id"]; ok {
		t.Fatal("Sign in with ChatGPT sends no ChatGPT account header")
	}
	if _, ok := r.GetHeaders()["openai-beta"]; ok {
		t.Fatal("client openai-beta forwarded")
	}
	sets, dels := patchMap(r)
	if sets["store"] != "false" || sets["input"] != "[]" {
		t.Fatalf("sets = %v", sets)
	}
	if _, ok := sets["instructions"]; ok {
		t.Fatal("instructions are only required by the Codex backend")
	}
	if !slices.Equal(dels, sorted(unsupportedSIWC)) || !slices.Contains(dels, "previous_response_id") {
		t.Fatalf("deletes = %v", dels)
	}
}

func TestBuildUpstreamRequestWebSocket(t *testing.T) {
	h := startPlugin(t, NewWithEndpoints(DefaultEndpoints))
	for _, tc := range []struct {
		typ, creds, url string
	}{
		{TypeDevice, deviceCreds, "wss://chatgpt.com/backend-api/codex/responses"},
		{TypeSIWC, siwcCreds, "wss://api.openai.com/v1/responses"},
	} {
		r, err := h.Platform.BuildUpstreamRequest(context.Background(), &pluginv1.BuildUpstreamRequestRequest{
			Meta:           &pluginv1.RequestMeta{Protocol: ProtocolResponsesWS, Model: "gpt-5.4"},
			Account:        account(tc.typ, tc.creds),
			Fields:         map[string]string{"model": `"gpt-5.4"`, FieldHasInstructions: "0", FieldStringInput: `"x"`},
			InboundHeaders: clientHeaders,
		})
		if err != nil {
			t.Fatal(err)
		}
		hd := r.GetHeaders()
		if r.GetMethod() != "GET" || r.GetUrl() != tc.url || hd["openai-beta"] != WebSocketBeta || hd["user-agent"] != UserAgent ||
			hd["originator"] != Originator || hd["content-type"] != "" || hd["accept"] != "" {
			t.Fatalf("%s: %s %s %v", tc.typ, r.GetMethod(), r.GetUrl(), hd)
		}
		if (hd["chatgpt-account-id"] == "acct-1") != (tc.typ == TypeDevice) {
			t.Fatalf("%s account header = %q", tc.typ, hd["chatgpt-account-id"])
		}
		// Every turn's message gets the HTTP patches (CONTRACTS §83.6),
		// without stream fields and keeping previous_response_id.
		sets, dels := patchMap(r)
		if sets["store"] != "false" || len(sets["input"]) == 0 {
			t.Fatalf("%s ws sets = %v", tc.typ, sets)
		}
		if _, ok := sets["instructions"]; ok != (tc.typ == TypeDevice) {
			t.Fatalf("%s ws instructions = %v", tc.typ, sets)
		}
		for path := range sets {
			if strings.HasPrefix(path, "stream") {
				t.Fatalf("%s ws patches a stream field: %v", tc.typ, sets)
			}
		}
		for _, d := range dels {
			if strings.HasPrefix(d, "stream") || d == "previous_response_id" {
				t.Fatalf("%s ws deletes %s: %v", tc.typ, d, dels)
			}
		}
		want := unsupportedSIWC
		if tc.typ == TypeDevice {
			want = unsupportedDevice
		}
		if len(dels) != len(want)-countHTTPOnly(want) || !slices.Contains(dels, "temperature") {
			t.Fatalf("%s ws deletes = %v", tc.typ, dels)
		}
		// The same body over HTTP deletes those fields too.
		r, err = h.Platform.BuildUpstreamRequest(context.Background(), &pluginv1.BuildUpstreamRequestRequest{
			Meta: &pluginv1.RequestMeta{Protocol: ProtocolResponses, Model: "gpt-5.4"}, Account: account(tc.typ, tc.creds),
		})
		if err != nil {
			t.Fatal(err)
		}
		if _, httpDels := patchMap(r); !slices.Equal(httpDels, sorted(want)) {
			t.Fatalf("%s http deletes = %v", tc.typ, httpDels)
		}
	}
	// A test server root keeps its scheme family.
	p := NewWithEndpoints(testEndpoints("http://127.0.0.1:9"))
	r, err := p.BuildUpstreamRequest(context.Background(), &pluginv1.BuildUpstreamRequestRequest{
		Meta: &pluginv1.RequestMeta{Protocol: ProtocolResponsesWS}, Account: account(TypeSIWC, siwcCreds),
	})
	if err != nil || r.GetUrl() != "ws://127.0.0.1:9/v1/responses" {
		t.Fatalf("ws url = %v %v", r.GetUrl(), err)
	}
}

func TestBuildUpstreamRequestErrors(t *testing.T) {
	p := New()
	for _, tc := range []struct {
		name string
		meta *pluginv1.RequestMeta
		acc  *pluginv1.Account
		code codes.Code
	}{
		{"chat protocol", &pluginv1.RequestMeta{Protocol: "openai.chat"}, account(TypeDevice, deviceCreds), codes.InvalidArgument},
		{"embeddings", &pluginv1.RequestMeta{Protocol: "openai.embeddings"}, account(TypeSIWC, siwcCreds), codes.InvalidArgument},
		{"foreign type", &pluginv1.RequestMeta{Protocol: ProtocolResponses}, account("apikey", deviceCreds), codes.FailedPrecondition},
		{"no token", &pluginv1.RequestMeta{Protocol: ProtocolResponses}, account(TypeDevice, `{"refresh_token":"x"}`), codes.FailedPrecondition},
		{"bad json", &pluginv1.RequestMeta{Protocol: ProtocolResponses}, account(TypeDevice, `{`), codes.InvalidArgument},
	} {
		_, err := p.BuildUpstreamRequest(context.Background(), &pluginv1.BuildUpstreamRequestRequest{Meta: tc.meta, Account: tc.acc})
		if status.Code(err) != tc.code {
			t.Errorf("%s: %v, want %v", tc.name, err, tc.code)
		}
	}
}

func TestBuildTestRequest(t *testing.T) {
	h := startPlugin(t, NewWithEndpoints(DefaultEndpoints))
	for _, tc := range []struct {
		typ, creds, url, model, wantModel string
	}{
		{TypeDevice, deviceCreds, "https://chatgpt.com/backend-api/codex/responses", "", DefaultTestModel},
		{TypeSIWC, siwcCreds, "https://api.openai.com/v1/responses", "gpt-5.4", "gpt-5.4"},
	} {
		r, err := h.Platform.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{Account: account(tc.typ, tc.creds), Model: tc.model})
		if err != nil {
			t.Fatal(err)
		}
		if r.GetMethod() != "POST" || r.GetUrl() != tc.url || r.GetModel() != tc.wantModel || r.GetUsageProtocol() != ProtocolResponses ||
			r.GetHeaders()["user-agent"] != UserAgent || r.GetHeaders()["accept"] != "text/event-stream" {
			t.Fatalf("%s: %v", tc.typ, r)
		}
		var body map[string]any
		mustJSON(t, []byte(r.GetBodyJson()), &body)
		if body["model"] != tc.wantModel || body["store"] != false || body["stream"] != true {
			t.Fatalf("%s body = %s", tc.typ, r.GetBodyJson())
		}
		if in, _ := body["input"].([]any); len(in) != 1 {
			t.Fatalf("%s input = %s", tc.typ, r.GetBodyJson())
		}
		if _, ok := body["instructions"]; ok != (tc.typ == TypeDevice) {
			t.Fatalf("%s instructions = %s", tc.typ, r.GetBodyJson())
		}
	}
}

func TestBuildModelsRequest(t *testing.T) {
	h := startPlugin(t, NewWithEndpoints(DefaultEndpoints))
	r, err := h.Platform.BuildModelsRequest(context.Background(), &pluginv1.BuildModelsRequestRequest{Account: account(TypeSIWC, siwcCreds)})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetMethod() != "GET" || r.GetUrl() != "https://api.openai.com/v1/models" || r.GetHeaders()["authorization"] != "Bearer at-siwc" ||
		r.GetIdsPath() != SIWCModelsPath {
		t.Fatalf("models request = %v", r)
	}
	if _, err := h.Platform.BuildModelsRequest(context.Background(), &pluginv1.BuildModelsRequestRequest{Account: account(TypeDevice, deviceCreds)}); status.Code(err) != codes.Unimplemented {
		t.Fatalf("device models: %v", err)
	}
}

// The ids path picks the listed slugs of the documented answer.
func TestSIWCModelsPath(t *testing.T) {
	body := `{"models":[{"slug":"gpt-5.4","display_name":"GPT-5.4","visibility":"list"},{"slug":"internal-x","visibility":"hide"},{"slug":"gpt-5.3-codex","visibility":"list"}]}`
	var got []string
	for _, v := range gjson.Get(body, SIWCModelsPath).Array() {
		got = append(got, v.String())
	}
	if !slices.Equal(got, []string{"gpt-5.4", "gpt-5.3-codex"}) {
		t.Fatalf("slugs = %v", got)
	}
}

func TestExecuteForwardsOnce(t *testing.T) {
	var stage atomic.Int32
	fh := pluginsdktest.NewFakeHost()
	fh.ForwardUpstreamFunc = func(_ context.Context, in *pluginv1.ForwardUpstreamRequest) (*pluginv1.ForwardUpstreamResponse, error) {
		if !stage.CompareAndSwap(0, 1) {
			t.Error("forwarded more than once")
		}
		r := in.GetRequest()
		if r.GetUrl() != "https://api.openai.com/v1/responses" || r.GetHeaders()["authorization"] != "Bearer at-siwc" {
			t.Errorf("request = %v", r)
		}
		return &pluginv1.ForwardUpstreamResponse{}, nil
	}
	fh.RecordUsageFunc = func(_ context.Context, in *pluginv1.RecordUsageRequest) (*pluginv1.ExecutionReceipt, error) {
		if !stage.CompareAndSwap(1, 2) {
			t.Error("usage recorded out of order")
		}
		return &pluginv1.ExecutionReceipt{}, nil
	}
	h := pluginsdktest.Start(t, New(), pluginsdktest.Options{Host: fh, SDK: []pluginsdk.Option{pluginsdk.WithInfo("codex", Version)}})
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	r, err := h.Platform.Execute(ctx, &pluginv1.ExecuteRequest{ExecutionToken: "req-1", Request: &pluginv1.BuildUpstreamRequestRequest{
		Meta: &pluginv1.RequestMeta{Protocol: ProtocolResponses, Model: "gpt-5.4", Stream: true}, Account: account(TypeSIWC, siwcCreds),
	}})
	if err != nil || r.GetClassification() != nil || stage.Load() != 2 {
		t.Fatalf("Execute: stage=%d %v %v", stage.Load(), r, err)
	}
}

func TestValidateCredentials(t *testing.T) {
	h := startPlugin(t, NewWithEndpoints(DefaultEndpoints))
	validate := func(typ, creds string) *pluginv1.ValidateCredentialsResponse {
		t.Helper()
		r, err := h.Platform.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: typ, CredentialsJson: creds})
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	// Identity fields come from the id_token; expires_at becomes a number.
	tok := idToken("me@example.com", "acct-7", "plus")
	r := validate(TypeDevice, `{"access_token":" at ","id_token":"`+tok+`","expires_at":"1800000123"}`)
	if len(r.GetErrors()) != 0 {
		t.Fatalf("errors = %v", r.GetErrors())
	}
	var norm map[string]any
	mustJSON(t, []byte(r.GetNormalizedCredentialsJson()), &norm)
	if norm["access_token"] != "at" || norm["email"] != "me@example.com" || norm["chatgpt_account_id"] != "acct-7" ||
		norm["plan_type"] != "plus" || norm["expires_at"] != float64(1800000123) {
		t.Fatalf("normalized = %v", norm)
	}
	// Already normal: nothing to rewrite. Present fields are not overwritten.
	r = validate(TypeSIWC, siwcCreds)
	if len(r.GetErrors()) != 0 || r.GetNormalizedCredentialsJson() != "" {
		t.Fatalf("siwc = %v", r)
	}
	r = validate(TypeSIWC, `{"access_token":"at","client_id":"oaiapp_1","email":"kept@example.com","id_token":"`+tok+`"}`)
	norm = nil
	mustJSON(t, []byte(r.GetNormalizedCredentialsJson()), &norm)
	if norm["email"] != "kept@example.com" || norm["chatgpt_account_id"] != nil {
		t.Fatalf("siwc normalized = %v", norm)
	}
	for _, tc := range []struct {
		typ, creds, field, code string
	}{
		{"apikey", `{"access_token":"x"}`, "account_type", "unsupported"},
		{TypeDevice, `{}`, "access_token", "required"},
		{TypeDevice, `{"access_token":"  "}`, "access_token", "required"},
		{TypeDevice, `{"access_token":5}`, "access_token", "pattern"},
		{TypeDevice, `[1]`, "access_token", "invalid"},
		{TypeDevice, `{"access_token":"x","expires_at":"soon"}`, "expires_at", "pattern"},
		{TypeDevice, `{"access_token":"x","refresh_token":1}`, "refresh_token", "pattern"},
		{TypeSIWC, `{"access_token":"x","client_id":"oaiapp_1","ext_agent_host_id":"host-1"}`, "ext_agent_host_id", "pattern"},
		{TypeSIWC, `{"access_token":"x"}`, "client_id", "required"},
	} {
		r := validate(tc.typ, tc.creds)
		if len(r.GetErrors()) != 1 || r.GetErrors()[0].GetField() != tc.field || r.GetErrors()[0].GetCode() != tc.code {
			t.Errorf("%s %s: errors = %v, want %s/%s", tc.typ, tc.creds, r.GetErrors(), tc.field, tc.code)
		}
	}
}

func TestIdentity(t *testing.T) {
	// Account id and plan fall back to the access token's auth claim.
	at := fakeJWT(map[string]any{"exp": 1800003600, authClaim: map[string]any{"chatgpt_account_id": "acct-at", "chatgpt_plan_type": "pro"}})
	id := parseIdentity(fakeJWT(map[string]any{"email": "a@b.c"}), at)
	if id.Email != "a@b.c" || id.AccountID != "acct-at" || id.PlanType != "pro" {
		t.Fatalf("identity = %+v", id)
	}
	if tokenExpiry(at) != 1800003600 || tokenExpiry("opaque") != 0 {
		t.Fatal("token expiry")
	}
	if parseIdentity("not.a.jwt!", "x") != (identity{}) {
		t.Fatal("garbage token must yield nothing")
	}
}

func countHTTPOnly(list []string) int {
	n := 0
	for _, f := range list {
		if httpOnlyUnsupported[f] {
			n++
		}
	}
	return n
}

// System input items become developer items for both account types, over
// HTTP and in WebSocket messages; the patch paths come from the roles field
// as the core reads it (gjson over the body) and apply as the core applies
// them (sjson).
func TestSystemItemsBecomeDeveloper(t *testing.T) {
	h := startPlugin(t, NewWithEndpoints(DefaultEndpoints))
	body := `{"model":"gpt-5.4","input":[{"role":"system","content":"be brief"},{"type":"function_call","call_id":"c","name":"f","arguments":"{}"},` +
		`{"role":"user","content":"hi"},{"type":"message","role":"system","content":[{"type":"input_text","text":"x"}]},{"role":"developer","content":"d"},"odd",{"role":{"nested":"system"}}]}`
	roles := gjson.Get(body, FieldSystemRoles).Raw
	if roles != `[["system"],[],[],["system"],[],[],[]]` {
		t.Fatalf("roles field = %s", roles)
	}
	for _, typ := range []string{TypeDevice, TypeSIWC} {
		for _, proto := range []string{ProtocolResponses, ProtocolResponsesWS} {
			creds := deviceCreds
			if typ == TypeSIWC {
				creds = siwcCreds
			}
			r, err := h.Platform.BuildUpstreamRequest(context.Background(), &pluginv1.BuildUpstreamRequestRequest{
				Meta: &pluginv1.RequestMeta{Protocol: proto, Model: "gpt-5.4"}, Account: account(typ, creds),
				Fields: map[string]string{"model": `"gpt-5.4"`, FieldHasInstructions: "1", FieldSystemRoles: roles},
			})
			if err != nil {
				t.Fatal(err)
			}
			sets, _ := patchMap(r)
			if sets["input.0.role"] != `"developer"` || sets["input.3.role"] != `"developer"` {
				t.Fatalf("%s %s sets = %v", typ, proto, sets)
			}
			out := body
			for _, p := range r.GetPatches() {
				if p.GetOp() == pluginv1.BodyPatch_OP_SET {
					out, err = sjson.SetRaw(out, p.GetPath(), p.GetValueJson())
				} else {
					out, err = sjson.Delete(out, p.GetPath())
				}
				if err != nil {
					t.Fatal(err)
				}
			}
			got := gjson.Get(out, "input.#.role").Raw
			if got != `["developer","user","developer","developer",{"nested":"system"}]` || gjson.Get(out, "input.1.type").String() != "function_call" ||
				gjson.Get(out, "input.5").String() != "odd" || gjson.Get(out, "input.0.content").String() != "be brief" {
				t.Fatalf("%s %s patched input = %s", typ, proto, gjson.Get(out, "input").Raw)
			}
		}
	}
	// Absent (string or missing input), malformed or system-free fields
	// patch no role.
	for _, raw := range []string{"", "[]", `[[],[]]`, `{}`, `"system"`, `[["user"]]`} {
		if ps := systemToDeveloper(raw); len(ps) != 0 {
			t.Errorf("systemToDeveloper(%s) = %v", raw, ps)
		}
	}
	for _, b := range []string{`{"input":"system"}`, `{}`, `{"input":{"role":"system"}}`} {
		if ps := systemToDeveloper(gjson.Get(b, FieldSystemRoles).Raw); len(ps) != 0 {
			t.Errorf("%s: %v", b, ps)
		}
	}
	// At most maxRoleRewrites patches.
	many := "[" + strings.TrimSuffix(strings.Repeat(`["system"],`, maxRoleRewrites+10), ",") + "]"
	if ps := systemToDeveloper(many); len(ps) != maxRoleRewrites || ps[len(ps)-1].GetPath() != fmt.Sprintf("input.%d.role", maxRoleRewrites-1) {
		t.Fatalf("capped patches = %d", len(ps))
	}
}
