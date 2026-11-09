package convert

import (
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"regexp"
	"slices"
	"strings"
)

// ---------------------------------------------------------------- build

// Anthropic limits (CONVERT-MATRIX §9.4, D5).
const (
	claudeDefaultMaxTokens = 8192 // gateway setting default
	claudeMinThinking      = 1024 // smallest budget_tokens
	claudeThinkingFloor    = 1280 // smallest derived max_tokens with thinking
)

// anthropicBuilder writes a canonReq as an Anthropic messages request.
type anthropicBuilder struct {
	c   *canonReq
	opt Options
	l   *losses
	// usedIDs are the tool_use ids written so far.
	usedIDs map[string]bool
}

// aBlock is an Anthropic content block and the client path it came from.
type aBlock struct {
	o    jobject
	path string
}

// aMsg is an Anthropic message under construction.
type aMsg struct {
	role   string
	path   string // the first client message it holds
	blocks []aBlock
}

func (b aBlock) typ() string { return b.o["type"].(string) }

func buildAnthropicRequest(c *canonReq, opt Options, l *losses) (any, error) {
	b := &anthropicBuilder{c: c, opt: opt, l: l, usedIDs: map[string]bool{}}
	out := jobject{"model": c.model}
	system, msgs := b.conversation()
	if len(msgs) == 0 {
		return nil, cfail("messages", "at least one user or assistant message is required")
	}
	if len(system) > 0 {
		out["system"] = blockObjects(system)
	}
	b.tools(out)
	thinking := b.thinking(msgs, out)
	b.sampling(out, thinking)
	b.format(out)
	b.metadata(out)
	if c.stream {
		out["stream"] = true
	}
	rendered := make([]any, len(msgs))
	for i, m := range msgs {
		rendered[i] = jobject{"role": m.role, "content": blockObjects(m.blocks)}
	}
	out["messages"] = rendered
	return out, nil
}

func blockObjects(bs []aBlock) []any {
	out := make([]any, len(bs))
	for i, b := range bs {
		out[i] = b.o
	}
	return out
}

// conversation returns the system blocks and the messages: user and
// assistant alternating, starting with a user message, every tool_use
// answered by a tool_result in the next message.
func (b *anthropicBuilder) conversation() ([]aBlock, []aMsg) {
	system := b.textBlocks(b.c.system)
	var msgs []aMsg
	leading := true
	for _, m := range b.c.msgs {
		if m.isSystem() {
			// System messages after the conversation started move into
			// the system prompt.
			if !leading {
				b.l.add(LossOther, m.path)
			}
			system = append(system, b.textBlocks(m.parts)...)
			continue
		}
		leading = false
		role := roleUser
		if m.role == roleAssistant {
			role = roleAssistant
		}
		msgs = appendMsg(msgs, aMsg{role: role, path: m.path, blocks: b.blocks(m)})
	}
	msgs = mergeMsgs(b.pairTools(msgs))
	if len(msgs) > 0 && msgs[0].role != roleUser {
		b.l.add(LossOther, msgs[0].path)
		msgs = slices.Insert(msgs, 0, aMsg{role: roleUser, blocks: []aBlock{{o: jobject{"type": "text", "text": "."}}}})
	}
	return system, msgs
}

// appendMsg appends m, merging it into the last message of the same role.
// Tool results lead a user message.
func appendMsg(msgs []aMsg, m aMsg) []aMsg {
	if len(m.blocks) == 0 {
		return msgs // empty messages are left out
	}
	if n := len(msgs); n > 0 && msgs[n-1].role == m.role {
		msgs[n-1].blocks = append(msgs[n-1].blocks, m.blocks...)
	} else {
		msgs = append(msgs, m)
	}
	last := &msgs[len(msgs)-1]
	slices.SortStableFunc(last.blocks, func(x, y aBlock) int {
		return boolRank(x.typ() != "tool_result") - boolRank(y.typ() != "tool_result")
	})
	return msgs
}

func boolRank(b bool) int {
	if b {
		return 1
	}
	return 0
}

// mergeMsgs re-merges messages after blocks were dropped.
func mergeMsgs(msgs []aMsg) []aMsg {
	var out []aMsg
	for _, m := range msgs {
		out = appendMsg(out, m)
	}
	return out
}

