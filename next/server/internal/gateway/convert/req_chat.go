package convert

import (
	"fmt"
	"slices"
)

// ---------------------------------------------------------------- parse

// chatParser reads an OpenAI chat request into a canonReq.
type chatParser struct {
	c *canonReq
	l *losses
	// legacy are the legacy function calls still waiting for their
	// function message.
	legacy []legacyCall
}

func parseChatRequest(body []byte, l *losses) (*canonReq, error) {
	in, err := decodeJObject(body, "request")
	if err != nil {
		return nil, err
	}
	p := &chatParser{c: &canonReq{}, l: l}
	for _, k := range members(in) {
		if err := p.member(k, in[k]); err != nil {
			return nil, err
		}
	}
	if p.c.model == "" {
		return nil, cfail("model", "expected nonempty string")
	}
	if p.c.msgs == nil {
		return nil, cfail("messages", "at least one message is required")
	}
	if err := p.maxTokens(in); err != nil {
		return nil, err
	}
	_, hasTools := in["tools"]
	if _, ok := in["functions"]; ok && !hasTools {
		p.c.resp.legacyFunctions = true
	}
	return p.c, nil
}

// member reads one top-level member.
func (p *chatParser) member(k string, v any) (err error) {
	c := p.c
	switch k {
	case "model":
		c.model, err = jnonempty(v, k)
	case "messages":
		err = p.messages(v)
	case "max_tokens", "max_completion_tokens":
		// maxTokens, once both are known
	case "stream":
		c.stream, err = jbool(v, k)
	case "stream_options":
		err = p.streamOptions(v)
	case "temperature", "top_p":
		err = c.numberParam(k, k, v)
	case "stop":
		err = c.stopParam(k, v)
	case "n":
		if i, e := jint(v, k, 1, 1); e != nil || i != 1 {
			err = cfail(k, "only one completion has an equivalent")
		}
	case "user", "safety_identifier", "service_tier", "prompt_cache_key", "prompt_cache_retention", "verbosity":
		err = c.stringParam(k, k, v)
	case "prompt_cache_options", "metadata":
		if _, err = jobj(v, k); err == nil {
			c.param(k, k, v)
		}
	case "parallel_tool_calls":
		err = c.boolParam(k, k, v)
	case "store":
		// Chat does not store by default.
		if b, e := jbool(v, k); e != nil || b {
			c.param(k, k, v)
		}
	case "reasoning_effort":
		c.reasoning, err = readReasoningEffort(v, k)
	case "response_format":
		c.format, err = p.responseFormat(v)
	case "tools":
		err = p.tools(v)
	case "functions":
		err = p.functions(v)
	case "web_search_options":
		err = p.webSearch(v)
	case "tool_choice":
		// It wins over the legacy function_call, read before it.
		if c.choice != nil {
			p.l.add(LossTool, c.choice.path)
		}
		c.choice, err = readToolChoice(v, k, p.l, true)
	case "function_call":
		err = p.functionCall(v)
	case "audio":
		err = cfail(k, "audio output cannot be converted")
	case "modalities":
		err = p.modalities(v)
	default:
		// Penalties, seed, logprobs, ... (unless neutral) and unknown
		// members: no target takes them.
		if neutral, ok := chatDropped[k]; !ok || !neutral(v) {
			p.l.add(LossOther, k)
		}
	}
	return err
}

// maxTokens reads max_completion_tokens or its deprecated alias max_tokens;
// when both differ max_completion_tokens wins.
func (p *chatParser) maxTokens(in jobject) error {
	a, hasA := in["max_completion_tokens"]
	b, hasB := in["max_tokens"]
	switch {
	case hasA:
		if hasB && fmt.Sprint(a) != fmt.Sprint(b) {
			p.l.add(LossOther, "max_tokens")
		}
		return p.c.maxTokensParam("max_completion_tokens", a)
	case hasB:
		return p.c.maxTokensParam("max_tokens", b)
	}
	return nil
}

