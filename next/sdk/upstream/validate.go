package upstream

import (
	"errors"
	"slices"
	"time"

	"github.com/tidwall/sjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/paramoverride"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/classify"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/providers/anthropic"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/providers/gemini"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/providers/openai"
)

// policies are the error policies upstream.classify names.
var policies = map[string]classify.Policy{
	"openai":    openai.Policy,
	"anthropic": anthropic.Policy,
	"gemini":    gemini.Policy,
}

// pings are the built-in test bodies upstream.test.body names: the
// providers' one-token probes every plugin of that family sends.
var pings = map[string]func(model string) string{
	"openai.chat_ping": func(m string) string { return openai.ChatPingBody(m, 1) },
	"anthropic.ping":   func(m string) string { return anthropic.MessagesPingBody(m, 1) },
	"gemini.ping":      func(string) string { return gemini.GenerateContentPingBody(1) },
}

// Validate implements ValidateCredentials: apikey.Spec.Validate, and for an
// accountConfig type the account layer in settings "upstream", checked the
// way requests will use it. Each problem of the layer is one field error at
// "upstream.<path in the layer>" ("upstream" when it has no path), so a
// form shows it next to the part it is about.
func (p *Profile) Validate(in *pluginv1.ValidateCredentialsRequest) *pluginv1.ValidateCredentialsResponse {
	resp := p.spec.Validate(in)
	if !p.up.AccountConfig || len(resp.GetErrors()) > 0 {
		return resp
	}
	raw, err := accountLayer(in.GetCredentialsJson(), in.GetSettingsJson())
	if err == nil && raw != nil {
		_, err = p.withAccount(raw)
	}
	if err == nil {
		return resp
	}
	var errs pluginsdk.FieldErrors
	for _, pr := range asProblems(err) {
		field := SettingsField
		if pr.Path != "" {
			field += "." + pr.Path
		}
		errs = errs.Add(field, pr.Code, pr.Message)
	}
	return &pluginv1.ValidateCredentialsResponse{Errors: errs}
}

func asProblems(err error) Problems {
	var ps Problems
	if errors.As(err, &ps) {
		return ps
	}
	return Problems{{Code: "invalid", Message: err.Error()}}
}

// Classify implements ClassifyError with the declared provider policy.
func (p *Profile) Classify(now time.Time, in *pluginv1.ClassifyErrorRequest) *pluginv1.ClassifyErrorResponse {
	return p.policy.Classify(now, in)
}

// PrepareBody is the declaration's part of the request body that precedes
// Build's patches (§4.3): the filterFields the account did not allow are
// removed, then the manifest's paramOverride runs (its header decisions are
// in the result). The core calls it after model mapping and protocol
// conversion; the account's own §84 override runs last, after every patch.
func (p *Profile) PrepareBody(acc *pluginv1.Account, body []byte, ctx *paramoverride.Context) (paramoverride.Result, error) {
	ap, err := p.forAccount(acc)
	if err != nil {
		return paramoverride.Result{}, err
	}
	for _, f := range ap.up.FilterFields {
		if !slices.Contains(ap.allow, f) {
			if out, err := sjson.DeleteBytes(body, f); err == nil {
				body = out // f is a plain key (checked): a literal path
			}
		}
	}
	return ap.override.Apply(body, ctx)
}