// pairTools drops the tool_use blocks the next message does not answer and
// the tool_result blocks answering no tool_use of the previous message
// (Anthropic rejects both): a tool loss each.
func (b *anthropicBuilder) pairTools(msgs []aMsg) []aMsg {
	for i := range msgs {
		if msgs[i].role != roleAssistant {
			continue
		}
		var answered map[string]bool
		if i+1 < len(msgs) {
			answered = blockIDs(msgs[i+1].blocks, "tool_result", "tool_use_id")
		}
		msgs[i].blocks = b.dropBlocks(msgs[i].blocks, "tool_use", func(o jobject) bool { return answered[o["id"].(string)] })
	}
	for i := range msgs {
		if msgs[i].role != roleUser {
			continue
		}
		var calls map[string]bool
		if i > 0 {
			calls = blockIDs(msgs[i-1].blocks, "tool_use", "id")
		}
		seen := map[string]bool{}
		msgs[i].blocks = b.dropBlocks(msgs[i].blocks, "tool_result", func(o jobject) bool {
			id := o["tool_use_id"].(string)
			ok := calls[id] && !seen[id]
			seen[id] = true
			return ok
		})
	}
	return msgs
}

// dropBlocks drops the blocks of typ that keep rejects, a tool loss each.
func (b *anthropicBuilder) dropBlocks(bs []aBlock, typ string, keep func(jobject) bool) []aBlock {
	return slices.DeleteFunc(bs, func(x aBlock) bool {
		if x.typ() != typ || keep(x.o) {
			return false
		}
		b.l.add(LossTool, x.path)
		return true
	})
}

func blockIDs(bs []aBlock, typ, key string) map[string]bool {
	ids := map[string]bool{}
	for _, x := range bs {
		if x.typ() == typ {
			ids[x.o[key].(string)] = true
		}
	}
	return ids
}

// textBlocks writes system parts as text blocks; anything else in them,
// and cache marks, are lost.
func (b *anthropicBuilder) textBlocks(parts []canonPart) []aBlock {
	var out []aBlock
	for _, p := range parts {
		b.dropCache(p)
		switch {
		case p.kind != partText && p.kind != partRefusal:
			b.l.add(partLossCategory(p), p.path)
		case p.text != "":
			out = append(out, aBlock{o: jobject{"type": "text", "text": p.text}, path: p.path})
		}
	}
	return out
}

// dropCache records a cache mark as lost: cache marks do not cross between
// OpenAI and Anthropic (CONVERT-MATRIX D7).
func (b *anthropicBuilder) dropCache(p canonPart) {
	if p.cache != nil {
		b.l.add(LossOther, p.cache.path)
	}
}

// partLossCategory is the loss category of dropping a part.
func partLossCategory(p canonPart) LossCategory {
	switch p.kind {
	case partImage:
		return LossImage
	case partToolCall, partToolResult:
		return LossTool
	}
	return LossOther
}

// blocks writes the parts of a user, assistant or tool message.
func (b *anthropicBuilder) blocks(m canonMsg) []aBlock {
	var out []aBlock
	for _, p := range m.parts {
		b.dropCache(p)
		if o := b.block(p); o != nil {
			out = append(out, aBlock{o: o, path: p.path})
		}
	}
	return out
}

// block writes one part, nil when it is left out.
func (b *anthropicBuilder) block(p canonPart) jobject {
	switch p.kind {
	case partText, partRefusal:
		if p.text == "" {
			return nil
		}
		return jobject{"type": "text", "text": p.text}
	case partImage:
		return b.image(p)
	case partFile:
		return b.document(p)
	case partToolCall:
		return b.toolUse(p)
	case partToolResult:
		return b.toolResult(p)
	}
	return nil
}

// anthropicImageTypes are the media types Anthropic accepts for images.
var anthropicImageTypes = map[string]bool{"image/jpeg": true, "image/png": true, "image/gif": true, "image/webp": true}

func (b *anthropicBuilder) image(p canonPart) jobject {
	if p.detail != nil {
		b.l.add(LossImage, p.detail.path)
	}
	src := mediaSource(p.url, anthropicImageTypes)
	if src == nil {
		b.l.add(LossImage, p.path)
		return nil
	}
	return jobject{"type": "image", "source": src}
}

// mediaSource returns the Anthropic source of an http(s) URL or a data URL
// of an accepted media type, nil otherwise.
func mediaSource(url string, types map[string]bool) jobject {
	if isHTTPURL(url) {
		return jobject{"type": "url", "url": url}
	}
	mime, data, ok := parseDataURL(url)
	if !ok || !types[mime] {
		return nil
	}
	return jobject{"type": "base64", "media_type": mime, "data": data}
}

