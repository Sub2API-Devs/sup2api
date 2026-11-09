package convert

import "strings"

// ---------------------------------------------------------------- parse

// responsesParser reads an OpenAI responses request into a canonReq.
type responsesParser struct {
	c *canonReq
	l *losses
}

// responsesImpossible are members whose meaning depends on state the
// upstream of another protocol does not have.
var responsesImpossible = map[string]string{
	"previous_response_id": "a stored previous response cannot be converted",
	"conversation":         "a stored conversation cannot be converted",
	"prompt":               "a stored prompt template cannot be converted",
}

func parseResponsesRequest(body []byte, l *losses) (*canonReq, error) {
	in, err := decodeJObject(body, "request")
	if err != nil {
		return nil, err
	}
	p := &responsesParser{c: &canonReq{}, l: l}
	for _, k := range members(in) {
		if err := p.member(k, in[k]); err != nil {
			return nil, err
		}
	}
	if p.c.model == "" {
		return nil, cfail("model", "expected nonempty string")
	}
	if len(p.c.msgs) == 0 {
		return nil, cfail("input", "at least one input item is required")
	}
	return p.c, nil
}

func (p *responsesParser) member(k string, v any) (err error) {
	c := p.c
	if reason, ok := responsesImpossible[k]; ok {
		return cfail(k, reason)
	}
	switch k {
	case "model":
		c.model, err = jnonempty(v, k)
	case "input":
		err = p.input(v)
	case "instructions":
		var s string
		if s, err = jstr(v, k); err == nil && s != "" {
			c.system = []canonPart{textPart(s, k)}
		}
	case "max_output_tokens":
		err = c.maxTokensParam(k, v)
	case "stream":
		c.stream, err = jbool(v, k)
	case "temperature", "top_p", "top_logprobs":
		err = c.numberParam(k, k, v)
	case "user", "safety_identifier", "service_tier", "prompt_cache_key", "prompt_cache_retention":
		err = c.stringParam(k, k, v)
	case "metadata":
		if _, err = jobj(v, k); err == nil {
			c.param(k, k, v)
		}
	case "parallel_tool_calls":
		err = c.boolParam(k, k, v)
	case "store":
		// Storing is the responses default and the conversion keeps no
		// state: neither value changes the reply.
		_, err = jbool(v, k)
	case "background":
		if b, e := jbool(v, k); e != nil || b {
			err = cfail(k, "background responses cannot be converted")
		}
	case "truncation":
		if v != "disabled" {
			p.l.add(LossOther, k)
		}
	case "include":
		if !isEmpty(v) {
			p.l.add(LossOther, k)
		}
	case "reasoning":
		err = p.reasoning(v)
	case "text":
		err = p.text(v)
	case "tools":
		err = p.tools(v)
	case "tool_choice":
		c.choice, err = readToolChoice(v, k, p.l, false)
	default:
		// max_tool_calls, stream_options, members added later
		p.l.add(LossOther, k)
	}
	return err
}

func (p *responsesParser) reasoning(v any) error {
	o, err := jobj(v, "reasoning")
	if err != nil {
		return err
	}
	keepOther(o, "reasoning", p.l, "effort", "summary", "generate_summary")
	if e, ok := o["effort"]; ok {
		if p.c.reasoning, err = readReasoningEffort(e, "reasoning.effort"); err != nil {
			return err
		}
	}
	for _, k := range []string{"summary", "generate_summary"} {
		if s, ok := o[k]; ok {
			if err := p.c.stringParam("reasoning_summary", "reasoning."+k, s); err != nil {
				return err
			}
		}
	}
	return nil
}

func (p *responsesParser) text(v any) error {
	o, err := jobj(v, "text")
	if err != nil {
		return err
	}
	keepOther(o, "text", p.l, "format", "verbosity")
	if x, ok := o["verbosity"]; ok {
		if err := p.c.stringParam("verbosity", "text.verbosity", x); err != nil {
			return err
		}
	}
	fv, ok := o["format"]
	if !ok {
		return nil
	}
	const path = "text.format"
	f, err := jobj(fv, path)
	if err != nil {
		return err
	}
	p.c.format = &canonFormat{path: path}
	switch f["type"] {
	case "text", "json_object":
		keepOther(f, path, p.l, "type")
		p.c.format.typ = f["type"].(string)
		return nil
	case "json_schema":
		p.c.format.typ = "json_schema"
		return readSchemaFormat(f, path, p.l, p.c.format)
	}
	return cfail(path+".type", "expected text, json_object or json_schema")
}

