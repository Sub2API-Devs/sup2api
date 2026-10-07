package engine

import "fmt"

// Compose registered native-history repairs on a detached body. In CLI
// 2.1.292 advisor blocks disappear; fallback records lose trigger metadata
// and disappear from subsequent model requests. Neither repair may erase the
// other's evidence or move a fallback across a thinking boundary.
func restoreProtocolHistory(r *Request, body Object) error {
	expected := requestFallbackBlocks(r)
	if len(expected) == 0 {
		return restoreAdvisorHistory(r, body)
	}
	copy, err := jsonCopyObject(body)
	if err != nil {
		return err
	}
	actual := wireFallbackBlocks(copy)
	at := 0
	for _, block := range actual {
		for at < len(expected) && digest(fallbackIdentity(block)) != digest(fallbackIdentity(expected[at])) {
			at++
		}
		if at == len(expected) {
			return fmt.Errorf("fallback history transition changed")
		}
		if value, exists := block["trigger"]; exists {
			if wanted, has := expected[at]["trigger"]; !has || digest(value) != digest(wanted) {
				return fmt.Errorf("fallback history trigger conflicts")
			}
		}
		delete(block, "trigger")
		at++
	}
	shadow := *r
	shadow.Messages = append([]Message(nil), r.Messages...)
	for i, message := range shadow.Messages {
		shadow.Messages[i].Content = append([]Object(nil), message.Content...)
		for j, block := range message.Content {
			if str(block, "type") == "fallback" {
				shadow.Messages[i].Content[j] = fallbackIdentity(block)
			}
		}
	}
	if err := restoreAssistantOmissions(&shadow, copy, func(block Object) bool { return advisorHistoryBlock(block) || str(block, "type") == "fallback" }); err != nil {
		return err
	}
	actual = wireFallbackBlocks(copy)
	if len(actual) != len(expected) {
		return fmt.Errorf("fallback history restoration boundary count changed")
	}
	for i, block := range actual {
		if value, exists := expected[i]["trigger"]; exists {
			block["trigger"] = value
		}
	}
	body["messages"] = copy["messages"]
	return nil
}

func fallbackIdentity(block Object) Object {
	out := Object{}
	for key, value := range block {
		if key != "trigger" {
			out[key] = value
		}
	}
	return out
}
func requestFallbackBlocks(r *Request) []Object {
	var out []Object
	for _, message := range r.Messages {
		for _, block := range message.Content {
			if str(block, "type") == "fallback" {
				out = append(out, block)
			}
		}
	}
	return out
}
func wireFallbackBlocks(body Object) []Object {
	var out []Object
	messages, _ := body["messages"].([]any)
	for _, value := range messages {
		message, _ := value.(Object)
		if str(message, "role") != "assistant" {
			continue
		}
		blocks, _ := historyContent(message["content"])
		for _, block := range blocks {
			if str(block, "type") == "fallback" {
				out = append(out, block)
			}
		}
	}
	return out
}
