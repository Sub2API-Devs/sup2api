package gateway

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Rewrites in the format of the request parameter override (CONTRACTS §84)
// run before BuildUpstreamRequest (docs/UPSTREAM-DECLARATIVE.md §4.3): the
// account type's declared upstream first (core.DeclaredUpstream.PrepareBody:
// filtered fields, the manifest's paramOverride), then the gateway's built-in
// override (claude_max_tokens.go), then the account's own override. The
// plugin builds from the result, with meta.model the model the override
// settled on, and its patches may still change it (user decision,
// 2026-11-09). The account override's header decisions still apply over the
// plugin's headers (forwardBuilt).

// paramOverrideState is what the rewrites decided for the current attempt:
// the headers forwardBuilt applies and, when a rewrite changed the body's
// model, that upstream model.
type paramOverrideState struct {
	// declared are the header decisions of the declared paramOverride,
	// applied with the built headers.
	declared core.HeaderOverride
	// headers are the account override's, applied after the passthrough.
	headers core.HeaderOverride
	model   string
}

// overrideRun runs one rewrite on a body.
type overrideRun func(body []byte, in *core.ParamOverrideContext) (core.ParamOverrideResult, error)

// overrideBody runs a rewrite on the upstream body of attempt n whose
// upstream model so far is upModel. When the rewrite itself changes the
// body's model (a model a plugin patch wrote is not the rewrite's), that
// model goes upstream and is recorded; billing keeps the client's. It
// returns the body, the upstream model and the header decisions, or the
// attempt's end; what names the rewrite in errors.
func (c *call) overrideBody(ctx context.Context, acc *core.Account, rt *typeRoute, body []byte, upModel string, n int, run overrideRun, what string) ([]byte, string, core.HeaderOverride, *attemptResult) {
	out, err := run(body, c.paramOverrideContext(acc, rt, upModel, n))
	if err != nil {
		return nil, "", core.HeaderOverride{}, c.paramOverrideFailure(ctx, acc, what, err)
	}
	if rt.modelPath != "" {
		m := gjson.GetBytes(out.Body, rt.modelPath)
		if m.Type == gjson.String && m.Str != upModel && m.Str != gjson.GetBytes(body, rt.modelPath).Str {
			upModel = m.Str
			c.paramOverride.model = upModel
			c.rec.UpstreamModel, c.upstreamPrimaryModel = upModel, upModel
		}
	}
	return out.Body, upModel, out.Headers, nil
}

// prepareDeclared runs the declaration's part of the body of a declared
// account type before BuildUpstreamRequest; other types are left alone.
func (c *call) prepareDeclared(ctx context.Context, acc *core.Account, rt *typeRoute, pacct *pluginv1.Account, body []byte, upModel string, n int) ([]byte, string, *attemptResult) {
	c.paramOverride = paramOverrideState{}
	d, ok := rt.binding.Client.(core.DeclaredUpstream)
	if !ok {
		return body, upModel, nil
	}
	run := func(b []byte, in *core.ParamOverrideContext) (core.ParamOverrideResult, error) {
		return d.PrepareBody(pacct, b, in)
	}
	var failure *attemptResult
	body, upModel, c.paramOverride.declared, failure = c.overrideBody(ctx, acc, rt, body, upModel, n, run, "upstream declaration")
	return body, upModel, failure
}

// rewriteBody runs the rewrites of an attempt's body before
// BuildUpstreamRequest: the declaration's part, the built-in override, then
// the account's override.
func (c *call) rewriteBody(ctx context.Context, acc *core.Account, rt *typeRoute, pacct *pluginv1.Account, body []byte, upModel string, n int) ([]byte, string, *attemptResult) {
	body, upModel, failure := c.prepareDeclared(ctx, acc, rt, pacct, body, upModel, n)
	if failure != nil {
		return nil, "", failure
	}
	if body, upModel, failure = c.overrideBuiltin(ctx, acc, rt, body, upModel, n); failure != nil {
		return nil, "", failure
	}
	return c.overrideAccount(ctx, acc, rt, body, upModel, n)
}

// overrideBuiltin runs the gateway's built-in override of the route's
// upstream protocol on body. It sets no headers.
func (c *call) overrideBuiltin(ctx context.Context, acc *core.Account, rt *typeRoute, body []byte, upModel string, n int) ([]byte, string, *attemptResult) {
	p := c.gw.ClaudeMaxTokens.overrideFor(rt.upstream)
	if p == nil {
		return body, upModel, nil
	}
	body, upModel, _, failure := c.overrideBody(ctx, acc, rt, body, upModel, n, p.Apply, builtinOverride)
	return body, upModel, failure
}

