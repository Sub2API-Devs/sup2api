package moderation

import (
	"bufio"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/tidwall/gjson"
)

// LLM protocols of an llm channel (CONTRACTS §72.13.2, new-api
// llm_client.go). Each protocol is one table entry: path, auth header,
// request body, the stream event table, the non-streaming response parser,
// and how a turn and tool results are sent back on the next step.

const (
	ProtocolOpenAIResponses = "openai_responses"
	ProtocolAnthropic       = "anthropic"

	llmDefaultMaxTokens = 8192
	anthropicVersion    = "2023-06-01"

	maxSSEEvent  = 64 << 10 // one event (all its data lines)
	maxSSEStream = 1 << 20  // one streaming response
)

// Usage semantics of the core price expressions: inclusive = the input
// count already contains the cached tokens.
const (
	SemanticsInclusive = "inclusive"
	SemanticsExclusive = "exclusive"
)

var (
	errStreamCut   = errors.New("stream ended before the final event")
	errStreamError = errors.New("error event in the stream")
)

// LLMTool is a tool definition as sent to the model.
type LLMTool struct {
	Name        string
	Description string
	Schema      any
}

// Tool choices of llmRequest.ToolChoice ("" = auto).
const (
	ChoiceAuto     = "auto"
	ChoiceRequired = "required"
	ChoiceFunction = "function" // must call Tools[0]
)

// llmRequest is the protocol-independent input of one call. Messages are
// already in the protocol's shape (llmUserMessage, user, assistant,
// toolResults).
// ForceTool appends a user note naming the tool instead of forcing it
// (thinking models reject a forced tool_choice); ToolChoice is only used by
// the verdict agent.
type llmRequest struct {
	System      string
	Messages    []any
	Tools       []LLMTool
	ForceTool   string
	ToolChoice  string
	MaxTokens   int
	Temperature *float64
	Stream      bool
}

type llmToolCall struct {
	ID   string
	Name string
	Args json.RawMessage
}

// llmUsage is the usage of one call in the shape the core prices.
type llmUsage struct {
	Input         int64
	Output        int64
	CacheRead     int64
	CacheCreation int64
	Semantics     string
}

func (u *llmUsage) add(o llmUsage) {
	u.Input += o.Input
	u.Output += o.Output
	u.CacheRead += o.CacheRead
	u.CacheCreation += o.CacheCreation
	if o.Semantics != "" {
		u.Semantics = o.Semantics
	}
}

func (u llmUsage) zero() bool { return u.Input+u.Output+u.CacheRead+u.CacheCreation == 0 }

// llmTurn is one model turn.
type llmTurn struct {
	Text      string
	ToolCalls []llmToolCall
	Usage     llmUsage
	Model     string
}

// toolResult is the output of one tool call, sent back on the next step.
type toolResult struct {
	CallID  string
	Content string
}

type eventHandler func(s *llmStream, data []byte) error

type llmProtocol struct {
	path        string
	header      func(key string) map[string]string
	body        func(model string, req llmRequest) map[string]any
	events      map[string]eventHandler
	kindOf      func(name string, data []byte) string
	parse       func(data []byte) (llmTurn, error)
	assistant   func(t llmTurn) []any
	toolResults func(rs []toolResult) []any
	// A user message with images is a list of parts (user): textPart is the
	// type of its text part, imagePart one image in the protocol's shape.
	textPart  string
	imagePart func(img Image) any
}

var llmProtocols = map[string]*llmProtocol{}

func init() {
	llmProtocols[ProtocolOpenAIChat] = &llmProtocol{"/v1/chat/completions", bearer, chatBody, chatEvents, chatKind, chatParse, chatAssistant, chatToolResults, "text", chatImage}
	llmProtocols[ProtocolOpenAIResponses] = &llmProtocol{"/v1/responses", bearer, responsesBody, responsesEvents, responsesKind, responsesParse, responsesAssistant, responsesToolResults,
		"input_text", responsesImage}
	llmProtocols[ProtocolAnthropic] = &llmProtocol{"/v1/messages", anthropicHeader, anthropicBody, anthropicEvents, anthropicKind, anthropicParse, anthropicAssistant, anthropicToolResults,
		"text", anthropicImage}
}

func bearer(key string) map[string]string {
	if key == "" {
		return nil
	}
	return map[string]string{"Authorization": "Bearer " + key}
}

// protocolOf returns the protocol of an llm channel (openai_chat when unset).
func protocolOf(ch *liveChannel) *llmProtocol {
	if p := llmProtocols[ch.Protocol]; p != nil {
		return p
	}
	return llmProtocols[ProtocolOpenAIChat]
}

