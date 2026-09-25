package relay

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

func start(t *testing.T) *pluginsdktest.Harness {
	t.Helper()
	return pluginsdktest.Start(t, New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithInfo("relay", "0.1.1")}})
}

func TestCapabilities(t *testing.T) {
	h := start(t)
	if got := strings.Join(h.Info.GetCapabilities(), ","); got != "platform.adapter.v1" {
		t.Fatalf("capabilities = %s", got)
	}
}

func TestValidateCredentials(t *testing.T) {
	h := start(t)
	ctx := context.Background()
	cases := []struct {
		name       string
		typ        string
		creds      string
		settings   string
		wantFields []string
		wantCreds  string
		wantSets   string
	}{
		{name: "ok", typ: "relay_key",
			creds:     `{"api_key":"  sk-relay-abcdef  "}`,
			settings:  `{"base_url":"https://relay.example.com/v1/"}`,
			wantCreds: `{"api_key":"sk-relay-abcdef"}`,
			wantSets:  `{"base_url":"https://relay.example.com"}`},
		{name: "all in credentials", typ: "relay_key",
			creds:     `{"api_key":"sk-relay-abcdef","base_url":"http://mock-upstream:8080"}`,
			wantCreds: `{"api_key":"sk-relay-abcdef","base_url":"http://mock-upstream:8080"}`},
		// Model mapping moved to the core account (CONTRACTS §18). Old
		// accounts may still carry a model_mapping key of any shape: it is
		// never validated and passes through untouched.
		{name: "legacy model_mapping passed through", typ: "relay_key",
			creds:     `{"api_key":"sk-relay-abcdef","base_url":"https://r.example.com"}`,
			settings:  `{"model_mapping":{"a":1}}`,
			wantCreds: `{"api_key":"sk-relay-abcdef","base_url":"https://r.example.com"}`,
			wantSets:  `{"model_mapping":{"a":1}}`},
		{name: "missing base url", typ: "relay_key", creds: `{"api_key":"sk-relay-abcdef"}`, wantFields: []string{"base_url"}},
		{name: "empty base url", typ: "relay_key", creds: `{"api_key":"sk-relay-abcdef","base_url":"  "}`, wantFields: []string{"base_url"}},
		{name: "bad base url", typ: "relay_key", creds: `{"api_key":"sk-relay-abcdef","base_url":"ftp://x"}`, wantFields: []string{"base_url"}},
		{name: "missing key", typ: "relay_key", creds: `{"base_url":"https://r.example.com"}`, wantFields: []string{"api_key"}},
		{name: "nothing", typ: "relay_key", creds: `{}`, wantFields: []string{"base_url", "api_key"}},
		{name: "wrong type", typ: "apikey", creds: `{"api_key":"sk-relay-abcdef","base_url":"https://r.example.com"}`, wantFields: []string{"account_type"}},
		{name: "invalid json", typ: "relay_key", creds: `[1]`, wantFields: []string{""}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r, err := h.Platform.ValidateCredentials(ctx, &pluginv1.ValidateCredentialsRequest{AccountType: tc.typ, CredentialsJson: tc.creds, SettingsJson: tc.settings})
			if err != nil {
				t.Fatal(err)
			}
			var fields []string
			for _, e := range r.GetErrors() {
				fields = append(fields, e.GetField())
				if !strings.Contains(e.GetMessage(), "/") {
					t.Errorf("message should be bilingual: %q", e.GetMessage())
				}
			}
			if strings.Join(fields, ",") != strings.Join(tc.wantFields, ",") {
				t.Fatalf("errors = %v, want %v", r.GetErrors(), tc.wantFields)
			}
			if len(tc.wantFields) > 0 {
				return
			}
			assertJSON(t, r.GetNormalizedCredentialsJson(), tc.wantCreds)
			assertJSON(t, r.GetNormalizedSettingsJson(), tc.wantSets)
		})
	}
}

