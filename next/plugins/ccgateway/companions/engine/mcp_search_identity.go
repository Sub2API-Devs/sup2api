package engine

import "fmt"

// The SDK documents the provider-composed name. Enumerate complete pinned
// identities, never split a reference or infer an MCP server from a prefix.
type mcpSearchIdentity struct{ server, name string }

func (r *Request) mcpSearchDefinitions() []Object {
	if r.MCP == nil {
		return nil
	}
	definitions := append([]Object{}, r.MCP.toolsets...)
	for _, message := range r.Messages {
		for _, block := range message.Content {
			for _, change := range timelineChanges(block) {
				if def := inlineToolDefinition(change); str(def, "type") == "mcp_toolset" {
					definitions = append(definitions, def)
				}
			}
		}
	}
	return definitions
}

func (r *Request) mcpSearchIdentities() (map[string]mcpSearchIdentity, error) {
	index := map[string]mcpSearchIdentity{}
	definitions := r.mcpSearchDefinitions()
	deferred := false
	for _, def := range definitions {
		deferred = deferred || mcpMayDefer(def)
	}
	for _, def := range definitions {
		server := str(def, "mcp_server_name")
		pinned, ok := def["tools"].([]any)
		if !ok && deferred {
			return nil, fmt.Errorf("deferred MCP search requires a complete pinned tool listing")
		}
		for _, value := range pinned {
			tool, _ := value.(Object)
			identity := mcpSearchIdentity{server, str(tool, "name")}
			key := identity.server + "_" + identity.name
			if prior, exists := index[key]; exists && prior != identity {
				return nil, fmt.Errorf("ambiguous MCP search reference")
			}
			index[key] = identity
		}
	}
	return index, nil
}

func (r *Request) mcpSearchReference(name string) (mcpSearchIdentity, bool) {
	index, err := r.mcpSearchIdentities()
	if err != nil {
		return mcpSearchIdentity{}, false
	}
	identity, ok := index[name]
	return identity, ok
}

func (r *Request) validateMCPReferenceNames() error {
	index, err := r.mcpSearchIdentities()
	if err != nil {
		return err
	}
	for name := range index {
		for _, tool := range r.Tools {
			if name == tool.Name || name == r.wireName(tool.Name) {
				return fmt.Errorf("MCP search reference collides with client tool")
			}
		}
		for _, tool := range r.APIClientTools {
			if name == apiToolName(tool) {
				return fmt.Errorf("MCP search reference collides with typed tool")
			}
		}
		if r.declaresServerTool(name) {
			return fmt.Errorf("MCP search reference collides with server tool")
		}
	}
	return nil
}

func (s *mcpAvailability) searchable(name string) bool {
	if s == nil || !mcpConfigFlag(s.definition, name, "enabled", true) {
		return false
	}
	pinned, ok := s.definition["tools"].([]any)
	if !ok {
		return false
	}
	found := false
	for _, value := range pinned {
		tool, _ := value.(Object)
		found = found || str(tool, "name") == name
	}
	if !found {
		return false
	}
	if active, exists := s.tools[name]; exists {
		return active
	}
	return s.offered == nil || *s.offered
}

func (r *Request) mcpSearchDiscoveries(block Object, timeline *mcpTimeline) ([]mcpSearchIdentity, error) {
	content, _ := block["content"].(Object)
	refs, _ := content["tool_references"].([]any)
	var identities []mcpSearchIdentity
	for _, value := range refs {
		ref, _ := value.(Object)
		identity, ok := r.mcpSearchReference(str(ref, "tool_name"))
		if !ok {
			continue
		}
		if timeline == nil || !timeline.current[identity.server].searchable(identity.name) {
			return nil, fmt.Errorf("MCP search referenced an unavailable tool at this position")
		}
		identities = append(identities, identity)
	}
	return identities, nil
}

func (p *MCPConnectorPlan) searchTimeline() *mcpTimeline {
	if p == nil {
		return nil
	}
	return p.timeline
}