// call makes one call; ctx carries the timeout. The turn is returned even on
// errors so partial usage stays visible.
func (p *llmProtocol) call(ctx context.Context, ch *liveChannel, req llmRequest) (llmTurn, error) {
	payload, err := json.Marshal(p.body(ch.Model, req))
	if err != nil {
		return llmTurn{}, err
	}
	hreq, err := http.NewRequestWithContext(ctx, http.MethodPost, joinURL(ch.BaseURL, p.path), bytes.NewReader(payload))
	if err != nil {
		return llmTurn{}, err
	}
	hreq.Header.Set("Content-Type", "application/json")
	if req.Stream {
		hreq.Header.Set("Accept", "text/event-stream")
	} else {
		hreq.Header.Set("Accept", "application/json")
	}
	for k, v := range p.header(ch.Key) {
		hreq.Header.Set(k, v)
	}
	client := ch.client
	if client == nil {
		client = http.DefaultClient
	}
	// A non-streaming answer arrives whole, so its first byte comes as late
	// as the last one: only the channel timeout (ctx) bounds it. A stream
	// must show its first model output within ttft_timeout_ms.
	var fb *firstByte
	if req.Stream {
		var release func()
		ctx, fb, release = withFirstByte(ctx, ch)
		defer release()
	}
	resp, err := client.Do(hreq.WithContext(ctx))
	if err != nil {
		return llmTurn{}, ctxErr(ctx, &networkError{err})
	}
	return p.read(ctx, ch, req, resp, fb)
}

// read consumes a response of call; a stream stops fb at its first output.
func (p *llmProtocol) read(ctx context.Context, ch *liveChannel, req llmRequest, resp *http.Response, fb *firstByte) (llmTurn, error) {
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		head, _ := io.ReadAll(io.LimitReader(resp.Body, drainLimit))
		return llmTurn{}, &UpstreamError{Status: resp.StatusCode, message: upstreamMessage(head, ch.Key)}
	}
	if !req.Stream {
		data, err := io.ReadAll(io.LimitReader(resp.Body, maxJSONResponse+1))
		if err != nil {
			return llmTurn{}, ctxErr(ctx, &networkError{err})
		}
		if len(data) > maxJSONResponse {
			return llmTurn{}, errResponseTooLarge
		}
		t, err := p.parse(data)
		if err != nil {
			return t, fmt.Errorf("invalid upstream JSON: %w", err)
		}
		return t, nil
	}
	st := &llmStream{calls: map[int]*toolCallBuf{}, fb: fb}
	err := sseRead(resp.Body, p, st)
	if err != nil {
		err = ctxErr(ctx, err)
	}
	return st.turn(), err
}

// llmUserMessage is a plain user message; the same in all three protocols.
func llmUserMessage(text string) any {
	return map[string]any{"role": "user", "content": text}
}

// user is the user message of an auditor: the text, then the images
// (llmImages) as parts of the protocol. Without images it is the plain
// message (llmUserMessage).
func (p *llmProtocol) user(text string, images []Image) any {
	if len(images) == 0 {
		return llmUserMessage(text)
	}
	parts := make([]any, 0, len(images)+1)
	parts = append(parts, map[string]any{"type": p.textPart, "text": text})
	for _, img := range images {
		parts = append(parts, p.imagePart(img))
	}
	return map[string]any{"role": "user", "content": parts}
}

