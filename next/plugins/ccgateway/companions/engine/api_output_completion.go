package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type apiOutputRequestKey struct{}
type apiTerminalObserver struct {
	fallbackMessageID  string
	relay              *outboundRelay
	req                *Request
	reason             string
	internal, external bool
}

func (o *apiTerminalObserver) observe(event []byte) {
	var data [][]byte
	for _, line := range bytes.Split(bytes.ReplaceAll(event, []byte("\r\n"), []byte("\n")), []byte("\n")) {
		if value, ok := bytes.CutPrefix(line, []byte("data:")); ok {
			data = append(data, bytes.TrimSpace(value))
		}
	}
	e, err := decodeObject(bytes.Join(data, []byte("\n")))
	if err != nil {
		return
	}
	o.observeFallback(e)
	switch str(e, "type") {
	case "content_block_start":
		block, _ := e["content_block"].(map[string]any)
		if str(block, "type") == "tool_use" {
			if o.req != nil && internalHistoryAssistant(o.req, Object{"content": []Object{block}}) {
				o.internal = true
			} else {
				o.external = true
			}
		}
	case "message_delta":
		delta, _ := e["delta"].(map[string]any)
		if reason := str(delta, "stop_reason"); reason != "" {
			o.reason = reason
		}
	case "message_stop":
		if o.reason != "" && (o.reason == "refusal" || o.req == nil || o.req.stopsAtAPITerminal(o.reason)) && !(o.reason == "tool_use" && o.internal && !o.external) {
			o.relay.mu.Lock()
			o.relay.stopped = true
			o.relay.mu.Unlock()
		}
	}
}

// API output formatting is an upstream constraint, not a request for CC to
// repair/refine the answer. A completed stop (including truncation/refusal)
// must end this API call before CC can make an implicit second model request.
func (s *cliSession) completeAPIOutput() (Object, error) {
	s.relay.mu.Lock()
	s.relay.stopped = true
	s.relay.mu.Unlock()
	if s.req.APIOutputFormat && str(s.acc.Message, "stop_reason") == "end_turn" && !s.acc.HasClientTool {
		if err := validateStructuredText(s.req.JSONSchema, s.acc.Blocks); err != nil {
			s.req.diagnostic.trace("output_schema_diagnostic", Object{"message": err.Error(), "upstream_status": 200})
		}
	}
	if err := s.flush(); err != nil {
		return nil, err
	}
	s.p.APIResponseComplete = true
	// Read only while the writer is live. captureNative runs after Runner has
	// stopped and waited for the child, so it never rewrites a live JSONL file.
	deadline := time.Now().Add(500 * time.Millisecond)
	probe := nativeCheckpointProbe{}
	for time.Now().Before(deadline) {
		if s.nativeTerminalAvailable(&probe) {
			break
		}
		select {
		case <-s.ctx.Done():
			return nil, s.ctx.Err()
		case <-time.After(10 * time.Millisecond):
		}
	}
	return s.acc.Message, nil
}

type nativeCheckpointProbe struct {
	path     string
	size     int64
	modified time.Time
}

func (p *nativeCheckpointProbe) changed(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	if path == p.path && info.Size() == p.size && info.ModTime().Equal(p.modified) {
		return false
	}
	p.path, p.size, p.modified = path, info.Size(), info.ModTime()
	return true
}

func (s *cliSession) nativeTerminalAvailable(probe *nativeCheckpointProbe) bool {
	paths, _ := filepath.Glob(filepath.Join(cliConfigDir(s.proc.cmd.Env), "projects", "*", s.p.SessionID+".jsonl"))
	if len(paths) == 0 && s.p.Path != "" {
		paths = []string{filepath.Join(filepath.Dir(s.p.Path), s.p.SessionID+".jsonl")}
	}
	if len(paths) != 1 {
		return false
	}
	// A large transcript need not be reparsed every 10ms while the CLI writer
	// is idle. A partial write changes size/mtime and will still be retried.
	if !probe.changed(paths[0]) {
		return false
	}
	p := *s.p
	p.NativePath = paths[0]
	rows, err := p.readNative(str(s.acc.Message, "id"))
	return err == nil && nativeResponseContentMatches(rows, str(s.acc.Message, "id"), s.req, s.acc.Blocks)
}

func nativeResponseContentMatches(rows []json.RawMessage, id string, req *Request, want []Object) bool {
	var blocks []Object
	identities := map[string]Object{}
	for _, block := range want {
		if str(block, "type") == "tool_use" {
			identities[str(block, "id")] = block
		}
	}
	for _, raw := range rows {
		row, err := decodeObject(raw)
		if err != nil {
			return false
		}
		message, _ := row["message"].(map[string]any)
		if str(row, "type") != "assistant" || str(message, "id") != id {
			continue
		}
		values, _ := message["content"].([]any)
		for _, value := range values {
			block, ok := value.(map[string]any)
			if !ok {
				return false
			}
			if str(block, "type") == "tool_use" {
				if expected := identities[str(block, "id")]; expected != nil {
					if err := restoreKnownToolsetField(expected, block); err != nil {
						return false
					}
				}
				name := req.apiResponseToolName(block)
				if name == "" {
					return false
				}
				block["name"] = name
			}
			blocks = append(blocks, block)
		}
	}
	return len(blocks) > 0 && digest(historySkeleton(blocks)) == digest(historySkeleton(want))
}

// Response-only snapshots share the cache quota/expiry but are never used as
// native resume points. The next complete client history rebuilds normally.
func (p *Prepared) commitResponseOnly(r *Request, answer Object, c *HistoryCache, logical string, started time.Time) error {
	if len(p.Hashes) == 0 || str(answer, "id") == "" || str(answer, "role") != "assistant" || str(answer, "stop_reason") == "" {
		return fmt.Errorf("incomplete response checkpoint")
	}
	blocks, ok := answer["content"].([]Object)
	if !ok {
		return fmt.Errorf("missing assistant content")
	}
	hash := digest([]any{p.Hashes[len(p.Hashes)-1], Message{Role: "assistant", Content: blocks}})
	hashes := append(append([]string(nil), p.Hashes...), hash)
	if r.continuation != "" {
		messages := append([]Message(nil), r.Messages...)
		last := len(messages) - 1
		messages[last].Content = append(append([]Object(nil), messages[last].Content...), blocks...)
		hashes = fingerprints(messages)
		hash = hashes[len(hashes)-1]
	}
	raw, err := json.Marshal(answer)
	if err != nil {
		return err
	}
	validHashes := map[string]bool{}
	for _, h := range hashes {
		validHashes[h] = true
	}
	var previous []ResponseCheckpoint
	for _, record := range cloneResponseCheckpoints(p.Responses) {
		if validHashes[record.ClientHash] && record.ClientHash != hash {
			previous = append(previous, record)
		}
	}
	snapshot := &Snapshot{Format: 2, ResponseOnly: true, Hashes: hashes, Expires: started.Add(24 * time.Hour), Responses: append(previous, ResponseCheckpoint{ClientHash: hash, MessageID: str(answer, "id"), Response: raw})}
	// Discard this uncommitted run's private native file, never an older shared
	// prefix. API format runs fork cached sessions before entering this path.
	if p.NativePath != "" && (p.Fork || p.Mode == "rebuild") {
		_ = os.Remove(p.NativePath)
	}
	return c.put(cacheKey(logical, r.toolHistoryNamespace(), hash), snapshot)
}
