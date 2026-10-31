package moderation

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/tidwall/gjson"
)

// Hook fields (manifest hooks[].needs, gjson queries evaluated by the core).
// Each is a whole top-level value of the request body (CONTRACTS §72.4,
// 0.6.0). The "|@this" form makes them queries, which the core hands over
// read-only: the grant never lets the plugin patch the body.
const (
	FieldModel              = "model"
	FieldSystem             = "system|@this"
	FieldMessages           = "messages|@this"
	FieldTools              = "tools|@this"
	FieldInput              = "input|@this"
	FieldInstructions       = "instructions|@this"
	FieldContents           = "contents|@this"
	FieldSystemInstruction  = "systemInstruction|@this"
	FieldSystemInstruction2 = "system_instruction|@this"
	FieldPrompt             = "prompt|@this"
	FieldContent            = "content|@this"
	FieldImage              = "image|@this"
)

// HookFields are the needs of the moderation hook, in manifest order.
var HookFields = []string{
	FieldModel, FieldSystem, FieldMessages, FieldTools, FieldInput, FieldInstructions,
	FieldContents, FieldSystemInstruction, FieldSystemInstruction2, FieldPrompt, FieldContent, FieldImage,
}

// Hook ids (manifest hooks[].id).
const (
	HookModeration = "moderation"
	// HookBan matches every protocol and only refuses banned users
	// (CONTRACTS §72.3): embeddings, count_tokens, task queries and the
	// protocols of platform plugins carry no text the plugin moderates.
	HookBan = "ban"
)

// Protocol families: which fields carry the client's content (CONTRACTS
// §72.4). The choice follows the client protocol of the request, never which
// fields happen to be present, so a Responses request with a decoy
// "messages" array is still read from input / instructions.
const (
	familyAnthropic = "anthropic"
	familyChat      = "chat"
	familyResponses = "responses"
	familyGemini    = "gemini"
	familyImages    = "images"
	familyVideo     = "video"
)

var protocolFamilies = map[string]string{
	"anthropic.messages":      familyAnthropic,
	"openai.chat":             familyChat,
	"openai.responses":        familyResponses,
	"openai.responses_ws":     familyResponses,
	"gemini.generate":         familyGemini,
	"gemini.stream_generate":  familyGemini,
	"volcengine.images":       familyImages,
	"volcengine.video_submit": familyVideo,
}

// ModeratedProtocols are the protocols whose content is moderated (the
// moderation hook's match.protocols).
var ModeratedProtocols = []string{
	"anthropic.messages", "openai.chat", "openai.responses", "openai.responses_ws",
	"gemini.generate", "gemini.stream_generate", "volcengine.images", "volcengine.video_submit",
}

// Message formats of a saved input_message (record detail).
const (
	FormatMessages = "messages" // Anthropic messages, OpenAI chat (and every record since 0.6.0)
	FormatGemini   = "gemini"
)

// Roles of the moderated pieces. Every piece except a user one is labelled
// "[role] " in the text the auditors see.
const (
	RoleUser      = "user"
	RoleAssistant = "assistant"
	RoleSystem    = "system"
	RoleDeveloper = "developer"
	RoleTool      = "tool"     // tool results
	RoleTools     = "tools"    // tool definitions
	RoleDocument  = "document" // documents and text files
)

// Image is one image of the request. Data is base64 without a data: prefix;
// URL is set for images the client sent by reference (never downloaded).
type Image struct {
	MediaType string
	Data      string
	URL       string
}

func (img Image) raw() string {
	if img.URL != "" {
		return img.URL
	}
	return img.Data
}

// DataURL is the image as an OpenAI image_url (the URL itself for URL images).
func (img Image) DataURL() string {
	if img.URL != "" {
		return img.URL
	}
	return "data:" + img.MediaType + ";base64," + img.Data
}

// Input is what one flow run moderates: the text and images of one chunk
// (CONTRACTS §72.4).
type Input struct {
	Text   string
	Images []Image
	// Hash = sha256(text ‖ sha256 of every image), the singleflight key part.
	Hash        [32]byte
	HasURLImage bool
}

// Empty reports whether there is nothing to moderate.
func (in *Input) Empty() bool { return in == nil || (in.Text == "" && len(in.Images) == 0) }

// ---------------------------------------------------------------- pieces

