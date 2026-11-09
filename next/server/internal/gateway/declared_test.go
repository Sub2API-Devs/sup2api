package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	sdkupstream "github.com/Sub2API-Devs/sup2api/next/sdk/upstream"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/declarative"
)

// declare makes the anthropic "apikey" type declare its upstream: the
// anthropic preset sending to the test upstream, with the extra fields of
// layer (a JSON object's members) on top. plugin amends the requests of an
// extend declaration.
func (e *env) declare(layer string, plugin core.PlatformPlugin) {
	e.t.Helper()
	if layer != "" {
		layer = "," + layer
	}
	var up manifest.Upstream
	require.NoError(e.t, json.Unmarshal(fmt.Appendf(nil, `{"preset":"anthropic","baseURL":{"default":%q}%s}`, e.up.srv.URL, layer), &up))
	at := e.gen.accountTypes[0].Type
	at.Upstream = &up
	p, err := sdkupstream.Resolve(&at, builtinPlatform(e.t, "anthropic").PassHeaders, nil)
	require.NoError(e.t, err)
	e.gen.accountTypes[0].Type = at
	e.gen.accountTypes[0].Client = declarative.New(p, plugin)
}

func (e *env) setAccount(id int64, edit func(*core.Account)) {
	e.accounts.mu.Lock()
	defer e.accounts.mu.Unlock()
	edit(e.accounts.accounts[id])
}

// A declared type is served by the core: the request the declaration builds
// is sent as it is, without the plugin.
func TestDeclaredUpstreamSendsTheBuiltRequest(t *testing.T) {
	e := newEnv(t)
	e.declare("", nil)
	r := e.do("/v1/messages", body(testModel, false), map[string]string{"anthropic-beta": "b1"})
	require.Equal(t, 200, r.status, string(r.body))
	got := e.up.last()
	assert.Equal(t, "acc-1", got.key)
	assert.Equal(t, "/v1/messages", got.path)
	assert.Equal(t, "2023-06-01", got.header.Get("anthropic-version"))
	assert.Equal(t, "b1", got.header.Get("anthropic-beta"), "client headers the platform passes reach upstream")
	assert.Equal(t, testModel, gjson.GetBytes(got.body, "model").String())
	assert.Zero(t, e.plat.buildCount(), "no plugin call")
	assert.True(t, e.record().Success)
}

// The account's override (§84) runs after the plugin's patches and has the
// last word on the body; the plugin builds from the body before it, with
// the mapped model, and keeps its URL when the override changes the model.
func TestAccountOverrideRunsAfterPluginPatches(t *testing.T) {
	e := newEnv(t)
	e.plat.patches = []*pluginv1.BodyPatch{
		{Op: pluginv1.BodyPatch_OP_SET, Path: "temperature", ValueJson: "0.9"},
		{Op: pluginv1.BodyPatch_OP_SET, Path: "top_k", ValueJson: "5"},
	}
	e.plat.route = func(in *pluginv1.BuildUpstreamRequestRequest) string {
		return e.up.srv.URL + "/v1/messages?built_for=" + in.GetMeta().GetModel()
	}
	setParamOverride(t, e, 1, `{"operations":[{"mode":"set","path":"temperature","value":0.3},{"mode":"set","path":"model","value":"claude-override"}]}`)
	r := e.messages(body(testModel, false))
	require.Equal(t, 200, r.status, string(r.body))
	got := e.up.last()
	up := gjson.ParseBytes(got.body)
	assert.Equal(t, 0.3, up.Get("temperature").Float(), "the override wins over the plugin's patch")
	assert.Equal(t, int64(5), up.Get("top_k").Int())
	assert.Equal(t, "claude-override", up.Get("model").String())
	assert.Equal(t, "/v1/messages?built_for="+testModel, got.path, "a code plugin's URL is kept")
	b := e.plat.builds[0]
	assert.Equal(t, testModel, b.GetMeta().GetModel())
	assert.Equal(t, `"`+testModel+`"`, b.GetFields()["model"], "the plugin saw the body before the override")
	rec := e.record()
	assert.Equal(t, testModel, rec.Model)
	assert.Equal(t, "claude-override", rec.UpstreamModel)
}

// A declared route naming {model} follows the model the override sends.
func TestDeclaredOverrideModelRendersTheURL(t *testing.T) {
	e := newEnv(t)
	e.declare(`"routes":{"anthropic.messages":{"path":"/v1/models/{model}/messages"}}`, nil)
	require.Equal(t, 200, e.messages(body(testModel, false)).status)
	assert.Equal(t, "/v1/models/"+testModel+"/messages", e.up.last().path)
	e.record()

	setParamOverride(t, e, 1, `{"operations":[{"mode":"set","path":"model","value":"claude-override"}]}`)
	require.Equal(t, 200, e.messages(body(testModel, false)).status)
	got := e.up.last()
	assert.Equal(t, "/v1/models/claude-override/messages", got.path)
	assert.Equal(t, "claude-override", gjson.GetBytes(got.body, "model").String())
	assert.Equal(t, "claude-override", e.record().UpstreamModel)
}

