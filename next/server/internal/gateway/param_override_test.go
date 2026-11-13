package gateway

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
)

func setParamOverride(t *testing.T, e *env, id int64, raw string) {
	t.Helper()
	p, errs := core.CompileParamOverride(context.Background(), "param_override", []byte(raw))
	require.Empty(t, errs)
	e.accounts.mu.Lock()
	e.accounts.accounts[id].ParamOverride = p
	e.accounts.mu.Unlock()
}

// An account's request parameter override (CONTRACTS §84) rewrites the body
// before the plugin builds and sets or removes headers over the
// passthrough's; the plugin's own headers (here the anthropic-beta it
// forwards) and the account key stay the plugin's (CONTRACTS §86.5).
func TestAccountParamOverrideReachesUpstream(t *testing.T) {
	const override = `{"metadata":{"src":"legacy"},"operations":[
		{"mode":"set","path":"temperature","value":0.3},
		{"mode":"set","path":"model","value":"claude-override","conditions":[{"path":"original_model","mode":"full","value":"` + testModel + `"}]},
		{"mode":"append","path":"messages.-1.content","value":"!"},
		{"mode":"set_header","path":"x-custom","value":"v1","conditions":{"request_headers.x-tier":"gold"}},
		{"mode":"set_header","path":"anthropic-beta","value":{"beta-a":null,"$append":["beta-c"]}},
		{"mode":"delete_header","path":"x-trace"}]}`
	for _, availability := range []bool{false, true} {
		e := newEnv(t)
		if availability {
			enableAvailability(e, 0)
		}
		setParamOverride(t, e, 1, override)
		e.accounts.mu.Lock()
		e.accounts.accounts[1].HeaderPassthrough = []string{"*"}
		e.accounts.mu.Unlock()

		r := e.do("/v1/messages", body(testModel, false), map[string]string{"X-Tier": "gold", "X-Trace": "t1", "Anthropic-Beta": "beta-a,beta-b"})
		require.Equal(t, 200, r.status, string(r.body))
		got := e.up.last()
		assert.Equal(t, "acc-1", got.key, "availability=%v", availability)
		up := gjson.ParseBytes(got.body)
		assert.Equal(t, "claude-override", up.Get("model").String())
		assert.Equal(t, 0.3, up.Get("temperature").Float())
		assert.Equal(t, "legacy", up.Get("metadata.src").String())
		assert.Equal(t, "hello there!", up.Get("messages.0.content").String())
		assert.Equal(t, "acc-1", got.header.Get("x-api-key"))
		assert.Equal(t, "v1", got.header.Get("X-Custom"))
		assert.Equal(t, "beta-a,beta-b", got.header.Get("Anthropic-Beta"), "the plugin's header wins over the override")
		assert.Empty(t, got.header.Get("X-Trace"), "the passthrough's header is removed")
		assert.Equal(t, "gold", got.header.Get("X-Tier"))

		rec := e.record()
		assert.Equal(t, testModel, rec.Model, "billing keeps the client model")
		assert.Equal(t, "claude-override", rec.UpstreamModel)
	}
}

// return_error answers the client without an upstream call (skip_retry) or
// moves to the next account; an operation that cannot run fails over. None
// of them cools the account down.
func TestAccountParamOverrideStops(t *testing.T) {
	t.Run("return error", func(t *testing.T) {
		e := newEnv(t)
		setParamOverride(t, e, 1, `{"operations":[{"mode":"return_error","value":{"message":"model retired","status_code":403,"type":"permission_error"}}]}`)
		r := e.messages(body(testModel, false))
		require.Equal(t, 403, r.status, string(r.body))
		assert.Equal(t, "model retired", r.json().Get("error.message").String())
		assert.Equal(t, "permission_error", r.json().Get("error.type").String())
		assert.Empty(t, e.up.keys())
		assert.Empty(t, e.accounts.cooldowns)
	})
	for name, override := range map[string]string{
		"return error with retry": `{"operations":[{"mode":"return_error","value":{"message":"not here","skip_retry":false}}]}`,
		"failed operation":        `{"operations":[{"mode":"trim_prefix","path":"max_tokens","value":"x"}]}`,
	} {
		t.Run(name, func(t *testing.T) {
			e := newEnv(t)
			setParamOverride(t, e, 1, override)
			r := e.messages(body(testModel, false))
			require.Equal(t, 200, r.status, string(r.body))
			assert.Equal(t, []string{"acc-2"}, e.up.keys())
			assert.Empty(t, e.accounts.cooldowns)
		})
	}
}

// A plugin's Execute forwards through the core as well: there too the
// plugin builds from the overridden body, with the override's model, and
// its patches and headers come after the override.
func TestAccountParamOverrideExecutePath(t *testing.T) {
	db := testutil.DB(t)
	bill := billing.New(db, nil, nil, nil, nil)
	e, p := executeFixture(t, usage.New(db, bill, bill, nil, usage.Options{}))
	e.plat.patches = []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "temperature", ValueJson: "0.9"}}
	setParamOverride(t, e, 1, `{"operations":[{"mode":"set","path":"temperature","value":0.3},{"mode":"set","path":"top_k","value":4},
		{"mode":"set_header","path":"x-custom","value":"v1"},{"mode":"set","path":"model","value":"claude-override"}]}`)
	require.Equal(t, 200, e.messages(body(testModel, false)).status)
	require.Equal(t, int64(1), p.calls.Load())
	got := e.up.last()
	assert.Equal(t, 0.9, gjson.GetBytes(got.body, "temperature").Float(), "the plugin's patch wins over the override")
	assert.Equal(t, int64(4), gjson.GetBytes(got.body, "top_k").Int())
	assert.Equal(t, "claude-override", gjson.GetBytes(got.body, "model").String())
	assert.Equal(t, "v1", got.header.Get("X-Custom"))
	b := e.plat.builds[0]
	assert.Equal(t, "claude-override", b.GetMeta().GetModel())
	assert.Equal(t, `"claude-override"`, b.GetFields()["model"])
}

// The built-in claude_max_tokens override (CONTRACTS §84.1): off, nothing is
// added; on, a body without max_tokens gets its client model's value, else
// the default's; the client's own value is kept, and the account's override
// runs after it.
func TestClaudeMaxTokensBuiltinOverride(t *testing.T) {
	e := newEnv(t)
	noLimit := body(testModel, false)
	delete(noLimit, "max_tokens")
	maxTokens := func(b map[string]any) gjson.Result {
		t.Helper()
		r := e.messages(b)
		require.Equal(t, 200, r.status, string(r.body))
		e.record()
		return gjson.GetBytes(e.up.last().body, "max_tokens")
	}

	assert.False(t, maxTokens(noLimit).Exists(), "off by default")

	gw := noQueueSettings()
	gw.ClaudeMaxTokens = ClaudeMaxTokensRule{Enabled: true, Models: map[string]int{"default": 100, testModel: 200}}
	e.setSettings(gw, defaultStickySettings())
	assert.Equal(t, int64(200), maxTokens(noLimit).Int(), "the client model's value")
	assert.Equal(t, int64(64), maxTokens(body(testModel, false)).Int(), "the client's own value is kept")

	gw.ClaudeMaxTokens.Models = map[string]int{"default": 100}
	e.setSettings(gw, defaultStickySettings())
	assert.Equal(t, int64(100), maxTokens(noLimit).Int(), "the default's value")

	setParamOverride(t, e, 1, `{"operations":[{"mode":"set","path":"max_tokens","value":5}]}`)
	assert.Equal(t, int64(5), maxTokens(noLimit).Int(), "the account's override runs after")
}