// Image limits of the LLM auditors (llm_questions, llm_verdict). An image
// outside them is skipped; nothing is redrawn here (the Jev auditor redraws,
// jev_image.go).
const (
	// llmImageMaxBytes is the largest image, decoded (the owner's limit;
	// read off the length of the base64, decodedLen). Anthropic's own API
	// and the OpenAI APIs take it: Anthropic measures the base64 text and
	// takes 10 MB of it, this is 7 MiB. Anthropic on Amazon Bedrock and
	// Google Cloud takes 5 MB of base64 (3.75 MiB of data): an image
	// between the two is refused there, and the call goes on with the
	// text alone (llmImagesRefused).
	llmImageMaxBytes = 5 << 20
	// llmImageMaxSide: Anthropic refuses an image wider or higher than
	// 8000 px.
	llmImageMaxSide = 8000
	// llmMaxImages: with more than 20 images in a request Anthropic applies
	// a lower limit to the sides of every one of them.
	llmMaxImages = 20
	// llmImagesMaxBase64 bounds the images of one call together, and with
	// them the JSON body (the upstream APIs limit a request to some tens of
	// megabytes) and the memory of a call. Measured for building the body
	// of a call at the bound, beside the request itself: it grows with the
	// number of images. openai_chat and openai_responses hold the data
	// URLs (one copy of the base64), what json.Marshal allocates (its
	// buffer is not reliably warm) and the body - about 83 MiB allocated
	// for 3 images, 126 MiB for 8, 143 MiB for 20, that is 4 to 7 times
	// the base64; anthropic, which sends the base64 without a data URL,
	// about 63 to 123 MiB, 3 to 6 times. Images that came with line breaks
	// add the copies without them (llmImages): what stays is at most the
	// images sent, what is copied on the way is up to all the wrapped
	// images of the request, because the total and the count are checked
	// after the copy. The calls themselves are not admitted by their
	// bytes; the requests they serve are: a hook request holds its bytes
	// of max_inflight_mb (128 MB by default) while it is handled, and the
	// post jobs hold at most maxQueueBytes until they are done. That
	// leaves about six of the largest requests in progress on the pre
	// path and about four more in the post queue, each with a call of
	// every LLM auditor of its stage, which in the worst case can exceed the 1024 MB of the
	// plugin (known limitation, DESIGN section 14; the hook then fails
	// open).
	llmImagesMaxBase64 = 20 << 20
)

// llmImages picks the images of in an LLM auditor sends, in order: inline
// PNG, JPEG, GIF and WebP inside the limits above, the same content once.
// URL images are never sent (nor downloaded). The media type is the format
// of the image's header, whatever the client declared: Anthropic refuses an
// image whose declared type is not its real one.
//
// Base64 that came with line breaks - wrapped at 76 characters, a newline at
// its end: what many encoders write, and what the other auditors read - is
// sent without them (unwrapBase64): the limits, the duplicates and the part
// are of that text, so a wrapped and an unwrapped copy of an image are one
// image. An image whose base64 is then not well-formed all the way
// (strictBase64) is skipped like one outside the limits: a strict upstream
// refuses the whole call for it, and the call would go on without any of its
// images (llmImagesRefused).
//
// received lists the images of in (indexes in Input.Images) that parts stand
// for: every image sent and its duplicates. An image that is not among them
// was skipped.
func llmImages(in *Input) (parts []Image, received []int) {
	sent := map[string]bool{}
	size := 0
	for i, img := range in.Images {
		if img.URL != "" {
			continue
		}
		data := img.Data
		if breaks := strings.Count(data, "\r") + strings.Count(data, "\n"); breaks > 0 {
			// Not copied when it is over the size limit whatever its padding.
			if base64.StdEncoding.DecodedLen(len(data)-breaks) > llmImageMaxBytes+2 {
				continue
			}
			data = unwrapBase64(data, len(data)-breaks)
		}
		if sent[data] {
			received = append(received, i)
			continue
		}
		if len(parts) == llmMaxImages || decodedLen(data) > llmImageMaxBytes || size+len(data) > llmImagesMaxBase64 {
			continue
		}
		cfg, format, ok := imageHeader(data)
		if !ok || min(cfg.Width, cfg.Height) <= 0 || max(cfg.Width, cfg.Height) > llmImageMaxSide || !strictBase64(data) {
			continue
		}
		sent[data] = true
		size += len(data)
		parts = append(parts, Image{MediaType: "image/" + format, Data: data})
		received = append(received, i)
	}
	return parts, received
}

// unwrapBase64 is s without its line breaks (CR and LF, nothing else), size
// bytes long: one copy, which lives as long as the parts of the call that
// hold it.
func unwrapBase64(s string, size int) string {
	// One pass over the bytes: a text that is mostly line breaks costs no
	// more than one that has none.
	out := make([]byte, 0, size)
	for i := 0; i < len(s); i++ {
		if c := s[i]; c != '\r' && c != '\n' {
			out = append(out, c)
		}
	}
	return string(out)
}

// llmImagesRefused is the status of err when it is how an upstream (or a
// proxy before it) refuses a call for its images, 0 otherwise: 400, 413 (the
// body is too large), 415 and 422. A call that carried images and was
// answered so is made once more with the text alone (llmQuestionsAudit,
// agent.run). 404, 429 and 5xx say nothing about the images: they stay
// errors. Nor does one of the four statuses when the call with the text
// alone is answered with one of them too (a wrong model name, max_tokens,
// tool_choice): then the images were not what the upstream refused, and the
// result is the error of that call, without a refusal.
func llmImagesRefused(err error) int {
	switch st := upstreamStatus(err); st {
	case http.StatusBadRequest, http.StatusRequestEntityTooLarge, http.StatusUnsupportedMediaType, http.StatusUnprocessableEntity:
		return st
	}
	return 0
}