func (p *chatParser) streamOptions(v any) error {
	o, err := jobj(v, "stream_options")
	if err != nil {
		return err
	}
	keepOther(o, "stream_options", p.l, "include_usage")
	if x, ok := o["include_usage"]; ok {
		p.c.resp.includeUsage, err = jbool(x, "stream_options.include_usage")
	}
	return err
}

func (p *chatParser) modalities(v any) error {
	mods, _ := v.([]any)
	if slices.Contains(mods, any("audio")) {
		return cfail("modalities", "audio output cannot be converted")
	}
	if len(mods) != 1 || mods[0] != "text" {
		p.l.add(LossOther, "modalities")
	}
	return nil
}

func (p *chatParser) responseFormat(v any) (*canonFormat, error) {
	const path = "response_format"
	rf, err := jobj(v, path)
	if err != nil {
		return nil, err
	}
	f := &canonFormat{path: path}
	switch rf["type"] {
	case "text", "json_object":
		keepOther(rf, path, p.l, "type")
		f.typ = rf["type"].(string)
		return f, nil
	case "json_schema":
		keepOther(rf, path, p.l, "type", "json_schema")
		js, err := jobj(rf["json_schema"], path+".json_schema")
		if err != nil {
			return nil, err
		}
		f.typ, f.path = "json_schema", path+".json_schema"
		return f, readSchemaFormat(js, f.path, p.l, f)
	}
	return nil, cfail(path+".type", "expected text, json_object or json_schema")
}

func (p *chatParser) tools(v any) error {
	tools, err := jlist(v, "tools")
	if err != nil {
		return err
	}
	for i, tv := range tools {
		path := jpos("tools", i)
		o, err := jobj(tv, path)
		if err != nil {
			return err
		}
		var t canonTool
		switch o["type"] {
		case ToolFunction:
			keepOther(o, path, p.l, "type", "function")
			fn, e := jobj(o["function"], path+".function")
			if e != nil {
				return e
			}
			t, err = readFunctionTool(fn, path+".function", p.l)
		case ToolCustom:
			keepOther(o, path, p.l, "type", "custom")
			ct, e := jobj(o["custom"], path+".custom")
			if e != nil {
				return e
			}
			t, err = readCustomTool(ct, path+".custom", p.l, true)
		default:
			p.l.add(LossTool, path)
			continue
		}
		if err != nil {
			return err
		}
		t.path = path
		p.c.tools = append(p.c.tools, t)
	}
	return nil
}

// functions reads the legacy function definitions.
func (p *chatParser) functions(v any) error {
	fns, err := jlist(v, "functions")
	if err != nil {
		return err
	}
	for i, fv := range fns {
		path := jpos("functions", i)
		fn, err := jobj(fv, path)
		if err != nil {
			return err
		}
		t, err := readFunctionTool(fn, path, p.l)
		if err != nil {
			return err
		}
		p.c.tools = append(p.c.tools, t)
	}
	return nil
}

// functionCall reads the legacy function_call choice.
func (p *chatParser) functionCall(v any) error {
	const path = "function_call"
	if s, isStr := v.(string); isStr {
		if s != "none" && s != "auto" {
			return cfail(path, "expected none, auto or a function")
		}
		p.c.choice = &canonChoice{path: path, mode: s}
		return nil
	}
	o, err := jobj(v, path)
	if err != nil {
		return err
	}
	keepOther(o, path, p.l, "name")
	name, err := jnonempty(o["name"], path+".name")
	p.c.choice = &canonChoice{path: path, mode: "tool", name: name}
	return err
}

