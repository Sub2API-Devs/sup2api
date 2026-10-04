package account

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
	"unicode/utf8"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// anthropicUsage mirrors the JSON usage rules of the built-in anthropic
// platform (non-streaming responses).
var anthropicUsage = manifest.UsageRules{Semantics: "exclusive",
	JSON: &manifest.UsageMap{Map: map[string]string{
		manifest.UsageModel:               "model",
		manifest.UsageInputTokens:         "usage.input_tokens",
		manifest.UsageOutputTokens:        "usage.output_tokens",
		manifest.UsageCacheReadTokens:     "usage.cache_read_input_tokens",
		manifest.UsageCacheCreationTokens: "usage.cache_creation_input_tokens",
		manifest.UsageCacheCreation1h:     "usage.cache_creation.ephemeral_1h_input_tokens",
	}}}

// testResponse is the body of a successful fake test call.
const testResponse = `{"model":"claude-x","usage":{"input_tokens":5,"output_tokens":7,` +
	`"cache_read_input_tokens":2,"cache_creation_input_tokens":9,"cache_creation":{"ephemeral_1h_input_tokens":4}}}`

// setPlatformUsage installs usage rules on a platform of the fake generation.
func (e *env) setPlatformUsage(id string, rules manifest.UsageRules) {
	e.t.Helper()
	for i := range e.gen.plats {
		if e.gen.plats[i].Platform.ID == id {
			e.gen.plats[i].Platform.Usage = rules
			return
		}
	}
	e.t.Fatalf("platform %s is not in the fake generation", id)
}

// setTypeUsage overrides the usage rules of the anthropic/apikey type for one
// protocol (nil rules clear the override).
func (e *env) setTypeUsage(protocol string, rules *manifest.UsageRules) {
	e.t.Helper()
	ap := &e.gen.types[0].Type.Platforms[0]
	if rules == nil {
		ap.Usage = nil
		return
	}
	ap.Usage = map[string]manifest.UsageRules{protocol: *rules}
}

// mkAccount creates an anthropic/apikey account named after its key.
func (e *env) mkAccount(key string) int64 {
	e.t.Helper()
	code, out := e.do("POST", "/accounts", map[string]any{"name": key, "plugin_key": "anthropic", "type": "apikey",
		"credentials": map[string]any{"api_key": key}})
	if code != 201 {
		e.t.Fatalf("create: %d %v", code, out)
	}
	return int64(out["data"].(map[string]any)["id"].(float64))
}

