package main

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

// upstream is one native endpoint of a test account.
type upstream struct {
	url    string
	header http.Header
}

// families gives each protocol family its environment prefix and default
// base URL.
var families = map[string][2]string{
	"openai":    {"CONVERT_RECORD_OPENAI", "https://api.openai.com"},
	"anthropic": {"CONVERT_RECORD_ANTHROPIC", "https://api.anthropic.com"},
	"gemini":    {"CONVERT_RECORD_GEMINI", "https://generativelanguage.googleapis.com"},
}

// paths is each protocol's endpoint path; %s is the model.
var paths = map[string]string{
	"openai.chat":            "/v1/chat/completions",
	"openai.responses":       "/v1/responses",
	"anthropic.messages":     "/v1/messages",
	"gemini.generate":        "/v1beta/models/%s:generateContent",
	"gemini.stream_generate": "/v1beta/models/%s:streamGenerateContent?alt=sse",
}

func upstreamFor(protocol, model string) (*upstream, error) {
	fam, _, _ := strings.Cut(protocol, ".")
	f, ok := families[fam]
	path, known := paths[protocol]
	if !ok || !known {
		return nil, fmt.Errorf("no upstream for %s", protocol)
	}
	key := os.Getenv(f[0] + "_KEY")
	if key == "" {
		return nil, fmt.Errorf("%s_KEY is not set", f[0])
	}
	if strings.Contains(path, "%s") {
		path = fmt.Sprintf(path, model)
	}
	h := http.Header{"Content-Type": {"application/json"}}
	switch fam {
	case "openai":
		h.Set("Authorization", "Bearer "+key)
	case "anthropic":
		h.Set("X-Api-Key", key)
		h.Set("Anthropic-Version", "2023-06-01")
	case "gemini":
		h.Set("X-Goog-Api-Key", key)
	}
	return &upstream{url: strings.TrimRight(or(os.Getenv(f[0]+"_BASE_URL"), f[1]), "/") + path, header: h}, nil
}

// send posts body and returns the whole reply; a non-2xx status fails.
func (u *upstream) send(ctx context.Context, body []byte) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u.url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header = u.header.Clone()
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	out, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("upstream status %d: %s", resp.StatusCode, out)
	}
	return out, nil
}

// fetchMedia downloads a media URL for conversions to Gemini.
func fetchMedia(ctx context.Context, url string) (string, string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", "", err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 64<<20))
	if err != nil {
		return "", "", err
	}
	if resp.StatusCode/100 != 2 {
		return "", "", fmt.Errorf("media status %d", resp.StatusCode)
	}
	return http.DetectContentType(data), base64.StdEncoding.EncodeToString(data), nil
}

// splitSSE splits a reply stream into events.
func splitSSE(b []byte) []convert.Event {
	var out []convert.Event
	var cur convert.Event
	sc := bufio.NewScanner(bytes.NewReader(b))
	sc.Buffer(nil, 64<<20)
	for sc.Scan() {
		line := strings.TrimRight(sc.Text(), "\r")
		switch {
		case line == "":
			if cur.Name != "" || len(cur.Data) > 0 {
				out = append(out, cur)
			}
			cur = convert.Event{}
		case strings.HasPrefix(line, "event:"):
			cur.Name = strings.TrimSpace(line[len("event:"):])
		case strings.HasPrefix(line, "data:"):
			if len(cur.Data) > 0 {
				cur.Data = append(cur.Data, '\n')
			}
			cur.Data = append(cur.Data, strings.TrimPrefix(line[len("data:"):], " ")...)
		}
	}
	if cur.Name != "" || len(cur.Data) > 0 {
		out = append(out, cur)
	}
	return out
}

// Sanitizing: opaque state becomes a fixed fake, ids keep their prefix and
// get a stable fake suffix (the same id maps to the same fake in a file).
var (
	secretKeys = map[string]bool{"signature": true, "thoughtSignature": true, "encrypted_content": true,
		"encrypted_index": true, "data": true}
	idKeys = map[string]bool{"id": true, "call_id": true, "tool_use_id": true, "item_id": true, "responseId": true}
)

const fakeSecret = "c2FuaXRpemVkLWJ5LWNvbnZlcnQtcmVjb3Jk"

func sanitizeValue(key string, v any) any {
	switch x := v.(type) {
	case map[string]any:
		for k, e := range x {
			x[k] = sanitizeValue(k, e)
		}
	case []any:
		for i, e := range x {
			x[i] = sanitizeValue(key, e)
		}
	case string:
		switch {
		case secretKeys[key] && x != "":
			return fakeSecret
		case idKeys[key] && x != "":
			return fakeID(x)
		}
	}
	return v
}

func fakeID(id string) string {
	sum := sha1.Sum([]byte(id))
	prefix := ""
	if i := strings.IndexAny(id, "_-"); i > 0 && i < 12 {
		prefix = id[:i+1]
	}
	return prefix + hex.EncodeToString(sum[:12])
}

// sanitizeJSON returns a JSON document sanitized and indented; other data
// comes back unchanged.
func sanitizeJSON(b []byte) []byte {
	var v any
	dec := json.NewDecoder(bytes.NewReader(b))
	dec.UseNumber()
	if dec.Decode(&v) != nil {
		return b
	}
	var out bytes.Buffer
	enc := json.NewEncoder(&out)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	_ = enc.Encode(sanitizeValue("", v))
	return out.Bytes()
}

// sanitizeSSE sanitizes every JSON event of a stream, compactly.
func sanitizeSSE(b []byte) []byte {
	var out []byte
	for _, ev := range splitSSE(b) {
		var buf bytes.Buffer
		if json.Compact(&buf, sanitizeJSON(ev.Data)) == nil {
			ev.Data = buf.Bytes()
		}
		out = convert.AppendSSE(out, ev)
	}
	return out
}