// webSearch reads web_search_options as a web search tool.
func (p *chatParser) webSearch(v any) error {
	const path = "web_search_options"
	o, err := jobj(v, path)
	if err != nil {
		return err
	}
	keepOther(o, path, p.l, "search_context_size", "user_location")
	t := canonTool{path: path, kind: "web_search", details: toolDetails(o, path, "search_context_size")}
	if lv, ok := o["user_location"]; ok {
		lp := path + ".user_location"
		loc, err := jobj(lv, lp)
		if err != nil {
			return err
		}
		keepOther(loc, lp, p.l, "type", "approximate")
		if a, ok := loc["approximate"]; ok {
			ao, err := jobj(a, lp+".approximate")
			if err != nil {
				return err
			}
			if t.location, err = readLocation(ao, lp+".approximate", p.l); err != nil {
				return err
			}
		}
	}
	p.c.tools = append(p.c.tools, t)
	return nil
}

func (p *chatParser) messages(v any) error {
	msgs, err := jlist(v, "messages")
	if err != nil {
		return err
	}
	if len(msgs) == 0 {
		return cfail("messages", "at least one message is required")
	}
	p.c.msgs = []canonMsg{}
	for i, mv := range msgs {
		path := jpos("messages", i)
		msg, err := jobj(mv, path)
		if err != nil {
			return err
		}
		role, err := jnonempty(msg["role"], path+".role")
		if err != nil {
			return err
		}
		m := canonMsg{role: role, path: path}
		switch role {
		case roleSystem, roleDeveloper, roleUser:
			keepOther(msg, path, p.l, "role", "content")
			m.parts, err = p.content(msg["content"], path+".content")
		case roleAssistant:
			m.parts, err = p.assistant(msg, path, i)
		case roleTool:
			m.parts, err = p.toolResult(msg, path)
		case "function":
			m.role = roleTool
			m.parts, err = p.functionResult(msg, path)
		default:
			err = cfail(path+".role", "role is not converted")
		}
		if err != nil {
			return err
		}
		if m.parts != nil {
			p.c.msgs = append(p.c.msgs, m)
		}
	}
	return nil
}

// content reads a message content: a string or text, image and file parts.
func (p *chatParser) content(v any, path string) ([]canonPart, error) {
	if v == nil {
		return []canonPart{}, nil
	}
	s, list, isStr, err := textOrParts(v, path)
	if err != nil || isStr {
		return []canonPart{textPart(s, path)}, err
	}
	parts := []canonPart{}
	for i, pv := range list {
		pp := jpos(path, i)
		o, err := jobj(pv, pp)
		if err != nil {
			return nil, err
		}
		part, ok, err := p.part(o, pp)
		if err != nil {
			return nil, err
		}
		if !ok {
			continue
		}
		if b, ok := o["prompt_cache_breakpoint"]; ok {
			part.cache = &canonParam{name: "prompt_cache_breakpoint", path: pp + ".prompt_cache_breakpoint", value: b}
		}
		parts = append(parts, part)
	}
	return parts, nil
}

// part reads one content part; ok is false for a part left out.
func (p *chatParser) part(o jobject, path string) (canonPart, bool, error) {
	part := canonPart{path: path}
	var err error
	switch o["type"] {
	case "text":
		keepOther(o, path, p.l, "type", "text", "prompt_cache_breakpoint")
		part.text, err = jstr(o["text"], path+".text")
	case "refusal":
		keepOther(o, path, p.l, "type", "refusal")
		part.kind = partRefusal
		part.text, err = jstr(o["refusal"], path+".refusal")
	case "image_url":
		keepOther(o, path, p.l, "type", "image_url", "prompt_cache_breakpoint")
		part.kind = partImage
		err = p.image(o["image_url"], path+".image_url", &part)
	case "file":
		keepOther(o, path, p.l, "type", "file", "prompt_cache_breakpoint")
		part.kind = partFile
		err = p.file(o["file"], path+".file", &part)
	default:
		// input_audio and part types added later
		p.l.add(LossOther, path)
		return part, false, nil
	}
	return part, true, err
}

