package engine

// This map is transport identity only. Never append it to Tools or any execution catalog.
func (r *Request) compileCompletedClientHistory() error {
	if r.InlineTools != nil {
		return nil
	} // Definitions and removals have their own position-aware contract.
	calls := map[string]Object{}
	completed := map[string]bool{}
	for _, m := range r.Messages {
		for _, b := range m.Content {
			switch str(b, "type") {
			case "tool_use":
				calls[str(b, "id")] = b
			case "tool_result":
				completed[str(b, "tool_use_id")] = true
			}
		}
	}
	for id, b := range calls {
		identity := ToolIdentity{Name: str(b, "name"), Toolset: str(b, "toolset_name")}
		declared := r.acceptsAPIClientIdentity(identity)
		for _, t := range r.Tools {
			declared = declared || identity.Toolset == "" && t.Name == identity.Name
		}
		if declared {
			continue
		}
		caller, _ := b["caller"].(Object)
		if !completed[id] || len(caller) > 0 && str(caller, "type") != "direct" {
			continue
		}
		if r.completedClientHistory == nil {
			r.completedClientHistory = map[string]string{}
		}
		r.completedClientHistory[id] = completedClientHistoryFingerprint(b)
	}
	return nil
}
func (r *Request) completedClientHistoryBlock(block Object) bool {
	if str(block, "type") != "tool_use" {
		return false
	}
	fingerprint, ok := r.completedClientHistory[str(block, "id")]
	return ok && fingerprint == completedClientHistoryFingerprint(block)
}

func completedClientHistoryFingerprint(block Object) string {
	// Cache directives are restored separately by the existing cache plan.
	// All semantic fields, including input/caller/toolset, remain exact.
	return digest(withoutProtocolCache([]Object{block}))
}
