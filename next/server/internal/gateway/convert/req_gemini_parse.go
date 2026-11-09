package convert

import (
	"bytes"
	"encoding/json"
	"mime"
	"path"
	"slices"
	"strconv"
	"strings"
)

// The request side of the conversions from Gemini generateContent clients
// (CONVERT-MATRIX §9, §9.9): a parser into canonReq; the OpenAI builders
// write it. Members are accepted in camelCase and snake_case, as proto JSON
// does (§9).

// geminiRequest is the requestFunc of a pair from a Gemini client: the
// model and streaming come from the endpoint, not the body.
func geminiRequest(build canonBuild) requestFunc {
	return canonRequest(parseGeminiRequest, func(c *canonReq, opt Options, l *losses) (any, error) {
		c.model, c.stream = opt.Model, opt.Stream
		return build(c, opt, l)
	})
}

// camelize renames the snake_case members of o to camelCase in place; a
// member given both ways keeps the camelCase value. Only Gemini's own
// objects are renamed, never schemas, arguments or responses.
func camelize(o jobject) {
	for k, v := range o {
		if !strings.Contains(k, "_") || strings.HasPrefix(k, "_") {
			continue
		}
		words := strings.Split(k, "_")
		for i := 1; i < len(words); i++ {
			if w := words[i]; w != "" {
				words[i] = strings.ToUpper(w[:1]) + w[1:]
			}
		}
		delete(o, k)
		if ck := strings.Join(words, ""); o[ck] == nil {
			o[ck] = v
		}
	}
}

// geminiObject reads a Gemini object at path with its members camelized.
func geminiObject(v any, path string) (jobject, error) {
	o, err := jobj(v, path)
	if err == nil {
		camelize(o)
	}
	return o, err
}

// geminiParser reads a Gemini generateContent request into a canonReq.
type geminiParser struct {
	c *canonReq
	l *losses
	// calls are the function calls not answered yet, in order.
	calls []pendingCall
}

// pendingCall is a function call waiting for its response; synth: its id
// was made up, so only a response without an id can answer it.
type pendingCall struct {
	id, name string
	synth    bool
}

func parseGeminiRequest(body []byte, l *losses) (*canonReq, error) {
	in, err := decodeJObject(body, "request")
	if err != nil {
		return nil, err
	}
	camelize(in)
	p := &geminiParser{c: &canonReq{}, l: l}
	for _, k := range members(in) {
		if err := p.member(k, in[k]); err != nil {
			return nil, err
		}
	}
	if len(p.c.msgs) == 0 {
		return nil, cfail("contents", "at least one content is required")
	}
	return p.c, nil
}

func (p *geminiParser) member(k string, v any) error {
	switch k {
	case "contents":
		return p.contents(v)
	case "systemInstruction":
		return p.system(v)
	case "generationConfig":
		return p.generationConfig(v)
	case "tools":
		return p.tools(v)
	case "toolConfig":
		return p.toolConfig(v)
	case "cachedContent":
		return cfail(k, "cached content cannot be converted")
	case "model":
		// The endpoint path names the model.
	default:
		// safetySettings, labels, members added later
		if !isEmpty(v) {
			p.l.add(LossOther, k)
		}
	}
	return nil
}

func (p *geminiParser) system(v any) error {
	const path = "systemInstruction"
	o, err := geminiObject(v, path)
	if err != nil {
		return err
	}
	keepOther(o, path, p.l, "role", "parts")
	parts, err := jlist(o["parts"], path+".parts")
	if err != nil {
		return err
	}
	for j, pv := range parts {
		pp := jpos(path+".parts", j)
		po, err := geminiObject(pv, pp)
		if err != nil {
			return err
		}
		keepOther(po, pp, p.l, "text")
		s, err := jstr(po["text"], pp+".text")
		if err != nil {
			return err
		}
		if s != "" {
			p.c.system = append(p.c.system, textPart(s, pp))
		}
	}
	return nil
}