func (p *responsesParser) tools(v any) error {
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
		switch typ, _ := o["type"].(string); {
		case typ == ToolFunction:
			t, err = readFunctionTool(o, path, p.l, "type")
		case typ == ToolCustom:
			t, err = readCustomTool(o, path, p.l, false, "type")
		case strings.HasPrefix(typ, "web_search"):
			t, err = p.webSearchTool(o, path)
		default:
			// file_search, code_interpreter, computer, mcp,
			// image_generation, shell, ...: hosted tools no target runs
			p.l.add(LossTool, path)
			continue
		}
		if err != nil {
			return err
		}
		p.c.tools = append(p.c.tools, t)
	}
	return nil
}

func (p *responsesParser) webSearchTool(o jobject, path string) (canonTool, error) {
	keepOther(o, path, p.l, "type", "search_context_size", "user_location", "filters")
	t := canonTool{path: path, kind: "web_search", details: toolDetails(o, path, "search_context_size")}
	if fv, ok := o["filters"]; ok {
		f, err := jobj(fv, path+".filters")
		if err != nil {
			return t, err
		}
		keepOther(f, path+".filters", p.l, "allowed_domains")
		t.details = append(t.details, toolDetails(f, path+".filters", "allowed_domains")...)
	}
	lv, ok := o["user_location"]
	if !ok {
		return t, nil
	}
	loc, err := jobj(lv, path+".user_location")
	if err != nil {
		return t, err
	}
	t.location, err = readLocation(loc, path+".user_location", p.l, "type")
	return t, err
}

func (p *responsesParser) input(v any) error {
	if s, ok := v.(string); ok {
		p.c.msgs = []canonMsg{{role: roleUser, path: "input", parts: []canonPart{textPart(s, "input")}}}
		return nil
	}
	items, err := jlist(v, "input")
	if err != nil {
		return cfail("input", "expected string or input items")
	}
	for i, iv := range items {
		path := jpos("input", i)
		item, err := jobj(iv, path)
		if err != nil {
			return err
		}
		m, err := p.item(item, path)
		if err != nil {
			return err
		}
		if m != nil {
			p.c.msgs = append(p.c.msgs, *m)
		}
	}
	return nil
}

// item reads one input item; nil for an item left out.
func (p *responsesParser) item(item jobject, path string) (*canonMsg, error) {
	typ, _ := item["type"].(string)
	if typ == "" {
		typ = "message"
	}
	switch typ {
	case "message":
		return p.message(item, path)
	case "function_call", "custom_tool_call":
		part, err := p.call(item, typ, path)
		return &canonMsg{role: roleAssistant, path: path, parts: []canonPart{part}}, err
	case "function_call_output", "custom_tool_call_output":
		part, err := p.callOutput(item, path)
		return &canonMsg{role: roleTool, path: path, parts: []canonPart{part}}, err
	case "reasoning":
		p.l.add(LossReasoning, path)
	case "item_reference":
		return nil, cfail(path, "a stored item cannot be converted")
	default:
		p.l.add(responsesItemLoss(typ), path)
	}
	return nil, nil
}

// responsesItemLoss classifies an input item no target carries: the calls
// and results of hosted tools are tool history.
func responsesItemLoss(typ string) LossCategory {
	if strings.HasSuffix(typ, "_call") || strings.HasSuffix(typ, "_output") || strings.HasPrefix(typ, "mcp_") {
		return LossTool
	}
	return LossOther
}

func (p *responsesParser) message(item jobject, path string) (*canonMsg, error) {
	keepOther(item, path, p.l, "type", "role", "content", "id", "status")
	role, err := jnonempty(item["role"], path+".role")
	if err != nil {
		return nil, err
	}
	switch role {
	case roleUser, roleAssistant, roleSystem, roleDeveloper:
	default:
		return nil, cfail(path+".role", "role is not converted")
	}
	parts, err := p.content(item["content"], path+".content")
	return &canonMsg{role: role, path: path, parts: parts}, err
}

// content reads a message content or a tool output: a string or parts.
func (p *responsesParser) content(v any, path string) ([]canonPart, error) {
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
		if ok {
			parts = append(parts, part)
		}
	}
	return parts, nil
}