// overrideAccount runs the account's override on body; its header
// decisions are kept for forwardBuilt.
func (c *call) overrideAccount(ctx context.Context, acc *core.Account, rt *typeRoute, body []byte, upModel string, n int) ([]byte, string, *attemptResult) {
	if acc == nil || acc.ParamOverride == nil {
		return body, upModel, nil
	}
	var failure *attemptResult
	body, upModel, c.paramOverride.headers, failure = c.overrideBody(ctx, acc, rt, body, upModel, n, acc.ParamOverride.Apply, accountOverride)
	return body, upModel, failure
}

// declaredTarget is the URL to send: a declared type's URL is rendered
// again when the plugin's patches changed the body's model away from the
// one it was built for, so a model in the path follows the body; a code
// plugin's URL is its own.
func (c *call) declaredTarget(rt *typeRoute, request *pluginv1.BuildUpstreamRequestRequest, built *pluginv1.BuildUpstreamRequestResponse, body []byte) (string, *attemptResult) {
	d, ok := rt.binding.Client.(core.DeclaredUpstream)
	if !ok || rt.modelPath == "" {
		return built.GetUrl(), nil
	}
	m := gjson.GetBytes(body, rt.modelPath)
	if m.Type != gjson.String || m.Str == request.GetMeta().GetModel() {
		return built.GetUrl(), nil
	}
	target, err := d.UpstreamURL(request, built, m.Str)
	if err != nil {
		return "", &attemptResult{kind: attemptFailover, err: fromCore(core.ErrPluginUnavailable.WithCause(err), errTypePluginUnavailable)}
	}
	return target, nil
}

// rewriteTurn runs the rewrites of a WebSocket turn's message before the
// plugin's patches, as on HTTP. The account override's header decisions do
// not apply: the connection's headers were sent with the handshake.
func (c *call) rewriteTurn(ctx context.Context, acc *core.Account, rt *typeRoute, pacct *pluginv1.Account, payload []byte, n int) ([]byte, *gwError) {
	if acc == nil {
		return payload, nil
	}
	payload, _, failure := c.rewriteBody(ctx, acc, rt, pacct, payload, c.upstreamModel(acc), n)
	return payload, failureErr(failure)
}

func failureErr(r *attemptResult) *gwError {
	if r == nil {
		return nil
	}
	return r.err
}

// accountOverride and builtinOverride name the overrides in errors.
const (
	accountOverride = "account request parameter override"
	builtinOverride = "built-in request parameter override"
)

// paramOverrideContext is the context the override's conditions read.
func (c *call) paramOverrideContext(acc *core.Account, rt *typeRoute, upModel string, n int) *core.ParamOverrideContext {
	in := &core.ParamOverrideContext{Model: upModel, OriginalModel: c.model, RetryIndex: n, AccountID: acc.ID, Stream: c.stream || c.forcesStream(rt)}
	if c.c != nil && c.c.Request != nil {
		in.RequestPath, in.Headers = c.c.Request.URL.Path, c.c.Request.Header
	}
	if c.principal != nil {
		in.UserID, in.Group = c.principal.UserID, c.principal.Group.Name
	}
	return in
}

// paramOverrideFailure ends an attempt a rewrite stopped. A return_error
// operation answers the client (skip_retry) or fails over; an operation that
// could not run fails over. Neither blames the account.
func (c *call) paramOverrideFailure(ctx context.Context, acc *core.Account, what string, err error) *attemptResult {
	var returned *core.ParamOverrideError
	if errors.As(err, &returned) {
		kind := attemptFailover
		if returned.SkipRetry {
			kind = attemptReturn
		}
		return &attemptResult{kind: kind, err: &gwError{Status: returned.Status, Code: returned.Code, Type: returned.Type,
			Message: returned.Message, RecordType: errTypeInvalidRequest, NeutralReason: "param_override"}}
	}
	slog.WarnContext(ctx, "gateway: "+what+" failed", "request_id", c.rid, "account", acc.ID, "err", err)
	return &attemptResult{kind: attemptFailover, err: &gwError{Status: http.StatusInternalServerError, Code: "param_override_failed",
		Message: what + " failed: " + err.Error(), RecordType: errTypeInternal, NeutralReason: "param_override"}}
}

// upstreamModel is the model attempt sends upstream: a rewrite's when one
// changed the body's model, else the account's mapping of the client's.
func (c *call) upstreamModel(acc *core.Account) string {
	if c.paramOverride.model != "" {
		return c.paramOverride.model
	}
	return acc.MapModel(c.model)
}