// strictBase64 reports whether s is base64 as the strictest upstream reads
// it (RFC 4648 section 4): the standard alphabet, padded to a multiple of
// four, nothing behind the padding, no line breaks (llmImages takes them out
// first) and zero padding bits. The decoders of this package are looser -
// they skip line breaks, and imageHeader reads the head of an image only.
// The text is decoded as a stream into nothing: no decoded copy is held.
func strictBase64(s string) bool {
	if len(s)%4 != 0 || strings.IndexByte(s, '\n') >= 0 || strings.IndexByte(s, '\r') >= 0 {
		return false
	}
	// The stream decoder reads the text in pieces and takes padding at the
	// end of one of them for the end of the text.
	if i := strings.IndexByte(s, '='); i >= 0 && i < len(s)-2 {
		return false
	}
	_, err := io.Copy(io.Discard, base64.NewDecoder(base64.StdEncoding.Strict(), strings.NewReader(s)))
	return err == nil
}

// decodedLen is the size of the data in a padded base64 text, by the length
// of the text alone.
func decodedLen(b64 string) int {
	return base64.StdEncoding.DecodedLen(len(b64)) - strings.Count(b64[max(len(b64)-2, 0):], "=")
}

func stepMessages(req llmRequest) []any {
	if req.ForceTool == "" {
		return req.Messages
	}
	return append(append([]any{}, req.Messages...), llmUserMessage("上下文预算已用完，必须现在调用 "+req.ForceTool+"。"))
}

func maxTokensOf(req llmRequest) int {
	if req.MaxTokens > 0 {
		return req.MaxTokens
	}
	return llmDefaultMaxTokens
}

// argsObject returns the arguments as a JSON object for protocols that send
// them structured; invalid fragments become {}.
func argsObject(args json.RawMessage) json.RawMessage {
	if gjson.ValidBytes(args) && gjson.ParseBytes(args).IsObject() {
		return args
	}
	return json.RawMessage("{}")
}

// ---------------------------------------------------------------- SSE

type sseEvent struct {
	name string
	data []byte
}

// sseRead dispatches the events of one streaming response. A line or event
// over 64 KB, more than 1 MB in total, a read failure or an end before the
// final event are errors.
func sseRead(body io.Reader, p *llmProtocol, st *llmStream) error {
	sc := bufio.NewScanner(body)
	sc.Buffer(make([]byte, 0, 4<<10), maxSSEEvent)
	var ev sseEvent
	total := 0
	dispatch := func() error {
		defer func() { ev = sseEvent{} }()
		if len(ev.data) == 0 {
			return nil
		}
		if bytes.Equal(ev.data, []byte("[DONE]")) {
			st.done = true
			return nil
		}
		h := p.events[p.kindOf(ev.name, ev.data)]
		if h == nil {
			return nil
		}
		// The first event that adds model output stops the first byte timer.
		before := st.progress()
		err := h(st, ev.data)
		if st.progress() > before {
			st.fb.arrived()
		}
		return err
	}
	for sc.Scan() {
		line := sc.Bytes()
		if total += len(line) + 1; total > maxSSEStream {
			return errResponseTooLarge
		}
		if len(line) == 0 {
			if err := dispatch(); err != nil {
				return err
			}
			continue
		}
		field, value, _ := bytes.Cut(line, []byte(":"))
		value = bytes.TrimPrefix(value, []byte(" "))
		switch string(field) {
		case "event":
			ev.name = string(value)
		case "data":
			if len(ev.data) > 0 {
				ev.data = append(ev.data, '\n')
			}
			ev.data = append(ev.data, value...)
			if len(ev.data) > maxSSEEvent {
				return errResponseTooLarge
			}
		}
	}
	if err := sc.Err(); err != nil {
		if errors.Is(err, bufio.ErrTooLong) {
			return errResponseTooLarge
		}
		return &networkError{fmt.Errorf("%w: %w", errStreamCut, err)}
	}
	if err := dispatch(); err != nil {
		return err
	}
	if !st.done {
		return errStreamCut
	}
	return nil
}