func (p *geminiParser) contents(v any) error {
	list, err := jlist(v, "contents")
	if err != nil {
		return err
	}
	for i, cv := range list {
		path := jpos("contents", i)
		o, err := geminiObject(cv, path)
		if err != nil {
			return err
		}
		keepOther(o, path, p.l, "role", "parts")
		role := roleUser
		if r, ok := o["role"]; ok {
			if role, err = jstr(r, path+".role"); err != nil {
				return err
			}
		}
		parts, err := jlist(o["parts"], path+".parts")
		if err != nil {
			return err
		}
		switch role {
		case "model":
			err = p.turn(parts, path, i, true)
		case roleUser, "function", "":
			err = p.turn(parts, path, i, false)
		default:
			err = cfail(path+".role", "expected user or model")
		}
		if err != nil {
			return err
		}
	}
	return nil
}

// turn reads the parts of one content: a model turn is an assistant
// message; a user turn a user message, with each function response a tool
// message of its own in place.
func (p *geminiParser) turn(parts []any, path string, turn int, model bool) error {
	role := roleUser
	if model {
		role = roleAssistant
	}
	var cur []canonPart
	flush := func() {
		if len(cur) > 0 {
			p.c.msgs = append(p.c.msgs, canonMsg{role: role, path: path, parts: cur})
			cur = nil
		}
	}
	for j, pv := range parts {
		pp := jpos(path+".parts", j)
		o, err := geminiObject(pv, pp)
		if err != nil {
			return err
		}
		part, ok, err := p.part(o, pp, turn, j, model)
		switch {
		case err != nil:
			return err
		case !ok:
		case part.kind == partToolResult:
			flush()
			p.c.msgs = append(p.c.msgs, canonMsg{role: roleTool, path: pp, parts: []canonPart{part}})
		default:
			cur = append(cur, part)
		}
	}
	flush()
	return nil
}

// part reads one part; ok is false for a part left out. Thoughts and
// thought signatures are reasoning history, dropped (CONVERT-MATRIX §3.2).
func (p *geminiParser) part(o jobject, path string, turn, index int, model bool) (canonPart, bool, error) {
	if _, ok := o["thoughtSignature"]; ok {
		p.l.add(LossReasoning, path+".thoughtSignature")
		delete(o, "thoughtSignature")
	}
	if o["thought"] == true {
		p.l.add(LossReasoning, path)
		return canonPart{}, false, nil
	}
	delete(o, "thought")
	has := func(k string) bool { _, ok := o[k]; return ok }
	switch {
	case has("text"):
		keepOther(o, path, p.l, "text")
		s, err := jstr(o["text"], path+".text")
		return textPart(s, path), s != "", err
	case has("inlineData"):
		return p.inlineData(o, path)
	case has("fileData"):
		return p.fileData(o, path)
	case has("functionCall") && model:
		return p.functionCall(o, path, turn, index)
	case has("functionResponse") && !model:
		return p.functionResponse(o, path)
	case has("functionCall"), has("functionResponse"), has("executableCode"), has("codeExecutionResult"):
		// misplaced calls and responses, code execution history
		p.l.add(LossTool, path)
	default:
		p.l.add(LossOther, path)
	}
	return canonPart{}, false, nil
}

// inlineData reads inline media: an image, or a PDF or text file, as a
// data URL. Audio and video have no counterpart the targets write.
func (p *geminiParser) inlineData(o jobject, path string) (canonPart, bool, error) {
	keepOther(o, path, p.l, "inlineData")
	bp := path + ".inlineData"
	blob, err := geminiObject(o["inlineData"], bp)
	if err != nil {
		return canonPart{}, false, err
	}
	keepOther(blob, bp, p.l, "mimeType", "data")
	mt, err := jnonempty(blob["mimeType"], bp+".mimeType")
	if err != nil {
		return canonPart{}, false, err
	}
	data, err := jstr(blob["data"], bp+".data")
	if err != nil {
		return canonPart{}, false, err
	}
	mt = mediaType(mt)
	url := "data:" + mt + ";base64," + data
	switch {
	case strings.HasPrefix(mt, "image/"):
		return canonPart{kind: partImage, path: path, url: url}, true, nil
	case mt == "application/pdf" || strings.HasPrefix(mt, "text/"):
		return canonPart{kind: partFile, path: path, data: url}, true, nil
	}
	p.l.add(LossOther, path)
	return canonPart{}, false, nil
}

