package engine

import "fmt"

// A listing is immutable response/history data, not a change to the client's
// declaration or credentials. A conflicting second listing has no proven merge
// contract and must not replace definitions already used by this conversation.
type mcpListingCatalog struct {
	tools  []any
	digest string
}

func (p *MCPConnectorPlan) configureDynamicListing(body Object, listingBeta bool) error {
	dynamic := false
	for _, def := range p.toolsets {
		_, pinned := def["tools"].([]any)
		dynamic = dynamic || !pinned && mcpMayDefer(def)
	}
	if !dynamic {
		return nil
	}
	if !listingBeta || len(p.servers) != 1 || len(p.toolsets) != 1 {
		return fmt.Errorf("dynamic deferred MCP requires one server and the listing beta; mixed catalogs require complete pinned listings")
	}
	for _, key := range []string{"fallbacks", "fallback_credit_token", "compaction", "context_management", "safeguards"} {
		if body[key] != nil {
			return fmt.Errorf("dynamic deferred MCP does not support %s", key)
		}
	}
	search := false
	tools, _ := historyContent(body["tools"])
	for _, tool := range tools {
		search = search || serverSearchName(str(tool, "type")) != ""
	}
	if !search {
		return fmt.Errorf("dynamic deferred MCP requires API tool search")
	}
	rows, _ := body["messages"].([]any)
	for _, row := range rows {
		if !dynamicMCPHistoryMessageSupported(row) {
			return fmt.Errorf("dynamic deferred MCP requires top-level declarations without inline, compaction or fallback history")
		}
	}
	p.dynamicListing = true
	return nil
}

// Shape validation belongs to the protocol parser. This pure predicate only
// bounds the new dynamic-listing combination; it never rewrites public history.
func dynamicMCPHistoryMessageSupported(raw any) bool {
	message, _ := raw.(Object)
	blocks, _ := historyContent(message["content"])
	for _, block := range blocks {
		if inlineToolBlock(block) || str(block, "type") == "compaction" || str(block, "type") == "fallback" {
			return false
		}
	}
	return true
}

func (r *Request) dynamicMCPListing() bool { return r.MCP != nil && r.MCP.dynamicListing }

func (s *mcpAvailability) listedTools() ([]any, bool) {
	if pinned, ok := s.definition["tools"].([]any); ok {
		return pinned, true
	}
	if s.listing != nil {
		return s.listing.tools, true
	}
	return nil, false
}

func cloneMCPListingTimeline(source *mcpTimeline) *mcpTimeline {
	if source == nil {
		return nil
	}
	out := &mcpTimeline{current: map[string]*mcpAvailability{}}
	for name, state := range source.current {
		copy := *state
		copy.tools = map[string]bool{}
		for name, active := range state.tools {
			copy.tools[name] = active
		}
		out.current[name] = &copy
	}
	return out
}

func (r *Request) acceptMCPListing(block Object, timeline *mcpTimeline) error {
	if !r.dynamicMCPListing() {
		return nil
	}
	if err := checkMCPBlock(block, "assistant"); err != nil {
		return err
	}
	server := str(block, "mcp_server_name")
	if !r.MCP.hasServer(server) || timeline == nil || timeline.current[server] == nil {
		return fmt.Errorf("dynamic MCP listing has no declared server")
	}
	state := timeline.current[server]
	fingerprint := digest(block["tools"])
	if state.listing != nil {
		if state.listing.digest != fingerprint {
			return fmt.Errorf("dynamic MCP listing changed within the conversation")
		}
		return nil
	}
	copy, err := jsonCopyObject(block)
	if err != nil {
		return err
	}
	listing := &mcpListingCatalog{tools: copy["tools"].([]any), digest: fingerprint}
	candidate := cloneMCPListingTimeline(timeline)
	candidate.current[server].listing = listing
	index, err := r.mcpSearchIdentitiesAt(candidate)
	if err != nil {
		return err
	}
	if err := r.validateMCPReferenceIndex(index); err != nil {
		return err
	}
	state.listing = listing
	return nil
}

func (l *serverToolLedger) mcpSearchTimeline(r *Request) *mcpTimeline {
	if r.MCP == nil {
		return nil
	}
	if !r.dynamicMCPListing() {
		return r.MCP.timeline
	}
	if l.mcpListingTimeline == nil {
		l.mcpListingTimeline = cloneMCPListingTimeline(r.MCP.timeline)
	}
	return l.mcpListingTimeline
}
