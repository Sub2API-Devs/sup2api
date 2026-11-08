package gateway

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// paramOverrideState is what the account's request parameter override
// (CONTRACTS §84) decided for the current attempt: the headers forwardBuilt
// applies and, when the override rewrote the body's model, that upstream
// model.
type paramOverrideState struct {
	headers core.HeaderOverride
	model   string
}

// applyParamOverride runs the account's override on the upstream body of
// attempt n, after the model mapping and before the plugin sees the request.
// It returns the body and the upstream model, or the attempt's end.
func (c *call) applyParamOverride(ctx context.Context, acc *core.Account, rt *typeRoute, body []byte, upModel string, n int) ([]byte, string, *attemptResult) {
	c.paramOverride = paramOverrideState{}
	if acc.ParamOverride == nil {
		return body, upModel, nil
	}
	out, err := acc.ParamOverride.Apply(body, c.paramOverrideContext(acc, rt, upModel, n))
	if err != nil {
		return nil, "", c.paramOverrideFailure(ctx, acc, err)
	}
	c.paramOverride.headers = out.Headers
	if rt.modelPath != "" {
		if m := gjson.GetBytes(out.Body, rt.modelPath); m.Type == gjson.String && m.Str != upModel {
			// The override's model goes upstream; billing keeps the client's.
			upModel = m.Str
			c.paramOverride.model = upModel
			c.rec.UpstreamModel, c.upstreamPrimaryModel = upModel, upModel
		}
	}
	return out.Body, upModel, nil
}

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

// paramOverrideFailure ends an attempt the override stopped. A return_error
// operation answers the client (skip_retry) or fails over; an operation that
// could not run fails over. Neither blames the account.
func (c *call) paramOverrideFailure(ctx context.Context, acc *core.Account, err error) *attemptResult {
	var returned *core.ParamOverrideError
	if errors.As(err, &returned) {
		kind := attemptFailover
		if returned.SkipRetry {
			kind = attemptReturn
		}
		return &attemptResult{kind: kind, err: &gwError{Status: returned.Status, Code: returned.Code, Type: returned.Type,
			Message: returned.Message, RecordType: errTypeInvalidRequest, NeutralReason: "param_override"}}
	}
	slog.WarnContext(ctx, "gateway: account param override failed", "request_id", c.rid, "account", acc.ID, "err", err)
	return &attemptResult{kind: attemptFailover, err: &gwError{Status: http.StatusInternalServerError, Code: "param_override_failed",
		Message: "account request parameter override failed: " + err.Error(), RecordType: errTypeInternal, NeutralReason: "param_override"}}
}

// upstreamModel is the model attempt sends upstream: the override's when it
// rewrote the body's model, else the account's mapping of the client's.
func (c *call) upstreamModel(acc *core.Account) string {
	if c.paramOverride.model != "" {
		return c.paramOverride.model
	}
	return acc.MapModel(c.model)
}
