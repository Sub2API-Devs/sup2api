package upstream

import (
	"encoding/json"
	"fmt"
	"regexp"
	"slices"
	"sort"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/paramoverride"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/apikey"
)

// Problem is one invalid part of a declaration. Path is the location inside
// the upstream object ("routes.openai.chat.path"); Code is a stable machine
// code in the vocabulary of manifest/check.
type Problem struct {
	Path    string
	Code    string
	Message string
}

// Problems are all problems of one declaration; Resolve returns them as its
// error.
type Problems []Problem

func (ps Problems) Error() string {
	parts := make([]string, len(ps))
	for i, p := range ps {
		parts[i] = p.Message
		if p.Path != "" {
			parts[i] = p.Path + ": " + p.Message
		}
	}
	return strings.Join(parts, "; ")
}

var (
	// fieldRe names a credentials/settings field and a filtered body field:
	// a plain top-level key, so it is also a literal gjson/sjson path.
	fieldRe = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_-]{0,63}$`)
	methods = []string{"GET", "POST", "PUT", "PATCH", "DELETE"}
)

// checker collects the problems of one resolved declaration.
type checker struct {
	up          *manifest.Upstream
	passHeaders []string
	probs       Problems
}

func (c *checker) add(path, code, format string, args ...any) {
	c.probs = append(c.probs, Problem{Path: path, Code: code, Message: fmt.Sprintf(format, args...)})
}

// check validates a merged declaration; paramOverride is compiled by the
// caller (an account layer cannot change it, so it is compiled once).
func check(up *manifest.Upstream, passHeaders []string) Problems {
	c := &checker{up: up, passHeaders: passHeaders}
	c.baseURL()
	c.credentials()
	c.auth()
	c.headers("headers", up.Headers)
	c.routes()
	if p := up.DefaultProtocol; p != "" && up.Routes[p] == nil {
		c.add("defaultProtocol", "unknown_protocol", "protocol %q has no route", p)
	}
	for i, f := range up.FilterFields {
		if !fieldRe.MatchString(f) {
			c.add(fmt.Sprintf("filterFields[%d]", i), "invalid", "%q is not a top-level field name", f)
		}
	}
	if _, ok := policies[up.Classify]; !ok {
		c.add("classify", "invalid", "classify must be openai, anthropic or gemini")
	}
	c.test()
	c.models()
	return c.probs
}

func (c *checker) baseURL() {
	b := c.up.BaseURL
	switch {
	case b == nil || (b.Default == "" && !b.Required):
		c.add("baseURL.default", "required", "a default base URL is required unless baseURL.required is set")
	case b.Default != "":
		if _, err := apikey.NormalizeBaseURL(b.Default, nil); err != nil {
			c.add("baseURL.default", "invalid_url", "default %v", err)
		}
	}
}

func (c *checker) credentials() {
	cr := c.up.Credentials
	if cr == nil {
		return
	}
	if kv := cr.KeyValidator; kv != nil && kv.MinLength < 0 {
		c.add("credentials.keyValidator.minLength", "invalid", "minLength must not be negative")
	}
	for i, f := range cr.Fields {
		// api_key and base_url have their own variables: {api_key} is
		// confined to auth, which {credentials.api_key} would bypass.
		if !fieldRe.MatchString(f) || f == "api_key" || f == "base_url" {
			c.add(fmt.Sprintf("credentials.fields[%d]", i), "invalid", "%q is not a field templates may read", f)
		}
	}
}

func (c *checker) auth() {
	a := c.up.Auth
	if a == nil {
		c.add("auth", "required", "auth is required (type none for an upstream without credentials)")
		return
	}
	switch a.Type {
	case manifest.UpstreamAuthHeader:
		// Unlike every other header, auth may write a credential header:
		// it is the one place the account's credential is sent from.
		switch {
		case !paramoverride.ValidHeaderName(a.Name) || strings.ToLower(a.Name) != a.Name:
			c.add("auth.name", "invalid", "auth.name must be a lower-case header name")
		case paramoverride.HeaderBlocked(a.Name) && !paramoverride.CredentialHeader(a.Name):
			c.add("auth.name", "blocked", "header %s cannot carry the credential (hop-by-hop, client address or gateway control header)", a.Name)
		}
		c.template("auth.value", a.Value, placeAuth, true)
	case manifest.UpstreamAuthQuery:
		if a.Name == "" {
			c.add("auth.name", "required", "auth.name is required")
		}
		c.template("auth.value", a.Value, placeAuth, true)
	case manifest.UpstreamAuthNone:
		if a.Name != "" || a.Value != "" {
			c.add("auth", "invalid", "auth type none takes no name or value")
		}
	default:
		c.add("auth.type", "invalid", "auth.type must be header, query or none")
	}
}

// headers checks header writes: lower-case names, none blocked (§81) and
// not the auth header, exactly one write mode with a header template.
func (c *checker) headers(path string, hs map[string]*manifest.HeaderWrite) {
	for _, name := range sortedKeys(hs) {
		f, w := path+"."+name, hs[name]
		if w == nil {
			continue // removes a lower layer's or the shared write
		}
		switch {
		case !paramoverride.ValidHeaderName(name) || strings.ToLower(name) != name:
			c.add(f, "invalid", "header names are lower-case HTTP field names")
		case paramoverride.HeaderBlocked(name):
			c.add(f, "blocked", "header %s cannot be written (credential, hop-by-hop, client address or gateway control header); credentials go in auth", name)
		case c.up.Auth != nil && c.up.Auth.Type == manifest.UpstreamAuthHeader && name == c.up.Auth.Name:
			c.add(f, "blocked", "header %s is written by auth only", name)
		}
		modes := 0
		for _, v := range []string{w.Set, w.Default, w.Append} {
			if v != "" {
				modes++
				c.template(f, v, placeHeader, true)
			}
		}
		if modes != 1 {
			c.add(f, "invalid", "a header write is exactly one of set, default or append")
		}
	}
}

func (c *checker) routes() {
	if len(c.up.Routes) == 0 {
		c.add("routes", "required", "at least one route is required")
	}
	for _, proto := range sortedKeys(c.up.Routes) {
		r, f := c.up.Routes[proto], "routes."+proto
		if r == nil {
			continue
		}
		if r.Method != "" && !slices.Contains(methods, r.Method) {
			c.add(f+".method", "invalid", "method must be one of %v", methods)
		}
		switch r.Transport {
		case "", manifest.TransportHTTP:
		case manifest.TransportWebSocket:
			if r.Method != "" && r.Method != "GET" {
				c.add(f+".method", "invalid", "a websocket route is opened with GET")
			}
			if len(r.Patches) > 0 {
				c.add(f+".patches", "unsupported", "a websocket route has no body to patch")
			}
		default:
			c.add(f+".transport", "invalid", "transport must be http or websocket")
		}
		c.path(f+".path", r.Path, placePath)
		c.headers(f+".headers", r.Headers)
		for i, pt := range r.Patches {
			c.patch(fmt.Sprintf("%s.patches[%d]", f, i), pt)
		}
		if m := r.Model; m != nil && m.From != "" && m.From != manifest.ModelFromRequest && m.From != manifest.ModelFromMeta {
			c.add(f+".model.from", "invalid", "model.from must be request or meta")
		}
	}
}

func (c *checker) patch(f string, pt manifest.UpstreamPatch) {
	switch pt.Op {
	case "set":
		if len(pt.Value) == 0 || !json.Valid(pt.Value) {
			c.add(f+".value", "required", "a set patch needs a JSON value")
		}
	case "delete":
		if len(pt.Value) > 0 {
			c.add(f+".value", "unsupported", "a delete patch takes no value")
		}
	default:
		c.add(f+".op", "invalid", "op must be set or delete")
	}
	if strings.TrimSpace(pt.Path) == "" {
		c.add(f+".path", "required", "path is required")
	}
	if pt.When != "" && pt.When != manifest.PatchWhenStream {
		c.add(f+".when", "invalid", "when must be omitted or stream")
	}
}

// path checks a path template on the base URL: the path part and the query
// string allow different variables.
func (c *checker) path(f, tpl string, pathPlace place) {
	if !strings.HasPrefix(tpl, "/") {
		c.add(f, "invalid", "a path starts with /")
	}
	pathPart, query, _ := strings.Cut(tpl, "?")
	c.template(f, pathPart, pathPlace, false)
	queryPlace := placeQuery
	if pathPlace == placeList {
		queryPlace = placeList
	}
	c.template(f, query, queryPlace, false)
}

// template checks the variables of tpl at pl; required rejects an empty one.
func (c *checker) template(f, tpl string, pl place, required bool) {
	if required && tpl == "" {
		c.add(f, "required", "a value is required")
	}
	for _, name := range variables(tpl) {
		switch {
		case !pl.allowed(name):
			c.add(f, "invalid_template", "{%s} cannot be used here", name)
		case strings.HasPrefix(name, varCredentials):
			if k := strings.TrimPrefix(name, varCredentials); c.up.Credentials == nil || !slices.Contains(c.up.Credentials.Fields, k) {
				c.add(f, "invalid_template", "{%s}: %q is not in credentials.fields", name, k)
			}
		case strings.HasPrefix(name, varClientHeader):
			if h := strings.TrimPrefix(name, varClientHeader); !slices.Contains(c.passHeaders, h) || paramoverride.HeaderBlocked(h) {
				c.add(f, "invalid_template", "{%s}: %q is not a client header the account type receives", name, h)
			}
		}
	}
}

func (c *checker) test() {
	t := c.up.Test
	if t == nil {
		return
	}
	switch r := c.up.Routes[t.Protocol]; {
	case r == nil:
		c.add("test.protocol", "unknown_protocol", "protocol %q has no route", t.Protocol)
	case r.Transport == manifest.TransportWebSocket:
		c.add("test.protocol", "unsupported", "the test request cannot use a websocket route")
	}
	if strings.TrimSpace(t.Model) == "" {
		c.add("test.model", "required", "the default test model is required")
	}
	if _, builtin := pings[t.Body]; !builtin {
		c.template("test.body", t.Body, placeBody, true)
		if !json.Valid([]byte(strings.ReplaceAll(t.Body, "{model}", "m"))) {
			c.add("test.body", "invalid", "body must be %s or a JSON template", strings.Join(sortedKeys(pings), ", "))
		}
	}
}

func (c *checker) models() {
	m := c.up.Models
	if m == nil {
		return
	}
	c.path("models.path", m.Path, placeList)
	if m.IDPath == "" {
		c.add("models.idPath", "required", "idPath is required")
	}
}

func sortedKeys[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
