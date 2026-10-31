package moderation

import (
	"bytes"
	"encoding/json"
	"strings"
)

// MessagePart is one piece of a saved input_message in the record detail
// (new-api record_message.go): text, or an image whose Src goes straight
// into <img src> (a URL as sent, inline data as a data URL of its MIME
// type). Kind is url, data_url or base64 (inline data, which data URLs of
// chat and Responses messages are split into).
type MessagePart struct {
	Role string `json:"role,omitempty"`
	Type string `json:"type"`
	Text string `json:"text,omitempty"`
	Src  string `json:"src,omitempty"`
	Kind string `json:"kind,omitempty"`
	Mime string `json:"mime,omitempty"`
}

// base64Signatures guess the MIME type of bare base64 from the first
// characters of the encoded file header (PNG, JPEG, GIF, WebP).
var base64Signatures = []struct{ prefix, mime string }{
	{"iVBORw0KGgo", "image/png"}, {"/9j/", "image/jpeg"}, {"R0lGOD", "image/gif"}, {"UklGR", "image/webp"},
}

// MessageParts reads a saved input_message for display. Records since 0.6.0
// store the moderated chunk as chat messages (chunk.messages: role and
// text / image_url parts, every role); older records stored the client's
// trailing user messages as sent, in the format of their client protocol
// (Gemini {parts} items are recognised by their shape). ok = false: the JSON
// cannot be read and only the raw text is shown.
func MessageParts(_ string, raw string) ([]MessagePart, bool) {
	if raw == "" || !json.Valid([]byte(raw)) {
		return nil, false
	}
	parts := []MessagePart{}
	var s string
	if json.Unmarshal([]byte(raw), &s) == nil {
		if s != "" {
			parts = append(parts, MessagePart{Type: "text", Text: s})
		}
		return parts, true
	}
	var items []json.RawMessage
	if json.Unmarshal([]byte(raw), &items) != nil {
		items = []json.RawMessage{json.RawMessage(raw)} // a single message
	}
	for _, item := range items {
		var m struct {
			Role    string          `json:"role"`
			Type    string          `json:"type"`
			Content json.RawMessage `json:"content"`
			Parts   json.RawMessage `json:"parts"`
		}
		if json.Unmarshal(item, &m) != nil {
			continue
		}
		role := m.Role
		if m.Type != "" && m.Type != "message" {
			role = RoleTool
		}
		emit := func(text string, img Image) {
			switch {
			case img.URL != "":
				parts = append(parts, imagePart(role, img.URL, img.MediaType))
			case img.Data != "":
				parts = append(parts, imagePart(role, img.Data, img.MediaType))
			case text != "":
				parts = append(parts, MessagePart{Role: role, Type: "text", Text: text})
			}
		}
		if len(m.Parts) > 0 && len(m.Content) == 0 {
			role = geminiRole(m.Role)
			displayGeminiParts(m.Parts, emit)
			continue
		}
		displayContent(m.Content, emit)
	}
	return parts, true
}

// displayContent reads {content: string | [blocks]} of a saved message.
func displayContent(c json.RawMessage, emit func(string, Image)) {
	c = bytes.TrimSpace(c)
	if len(c) == 0 {
		return
	}
	if c[0] == '"' {
		var s string
		_ = json.Unmarshal(c, &s)
		emit(s, Image{})
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
			emit(bl.Text, Image{})
		case "image":
			var src struct {
				Type      string `json:"type"`
				MediaType string `json:"media_type"`
				Data      string `json:"data"`
				URL       string `json:"url"`
			}
			if json.Unmarshal(bl.Source, &src) == nil {
				if src.Type == "url" {
					emit("", Image{URL: src.URL})
				} else {
					emit("", Image{MediaType: src.MediaType, Data: src.Data})
				}
			}
		case "image_url", "input_image":
			var url string
			if json.Unmarshal(bl.ImageURL, &url) != nil {
				var o struct {
					URL string `json:"url"`
				}
				_ = json.Unmarshal(bl.ImageURL, &o)
				url = o.URL
			}
			emit("", imageFromURL(url))
		}
	}
}

// displayGeminiParts reads the {parts} of a saved Gemini message (records
// before 0.6.0).
func displayGeminiParts(raw json.RawMessage, emit func(string, Image)) {
	type blob struct {
		MimeType string `json:"mimeType"`
		Mime2    string `json:"mime_type"`
		Data     string `json:"data"`
		FileURI  string `json:"fileUri"`
		FileURI2 string `json:"file_uri"`
	}
	var parts []struct {
		Text        string `json:"text"`
		InlineData  *blob  `json:"inlineData"`
		InlineData2 *blob  `json:"inline_data"`
		FileData    *blob  `json:"fileData"`
		FileData2   *blob  `json:"file_data"`
	}
	if json.Unmarshal(raw, &parts) != nil {
		return
	}
	pick := func(a, b *blob) *blob {
		if a != nil {
			return a
		}
		return b
	}
	for _, p := range parts {
		emit(p.Text, Image{})
		if d := pick(p.InlineData, p.InlineData2); d != nil {
			if mt := d.MimeType + d.Mime2; strings.HasPrefix(mt, "image/") {
				emit("", Image{MediaType: mt, Data: d.Data})
			}
		}
		if f := pick(p.FileData, p.FileData2); f != nil {
			if mt, uri := f.MimeType+f.Mime2, f.FileURI+f.FileURI2; strings.HasPrefix(mt, "image/") && uri != "" {
				emit("", Image{MediaType: mt, URL: uri})
			}
		}
	}
}

// imageExcerpt stands for an image in MessageText.
const imageExcerpt = "[图片]"

// MessageText is the whole text of a saved input_message, whitespace
// collapsed, each image as [图片]; "" when the JSON cannot be read.
func MessageText(format, raw string) string {
	parts, ok := MessageParts(format, raw)
	if !ok {
		return ""
	}
	texts := make([]string, 0, len(parts))
	for _, p := range parts {
		if p.Type == "image" {
			texts = append(texts, imageExcerpt)
			continue
		}
		texts = append(texts, p.Text)
	}
	return normalizeText(texts, 0)
}

// imagePart classifies an image source by its prefix and builds a src that
// renders; bare base64 of an unknown type gets no src (a placeholder).
func imagePart(role, src, mime string) MessagePart {
	part := MessagePart{Role: role, Type: "image", Src: src, Kind: "base64", Mime: mime}
	switch {
	case strings.HasPrefix(src, "http://") || strings.HasPrefix(src, "https://"):
		part.Kind = "url"
	case strings.HasPrefix(src, "data:"):
		part.Kind = "data_url"
		if part.Mime == "" {
			header, _, _ := strings.Cut(src[len("data:"):min(len(src), 128)], ",")
			part.Mime, _, _ = strings.Cut(header, ";")
		}
	default:
		sniffed := mime
		for _, sig := range base64Signatures {
			if sniffed != "" {
				break
			}
			if strings.HasPrefix(src, sig.prefix) {
				sniffed = sig.mime
			}
		}
		part.Mime = sniffed
		if sniffed == "" {
			part.Src = ""
			return part
		}
		part.Src = "data:" + sniffed + ";base64," + src
	}
	return part
}