func (p *chatParser) image(v any, path string, part *canonPart) error {
	img, err := jobj(v, path)
	if err != nil {
		return err
	}
	keepOther(img, path, p.l, "url", "detail")
	if part.url, err = jnonempty(img["url"], path+".url"); err != nil {
		return err
	}
	if d, ok := img["detail"]; ok {
		part.detail = readImageDetail(d, path+".detail", p.l)
	}
	return nil
}

func (p *chatParser) file(v any, path string, part *canonPart) error {
	f, err := jobj(v, path)
	if err != nil {
		return err
	}
	keepOther(f, path, p.l, "file_id", "file_data", "filename")
	if err = optStrings(f, path, map[string]*string{"file_id": &part.fileID, "file_data": &part.data, "filename": &part.filename}); err != nil {
		return err
	}
	if part.fileID == "" && part.data == "" {
		return cfail(path, "file_id or file_data is required")
	}
	return nil
}

// assistant reads an assistant message: content, refusal, tool calls and
// the legacy function_call. Reasoning history is dropped.
func (p *chatParser) assistant(msg jobject, path string, index int) ([]canonPart, error) {
	for _, k := range []string{"reasoning_content", "reasoning"} {
		if _, ok := msg[k]; ok && !isEmpty(msg[k]) {
			p.l.add(LossReasoning, path+"."+k)
		}
		delete(msg, k)
	}
	keepOther(msg, path, p.l, "role", "content", "refusal", "tool_calls", "function_call")
	parts, err := p.content(msg["content"], path+".content")
	if err != nil {
		return nil, err
	}
	if r, ok := msg["refusal"]; ok {
		s, err := jstr(r, path+".refusal")
		if err != nil {
			return nil, err
		}
		if s != "" {
			parts = append(parts, canonPart{kind: partRefusal, text: s, path: path + ".refusal"})
		}
	}
	if tc, ok := msg["tool_calls"]; ok {
		calls, err := p.toolCalls(tc, path+".tool_calls")
		if err != nil {
			return nil, err
		}
		parts = append(parts, calls...)
	}
	if fc, ok := msg["function_call"]; ok {
		call, err := p.legacyCall(fc, path+".function_call", index)
		if err != nil {
			return nil, err
		}
		parts = append(parts, call)
	}
	return parts, nil
}

func (p *chatParser) toolCalls(v any, path string) ([]canonPart, error) {
	calls, err := jlist(v, path)
	if err != nil {
		return nil, err
	}
	parts := make([]canonPart, 0, len(calls))
	for i, cv := range calls {
		cp := jpos(path, i)
		call, err := jobj(cv, cp)
		if err != nil {
			return nil, err
		}
		typ, _ := call["type"].(string)
		field := "arguments"
		switch typ {
		case ToolFunction:
		case ToolCustom:
			field = "input"
		default:
			p.l.add(LossTool, cp)
			continue
		}
		keepOther(call, cp, p.l, "id", "type", typ)
		id, err := jnonempty(call["id"], cp+".id")
		if err != nil {
			return nil, err
		}
		inner, err := jobj(call[typ], cp+"."+typ)
		if err != nil {
			return nil, err
		}
		keepOther(inner, cp+"."+typ, p.l, "name", field)
		name, err := jnonempty(inner["name"], cp+"."+typ+".name")
		if err != nil {
			return nil, err
		}
		arg, err := jstr(inner[field], cp+"."+typ+"."+field)
		if err != nil {
			return nil, err
		}
		parts = append(parts, canonPart{kind: partToolCall, path: cp, call: &canonCall{id: id, name: name, kind: typ, args: arg}})
	}
	return parts, nil
}

