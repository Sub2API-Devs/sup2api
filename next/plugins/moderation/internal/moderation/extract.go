package moderation

import (
	"bytes"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"strings"
	"unicode"
	"unicode/utf8"
)

// tail16 is the gjson multipath that hands the hook the last 16 items of an
// array, newest first (missing positions are skipped). CONTRACTS §72.2.
const tail16 = `|@reverse|[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]`

// tailSize is how many trailing items the hook receives.
const tailSize = 16

// Hook fields (manifest hooks[].needs, gjson queries evaluated by the core).
const (
	FieldModel         = "model"
	FieldMessages      = "messages" + tail16
	FieldInput         = "input" + tail16
	FieldInputString   = `[input]|#(%"*")`
	FieldGeminiContent = "contents" + tail16
)

// Input formats (events.input_format).
const (
	FormatMessages  = "messages"  // Anthropic messages, OpenAI chat
	FormatResponses = "responses" // OpenAI responses input
	FormatGemini    = "gemini"
)

// Image is one image of the moderated messages. Data is base64 without a
// data: prefix; URL is set for images the client sent by reference (never
// downloaded).
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

// Input is what a flow moderates (CONTRACTS §72.4): the trailing run of user
// messages of the request.
type Input struct {
	Text   string
	Images []Image
	// Hash = sha256(text ‖ sha256 of every image), for sampling and the pass cache.
	Hash        [32]byte
	HasURLImage bool
	Format      string
	// Messages is the raw JSON array of the moderated user messages, oldest
	// first, as the client sent them (stored on a first-stage hit).
	Messages json.RawMessage
	// TruncatedRun: all 16 received items were user messages, so the run
	// may have started earlier.
	TruncatedRun bool
}

// size is the bytes the input holds (text, images, raw messages).
func (in *Input) size() int64 {
	n := int64(len(in.Text) + len(in.Messages))
	for _, img := range in.Images {
		n += int64(len(img.Data) + len(img.URL))
	}
	return n
}

// Empty reports whether there is nothing to moderate.
func (in *Input) Empty() bool { return in == nil || (in.Text == "" && len(in.Images) == 0) }

// extractInput builds the Input from the hook fields; maxChars cuts the
// normalized text.
func extractInput(fields map[string]string, maxChars int) *Input {
	if raw := fields[FieldMessages]; isArray(raw) {
		return buildInput(FormatMessages, raw, maxChars, roleOf, messageParts)
	}
	if raw := fields[FieldInput]; isArray(raw) {
		return buildInput(FormatResponses, raw, maxChars, responsesRole, messageParts)
	}
	if raw := fields[FieldInputString]; strings.HasPrefix(raw, `"`) {
		var s string
		if json.Unmarshal([]byte(raw), &s) == nil {
			b := inputBuilder{}
			b.addText(s)
			msg, _ := json.Marshal([]any{map[string]any{"role": "user", "content": s}})
			return b.build(FormatResponses, msg, maxChars)
		}
	}
	if raw := fields[FieldGeminiContent]; isArray(raw) {
		return buildInput(FormatGemini, raw, maxChars, geminiRole, geminiParts)
	}
	return &Input{}
}

// isArray reports a non-empty JSON array: the tail multipath of an absent
// path is "[]", not missing.
func isArray(raw string) bool {
	raw = strings.TrimSpace(raw)
	return strings.HasPrefix(raw, "[") && strings.TrimSpace(raw[1:]) != "]"
}

// buildInput takes the newest-first items, finds the trailing user run and
// reads its parts.
func buildInput(format, raw string, maxChars int, role func(json.RawMessage) string, parts func(*inputBuilder, json.RawMessage)) *Input {
	var items []json.RawMessage
	if json.Unmarshal([]byte(raw), &items) != nil || len(items) == 0 {
		return &Input{}
	}
	// items[0] is the newest; the run ends at the first non-user item.
	n := 0
	for n < len(items) && role(items[n]) == "user" {
		n++
	}
	if n == 0 {
		return &Input{}
	}
	run := make([]json.RawMessage, n)
	for i := 0; i < n; i++ {
		run[i] = items[n-1-i]
	}
	var b inputBuilder
	for _, it := range run {
		parts(&b, it)
	}
	msgs, _ := json.Marshal(run)
	in := b.build(format, msgs, maxChars)
	in.TruncatedRun = n == len(items) && len(items) == tailSize
	return in
}

// roleOf reads "role" (Anthropic messages, OpenAI chat).
func roleOf(item json.RawMessage) string {
	var m struct {
		Role string `json:"role"`
	}
	_ = json.Unmarshal(item, &m)
	return m.Role
}

// responsesRole: an item with a type other than "message" is a tool turn.
func responsesRole(item json.RawMessage) string {
	var m struct {
		Role string `json:"role"`
		Type string `json:"type"`
	}
	_ = json.Unmarshal(item, &m)
	if m.Type != "" && m.Type != "message" {
		return "tool"
	}
	return m.Role
}