// llmStream accumulates one streaming turn.
type llmStream struct {
	text  strings.Builder
	calls map[int]*toolCallBuf
	order []int
	// unkept is the size of the model output the turn does not keep
	// (reasoning, thinking, other output items and deltas).
	unkept int
	usage  llmUsage
	model  string
	done   bool
	fb     *firstByte
}

// progress grows with every piece of model output: text, tool calls and
// their arguments, and the output the turn does not keep.
func (s *llmStream) progress() int {
	n := s.text.Len() + s.unkept + len(s.order)
	for _, b := range s.calls {
		n += b.args.Len()
	}
	return n
}

type toolCallBuf struct {
	id, name string
	args     strings.Builder
	final    string
	hasFinal bool
}

func (s *llmStream) call(index int) *toolCallBuf {
	if b, ok := s.calls[index]; ok {
		return b
	}
	b := &toolCallBuf{}
	s.calls[index] = b
	s.order = append(s.order, index)
	return b
}

func (s *llmStream) turn() llmTurn {
	t := llmTurn{Text: s.text.String(), Usage: s.usage, Model: s.model}
	for _, i := range s.order {
		b := s.calls[i]
		args := b.args.String()
		if b.hasFinal {
			args = b.final
		}
		t.ToolCalls = append(t.ToolCalls, llmToolCall{ID: b.id, Name: b.name, Args: []byte(args)})
	}
	return t
}

func markDone(s *llmStream, _ []byte) error {
	s.done = true
	return nil
}

func streamError(*llmStream, []byte) error { return errStreamError }

// ---------------------------------------------------------------- Anthropic Messages

func anthropicHeader(key string) map[string]string {
	return map[string]string{"x-api-key": key, "anthropic-version": anthropicVersion}
}

func anthropicBody(model string, req llmRequest) map[string]any {
	body := map[string]any{"model": model, "max_tokens": maxTokensOf(req), "messages": stepMessages(req)}
	if req.Stream {
		body["stream"] = true
	}
	if req.Temperature != nil {
		body["temperature"] = *req.Temperature
	}
	if req.System != "" {
		body["system"] = []any{map[string]any{"type": "text", "text": req.System, "cache_control": map[string]any{"type": "ephemeral"}}}
	}
	if len(req.Tools) > 0 {
		tools := make([]any, 0, len(req.Tools))
		for _, t := range req.Tools {
			tools = append(tools, map[string]any{"name": t.Name, "description": t.Description, "input_schema": t.Schema})
		}
		body["tools"] = tools
		switch req.ToolChoice {
		case ChoiceRequired:
			body["tool_choice"] = map[string]any{"type": "any"}
		case ChoiceFunction:
			body["tool_choice"] = map[string]any{"type": "tool", "name": req.Tools[0].Name}
		default:
			body["tool_choice"] = map[string]any{"type": "auto"}
		}
	}
	return body
}

func anthropicKind(name string, data []byte) string {
	if name != "" {
		return name
	}
	return gjson.GetBytes(data, "type").String()
}

var anthropicEvents = map[string]eventHandler{
	"message_start":       anthropicMessageStart,
	"content_block_start": anthropicBlockStart,
	"content_block_delta": anthropicBlockDelta,
	"message_delta":       anthropicMessageDelta,
	"message_stop":        markDone,
	"error":               streamError,
}

func anthropicUsage(u gjson.Result) llmUsage {
	return llmUsage{Input: u.Get("input_tokens").Int(), Output: u.Get("output_tokens").Int(),
		CacheRead: u.Get("cache_read_input_tokens").Int(), CacheCreation: u.Get("cache_creation_input_tokens").Int(), Semantics: SemanticsExclusive}
}

func anthropicMessageStart(s *llmStream, data []byte) error {
	msg := gjson.GetBytes(data, "message")
	s.model = msg.Get("model").String()
	s.usage = anthropicUsage(msg.Get("usage"))
	return nil
}

func anthropicBlockStart(s *llmStream, data []byte) error {
	block := gjson.GetBytes(data, "content_block")
	switch block.Get("type").String() {
	case "tool_use":
		b := s.call(int(gjson.GetBytes(data, "index").Int()))
		b.id, b.name = block.Get("id").String(), block.Get("name").String()
	case "text":
		s.text.WriteString(block.Get("text").String())
	default: // thinking, redacted_thinking
		s.unkept += len(block.Raw)
	}
	return nil
}

func anthropicBlockDelta(s *llmStream, data []byte) error {
	delta := gjson.GetBytes(data, "delta")
	switch delta.Get("type").String() {
	case "input_json_delta":
		s.call(int(gjson.GetBytes(data, "index").Int())).args.WriteString(delta.Get("partial_json").String())
	case "text_delta":
		s.text.WriteString(delta.Get("text").String())
	default: // thinking_delta, signature_delta
		s.unkept += len(delta.Raw)
	}
	return nil
}