// legacyCall reads the function_call of the assistant message at index.
// Legacy calls have no id; the function message answering one is matched
// by name.
func (p *chatParser) legacyCall(v any, path string, index int) (canonPart, error) {
	fn, err := jobj(v, path)
	if err != nil {
		return canonPart{}, err
	}
	keepOther(fn, path, p.l, "name", "arguments")
	name, err := jnonempty(fn["name"], path+".name")
	if err != nil {
		return canonPart{}, err
	}
	args, err := jstr(fn["arguments"], path+".arguments")
	if err != nil {
		return canonPart{}, err
	}
	id := fmt.Sprintf("call_legacy_%d", index)
	p.legacy = append(p.legacy, legacyCall{name: name, id: id})
	return canonPart{kind: partToolCall, path: path, call: &canonCall{id: id, name: name, kind: ToolFunction, args: args}}, nil
}

func (p *chatParser) toolResult(msg jobject, path string) ([]canonPart, error) {
	keepOther(msg, path, p.l, "role", "content", "tool_call_id")
	id, err := jnonempty(msg["tool_call_id"], path+".tool_call_id")
	if err != nil {
		return nil, err
	}
	parts, err := p.content(msg["content"], path+".content")
	if err != nil {
		return nil, err
	}
	return []canonPart{{kind: partToolResult, path: path, result: &canonResult{id: id, parts: parts}}}, nil
}

// functionResult reads a legacy function message as the result of the
// latest earlier function_call with its name still unanswered; without one
// the result is a tool loss.
func (p *chatParser) functionResult(msg jobject, path string) ([]canonPart, error) {
	keepOther(msg, path, p.l, "role", "content", "name")
	name, err := jnonempty(msg["name"], path+".name")
	if err != nil {
		return nil, err
	}
	j := len(p.legacy) - 1
	for j >= 0 && p.legacy[j].name != name {
		j--
	}
	if j < 0 {
		p.l.add(LossTool, path)
		return nil, nil
	}
	id := p.legacy[j].id
	p.legacy = slices.Delete(p.legacy, j, j+1)
	parts, err := p.content(msg["content"], path+".content")
	if err != nil {
		return nil, err
	}
	return []canonPart{{kind: partToolResult, path: path, result: &canonResult{id: id, parts: parts}}}, nil
}

// ---------------------------------------------------------------- build

// chatStopLimit is the most stop sequences chat accepts.
const chatStopLimit = 4

// chatBuilder writes a canonReq as an OpenAI chat request.
type chatBuilder struct {
	c    *canonReq
	l    *losses
	msgs []any
	// moved are tool result parts chat tool messages cannot hold (images,
	// files), waiting for the user message after the tool messages.
	moved []any
}

// buildChatRequest returns the builder writing the output limit under
// maxField: max_completion_tokens for a responses client, max_tokens (which
// more chat-compatible upstreams know) for an Anthropic client.
func buildChatRequest(maxField string) canonBuild {
	return func(c *canonReq, _ Options, l *losses) (any, error) {
		b := &chatBuilder{c: c, l: l}
		out := jobject{"model": c.model}
		if c.maxTokens > 0 {
			out[maxField] = c.maxTokens
		}
		if c.stream {
			// Billing needs the usage of a stream (CONVERT-MATRIX §9.1).
			out["stream"] = true
			out["stream_options"] = jobject{"include_usage": true}
		}
		b.params(out)
		b.tools(out)
		b.messages()
		out["messages"] = b.msgs
		return out, nil
	}
}

func (b *chatBuilder) params(out jobject) {
	c := b.c
	takeOpenAIParams(c, out, append(openAIShared, "verbosity")...)
	if p, ok := c.take("top_logprobs"); ok {
		out["logprobs"] = true
		out["top_logprobs"] = p.value
	}
	if p, ok := c.take("stop"); ok {
		stops := p.value.([]any)
		if len(stops) > chatStopLimit {
			b.l.add(LossOther, p.path)
			stops = stops[:chatStopLimit]
		}
		out["stop"] = stops
	}
	if c.reasoning != nil {
		out["reasoning_effort"] = c.reasoning.effort
	}
	if f := c.format; f != nil {
		rf := jobject{"type": f.typ}
		if f.typ == "json_schema" {
			js := writeSchemaFormat(f)
			delete(js, "type")
			rf["json_schema"] = js
		}
		out["response_format"] = rf
	}
}

