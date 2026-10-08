package engine

import "fmt"

// A mixed server/client turn may pause server execution until the client's
// tool_result arrives. IDs and result kinds remain bound across those turns.
type serverToolLedger struct {
	mcpListingTimeline *mcpTimeline
	ptc                *ptcLedger
	pending            map[string]string
	seen               map[string]bool
	names              map[string]string
	turnCalls          map[string]bool
	mcpServers         map[string]string
	mcpLoaded          map[mcpSearchIdentity]bool
}

func newServerToolLedger() *serverToolLedger {
	return &serverToolLedger{ptc: newPTCLedger(), pending: map[string]string{}, seen: map[string]bool{}, names: map[string]string{}, turnCalls: map[string]bool{}, mcpServers: map[string]string{}}
}

func (l *serverToolLedger) accept(block Object, r *Request, historical ...bool) error {
	kind := str(block, "type")
	past := len(historical) > 0 && historical[0]
	if err := l.ptc.assistant(block); err != nil {
		return err
	}
	if kind == "mcp_tool_listing" {
		if !past && (!r.MCP.hasServer(str(block, "mcp_server_name")) || !hasBetaHeader(r.Betas, mcpListingBeta)) {
			return fmt.Errorf("undeclared MCP listing server or missing listing beta")
		}
		return r.acceptMCPListing(block, l.mcpSearchTimeline(r))
	}
	if kind == "mcp_tool_use" {
		id, server := str(block, "id"), str(block, "server_name")
		allowed := r.MCP.permitsCall(server, str(block, "name")) || l.mcpLoaded[mcpSearchIdentity{server, str(block, "name")}]
		if r.dynamicMCPListing() {
			state := l.mcpSearchTimeline(r).current[server]
			allowed = state.permits(str(block, "name")) || state.searchable(str(block, "name")) && l.mcpLoaded[mcpSearchIdentity{server, str(block, "name")}]
		}
		if id == "" || l.seen[id] || !past && (r.NoTools || !allowed) {
			return fmt.Errorf("duplicate or undeclared MCP tool call")
		}
		l.seen[id] = true
		l.mcpServers[id] = server
		l.pending[id] = "mcp_tool_result"
		l.turnCalls[id] = true
		return nil
	}
	if kind == "fallback" {
		// Only calls begun in this response segment are abandoned. A pending
		// operation carried from an earlier client turn remains outstanding.
		for id := range l.turnCalls {
			delete(l.pending, id)
		}
		l.beginTurn()
		return nil
	}
	if kind == "server_tool_use" {
		id, name := str(block, "id"), str(block, "name")
		if id == "" || l.seen[id] || serverResultType(name) == "" || !past && !r.hasServerSearch(name) {
			return fmt.Errorf("duplicate or undeclared server tool call")
		}
		l.seen[id] = true
		l.names[id] = name
		l.pending[id] = serverResultType(name)
		l.turnCalls[id] = true
		return nil
	}
	if kind != "tool_search_tool_result" && kind != "web_search_tool_result" && kind != "web_fetch_tool_result" && kind != "advisor_tool_result" && kind != "mcp_tool_result" && !codeExecutionResult(kind) {
		return nil
	}
	id := str(block, "tool_use_id")
	if l.pending[id] != kind {
		return fmt.Errorf("server result has no matching outstanding call")
	}
	if kind == "tool_search_tool_result" && !past {
		identities, err := r.mcpSearchDiscoveries(block, l.mcpSearchTimeline(r))
		if err != nil {
			return err
		}
		if l.mcpLoaded == nil {
			l.mcpLoaded = map[mcpSearchIdentity]bool{}
		}
		for _, identity := range identities {
			l.mcpLoaded[identity] = true
		}
	}
	delete(l.pending, id)
	return nil
}

func (r *Request) serverHistoryLedger() (*serverToolLedger, error) {
	ledger := newServerToolLedger()
	for _, message := range r.Messages {
		if message.Role == "assistant" {
			ledger.beginTurn()
		}
		if message.Role == "user" {
			if err := ledger.ptc.user(message.Content); err != nil {
				return nil, err
			}
		}
		for _, block := range message.Content {
			if err := ledger.accept(block, r, true); err != nil {
				return nil, err
			}
		}
	}
	if r.verifiedCreditEcho() {
		ledger.abandonCurrentTurn()
	}
	err := ledger.validatePendingDefinitions(r)
	ledger.beginTurn()
	return ledger, err
}

func (l *serverToolLedger) abandonCurrentTurn() {
	for id := range l.turnCalls {
		delete(l.pending, id)
	}
	_ = l.ptc.assistant(Object{"type": "fallback"})
	l.beginTurn()
}

func (l *serverToolLedger) beginTurn() {
	l.turnCalls = map[string]bool{}
	l.ptc.beginTurn()
}

func (l *serverToolLedger) validatePendingDefinitions(r *Request) error {
	for id := range l.pending {
		if l.pending[id] == "mcp_tool_result" {
			if !r.MCP.hasServer(l.mcpServers[id]) {
				return fmt.Errorf("pending MCP tool requires its server definition")
			}
			continue
		}
		if !r.hasServerSearch(l.names[id]) {
			return fmt.Errorf("pending server tool requires its definition")
		}
	}
	return nil
}

func (l *serverToolLedger) complete(stop string, clientTool bool) error {
	if len(l.pending) == 0 || stop == "pause_turn" || stop == "tool_use" && clientTool {
		return nil
	}
	return fmt.Errorf("completed response is missing a server tool result")
}