// piece is one text or image of the request, before normalization.
type piece struct {
	role string
	text string
	img  Image
}

// extractor collects the pieces of one request in request order.
type extractor struct {
	pieces []piece
}

func (e *extractor) text(role, s string) {
	if strings.TrimSpace(s) != "" {
		e.pieces = append(e.pieces, piece{role: role, text: s})
	}
}

func (e *extractor) image(role string, img Image) {
	if img.raw() != "" {
		e.pieces = append(e.pieces, piece{role: role, img: img})
	}
}

// extractPieces reads every client-controllable text and image of a request
// of protocol (CONTRACTS §72.4): messages of every role, the system prompt
// or instructions, tool calls and results, documents, tool definitions.
// moderated=false: the protocol carries nothing the plugin moderates.
func extractPieces(protocol string, f map[string]string) (pieces []piece, moderated bool) {
	var e extractor
	get := func(name string) gjson.Result { return gjson.Parse(f[name]) }
	switch protocolFamilies[protocol] {
	case familyAnthropic:
		e.content(RoleSystem, get(FieldSystem))
		for _, m := range arr(get(FieldMessages)) {
			e.content(roleOf(m.Get("role").String()), m.Get("content"))
		}
		e.tools(get(FieldTools))
	case familyChat:
		for _, m := range arr(get(FieldMessages)) {
			role := roleOf(m.Get("role").String())
			e.content(role, m.Get("content"))
			for _, tc := range arr(m.Get("tool_calls")) {
				e.jsonText(RoleAssistant, tc.Get("function.arguments"))
			}
			e.jsonText(RoleAssistant, m.Get("function_call.arguments"))
		}
		e.tools(get(FieldTools))
	case familyResponses:
		e.responsesInput(RoleSystem, get(FieldInstructions))
		e.responsesInput(RoleUser, get(FieldInput))
		e.tools(get(FieldTools))
	case familyGemini:
		si := get(FieldSystemInstruction)
		if !si.Exists() {
			si = get(FieldSystemInstruction2)
		}
		if si.Type == gjson.String {
			e.text(RoleSystem, si.Str)
		} else {
			e.geminiParts(RoleSystem, si.Get("parts"))
		}
		for _, c := range arr(get(FieldContents)) {
			e.geminiParts(geminiRole(c.Get("role").String()), c.Get("parts"))
		}
		e.tools(get(FieldTools))
	case familyImages:
		e.content(RoleUser, get(FieldPrompt))
		img := get(FieldImage)
		if img.Type == gjson.String {
			e.image(RoleUser, imageFromURL(img.Str))
		}
		for _, u := range arr(img) {
			e.image(RoleUser, imageFromURL(u.String()))
		}
	case familyVideo:
		e.content(RoleUser, get(FieldContent))
	default:
		return nil, false
	}
	return e.pieces, true
}

// arr returns the items of a JSON array (nothing for any other value).
func arr(r gjson.Result) []gjson.Result {
	if !r.IsArray() {
		return nil
	}
	return r.Array()
}

// roleOf maps a message role; the legacy "function" role is a tool result.
func roleOf(role string) string {
	switch role {
	case "", RoleUser:
		return RoleUser
	case "function":
		return RoleTool
	}
	return role
}

func geminiRole(role string) string {
	switch role {
	case "", RoleUser:
		return RoleUser
	case "model":
		return RoleAssistant
	case "function":
		return RoleTool
	}
	return role
}

// content reads a message content: a string, or an array of blocks
// (Anthropic, OpenAI chat and Responses parts, volcengine video content).
// Thinking and reasoning blocks are skipped: Anthropic and OpenAI only take
// back the ones they signed or encrypted.
func (e *extractor) content(role string, c gjson.Result) {
	if c.Type == gjson.String {
		e.text(role, c.Str)
		return
	}
	for _, b := range arr(c) {
		if b.Type == gjson.String {
			e.text(role, b.Str)
			continue
		}
		switch b.Get("type").String() {
		case "text", "input_text", "output_text":
			e.text(role, b.Get("text").String())
		case "refusal":
			e.text(role, b.Get("refusal").String())
		case "image":
			src := b.Get("source")
			switch src.Get("type").String() {
			case "url":
				e.image(role, Image{URL: src.Get("url").String()})
			case "base64":
				e.image(role, Image{MediaType: src.Get("media_type").String(), Data: src.Get("data").String()})
			}
		case "image_url", "input_image":
			// chat: image_url:{url}; responses: image_url:"..."
			u := b.Get("image_url")
			if u.IsObject() {
				u = u.Get("url")
			}
			e.image(role, imageFromURL(u.String()))
		case "tool_result":
			e.content(RoleTool, b.Get("content"))
		case "tool_use", "server_tool_use":
			e.jsonText(RoleAssistant, b.Get("input"))
		case "document":
			e.document(b)
		case "search_result":
			e.text(RoleDocument, b.Get("title").String())
			e.content(RoleDocument, b.Get("content"))
		case "input_file":
			e.file(b.Get("file_data").String())
		case "file":
			e.file(b.Get("file.file_data").String())
		}
	}
}

