package upstream

import (
	"bytes"
	"encoding/json"
	"fmt"
	"maps"
	"net/url"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/apikey"
)

// call is one request being built for one account.
type call struct {
	p   *Profile // with the account layer applied
	cfg *apikey.Config
	acc *pluginv1.Account
}

// newCall resolves the account: its type, its account layer and its
// api_key / base_url (apikey.Spec.FromAccount, errors as it returns them).
func (p *Profile) newCall(acc *pluginv1.Account) (*call, error) {
	if t := acc.GetType(); t != "" && t != p.accountType {
		return nil, status.Errorf(codes.FailedPrecondition, "account %d: unsupported account type %q", acc.GetId(), t)
	}
	cfg, err := p.spec.FromAccount(acc)
	if err != nil {
		return nil, err
	}
	ap, err := p.forAccount(acc)
	if err != nil {
		return nil, err
	}
	return &call{p: ap, cfg: cfg, acc: acc}, nil
}

// route is the route of protocol, the default protocol when it is empty.
func (c *call) route(protocol string) (*manifest.UpstreamRoute, error) {
	name := protocol
	if name == "" {
		name = c.p.up.DefaultProtocol
	}
	if r := c.p.up.Routes[name]; r != nil {
		return r, nil
	}
	return nil, status.Errorf(codes.InvalidArgument, "unsupported upstream protocol %q", protocol)
}

// values are the template variables of the call. inbound is filtered like
// apikey.ForwardHeaders: the client headers the type receives, trimmed,
// blank ones dropped.
func (c *call) values(model string, inbound map[string]string) *values {
	h := map[string]string{}
	apikey.ForwardHeaders(h, inbound, c.p.passHeaders)
	return &values{apiKey: c.cfg.APIKey, baseURL: c.cfg.BaseURL, model: model, header: h, field: c.field}
}

// field reads {credentials.<k>}: credentials first, then settings; a
// string as it is, a number or boolean as its JSON text.
func (c *call) field(k string) (string, bool) {
	creds, _ := apikey.DecodeObject(c.acc.GetCredentialsJson())
	settings, _ := apikey.DecodeObject(c.acc.GetSettingsJson())
	v, ok := apikey.Lookup(k, creds, settings)
	switch v := v.(type) {
	case string:
		return v, v != ""
	case float64, bool:
		b, _ := json.Marshal(v)
		return string(b), ok
	}
	return "", false
}

// url renders route's URL: base URL, path and query, the auth query
// parameter, and the ws(s) scheme of a websocket route.
func (c *call) url(r *manifest.UpstreamRoute, v *values) string {
	pathPart, query, hasQuery := strings.Cut(r.Path, "?")
	u, _ := v.render(pathPart, url.PathEscape)
	u = c.cfg.BaseURL + u
	if hasQuery {
		q, _ := v.render(query, url.QueryEscape)
		u += "?" + q
	}
	if a := c.p.up.Auth; a.Type == manifest.UpstreamAuthQuery {
		if value, ok := v.render(a.Value, nil); ok {
			sep := "?"
			if hasQuery {
				sep = "&"
			}
			u += sep + url.QueryEscape(a.Name) + "=" + url.QueryEscape(value)
		}
	}
	if r.Transport == manifest.TransportWebSocket {
		// The base URL is a normalized http(s) URL (apikey.NormalizeBaseURL).
		u = "ws" + strings.TrimPrefix(u, "http")
	}
	return u
}

// headers builds the request headers (§2.2): the client headers the type
// receives (v.header), then the shared and the route's header writes, then
// auth. r is nil for the model listing, which only takes the shared headers.
func (c *call) headers(r *manifest.UpstreamRoute, v *values) map[string]string {
	h := maps.Clone(v.header)
	writes := map[string]*manifest.HeaderWrite{}
	maps.Copy(writes, c.p.up.Headers)
	if r != nil {
		for name, w := range r.Headers {
			writes[name] = w // nil removes a shared write
		}
	}
	for name, w := range writes {
		if w != nil {
			write(h, name, w, v)
		}
	}
	if a := c.p.up.Auth; a.Type == manifest.UpstreamAuthHeader {
		if value, ok := v.render(a.Value, nil); ok {
			h[a.Name] = value
		}
	}
	return h
}

// write applies one header write; a template missing a value writes nothing.
func write(h map[string]string, name string, w *manifest.HeaderWrite, v *values) {
	tpl := w.Set + w.Default + w.Append // exactly one is set
	value, ok := v.render(tpl, nil)
	if !ok {
		return
	}
	cur := h[name]
	switch {
	case w.Set != "", cur == "":
		h[name] = value
	case w.Append != "" && !hasToken(cur, value):
		h[name] = cur + "," + value
	}
}

// hasToken reports whether the comma-separated list cur already holds
// value; for a "key=version" value any version of the key counts, so a
// client that names its own version keeps it (openai-beta
// responses_websockets=...).
func hasToken(cur, value string) bool {
	key, _, versioned := strings.Cut(value, "=")
	for _, t := range strings.Split(cur, ",") {
		t = strings.TrimSpace(t)
		if t == value || (versioned && strings.HasPrefix(t, key+"=")) {
			return true
		}
	}
	return false
}

// model is the upstream model of route r (§2.1).
func model(r *manifest.UpstreamRoute, in *pluginv1.BuildUpstreamRequestRequest) (string, error) {
	m := manifest.RouteModel{}
	if r.Model != nil {
		m = *r.Model
	}
	name := pluginsdk.RequestModel(in)
	if m.From == manifest.ModelFromMeta {
		name = in.GetMeta().GetModel()
	}
	if m.TrimPrefix != "" {
		name = normalizeModel(name, m.TrimPrefix)
	}
	if m.Required && name == "" {
		return "", status.Error(codes.InvalidArgument, requiredModelMessage(r.Path))
	}
	return name, nil
}