// fileData reads media by URI: an http(s) image as an image URL. Gemini
// file URIs (files/..., gs://...) name files only Gemini knows.
func (p *geminiParser) fileData(o jobject, path string) (canonPart, bool, error) {
	keepOther(o, path, p.l, "fileData")
	fp := path + ".fileData"
	f, err := geminiObject(o["fileData"], fp)
	if err != nil {
		return canonPart{}, false, err
	}
	keepOther(f, fp, p.l, "mimeType", "fileUri")
	uri, err := jnonempty(f["fileUri"], fp+".fileUri")
	if err != nil {
		return canonPart{}, false, err
	}
	mt := uriType(uri)
	if x, ok := f["mimeType"]; ok {
		if mt, err = jstr(x, fp+".mimeType"); err != nil {
			return canonPart{}, false, err
		}
	}
	image := strings.HasPrefix(mediaType(mt), "image/")
	switch {
	case image && isHTTPURL(uri):
		return canonPart{kind: partImage, path: path, url: uri}, true, nil
	case image:
		p.l.add(LossImage, path)
	default:
		p.l.add(LossOther, path)
	}
	return canonPart{}, false, nil
}

// uriType guesses the media type of a URI from its extension.
func uriType(uri string) string { return mime.TypeByExtension(path.Ext(uri)) }

// functionCall reads a call of a model turn; a call without an id gets one
// from its position (CONVERT-MATRIX §9.3).
func (p *geminiParser) functionCall(o jobject, path string, turn, index int) (canonPart, bool, error) {
	keepOther(o, path, p.l, "functionCall")
	fp := path + ".functionCall"
	fc, err := jobj(o["functionCall"], fp)
	if err != nil {
		return canonPart{}, false, err
	}
	keepOther(fc, fp, p.l, "id", "name", "args")
	call := canonCall{kind: ToolFunction, args: "{}"}
	if call.name, err = jnonempty(fc["name"], fp+".name"); err != nil {
		return canonPart{}, false, err
	}
	if err = optStrings(fc, fp, map[string]*string{"id": &call.id}); err != nil {
		return canonPart{}, false, err
	}
	synth := call.id == ""
	if synth {
		call.id = synthCallID(strconv.Itoa(turn), index)
	}
	if a, ok := fc["args"]; ok {
		args, err := jobj(a, fp+".args")
		if err != nil {
			return canonPart{}, false, err
		}
		call.args = compactValue(args)
	}
	p.calls = append(p.calls, pendingCall{id: call.id, name: call.name, synth: synth})
	return canonPart{kind: partToolCall, path: path, call: &call}, true, nil
}

// functionResponse reads the response to a call: matched by id, else to
// the first unanswered call of its name without an id of its own; a response to no call is a tool
// loss. Its media parts are the result's images and files.
func (p *geminiParser) functionResponse(o jobject, path string) (canonPart, bool, error) {
	keepOther(o, path, p.l, "functionResponse")
	fp := path + ".functionResponse"
	fr, err := jobj(o["functionResponse"], fp)
	if err != nil {
		return canonPart{}, false, err
	}
	keepOther(fr, fp, p.l, "id", "name", "response", "parts")
	var id, name string
	if name, err = jnonempty(fr["name"], fp+".name"); err != nil {
		return canonPart{}, false, err
	}
	if err = optStrings(fr, fp, map[string]*string{"id": &id}); err != nil {
		return canonPart{}, false, err
	}
	r := &canonResult{}
	var ok bool
	if r.id, ok = p.answer(id, name); !ok {
		p.l.add(LossTool, path)
		return canonPart{}, false, nil
	}
	text, isError := functionResponseText(fr["response"])
	r.parts = []canonPart{textPart(text, fp+".response")}
	if isError {
		r.isError, r.errorPath = true, fp+".response.error"
	}
	if pv, ok := fr["parts"]; ok {
		media, err := p.responseParts(pv, fp+".parts")
		if err != nil {
			return canonPart{}, false, err
		}
		r.parts = append(r.parts, media...)
	}
	return canonPart{kind: partToolResult, path: path, result: r}, true, nil
}

// responseParts reads the media parts of a function response.
func (p *geminiParser) responseParts(v any, path string) ([]canonPart, error) {
	list, err := jlist(v, path)
	if err != nil {
		return nil, err
	}
	var out []canonPart
	for j, x := range list {
		pp := jpos(path, j)
		o, err := geminiObject(x, pp)
		if err != nil {
			return nil, err
		}
		var part canonPart
		ok := false
		switch {
		case o["inlineData"] != nil:
			part, ok, err = p.inlineData(o, pp)
		case o["fileData"] != nil:
			part, ok, err = p.fileData(o, pp)
		default:
			p.l.add(LossOther, pp)
		}
		if err != nil {
			return nil, err
		}
		if ok {
			out = append(out, part)
		}
	}
	return out, nil
}

