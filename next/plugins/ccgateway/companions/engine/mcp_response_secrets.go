package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

// A remote MCP endpoint can echo its bearer token in a tool result. Reject
// credential-bearing provider data before it reaches CC's persistent transcript.
type mcpResponseGuard struct {
	tokens   []string
	prefixes map[string][]int
	tails    map[string]string
	inputs   map[string]string
	max      int
	held     []byte
}

func newMCPResponseGuard(plan *MCPConnectorPlan) *mcpResponseGuard {
	if plan == nil {
		return nil
	}
	g := &mcpResponseGuard{tails: map[string]string{}, inputs: map[string]string{}, prefixes: map[string][]int{}}
	for _, credential := range plan.credentials {
		if credential.token != "" {
			g.tokens = append(g.tokens, credential.token)
			g.prefixes[credential.token] = credentialPrefixTable(credential.token)
			if len(credential.token) > g.max {
				g.max = len(credential.token)
			}
		}
	}
	if len(g.tokens) == 0 {
		return nil
	}
	return g
}

func (g *mcpResponseGuard) checkValue(value any) error {
	switch value := value.(type) {
	case map[string]any:
		for key, child := range value {
			if err := g.checkValue(key); err != nil {
				return err
			}
			if err := g.checkValue(child); err != nil {
				return err
			}
		}
	case []any:
		for _, child := range value {
			if err := g.checkValue(child); err != nil {
				return err
			}
		}
	case string:
		for _, token := range g.tokens {
			if strings.Contains(value, token) {
				return fmt.Errorf("MCP provider response contains a connector credential")
			}
		}
	}
	return nil
}

func (g *mcpResponseGuard) checkJSON(raw []byte) error {
	var value any
	if err := json.Unmarshal(raw, &value); err != nil {
		return fmt.Errorf("MCP provider returned an uninspectable response")
	}
	if err := g.checkValue(value); err != nil {
		return err
	}
	e, _ := value.(map[string]any)
	if str(e, "type") == "content_block_start" {
		block, _ := e["content_block"].(map[string]any)
		for _, field := range []string{"text", "thinking", "signature", "content"} {
			text, ok := block[field].(string)
			if !ok {
				continue
			}
			if len(text) >= g.max {
				text = text[len(text)-g.max+1:]
			}
			g.tails[fmt.Sprint(e["index"])+":"+field] = text
		}
	}
	if str(e, "type") == "content_block_delta" {
		delta, _ := e["delta"].(map[string]any)
		if str(delta, "type") == "input_json_delta" {
			part, ok := delta["partial_json"].(string)
			if !ok {
				return fmt.Errorf("invalid MCP tool input delta")
			}
			if part == "" {
				return nil
			}
			key := fmt.Sprint(e["index"])
			g.inputs[key] += part
			if len(g.inputs[key]) > 16<<20 {
				return fmt.Errorf("MCP input response exceeds credential inspection limit")
			}
			if json.Valid([]byte(g.inputs[key])) {
				var decoded any
				_ = json.Unmarshal([]byte(g.inputs[key]), &decoded)
				if err := g.checkValue(decoded); err != nil {
					return err
				}
				delete(g.inputs, key)
			}
		}
		for _, field := range []string{"text", "thinking", "signature", "content"} {
			text, ok := delta[field].(string)
			if !ok {
				continue
			}
			key := fmt.Sprint(e["index"]) + ":" + field
			joined := g.tails[key] + text
			if err := g.checkValue(joined); err != nil {
				return err
			}
			if len(joined) >= g.max {
				joined = joined[len(joined)-g.max+1:]
			}
			g.tails[key] = joined
		}
	}
	if str(e, "type") == "content_block_stop" {
		if _, pending := g.inputs[fmt.Sprint(e["index"])]; pending {
			return fmt.Errorf("MCP input response ended before credential inspection completed")
		}
		prefix := fmt.Sprint(e["index"]) + ":"
		for key := range g.tails {
			if strings.HasPrefix(key, prefix) {
				delete(g.tails, key)
			}
		}
	}
	return nil
}