// A model a patch wrote is not the override's: an override leaving the
// model alone changes neither the URL nor the recorded upstream model.
func TestOverrideKeepsAPatchedModel(t *testing.T) {
	e := newEnv(t)
	e.declare(`"routes":{"anthropic.messages":{"path":"/v1/models/{model}/messages","patches":[{"op":"set","path":"model","value":"claude-patched"}]}}`, nil)
	setParamOverride(t, e, 1, `{"operations":[{"mode":"set","path":"temperature","value":0.3}]}`)
	require.Equal(t, 200, e.messages(body(testModel, false)).status)
	got := e.up.last()
	assert.Equal(t, "/v1/models/"+testModel+"/messages", got.path, "the URL Build rendered")
	assert.Equal(t, "claude-patched", gjson.GetBytes(got.body, "model").String())
	assert.Equal(t, 0.3, gjson.GetBytes(got.body, "temperature").Float())
	assert.Equal(t, testModel, e.record().UpstreamModel)
}

// Only the declaration decides the credential: under a custom auth header
// name neither an extending plugin, the passthrough nor the account's
// override can replace or remove it.
func TestDeclaredAuthHeaderIsWrittenLast(t *testing.T) {
	for name, override := range map[string]string{
		"set":    `{"operations":[{"mode":"set_header","path":"x-relay-token","value":"from-override"}]}`,
		"delete": `{"operations":[{"mode":"delete_header","path":"x-relay-token"}]}`,
	} {
		t.Run(name, func(t *testing.T) {
			e := newEnv(t)
			plugin := &amendingPlatform{fakePlatform: &fakePlatform{}, headers: map[string]string{"X-Relay-Token": "from-plugin"}}
			e.declare(`"extend":true,"auth":{"type":"header","name":"x-relay-token","value":"Relay {api_key}"}`, plugin)
			setParamOverride(t, e, 1, override)
			e.setAccount(1, func(a *core.Account) { a.HeaderPassthrough = []string{"*"} })
			r := e.do("/v1/messages", body(testModel, false), map[string]string{"X-Relay-Token": "from-client"})
			require.Equal(t, 200, r.status, string(r.body))
			assert.Equal(t, "Relay acc-1", e.up.last().header.Get("X-Relay-Token"))
		})
	}
}

// The body goes through, in order: the filtered fields the account did not
// allow are removed, the manifest's paramOverride, the route's patches, the
// account's override.
func TestDeclaredBodyRewriteOrder(t *testing.T) {
	const layer = `"accountConfig":true,
		"paramOverride":{"operations":[{"mode":"set","path":"temperature","value":0.1},{"mode":"set","path":"top_k","value":1}]},
		"routes":{"anthropic.messages":{"patches":[{"op":"set","path":"temperature","value":0.2}]}}`
	e := newEnv(t)
	e.declare(layer, nil)
	e.setAccount(1, func(a *core.Account) { a.Settings = json.RawMessage(`{"upstream":{"allowFields":["speed"]}}`) })
	require.Equal(t, 200, e.messages(body(testModel, false, "service_tier", "priority", "speed", "fast")).status)
	up := gjson.ParseBytes(e.up.last().body)
	assert.False(t, up.Get("service_tier").Exists(), "filtered")
	assert.Equal(t, "fast", up.Get("speed").String(), "allowed by the account")
	assert.Equal(t, 0.2, up.Get("temperature").Float(), "the route's patch follows the manifest's override")
	assert.Equal(t, int64(1), up.Get("top_k").Int())
	e.record()

	setParamOverride(t, e, 1, `{"operations":[{"mode":"set","path":"temperature","value":0.3}]}`)
	require.Equal(t, 200, e.messages(body(testModel, false)).status)
	assert.Equal(t, 0.3, gjson.GetBytes(e.up.last().body, "temperature").Float(), "the account's override comes last")
}

// A failing declared paramOverride ends the attempt like a failing account
// override: return_error answers the client without an upstream call.
func TestDeclaredOverrideFailure(t *testing.T) {
	e := newEnv(t)
	e.declare(`"paramOverride":{"operations":[{"mode":"return_error","value":{"message":"retired","status_code":403,"type":"permission_error"}}]}`, nil)
	r := e.messages(body(testModel, false))
	require.Equal(t, 403, r.status, string(r.body))
	assert.Equal(t, "retired", r.json().Get("error.message").String())
	assert.Empty(t, e.up.keys())
}