// document writes a file part: a PDF (data or URL) or plain text data; a
// file id names an OpenAI file Anthropic does not know.
func (b *anthropicBuilder) document(p canonPart) jobject {
	var src jobject
	switch {
	case p.url != "":
		src = jobject{"type": "url", "url": p.url}
	case p.data != "":
		src = mediaSource(p.data, map[string]bool{"application/pdf": true})
		if mime, data, _ := parseDataURL(p.data); src == nil && mime == "text/plain" {
			if text, err := base64.StdEncoding.DecodeString(data); err == nil {
				src = jobject{"type": "text", "media_type": "text/plain", "data": string(text)}
			}
		}
	}
	if src == nil {
		b.l.add(LossOther, p.path)
		return nil
	}
	doc := jobject{"type": "document", "source": src}
	if p.filename != "" {
		doc["title"] = p.filename
	}
	return doc
}

// anthropicToolIDPattern is what Anthropic accepts as a tool_use id.
var anthropicToolIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)

// anthropicToolID rewrites a client tool call id Anthropic would reject,
// deterministically so a call and its result agree: invalid characters
// become "_" and an 8-digit hash of the original keeps ids distinct.
func anthropicToolID(id string) string {
	if anthropicToolIDPattern.MatchString(id) {
		return id
	}
	sum := sha1.Sum([]byte(id))
	clean := strings.Map(func(r rune) rune {
		if r < 128 && anthropicToolIDPattern.MatchString(string(r)) {
			return r
		}
		return '_'
	}, id)
	return clean + "_" + hex.EncodeToString(sum[:])[:8]
}

// customInputSchema is the input of a custom tool sent as a function.
var customInputSchema = jobject{"type": "object", "properties": jobject{"input": jobject{"type": "string"}},
	"required": []any{"input"}}

func (b *anthropicBuilder) toolUse(p canonPart) jobject {
	call := p.call
	id := anthropicToolID(call.id)
	if b.usedIDs[id] {
		b.l.add(LossTool, p.path) // Anthropic tool_use ids are unique
		return nil
	}
	b.usedIDs[id] = true
	var input any = jobject{"input": call.args}
	if call.kind != ToolCustom {
		input = b.toolInput(call.args, p.path)
	}
	return jobject{"type": "tool_use", "id": id, "name": call.name, "input": input}
}

// toolInput parses function arguments; arguments that are not a JSON object
// become {} (a tool loss), empty arguments are {}.
func (b *anthropicBuilder) toolInput(args, path string) jobject {
	if strings.TrimSpace(args) == "" {
		return jobject{}
	}
	o, err := decodeJObject([]byte(args), path)
	if err != nil {
		b.l.add(LossTool, path+".arguments")
		return jobject{}
	}
	return o
}

func (b *anthropicBuilder) toolResult(p canonPart) jobject {
	r := p.result
	o := jobject{"type": "tool_result", "tool_use_id": anthropicToolID(r.id)}
	var content []any
	for _, part := range r.parts {
		b.dropCache(part)
		switch part.kind {
		case partText, partRefusal, partImage, partFile:
			if x := b.block(part); x != nil {
				content = append(content, x)
			}
		default:
			b.l.add(LossOther, part.path)
		}
	}
	if len(content) > 0 {
		o["content"] = content
	}
	if r.isError {
		o["is_error"] = true
	}
	return o
}

// tools writes the tool definitions and tool_choice.
func (b *anthropicBuilder) tools(out jobject) {
	var tools []any
	for _, t := range b.c.tools {
		tools = append(tools, b.tool(t))
	}
	if len(tools) > 0 {
		out["tools"] = tools
	}
	if choice := b.toolChoice(len(tools) > 0); choice != nil {
		out["tool_choice"] = choice
	}
}

func (b *anthropicBuilder) tool(t canonTool) jobject {
	for _, d := range t.details {
		// strict: false is the default; other details have no Anthropic
		// equivalent (a custom tool's grammar, search_context_size, ...).
		if d.name == "strict" && d.value == false {
			continue
		}
		if !(t.kind == "web_search" && slices.Contains(anthropicSearchFields, d.name)) {
			b.l.add(LossOther, d.path)
		}
	}
	switch t.kind {
	case "web_search":
		o := jobject{"type": "web_search_20250305", "name": "web_search"}
		for _, d := range t.details {
			if slices.Contains(anthropicSearchFields, d.name) {
				o[d.name] = d.value
			}
		}
		if len(t.location) > 0 {
			o["user_location"] = locationFields(jobject{"type": "approximate"}, t.location)
		}
		return o
	case ToolCustom:
		if b.c.resp.customTools == nil {
			b.c.resp.customTools = map[string]bool{}
		}
		b.c.resp.customTools[t.name] = true
	}
	o := jobject{"name": t.name, "input_schema": t.schema}
	if t.kind == ToolCustom {
		o["input_schema"] = customInputSchema
	} else if t.schema == nil {
		o["input_schema"] = jobject{"type": "object"}
	}
	if t.description != "" {
		o["description"] = t.description
	}
	return o
}

