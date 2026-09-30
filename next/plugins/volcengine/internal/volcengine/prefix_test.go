package volcengine

// Tests for the two upstream path prefixes and the Anthropic surface.
//
// The security case is first and is the reason this file exists: base_url is
// restricted to the official endpoints by guardedSettings unless the caller
// holds account:settings:custom, and a path prefix that could move the request
// to another host would make that restriction decorative.

import (
	"context"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// settingsWith builds an account whose settings carry the two prefixes.
func settingsWith(api, video string) *pluginv1.Account {
	s := `{"base_url":"https://relay.test"`
	if api != "" {
		s += `,"api_prefix":` + jsonStr(api)
	}
	if video != "" {
		s += `,"video_api_prefix":` + jsonStr(video)
	}
	return account(testKey, s+`}`)
}

func jsonStr(s string) string {
	return `"` + strings.ReplaceAll(s, `"`, `\"`) + `"`
}

func buildFor(t *testing.T, acc *pluginv1.Account, meta *pluginv1.RequestMeta) (*pluginv1.BuildUpstreamRequestResponse, error) {
	t.Helper()
	return New().BuildUpstreamRequest(context.Background(), &pluginv1.BuildUpstreamRequestRequest{
		Meta: meta, Account: acc,
		Fields: map[string]string{"model": `"` + meta.GetModel() + `"`},
	})
}

// TestPrefixCannotLeaveTheHost is the point of upstreamURL. Each of these
// values, appended to a base URL, parses as a DIFFERENT origin - "@evil.com"
// demotes the real host to userinfo, "//evil.com" is a protocol-relative URL,
// and an absolute URL replaces everything. Without the origin check they would
// all be sent, carrying the account's key, from an account whose base_url is
// pinned to an official address by guardedSettings.
//
// The prefix is written straight into settings here, not through
// ValidateCredentials: that is the whole point. The form rejects these, and
// this asserts the request path refuses them even when the form did not run -
// a row stored by an older version, restored from a backup, or written by any
// future path that skips normalization.
func TestPrefixCannotLeaveTheHost(t *testing.T) {
	for _, bad := range []string{"@evil.com/v3", "//evil.com/v3", "https://evil.com/v3", "@evil.com"} {
		t.Run(bad, func(t *testing.T) {
			r, err := buildFor(t, settingsWith(bad, ""), &pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "m"})
			if err == nil {
				t.Fatalf("accepted %q and would have sent %s", bad, r.GetUrl())
			}
			if !strings.Contains(err.Error(), FieldAPIPrefix) {
				t.Errorf("the error should name %s so an operator knows what to fix: %v", FieldAPIPrefix, err)
			}
		})
	}
	// The mirror image: a legitimate prefix must go through, or the check
	// above would be satisfied by refusing everything.
	r, err := buildFor(t, settingsWith("/v1", ""), &pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "m"})
	if err != nil || r.GetUrl() != "https://relay.test/v1/chat/completions" {
		t.Fatalf("a plain prefix must work: %v %v", r.GetUrl(), err)
	}
	// And the video prefix is checked by the same code on its own field.
	if _, err := buildFor(t, settingsWith("", "@evil.com/v3"),
		&pluginv1.RequestMeta{Protocol: ProtocolVideoSubmit, Model: "m"}); err == nil {
		t.Fatal("the video prefix must be checked too")
	}
}

// TestPrefixAppliesToEveryProtocol pins the whole mapping at a non-default
// prefix, which is the layout of the first relay this was built for: the
// OpenAI- and Anthropic-compatible paths at the root under /v1.
func TestPrefixAppliesToEveryProtocol(t *testing.T) {
	acc := settingsWith("/v1", "")
	for _, c := range []struct{ protocol, model, want string }{
		{ProtocolChat, "doubao-seed-1-6-250615", "https://relay.test/v1/chat/completions"},
		{ProtocolChat, "bot-20250101", "https://relay.test/v1/bots/chat/completions"},
		{ProtocolResponses, "m", "https://relay.test/v1/responses"},
		{ProtocolEmbeddings, "m", "https://relay.test/v1/embeddings"},
		{ProtocolImages, "m", "https://relay.test/v1/images/generations"},
		{ProtocolMessages, "m", "https://relay.test/v1/messages"},
		{ProtocolVideoSubmit, "m", "https://relay.test/v1/contents/generations/tasks"},
	} {
		r, err := buildFor(t, acc, &pluginv1.RequestMeta{Protocol: c.protocol, Model: c.model})
		if err != nil || r.GetUrl() != c.want {
			t.Errorf("%s: url = %q (%v), want %q", c.protocol, r.GetUrl(), err, c.want)
		}
	}
	// Unset means the official Ark prefix, so every account that predates
	// these settings keeps the exact URL it had.
	r, err := buildFor(t, account(testKey, `{"base_url":"https://relay.test"}`),
		&pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "m"})
	if err != nil || r.GetUrl() != "https://relay.test"+APIPrefix+"/chat/completions" {
		t.Fatalf("default prefix = %q (%v)", r.GetUrl(), err)
	}
}