// normalizeModel removes surrounding spaces and prefix ("models/<id>", the
// resource name form of Gemini).
func normalizeModel(name, prefix string) string {
	return strings.TrimPrefix(strings.TrimSpace(name), prefix)
}

// requiredModelMessage names where the model was expected: the path up to
// the {model} parameter and the character after it.
func requiredModelMessage(path string) string {
	i := strings.Index(path, "{model}")
	if i < 0 {
		return "model is required"
	}
	end := min(len(path), i+len("{model}")+1)
	return fmt.Sprintf("model is required (path %s...)", path[:end])
}

// Build implements BuildUpstreamRequest (§2.1, §2.2): the route of
// meta.protocol, the model it names, the headers and the route's patches.
// The manifest's paramOverride and filterFields are not patches: the core
// applies them to the body first (PrepareBody).
func (p *Profile) Build(in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	c, r, err := p.target(in)
	if err != nil {
		return nil, err
	}
	m, err := model(r, in)
	if err != nil {
		return nil, err
	}
	v := c.values(m, in.GetInboundHeaders())
	resp := &pluginv1.BuildUpstreamRequestResponse{
		Method:        method(r),
		Url:           c.url(r, v),
		Headers:       c.headers(r, v),
		UpstreamModel: m,
	}
	if r.Transport == manifest.TransportWebSocket {
		delete(resp.Headers, "content-type") // a handshake has no body
		return resp, nil
	}
	for _, pt := range r.Patches {
		if pt.When == manifest.PatchWhenStream && !in.GetMeta().GetStream() {
			continue
		}
		bp := &pluginv1.BodyPatch{Op: pluginv1.BodyPatch_OP_DELETE, Path: pt.Path}
		if pt.Op == "set" {
			bp.Op, bp.ValueJson = pluginv1.BodyPatch_OP_SET, compact(pt.Value)
		}
		resp.Patches = append(resp.Patches, bp)
	}
	return resp, nil
}

// URL is the upstream URL Build would return for in with model as the
// upstream model. The core calls it when the account's parameter override
// (§84, applied after Build) changed the model, so a model in the path
// follows the model really sent (§4.3).
func (p *Profile) URL(in *pluginv1.BuildUpstreamRequestRequest, upstreamModel string) (string, error) {
	c, r, err := p.target(in)
	if err != nil {
		return "", err
	}
	return c.url(r, c.values(upstreamModel, nil)), nil
}

// target resolves the account of in and the route of its protocol.
func (p *Profile) target(in *pluginv1.BuildUpstreamRequestRequest) (*call, *manifest.UpstreamRoute, error) {
	c, err := p.newCall(in.GetAccount())
	if err != nil {
		return nil, nil, err
	}
	r, err := c.route(in.GetMeta().GetProtocol())
	return c, r, err
}

func method(r *manifest.UpstreamRoute) string {
	switch {
	case r.Transport == manifest.TransportWebSocket:
		return "GET"
	case r.Method == "":
		return "POST"
	}
	return r.Method
}

func compact(raw json.RawMessage) string {
	var buf bytes.Buffer
	_ = json.Compact(&buf, raw) // checked valid by Resolve
	return buf.String()
}

// Test implements BuildTestRequest: the test protocol's route with the test
// body, no client headers. The console's model is normalized like a model of
// that route; without one the declared test model is used.
func (p *Profile) Test(in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	c, err := p.newCall(in.GetAccount())
	if err != nil {
		return nil, err
	}
	t := c.p.up.Test
	if t == nil {
		return nil, status.Error(codes.Unimplemented, "the upstream declares no test request")
	}
	r := c.p.up.Routes[t.Protocol]
	prefix := ""
	if r.Model != nil {
		prefix = r.Model.TrimPrefix
	}
	m := normalizeModel(in.GetModel(), prefix)
	if m == "" {
		m = t.Model
	}
	v := c.values(m, nil)
	return &pluginv1.BuildTestRequestResponse{
		Method:        method(r),
		Url:           c.url(r, v),
		Headers:       c.headers(r, v),
		BodyJson:      testBody(t.Body, m),
		Model:         m,
		UsageProtocol: t.Protocol,
	}, nil
}

// testBody is a built-in ping or the JSON template with {model} filled in.
func testBody(body, model string) string {
	if ping, ok := pings[body]; ok {
		return ping(model)
	}
	s, _ := (&values{model: model}).render(body, func(s string) string {
		b, _ := json.Marshal(s)
		return string(b[1 : len(b)-1])
	})
	return s
}

// Models implements BuildModelsRequest (apikey.ModelListRequest): GET on the
// listing path with the shared headers and auth, without content-type.
func (p *Profile) Models(in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	c, err := p.newCall(in.GetAccount())
	if err != nil {
		return nil, err
	}
	m := c.p.up.Models
	if m == nil {
		return nil, status.Error(codes.Unimplemented, "the upstream has no model list")
	}
	v := c.values("", nil)
	h := c.headers(nil, v)
	delete(h, "content-type") // nothing is sent in the body
	return &pluginv1.BuildModelsRequestResponse{
		Method:      "GET",
		Url:         c.url(&manifest.UpstreamRoute{Path: m.Path}, v),
		Headers:     h,
		IdsPath:     m.IDPath,
		StripPrefix: m.StripPrefix,
	}, nil
}
