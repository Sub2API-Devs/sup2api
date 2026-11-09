package convert

import (
	"encoding/json"
	"maps"
	"slices"
	"strings"
)

// The request conversions between OpenAI chat, OpenAI responses and
// Anthropic messages (CONVERT-MATRIX §9) share one protocol-neutral request
// form: a parser per client protocol reads the body into a canonReq, a
// builder per upstream protocol writes it out. Every element keeps its
// client path, so whichever side cannot express it records the Loss there.
//
//   - A parser maps what at least one target can express, records a Loss
//     for what none can (unknown members, hosted tools, reasoning history,
//     ...), and fails with RequestError when the request cannot be
//     expressed at all.
//   - A builder takes what its protocol expresses. Scalar parameters live
//     in canonReq.params: a builder takes the ones it knows and every param
//     left over is an "other" loss.
//
// Reasoning history never crosses protocols (§3.2): parsers drop it.

// canonReq is a client request in the protocol-neutral form.
type canonReq struct {
	model  string
	stream bool
	// maxTokens is the client's output limit (0: none) given at maxPath.
	maxTokens int64
	maxPath   string
	// system is the system prompt outside the conversation (Anthropic
	// system, Responses instructions); system and developer messages in the
	// conversation stay in msgs.
	system    []canonPart
	msgs      []canonMsg
	params    []canonParam
	format    *canonFormat
	reasoning *canonReasoning
	tools     []canonTool
	choice    *canonChoice
	// resp carries what the response side needs (includeUsage,
	// legacyFunctions); builders add theirs.
	resp respOpts
}

// canonParam is a scalar request member under its neutral name (the OpenAI
// one where both exist), with the client path it came from.
type canonParam struct {
	name, path string
	value      any
	taken      bool
}

// param records a scalar member for the builders.
func (c *canonReq) param(name, path string, v any) {
	c.params = append(c.params, canonParam{name: name, path: path, value: v})
}

// take hands a param to the builder that expresses it.
func (c *canonReq) take(name string) (canonParam, bool) {
	for i := range c.params {
		if p := &c.params[i]; p.name == name && !p.taken {
			p.taken = true
			return *p, true
		}
	}
	return canonParam{}, false
}

// dropUntaken records every param no builder took as an "other" loss.
func (c *canonReq) dropUntaken(l *losses) {
	for _, p := range c.params {
		if !p.taken {
			l.add(LossOther, p.path)
		}
	}
}

// Message roles of a canonMsg. System and developer keep the client's
// name; a roleTool message holds exactly one tool result part.
const (
	roleSystem    = "system"
	roleDeveloper = "developer"
	roleUser      = "user"
	roleAssistant = "assistant"
	roleTool      = "tool"
)

// canonMsg is one conversation message.
type canonMsg struct {
	role  string
	path  string
	parts []canonPart
}

func (m canonMsg) isSystem() bool { return m.role == roleSystem || m.role == roleDeveloper }

// partKind is the kind of a canonPart.
type partKind uint8

const (
	partText partKind = iota
	partRefusal
	partImage
	partFile
	partToolCall
	partToolResult
)

// canonPart is one content part of a message. Only the fields of its kind
// are set.
type canonPart struct {
	kind partKind
	path string
	// text of a partText or partRefusal; a partFile with a text source.
	text string
	// cache is a cache mark on the part: Anthropic cache_control or OpenAI
	// prompt_cache_breakpoint, under that name (CONVERT-MATRIX D7).
	cache *canonParam
	// url is an image URL (http(s) or data URL) or a file URL.
	url    string
	fileID string
	// detail is an image detail other than auto.
	detail *canonParam
	// data is a file's content as a data URL; filename its name.
	data, filename string
	call           *canonCall
	result         *canonResult
}

// canonCall is a tool call: Args is JSON for a function, the free-form
// input for a custom tool.
type canonCall struct {
	id, name, kind, args string
}

// canonResult is a tool result: text, image and file parts.
type canonResult struct {
	id      string
	parts   []canonPart
	isError bool
	// errorPath is where the client marked the result an error.
	errorPath string
}

// canonFormat is the requested output format.
type canonFormat struct {
	path              string
	typ               string // text | json_object | json_schema
	name, description string
	schema            any
	// strict is set when the client gave it.
	strict *bool
}

// canonReasoning is the requested reasoning.
type canonReasoning struct {
	path string
	// effort is an OpenAI effort: none, minimal, low, medium, high, xhigh.
	effort string
}

// canonTool is a tool definition.
type canonTool struct {
	path              string
	kind              string // function | custom | web_search
	name, description string
	schema            any // function parameters
	// details are definition details a target may not carry: strict,
	// cache_control, a custom tool's format, web search options
	// (search_context_size, allowed_domains, blocked_domains, max_uses).
	details []canonParam
	// location is a web search user location: city, country, region,
	// timezone.
	location map[string]any
}

// canonChoice is a tool choice.
type canonChoice struct {
	path string
	mode string // auto | none | required | tool | allowed
	// name of a mode tool choice.
	name string
	// allowed names the tools of a mode allowed choice; allowedMode is
	// auto or required.
	allowed     []string
	allowedMode string
}

// toolKind returns the kind of the declared tool name ("function" when
// undeclared).
func (c *canonReq) toolKind(name string) string {
	for _, t := range c.tools {
		if t.name == name {
			return t.kind
		}
	}
	return ToolFunction
}