// testUpstream answers the fake test requests: the response body with usage
// for a good key, 401 for anything else and an oversized body on /long.
func testUpstream(t *testing.T) *httptest.Server {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("x-api-key") != "sk-good-key-123" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(401)
			_, _ = w.Write([]byte(`{"error":{"type":"authentication_error","message":"invalid x-api-key"}}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/long" {
			// 12 KiB of multi-byte text: more than the host reads.
			_, _ = w.Write([]byte(strings.Repeat("上游响应片段", 700)))
			return
		}
		_, _ = w.Write([]byte(testResponse))
	}))
	t.Cleanup(srv.Close)
	return srv
}

// TestAccountTestResultDetails covers the visible test result: the model and
// upstream address reached, the response body, and the token usage read with
// the platform (or account type) usage rules.
func TestAccountTestResultDetails(t *testing.T) {
	e := setup(t)
	up := testUpstream(t)
	id := e.mkAccount("sk-good-key-123")

	// A Gemini style key in the query must not come back in the result.
	e.plat.testURL = up.URL + "/v1/messages?key=secret-value&alt=json"
	e.plat.usageProtocol = "anthropic.messages"
	e.setPlatformUsage("anthropic", anthropicUsage)

	code, raw := e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), map[string]any{"model": "claude-x"})
	if code != 200 {
		t.Fatalf("test: %d %s", code, raw)
	}
	if bytes.Contains(raw, []byte("secret-value")) {
		t.Fatalf("query leaked into the result: %s", raw)
	}
	d := gjson.GetBytes(raw, "data")
	if !d.Get("ok").Bool() || d.Get("status").Int() != 200 || d.Get("message").String() != "" {
		t.Fatalf("result: %s", d)
	}
	if d.Get("model").String() != "claude-x" || d.Get("upstream").String() != up.URL+"/v1/messages" {
		t.Fatalf("model/upstream: %s", d)
	}
	if !strings.Contains(d.Get("body").String(), `"input_tokens":5`) {
		t.Fatalf("body: %s", d.Get("body"))
	}
	// cache_creation_tokens is the total cache write (5 minute + 1 hour).
	u := d.Get("usage")
	if u.Get("input_tokens").Int() != 5 || u.Get("output_tokens").Int() != 7 ||
		u.Get("cache_read_tokens").Int() != 2 || u.Get("cache_creation_tokens").Int() != 9 {
		t.Fatalf("usage: %s", u)
	}

	// The account type's per-protocol override wins over the platform rules.
	e.setTypeUsage("anthropic.messages", &manifest.UsageRules{JSON: &manifest.UsageMap{
		Map: map[string]string{manifest.UsageInputTokens: "usage.output_tokens"}}})
	_, raw = e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), nil)
	u = gjson.GetBytes(raw, "data.usage")
	if u.Get("input_tokens").Int() != 7 || u.Get("output_tokens").Exists() || u.Get("cache_read_tokens").Exists() {
		t.Fatalf("type override: %s", u)
	}
	e.setTypeUsage("anthropic.messages", nil)

	// No model asked for: the model the plugin reports is what was tested.
	e.plat.testModel = "claude-haiku-4-5"
	_, raw = e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), nil)
	if got := gjson.GetBytes(raw, "data.model").String(); got != "claude-haiku-4-5" {
		t.Fatalf("plugin model: %q", got)
	}
	e.plat.testModel = ""

	// No usage protocol, or one no platform declares: no usage, test still ok.
	for _, proto := range []string{"", "ghost.embed"} {
		e.plat.usageProtocol = proto
		_, raw = e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), nil)
		d = gjson.GetBytes(raw, "data")
		if !d.Get("ok").Bool() || d.Get("usage").Exists() {
			t.Fatalf("usage_protocol %q: %s", proto, d)
		}
	}
	e.plat.usageProtocol = "anthropic.messages"

	// An oversized body is cut to 4 KiB and stays valid UTF-8; it is no
	// longer JSON, so no usage is reported.
	e.plat.testURL = up.URL + "/long"
	_, raw = e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), nil)
	d = gjson.GetBytes(raw, "data")
	body := d.Get("body").String()
	if !d.Get("ok").Bool() || d.Get("usage").Exists() {
		t.Fatalf("long body result: %s", d)
	}
	if !utf8.ValidString(body) || !strings.HasSuffix(body, "…") || len(body) > maxTestBodyOut+len("…") ||
		len(body) < maxTestBodyOut-8 {
		t.Fatalf("truncation: %d bytes, valid=%v", len(body), utf8.ValidString(body))
	}
}

// TestAccountTestFailureIsClassifiedButHarmless checks that a failing test
// reports the plugin's reason and the account effect it would have in the
// gateway, without ever applying it.
func TestAccountTestFailureIsClassifiedButHarmless(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	up := testUpstream(t)
	e.plat.testURL = up.URL + "/v1/messages"
	e.plat.usageProtocol = "anthropic.messages"
	e.setPlatformUsage("anthropic", anthropicUsage)
	id := e.mkAccount("sk-other-key-1")

	for _, tc := range []struct {
		effect pluginv1.ClassifyErrorResponse_AccountEffect
		want   string
	}{
		{pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, "disable"},
		{pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, "cooldown"},
		{pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, ""},
	} {
		e.plat.classify = &pluginv1.ClassifyErrorResponse{AccountEffect: tc.effect,
			Reason: "upstream rejected credentials (401)", CooldownUntilUnix: 1 << 40}
		_, raw := e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), nil)
		d := gjson.GetBytes(raw, "data")
		if d.Get("ok").Bool() || d.Get("status").Int() != 401 || d.Get("usage").Exists() {
			t.Fatalf("%s: %s", tc.want, d)
		}
		if !strings.Contains(d.Get("body").String(), "invalid x-api-key") ||
			!strings.Contains(d.Get("message").String(), "invalid x-api-key") {
			t.Fatalf("%s body/message: %s", tc.want, d)
		}
		if d.Get("reason").String() != "upstream rejected credentials (401)" || d.Get("effect").String() != tc.want {
			t.Fatalf("%s classification: %s", tc.want, d)
		}
	}
	// What the plugin was asked: the status, lower-cased headers and a body
	// prefix (as the gateway does).
	last := e.plat.classes[len(e.plat.classes)-1]
	if last.GetStatus() != 401 || last.GetHeaders()["content-type"] != "application/json" ||
		!bytes.Contains(last.GetBodyPrefix(), []byte("invalid x-api-key")) || last.GetTransportError() != "" {
		t.Fatalf("classify request: %+v", last)
	}

	// The account is untouched: still active, no cooldown, no status event.
	var status, reason string
	if err := e.db.Pool.QueryRow(ctx,
		`SELECT status, status_reason FROM accounts WHERE id = $1`, id).Scan(&status, &reason); err != nil {
		t.Fatal(err)
	}
	if status != "active" || reason != "" {
		t.Fatalf("account changed by a test: %s %q", status, reason)
	}
	if e.mr.Exists(cooldownKey(id)) {
		t.Fatal("test put the account into cooldown")
	}
	for _, ev := range e.eventTypes() {
		if ev == "account.status_changed" {
			t.Fatal("test emitted account.status_changed")
		}
	}

	// A plugin without a usable ClassifyError leaves reason and effect empty.
	e.plat.classify = nil
	_, raw := e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), nil)
	d := gjson.GetBytes(raw, "data")
	if d.Get("reason").Exists() || d.Get("effect").Exists() {
		t.Fatalf("classification without a plugin answer: %s", d)
	}

	// A transport failure is reported with the credential-free address, and
	// the plugin classifying it is given the same text.
	e.plat.classify = &pluginv1.ClassifyErrorResponse{
		AccountEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, Reason: "transport error"}
	up.Close()
	e.plat.testURL = up.URL + "/v1/messages?key=secret-value"
	_, raw = e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), nil)
	d = gjson.GetBytes(raw, "data")
	if bytes.Contains(raw, []byte("secret-value")) {
		t.Fatalf("query leaked into a transport failure: %s", raw)
	}
	if d.Get("ok").Bool() || d.Get("status").Int() != 0 || !strings.Contains(d.Get("message").String(), up.URL+"/v1/messages") ||
		d.Get("effect").String() != "cooldown" {
		t.Fatalf("transport failure: %s", d)
	}
	last = e.plat.classes[len(e.plat.classes)-1]
	if last.GetStatus() != 0 || !strings.Contains(last.GetTransportError(), up.URL+"/v1/messages") ||
		strings.Contains(last.GetTransportError(), "secret-value") {
		t.Fatalf("transport classify request: %+v", last)
	}
	if e.mr.Exists(cooldownKey(id)) {
		t.Fatal("transport failure put the account into cooldown")
	}
}

// TestAccountTestRecordsLastTest checks last_test (CONTRACTS §50): null until
// the first test, then the outcome of every test, without touching what the
// gateway uses (updated_at stays).
func TestAccountTestRecordsLastTest(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	up := testUpstream(t)
	e.plat.testURL = up.URL + "/v1/messages"
	id := e.mkAccount("sk-good-key-123")
	if code, out := e.do("PATCH", fmt.Sprintf("/accounts/%d", id), map[string]any{"model_mapping": map[string]string{"claude-x": "claude-y"}}); code != 200 {
		t.Fatalf("patch: %d %v", code, out)
	}
	lastTest := func() gjson.Result {
		t.Helper()
		_, raw := e.doRaw(e.uid, "GET", fmt.Sprintf("/accounts/%d", id), nil)
		one := gjson.GetBytes(raw, "data.last_test")
		_, raw = e.doRaw(e.uid, "GET", "/accounts", nil)
		for _, v := range gjson.GetBytes(raw, "data").Array() {
			if v.Get("id").Int() == id && v.Get("last_test").Raw != one.Raw {
				t.Fatalf("list and detail differ: %s vs %s", v.Get("last_test").Raw, one.Raw)
			}
		}
		return one
	}
	if lt := lastTest(); !lt.Exists() || lt.Type != gjson.Null {
		t.Fatalf("untested account: %s", lt.Raw)
	}
	var updated time.Time
	if err := e.db.Pool.QueryRow(ctx, `SELECT updated_at FROM accounts WHERE id = $1`, id).Scan(&updated); err != nil {
		t.Fatal(err)
	}

	// Success: requested_model is the caller's choice, model the mapped one.
	_, raw := e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), map[string]any{"model": "claude-x"})
	d := gjson.GetBytes(raw, "data")
	if !d.Get("ok").Bool() || d.Get("requested_model").String() != "claude-x" || d.Get("model").String() != "claude-y" {
		t.Fatalf("result: %s", d)
	}
	lt := lastTest()
	if !lt.Get("ok").Bool() || lt.Get("model").String() != "claude-y" || lt.Get("message").String() != "" ||
		lt.Get("latency_ms").Int() < 0 || lt.Get("latency_ms").Int() != d.Get("latency_ms").Int() || lt.Get("at").String() == "" {
		t.Fatalf("last_test after success: %s", lt.Raw)
	}
	// No model given: requested_model is present and empty.
	_, raw = e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", id), nil)
	if r := gjson.GetBytes(raw, "data.requested_model"); !r.Exists() || r.String() != "" {
		t.Fatalf("requested_model without a model: %s", raw)
	}

	// Failure: the plugin's reason wins over the upstream body, cut to 512
	// bytes on a rune boundary.
	bad := e.mkAccount("sk-other-key-1")
	e.plat.classify = &pluginv1.ClassifyErrorResponse{Reason: strings.Repeat("凭证无效", 100)}
	_, raw = e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", bad), nil)
	if gjson.GetBytes(raw, "data.ok").Bool() {
		t.Fatalf("bad key passed: %s", raw)
	}
	var ok bool
	var msg string
	if err := e.db.Pool.QueryRow(ctx, `SELECT last_test_ok, last_test_message FROM accounts WHERE id = $1`, bad).Scan(&ok, &msg); err != nil {
		t.Fatal(err)
	}
	if ok || len(msg) > maxLastTestMessage || len(msg) < maxLastTestMessage-3 || !utf8.ValidString(msg) || !strings.HasPrefix(msg, "凭证无效") {
		t.Fatalf("failure record: ok=%v %d bytes %q", ok, len(msg), msg)
	}
	// Without a reason the upstream message is kept.
	e.plat.classify = nil
	_, _ = e.doRaw(e.uid, "POST", fmt.Sprintf("/accounts/%d/test", bad), nil)
	if err := e.db.Pool.QueryRow(ctx, `SELECT last_test_message FROM accounts WHERE id = $1`, bad).Scan(&msg); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(msg, "invalid x-api-key") {
		t.Fatalf("upstream message not recorded: %q", msg)
	}

	var after time.Time
	if err := e.db.Pool.QueryRow(ctx, `SELECT updated_at FROM accounts WHERE id = $1`, id).Scan(&after); err != nil {
		t.Fatal(err)
	}
	if !after.Equal(updated) {
		t.Fatalf("a test changed updated_at: %v -> %v", updated, after)
	}
}

// TestUpstreamAddrStripsCredentials checks the address shown in the console.
func TestUpstreamAddrStripsCredentials(t *testing.T) {
	for _, tc := range []struct{ in, want string }{
		{"https://host/v1/messages?key=secret#frag", "https://host/v1/messages"},
		{"https://user:pass@host:8443/v1/x", "https://host:8443/v1/x"},
		{"http://host", "http://host"},
	} {
		u, err := url.Parse(tc.in)
		if err != nil {
			t.Fatal(err)
		}
		if got := upstreamAddr(u); got != tc.want {
			t.Fatalf("%s: got %s want %s", tc.in, got, tc.want)
		}
	}
}
