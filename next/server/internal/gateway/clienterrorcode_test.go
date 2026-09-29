package gateway

import (
	"context"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// ClassifyErrorResponse.client_error_code is the only way the plugin's own
// classification of an upstream failure reaches the client: without it every
// upstream error carries code "upstream_error", so a content-moderation block
// and a bad parameter look identical to an SDK.

func TestClientErrorCodeFromPlugin(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{status: 400})
	e.plat.classifyHook = func(_ *pluginv1.ClassifyErrorRequest, out *pluginv1.ClassifyErrorResponse) {
		out.ClientErrorCode = "InputTextSensitiveContentDetected"
	}
	r := e.messages(body(testModel, false))
	if r.status != 400 || r.json().Get("error.code").String() != "InputTextSensitiveContentDetected" {
		t.Fatalf("400: %d %s", r.status, r.body)
	}
	// The classification the plugin already made is unchanged otherwise.
	if r.json().Get("error.type").String() != "invalid_request_error" {
		t.Fatalf("type: %s", r.body)
	}
}

// Backward compatibility: a plugin that never heard of the field (every plugin
// written before it) must produce exactly the body it produced before.
func TestClientErrorCodeDefaultsToUpstreamError(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{status: 400})
	r := e.messages(body(testModel, false))
	if r.status != 400 || r.json().Get("error.code").String() != "upstream_error" {
		t.Fatalf("400: %d %s", r.status, r.body)
	}
}

// An unusable code is dropped, not truncated or sanitised: a truncated code is
// a different code, and a client branching on it would branch wrongly.
func TestClientErrorCodeRejectsUnusableValues(t *testing.T) {
	bad := map[string]string{
		"too long":   strings.Repeat("a", maxClientErrorCode+1),
		"space":      "sensitive content",
		"quote":      `a"b`,
		"slash":      "a/b",
		"brace":      "{a}",
		"newline":    "a\nb",
		"non ascii":  "敏感内容",
		"leading -":  "-code",
		"leading .":  ".code",
		"empty-ish ": " ",
	}
	for name, code := range bad {
		t.Run(name, func(t *testing.T) {
			e := newEnv(t)
			e.up.set("acc-1", &upstreamRule{status: 400})
			e.plat.classifyHook = func(_ *pluginv1.ClassifyErrorRequest, out *pluginv1.ClassifyErrorResponse) {
				out.ClientErrorCode = code
			}
			r := e.messages(body(testModel, false))
			if got := r.json().Get("error.code").String(); got != "upstream_error" {
				t.Fatalf("code = %q for %q", got, code)
			}
		})
	}
}

// Codes real upstreams use must pass unchanged.
func TestClientErrorCodeAccepts(t *testing.T) {
	ctx := context.Background()
	good := []string{
		"InputTextSensitiveContentDetected", "insufficient_quota", "context_length_exceeded",
		"model_not_found", "billing.hard_limit_reached", "RESOURCE_EXHAUSTED", "err-42", "a:b", "x",
		strings.Repeat("a", maxClientErrorCode),
	}
	for _, c := range good {
		if got := clientErrorCode(ctx, c, "p"); got != c {
			t.Errorf("clientErrorCode(%q) = %q", c, got)
		}
	}
	if got := clientErrorCode(ctx, "", "p"); got != codeUpstreamError {
		t.Errorf("empty code = %q", got)
	}
}

// A plugin that names a code but neither a type nor a message asks for the
// rendered envelope; passing the upstream body through would throw the code
// away. Without a code the old passthrough is unchanged.
func TestClientErrorCodeSuppressesRawPassthrough(t *testing.T) {
	const raw = `{"vendor":"ark","error":{"code":"InputTextSensitiveContentDetected"}}`

	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{status: 400, body: raw})
	e.plat.classifyHook = func(_ *pluginv1.ClassifyErrorRequest, out *pluginv1.ClassifyErrorResponse) {
		out.ClientErrorType, out.ClientMessage = "", ""
	}
	if r := e.messages(body(testModel, false)); r.json().Get("vendor").String() != "ark" {
		t.Fatalf("upstream body not passed through: %s", r.body)
	}

	e2 := newEnv(t)
	e2.up.set("acc-1", &upstreamRule{status: 400, body: raw})
	e2.plat.classifyHook = func(_ *pluginv1.ClassifyErrorRequest, out *pluginv1.ClassifyErrorResponse) {
		out.ClientErrorType, out.ClientMessage = "", ""
		out.ClientErrorCode = "InputTextSensitiveContentDetected"
	}
	r := e2.messages(body(testModel, false))
	if r.json().Get("vendor").Exists() {
		t.Fatalf("raw body returned although the plugin named a code: %s", r.body)
	}
	if r.json().Get("error.code").String() != "InputTextSensitiveContentDetected" {
		t.Fatalf("code lost: %s", r.body)
	}

	// A rejected code leaves the code generic, so the old passthrough applies.
	e3 := newEnv(t)
	e3.up.set("acc-1", &upstreamRule{status: 400, body: raw})
	e3.plat.classifyHook = func(_ *pluginv1.ClassifyErrorRequest, out *pluginv1.ClassifyErrorResponse) {
		out.ClientErrorType, out.ClientMessage = "", ""
		out.ClientErrorCode = "not a code"
	}
	if r := e3.messages(body(testModel, false)); r.json().Get("vendor").String() != "ark" {
		t.Fatalf("rejected code changed the passthrough: %s", r.body)
	}
}