func anthropicMessageDelta(s *llmStream, data []byte) error {
	u := gjson.GetBytes(data, "usage")
	if out := u.Get("output_tokens"); out.Exists() {
		s.usage.Output = out.Int()
	}
	// Some gateways only report the input in message_delta.
	if in := u.Get("input_tokens"); in.Exists() && in.Int() > 0 {
		s.usage.Input = in.Int()
	}
	if v := u.Get("cache_read_input_tokens"); v.Exists() && v.Int() > 0 {
		s.usage.CacheRead = v.Int()
	}
	if v := u.Get("cache_creation_input_tokens"); v.Exists() && v.Int() > 0 {
		s.usage.CacheCreation = v.Int()
	}
	return nil
}

func anthropicParse(data []byte) (llmTurn, error) {
	if !gjson.ValidBytes(data) {
		return llmTurn{}, errors.New(snippet(data, 200))
	}
	r := gjson.ParseBytes(data)
	t := llmTurn{Model: r.Get("model").String(), Usage: anthropicUsage(r.Get("usage"))}
	for _, b := range r.Get("content").Array() {
		switch b.Get("type").String() {
		case "text":
			t.Text += b.Get("text").String()
		case "tool_use":
			t.ToolCalls = append(t.ToolCalls, llmToolCall{ID: b.Get("id").String(), Name: b.Get("name").String(), Args: []byte(b.Get("input").Raw)})
		}
	}
	return t, nil
}

func anthropicAssistant(t llmTurn) []any {
	content := []any{}
	if t.Text != "" {
		content = append(content, map[string]any{"type": "text", "text": t.Text})
	}
	for _, c := range t.ToolCalls {
		content = append(content, map[string]any{"type": "tool_use", "id": c.ID, "name": c.Name, "input": argsObject(c.Args)})
	}
	return []any{map[string]any{"role": "assistant", "content": content}}
}

func anthropicImage(img Image) any {
	return map[string]any{"type": "image", "source": map[string]any{"type": "base64", "media_type": img.MediaType, "data": img.Data}}
}

func anthropicToolResults(rs []toolResult) []any {
	blocks := make([]any, 0, len(rs))
	for _, r := range rs {
		blocks = append(blocks, map[string]any{"type": "tool_result", "tool_use_id": r.CallID, "content": r.Content})
	}
	return []any{map[string]any{"role": "user", "content": blocks}}
}

// ---------------------------------------------------------------- OpenAI Chat Completions

func chatBody(model string, req llmRequest) map[string]any {
	messages := make([]any, 0, len(req.Messages)+2)
	if req.System != "" {
		messages = append(messages, map[string]any{"role": "system", "content": req.System})
	}
	messages = append(messages, stepMessages(req)...)
	body := map[string]any{"model": model, "messages": messages, "max_tokens": maxTokensOf(req), "stream": req.Stream}
	if req.Stream {
		body["stream_options"] = map[string]any{"include_usage": true}
	}
	if req.Temperature != nil {
		body["temperature"] = *req.Temperature
	}
	if len(req.Tools) > 0 {
		tools := make([]any, 0, len(req.Tools))
		for _, t := range req.Tools {
			tools = append(tools, map[string]any{"type": "function", "function": map[string]any{"name": t.Name, "description": t.Description, "parameters": t.Schema}})
		}
		body["tools"] = tools
		switch req.ToolChoice {
		case ChoiceRequired:
			body["tool_choice"] = "required"
		case ChoiceFunction:
			body["tool_choice"] = map[string]any{"type": "function", "function": map[string]any{"name": req.Tools[0].Name}}
		default:
			body["tool_choice"] = "auto"
		}
	}
	return body
}

func chatKind(_ string, data []byte) string {
	// Some gateways send "error": null in every chunk.
	e := gjson.GetBytes(data, "error")
	if e.IsObject() || (e.Type == gjson.String && e.String() != "") {
		return "error"
	}
	return "chunk"
}

var chatEvents = map[string]eventHandler{"chunk": chatChunk, "error": streamError}

func chatUsage(u gjson.Result) llmUsage {
	return llmUsage{Input: u.Get("prompt_tokens").Int(), Output: u.Get("completion_tokens").Int(),
		CacheRead: u.Get("prompt_tokens_details.cached_tokens").Int(), Semantics: SemanticsInclusive}
}