// anthropicSearchFields are the web search options Anthropic takes as is.
var anthropicSearchFields = []string{"allowed_domains", "blocked_domains", "max_uses"}

// toolChoice writes tool_choice with parallel_tool_calls folded in; nil
// when there is nothing to say.
func (b *anthropicBuilder) toolChoice(hasTools bool) jobject {
	ch := b.c.choice
	parallel, hasParallel := b.c.take("parallel_tool_calls")
	if !hasTools {
		// Without tools a choice other than none or auto cannot be kept.
		if ch != nil && ch.mode != "none" && ch.mode != "auto" {
			b.l.add(LossTool, ch.path)
		}
		return nil
	}
	o := jobject{"type": "auto"}
	if ch != nil {
		o = b.choiceObject(ch)
	}
	if o["type"] == "none" {
		return o // parallel calls are moot; none takes no options
	}
	if (hasParallel && parallel.value == false) || (!hasParallel && b.c.resp.legacyFunctions) {
		o["disable_parallel_tool_use"] = true
	}
	if ch == nil && len(o) == 1 {
		return nil
	}
	return o
}

func (b *anthropicBuilder) choiceObject(ch *canonChoice) jobject {
	switch ch.mode {
	case "none", "auto":
		return jobject{"type": ch.mode}
	case "required":
		return jobject{"type": "any"}
	case "tool":
		if slices.ContainsFunc(b.c.tools, func(t canonTool) bool { return t.name == ch.name }) {
			return jobject{"type": "tool", "name": ch.name}
		}
	case "allowed":
		// Anthropic cannot restrict the tools: the restriction is relaxed.
		b.l.add(LossTool, ch.path)
		if ch.allowedMode == "required" {
			return jobject{"type": "any"}
		}
		return jobject{"type": "auto"}
	}
	b.l.add(LossTool, ch.path)
	return jobject{"type": "auto"}
}

// thinking writes thinking and max_tokens (CONVERT-MATRIX §9.4, D5) and
// reports whether thinking is on.
func (b *anthropicBuilder) thinking(msgs []aMsg, out jobject) bool {
	// Anthropic thinking is always visible: a summary request is met.
	b.c.take("reasoning_summary")
	budget := b.budget()
	if budget > 0 && b.thinkingBlocked(msgs, out) {
		b.l.add(LossReasoning, b.c.reasoning.path)
		budget = 0
	}
	maxTokens := b.c.maxTokens
	if maxTokens == 0 {
		maxTokens = b.defaultMaxTokens()
		if budget > 0 {
			maxTokens = max(maxTokens, budget+1, claudeThinkingFloor)
		}
	}
	out["max_tokens"] = maxTokens
	if budget == 0 {
		return false
	}
	out["thinking"] = jobject{"type": "enabled", "budget_tokens": budget}
	return true
}

// budget returns the thinking budget the client's reasoning effort asks
// for, 0 for none. A budget that does not fit the client's output limit is
// cut to it; below Anthropic's minimum thinking is off (a reasoning loss).
func (b *anthropicBuilder) budget() int64 {
	r := b.c.reasoning
	if r == nil || r.effort == "none" {
		return 0
	}
	budget, ok := effortBudget[r.effort]
	if ok && b.c.maxTokens > 0 {
		budget = min(budget, b.c.maxTokens-1)
	}
	if !ok || budget < claudeMinThinking {
		b.l.add(LossReasoning, r.path)
		return 0
	}
	return budget
}

// thinkingBlocked reports whether Anthropic would reject thinking: the
// tool choice forces a tool, or the last assistant message calls tools
// without a signed thinking block of its own (converted history never has
// one, CONVERT-MATRIX §3.2).
func (b *anthropicBuilder) thinkingBlocked(msgs []aMsg, out jobject) bool {
	if tc, ok := out["tool_choice"].(jobject); ok && (tc["type"] == "any" || tc["type"] == "tool") {
		return true
	}
	for i := len(msgs) - 1; i >= 0; i-- {
		if msgs[i].role != roleAssistant {
			continue
		}
		bs := msgs[i].blocks
		calls := slices.ContainsFunc(bs, func(x aBlock) bool { return x.typ() == "tool_use" })
		signed := slices.ContainsFunc(bs, func(x aBlock) bool { return x.typ() == "thinking" && x.o["signature"] != nil })
		return calls && !signed
	}
	return false
}

