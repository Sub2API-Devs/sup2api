package engine

import "fmt"

// Stage only the observed CLI caller omission. This does not authorize history:
// the relay must subsequently verify the entire aligned client transcript,
// after other registered field/block restorations have run.
func (r *Request) restorePTCCallers(body Object) (bool, error) {
	expected := map[string]Object{}
	for _, message := range r.Messages {
		for _, block := range r.wireMessage(message).Content {
			caller, _ := block["caller"].(Object)
			if str(block, "type") == "tool_use" && caller != nil && str(caller, "type") != "direct" {
				if err := checkProviderCaller(caller); err != nil {
					return false, err
				}
				id := str(block, "id")
				if expected[id] != nil {
					return false, fmt.Errorf("ambiguous historical programmatic call")
				}
				expected[id] = block
			}
		}
	}
	changed := false
	messages, _ := body["messages"].([]any)
	for _, value := range messages {
		message, _ := value.(Object)
		if str(message, "role") != "assistant" {
			continue
		}
		blocks, err := historyContent(message["content"])
		if err != nil {
			return false, err
		}
		for _, block := range blocks {
			if str(block, "type") != "tool_use" {
				continue
			}
			want := expected[str(block, "id")]
			if want == nil {
				continue
			}
			if _, exists := block["caller"]; exists {
				if digest(block["caller"]) != digest(want["caller"]) {
					return false, fmt.Errorf("historical programmatic caller conflicts")
				}
				continue
			}
			skeleton, _ := jsonCopyObject(want)
			delete(skeleton, "caller")
			if digest(historySkeleton([]Object{skeleton})) != digest(historySkeleton([]Object{block})) {
				return false, fmt.Errorf("programmatic history changed beyond caller omission")
			}
			copy, err := jsonCopyObject(want["caller"].(Object))
			if err != nil {
				return false, err
			}
			block["caller"] = copy
			changed = true
		}
	}
	return changed, nil
}

// CLI 2.1.292 omits a suspended execution parent alongside its externally
// dispatched child. The exact child is the retained anchor in the same turn;
// full surrounding-turn alignment is still performed by the shared restorer.
func (r *Request) ptcHistoryParent(block Object) bool {
	if str(block, "type") != "server_tool_use" || str(block, "name") != "code_execution" {
		return false
	}
	for _, message := range r.Messages {
		found := false
		for _, candidate := range message.Content {
			if digest(candidate) == digest(block) {
				found = true
				break
			}
		}
		if !found {
			continue
		}
		for _, candidate := range message.Content {
			caller, _ := candidate["caller"].(Object)
			if str(candidate, "type") == "tool_use" && str(caller, "type") != "direct" && str(caller, "tool_id") == str(block, "id") {
				return true
			}
		}
	}
	return false
}