// answer pairs a function response with its call and returns the call id.
func (p *geminiParser) answer(id, name string) (string, bool) {
	i := slices.IndexFunc(p.calls, func(c pendingCall) bool {
		if id != "" {
			return c.id == id && !c.synth
		}
		return c.name == name && c.synth
	})
	if i < 0 {
		return "", false
	}
	callID := p.calls[i].id
	p.calls = slices.Delete(p.calls, i, i+1)
	return callID, true
}

// functionResponseText returns the text of a function response: the text
// of {"output": text} (the shape conversions to Gemini write) or of
// {"error": text}, else the response as JSON.
func functionResponseText(v any) (text string, isError bool) {
	if o, ok := v.(jobject); ok && len(o) == 1 {
		if s, ok := o["output"].(string); ok {
			return s, false
		}
		if s, ok := o["error"].(string); ok {
			return s, true
		}
	}
	if v == nil {
		return "{}", false
	}
	return compactValue(v), false
}

// compactValue returns v as compact JSON without HTML escaping.
func compactValue(v any) string {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
	return strings.TrimSuffix(buf.String(), "\n")
}

func (p *geminiParser) generationConfig(v any) error {
	const path = "generationConfig"
	o, err := geminiObject(v, path)
	if err != nil {
		return err
	}
	for _, k := range members(o) {
		if err := p.genMember(k, o[k], path+"."+k); err != nil {
			return err
		}
	}
	return p.responseFormat(o, path)
}

// geminiNumberParams are the generationConfig numbers with a canon param.
var geminiNumberParams = map[string]string{"temperature": "temperature", "topP": "top_p", "topK": "top_k", "seed": "seed",
	"presencePenalty": "presence_penalty", "frequencyPenalty": "frequency_penalty"}

func (p *geminiParser) genMember(k string, v any, path string) (err error) {
	c := p.c
	if name, ok := geminiNumberParams[k]; ok {
		if strings.HasSuffix(k, "Penalty") && isZero(v) {
			return nil
		}
		return c.numberParam(name, path, v)
	}
	switch k {
	case "maxOutputTokens":
		err = c.maxTokensParam(path, v)
	case "stopSequences":
		err = c.stopParam(path, v)
	case "candidateCount":
		if n, e := jint(v, path, 1, 1<<31-1); e != nil || n != 1 {
			err = cfail(path, "only one candidate has an equivalent")
		}
	case "responseModalities":
		err = p.modalities(v, path)
	case "thinkingConfig":
		c.reasoning, err = readGeminiThinking(v, path, p.l)
	case "responseMimeType", "responseSchema", "responseJsonSchema":
		// responseFormat
	default:
		// logprobs, mediaResolution, speechConfig, ... unless off
		if v != false && !isEmpty(v) {
			p.l.add(LossOther, path)
		}
	}
	return err
}

func (p *geminiParser) modalities(v any, path string) error {
	list, err := jlist(v, path)
	if err != nil {
		return err
	}
	for i, m := range list {
		s, err := jstr(m, jpos(path, i))
		if err != nil {
			return err
		}
		if s = strings.ToUpper(s); s != "TEXT" {
			return cfail(path, s+" output cannot be converted")
		}
	}
	return nil
}

// responseFormat reads the output format: a schema (JSON Schema as is, a
// Gemini Schema converted) or plain JSON output.
func (p *geminiParser) responseFormat(o jobject, path string) error {
	mt := ""
	if x, ok := o["responseMimeType"]; ok {
		var err error
		if mt, err = jstr(x, path+".responseMimeType"); err != nil {
			return err
		}
	}
	for _, k := range []string{"responseJsonSchema", "responseSchema"} {
		x, ok := o[k]
		if !ok {
			continue
		}
		sp := path + "." + k
		schema, err := jobj(x, sp)
		if err != nil {
			return err
		}
		f := &canonFormat{path: sp, typ: "json_schema", name: "response", schema: schema}
		if k == "responseSchema" {
			f.schema = openAPISchema(schema, sp, p.l)
		}
		p.c.format = f
		return nil
	}
	switch mt {
	case "", "text/plain":
	case "application/json":
		p.c.format = &canonFormat{path: path + ".responseMimeType", typ: "json_object"}
	default:
		p.l.add(LossOther, path+".responseMimeType")
	}
	return nil
}

