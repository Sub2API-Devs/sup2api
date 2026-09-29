// Package usagerules applies the declarative usage rules of a platform
// manifest (manifest.UsageRules) to upstream responses: it resolves which
// rules describe a protocol and extracts the token counts, model and metrics
// they declare. The gateway uses it on every forwarded response; the console
// "test account" action uses it on the plugin's test response.
package usagerules

import (
	"strconv"
	"strings"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// For resolves the rules describing responses of protocol: the account type's
// override for that protocol, else the endpoint speaking it, else the
// platform's defaults (ARCHITECTURE 6.6). ep may be nil (no endpoint known).
func For(ap manifest.AccountPlatform, ep *manifest.Endpoint, pf *manifest.Platform, protocol string) manifest.UsageRules {
	if u, ok := ap.Usage[protocol]; ok {
		return u
	}
	if ep != nil && ep.Usage != nil {
		return *ep.Usage
	}
	if pf == nil {
		return manifest.UsageRules{}
	}
	return pf.Usage
}

// Acc applies the platform's declarative usage rules. Later values win, so
// cumulative counters (message_delta) override earlier ones.
type Acc struct {
	rules manifest.UsageRules

	input, output, cacheRead, cacheCreation, cacheCreation1h int64

	// Model is the upstream model the response reported, when the rules map it.
	Model string
	// Metrics holds the extra facts the rules declare (usage_logs.metrics).
	Metrics map[string]any
	// StreamError is set when an SSE stream carried an error event.
	StreamError string
}

// New builds an accumulator applying rules.
func New(rules manifest.UsageRules) *Acc { return &Acc{rules: rules} }

func (u *Acc) set(field string, r gjson.Result) {
	if !r.Exists() || r.Type == gjson.Null {
		return
	}
	switch field {
	case manifest.UsageModel:
		u.Model = r.String()
	case manifest.UsageInputTokens:
		u.input = r.Int()
	case manifest.UsageOutputTokens:
		u.output = r.Int()
	case manifest.UsageCacheReadTokens:
		u.cacheRead = r.Int()
	case manifest.UsageCacheCreationTokens:
		u.cacheCreation = r.Int()
	case manifest.UsageCacheCreation1h:
		u.cacheCreation1h = r.Int()
	default:
		u.setMetric(field, r, "")
	}
}

func (u *Acc) setMetric(key string, r gjson.Result, typ string) {
	if !r.Exists() || r.Type == gjson.Null {
		return
	}
	var v any
	switch {
	case typ == "boolean" || r.Type == gjson.True || r.Type == gjson.False:
		v = r.Bool()
	case typ == "number" || r.Type == gjson.Number:
		v = r.Float()
	default:
		v = r.String()
	}
	if u.Metrics == nil {
		u.Metrics = map[string]any{}
	}
	u.Metrics[key] = v
}

func (u *Acc) applyFacts(doc []byte) {
	for key, f := range u.rules.Facts {
		if f.Path != "" {
			u.setMetric(key, Path(doc, f.Path), f.Type)
		}
	}
}

// Path evaluates a usage map value: a gjson path, or "a+b+..." summing
// several numeric paths. Missing (or null) terms count as 0; when every term
// is missing the result does not exist, i.e. the value was not provided.
func Path(doc []byte, spec string) gjson.Result {
	if !strings.Contains(spec, "+") {
		return gjson.GetBytes(doc, spec)
	}
	var (
		sum   float64
		found bool
	)
	for _, p := range strings.Split(spec, "+") {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		r := gjson.GetBytes(doc, p)
		if !r.Exists() || r.Type == gjson.Null {
			continue
		}
		found = true
		sum += r.Float()
	}
	if !found {
		return gjson.Result{}
	}
	return gjson.Result{Type: gjson.Number, Num: sum, Raw: strconv.FormatFloat(sum, 'f', -1, 64)}
}

// ApplyJSON applies the JSON rules to a response body. A top-level array
// (Gemini's JSON array stream) applies them to each element in order.
func (u *Acc) ApplyJSON(body []byte) {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return
	}
	if r := gjson.ParseBytes(body); r.IsArray() {
		r.ForEach(func(_, v gjson.Result) bool {
			if v.IsObject() {
				u.applyJSONDoc([]byte(v.Raw))
			}
			return true
		})
		return
	}
	u.applyJSONDoc(body)
}

// HasJSON reports whether the rules describe non-streaming JSON responses.
func (u *Acc) HasJSON() bool { return u.rules.JSON != nil }

func (u *Acc) applyJSONDoc(body []byte) {
	if m := u.rules.JSON; m != nil {
		for field, path := range m.Map {
			u.set(field, Path(body, path))
		}
	}
	u.applyFacts(body)
}

// ApplySSE applies the SSE rules to one upstream event.
func (u *Acc) ApplySSE(event string, data []byte) {
	if len(data) == 0 || !gjson.ValidBytes(data) {
		return
	}
	name := event
	if name == "" {
		name = gjson.GetBytes(data, "type").String()
	}
	// Anthropic/Responses name error events; OpenAI chat and Gemini send an
	// unnamed {"error": {...}} chunk.
	if name == "error" || (name == "" && gjson.GetBytes(data, "error").IsObject()) {
		msg := gjson.GetBytes(data, "error.message").String()
		if msg == "" {
			msg = gjson.GetBytes(data, "message").String()
		}
		if msg == "" {
			msg = string(data)
		}
		u.StreamError = "upstream stream error: " + msg
	}
	for _, rule := range u.rules.SSE {
		if rule.Event != "" && rule.Event != name {
			continue
		}
		for field, path := range rule.Map {
			u.set(field, Path(data, path))
		}
	}
	u.applyFacts(data)
}

// Tokens converts to core.UsageTokens. cache_creation_tokens is the total
// cache write (5 minute + 1 hour); the core counts the two separately.
func (u *Acc) Tokens() core.UsageTokens {
	cc := u.cacheCreation - u.cacheCreation1h
	if cc < 0 {
		cc = 0
	}
	return core.UsageTokens{
		Input:           max(u.input, 0),
		Output:          max(u.output, 0),
		CacheRead:       max(u.cacheRead, 0),
		CacheCreation:   cc,
		CacheCreation1h: max(u.cacheCreation1h, 0),
	}
}