// Location fields of a web search tool, the same in all three protocols.
var searchLocationFields = []string{"city", "country", "region", "timezone"}

// effortBudget maps an OpenAI reasoning effort to an Anthropic thinking
// budget (CONVERT-MATRIX §9.4).
var effortBudget = map[string]int64{"minimal": 2048, "low": 2048, "medium": 8192, "high": 24576, "xhigh": 32768}

// budgetEffort maps an Anthropic thinking budget to an OpenAI effort.
func budgetEffort(budget int64) string {
	switch {
	case budget <= 2048:
		return "low"
	case budget <= 8192:
		return "medium"
	}
	return "high"
}

// canonParse reads a client request; canonBuild writes an upstream request.
type (
	canonParse func(body []byte, l *losses) (*canonReq, error)
	canonBuild func(c *canonReq, opt Options, l *losses) (any, error)
)

// canonRequest is the requestFunc of a pair converted through canonReq.
func canonRequest(parse canonParse, build canonBuild) requestFunc {
	return func(body []byte, opt Options, l *losses) ([]byte, respOpts, error) {
		c, err := parse(body, l)
		var out any
		if err == nil {
			out, err = build(c, opt, l)
		}
		if err != nil {
			return nil, respOpts{}, asRequestError(err)
		}
		c.dropUntaken(l)
		b, err := json.Marshal(out)
		if err != nil {
			return nil, respOpts{}, err
		}
		c.resp.model = c.model
		return b, c.resp, nil
	}
}

// asRequestError wraps a conversion failure as RequestError.
func asRequestError(err error) error {
	if _, ok := err.(*RequestError); ok {
		return err
	}
	return &RequestError{Cause: err}
}

// ---------------------------------------------------------------- JSON

// members drops the null members of o (null means "not set") and returns
// the others' names, sorted so failures are deterministic.
func members(o jobject) []string {
	names := make([]string, 0, len(o))
	for k, v := range o {
		if v == nil {
			delete(o, k)
			continue
		}
		names = append(names, k)
	}
	slices.Sort(names)
	return names
}

// dropUnknown removes the null members of o and the members not listed,
// reporting each removed non-null member's path to drop.
func dropUnknown(o jobject, path string, drop func(path string), names ...string) {
	for _, k := range members(o) {
		if !slices.Contains(names, k) {
			delete(o, k)
			drop(path + "." + k)
		}
	}
}

// keepOther is dropUnknown recording "other" losses.
func keepOther(o jobject, path string, l *losses, names ...string) {
	dropUnknown(o, path, func(p string) { l.add(LossOther, p) }, names...)
}

// textOrParts reads a content that is a string or an array of parts.
func textOrParts(v any, path string) (string, []any, bool, error) {
	if s, ok := v.(string); ok {
		return s, nil, true, nil
	}
	parts, err := jlist(v, path)
	if err != nil {
		return "", nil, false, cfail(path, "expected string or content parts")
	}
	return "", parts, false, nil
}

// optStrings reads the optional string members of o named by dst.
func optStrings(o jobject, path string, dst map[string]*string) error {
	for _, k := range slices.Sorted(maps.Keys(dst)) {
		if x, ok := o[k]; ok {
			s, err := jstr(x, path+"."+k)
			if err != nil {
				return err
			}
			*dst[k] = s
		}
	}
	return nil
}

// numberParam records a numeric member.
func (c *canonReq) numberParam(name, path string, v any) error {
	if _, err := jnumber(v, path); err != nil {
		return err
	}
	c.param(name, path, v)
	return nil
}

// stringParam records a string member.
func (c *canonReq) stringParam(name, path string, v any) error {
	s, err := jstr(v, path)
	if err != nil {
		return err
	}
	c.param(name, path, s)
	return nil
}

// boolParam records a boolean member.
func (c *canonReq) boolParam(name, path string, v any) error {
	b, err := jbool(v, path)
	if err != nil {
		return err
	}
	c.param(name, path, b)
	return nil
}

// stopParam records stop sequences given as a string or a string array; an
// empty value means none.
func (c *canonReq) stopParam(path string, v any) error {
	list := []any{v}
	if _, isStr := v.(string); !isStr {
		var err error
		if list, err = jlist(v, path); err != nil {
			return cfail(path, "expected string or string array")
		}
	}
	stops := make([]any, 0, len(list))
	for i, s := range list {
		str, err := jstr(s, jpos(path, i))
		if err != nil {
			return err
		}
		if str != "" {
			stops = append(stops, str)
		}
	}
	if len(stops) > 0 {
		c.param("stop", path, stops)
	}
	return nil
}

// maxTokensParam records the output limit at path.
func (c *canonReq) maxTokensParam(path string, v any) error {
	n, err := jint(v, path, 1, 1<<31-1)
	if err != nil {
		return err
	}
	c.maxTokens, c.maxPath = n, path
	return nil
}

// textPart is a text part.
func textPart(text, path string) canonPart { return canonPart{kind: partText, text: text, path: path} }

// texts joins the text of parts.
func texts(parts []canonPart, sep string) string {
	list := make([]string, len(parts))
	for i, p := range parts {
		list[i] = p.text
	}
	return strings.Join(list, sep)
}

// onlyText reports whether parts are all plain text without cache marks.
func onlyText(parts []canonPart) bool {
	for _, p := range parts {
		if p.kind != partText || p.cache != nil {
			return false
		}
	}
	return true
}