// document reads an Anthropic document block: plain text, content blocks or
// a text file; a PDF is not read (CONTRACTS §72.4 remaining limits).
func (e *extractor) document(b gjson.Result) {
	e.text(RoleDocument, b.Get("title").String())
	e.text(RoleDocument, b.Get("context").String())
	src := b.Get("source")
	switch src.Get("type").String() {
	case "text":
		e.text(RoleDocument, src.Get("data").String())
	case "content":
		e.content(RoleDocument, src.Get("content"))
	case "base64":
		e.text(RoleDocument, decodeText(src.Get("media_type").String(), src.Get("data").String()))
	}
}

// file reads a data: URL file (Responses input_file, chat file): text files
// only.
func (e *extractor) file(dataURL string) {
	rest, ok := strings.CutPrefix(dataURL, "data:")
	if !ok {
		return
	}
	meta, data, found := strings.Cut(rest, ",")
	if !found || !strings.HasSuffix(meta, ";base64") {
		return
	}
	e.text(RoleDocument, decodeText(strings.TrimSuffix(meta, ";base64"), data))
}

// maxDecodedText caps a decoded text file.
const maxDecodedText = 4 << 20

// decodeText decodes base64 text files (text/*, JSON, XML, YAML); "" for
// anything else.
func decodeText(mime, b64 string) string {
	mime = strings.ToLower(strings.TrimSpace(mime))
	if i := strings.IndexByte(mime, ';'); i >= 0 {
		mime = mime[:i]
	}
	textual := strings.HasPrefix(mime, "text/") || mime == "application/json" || mime == "application/xml" ||
		mime == "application/x-yaml" || mime == "application/yaml" || strings.HasSuffix(mime, "+json") || strings.HasSuffix(mime, "+xml")
	if !textual || b64 == "" {
		return ""
	}
	if len(b64) > base64.StdEncoding.EncodedLen(maxDecodedText) {
		b64 = b64[:base64.StdEncoding.EncodedLen(maxDecodedText)]
	}
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return ""
	}
	return string(raw)
}

// responsesInput reads Responses input or instructions: a string, or items.
func (e *extractor) responsesInput(role string, r gjson.Result) {
	if r.Type == gjson.String {
		e.text(role, r.Str)
		return
	}
	for _, it := range arr(r) {
		switch typ := it.Get("type").String(); typ {
		case "", "message":
			e.content(roleOf(it.Get("role").String()), it.Get("content"))
		case "function_call", "mcp_call":
			e.jsonText(RoleAssistant, it.Get("arguments"))
			if typ == "mcp_call" {
				e.jsonText(RoleTool, it.Get("output"))
			}
		case "custom_tool_call":
			e.text(RoleAssistant, it.Get("input").String())
		case "function_call_output", "custom_tool_call_output":
			out := it.Get("output")
			if out.IsArray() {
				e.content(RoleTool, out)
			} else {
				e.jsonText(RoleTool, out)
			}
		}
	}
}