// TestVideoPrefixIsIndependent covers the layout that made two settings
// necessary: a relay serving text at the root while keeping Ark's native video
// tasks under its own namespace.
func TestVideoPrefixIsIndependent(t *testing.T) {
	acc := settingsWith("/v1", "/doubao/api/v3")
	r, err := buildFor(t, acc, &pluginv1.RequestMeta{Protocol: ProtocolChat, Model: "m"})
	if err != nil || r.GetUrl() != "https://relay.test/v1/chat/completions" {
		t.Fatalf("text: %q %v", r.GetUrl(), err)
	}
	r, err = buildFor(t, acc, &pluginv1.RequestMeta{Protocol: ProtocolVideoSubmit, Model: "m"})
	if err != nil || r.GetUrl() != "https://relay.test/doubao/api/v3/contents/generations/tasks" {
		t.Fatalf("submit: %q %v", r.GetUrl(), err)
	}
	r, err = buildFor(t, acc, &pluginv1.RequestMeta{
		Protocol: ProtocolVideoQuery, Model: "m", PathParams: map[string]string{TaskIDParam: "task_1"}})
	if err != nil || r.GetUrl() != "https://relay.test/doubao/api/v3/contents/generations/tasks/task_1" {
		t.Fatalf("query: %q %v", r.GetUrl(), err)
	}
	// The reconcile poll is the third caller and the one that would go
	// unnoticed: it runs offline, and a poll built against the wrong path
	// answers 404 for every entry, which the core reads as "still pending"
	// until the deadline and then keeps the estimate - the account is charged
	// its pre-charge for work that really finished and reported real usage.
	rr, err := New().BuildReconcileRequest(context.Background(), &pluginv1.BuildReconcileRequestRequest{
		Account: acc, Entry: &pluginv1.ReconcileEntry{RefId: "task_1"},
	})
	if err != nil || rr.GetUrl() != "https://relay.test/doubao/api/v3/contents/generations/tasks/task_1" {
		t.Fatalf("reconcile: %q %v", rr.GetUrl(), err)
	}
	// An unset video prefix follows the api one, so the common case of a
	// single prefix needs one field.
	r, err = buildFor(t, settingsWith("/v1", ""), &pluginv1.RequestMeta{Protocol: ProtocolVideoSubmit, Model: "m"})
	if err != nil || r.GetUrl() != "https://relay.test/v1/contents/generations/tasks" {
		t.Fatalf("video following api prefix: %q %v", r.GetUrl(), err)
	}
}

// TestCountTokensIsRefusedByName documents the cost of declaring the anthropic
// platform: it declares two endpoints and AccountPlatform cannot select one,
// so this account type is offered count_tokens whether it can serve it or not.
func TestCountTokensIsRefusedByName(t *testing.T) {
	_, err := buildFor(t, settingsWith("/v1", ""), &pluginv1.RequestMeta{Protocol: ProtocolCountTokens, Model: "m"})
	if err == nil {
		t.Fatal("count_tokens must not be sent anywhere")
	}
	if !strings.Contains(err.Error(), "count_tokens") {
		t.Errorf("the error must name the protocol, or the log does not explain itself: %v", err)
	}
}

// TestAnthropicHeaders: Anthropic rejects a request with no version header, so
// one is supplied - but never in place of the client's own, which tells the
// upstream which shape the body is in.
func TestAnthropicHeaders(t *testing.T) {
	h := upstreamHeaders(ProtocolMessages, "k", nil)
	if h["anthropic-version"] != DefaultAnthropicVersion {
		t.Errorf("version = %q, want the default %q", h["anthropic-version"], DefaultAnthropicVersion)
	}
	h = upstreamHeaders(ProtocolMessages, "k", map[string]string{
		"anthropic-version": "2026-01-01", "anthropic-beta": "x-1", "user-agent": "ua", "x-stainless-lang": "go"})
	if h["anthropic-version"] != "2026-01-01" {
		t.Errorf("the client's version must win: %q", h["anthropic-version"])
	}
	if h["anthropic-beta"] != "x-1" {
		t.Errorf("anthropic-beta must be forwarded: %q", h["anthropic-beta"])
	}
	if _, ok := h["x-stainless-lang"]; ok {
		t.Error("only the declared headers are forwarded")
	}
	// The OpenAI surface is unchanged: no version header appears there.
	if _, ok := upstreamHeaders(ProtocolChat, "k", nil)["anthropic-version"]; ok {
		t.Error("the openai surface must not grow an anthropic header")
	}
}

