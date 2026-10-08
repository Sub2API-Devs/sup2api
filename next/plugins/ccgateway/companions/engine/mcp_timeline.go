package engine

import "fmt"

type mcpAvailability struct {
	definition Object
	offered    *bool
	tools      map[string]bool
}
type mcpTimeline struct{ current map[string]*mcpAvailability }

func mcpInlineChange(block Object) bool {
	target, _ := block["tool"].(Object)
	return str(target, "type") == "mcp_tool_reference" || str(target, "type") == "mcp_toolset_reference" || str(inlineToolDefinition(block), "type") == "mcp_toolset"
}
func mcpConfigFlag(def Object, name, key string, fallback bool) bool {
	config, _ := def["default_config"].(Object)
	if value, ok := config[key].(bool); ok {
		fallback = value
	}
	configs, _ := def["configs"].(Object)
	config, _ = configs[name].(Object)
	if value, ok := config[key].(bool); ok {
		fallback = value
	}
	return fallback
}
func (s *mcpAvailability) permits(name string) bool {
	if s == nil || !mcpConfigFlag(s.definition, name, "enabled", true) {
		return false
	}
	if pinned, ok := s.definition["tools"].([]any); ok {
		found := false
		for _, value := range pinned {
			tool, _ := value.(Object)
			found = found || str(tool, "name") == name
		}
		if !found {
			return false
		}
	}
	if active, ok := s.tools[name]; ok {
		return active
	}
	if s.offered != nil {
		return *s.offered
	}
	return !mcpConfigFlag(s.definition, name, "defer_loading", false)
}
func (p *MCPConnectorPlan) permitsCall(server, name string) bool {
	if p == nil || !p.hasServer(server) {
		return false
	}
	if p.timeline != nil {
		return p.timeline.current[server].permits(name)
	}
	for _, def := range p.toolsets {
		if str(def, "mcp_server_name") == server {
			return (&mcpAvailability{definition: def}).permits(name)
		}
	}
	return false
}

// Credentials stay in the top-level plan. This compiler owns only availability
// at protocol positions and never changes or serializes a token/URL.
func (r *Request) compileMCPTimeline() error {
	if r.MCP == nil {
		for _, message := range r.Messages {
			for _, block := range message.Content {
				for _, change := range timelineChanges(block) {
					if mcpInlineChange(change) {
						return fmt.Errorf("inline MCP change requires declared server")
					}
				}
			}
		}
		return nil
	}
	timeline := &mcpTimeline{}
	reset := func() {
		timeline.current = map[string]*mcpAvailability{}
		for _, def := range r.MCP.toolsets {
			timeline.current[str(def, "mcp_server_name")] = &mcpAvailability{definition: def, tools: map[string]bool{}}
		}
	}
	reset()
	pending := map[string][2]string{}
	turn := map[string]bool{}
	apply := func(change Object) error {
		if !mcpInlineChange(change) {
			return nil
		}
		target := change["tool"].(Object)
		def := inlineToolDefinition(change)
		server := str(target, "server_name")
		name := str(target, "name")
		if def != nil {
			server = str(def, "mcp_server_name")
		}
		if !r.MCP.hasServer(server) {
			return fmt.Errorf("inline MCP server is undeclared")
		}
		for _, call := range pending {
			if call[0] == server && (name == "" || call[1] == name) {
				return fmt.Errorf("inline MCP change crosses pending call")
			}
		}
		if def != nil {
			timeline.current[server] = &mcpAvailability{definition: def, tools: map[string]bool{}}
			return nil
		}
		state := timeline.current[server]
		if state == nil {
			return fmt.Errorf("inline MCP reference is unresolved")
		}
		active := str(change, "type") == "tool_addition"
		if str(target, "type") == "mcp_toolset_reference" {
			state.offered = &active
			state.tools = map[string]bool{}
		} else {
			if !mcpConfigFlag(state.definition, name, "enabled", true) {
				return fmt.Errorf("inline MCP reference names disabled tool")
			}
			if pinned, ok := state.definition["tools"].([]any); ok {
				known := false
				for _, value := range pinned {
					tool, _ := value.(Object)
					known = known || str(tool, "name") == name
				}
				if !known {
					return fmt.Errorf("inline MCP reference is absent from pinned listing")
				}
			}
			state.tools[name] = active
		}
		return nil
	}
	for _, message := range r.Messages {
		if message.Role == "assistant" {
			turn = map[string]bool{}
		}
		for _, block := range message.Content {
			kind := str(block, "type")
			if kind == "compaction" && block["content"] != nil {
				if _, ok := block["tool_changes"].([]any); ok {
					if len(pending) > 0 {
						return fmt.Errorf("MCP compaction crosses pending call")
					}
					previous := timeline.current
					reset()
					for server, state := range previous {
						if timeline.current[server] == nil {
							inactive := false
							timeline.current[server] = &mcpAvailability{definition: state.definition, offered: &inactive, tools: map[string]bool{}}
						}
					}
				}
			}
			for _, change := range timelineChanges(block) {
				if err := apply(change); err != nil {
					return err
				}
			}
			switch kind {
			case "tool_search_tool_result":
				identities, err := r.mcpSearchDiscoveries(block, timeline)
				if err != nil {
					return err
				}
				for _, identity := range identities {
					timeline.current[identity.server].tools[identity.name] = true
				}
			case "mcp_tool_use":
				server, name := str(block, "server_name"), str(block, "name")
				// Completed history for a server omitted entirely from this request stays
				// opaque; a server present in this timeline must be valid at that position.
				if r.MCP.hasServer(server) && !timeline.current[server].permits(name) {
					return fmt.Errorf("MCP historical tool unavailable at this position")
				}
				id := str(block, "id")
				pending[id] = [2]string{server, name}
				turn[id] = true
			case "mcp_tool_result":
				delete(pending, str(block, "tool_use_id"))
			case "fallback":
				for id := range turn {
					delete(pending, id)
				}
				turn = map[string]bool{}
			}
		}
	}
	r.MCP.timeline = timeline
	return nil
}