// geminiParts reads {parts:[{text}|{inlineData}|{fileData}|{functionCall}|
// {functionResponse}|...]}.
func (e *extractor) geminiParts(role string, parts gjson.Result) {
	pick := func(p gjson.Result, a, b string) gjson.Result {
		if v := p.Get(a); v.Exists() {
			return v
		}
		return p.Get(b)
	}
	for _, p := range arr(parts) {
		e.text(role, p.Get("text").String())
		if d := pick(p, "inlineData", "inline_data"); d.Exists() {
			mt := pick(d, "mimeType", "mime_type").String()
			if strings.HasPrefix(mt, "image/") {
				e.image(role, Image{MediaType: mt, Data: d.Get("data").String()})
			} else {
				e.text(RoleDocument, decodeText(mt, d.Get("data").String()))
			}
		}
		if f := pick(p, "fileData", "file_data"); f.Exists() {
			mt, uri := pick(f, "mimeType", "mime_type").String(), pick(f, "fileUri", "file_uri").String()
			if strings.HasPrefix(mt, "image/") && uri != "" {
				e.image(role, Image{MediaType: mt, URL: uri})
			}
		}
		e.jsonText(RoleAssistant, pick(p, "functionCall", "function_call").Get("args"))
		e.jsonText(RoleTool, pick(p, "functionResponse", "function_response").Get("response"))
		e.text(RoleAssistant, pick(p, "executableCode", "executable_code").Get("code").String())
		e.text(RoleTool, pick(p, "codeExecutionResult", "code_execution_result").Get("output").String())
	}
}

// jsonText adds the string values of a JSON value (tool call arguments, tool
// outputs): a string holding JSON is read as JSON.
func (e *extractor) jsonText(role string, r gjson.Result) {
	if !r.Exists() {
		return
	}
	var parts []string
	jsonStrings(r, &parts, 0)
	e.text(role, strings.Join(parts, " "))
}

func jsonStrings(r gjson.Result, out *[]string, depth int) {
	if depth > 32 {
		return
	}
	switch {
	case r.Type == gjson.String:
		s := strings.TrimSpace(r.Str)
		if (strings.HasPrefix(s, "{") || strings.HasPrefix(s, "[")) && gjson.Valid(s) {
			jsonStrings(gjson.Parse(s), out, depth+1)
			return
		}
		*out = append(*out, r.Str)
	case r.IsObject() || r.IsArray():
		r.ForEach(func(_, v gjson.Result) bool {
			jsonStrings(v, out, depth+1)
			return true
		})
	}
}

// schemaKeywords are JSON Schema keys whose string values are not text
// ("type": "object").
var schemaKeywords = map[string]bool{"type": true, "$schema": true, "$ref": true, "$id": true, "format": true}

// tools adds one piece per tool definition: its names, descriptions, enum
// values and property names (an instruction can hide in any of them).
func (e *extractor) tools(r gjson.Result) {
	for _, t := range arr(r) {
		var parts []string
		schemaText(t, &parts, 0)
		e.text(RoleTools, strings.Join(parts, " "))
	}
}

func schemaText(r gjson.Result, out *[]string, depth int) {
	if depth > 32 {
		return
	}
	switch {
	case r.IsObject():
		r.ForEach(func(k, v gjson.Result) bool {
			if v.Type == gjson.String {
				if !schemaKeywords[k.Str] {
					*out = append(*out, v.Str)
				}
				return true
			}
			if k.Str == "properties" && v.IsObject() {
				v.ForEach(func(name, _ gjson.Result) bool {
					*out = append(*out, name.Str)
					return true
				})
			}
			schemaText(v, out, depth+1)
			return true
		})
	case r.IsArray():
		r.ForEach(func(_, v gjson.Result) bool {
			if v.Type == gjson.String {
				*out = append(*out, v.Str)
			} else {
				schemaText(v, out, depth+1)
			}
			return true
		})
	}
}

// imageFromURL splits a data URL; anything else is a URL image.
func imageFromURL(u string) Image {
	if rest, ok := strings.CutPrefix(u, "data:"); ok {
		meta, data, found := strings.Cut(rest, ",")
		if found && strings.HasSuffix(meta, ";base64") {
			return Image{MediaType: strings.TrimSuffix(meta, ";base64"), Data: data}
		}
		return Image{}
	}
	return Image{URL: u}
}

// ---------------------------------------------------------------- segments

// segment is one normalized piece: the text the auditors see (labelled
// with its role unless it is the user's) or one image. key identifies it in
// the segment pass cache.
type segment struct {
	role  string
	text  string // normalized, "[role] " label included
	plain string // normalized, without the label (record detail)
	runes int
	img   *Image
	key   [32]byte
}

// request is the content of one hooked request, normalized and
// de-duplicated (CONTRACTS §72.4).
type request struct {
	segs    []segment
	hash    [32]byte // sha256 of every segment key: sampling, text_hash
	visible int      // visible characters of the text
	images  int
	hasURL  bool
}