func (g *mcpResponseGuard) checkEvent(raw []byte) error {
	var data [][]byte
	for _, line := range bytes.Split(bytes.ReplaceAll(raw, []byte("\r\n"), []byte("\n")), []byte("\n")) {
		if value, ok := bytes.CutPrefix(line, []byte("data:")); ok {
			data = append(data, bytes.TrimSpace(value))
		}
	}
	if len(data) == 0 {
		return nil
	}
	return g.checkJSON(bytes.Join(data, []byte("\n")))
}

func (g *mcpResponseGuard) releaseEvent(raw []byte) ([]byte, error) {
	if err := g.checkEvent(raw); err != nil {
		g.held = nil
		return nil, err
	}
	if len(g.held)+len(raw) > 16<<20 {
		return nil, fmt.Errorf("MCP response credential lookahead exceeds limit")
	}
	g.held = append(g.held, raw...)
	if len(g.inputs) > 0 {
		return nil, nil
	}
	for _, tail := range g.tails {
		for _, token := range g.tokens {
			if credentialPrefixSuffix(tail, token, g.prefixes[token]) > 0 {
				return nil, nil
			}
		}
	}
	released := g.held
	g.held = nil
	return released, nil
}

// Precompute once per credential. Enumerating every possible prefix and testing
// each suffix is quadratic for a long, repetitive bearer token.
func credentialPrefixTable(token string) []int {
	table := make([]int, len(token))
	for i, size := 1, 0; i < len(token); i++ {
		for size > 0 && token[i] != token[size] {
			size = table[size-1]
		}
		if token[i] == token[size] {
			size++
		}
		table[i] = size
	}
	return table
}

func credentialPrefixSuffix(text, token string, table []int) int {
	size := 0
	for i := range len(text) {
		for size > 0 && (size == len(token) || text[i] != token[size]) {
			size = table[size-1]
		}
		if text[i] == token[size] {
			size++
		}
	}
	return size
}

func (relay *outboundRelay) protectMCPResponse(resp *http.Response) error {
	request, _ := resp.Request.Context().Value(apiOutputRequestKey{}).(*Request)
	if request == nil {
		return nil
	}
	guard := newMCPResponseGuard(request.MCP)
	if guard == nil {
		return nil
	}
	reject := func(err error) error {
		if err != nil {
			relay.reject(&upstreamError{Status: 502, ContentType: "application/json", Body: []byte(`{"type":"error","error":{"type":"api_error","message":"MCP provider response failed credential isolation"}}`)}, resp.Request)
		}
		return err
	}
	if encoding := strings.TrimSpace(resp.Header.Get("Content-Encoding")); encoding != "" && !strings.EqualFold(encoding, "identity") {
		return reject(fmt.Errorf("MCP response encoding was not decoded by the transport"))
	}
	if strings.HasPrefix(resp.Header.Get("Content-Type"), "text/event-stream") {
		resp.Body = &sseWatch{body: resp.Body, relay: relay, request: resp.Request, ignoreErrors: true, guard: func(event []byte) ([]byte, error) {
			released, err := guard.releaseEvent(event)
			return released, reject(err)
		}}
		return nil
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, (16<<20)+1))
	resp.Body.Close()
	if err != nil || len(raw) > 16<<20 {
		return reject(fmt.Errorf("MCP response cannot be safely inspected"))
	}
	if json.Valid(raw) {
		err = guard.checkJSON(raw)
	} else {
		err = guard.checkValue(string(raw))
	}
	if err != nil {
		return reject(err)
	}
	resp.Body = io.NopCloser(bytes.NewReader(raw))
	resp.ContentLength = int64(len(raw))
	resp.Header.Set("Content-Length", strconv.Itoa(len(raw)))
	return nil
}
