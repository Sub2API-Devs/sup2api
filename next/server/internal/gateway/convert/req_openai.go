package convert

// Request shapes OpenAI chat and OpenAI responses share up to nesting:
// chat nests a tool definition under "function"/"custom" and a json_schema
// format under "json_schema", responses keeps them flat. The readers take
// the object holding the fields; the writers return the flat form.

// openAIImageDetails are the image detail values OpenAI accepts.
var openAIImageDetails = map[string]bool{"auto": true, "low": true, "high": true, "original": true}

// readImageDetail reads an image detail; auto and unknown values read as
// nil (unknown ones are an image loss).
func readImageDetail(v any, path string, l *losses) *canonParam {
	s, _ := v.(string)
	if !openAIImageDetails[s] {
		l.add(LossImage, path)
	}
	if s == "auto" || !openAIImageDetails[s] {
		return nil
	}
	return &canonParam{name: "detail", path: path, value: s}
}

// readSchemaFormat reads {name, description?, schema?, strict?} of a
// json_schema format.
func readSchemaFormat(o jobject, path string, l *losses, f *canonFormat) error {
	keepOther(o, path, l, "type", "name", "description", "schema", "strict")
	var err error
	if f.name, err = jnonempty(o["name"], path+".name"); err != nil {
		return err
	}
	if v, ok := o["description"]; ok {
		if f.description, err = jstr(v, path+".description"); err != nil {
			return err
		}
	}
	if v, ok := o["schema"]; ok {
		if f.schema, err = jobj(v, path+".schema"); err != nil {
			return err
		}
	}
	if v, ok := o["strict"]; ok {
		b, err := jbool(v, path+".strict")
		if err != nil {
			return err
		}
		f.strict = &b
	}
	return nil
}

// writeSchemaFormat returns the flat json_schema format of f.
func writeSchemaFormat(f *canonFormat) jobject {
	o := jobject{"type": "json_schema", "name": f.name}
	if f.description != "" {
		o["description"] = f.description
	}
	if f.schema != nil {
		o["schema"] = f.schema
	}
	if f.strict != nil {
		o["strict"] = *f.strict
	}
	return o
}

// readFunctionTool reads {name, description?, parameters?, strict?}; extra
// lists further members of o that belong to the caller.
func readFunctionTool(o jobject, path string, l *losses, extra ...string) (canonTool, error) {
	keepOther(o, path, l, append(extra, "name", "description", "parameters", "strict")...)
	t := canonTool{path: path, kind: ToolFunction}
	var err error
	if t.name, err = jnonempty(o["name"], path+".name"); err != nil {
		return t, err
	}
	if err = readDescription(o, path, &t); err != nil {
		return t, err
	}
	if v, ok := o["parameters"]; ok {
		if t.schema, err = jobj(v, path+".parameters"); err != nil {
			return t, err
		}
	}
	if v, ok := o["strict"]; ok {
		b, err := jbool(v, path+".strict")
		if err != nil {
			return t, err
		}
		// strict: false is the chat default; responses builders write it.
		t.details = append(t.details, canonParam{name: "strict", path: path + ".strict", value: b})
	}
	return t, nil
}

func readDescription(o jobject, path string, t *canonTool) error {
	v, ok := o["description"]
	if !ok {
		return nil
	}
	var err error
	t.description, err = jstr(v, path+".description")
	return err
}

// readCustomTool reads {name, description?, format?}. The format is kept in
// the flat responses form ({type: grammar, syntax, definition}); a chat
// format nests the grammar ({type: grammar, grammar: {syntax, definition}}).
func readCustomTool(o jobject, path string, l *losses, nested bool, extra ...string) (canonTool, error) {
	keepOther(o, path, l, append(extra, "name", "description", "format")...)
	t := canonTool{path: path, kind: ToolCustom}
	var err error
	if t.name, err = jnonempty(o["name"], path+".name"); err != nil {
		return t, err
	}
	if err = readDescription(o, path, &t); err != nil {
		return t, err
	}
	fv, ok := o["format"]
	if !ok {
		return t, nil
	}
	fp := path + ".format"
	f, err := jobj(fv, fp)
	if err != nil {
		return t, err
	}
	switch f["type"] {
	case "text":
		return t, nil // the default
	case "grammar":
	default:
		return t, cfail(fp+".type", "expected text or grammar")
	}
	g := f
	if nested {
		keepOther(f, fp, l, "type", "grammar")
		if g, err = jobj(f["grammar"], fp+".grammar"); err != nil {
			return t, err
		}
	}
	syntax, err := jnonempty(g["syntax"], fp+".syntax")
	if err != nil {
		return t, err
	}
	def, err := jstr(g["definition"], fp+".definition")
	if err != nil {
		return t, err
	}
	t.details = append(t.details, canonParam{name: "format", path: fp,
		value: jobject{"type": "grammar", "syntax": syntax, "definition": def}})
	return t, nil
}