func assertJSON(t *testing.T, got, want string) {
	t.Helper()
	if want == "" {
		if got != "" {
			t.Fatalf("got %s, want empty", got)
		}
		return
	}
	var g, w any
	if err := json.Unmarshal([]byte(got), &g); err != nil {
		t.Fatalf("bad json %q: %v", got, err)
	}
	_ = json.Unmarshal([]byte(want), &w)
	gb, _ := json.Marshal(g)
	wb, _ := json.Marshal(w)
	if string(gb) != string(wb) {
		t.Fatalf("got %s, want %s", gb, wb)
	}
}

func account(creds, settings string) *pluginv1.Account {
	return &pluginv1.Account{Id: 7, Platform: "anthropic", Type: AccountTypeRelayKey, CredentialsJson: creds, SettingsJson: settings}
}

func TestBuildUpstreamRequest(t *testing.T) {
	h := start(t)
	ctx := context.Background()

	r, err := h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolMessages, ClientProtocol: ProtocolMessages, Model: "claude-sonnet-5", Stream: true},
		Account: account(`{"api_key":"sk-relay-1"}`, `{"base_url":"https://relay.example.com/"}`),
		Fields:  map[string]string{"model": `"claude-sonnet-5"`},
		InboundHeaders: map[string]string{
			"anthropic-version": "2024-01-01", "anthropic-beta": "prompt-caching-2024-07-31", "user-agent": "claude-cli/2.0",
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetMethod() != "POST" || r.GetUrl() != "https://relay.example.com/v1/messages" {
		t.Fatalf("method/url = %s %s", r.GetMethod(), r.GetUrl())
	}
	hd := r.GetHeaders()
	if hd["x-api-key"] != "sk-relay-1" || hd["anthropic-version"] != "2024-01-01" || hd["anthropic-beta"] != "prompt-caching-2024-07-31" || hd["content-type"] != "application/json" {
		t.Fatalf("headers = %v", hd)
	}
	if _, ok := hd["user-agent"]; ok {
		t.Fatal("only anthropic-version and anthropic-beta are forwarded")
	}
	if len(r.GetPatches()) != 0 || r.GetUpstreamModel() != "claude-sonnet-5" {
		t.Fatalf("patches = %v upstream = %s", r.GetPatches(), r.GetUpstreamModel())
	}

	// count_tokens, default version. A legacy model_mapping in the
	// credentials is ignored: the core maps the model before calling the
	// plugin, so the model is sent unchanged and no patch is emitted.
	r, err = h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolCountTokens, Model: "claude-opus-5"},
		Account: account(`{"api_key":"sk-relay-1","base_url":"http://mock-upstream:8080/v1","model_mapping":{"claude-opus-*":"claude-sonnet-5"}}`, ""),
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != "http://mock-upstream:8080/v1/messages/count_tokens" || r.GetHeaders()["anthropic-version"] != DefaultAPIVersion {
		t.Fatalf("url/headers = %s %v", r.GetUrl(), r.GetHeaders())
	}
	if len(r.GetPatches()) != 0 || r.GetUpstreamModel() != "claude-opus-5" {
		t.Fatalf("patches = %v upstream = %s", r.GetPatches(), r.GetUpstreamModel())
	}

	// fields["model"] wins over meta.model as the upstream model.
	r, err = h.Platform.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta:    &pluginv1.RequestMeta{Protocol: ProtocolMessages, Model: "claude-opus-5"},
		Account: account(`{"api_key":"sk-relay-1","base_url":"https://r.example.com"}`, ""),
		Fields:  map[string]string{"model": `"claude-sonnet-5"`},
	})
	if err != nil || len(r.GetPatches()) != 0 || r.GetUpstreamModel() != "claude-sonnet-5" {
		t.Fatalf("fields model: %v %v", r, err)
	}

	for name, in := range map[string]*pluginv1.BuildUpstreamRequestRequest{
		"missing base_url": {Meta: &pluginv1.RequestMeta{Protocol: ProtocolMessages}, Account: account(`{"api_key":"sk-relay-1"}`, "")},
		"missing api_key":  {Meta: &pluginv1.RequestMeta{Protocol: ProtocolMessages}, Account: account(`{"base_url":"https://r.example.com"}`, "")},
		"unknown protocol": {Meta: &pluginv1.RequestMeta{Protocol: "openai.chat"}, Account: account(`{"api_key":"sk-relay-1","base_url":"https://r.example.com"}`, "")},
		"empty protocol":   {Meta: &pluginv1.RequestMeta{}, Account: account(`{"api_key":"sk-relay-1","base_url":"https://r.example.com"}`, "")},
		"foreign type": {Meta: &pluginv1.RequestMeta{Protocol: ProtocolMessages},
			Account: &pluginv1.Account{Type: "apikey", CredentialsJson: `{"api_key":"sk-relay-1","base_url":"https://r.example.com"}`}},
	} {
		if _, err := h.Platform.BuildUpstreamRequest(ctx, in); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

func TestBuildTestRequest(t *testing.T) {
	h := start(t)
	// A legacy model_mapping in the settings is ignored: in.model is used
	// as-is, and the plugin default model when it is empty.
	r, err := h.Platform.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{
		Account: account(`{"api_key":"sk-relay-1"}`, `{"base_url":"https://relay.example.com","model_mapping":{"claude-haiku-4-5":"mapped"}}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != "https://relay.example.com/v1/messages" || r.GetHeaders()["x-api-key"] != "sk-relay-1" {
		t.Fatalf("resp = %v", r)
	}
	var body struct {
		Model     string `json:"model"`
		MaxTokens int    `json:"max_tokens"`
	}
	if err := json.Unmarshal([]byte(r.GetBodyJson()), &body); err != nil || body.Model != DefaultTestModel || body.MaxTokens != 1 {
		t.Fatalf("body = %s", r.GetBodyJson())
	}

	r, err = h.Platform.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{
		Account: account(`{"api_key":"sk-relay-1"}`, `{"base_url":"https://relay.example.com"}`), Model: "  claude-sonnet-5  ",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal([]byte(r.GetBodyJson()), &body); err != nil || body.Model != "claude-sonnet-5" {
		t.Fatalf("body = %s", r.GetBodyJson())
	}
}

func TestClassifyError(t *testing.T) {
	now := time.Date(2026, 9, 24, 12, 0, 0, 0, time.UTC)
	p := New()
	p.now = func() time.Time { return now }
	cls := func(status int32, headers map[string]string, body string) *pluginv1.ClassifyErrorResponse {
		r, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: status, Headers: headers, BodyPrefix: []byte(body)})
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	const (
		ret      = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
		failover = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		cool     = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
		disable  = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
	)
	if r := cls(400, nil, `{"type":"error","error":{"type":"invalid_request_error","message":"bad"}}`); r.GetAction() != ret || r.GetClientMessage() != "bad" {
		t.Errorf("400: %v", r)
	}
	if r := cls(401, nil, ""); r.GetAction() != failover || r.GetAccountEffect() != disable || r.GetClientErrorType() != "authentication_error" {
		t.Errorf("401: %v", r)
	}
	r := cls(429, map[string]string{"retry-after": "2"}, "")
	if r.GetAction() != failover || r.GetAccountEffect() != cool || time.Unix(r.GetCooldownUntilUnix(), 0).Sub(now) != 2*time.Second {
		t.Errorf("429: %v", r)
	}
	if r := cls(529, nil, ""); r.GetAccountEffect() != cool || r.GetClientErrorType() != "overloaded_error" {
		t.Errorf("529: %v", r)
	}
	if r := cls(0, nil, ""); r.GetAction() != failover || r.GetClientStatus() != 502 {
		t.Errorf("transport: %v", r)
	}
}
