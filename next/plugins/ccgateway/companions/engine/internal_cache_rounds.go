package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
)

// Runtime-only evidence, never accepted from client history or persisted across requests.
type internalCacheRounds struct {
	mu         sync.Mutex
	events     [][]byte
	bytes      int
	rounds     []Object
	roundIDs   []string
	hidden     map[string]string
	discovered map[string]bool
	results    map[string]string
	helpers    map[string]string
	failed     bool
	messageIDs map[string]bool
	toolIDs    map[string]bool
	users      map[int]string
}

func (r *Request) internalCacheHelper(name string) bool {
	for _, tool := range r.Tools {
		if r.wireName(tool.Name) == name {
			return false
		}
	}
	return name == "ToolSearch" && r.toolSearchEnabled() || name == "StructuredOutput" && r.structuredOutput()
}

func (r *Request) observeInternalCacheEvent(e Object) {
	if r == nil || r.internalCache == nil {
		return
	}
	state := r.internalCache
	state.mu.Lock()
	defer state.mu.Unlock()
	if state.failed {
		return
	}
	raw, err := json.Marshal(e)
	if err != nil || state.bytes+len(raw) > credits.MaxBodyBytes {
		state.failed = true
		return
	}
	state.bytes += len(raw)
	state.events = append(state.events, raw)
	if str(e, "type") != "message_stop" {
		return
	}
	raw, err = credits.MessageFromEvents(state.events)
	state.events = nil
	state.bytes = 0
	if err != nil {
		state.failed = true
		return
	}
	message, err := decodeObject(raw)
	if err != nil {
		state.failed = true
		return
	}
	if state.messageIDs == nil {
		state.messageIDs = map[string]bool{}
		state.toolIDs = map[string]bool{}
	}
	if state.messageIDs[str(message, "id")] {
		state.failed = true
		return
	}
	state.messageIDs[str(message, "id")] = true
	blocks, _ := historyContent(message["content"])
	calls := 0
	for _, b := range blocks {
		if str(b, "type") != "tool_use" {
			continue
		}
		if !r.internalCacheHelper(str(b, "name")) {
			return
		}
		if str(b, "id") == "" || state.toolIDs[str(b, "id")] {
			state.failed = true
			return
		}
		state.toolIDs[str(b, "id")] = true
		calls++
	}
	if str(message, "stop_reason") != "tool_use" || calls == 0 {
		return
	}
	if len(state.rounds) >= 5 {
		state.failed = true
		return
	}
	state.rounds = append(state.rounds, Object{"role": "assistant", "content": blocks})
	state.roundIDs = append(state.roundIDs, str(message, "id"))
}

func (r *Request) alignInternalCacheSuffix(messages []any) error {
	filtered := make([]any, 0, len(messages))
	for _, v := range messages {
		m, _ := v.(map[string]any)
		if str(m, "role") != "system" {
			filtered = append(filtered, v)
		}
	}
	messages = filtered
	state := r.internalCache
	if state == nil {
		return fmt.Errorf("unmatched outbound history after cache alignment")
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	if state.failed || len(messages) != 2*len(state.rounds) {
		return fmt.Errorf("internal cache round evidence incomplete: rounds=%d suffix=%s", len(state.rounds), cacheShape(messages))
	}
	for i, want := range state.rounds {
		actual, ok := messages[i*2].(map[string]any)
		blocks, _ := historyContent(actual["content"])
		expected, _ := historyContent(want["content"])
		if !ok || str(actual, "role") != "assistant" || digest(historySkeleton(blocks)) != digest(historySkeleton(expected)) {
			return fmt.Errorf("internal cache assistant differs from observed response")
		}
		pending := map[string]bool{}
		for _, b := range expected {
			if str(b, "type") == "tool_use" {
				pending[str(b, "id")] = true
			}
		}
		result, ok := messages[i*2+1].(map[string]any)
		if !ok || str(result, "role") != "user" {
			return fmt.Errorf("internal cache result role changed")
		}
		content, err := historyContent(result["content"])
		if err != nil {
			return err
		}
		for j, b := range content {
			// CLI 2.1.292 appends this literal acknowledgement after ToolSearch results.
			if j == len(content)-1 && len(pending) == 0 && str(b, "type") == "text" && str(b, "text") == "Tool loaded." && len(historySkeleton([]Object{b})[0]) == 2 {
				continue
			}
			id := str(b, "tool_use_id")
			if str(b, "type") != "tool_result" || !pending[id] {
				return fmt.Errorf("internal cache result has unobserved tool identity")
			}
			delete(pending, id)
			var call Object
			for _, candidate := range expected {
				if str(candidate, "id") == id {
					call = candidate
				}
			}
			if str(call, "name") == "ToolSearch" && b["is_error"] != true {
				references, err := historyContent(b["content"])
				if err != nil || len(references) == 0 {
					return fmt.Errorf("internal search result lacks references")
				}
				for _, ref := range references {
					if str(ref, "type") != "tool_reference" || len(ref) != 2 {
						return fmt.Errorf("unknown internal search result encoding")
					}
					name := str(ref, "tool_name")
					found := false
					for _, tool := range r.Tools {
						if r.runtimeToolSearchable(tool.Name) && r.wireName(tool.Name) == name {
							found = true
						}
					}
					if !found {
						return fmt.Errorf("internal search referenced undeclared or withdrawn client tool")
					}
					if state.discovered == nil {
						state.discovered = map[string]bool{}
					}
					state.discovered[name] = true
				}
			}
			value := digest(historySkeleton([]Object{b}))
			if old := state.results[id]; old != "" && old != value {
				return fmt.Errorf("internal cache result changed between rounds")
			}
			state.results[id] = value
		}
		if len(pending) != 0 {
			return fmt.Errorf("internal cache result missing")
		}
		if state.users == nil {
			state.users = map[int]string{}
		}
		userHash := digest(historySkeleton(content))
		if old := state.users[i]; old != "" && old != userHash {
			return fmt.Errorf("internal cache result envelope changed")
		}
		state.users[i] = userHash
	}
	return nil
}

func (r *Request) checkInternalCacheHelper(tool Object) error {
	for _, client := range r.Tools {
		if r.wireName(client.Name) == str(tool, "name") {
			return fmt.Errorf("client tool cannot be an internal cache helper")
		}
	}
	state := r.internalCache
	if state == nil || !(r.internalCacheHelper(str(tool, "name")) || r.toolSearchEnabled() && str(tool, "name") == "DeferredToolPlaceholder") {
		return fmt.Errorf("unregistered tool in cache prefix: %s", str(tool, "name"))
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	raw, _ := json.Marshal(tool)
	// Tool schemas are immutable within the request. Markers are stripped by caller.
	key := str(tool, "name")
	if previous := state.helpers[key]; previous != "" && !bytes.Equal([]byte(previous), raw) {
		return fmt.Errorf("internal cache helper definition changed")
	}
	state.helpers[key] = string(raw)
	return nil
}

func cacheShape(messages []any) string {
	var out []string
	for _, v := range messages {
		m, _ := v.(map[string]any)
		blocks, _ := historyContent(m["content"])
		line := str(m, "role")
		for _, b := range blocks {
			line += "/" + str(b, "type")
		}
		out = append(out, line)
	}
	return fmt.Sprint(out)
}
