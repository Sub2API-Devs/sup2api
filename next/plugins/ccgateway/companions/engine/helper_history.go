package engine

import (
	"encoding/json"
	"fmt"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

// These helpers do not admit a carrier or grant execution authority. Runtime
// callers must first authenticate the private carrier and bind its issuer.
func helperHistoryAnchors(public, tools json.RawMessage, after int) (string, string, error) {
	index, err := newHelperAnchorIndex(public, tools)
	if err != nil {
		return "", "", err
	}
	anchor, err := index.at(after)
	return anchor, index.catalog, err
}

// One immutable public view per replay. Each distinct boundary is verified and
// hashed once; repeated segments do not reparse the entire public conversation.
type helperAnchorIndex struct {
	messages []json.RawMessage
	catalog  string
	prefixes map[int]string
}

func newHelperAnchorIndex(public, tools json.RawMessage) (*helperAnchorIndex, error) {
	if _, err := helperhistory.CanonicalDigest(public); err != nil {
		return nil, err
	}
	var messages []json.RawMessage
	if err := json.Unmarshal(public, &messages); err != nil {
		return nil, fmt.Errorf("helper history public boundary is missing")
	}
	catalog, err := helperhistory.CanonicalDigest(tools)
	if err != nil {
		return nil, err
	}
	return &helperAnchorIndex{messages: messages, catalog: catalog, prefixes: map[int]string{}}, nil
}

func (index *helperAnchorIndex) at(after int) (string, error) {
	if anchor, ok := index.prefixes[after]; ok {
		return anchor, nil
	}
	if after < 0 || after >= len(index.messages) {
		return "", fmt.Errorf("helper history public boundary is missing")
	}
	if err := helperPublicTurnBoundary(index.messages, after); err != nil {
		return "", err
	}
	prefix, err := json.Marshal(index.messages[:after+1])
	if err != nil {
		return "", err
	}
	anchor, err := helperhistory.CanonicalDigest(prefix)
	if err != nil {
		return "", err
	}
	index.prefixes[after] = anchor
	return anchor, nil
}

// Capture only a whole hidden round whose assistant was observed in the raw
// attributed provider stream and whose user results passed the same exact
// runtime ledger used by cache alignment. Public-overlapping rounds need a
// block-level contract and are not silently converted into hidden history.
func (r *Request) captureHelperHistory(public, tools json.RawMessage, after int, suffix []any) (helperhistory.Segment, error) {
	var segment helperhistory.Segment
	if r.internalCache == nil || len(suffix) == 0 {
		return segment, fmt.Errorf("helper history lacks attributed runtime evidence")
	}
	if err := r.verifyHelperSystemEvidence(suffix); err != nil {
		return segment, err
	}
	if err := r.validateWholeHelperPairs(suffix); err != nil {
		return segment, err
	}
	if err := r.alignInternalCacheSuffix(suffix); err != nil {
		return segment, err
	}
	if err := r.verifyHiddenHelperEvidence(); err != nil {
		return segment, err
	}
	anchor, catalog, err := helperHistoryAnchors(public, tools, after)
	if err != nil {
		return segment, err
	}
	segment = helperhistory.Segment{AfterMessage: after, PublicAnchorDigest: anchor, ToolCatalogDigest: catalog}
	for _, message := range suffix {
		raw, err := json.Marshal(message)
		if err != nil {
			return helperhistory.Segment{}, err
		}
		segment.Messages = append(segment.Messages, raw)
	}
	raw, err := json.Marshal(helperhistory.Payload{Version: helperhistory.Version, Segments: []helperhistory.Segment{segment}})
	if err != nil {
		return helperhistory.Segment{}, err
	}
	if err := helperhistory.Validate(raw); err != nil {
		return helperhistory.Segment{}, err
	}
	return segment, nil
}

func (r *Request) validateWholeHelperPairs(messages []any) error {
	if r.forcedLoadedClientCatalog() {
		return fmt.Errorf("forced client-only catalog cannot contain helper history")
	}
	systems, pairs, err := splitHelperSystems(messages)
	if err != nil {
		return err
	}
	_ = systems
	messages = pairs
	if len(messages)%2 != 0 {
		return fmt.Errorf("helper history has an incomplete pair")
	}
	for _, raw := range messages {
		message, ok := raw.(Object)
		if !ok || keys(message, "role", "content") != nil {
			return fmt.Errorf("helper history envelope contains unobserved controls")
		}
	}
	for i := 0; i < len(messages); i += 2 {
		message, ok := messages[i].(Object)
		if !ok || str(message, "role") != "assistant" {
			return fmt.Errorf("helper history assistant identity changed")
		}
		blocks, err := historyContent(message["content"])
		if err != nil || len(blocks) == 0 {
			return fmt.Errorf("helper history assistant is empty")
		}
		if !internalHistoryAssistant(r, message) {
			return fmt.Errorf("helper history contains public or non-helper calls")
		}
		for _, block := range blocks {
			switch str(block, "type") {
			case "tool_use", "text", "thinking", "redacted_thinking":
			default:
				return fmt.Errorf("helper history contains an unregistered hidden block")
			}
		}
	}
	return nil
}

// Called only where the runner discards a complete buffered discovery response.
// Original source message identity and content must both match; mere tool names
// are not sufficient to establish that planning text or signed thinking was hidden.
func (r *Request) confirmHiddenHelperMessage(message Object) error {
	state := r.internalCache
	if state == nil || !r.bufferedResponse() || !internalHistoryAssistant(r, message) {
		return fmt.Errorf("helper message was not a fully hidden discovery response")
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	id := str(message, "id")
	blocks, err := historyContent(message["content"])
	if err != nil {
		return err
	}
	for i, known := range state.roundIDs {
		if id != known {
			continue
		}
		if digest(blocks) != digest(state.rounds[i]["content"]) {
			return fmt.Errorf("hidden helper differs from original provider message")
		}
		if state.hidden == nil {
			state.hidden = map[string]string{}
		}
		state.hidden[id] = digest(state.rounds[i])
		return nil
	}
	return fmt.Errorf("hidden helper lacks original provider message identity")
}

func (r *Request) verifyHiddenHelperEvidence() error {
	state := r.internalCache
	state.mu.Lock()
	defer state.mu.Unlock()
	if state.failed || len(state.roundIDs) != len(state.rounds) {
		return fmt.Errorf("helper source identity incomplete")
	}
	for i, id := range state.roundIDs {
		if state.hidden[id] != digest(state.rounds[i]) {
			return fmt.Errorf("helper round not confirmed hidden")
		}
	}
	return nil
}

// Decode and validate all trusted segments before returning a replay view.
// This pure stage never mutates Request.Messages, public input or cache keys.
func (r *Request) replayHelperHistory(public, tools json.RawMessage, payload helperhistory.Payload) ([]json.RawMessage, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	if err := helperhistory.Validate(raw); err != nil {
		return nil, err
	}
	anchors, err := newHelperAnchorIndex(public, tools)
	if err != nil {
		return nil, err
	}
	messages := anchors.messages
	if len(messages) == 0 {
		return nil, fmt.Errorf("helper history public messages are empty")
	}
	insertions := make(map[int][]json.RawMessage)
	seen := map[string]bool{}
	for _, raw := range messages {
		message, err := decodeObject(raw)
		if err != nil {
			return nil, err
		}
		blocks, err := historyContent(message["content"])
		if err != nil {
			return nil, err
		}
		for _, block := range blocks {
			if id := str(block, "id"); id != "" {
				seen[id] = true
			}
		}
	}
	for _, segment := range payload.Segments {
		anchor, err := anchors.at(segment.AfterMessage)
		if err != nil || anchor != segment.PublicAnchorDigest || anchors.catalog != segment.ToolCatalogDigest {
			return nil, fmt.Errorf("helper history public anchor or tool catalog changed")
		}
		view, err := r.helperInlineHistoryView(segment.AfterMessage)
		if err != nil {
			return nil, err
		}
		if err := view.validateReplayedHelperSegment(segment, seen); err != nil {
			return nil, err
		}
		insertions[segment.AfterMessage] = append(insertions[segment.AfterMessage], segment.Messages...)
	}
	var out []json.RawMessage
	for i, message := range messages {
		out = append(out, append(json.RawMessage(nil), message...))
		for _, hidden := range insertions[i] {
			out = append(out, append(json.RawMessage(nil), hidden...))
		}
	}
	return out, nil
}

func (r *Request) validateReplayedHelperSegment(segment helperhistory.Segment, seen map[string]bool) error {
	if segment.Kind == helperhistory.SegmentSystemOnly {
		var messages []any
		for _, raw := range segment.Messages {
			m, err := decodeObject(raw)
			if err != nil {
				return err
			}
			messages = append(messages, m)
		}
		systems, rest, err := splitHelperSystems(messages)
		if err != nil {
			return err
		}
		if len(systems) == 0 || len(rest) != 0 {
			return fmt.Errorf("invalid positional helper system")
		}
		return nil
	}
	var suffix []any
	state := &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
	for _, raw := range segment.Messages {
		message, err := decodeObject(raw)
		if err != nil {
			return err
		}
		suffix = append(suffix, message)
		if str(message, "role") != "assistant" {
			continue
		}
		blocks, err := historyContent(message["content"])
		if err != nil {
			return err
		}
		for _, block := range blocks {
			if str(block, "type") != "tool_use" {
				continue
			}
			id := str(block, "id")
			if id == "" || seen[id] {
				return fmt.Errorf("helper history duplicate or missing call identity")
			}
			seen[id] = true
		}
		state.rounds = append(state.rounds, message)
	}
	if err := r.validateWholeHelperPairs(suffix); err != nil {
		return err
	}
	view := *r
	view.internalCache = state
	return view.alignInternalCacheSuffix(suffix)
}