// readLocation reads the city, country, region and timezone of a web
// search user location.
func readLocation(o jobject, path string, l *losses, extra ...string) (map[string]any, error) {
	keepOther(o, path, l, append(extra, searchLocationFields...)...)
	loc := map[string]any{}
	for _, k := range searchLocationFields {
		if v, ok := o[k]; ok {
			s, err := jstr(v, path+"."+k)
			if err != nil {
				return nil, err
			}
			loc[k] = s
		}
	}
	return loc, nil
}

// locationFields copies a canon location into dst.
func locationFields(dst jobject, loc map[string]any) jobject {
	for k, v := range loc {
		dst[k] = v
	}
	return dst
}

// readToolChoice reads none/auto/required, a named function or custom
// tool, or allowed_tools. A chat choice nests the name and the allowed
// tools ({type: function, function: {name}}).
func readToolChoice(v any, path string, l *losses, nested bool) (*canonChoice, error) {
	if s, isStr := v.(string); isStr {
		switch s {
		case "none", "auto", "required":
			return &canonChoice{path: path, mode: s}, nil
		}
		return nil, cfail(path, "expected none, auto, required or a tool")
	}
	o, err := jobj(v, path)
	if err != nil {
		return nil, err
	}
	switch o["type"] {
	case ToolFunction, ToolCustom:
		name, err := choiceName(o, path, l, nested)
		if err != nil {
			return nil, err
		}
		return &canonChoice{path: path, mode: "tool", name: name}, nil
	case "allowed_tools":
		return readAllowedTools(o, path, l, nested)
	}
	// A hosted tool choice ({type: web_search}, ...): no target forces it.
	l.add(LossTool, path)
	return nil, nil
}

// choiceName returns the tool name of a named choice.
func choiceName(o jobject, path string, l *losses, nested bool) (string, error) {
	typ := o["type"].(string)
	if !nested {
		keepOther(o, path, l, "type", "name")
		return jnonempty(o["name"], path+".name")
	}
	keepOther(o, path, l, "type", typ)
	inner, err := jobj(o[typ], path+"."+typ)
	if err != nil {
		return "", err
	}
	keepOther(inner, path+"."+typ, l, "name")
	return jnonempty(inner["name"], path+"."+typ+".name")
}

func readAllowedTools(o jobject, path string, l *losses, nested bool) (*canonChoice, error) {
	at := o
	if nested {
		keepOther(o, path, l, "type", "allowed_tools")
		var err error
		if at, err = jobj(o["allowed_tools"], path+".allowed_tools"); err != nil {
			return nil, err
		}
		path += ".allowed_tools"
	}
	keepOther(at, path, l, "type", "mode", "tools")
	ch := &canonChoice{path: path, mode: "allowed"}
	var err error
	if ch.allowedMode, err = jnonempty(at["mode"], path+".mode"); err != nil {
		return nil, err
	}
	list, err := jlist(at["tools"], path+".tools")
	if err != nil {
		return nil, err
	}
	for i, t := range list {
		tp := jpos(path+".tools", i)
		to, err := jobj(t, tp)
		if err != nil {
			return nil, err
		}
		if to["type"] != ToolFunction && to["type"] != ToolCustom {
			l.add(LossTool, tp)
			continue
		}
		name, err := choiceName(to, tp, l, nested)
		if err != nil {
			return nil, err
		}
		ch.allowed = append(ch.allowed, name)
	}
	return ch, nil
}

// writeToolChoice writes ch for chat (nested) or responses.
func writeToolChoice(c *canonReq, ch *canonChoice, nested bool) any {
	named := func(name string) jobject {
		kind := c.toolKind(name)
		if nested {
			return jobject{"type": kind, kind: jobject{"name": name}}
		}
		return jobject{"type": kind, "name": name}
	}
	switch ch.mode {
	case "tool":
		return named(ch.name)
	case "allowed":
		tools := make([]any, len(ch.allowed))
		for i, name := range ch.allowed {
			tools[i] = named(name)
		}
		at := jobject{"mode": ch.allowedMode, "tools": tools}
		if nested {
			return jobject{"type": "allowed_tools", "allowed_tools": at}
		}
		at["type"] = "allowed_tools"
		return at
	}
	return ch.mode
}

// readReasoningEffort reads an OpenAI reasoning effort at path.
func readReasoningEffort(v any, path string) (*canonReasoning, error) {
	effort, err := jnonempty(v, path)
	if err != nil {
		return nil, err
	}
	return &canonReasoning{path: path, effort: effort}, nil
}

// takeOpenAIParams moves the params OpenAI chat and responses both carry
// under the same name into out.
func takeOpenAIParams(c *canonReq, out jobject, names ...string) {
	for _, name := range names {
		if p, ok := c.take(name); ok {
			out[name] = p.value
		}
	}
}

// openAIShared are the params with the same name and meaning in OpenAI chat
// and responses.
var openAIShared = []string{"temperature", "top_p", "parallel_tool_calls", "service_tier", "user",
	"safety_identifier", "prompt_cache_key", "prompt_cache_retention", "metadata"}