// part reads one content part; ok is false for a part left out.
func (p *responsesParser) part(o jobject, path string) (canonPart, bool, error) {
	part := canonPart{path: path}
	var err error
	switch o["type"] {
	case "input_text", "output_text":
		keepOther(o, path, p.l, "type", "text", "prompt_cache_breakpoint", "annotations", "logprobs")
		if a, ok := o["annotations"]; ok && !isEmpty(a) {
			p.l.add(LossOther, path+".annotations")
		}
		part.text, err = jstr(o["text"], path+".text")
	case "refusal":
		keepOther(o, path, p.l, "type", "refusal")
		part.kind = partRefusal
		part.text, err = jstr(o["refusal"], path+".refusal")
	case "input_image":
		keepOther(o, path, p.l, "type", "image_url", "file_id", "detail", "prompt_cache_breakpoint")
		part.kind = partImage
		err = optStrings(o, path, map[string]*string{"image_url": &part.url, "file_id": &part.fileID})
		if d, ok := o["detail"]; ok {
			part.detail = readImageDetail(d, path+".detail", p.l)
		}
		if err == nil && part.url == "" && part.fileID == "" {
			err = cfail(path, "image_url or file_id is required")
		}
	case "input_file":
		keepOther(o, path, p.l, "type", "file_data", "file_id", "file_url", "filename", "prompt_cache_breakpoint")
		part.kind = partFile
		err = optStrings(o, path, map[string]*string{"file_data": &part.data, "file_id": &part.fileID,
			"file_url": &part.url, "filename": &part.filename})
		if err == nil && part.url == "" && part.fileID == "" && part.data == "" {
			err = cfail(path, "file_data, file_id or file_url is required")
		}
	default:
		// input_audio and part types added later
		p.l.add(LossOther, path)
		return part, false, nil
	}
	if b, ok := o["prompt_cache_breakpoint"]; ok {
		part.cache = &canonParam{name: "prompt_cache_breakpoint", path: path + ".prompt_cache_breakpoint", value: b}
	}
	return part, true, err
}

func (p *responsesParser) call(item jobject, typ, path string) (canonPart, error) {
	field, kind := "arguments", ToolFunction
	if typ == "custom_tool_call" {
		field, kind = "input", ToolCustom
	}
	keepOther(item, path, p.l, "type", "id", "status", "call_id", "name", field)
	call := &canonCall{kind: kind}
	var err error
	if call.id, err = jnonempty(item["call_id"], path+".call_id"); err != nil {
		return canonPart{}, err
	}
	if call.name, err = jnonempty(item["name"], path+".name"); err != nil {
		return canonPart{}, err
	}
	call.args, err = jstr(item[field], path+"."+field)
	return canonPart{kind: partToolCall, path: path, call: call}, err
}

func (p *responsesParser) callOutput(item jobject, path string) (canonPart, error) {
	keepOther(item, path, p.l, "type", "id", "status", "call_id", "output")
	r := &canonResult{}
	var err error
	if r.id, err = jnonempty(item["call_id"], path+".call_id"); err != nil {
		return canonPart{}, err
	}
	r.parts, err = p.content(item["output"], path+".output")
	return canonPart{kind: partToolResult, path: path, result: r}, err
}

// ---------------------------------------------------------------- build

// responsesMinOutput is the smallest max_output_tokens responses accepts.
const responsesMinOutput = 16

// responsesBuilder writes a canonReq as an OpenAI responses request.
type responsesBuilder struct {
	c     *canonReq
	l     *losses
	input []any
	// callKinds are the kinds of the calls written, by id.
	callKinds map[string]string
}

func buildResponsesRequest(c *canonReq, _ Options, l *losses) (any, error) {
	b := &responsesBuilder{c: c, l: l, input: []any{}, callKinds: map[string]string{}}
	// The conversion keeps no state upstream (CONVERT-MATRIX §9.1).
	out := jobject{"model": c.model, "store": false}
	if c.stream {
		out["stream"] = true
	}
	if c.maxTokens > 0 {
		out["max_output_tokens"] = max(c.maxTokens, responsesMinOutput)
		if c.maxTokens < responsesMinOutput {
			l.add(LossOther, c.maxPath)
		}
	}
	if len(c.system) > 0 {
		b.dropCacheMarks(c.system)
		out["instructions"] = texts(c.system, "\n\n")
	}
	b.params(out)
	b.tools(out)
	for _, m := range c.msgs {
		b.message(m)
	}
	out["input"] = b.input
	return out, nil
}

func (b *responsesBuilder) dropCacheMarks(parts []canonPart) {
	for _, p := range parts {
		if p.cache != nil {
			b.l.add(LossOther, p.cache.path)
		}
	}
}

func (b *responsesBuilder) params(out jobject) {
	c := b.c
	takeOpenAIParams(c, out, append(openAIShared, "top_logprobs")...)
	text := jobject{}
	if p, ok := c.take("verbosity"); ok {
		text["verbosity"] = p.value
	}
	if f := c.format; f != nil {
		text["format"] = jobject{"type": f.typ}
		if f.typ == "json_schema" {
			text["format"] = writeSchemaFormat(f)
		}
	}
	if len(text) > 0 {
		out["text"] = text
	}
	if r := c.reasoning; r != nil {
		reasoning := jobject{"effort": r.effort}
		if r.effort != "none" {
			// Thinking is visible to the client: ask for summaries.
			reasoning["summary"] = "auto"
		}
		out["reasoning"] = reasoning
	}
}

