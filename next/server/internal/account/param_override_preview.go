package account

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// paramOverridePreview is the answer of a dry run: the body that would go
// upstream and the header decisions, or the error a return_error operation
// answers, or why an operation could not run on the sample.
type paramOverridePreview struct {
	Body          json.RawMessage          `json:"body"`
	SetHeaders    map[string]string        `json:"set_headers"`
	DeleteHeaders []string                 `json:"delete_headers"`
	ReturnError   *core.ParamOverrideError `json:"return_error"`
	Error         *string                  `json:"error"`
}

// previewParamOverride runs a request parameter override on a sample request
// without saving anything (CONTRACTS §84): the console's dry run. The model
// is the context's model, upstream_model and original_model (the body's
// model when omitted); headers are the client request headers.
func (s *Service) previewParamOverride(c *gin.Context) {
	ctx := c.Request.Context()
	var in struct {
		ParamOverride json.RawMessage   `json:"param_override"`
		Body          json.RawMessage   `json:"body"`
		Model         string            `json:"model"`
		Headers       map[string]string `json:"headers"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	p, fe := core.CompileParamOverride(ctx, "param_override", in.ParamOverride)
	body := bytes.TrimSpace(in.Body)
	if len(body) == 0 || string(body) == "null" {
		body = []byte("{}")
	}
	if !gjson.ParseBytes(body).IsObject() {
		fe = append(fe, core.FieldError{Field: "body", Code: "invalid", Message: t(ctx, "must be a JSON object", "必须是 JSON 对象")})
	}
	if len(fe) > 0 {
		httpapi.Fail(c, core.InvalidFields(fe...))
		return
	}
	model := in.Model
	if model == "" {
		model = gjson.GetBytes(body, "model").String()
	}
	headers := http.Header{}
	for k, v := range in.Headers {
		headers.Set(k, v)
	}
	uid, _ := core.UserID(ctx)
	out, err := p.Apply(body, &core.ParamOverrideContext{Model: model, OriginalModel: model, Headers: headers, UserID: uid,
		Stream: gjson.GetBytes(body, "stream").Bool()})
	res := paramOverridePreview{Body: out.Body, SetHeaders: out.Headers.Set, DeleteHeaders: out.Headers.Delete}
	var returned *core.ParamOverrideError
	switch {
	case errors.As(err, &returned):
		res.ReturnError = returned
	case err != nil:
		msg := err.Error()
		res.Error = &msg
	}
	if res.SetHeaders == nil {
		res.SetHeaders = map[string]string{}
	}
	if res.DeleteHeaders == nil {
		res.DeleteHeaders = []string{}
	}
	httpapi.OK(c, res)
}