// TestAnthropicErrorVocabulary: the gateway uses a plugin's client_error_type
// verbatim when it is set, so the OpenAI words would reach an Anthropic client
// as-is. "server_error" is not an Anthropic type at all.
func TestAnthropicErrorVocabulary(t *testing.T) {
	for _, c := range []struct {
		protocol string
		status   int
		want     string
	}{
		{ProtocolMessages, 500, errAnthropicAPI},
		{ProtocolMessages, 0, errAnthropicAPI},
		{ProtocolMessages, 404, errAnthropicNotFound},
		{ProtocolMessages, 401, errAuthentication},
		{ProtocolMessages, 429, errRateLimit},
		{ProtocolMessages, 400, errInvalidRequest},
		// The OpenAI surface keeps its own words.
		{ProtocolChat, 500, errServer},
		{ProtocolChat, 404, errInvalidRequest},
	} {
		if got := errorTypeFor(c.protocol, c.status); got != c.want {
			t.Errorf("%s %d = %q, want %q", c.protocol, c.status, got, c.want)
		}
	}
}

// TestUpstreamURLRejectsAnotherOrigin tests the last line of defence on its
// own. It has to be tested directly, because prefixesOf normalizes first and
// therefore refuses these values before this code is reached - which is the
// point of having both, and also the reason this check would otherwise look
// covered while never running.
//
// The two layers stop different things, and the difference is worth stating
// because it is easy to get backwards:
//
//   - "@evil.com/x" is a real origin escape. Appended to an absolute base it
//     makes the authority "ark.cn-beijing.volces.com@evil.com", which parses
//     with the intended host demoted to userinfo and evil.com as the host.
//     THIS is what upstreamURL exists for.
//   - "//evil.com/x" is NOT an escape here, and this test says so: the base
//     already carries a scheme and authority, so the result is
//     "https://ark.cn-beijing.volces.com//evil.com/x" - host unchanged, the
//     double slash is just an odd path. It is refused one layer earlier by
//     normalizePrefix, because a path prefix starting with // is a mistake
//     whatever it does, and because the same string IS an escape when a base
//     with no host is involved.
func TestUpstreamURLRejectsAnotherOrigin(t *testing.T) {
	const base = "https://ark.cn-beijing.volces.com"
	for _, bad := range []string{
		"@evil.com/v3/chat/completions",
		"@evil.com",
		"https://evil.com/chat",
	} {
		if got, err := upstreamURL(base, bad); err == nil {
			t.Errorf("upstreamURL(%q) = %q, want an error", bad, got)
		}
	}
	// Same host, so upstreamURL passes it; normalizePrefix is the layer that
	// refuses it, and TestNormalizePrefix asserts that.
	if _, err := upstreamURL(base, "//evil.com/x"); err != nil {
		t.Errorf("// keeps the host, so this layer has no reason to refuse it: %v", err)
	}
	if _, err := normalizePrefix("//evil.com/x"); err == nil {
		t.Error("...but normalizePrefix must refuse it")
	}
	for _, ok := range []string{"/api/v3/chat/completions", "/v1/messages", "/doubao/api/v3/contents/generations/tasks"} {
		got, err := upstreamURL(base, ok)
		if err != nil || got != base+ok {
			t.Errorf("upstreamURL(%q) = %q, %v", ok, got, err)
		}
	}
	// The returned string is the raw concatenation, not a re-serialized URL:
	// the core parses these same bytes again for its SSRF guard, and anything
	// that round-tripped through url.String() here could differ from what was
	// checked.
	if got, _ := upstreamURL(base, "/v1/a%2Fb"); got != base+"/v1/a%2Fb" {
		t.Errorf("the escape must survive verbatim: %q", got)
	}
}

func TestNormalizePrefix(t *testing.T) {
	for _, c := range []struct{ in, want string }{
		{"", ""}, {"  ", ""}, {"/api/v3", "/api/v3"}, {" /v1 ", "/v1"},
		{"/v1/", "/v1"}, {"/doubao/api/v3//", "/doubao/api/v3"}, {"/", ""},
	} {
		got, err := normalizePrefix(c.in)
		if err != nil || got != c.want {
			t.Errorf("normalizePrefix(%q) = %q, %v; want %q", c.in, got, err, c.want)
		}
	}
	for _, bad := range []string{"v1", "//x", "@evil.com", "https://evil.com", "/a?b", "/a#b",
		"/a/../b", "/" + strings.Repeat("x", MaxPrefixLen)} {
		if got, err := normalizePrefix(bad); err == nil {
			t.Errorf("normalizePrefix(%q) = %q, want an error", bad, got)
		}
	}
}
