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
// run at two points of an attempt (docs/UPSTREAM-DECLARATIVE.md §4.3):
//
//   - before BuildUpstreamRequest, the account type's declared upstream
//     (core.DeclaredUpstream.PrepareBody: filtered fields, the manifest's
//     paramOverride);
//   - after the declaration's and the plugin's patches, the account's own
//     override (forwardBuilt, also for each request an executing plugin
//     forwards): it has the last word on the body, and the plugin builds
//     from the body before it, with meta.model the mapped model.

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

// overrideBuilt runs the account's override on the body the declaration's
// and the plugin's patches produced. When it changes the model, a declared
// type's URL is rendered again for it (core.DeclaredUpstream.UpstreamURL)
// so a model in the path follows the body; a code plugin's URL is kept and
// only the body changes. It returns the body, the URL and the upstream
// model to send.
func (c *call) overrideBuilt(ctx context.Context, acc *core.Account, rt *typeRoute, request *pluginv1.BuildUpstreamRequestRequest, built *pluginv1.BuildUpstreamRequestResponse, body []byte) ([]byte, string, string, *attemptResult) {
	c.paramOverride.headers = core.HeaderOverride{}
	target, model := built.GetUrl(), built.GetUpstreamModel()
	if acc.ParamOverride == nil {
		return body, target, model, nil
	}
	// The model the plugin was given: every request an executing plugin
	// forwards is compared with it, not with an earlier one's override.
	before := request.GetMeta().GetModel()
	body, after, headers, failure := c.overrideBody(ctx, acc, rt, body, before, int(request.GetAttempt()), acc.ParamOverride.Apply, accountOverride)
	c.paramOverride.headers = headers
	if failure != nil || after == before {
		return body, target, model, failure
	}
	if d, ok := rt.binding.Client.(core.DeclaredUpstream); ok {
		var err error
		if target, err = d.UpstreamURL(request, built, after); err != nil {
			return nil, "", "", &attemptResult{kind: attemptFailover, err: fromCore(core.ErrPluginUnavailable.WithCause(err), errTypePluginUnavailable)}
		}
	}
	return body, target, after, nil
}

// overrideTurn runs the account's override on a WebSocket turn's message,
// after the plugin's patches. Its header decisions do not apply: the
// connection's headers were sent with the handshake.
func (c *call) overrideTurn(ctx context.Context, acc *core.Account, rt *typeRoute, payload []byte, n int) ([]byte, *gwError) {
	if acc == nil || acc.ParamOverride == nil {
		return payload, nil
	}
	payload, _, _, failure := c.overrideBody(ctx, acc, rt, payload, c.upstreamModel(acc), n, acc.ParamOverride.Apply, accountOverride)
	return payload, failureErr(failure)
}

// prepareTurn runs the declaration's part of a WebSocket turn's message of
// a declared account type, before the plugin's patches.
func (c *call) prepareTurn(ctx context.Context, acc *core.Account, rt *typeRoute, pacct *pluginv1.Account, payload []byte, n int) ([]byte, *gwError) {
	if acc == nil {
		return payload, nil
	}
	payload, _, failure := c.prepareDeclared(ctx, acc, rt, pacct, payload, c.upstreamModel(acc), n)
	return payload, failureErr(failure)
}

func failureErr(r *attemptResult) *gwError {
	if r == nil {
		return nil
	}
	return r.err
}

// accountOverride names the account's override in errors.
const accountOverride = "account request parameter override"

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