// chatChunk: tool call fragments are joined by index; the chunk with usage
// (include_usage) gives the usage; [DONE] or a finish_reason ends the turn.
func chatChunk(s *llmStream, data []byte) error {
	chunk := gjson.ParseBytes(data)
	if m := chunk.Get("model").String(); m != "" {
		s.model = m
	}
	if u := chunk.Get("usage"); u.IsObject() {
		s.usage = chatUsage(u)
	}
	if chunk.Get("choices.0.finish_reason").String() != "" {
		s.done = true
	}
	delta := chunk.Get("choices.0.delta")
	s.text.WriteString(delta.Get("content").String())
	s.unkept += len(delta.Get("reasoning_content").String()) + len(delta.Get("reasoning").String())
	calls := delta.Get("tool_calls").Array()
	for _, c := range calls {
		b := s.call(int(c.Get("index").Int()))
		if id := c.Get("id").String(); id != "" {
			b.id = id
		}
		if name := c.Get("function.name").String(); name != "" {
			b.name = name
		}
		b.args.WriteString(c.Get("function.arguments").String())
		s.unkept++ // a fragment without arguments is output too
	}
	return nil
}

func chatParse(data []byte) (llmTurn, error) {
	if !gjson.ValidBytes(data) {
		return llmTurn{}, errors.New(snippet(data, 200))
	}
	r := gjson.ParseBytes(data)
	if !r.Get("choices.0").Exists() {
		return llmTurn{}, errors.New("upstream response has no choices")
	}
	msg := r.Get("choices.0.message")
	t := llmTurn{Model: r.Get("model").String(), Usage: chatUsage(r.Get("usage")), Text: contentString(json.RawMessage(msg.Get("content").Raw))}
	for _, c := range msg.Get("tool_calls").Array() {
		args := c.Get("function.arguments")
		raw := []byte(args.Raw)
		if args.Type == gjson.String {
			raw = []byte(args.String())
		}
		t.ToolCalls = append(t.ToolCalls, llmToolCall{ID: c.Get("id").String(), Name: c.Get("function.name").String(), Args: raw})
	}
	return t, nil
}

func chatAssistant(t llmTurn) []any {
	msg := map[string]any{"role": "assistant", "content": nil}
	if t.Text != "" {
		msg["content"] = t.Text
	}
	if len(t.ToolCalls) > 0 {
		calls := make([]any, 0, len(t.ToolCalls))
		for _, c := range t.ToolCalls {
			calls = append(calls, map[string]any{"id": c.ID, "type": "function", "function": map[string]any{"name": c.Name, "arguments": string(c.Args)}})
		}
		msg["tool_calls"] = calls
	}
	return []any{msg}
}

func chatImage(img Image) any {
	return map[string]any{"type": "image_url", "image_url": map[string]any{"url": img.DataURL()}}
}

func chatToolResults(rs []toolResult) []any {
	out := make([]any, 0, len(rs))
	for _, r := range rs {
		out = append(out, map[string]any{"role": "tool", "tool_call_id": r.CallID, "content": r.Content})
	}
	return out
}

// ---------------------------------------------------------------- OpenAI Responses

func responsesBody(model string, req llmRequest) map[string]any {
	body := map[string]any{"model": model, "store": false, "input": stepMessages(req), "max_output_tokens": maxTokensOf(req)}
	if req.Stream {
		body["stream"] = true
	}
	if req.Temperature != nil {
		body["temperature"] = *req.Temperature
	}
	if req.System != "" {
		body["instructions"] = req.System
	}
	if len(req.Tools) > 0 {
		tools := make([]any, 0, len(req.Tools))
		for _, t := range req.Tools {
			tools = append(tools, map[string]any{"type": "function", "name": t.Name, "description": t.Description, "parameters": t.Schema})
		}
		body["tools"] = tools
		switch req.ToolChoice {
		case ChoiceRequired:
			body["tool_choice"] = "required"
		case ChoiceFunction:
			body["tool_choice"] = map[string]any{"type": "function", "name": req.Tools[0].Name}
		default:
			body["tool_choice"] = "auto"
		}
	}
	return body
}

// responsesOtherDelta is the kind of every *.delta event without a handler
// of its own (reasoning summaries, audio, refusals ...).
const responsesOtherDelta = "response.*.delta"