func (b *chatBuilder) tools(out jobject) {
	var tools []any
	for _, t := range b.c.tools {
		switch t.kind {
		case "web_search":
			out["web_search_options"] = b.webSearch(t)
		case ToolCustom:
			ct := jobject{"name": t.name}
			b.toolFields(t, ct, func(d canonParam) bool {
				if d.name != "format" {
					return false
				}
				f := d.value.(jobject)
				ct["format"] = jobject{"type": "grammar", "grammar": jobject{"syntax": f["syntax"], "definition": f["definition"]}}
				return true
			})
			tools = append(tools, jobject{"type": ToolCustom, ToolCustom: ct})
		default:
			fn := jobject{"name": t.name}
			if t.schema != nil {
				fn["parameters"] = t.schema
			}
			b.toolFields(t, fn, func(d canonParam) bool {
				if d.name == "strict" {
					fn["strict"] = d.value
				}
				return d.name == "strict"
			})
			tools = append(tools, jobject{"type": ToolFunction, ToolFunction: fn})
		}
	}
	if len(tools) > 0 {
		out["tools"] = tools
	}
	if ch := b.c.choice; ch != nil && (len(tools) > 0 || ch.mode == "none" || ch.mode == "auto") {
		out["tool_choice"] = writeToolChoice(b.c, ch, true)
	} else if ch != nil {
		b.l.add(LossTool, ch.path)
	}
}

// toolFields writes the description of t into o and offers each detail to
// take; a detail it does not take is lost.
func (b *chatBuilder) toolFields(t canonTool, o jobject, take func(canonParam) bool) {
	if t.description != "" {
		o["description"] = t.description
	}
	for _, d := range t.details {
		if !take(d) {
			b.l.add(LossOther, d.path)
		}
	}
}

func (b *chatBuilder) webSearch(t canonTool) jobject {
	ws := jobject{}
	b.toolFields(t, jobject{}, func(d canonParam) bool {
		if d.name == "search_context_size" {
			ws[d.name] = d.value
		}
		return d.name == "search_context_size"
	})
	if len(t.location) > 0 {
		ws["user_location"] = jobject{"type": "approximate", "approximate": locationFields(jobject{}, t.location)}
	}
	return ws
}

func (b *chatBuilder) messages() {
	for _, p := range b.c.system {
		if p.cache != nil {
			b.l.add(LossOther, p.cache.path)
		}
	}
	if sys := texts(b.c.system, "\n\n"); sys != "" {
		b.emit(jobject{"role": roleSystem, "content": sys})
	}
	for _, m := range b.c.msgs {
		switch m.role {
		case roleTool:
			b.toolMessage(m.parts[0])
		case roleAssistant:
			b.assistant(m)
		default:
			b.emit(jobject{"role": m.role, "content": b.content(m.parts)})
		}
	}
	b.flushMoved()
}

// emit appends a message other than a tool message, after the user message
// carrying what earlier tool messages could not.
func (b *chatBuilder) emit(msg jobject) {
	b.flushMoved()
	b.msgs = append(b.msgs, msg)
}

func (b *chatBuilder) flushMoved() {
	if len(b.moved) == 0 {
		return
	}
	note := jobject{"type": "text", "text": "Content returned by the tool calls above:"}
	b.msgs = append(b.msgs, jobject{"role": roleUser, "content": append([]any{note}, b.moved...)})
	b.moved = nil
}

// content returns a string for one plain text part, parts otherwise.
func (b *chatBuilder) content(parts []canonPart) any {
	if len(parts) == 1 && onlyText(parts) {
		return parts[0].text
	}
	out := []any{}
	for _, p := range parts {
		if o := b.part(p); o != nil {
			out = append(out, o)
		}
	}
	return out
}