func (b *anthropicBuilder) defaultMaxTokens() int64 {
	if f := b.opt.ClaudeDefaultMaxTokens; f != nil {
		if n := f(b.c.model); n > 0 {
			return int64(n)
		}
	}
	return claudeDefaultMaxTokens
}

// sampling writes temperature (Anthropic takes 0-1), top_p, top_k and stop
// sequences. Thinking takes no sampling parameters.
func (b *anthropicBuilder) sampling(out jobject, thinking bool) {
	for _, name := range []string{"temperature", "top_p", "top_k"} {
		p, ok := b.c.take(name)
		switch {
		case !ok:
		case thinking:
			b.l.add(LossOther, p.path)
		case name == "temperature" && numberAbove(p.value, 1):
			b.l.add(LossOther, p.path)
			out[name] = 1
		default:
			out[name] = p.value
		}
	}
	if p, ok := b.c.take("stop"); ok {
		out["stop_sequences"] = p.value
	}
}

// numberAbove reports a JSON number greater than limit.
func numberAbove(v any, limit float64) bool {
	n, _ := v.(json.Number)
	f, err := n.Float64()
	return err == nil && f > limit
}

// format writes a json_schema output format; Anthropic decoding is always
// constrained, so a non-strict schema or a description is lost.
func (b *anthropicBuilder) format(out jobject) {
	f := b.c.format
	if f == nil || f.typ == "text" {
		return
	}
	if f.typ != "json_schema" || f.schema == nil {
		b.l.add(LossOther, f.path)
		return
	}
	if f.description != "" {
		b.l.add(LossOther, f.path+".description")
	}
	if f.strict == nil || !*f.strict {
		b.l.add(LossOther, f.path+".strict")
	}
	out["output_config"] = jobject{"format": jobject{"type": "json_schema", "schema": f.schema}}
}

// anthropicServiceTiers maps OpenAI service tiers to Anthropic ones.
var anthropicServiceTiers = map[string]string{"auto": "auto", "default": "standard_only"}

// metadata writes the user id and the service tier.
func (b *anthropicBuilder) metadata(out jobject) {
	user, ok := b.c.take("user")
	if !ok {
		user, ok = b.c.take("safety_identifier")
	}
	if ok {
		out["metadata"] = jobject{"user_id": user.value}
	}
	if p, ok := b.c.take("service_tier"); ok {
		if tier, known := anthropicServiceTiers[p.value.(string)]; known {
			out["service_tier"] = tier
		} else {
			b.l.add(LossOther, p.path)
		}
	}
}

// ---------------------------------------------------------------- parse

// anthropicParser reads an Anthropic messages request into a canonReq.
type anthropicParser struct {
	c *canonReq
	l *losses
}

func parseAnthropicRequest(body []byte, l *losses) (*canonReq, error) {
	in, err := decodeJObject(body, "request")
	if err != nil {
		return nil, err
	}
	p := &anthropicParser{c: &canonReq{}, l: l}
	for _, k := range members(in) {
		if err := p.member(k, in[k]); err != nil {
			return nil, err
		}
	}
	if p.c.model == "" {
		return nil, cfail("model", "expected nonempty string")
	}
	if len(p.c.msgs) == 0 {
		return nil, cfail("messages", "at least one message is required")
	}
	return p.c, nil
}

func (p *anthropicParser) member(k string, v any) (err error) {
	c := p.c
	switch k {
	case "model":
		c.model, err = jnonempty(v, k)
	case "messages":
		err = p.messages(v)
	case "system":
		c.system, err = p.content(v, k)
	case "max_tokens":
		err = c.maxTokensParam(k, v)
	case "stream":
		c.stream, err = jbool(v, k)
	case "temperature", "top_p", "top_k":
		err = c.numberParam(k, k, v)
	case "stop_sequences":
		err = c.stopParam(k, v)
	case "metadata":
		err = p.metadata(v)
	case "service_tier":
		err = p.serviceTier(v)
	case "thinking":
		err = p.thinking(v)
	case "output_config":
		err = p.outputConfig(v)
	case "tools":
		err = p.tools(v)
	case "tool_choice":
		err = p.toolChoice(v)
	case "mcp_servers":
		p.l.add(LossTool, k)
	default:
		// container, context_management, inference_geo, members added later
		p.l.add(LossOther, k)
	}
	return err
}