// buildRequest normalizes the pieces. Identical segments (the same
// reminder in every turn) are kept once.
func buildRequest(pieces []piece) *request {
	r := &request{}
	seen := map[[32]byte]bool{}
	h := sha256.New()
	for _, p := range pieces {
		var s segment
		if p.img.raw() != "" {
			img := p.img
			s = segment{role: p.role, img: &img, key: sha256.Sum256([]byte("i\x00" + img.raw()))}
		} else {
			plain := normalizeText([]string{p.text}, 0)
			if plain == "" {
				continue
			}
			text := plain
			if p.role != RoleUser {
				text = "[" + p.role + "] " + plain
			}
			s = segment{role: p.role, text: text, plain: plain, runes: utf8.RuneCountInString(text), key: sha256.Sum256([]byte("t\x00" + text))}
		}
		if seen[s.key] {
			continue
		}
		seen[s.key] = true
		h.Write(s.key[:])
		if s.img != nil {
			r.images++
			r.hasURL = r.hasURL || s.img.URL != ""
		} else {
			r.visible += visibleChars(s.plain)
		}
		r.segs = append(r.segs, s)
	}
	copy(r.hash[:], h.Sum(nil))
	return r
}

// texts returns the normalized text segments (self-request check).
func (r *request) texts(fn func(string) bool) bool {
	for i := range r.segs {
		if r.segs[i].img == nil && fn(r.segs[i].text) {
			return true
		}
	}
	return false
}

// chunkPart is one segment (or piece of one) in a chunk, for the record
// detail.
type chunkPart struct {
	role string
	text string
	img  *Image
}

// chunk is what one flow run moderates: up to input_max_chars of text plus
// the images among it. segs lists the request segments it holds.
type chunk struct {
	in    *Input
	segs  []int
	parts []chunkPart
	runes int
}

// planLimits are the chunking settings (CONTRACTS §72.4).
type planLimits struct {
	maxChars  int
	maxChunks int
	maxImages int
}

// plan is the chunks a request is moderated in: the segments not in the
// pass cache, in request order, packed into chunks of maxChars; a longer
// segment is split. Beyond maxChunks the first, the last and evenly spread
// chunks in between run (sampled). pieces[i] = chunks segment i was cut into
// (sampled-out ones included): a segment is cached only when every chunk
// holding it passed.
type plan struct {
	chunks []*chunk
	pieces []int
	keys   [][32]byte
	trace  InputTrace
}

// InputTrace summarizes what a run moderated (events.trace.input).
type InputTrace struct {
	Segments      int  `json:"segments"`
	Cached        int  `json:"cached_segments,omitempty"`
	Chunks        int  `json:"chunks"`
	ChunksTotal   int  `json:"chunks_total"`
	Sampled       bool `json:"sampled,omitempty"`
	Images        int  `json:"images,omitempty"`
	DroppedImages int  `json:"dropped_images,omitempty"`
	Chars         int  `json:"chars"`
}

// maxImageBase64 drops an image larger than about 16 MiB (no auditor takes
// one, and it would only hold memory).
const maxImageBase64 = 22 << 20

