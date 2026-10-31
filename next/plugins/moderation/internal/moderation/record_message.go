package moderation

import (
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

// MessageParts reads a saved input_message for display; format is the
// record's input_format (the client protocol). The parts are what the hook
// moderated (walkParts). ok = false: the JSON cannot be read and only the
// raw text is shown.
func MessageParts(format, raw string) ([]MessagePart, bool) {
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
	walkFormat := FormatMessages
	if strings.HasPrefix(format, FormatGemini) {
		walkFormat = FormatGemini
	}
	for _, item := range items {
		walkParts(walkFormat, item, func(role string, p msgPart) {
			switch {
			case p.img.URL != "":
				parts = append(parts, imagePart(role, p.img.URL, p.img.MediaType))
			case p.img.Data != "":
				parts = append(parts, imagePart(role, p.img.Data, p.img.MediaType))
			case p.text != "":
				parts = append(parts, MessagePart{Role: role, Type: "text", Text: p.text})
			}
		})
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
