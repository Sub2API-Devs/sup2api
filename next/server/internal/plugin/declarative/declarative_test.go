package declarative

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// profile resolves an account type "t" declaring layer (JSON).
func profile(t *testing.T, layer string) *upstream.Profile {
	t.Helper()
	var up manifest.Upstream
	require.NoError(t, json.Unmarshal([]byte(layer), &up))
	p, err := upstream.Resolve(&manifest.AccountType{ID: "t", Upstream: &up}, nil, nil)
	require.NoError(t, err)
	return p
}

func account(settings string) *pluginv1.Account {
	return &pluginv1.Account{Id: 7, Type: "t", CredentialsJson: `{"api_key":"sk-account-key"}`, SettingsJson: settings}
}

func buildRequest(acc *pluginv1.Account, model string) *pluginv1.BuildUpstreamRequestRequest {
	return &pluginv1.BuildUpstreamRequestRequest{Account: acc,
		Meta:   &pluginv1.RequestMeta{Protocol: "anthropic.messages", Model: model},
		Fields: map[string]string{"model": `"` + model + `"`}}
}

// extender is a plugin amending the built request (extend mode).
type extender struct {
	pluginv1.UnimplementedPlatformServiceServer
	got *pluginv1.BuildUpstreamRequestRequest
	out *pluginv1.BuildUpstreamRequestResponse
}

func (e *extender) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	e.got = in
	return e.out, nil
}

func (e *extender) BuildQuotaRequest(context.Context, *pluginv1.BuildQuotaRequestRequest) (*pluginv1.BuildQuotaRequestResponse, error) {
	return &pluginv1.BuildQuotaRequestResponse{Url: "https://quota"}, nil
}

// The five entry points come from the declaration; the others answer
// Unimplemented without a plugin; the client never executes requests.
func TestClientServesTheDeclaration(t *testing.T) {
	c := New(profile(t, `{"preset":"anthropic"}`), nil)
	var client core.PlatformPlugin = c
	_, executes := client.(core.ExecutePlugin)
	assert.False(t, executes, "the gateway must send what BuildUpstreamRequest built")

	built, err := c.BuildUpstreamRequest(context.Background(), buildRequest(account(`{}`), "claude-x"))
	require.NoError(t, err)
	assert.Equal(t, "https://api.anthropic.com/v1/messages", built.GetUrl())
	assert.Equal(t, "sk-account-key", built.GetHeaders()["x-api-key"])
	assert.Equal(t, "claude-x", built.GetUpstreamModel())
	assert.Equal(t, "x-api-key", c.AuthHeader(account(`{}`)))

	v, err := c.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: "t", CredentialsJson: `{"api_key":"x"}`})
	require.NoError(t, err)
	assert.NotEmpty(t, v.GetErrors(), "a key of one character is rejected")

	test, err := c.BuildTestRequest(context.Background(), &pluginv1.BuildTestRequestRequest{Account: account(`{}`)})
	require.NoError(t, err)
	assert.Equal(t, "claude-haiku-4-5", test.GetModel())
	models, err := c.BuildModelsRequest(context.Background(), &pluginv1.BuildModelsRequestRequest{Account: account(`{}`)})
	require.NoError(t, err)
	assert.Equal(t, "https://api.anthropic.com/v1/models?limit=1000", models.GetUrl())
	cls, err := c.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: 429})
	require.NoError(t, err)
	assert.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, cls.GetAction())

	for _, call := range []func() error{
		func() error { _, err := c.ResolveModel(context.Background(), nil); return err },
		func() error { _, err := c.ExtractUsage(context.Background(), nil); return err },
		func() error { _, err := c.BuildQuotaRequest(context.Background(), nil); return err },
	} {
		assert.Equal(t, codes.Unimplemented, status.Code(call()))
	}
	assert.Equal(t, "anthropic", c.Upstream().Classify)
}

