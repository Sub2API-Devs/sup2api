package usageobserver

import (
	"bytes"
	"encoding/json"
	"strings"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

const (
	maxJSONCapture = 4 << 20
	maxSSELine     = 1 << 20
)

// Observer extracts cumulative token counters while response bytes continue
// directly to the client. SSE events are parsed line-by-line; ordinary JSON is
// captured only up to a strict bound.
type Observer struct {
	contentType string
	pendingSSE  bytes.Buffer
	jsonBody    bytes.Buffer
	usage       requeststate.Usage
}

func New(contentType string) *Observer {
	return &Observer{contentType: strings.ToLower(contentType)}
}

func (o *Observer) Write(p []byte) {
	if o == nil || len(p) == 0 {
		return
	}
	if strings.Contains(o.contentType, "text/event-stream") {
		o.writeSSE(p)
		return
	}
	remaining := maxJSONCapture - o.jsonBody.Len()
	if remaining <= 0 {
		return
	}
	if len(p) > remaining {
		p = p[:remaining]
	}
	_, _ = o.jsonBody.Write(p)
}

func (o *Observer) Finalize() requeststate.Usage {
	if o == nil {
		return requeststate.Usage{}
	}
	if strings.Contains(o.contentType, "text/event-stream") {
		if o.pendingSSE.Len() > 0 {
			o.parseSSELine(o.pendingSSE.Bytes())
			o.pendingSSE.Reset()
		}
	} else if o.jsonBody.Len() > 0 {
		o.parseJSON(o.jsonBody.Bytes())
	}
	return o.usage
}

func (o *Observer) writeSSE(p []byte) {
	for len(p) > 0 {
		newline := bytes.IndexByte(p, '\n')
		if newline < 0 {
			if o.pendingSSE.Len()+len(p) <= maxSSELine {
				_, _ = o.pendingSSE.Write(p)
			} else {
				o.pendingSSE.Reset()
			}
			return
		}
		if o.pendingSSE.Len()+newline <= maxSSELine {
			_, _ = o.pendingSSE.Write(p[:newline])
			o.parseSSELine(o.pendingSSE.Bytes())
		}
		o.pendingSSE.Reset()
		p = p[newline+1:]
	}
}

func (o *Observer) parseSSELine(line []byte) {
	line = bytes.TrimSpace(line)
	if !bytes.HasPrefix(line, []byte("data:")) {
		return
	}
	payload := bytes.TrimSpace(bytes.TrimPrefix(line, []byte("data:")))
	if len(payload) == 0 || bytes.Equal(payload, []byte("[DONE]")) {
		return
	}
	o.parseJSON(payload)
}

func (o *Observer) parseJSON(payload []byte) {
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	var value any
	if err := decoder.Decode(&value); err != nil {
		return
	}
	walk(value, &o.usage)
}

func walk(value any, usage *requeststate.Usage) {
	switch typed := value.(type) {
	case map[string]any:
		for key, child := range typed {
			if number, ok := tokenNumber(child); ok {
				applyCounter(key, number, usage)
			}
			walk(child, usage)
		}
	case []any:
		for _, child := range typed {
			walk(child, usage)
		}
	}
}

func tokenNumber(value any) (int64, bool) {
	number, ok := value.(json.Number)
	if !ok {
		return 0, false
	}
	parsed, err := number.Int64()
	return parsed, err == nil && parsed >= 0
}

func applyCounter(key string, value int64, usage *requeststate.Usage) {
	switch key {
	case "input_tokens", "prompt_tokens", "promptTokenCount":
		usage.InputTokens = max(usage.InputTokens, value)
	case "output_tokens", "completion_tokens", "candidatesTokenCount":
		usage.OutputTokens = max(usage.OutputTokens, value)
	case "cache_read_input_tokens", "cached_tokens", "cachedContentTokenCount":
		usage.CacheReadTokens = max(usage.CacheReadTokens, value)
	case "cache_creation_input_tokens":
		usage.CacheCreationTokens = max(usage.CacheCreationTokens, value)
	case "ephemeral_5m_input_tokens", "cache_creation_5m_input_tokens":
		usage.CacheCreation5mTokens = max(usage.CacheCreation5mTokens, value)
	case "ephemeral_1h_input_tokens", "cache_creation_1h_input_tokens":
		usage.CacheCreation1hTokens = max(usage.CacheCreation1hTokens, value)
	case "reasoning_tokens", "thoughtsTokenCount":
		usage.ReasoningTokens = max(usage.ReasoningTokens, value)
	}
}