func (b *responsesBuilder) tools(out jobject) {
	var tools []any
	for _, t := range b.c.tools {
		o := jobject{"type": t.kind}
		if t.kind == "web_search" {
			b.webSearch(t, o)
			tools = append(tools, o)
			continue
		}
		o["name"] = t.name
		if t.description != "" {
			o["description"] = t.description
		}
		if t.kind == ToolFunction {
			// Responses function tools are strict by default, chat and
			// Anthropic ones are not.
			o["strict"] = false
			o["parameters"] = t.schema
			if t.schema == nil {
				o["parameters"] = jobject{"type": "object", "properties": jobject{}}
			}
		}
		for _, d := range t.details {
			if d.name == "strict" || (d.name == "format" && t.kind == ToolCustom) {
				o[d.name] = d.value
			} else {
				b.l.add(LossOther, d.path)
			}
		}
		tools = append(tools, o)
	}
	if len(tools) > 0 {
		out["tools"] = tools
	}
	if ch := b.c.choice; ch != nil && (len(tools) > 0 || ch.mode == "none" || ch.mode == "auto") {
		out["tool_choice"] = writeToolChoice(b.c, ch, false)
	} else if ch != nil {
		b.l.add(LossTool, ch.path)
	}
}

func (b *responsesBuilder) webSearch(t canonTool, o jobject) {
	for _, d := range t.details {
		switch d.name {
		case "search_context_size":
			o[d.name] = d.value
		case "allowed_domains":
			o["filters"] = jobject{"allowed_domains": d.value}
		default:
			b.l.add(LossOther, d.path)
		}
	}
	if len(t.location) > 0 {
		o["user_location"] = locationFields(jobject{"type": "approximate"}, t.location)
	}
}

// message writes one message as input items; an assistant message's text
// and calls become a message item and call items in order.
func (b *responsesBuilder) message(m canonMsg) {
	if m.role == roleTool {
		b.callOutput(m.parts[0])
		return
	}
	var content []any
	flush := func() {
		if len(content) > 0 {
			b.input = append(b.input, jobject{"type": "message", "role": m.role, "content": content})
			content = nil
		}
	}
	for _, p := range m.parts {
		if p.kind == partToolCall {
			flush()
			b.input = append(b.input, b.call(p.call))
			continue
		}
		if o := b.part(p, m.role == roleAssistant); o != nil {
			content = append(content, o)
		}
	}
	flush()
}

func (b *responsesBuilder) call(call *canonCall) jobject {
	b.callKinds[call.id] = call.kind
	if call.kind == ToolCustom {
		return jobject{"type": "custom_tool_call", "call_id": call.id, "name": call.name, "input": call.args}
	}
	return jobject{"type": "function_call", "call_id": call.id, "name": call.name, "arguments": call.args}
}

// callOutput writes a tool result; is_error is lost.
func (b *responsesBuilder) callOutput(p canonPart) {
	r := p.result
	if r.isError {
		b.l.add(LossOther, r.errorPath)
	}
	typ := "function_call_output"
	if b.callKinds[r.id] == ToolCustom {
		typ = "custom_tool_call_output"
	}
	var output any = ""
	switch {
	case len(r.parts) == 1 && onlyText(r.parts):
		output = r.parts[0].text
	case len(r.parts) > 0:
		list := []any{}
		for _, part := range r.parts {
			if o := b.part(part, false); o != nil {
				list = append(list, o)
			}
		}
		output = list
	}
	b.input = append(b.input, jobject{"type": typ, "call_id": r.id, "output": output})
}

// part writes one content part, nil when it is left out. Assistant text
// is output_text.
func (b *responsesBuilder) part(p canonPart, assistant bool) jobject {
	var o jobject
	switch p.kind {
	case partText:
		o = jobject{"type": "input_text", "text": p.text}
		if assistant {
			o = jobject{"type": "output_text", "text": p.text, "annotations": []any{}}
		}
	case partRefusal:
		o = jobject{"type": "refusal", "refusal": p.text}
	case partImage:
		o = jobject{"type": "input_image", "detail": "auto"}
		if p.detail != nil {
			o["detail"] = p.detail.value
		}
		setNonEmpty(o, map[string]string{"image_url": p.url, "file_id": p.fileID})
	case partFile:
		o = jobject{"type": "input_file"}
		setNonEmpty(o, map[string]string{"file_data": p.data, "file_id": p.fileID, "file_url": p.url, "filename": p.filename})
	default:
		b.l.add(partLossCategory(p), p.path)
		return nil
	}
	switch {
	case p.cache == nil:
	case p.cache.name == "prompt_cache_breakpoint" && !assistant:
		o[p.cache.name] = p.cache.value
	default:
		b.l.add(LossOther, p.cache.path)
	}
	return o
}

// setNonEmpty sets the non-empty values of kv in o.
func setNonEmpty(o jobject, kv map[string]string) {
	for k, v := range kv {
		if v != "" {
			o[k] = v
		}
	}
}
