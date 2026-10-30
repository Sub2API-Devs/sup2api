package moderation

import (
	"cmp"
	"strings"

	"github.com/tidwall/gjson"
)

// MessagePart is one piece of a saved input_message in the record detail
// (new-api record_message.go): text, or an image whose Src goes straight
// into <img src> (data URL and URL as sent, bare base64 as a data URL of its
// MIME type). Kind is data_url, base64 or url.
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

// MessageParts reads a saved input_message for display; format is the
// record's input_format (the client protocol). ok = false: the JSON cannot
// be read and only the raw text is shown.
func MessageParts(format, raw string) ([]MessagePart, bool) {
	if raw == "" || !gjson.Valid(raw) {
		return nil, false
	}
	parts := []MessagePart{}
	role := ""
	text := func(s string) {
		if s != "" {
			parts = append(parts, MessagePart{Role: role, Type: "text", Text: s})
		}
	}
	image := func(src, mime string) {
		if src != "" {
			p := imagePart(src, mime)
			p.Role = role
			parts = append(parts, p)
		}
	}
	root := gjson.Parse(raw)
	if root.Type == gjson.String {
		text(root.String())
		return parts, true
	}
	gemini := strings.HasPrefix(format, FormatGemini)
	for _, item := range root.Array() {
		role = item.Get("role").String()
		if gemini {
			for _, p := range item.Get("parts").Array() {
				text(p.Get("text").String())
				inline := firstOf(p, "inlineData", "inline_data")
				image(inline.Get("data").String(), firstOf(inline, "mimeType", "mime_type").String())
				file := firstOf(p, "fileData", "file_data")
				image(firstOf(file, "fileUri", "file_uri").String(), firstOf(file, "mimeType", "mime_type").String())
			}
			continue
		}
		// OpenAI chat, Anthropic messages and Responses items.
		content := item.Get("content")
		if content.Type == gjson.String {
			text(content.String())
			continue
		}
		for _, p := range content.Array() {
			switch p.Get("type").String() {
			case "text", "input_text":
				text(p.Get("text").String())
			case "image_url", "input_image":
				image(cmp.Or(stringOf(p.Get("image_url")), p.Get("image_url.url").String()), "")
			case "image":
				image(cmp.Or(p.Get("source.data").String(), p.Get("source.url").String()), p.Get("source.media_type").String())
			}
		}
	}
	return parts, true
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

func stringOf(r gjson.Result) string {
	if r.Type != gjson.String {
		return ""
	}
	return r.String()
}

func firstOf(r gjson.Result, keys ...string) gjson.Result {
	for _, k := range keys {
		if v := r.Get(k); v.Exists() {
			return v
		}
	}
	return gjson.Result{}
}

// imagePart classifies an image source by its prefix and builds a src that
// renders; bare base64 of an unknown type gets no src (a placeholder).
func imagePart(src, mime string) MessagePart {
	part := MessagePart{Type: "image", Src: src, Kind: "base64", Mime: mime}
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