func (p *geminiParser) tools(v any) error {
	list, err := jlist(v, "tools")
	if err != nil {
		return err
	}
	for i, tv := range list {
		path := jpos("tools", i)
		o, err := geminiObject(tv, path)
		if err != nil {
			return err
		}
		for _, k := range members(o) {
			kp := path + "." + k
			switch k {
			case "functionDeclarations":
				err = p.declarations(o[k], kp)
			case "googleSearch", "googleSearchRetrieval":
				p.c.tools = append(p.c.tools, canonTool{path: kp, kind: "web_search"})
				if !isEmpty(o[k]) {
					p.l.add(LossOther, kp) // search options
				}
			default:
				// codeExecution, urlContext, fileSearch, computerUse, ...
				p.l.add(LossTool, kp)
			}
			if err != nil {
				return err
			}
		}
	}
	return nil
}

// declarations reads function declarations; a Gemini Schema becomes JSON
// Schema.
func (p *geminiParser) declarations(v any, path string) error {
	list, err := jlist(v, path)
	if err != nil {
		return err
	}
	for j, dv := range list {
		dp := jpos(path, j)
		d, err := geminiObject(dv, dp)
		if err != nil {
			return err
		}
		keepOther(d, dp, p.l, "name", "description", "parameters", "parametersJsonSchema")
		t := canonTool{path: dp, kind: ToolFunction}
		if t.name, err = jnonempty(d["name"], dp+".name"); err != nil {
			return err
		}
		if err = readDescription(d, dp, &t); err != nil {
			return err
		}
		for _, k := range []string{"parametersJsonSchema", "parameters"} {
			x, ok := d[k]
			if !ok {
				continue
			}
			schema, err := jobj(x, dp+"."+k)
			if err != nil {
				return err
			}
			t.schema = schema
			if k == "parameters" {
				t.schema = openAPISchema(schema, dp+"."+k, p.l)
			}
			break
		}
		p.c.tools = append(p.c.tools, t)
	}
	return nil
}

// toolConfig reads the function calling config as a tool choice: ANY with
// one allowed name forces it, with more restricts to them; VALIDATED has
// no OpenAI form and reads as AUTO.
func (p *geminiParser) toolConfig(v any) error {
	const path = "toolConfig"
	o, err := geminiObject(v, path)
	if err != nil {
		return err
	}
	keepOther(o, path, p.l, "functionCallingConfig")
	x, ok := o["functionCallingConfig"]
	if !ok {
		return nil
	}
	fp := path + ".functionCallingConfig"
	f, err := geminiObject(x, fp)
	if err != nil {
		return err
	}
	keepOther(f, fp, p.l, "mode", "allowedFunctionNames")
	mode := "AUTO"
	if m, ok := f["mode"]; ok {
		if mode, err = jstr(m, fp+".mode"); err != nil {
			return err
		}
	}
	var names []string
	if nv, ok := f["allowedFunctionNames"]; ok {
		if names, err = stringList(nv, fp+".allowedFunctionNames"); err != nil {
			return err
		}
	}
	ch := &canonChoice{path: fp}
	switch strings.ToUpper(mode) {
	case "AUTO", "MODE_UNSPECIFIED":
		ch.mode = "auto"
	case "VALIDATED":
		ch.mode = "auto"
		p.l.add(LossOther, fp+".mode")
	case "ANY":
		ch.mode = "required"
	case "NONE":
		p.c.choice = &canonChoice{path: fp, mode: "none"}
		return nil
	default:
		return cfail(fp+".mode", "expected AUTO, ANY, NONE or VALIDATED")
	}
	switch {
	case len(names) == 1 && ch.mode == "required":
		ch.mode, ch.name = "tool", names[0]
	case len(names) > 0:
		ch.allowedMode, ch.mode, ch.allowed = ch.mode, "allowed", names
	}
	p.c.choice = ch
	return nil
}

// stringList reads an array of nonempty strings.
func stringList(v any, path string) ([]string, error) {
	list, err := jlist(v, path)
	if err != nil {
		return nil, err
	}
	out := make([]string, len(list))
	for i, x := range list {
		if out[i], err = jnonempty(x, jpos(path, i)); err != nil {
			return nil, err
		}
	}
	return out, nil
}
