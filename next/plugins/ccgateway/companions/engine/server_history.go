package engine

import "fmt"

// A mixed server/client turn may pause server execution until the client's
// tool_result arrives. IDs and result kinds remain bound across those turns.
type serverToolLedger struct {
	pending   map[string]string
	seen      map[string]bool
	names     map[string]string
	turnCalls map[string]bool
}

func newServerToolLedger() *serverToolLedger {
	return &serverToolLedger{pending: map[string]string{}, seen: map[string]bool{}, names: map[string]string{}, turnCalls: map[string]bool{}}
}

func (l *serverToolLedger) accept(block Object, r *Request, historical ...bool) error {
	kind := str(block, "type")
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
		past := len(historical) > 0 && historical[0]
		if id == "" || l.seen[id] || serverResultType(name) == "" || !past && !r.hasServerSearch(name) {
			return fmt.Errorf("duplicate or undeclared server tool call")
		}
		l.seen[id] = true
		l.names[id] = name
		l.pending[id] = serverResultType(name)
		l.turnCalls[id] = true
		return nil
	}
	if kind != "tool_search_tool_result" && kind != "web_search_tool_result" && kind != "web_fetch_tool_result" && kind != "advisor_tool_result" {
		return nil
	}
	id := str(block, "tool_use_id")
	if l.pending[id] != kind {
		return fmt.Errorf("server result has no matching outstanding call")
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
		for _, block := range message.Content {
			if err := ledger.accept(block, r, true); err != nil {
				return nil, err
			}
		}
	}
	err := ledger.validatePendingDefinitions(r)
	ledger.beginTurn()
	return ledger, err
}

func (l *serverToolLedger) beginTurn() { l.turnCalls = map[string]bool{} }

func (l *serverToolLedger) validatePendingDefinitions(r *Request) error {
	for id := range l.pending {
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