// Extend: the plugin sees the built request as base; its headers win except
// the auth header, its patches follow the declaration's, a url or model it
// returns replaces the built one. Entry points the declaration does not
// cover go to the plugin.
func TestExtendMerge(t *testing.T) {
	plugin := &extender{out: &pluginv1.BuildUpstreamRequestResponse{
		Headers:       map[string]string{"X-Api-Key": "stolen", "Anthropic-Version": "2099-01-01", "x-extra": "1"},
		Patches:       []*pluginv1.BodyPatch{{Op: pluginv1.BodyPatch_OP_SET, Path: "b", ValueJson: "2"}},
		UpstreamModel: "claude-amended"}}
	c := New(profile(t, `{"preset":"anthropic","extend":true,"routes":{"anthropic.messages":{"patches":[{"op":"set","path":"a","value":1}]}}}`), plugin)
	in := buildRequest(account(`{}`), "claude-x")
	built, err := c.BuildUpstreamRequest(context.Background(), in)
	require.NoError(t, err)

	require.NotNil(t, plugin.got.GetBase())
	assert.Equal(t, "https://api.anthropic.com/v1/messages", plugin.got.GetBase().GetUrl())
	assert.Equal(t, in.GetFields(), plugin.got.GetFields())
	assert.Equal(t, "sk-account-key", built.GetHeaders()["x-api-key"], "only the declaration writes the auth header")
	assert.Equal(t, "2099-01-01", built.GetHeaders()["anthropic-version"])
	assert.Equal(t, "1", built.GetHeaders()["x-extra"])
	assert.NotContains(t, built.GetHeaders(), "Anthropic-Version", "header names are merged case-insensitively")
	require.Len(t, built.GetPatches(), 2)
	assert.Equal(t, []string{"a", "b"}, []string{built.GetPatches()[0].GetPath(), built.GetPatches()[1].GetPath()})
	assert.Equal(t, "https://api.anthropic.com/v1/messages", built.GetUrl())
	assert.Equal(t, "claude-amended", built.GetUpstreamModel())

	quota, err := c.BuildQuotaRequest(context.Background(), nil)
	require.NoError(t, err)
	assert.Equal(t, "https://quota", quota.GetUrl())

	// Without extend the plugin only serves what the declaration does not.
	plain := New(profile(t, `{"preset":"anthropic"}`), plugin)
	plugin.got = nil
	_, err = plain.BuildUpstreamRequest(context.Background(), in)
	require.NoError(t, err)
	assert.Nil(t, plugin.got)
}

// After the account's override changed the model, the URL is rendered
// again for it, unless an extending plugin replaced the URL.
func TestUpstreamURL(t *testing.T) {
	const layer = `{"preset":"anthropic","routes":{"anthropic.messages":{"path":"/v1/models/{model}/messages"}}}`
	c := New(profile(t, layer), nil)
	in := buildRequest(account(`{}`), "claude-x")
	built, err := c.BuildUpstreamRequest(context.Background(), in)
	require.NoError(t, err)
	assert.Equal(t, "https://api.anthropic.com/v1/models/claude-x/messages", built.GetUrl())
	u, err := c.UpstreamURL(in, built, "claude y")
	require.NoError(t, err)
	assert.Equal(t, "https://api.anthropic.com/v1/models/claude%20y/messages", u)

	plugin := &extender{out: &pluginv1.BuildUpstreamRequestResponse{}}
	ext := New(profile(t, `{"preset":"anthropic","extend":true,"routes":{"anthropic.messages":{"path":"/v1/models/{model}/messages"}}}`), plugin)
	built, err = ext.BuildUpstreamRequest(context.Background(), in)
	require.NoError(t, err)
	u, err = ext.UpstreamURL(in, built, "claude-y")
	require.NoError(t, err)
	assert.Equal(t, "https://api.anthropic.com/v1/models/claude-y/messages", u, "the plugin kept the declared URL")

	plugin.out = &pluginv1.BuildUpstreamRequestResponse{Url: "https://elsewhere/v1/x"}
	built, err = ext.BuildUpstreamRequest(context.Background(), in)
	require.NoError(t, err)
	u, err = ext.UpstreamURL(in, built, "claude-y")
	require.NoError(t, err)
	assert.Equal(t, "https://elsewhere/v1/x", u, "a URL the plugin chose is kept, as a code plugin's")
}