// responsesKind folds the *.delta events without a handler into one kind,
// so they still count as model output (new-api llm_client.go).
func responsesKind(name string, data []byte) string {
	if name == "" {
		name = gjson.GetBytes(data, "type").String()
	}
	if _, ok := responsesEvents[name]; !ok && strings.HasSuffix(name, ".delta") {
		return responsesOtherDelta
	}
	return name
}

var responsesEvents = map[string]eventHandler{
	"response.output_item.added":             responsesItemAdded,
	"response.output_text.delta":             responsesTextDelta,
	responsesOtherDelta:                      responsesUnkeptDelta,
	"response.function_call_arguments.delta": responsesArgsDelta,
	"response.function_call_arguments.done":  responsesArgsDone,
	"response.completed":                     responsesCompleted,
	"response.incomplete":                    responsesCompleted,
	"response.failed":                        streamError,
	"error":                                  streamError,
}

func responsesUsage(u gjson.Result) llmUsage {
	return llmUsage{Input: u.Get("input_tokens").Int(), Output: u.Get("output_tokens").Int(),
		CacheRead: u.Get("input_tokens_details.cached_tokens").Int(), Semantics: SemanticsInclusive}
}

// responsesItemAdded: any output item (message, reasoning, function call)
// is model output.
func responsesItemAdded(s *llmStream, data []byte) error {
	item := gjson.GetBytes(data, "item")
	if item.Get("type").String() != "function_call" {
		s.unkept += len(item.Raw)
		return nil
	}
	b := s.call(int(gjson.GetBytes(data, "output_index").Int()))
	b.id, b.name = item.Get("call_id").String(), item.Get("name").String()
	b.args.WriteString(item.Get("arguments").String())
	return nil
}

func responsesTextDelta(s *llmStream, data []byte) error {
	s.text.WriteString(gjson.GetBytes(data, "delta").String())
	return nil
}

func responsesUnkeptDelta(s *llmStream, data []byte) error {
	s.unkept += len(data)
	return nil
}

func responsesArgsDelta(s *llmStream, data []byte) error {
	s.call(int(gjson.GetBytes(data, "output_index").Int())).args.WriteString(gjson.GetBytes(data, "delta").String())
	return nil
}

func responsesArgsDone(s *llmStream, data []byte) error {
	b := s.call(int(gjson.GetBytes(data, "output_index").Int()))
	b.final, b.hasFinal = gjson.GetBytes(data, "arguments").String(), true
	return nil
}

func responsesCompleted(s *llmStream, data []byte) error {
	resp := gjson.GetBytes(data, "response")
	if m := resp.Get("model").String(); m != "" {
		s.model = m
	}
	s.usage = responsesUsage(resp.Get("usage"))
	for i, item := range resp.Get("output").Array() {
		if item.Get("type").String() != "function_call" {
			continue
		}
		b := s.call(i)
		if b.id == "" {
			b.id, b.name = item.Get("call_id").String(), item.Get("name").String()
		}
		if args := item.Get("arguments").String(); !b.hasFinal && args != "" {
			b.final, b.hasFinal = args, true
		}
	}
	s.done = true
	return nil
}

func responsesParse(data []byte) (llmTurn, error) {
	if !gjson.ValidBytes(data) {
		return llmTurn{}, errors.New(snippet(data, 200))
	}
	r := gjson.ParseBytes(data)
	t := llmTurn{Model: r.Get("model").String(), Usage: responsesUsage(r.Get("usage"))}
	for _, item := range r.Get("output").Array() {
		switch item.Get("type").String() {
		case "function_call":
			t.ToolCalls = append(t.ToolCalls, llmToolCall{ID: item.Get("call_id").String(), Name: item.Get("name").String(), Args: []byte(item.Get("arguments").String())})
		case "message":
			for _, c := range item.Get("content").Array() {
				if c.Get("type").String() == "output_text" {
					t.Text += c.Get("text").String()
				}
			}
		}
	}
	return t, nil
}

func responsesAssistant(t llmTurn) []any {
	var items []any
	if t.Text != "" {
		items = append(items, map[string]any{"role": "assistant", "content": t.Text})
	}
	for _, c := range t.ToolCalls {
		items = append(items, map[string]any{"type": "function_call", "call_id": c.ID, "name": c.Name, "arguments": string(c.Args)})
	}
	return items
}

func responsesImage(img Image) any {
	return map[string]any{"type": "input_image", "image_url": img.DataURL()}
}

func responsesToolResults(rs []toolResult) []any {
	out := make([]any, 0, len(rs))
	for _, r := range rs {
		out = append(out, map[string]any{"type": "function_call_output", "call_id": r.CallID, "output": r.Content})
	}
	return out
}
