package engine

import "fmt"

// Restore only definitions that persisted, validated discovery messages require.
// Inline histories already carry their original Base plus positional changes;
// never promote a historical inline discovery into the current active catalog.
func (r *Request) restoreHelperToolCatalog(body Object) error {
	x := r.helperHistory
	if x == nil || r.InlineTools != nil || len(x.imported.Segments) == 0 {
		return nil
	}
	needed, err := x.helperReferenceNames()
	if err != nil {
		return err
	}
	if len(needed) == 0 {
		return nil
	}
	// Decode through the protocol decoder to retain arbitrary integer lexemes.
	container, err := decodeObject(append(append([]byte(`{"tools":`), x.tools...), '}'))
	if err != nil {
		return err
	}
	rawTools, err := historyContent(container["tools"])
	if err != nil {
		return err
	}
	definitions := map[string]Object{}
	for _, raw := range rawTools {
		name := str(raw, "name")
		wire := r.wireName(name)
		if !needed[wire] {
			continue
		}
		if r.Native[name] {
			continue
		} // Native availability must be established by the CLI.
		if definitionFamily(raw) != "custom" {
			return fmt.Errorf("helper reference requires unsupported provider tool identity")
		}
		copy, err := jsonCopyObject(raw)
		if err != nil {
			return err
		}
		copy["name"] = wire
		definitions[wire] = copy
	}
	tools, err := historyContent(body["tools"])
	if err != nil {
		return err
	}
	seen := map[string]bool{}
	out := make([]any, 0, len(tools)+len(definitions))
	for _, tool := range tools {
		name := str(tool, "name")
		if seen[name] {
			return fmt.Errorf("ambiguous helper tool catalog")
		}
		seen[name] = true
		if original := definitions[name]; original != nil {
			if digest(tool["input_schema"]) != digest(original["input_schema"]) {
				return fmt.Errorf("helper tool schema differs from verified client definition")
			}
			out = append(out, original)
		} else {
			out = append(out, tool)
		}
	}
	for _, raw := range rawTools {
		name := r.wireName(str(raw, "name"))
		if !needed[name] || seen[name] {
			continue
		}
		original := definitions[name]
		if original == nil {
			return fmt.Errorf("helper referenced tool has no restorable client definition")
		}
		out = append(out, original)
		seen[name] = true
	}
	for name := range needed {
		if !seen[name] {
			return fmt.Errorf("helper reference lacks its verified tool definition")
		}
	}
	body["tools"] = out
	return nil
}

func (x *helperHistoryExecution) helperReferenceNames() (map[string]bool, error) {
	needed := map[string]bool{}
	for _, segment := range x.imported.Segments {
		for _, raw := range segment.Messages {
			if err := collectHelperMessageReferences(raw, needed); err != nil {
				return nil, err
			}
		}
	}
	return needed, nil
}

func collectHelperMessageReferences(raw []byte, needed map[string]bool) error {
	message, err := decodeObject(raw)
	if err != nil {
		return err
	}
	if str(message, "role") != "user" {
		return nil
	}
	blocks, err := historyContent(message["content"])
	if err != nil {
		return err
	}
	for _, block := range blocks {
		if str(block, "type") != "tool_result" {
			continue
		}
		if err := collectHelperResultReferences(block, needed); err != nil {
			return err
		}
	}
	return nil
}

func collectHelperResultReferences(block Object, needed map[string]bool) error {
	refs, err := historyContent(block["content"])
	if err != nil {
		return err
	}
	for _, ref := range refs {
		if str(ref, "type") == "tool_reference" {
			needed[str(ref, "tool_name")] = true
		}
	}
	return nil
}