func (p *anthropicParser) metadata(v any) error {
	o, err := jobj(v, "metadata")
	if err != nil {
		return err
	}
	keepOther(o, "metadata", p.l, "user_id")
	if u, ok := o["user_id"]; ok {
		return p.c.stringParam("user", "metadata.user_id", u)
	}
	return nil
}

// openAIServiceTiers maps Anthropic service tiers to OpenAI ones.
var openAIServiceTiers = map[string]string{"auto": "auto", "standard_only": "default"}

func (p *anthropicParser) serviceTier(v any) error {
	s, err := jstr(v, "service_tier")
	if tier, ok := openAIServiceTiers[s]; ok {
		p.c.param("service_tier", "service_tier", tier)
	} else if err == nil {
		p.l.add(LossOther, "service_tier")
	}
	return err
}

// thinking reads the thinking configuration as an effort; an explicit
// output_config.effort wins (outputConfig).
func (p *anthropicParser) thinking(v any) error {
	o, err := jobj(v, "thinking")
	if err != nil {
		return err
	}
	keepOther(o, "thinking", p.l, "type", "budget_tokens")
	effort := ""
	switch o["type"] {
	case "enabled":
		budget, err := jint(o["budget_tokens"], "thinking.budget_tokens", 0, 1<<31-1)
		if err != nil {
			return err
		}
		effort = budgetEffort(budget)
	case "adaptive":
		effort = "medium"
	case "disabled":
		return nil
	default:
		return cfail("thinking.type", "expected enabled, adaptive or disabled")
	}
	if p.c.reasoning == nil {
		p.c.reasoning = &canonReasoning{path: "thinking", effort: effort}
	}
	return nil
}

func (p *anthropicParser) outputConfig(v any) error {
	const path = "output_config"
	o, err := jobj(v, path)
	if err != nil {
		return err
	}
	keepOther(o, path, p.l, "effort", "format")
	if e, ok := o["effort"]; ok {
		if p.c.reasoning, err = readReasoningEffort(e, path+".effort"); err != nil {
			return err
		}
		if p.c.reasoning.effort == "max" {
			p.c.reasoning.effort = "xhigh"
		}
	}
	if f, ok := o["format"]; ok {
		return p.format(f, path+".format")
	}
	return nil
}

func (p *anthropicParser) format(v any, path string) error {
	o, err := jobj(v, path)
	if err != nil {
		return err
	}
	keepOther(o, path, p.l, "type", "schema")
	if o["type"] != "json_schema" {
		return cfail(path+".type", "expected json_schema")
	}
	schema, err := jobj(o["schema"], path+".schema")
	strict := true
	p.c.format = &canonFormat{path: path, typ: "json_schema", name: "output", schema: schema, strict: &strict}
	return err
}