// geminiRole: an empty role is the user.
func geminiRole(item json.RawMessage) string {
	var m struct {
		Role string `json:"role"`
	}
	_ = json.Unmarshal(item, &m)
	if m.Role == "" {
		return "user"
	}
	return m.Role
}

// messageParts reads {content: string | [blocks]} of Anthropic, OpenAI chat
// and Responses messages. Text blocks and images are kept; tool_result,
// documents and other blocks are not user input.
func messageParts(b *inputBuilder, item json.RawMessage) {
	var m struct {
		Content json.RawMessage `json:"content"`
	}
	if json.Unmarshal(item, &m) != nil {
		return
	}
	c := bytes.TrimSpace(m.Content)
	if len(c) == 0 {
		return
	}
	if c[0] == '"' {
		var s string
		_ = json.Unmarshal(c, &s)
		b.addText(s)
		return
	}
	var blocks []struct {
		Type     string          `json:"type"`
		Text     string          `json:"text"`
		Source   json.RawMessage `json:"source"`
		ImageURL json.RawMessage `json:"image_url"`
	}
	if json.Unmarshal(c, &blocks) != nil {
		return
	}
	for _, bl := range blocks {
		switch bl.Type {
		case "text", "input_text":
			b.addText(bl.Text)
		case "image":
			var src struct {
				Type      string `json:"type"`
				MediaType string `json:"media_type"`
				Data      string `json:"data"`
				URL       string `json:"url"`
			}
			if json.Unmarshal(bl.Source, &src) == nil {
				if src.Type == "url" {
					b.addImage(Image{URL: src.URL})
				} else {
					b.addImage(Image{MediaType: src.MediaType, Data: src.Data})
				}
			}
		case "image_url", "input_image":
			// chat: image_url:{url}; responses: image_url:"..."
			var url string
			if json.Unmarshal(bl.ImageURL, &url) != nil {
				var o struct {
					URL string `json:"url"`
				}
				_ = json.Unmarshal(bl.ImageURL, &o)
				url = o.URL
			}
			b.addImage(imageFromURL(url))
		}
	}
}

// geminiParts reads {parts:[{text}|{inlineData}|{fileData}]}; function
// responses are not user input.
func geminiParts(b *inputBuilder, item json.RawMessage) {
	type blob struct {
		MimeType string `json:"mimeType"`
		Mime2    string `json:"mime_type"`
		Data     string `json:"data"`
		FileURI  string `json:"fileUri"`
		FileURI2 string `json:"file_uri"`
	}
	var m struct {
		Parts []struct {
			Text        string `json:"text"`
			InlineData  *blob  `json:"inlineData"`
			InlineData2 *blob  `json:"inline_data"`
			FileData    *blob  `json:"fileData"`
			FileData2   *blob  `json:"file_data"`
		} `json:"parts"`
	}
	if json.Unmarshal(item, &m) != nil {
		return
	}
	pick := func(a, b *blob) *blob {
		if a != nil {
			return a
		}
		return b
	}
	for _, p := range m.Parts {
		b.addText(p.Text)
		if d := pick(p.InlineData, p.InlineData2); d != nil {
			mt := d.MimeType + d.Mime2
			if strings.HasPrefix(mt, "image/") {
				b.addImage(Image{MediaType: mt, Data: d.Data})
			}
		}
		if f := pick(p.FileData, p.FileData2); f != nil {
			mt, uri := f.MimeType+f.Mime2, f.FileURI+f.FileURI2
			if strings.HasPrefix(mt, "image/") && uri != "" {
				b.addImage(Image{MediaType: mt, URL: uri})
			}
		}
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

// inputBuilder collects text parts and de-duplicated images.
type inputBuilder struct {
	parts  []string
	images []Image
	seen   map[[32]byte]bool
}

func (b *inputBuilder) addText(s string) {
	if strings.TrimSpace(s) != "" {
		b.parts = append(b.parts, s)
	}
}

func (b *inputBuilder) addImage(img Image) {
	if img.raw() == "" {
		return
	}
	sum := sha256.Sum256([]byte(img.raw()))
	if b.seen == nil {
		b.seen = map[[32]byte]bool{}
	}
	if b.seen[sum] {
		return
	}
	b.seen[sum] = true
	b.images = append(b.images, img)
}

func (b *inputBuilder) build(format string, msgs json.RawMessage, maxChars int) *Input {
	in := &Input{Text: normalizeText(b.parts, maxChars), Images: b.images, Format: format, Messages: msgs}
	h := sha256.New()
	h.Write([]byte(in.Text))
	for _, img := range in.Images {
		sum := sha256.Sum256([]byte(img.raw()))
		h.Write(sum[:])
		in.HasURLImage = in.HasURLImage || img.URL != ""
	}
	copy(in.Hash[:], h.Sum(nil))
	return in
}

// normalizeText joins the parts with spaces, collapses every whitespace run
// into one space and keeps the first limit runes (limit <= 0 keeps all).
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