// part writes one user content part, nil when it is left out.
func (b *chatBuilder) part(p canonPart) jobject {
	var o jobject
	switch p.kind {
	case partText, partRefusal:
		o = jobject{"type": "text", "text": p.text}
	case partImage:
		if p.url == "" {
			b.l.add(LossImage, p.path)
			return nil
		}
		img := jobject{"url": p.url}
		if p.detail != nil {
			img["detail"] = p.detail.value
		}
		o = jobject{"type": "image_url", "image_url": img}
	case partFile:
		if p.data == "" && p.fileID == "" {
			b.l.add(LossOther, p.path) // a file URL
			return nil
		}
		f := jobject{}
		setNonEmpty(f, map[string]string{"file_data": p.data, "file_id": p.fileID, "filename": p.filename})
		o = jobject{"type": "file", "file": f}
	default:
		b.l.add(partLossCategory(p), p.path)
		return nil
	}
	b.cache(p, o)
	return o
}

// cache carries a cache mark onto a chat part: prompt_cache_breakpoint on
// any part, an Anthropic cache_control on text (CONVERT-MATRIX D7).
func (b *chatBuilder) cache(p canonPart, o jobject) {
	switch {
	case p.cache == nil:
	case p.cache.name == "prompt_cache_breakpoint" || o["type"] == "text":
		o[p.cache.name] = p.cache.value
	default:
		b.l.add(LossOther, p.cache.path)
	}
}

// assistant writes an assistant message; one holding only tool calls joins
// the assistant message before it.
func (b *chatBuilder) assistant(m canonMsg) {
	var content, refusal []canonPart
	var calls []any
	for _, p := range m.parts {
		switch p.kind {
		case partText:
			content = append(content, p)
		case partRefusal:
			refusal = append(refusal, p)
		case partToolCall:
			calls = append(calls, chatToolCallObject(p.call))
		default:
			b.l.add(partLossCategory(p), p.path)
		}
	}
	if len(content) == 0 && len(refusal) == 0 && len(calls) > 0 && len(b.moved) == 0 {
		if prev, ok := b.lastAssistant(); ok {
			prevCalls, _ := prev["tool_calls"].([]any)
			prev["tool_calls"] = append(prevCalls, calls...)
			return
		}
	}
	msg := jobject{"role": roleAssistant, "content": nil}
	if len(content) > 0 {
		msg["content"] = b.content(content)
	}
	if len(refusal) > 0 {
		msg["refusal"] = texts(refusal, "")
	}
	if len(calls) > 0 {
		msg["tool_calls"] = calls
	}
	b.emit(msg)
}

func (b *chatBuilder) lastAssistant() (jobject, bool) {
	if len(b.msgs) == 0 {
		return nil, false
	}
	prev := b.msgs[len(b.msgs)-1].(jobject)
	return prev, prev["role"] == roleAssistant
}

func chatToolCallObject(call *canonCall) jobject {
	if call.kind == ToolCustom {
		return jobject{"id": call.id, "type": ToolCustom, ToolCustom: jobject{"name": call.name, "input": call.args}}
	}
	return jobject{"id": call.id, "type": ToolFunction, ToolFunction: jobject{"name": call.name, "arguments": call.args}}
}

// toolMessage writes a tool result. Chat tool messages hold text only:
// images and files move to a user message after the tool messages (an
// "other" loss, the position changes) and is_error is lost.
func (b *chatBuilder) toolMessage(p canonPart) {
	r := p.result
	if r.isError {
		b.l.add(LossOther, r.errorPath)
	}
	var text []canonPart
	for _, part := range r.parts {
		if part.kind == partText || part.kind == partRefusal {
			text = append(text, part)
			continue
		}
		if o := b.part(part); o != nil {
			b.l.add(LossOther, part.path)
			b.moved = append(b.moved, o)
		}
	}
	var content any = ""
	if len(text) > 0 {
		content = b.content(text)
	}
	b.msgs = append(b.msgs, jobject{"role": roleTool, "tool_call_id": r.id, "content": content})
}