func (p *anthropicParser) tools(v any) error {
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
		typ, _ := o["type"].(string)
		var t canonTool
		switch {
		case typ == "" || typ == "custom":
			t, err = p.functionTool(o, path)
		case strings.HasPrefix(typ, "web_search_"):
			t, err = p.webSearchTool(o, path)
		default:
			// bash, text_editor, code_execution, computer, web_fetch,
			// memory, ...: no OpenAI equivalent
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

func (p *anthropicParser) functionTool(o jobject, path string) (canonTool, error) {
	keepOther(o, path, p.l, "type", "name", "description", "input_schema", "strict", "cache_control")
	t := canonTool{path: path, kind: ToolFunction}
	var err error
	if t.name, err = jnonempty(o["name"], path+".name"); err != nil {
		return t, err
	}
	if err = readDescription(o, path, &t); err != nil {
		return t, err
	}
	if t.schema, err = jobj(o["input_schema"], path+".input_schema"); err != nil {
		return t, err
	}
	t.details = toolDetails(o, path, "strict", "cache_control")
	return t, nil
}

func (p *anthropicParser) webSearchTool(o jobject, path string) (canonTool, error) {
	keepOther(o, path, p.l, append(anthropicSearchFields, "type", "name", "user_location", "cache_control")...)
	t := canonTool{path: path, kind: "web_search", details: toolDetails(o, path, append(anthropicSearchFields, "cache_control")...)}
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

// toolDetails returns the named members of a tool definition as details.
func toolDetails(o jobject, path string, names ...string) []canonParam {
	var out []canonParam
	for _, k := range names {
		if v, ok := o[k]; ok {
			out = append(out, canonParam{name: k, path: path + "." + k, value: v})
		}
	}
	return out
}

func (p *anthropicParser) toolChoice(v any) error {
	const path = "tool_choice"
	o, err := jobj(v, path)
	if err != nil {
		return err
	}
	keepOther(o, path, p.l, "type", "name", "disable_parallel_tool_use")
	if d, ok := o["disable_parallel_tool_use"]; ok {
		b, err := jbool(d, path+".disable_parallel_tool_use")
		if err != nil {
			return err
		}
		if b {
			p.c.param("parallel_tool_calls", path+".disable_parallel_tool_use", false)
		}
	}
	ch := &canonChoice{path: path}
	switch o["type"] {
	case "auto", "none":
		ch.mode = o["type"].(string)
	case "any":
		ch.mode = "required"
	case "tool":
		ch.mode = "tool"
		ch.name, err = jnonempty(o["name"], path+".name")
	default:
		return cfail(path+".type", "expected auto, any, tool or none")
	}
	p.c.choice = ch
	return err
}

func (p *anthropicParser) messages(v any) error {
	msgs, err := jlist(v, "messages")
	if err != nil {
		return err
	}
	for i, mv := range msgs {
		path := jpos("messages", i)
		msg, err := jobj(mv, path)
		if err != nil {
			return err
		}
		keepOther(msg, path, p.l, "role", "content")
		role, _ := msg["role"].(string)
		if role != roleUser && role != roleAssistant {
			return cfail(path+".role", "expected user or assistant")
		}
		parts, err := p.content(msg["content"], path+".content")
		if err != nil {
			return err
		}
		p.addMessage(role, path, parts)
	}
	return nil
}

// addMessage adds the parts of a message; each tool result becomes its own
// tool message, in order.
func (p *anthropicParser) addMessage(role, path string, parts []canonPart) {
	m := canonMsg{role: role, path: path}
	for _, part := range parts {
		if part.kind != partToolResult {
			m.parts = append(m.parts, part)
			continue
		}
		if len(m.parts) > 0 {
			p.c.msgs = append(p.c.msgs, m)
			m.parts = nil
		}
		p.c.msgs = append(p.c.msgs, canonMsg{role: roleTool, path: part.path, parts: []canonPart{part}})
	}
	if len(m.parts) > 0 {
		p.c.msgs = append(p.c.msgs, m)
	}
}

// content reads a string or content blocks.
func (p *anthropicParser) content(v any, path string) ([]canonPart, error) {
	s, list, isStr, err := textOrParts(v, path)
	if err != nil || isStr {
		return []canonPart{textPart(s, path)}, err
	}
	var parts []canonPart
	for i, bv := range list {
		bp := jpos(path, i)
		o, err := jobj(bv, bp)
		if err != nil {
			return nil, err
		}
		part, ok, err := p.block(o, bp)
		if err != nil {
			return nil, err
		}
		if !ok {
			continue
		}
		if cc, ok := o["cache_control"]; ok {
			part.cache = &canonParam{name: "cache_control", path: bp + ".cache_control", value: cc}
		}
		parts = append(parts, part)
	}
	return parts, nil
}

// isServerToolBlock reports a history block of a server tool.
func isServerToolBlock(typ string) bool {
	return typ == "server_tool_use" || typ == "mcp_tool_use" || strings.HasSuffix(typ, "_tool_result")
}

// block reads one content block; ok is false for a block left out.
func (p *anthropicParser) block(o jobject, path string) (canonPart, bool, error) {
	typ, _ := o["type"].(string)
	part := canonPart{path: path}
	var err error
	switch {
	case typ == "text":
		keepOther(o, path, p.l, "type", "text", "cache_control")
		part.text, err = jstr(o["text"], path+".text")
	case typ == "image":
		keepOther(o, path, p.l, "type", "source", "cache_control")
		part.kind = partImage
		if err = p.imageSource(o["source"], path+".source", &part); err == nil && part.url == "" {
			p.l.add(LossImage, path)
			return part, false, nil
		}
	case typ == "document":
		keepOther(o, path, p.l, "type", "source", "title", "cache_control")
		return p.document(o, path)
	case typ == "search_result":
		p.l.add(LossOther, path)
		part.text = searchResultText(o)
	case typ == "tool_use":
		return p.toolUse(o, path)
	case typ == "tool_result":
		return p.toolResult(o, path)
	case typ == "thinking" || typ == "redacted_thinking":
		p.l.add(LossReasoning, path)
		return part, false, nil
	case isServerToolBlock(typ):
		p.l.add(LossTool, path)
		return part, false, nil
	default:
		p.l.add(LossOther, path)
		return part, false, nil
	}
	return part, true, err
}

// searchResultText renders a search_result block as text: title, source
// and the text of its content.
func searchResultText(o jobject) string {
	lines := []string{}
	for _, k := range []string{"title", "source"} {
		if s, ok := o[k].(string); ok && s != "" {
			lines = append(lines, s)
		}
	}
	list, _ := o["content"].([]any)
	for _, x := range list {
		if b, ok := x.(map[string]any); ok {
			if s, ok := b["text"].(string); ok {
				lines = append(lines, s)
			}
		}
	}
	return strings.Join(lines, "\n")
}

// imageSource reads an image source into part.
func (p *anthropicParser) imageSource(v any, path string, part *canonPart) error {
	src, err := jobj(v, path)
	if err != nil {
		return err
	}
	part.url, err = p.mediaRef(src, path)
	return err
}

// mediaRef reads a base64 or url source as a data URL or an http(s) URL.
// A file source ("" here) names an Anthropic file no other provider knows.
func (p *anthropicParser) mediaRef(src jobject, path string) (string, error) {
	switch src["type"] {
	case "base64":
		keepOther(src, path, p.l, "type", "media_type", "data")
		mime, err := jnonempty(src["media_type"], path+".media_type")
		if err != nil {
			return "", err
		}
		data, err := jnonempty(src["data"], path+".data")
		return dataURL(mime, data), err
	case "url":
		keepOther(src, path, p.l, "type", "url")
		return jnonempty(src["url"], path+".url")
	case "file":
		return "", nil
	}
	return "", cfail(path+".type", "expected base64, url or file")
}

// document reads a document block: a PDF or text source, a URL or a file.
func (p *anthropicParser) document(o jobject, path string) (canonPart, bool, error) {
	part := canonPart{kind: partFile, path: path}
	if t, ok := o["title"]; ok {
		var err error
		if part.filename, err = jstr(t, path+".title"); err != nil {
			return part, false, err
		}
	}
	sp := path + ".source"
	src, err := jobj(o["source"], sp)
	if err != nil {
		return part, false, err
	}
	switch src["type"] {
	case "base64", "url", "file":
		ref, err := p.mediaRef(src, sp)
		if err == nil && ref == "" {
			p.l.add(LossOther, path)
			return part, false, nil
		}
		if src["type"] == "base64" {
			part.data = ref
		} else {
			part.url = ref
		}
		return part, true, err
	case "text":
		keepOther(src, sp, p.l, "type", "media_type", "data")
		part.kind = partText
		part.text, err = jstr(src["data"], sp+".data")
		return part, true, err
	}
	// content sources and source types added later
	p.l.add(LossOther, path)
	return part, false, nil
}

func (p *anthropicParser) toolUse(o jobject, path string) (canonPart, bool, error) {
	keepOther(o, path, p.l, "type", "id", "name", "input", "cache_control")
	id, err := jnonempty(o["id"], path+".id")
	if err != nil {
		return canonPart{}, false, err
	}
	name, err := jnonempty(o["name"], path+".name")
	if err != nil {
		return canonPart{}, false, err
	}
	input, err := jobj(o["input"], path+".input")
	if err != nil {
		return canonPart{}, false, err
	}
	args, err := json.Marshal(input)
	return canonPart{kind: partToolCall, path: path, call: &canonCall{id: id, name: name, kind: ToolFunction, args: string(args)}}, true, err
}

func (p *anthropicParser) toolResult(o jobject, path string) (canonPart, bool, error) {
	keepOther(o, path, p.l, "type", "tool_use_id", "content", "is_error", "cache_control")
	r := &canonResult{}
	var err error
	if r.id, err = jnonempty(o["tool_use_id"], path+".tool_use_id"); err != nil {
		return canonPart{}, false, err
	}
	if v, ok := o["content"]; ok {
		if r.parts, err = p.content(v, path+".content"); err != nil {
			return canonPart{}, false, err
		}
	}
	if v, ok := o["is_error"]; ok {
		if r.isError, err = jbool(v, path+".is_error"); err != nil {
			return canonPart{}, false, err
		}
		r.errorPath = path + ".is_error"
	}
	return canonPart{kind: partToolResult, path: path, result: r}, true, nil
}
