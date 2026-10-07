package engine

import (
	"encoding/json"
	"fmt"
)

func (r *Request) hasHistoryCitations() bool {
	for _, message := range r.Messages {
		for _, block := range message.Content {
			if str(block, "type") == "text" && block["citations"] != nil {
				return true
			}
		}
	}
	return false
}

// Restore only a client's already supplied citation arrays. CLI 2.1.292 emits
// citations_delta but omits citations from its final/native assistant blocks.
// Match the whole assistant turn and its preceding document corpus first;
// matching text alone could attach the citation to an identically worded turn.
func restoreHistoryCitations(r *Request, body Object) error {
	if !r.hasHistoryCitations() {
		return nil
	}
	wire, ok := body["messages"].([]any)
	if !ok {
		return fmt.Errorf("citation history has no outbound messages")
	}
	var assistants []Object
	var wireDocs [][]Object
	var wireUsers [][]Object
	var previousUser []Object
	internalResults := map[string]bool{}
	var documents []Object
	for _, value := range wire {
		message, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("invalid citation history message")
		}
		content, err := historyContent(message["content"])
		if err != nil {
			return err
		}
		documents = append(documents, historyDocuments(content)...)
		if str(message, "role") == "user" {
			var clientBlocks []Object
			for _, block := range content {
				if str(block, "type") == "tool_result" && internalResults[str(block, "tool_use_id")] {
					continue
				}
				clientBlocks = append(clientBlocks, block)
			}
			if len(clientBlocks) > 0 {
				previousUser = clientBlocks
			}
		}
		if str(message, "role") == "assistant" && internalHistoryAssistant(r, message) {
			for _, block := range content {
				if str(block, "type") == "tool_use" {
					internalResults[str(block, "id")] = true
				}
			}
			continue
		}
		if str(message, "role") == "assistant" {
			assistants = append(assistants, message)
			wireDocs = append(wireDocs, append([]Object(nil), documents...))
			wireUsers = append(wireUsers, previousUser)
		}
	}
	wantTurns := 0
	for _, message := range r.Messages {
		if message.Role == "assistant" {
			wantTurns++
		}
	}
	if len(assistants) != wantTurns {
		return fmt.Errorf("citation history assistant turn count changed")
	}
	ordinal := 0
	documents = nil
	previousUser = nil
	for _, message := range r.Messages {
		documents = append(documents, historyDocuments(message.Content)...)
		if message.Role == "user" {
			previousUser = r.wireMessage(message).Content
		}
		if message.Role != "assistant" {
			for _, block := range message.Content {
				if str(block, "type") == "text" && block["citations"] != nil {
					return fmt.Errorf("citations on non-assistant history require separate restoration")
				}
			}
			continue
		}
		at := ordinal
		ordinal++
		needs := false
		for _, block := range message.Content {
			needs = needs || str(block, "type") == "text" && block["citations"] != nil
		}
		if !needs {
			continue
		}
		if at >= len(assistants) {
			return fmt.Errorf("citation assistant turn %d is missing", at)
		}
		actual, err := historyContent(assistants[at]["content"])
		if err != nil {
			return err
		}
		expected := r.wireMessage(message).Content
		if len(actual) != len(expected) || digest(historySkeleton(actual)) != digest(historySkeleton(expected)) {
			return fmt.Errorf("citation assistant turn %d does not match native history", at)
		}
		if _, err := alignUserHistoryBlocks(previousUser, wireUsers[at]); err != nil {
			return fmt.Errorf("citation user turn changed before assistant turn %d", at)
		}
		if digest(historySkeleton(wireDocs[at])) != digest(historySkeleton(documents)) {
			return fmt.Errorf("citation document ordering changed before assistant turn %d", at)
		}
		for i, block := range expected {
			if str(block, "type") != "text" || block["citations"] == nil {
				continue
			}
			if existing := actual[i]["citations"]; existing != nil && digest(existing) != digest(block["citations"]) {
				return fmt.Errorf("citation data conflicts at assistant turn %d block %d", at, i)
			}
			raw, err := json.Marshal(block["citations"])
			if err != nil {
				return err
			}
			copy, err := decodePlannedValue(raw)
			if err != nil {
				return err
			}
			actual[i]["citations"] = copy
		}
		assistants[at]["content"] = actual
	}
	return nil
}