// An account layer applies to every entry point, and its profile is cached
// per account settings.
func TestAccountLayer(t *testing.T) {
	c := New(profile(t, `{"preset":"anthropic","accountConfig":true}`), nil)
	acc := account(`{"upstream":{"auth":{"type":"header","name":"x-relay-token","value":"Bearer {api_key}"},"routes":{"anthropic.messages":{"path":"/relay/messages"}},"allowFields":["speed"]}}`)
	built, err := c.BuildUpstreamRequest(context.Background(), buildRequest(acc, "claude-x"))
	require.NoError(t, err)
	assert.Equal(t, "https://api.anthropic.com/relay/messages", built.GetUrl())
	assert.Equal(t, "Bearer sk-account-key", built.GetHeaders()["x-relay-token"])
	assert.NotContains(t, built.GetHeaders(), "x-api-key")
	assert.Equal(t, "x-relay-token", c.AuthHeader(acc))

	out, err := c.PrepareBody(acc, []byte(`{"model":"m","speed":"fast","service_tier":"priority","inference_geo":"us"}`), &core.ParamOverrideContext{})
	require.NoError(t, err)
	assert.JSONEq(t, `{"model":"m","speed":"fast"}`, string(out.Body), "filtered fields go unless the account allows them")

	first, err := c.forAccount(acc)
	require.NoError(t, err)
	again, err := c.forAccount(account(acc.GetSettingsJson()))
	require.NoError(t, err)
	assert.Same(t, first, again)
	other, err := c.forAccount(account(`{}`))
	require.NoError(t, err)
	assert.NotSame(t, first, other)

	_, err = c.BuildUpstreamRequest(context.Background(), buildRequest(account(`{"upstream":{"classify":"openai"}}`), "m"))
	assert.Equal(t, codes.FailedPrecondition, status.Code(err))
	v, err := c.ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: "t",
		CredentialsJson: `{"api_key":"sk-account-key"}`, SettingsJson: `{"upstream":{"classify":"openai"}}`})
	require.NoError(t, err)
	require.NotEmpty(t, v.GetErrors())
	assert.Equal(t, upstream.SettingsField+".classify", v.GetErrors()[0].GetField(), "a problem is reported at its path in the layer")
}

func (e *extender) OnAccountLifecycle(context.Context, *pluginv1.AccountLifecycleRequest) (*pluginv1.AccountLifecycleResponse, error) {
	return &pluginv1.AccountLifecycleResponse{SettingsJson: `{"from":"plugin"}`}, nil
}

func (e *extender) CheckModelAvailability(context.Context, *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
	return &pluginv1.CheckModelAvailabilityResponse{}, nil
}

// A gRPC plugin declaring its type's upstream keeps its optional
// per-account-type hooks: the client forwards them when the plugin has
// them, and answers Unimplemented otherwise.
func TestOptionalHooksGoToThePlugin(t *testing.T) {
	p := profile(t, `{"preset":"anthropic"}`)
	c := New(p, &extender{})
	life, err := c.OnAccountLifecycle(context.Background(), &pluginv1.AccountLifecycleRequest{})
	require.NoError(t, err)
	assert.Equal(t, `{"from":"plugin"}`, life.GetSettingsJson())
	_, err = c.CheckModelAvailability(context.Background(), &pluginv1.CheckModelAvailabilityRequest{})
	require.NoError(t, err)

	// Only the PlatformPlugin methods: no lifecycle, no availability check.
	bare := struct{ core.PlatformPlugin }{pluginv1.UnimplementedPlatformServiceServer{}}
	for _, c := range []*Client{New(p, nil), New(p, bare)} {
		_, err = c.OnAccountLifecycle(context.Background(), &pluginv1.AccountLifecycleRequest{})
		assert.Equal(t, codes.Unimplemented, status.Code(err))
		_, err = c.CheckModelAvailability(context.Background(), &pluginv1.CheckModelAvailabilityRequest{})
		assert.Equal(t, codes.Unimplemented, status.Code(err))
	}
}