// makePlan chunks the uncached segments of r.
func (r *request) makePlan(lim planLimits, cached func([32]byte) bool) *plan {
	pl := &plan{pieces: make([]int, len(r.segs)), keys: make([][32]byte, len(r.segs))}
	pl.trace.Segments = len(r.segs)
	maxChars := max(lim.maxChars, 1)
	var all []*chunk
	cur := &chunk{}
	flush := func() {
		if len(cur.parts) > 0 {
			all = append(all, cur)
		}
		cur = &chunk{}
	}
	images := 0
	for i := range r.segs {
		s := &r.segs[i]
		pl.keys[i] = s.key
		if cached != nil && cached(s.key) {
			pl.trace.Cached++
			continue
		}
		if s.img != nil {
			if images >= lim.maxImages || len(s.img.Data) > maxImageBase64 {
				pl.trace.DroppedImages++
				continue
			}
			images++
			cur.segs = append(cur.segs, i)
			cur.parts = append(cur.parts, chunkPart{role: s.role, img: s.img})
			pl.pieces[i] = 1
			continue
		}
		if cur.runes > 0 && cur.runes+1+s.runes > maxChars {
			flush()
		}
		if s.runes <= maxChars {
			cur.add(i, chunkPart{role: s.role, text: s.text}, s.runes)
			pl.pieces[i] = 1
			continue
		}
		// A segment longer than a chunk: whole chunks of it, the rest shares.
		rs := []rune(s.text)
		for start := 0; start < len(rs); start += maxChars {
			end := min(start+maxChars, len(rs))
			if cur.runes > 0 {
				flush()
			}
			cur.add(i, chunkPart{role: s.role, text: string(rs[start:end])}, end-start)
			pl.pieces[i]++
		}
	}
	flush()
	pl.trace.ChunksTotal = len(all)
	pl.chunks = all
	if n := len(all); n > lim.maxChunks && lim.maxChunks > 0 {
		pl.chunks = make([]*chunk, 0, lim.maxChunks)
		for _, i := range spread(n, lim.maxChunks) {
			pl.chunks = append(pl.chunks, all[i])
		}
		pl.trace.Sampled = true
	}
	for _, c := range pl.chunks {
		c.finish()
		pl.trace.Chars += utf8.RuneCountInString(c.in.Text)
		pl.trace.Images += len(c.in.Images)
	}
	pl.trace.Chunks = len(pl.chunks)
	return pl
}

func (c *chunk) add(seg int, p chunkPart, runes int) {
	if c.runes > 0 {
		c.runes++ // the joining space
	}
	c.runes += runes
	if n := len(c.segs); n == 0 || c.segs[n-1] != seg {
		c.segs = append(c.segs, seg)
	}
	c.parts = append(c.parts, p)
}

// finish builds the chunk's Input.
func (c *chunk) finish() {
	in := &Input{}
	texts := make([]string, 0, len(c.parts))
	for _, p := range c.parts {
		if p.img != nil {
			in.Images = append(in.Images, *p.img)
			in.HasURLImage = in.HasURLImage || p.img.URL != ""
		} else {
			texts = append(texts, p.text)
		}
	}
	in.Text = strings.Join(texts, " ")
	h := sha256.New()
	h.Write([]byte(in.Text))
	for _, img := range in.Images {
		sum := sha256.Sum256([]byte(img.raw()))
		h.Write(sum[:])
	}
	copy(in.Hash[:], h.Sum(nil))
	c.in = in
}

// detach copies the image data of the chunk so a queued job does not keep
// the whole hook request alive.
func (c *chunk) detach() {
	for i := range c.in.Images {
		c.in.Images[i].Data = strings.Clone(c.in.Images[i].Data)
		c.in.Images[i].URL = strings.Clone(c.in.Images[i].URL)
	}
	for i := range c.parts {
		if c.parts[i].img != nil {
			img := *c.parts[i].img
			img.Data, img.URL = strings.Clone(img.Data), strings.Clone(img.URL)
			c.parts[i].img = &img
		}
	}
}

// dropImages removes the images of the chunk (no auditor of the flow takes
// them).
func (c *chunk) dropImages() {
	c.in.Images = nil
	parts := c.parts[:0]
	for _, p := range c.parts {
		if p.img == nil {
			parts = append(parts, p)
		}
	}
	c.parts = parts
}

// size is the bytes the chunk holds.
func (c *chunk) size() int64 {
	n := int64(len(c.in.Text)) * 2 // the text and its parts
	for _, img := range c.in.Images {
		n += int64(len(img.Data) + len(img.URL))
	}
	return n
}

// messages renders the chunk as chat messages (role, text and image_url
// parts, consecutive parts of a role merged): the input_message of a record
// (CONTRACTS §72.9).
func (c *chunk) messages() json.RawMessage {
	type msg struct {
		Role    string `json:"role"`
		Content []any  `json:"content"`
	}
	var out []msg
	for _, p := range c.parts {
		var part any
		if p.img != nil {
			part = map[string]any{"type": "image_url", "image_url": map[string]string{"url": p.img.DataURL()}}
		} else {
			text := p.text
			if p.role != RoleUser {
				text = strings.TrimPrefix(text, "["+p.role+"] ")
			}
			part = map[string]any{"type": "text", "text": text}
		}
		if n := len(out); n > 0 && out[n-1].Role == p.role {
			out[n-1].Content = append(out[n-1].Content, part)
			continue
		}
		out = append(out, msg{Role: p.role, Content: []any{part}})
	}
	b, _ := json.Marshal(out)
	return b
}