// amendingPlatform is a plugin extending a declared type: it adds headers
// and a patch to the request the core built.
type amendingPlatform struct {
	*fakePlatform
	headers map[string]string
	bases   []*pluginv1.BuildUpstreamRequestResponse
}

func (p *amendingPlatform) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	p.mu.Lock()
	p.bases = append(p.bases, in.GetBase())
	p.mu.Unlock()
	return &pluginv1.BuildUpstreamRequestResponse{Headers: p.headers,
		Patches: []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "top_p", ValueJson: "0.5"}}}, nil
}

// Extend: the plugin amends the built request; its headers and patches
// reach upstream, the auth header stays the declaration's, and the
// account's override still comes after its patches.
func TestDeclaredExtendAmendsTheRequest(t *testing.T) {
	e := newEnv(t)
	plugin := &amendingPlatform{fakePlatform: &fakePlatform{}, headers: map[string]string{"X-Api-Key": "stolen", "x-extra": "1"}}
	e.declare(`"extend":true`, plugin)
	setParamOverride(t, e, 1, `{"operations":[{"mode":"set","path":"top_k","value":7}]}`)
	require.Equal(t, 200, e.messages(body(testModel, false)).status)
	got := e.up.last()
	assert.Equal(t, "acc-1", got.key)
	assert.Equal(t, "1", got.header.Get("x-extra"))
	assert.Equal(t, 0.5, gjson.GetBytes(got.body, "top_p").Float())
	assert.Equal(t, int64(7), gjson.GetBytes(got.body, "top_k").Int())
	require.Len(t, plugin.bases, 1)
	assert.Equal(t, e.up.srv.URL+"/v1/messages", plugin.bases[0].GetUrl())
}

// On a WebSocket, each turn's message gets the account's override after
// the plugin's patches, as an HTTP body does.
func TestWebSocketAccountOverrideAfterPatches(t *testing.T) {
	e := newWSEnv(t)
	e.wsPlat.wsPatch = func(*pluginv1.BuildUpstreamRequestRequest) ([]*pluginv1.BodyPatch, error) {
		return []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "store", ValueJson: "false"}}, nil
	}
	setParamOverride(t, e.env, 11, `{"operations":[{"mode":"set","path":"store","value":true},{"mode":"set","path":"metadata.src","value":"override"}]}`)
	c := e.mustDial()
	for _, input := range []string{"one", "two"} {
		c.send(create(wsModel, input))
		c.until("response.completed")
		e.record()
	}
	_, msgs := e.wsUp.snapshot()
	require.Len(t, msgs, 2)
	for _, m := range msgs {
		assert.Equal(t, "true", gjson.Get(m, "store").Raw)
		assert.Equal(t, "override", gjson.Get(m, "metadata.src").String())
	}
}

// A declared type on a WebSocket: the handshake carries the declaration's
// headers, its paramOverride's and its auth; each turn's message gets the
// declaration's part of the body (filtered fields, the manifest's rewrite).
func TestWebSocketDeclaredUpstream(t *testing.T) {
	e := newWSEnv(t)
	var up manifest.Upstream
	require.NoError(t, json.Unmarshal(fmt.Appendf(nil, `{"preset":"openai","baseURL":{"default":%q},"filterFields":["service_tier"],
		"paramOverride":{"operations":[{"mode":"set_header","path":"x-declared","value":"v"},{"mode":"set","path":"metadata.src","value":"declared"}]}}`,
		e.wsUp.srv.URL), &up))
	i := len(e.gen.accountTypes) - 1
	at := e.gen.accountTypes[i].Type
	at.Upstream = &up
	p, err := sdkupstream.Resolve(&at, builtinPlatform(t, "openai").PassHeaders, nil)
	require.NoError(t, err)
	e.gen.accountTypes[i].Type, e.gen.accountTypes[i].Client = at, declarative.New(p, nil)

	c := e.mustDial()
	for _, input := range []string{"one", "two"} {
		m := create(wsModel, input)
		m["service_tier"] = "priority"
		c.send(m)
		c.until("response.completed")
		e.record()
	}
	keys, msgs := e.wsUp.snapshot()
	require.Len(t, keys, 1)
	require.Len(t, msgs, 2)
	e.wsUp.mu.Lock()
	h := e.wsUp.headers[0]
	e.wsUp.mu.Unlock()
	assert.Equal(t, "v", h.Get("x-declared"))
	assert.Contains(t, h.Get("openai-beta"), "responses_websockets=")
	for _, m := range msgs {
		assert.False(t, gjson.Get(m, "service_tier").Exists(), "filtered")
		assert.Equal(t, "declared", gjson.Get(m, "metadata.src").String())
	}
	assert.Zero(t, e.wsPlat.buildCount(), "no plugin call")
}