// spread picks k of n indexes: the first, the last and evenly spaced ones in
// between (k < n). One chunk is the newest.
func spread(n, k int) []int {
	if k <= 1 {
		return []int{n - 1}
	}
	out := make([]int, 0, k)
	for i := 0; i < k; i++ {
		idx := (i*(n-1) + (k-1)/2) / (k - 1)
		if len(out) > 0 && idx <= out[len(out)-1] {
			idx = out[len(out)-1] + 1
		}
		out = append(out, idx)
	}
	return out
}

// ---------------------------------------------------------------- text

// invisible are the format characters removed from moderated text: zero
// width spaces and joiners, the word joiner and the BOM, which can split a
// word without showing.
func invisible(r rune) bool {
	switch r {
	case 0x200B, 0x200C, 0x200D, 0x2060, 0xFEFF, 0x00AD:
		return true
	}
	return unicode.IsControl(r) && !unicode.IsSpace(r) // NUL and the other control characters
}

// normalizeText joins the parts with spaces, collapses every whitespace run
// into one space, drops NUL, other control characters and zero-width
// characters, turns invalid UTF-8 into U+FFFD and keeps the first limit
// runes (limit <= 0 keeps all). The result is always storable in a
// PostgreSQL text column.
func normalizeText(parts []string, limit int) string {
	var sb strings.Builder
	n, pending := 0, false
	for _, part := range parts {
		pending = pending || n > 0
		for _, r := range part {
			if unicode.IsSpace(r) {
				pending = n > 0
				continue
			}
			if invisible(r) {
				continue
			}
			if limit > 0 && n >= limit {
				return sb.String()
			}
			if pending {
				sb.WriteByte(' ')
				n, pending = n+1, false
				if limit > 0 && n >= limit {
					return sb.String()
				}
			}
			sb.WriteRune(r)
			n++
		}
	}
	return sb.String()
}

// pgText makes s storable in a PostgreSQL text column: no NUL, valid UTF-8.
func pgText(s string) string {
	if strings.IndexByte(s, 0) >= 0 {
		s = strings.ReplaceAll(s, "\x00", "")
	}
	if !utf8.ValidString(s) {
		s = strings.ToValidUTF8(s, string(utf8.RuneError))
	}
	return s
}

// pgJSON makes a JSON document storable in a jsonb column, which rejects
// the \u0000 escape and invalid UTF-8: the strings are cleaned and the
// document encoded again. Documents without either are returned as they are.
func pgJSON(b []byte) []byte {
	if !bytes.Contains(b, []byte(`\u0000`)) && utf8.Valid(b) {
		return b
	}
	var v any
	if json.Unmarshal(bytes.ToValidUTF8(b, []byte(string(utf8.RuneError))), &v) != nil {
		return b
	}
	out, err := json.Marshal(cleanJSON(v))
	if err != nil {
		return b
	}
	return out
}

func cleanJSON(v any) any {
	switch t := v.(type) {
	case string:
		return pgText(t)
	case []any:
		for i := range t {
			t[i] = cleanJSON(t[i])
		}
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, x := range t {
			out[pgText(k)] = cleanJSON(x)
		}
		return out
	}
	return v
}

// visibleChars counts the non-whitespace runes of s.
func visibleChars(s string) int {
	n := 0
	for _, r := range s {
		if !unicode.IsSpace(r) {
			n++
		}
	}
	return n
}

// sampled decides deterministically (by input hash) whether to moderate at
// rate percent (0–100, two decimals).
func sampled(h [32]byte, rate float64) bool {
	if rate >= 100 {
		return true
	}
	return float64(binary.BigEndian.Uint64(h[:8])%10000) < rate*100
}

// fieldString decodes a JSON string hook field ("" when absent or not a
// string).
func fieldString(raw string) string {
	if strings.HasPrefix(raw, `"`) {
		var s string
		if json.Unmarshal([]byte(raw), &s) == nil {
			return s
		}
	}
	return ""
}

// truncateRunes keeps the first n runes of s.
func truncateRunes(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	r := []rune(s)
	return string(r[:n])
}

type contentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

func trimJSON(b []byte) []byte { return bytes.TrimLeft(b, " \n\r\t") }
