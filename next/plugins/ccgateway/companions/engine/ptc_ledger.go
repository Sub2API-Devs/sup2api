package engine

import "fmt"

// This ledger validates protocol causality only. Core independently binds each
// paused parent ID to its real issuer/container before accepting a continuation.
type ptcLedger struct {
	turnParents    map[string]bool
	parents        map[string]bool
	children       map[string]string
	serverChildren map[string]string
	direct         map[string]bool
	seen           map[string]bool
}

func newPTCLedger() *ptcLedger {
	return &ptcLedger{turnParents: map[string]bool{}, parents: map[string]bool{}, children: map[string]string{}, serverChildren: map[string]string{}, direct: map[string]bool{}, seen: map[string]bool{}}
}
func (l *ptcLedger) assistant(block Object) error {
	kind, id := str(block, "type"), str(block, "id")
	if kind == "fallback" {
		for parent := range l.turnParents {
			delete(l.parents, parent)
			for child, p := range l.children {
				if p == parent {
					delete(l.children, child)
				}
			}
			for child, p := range l.serverChildren {
				if p == parent {
					delete(l.serverChildren, child)
				}
			}
		}
		l.beginTurn()
	}
	if err := l.serverCaller(block); err != nil {
		return err
	}
	if kind == "server_tool_use" && str(block, "name") == "code_execution" {
		if id == "" || l.seen[id] {
			return fmt.Errorf("duplicate programmatic execution parent")
		}
		l.seen[id] = true
		l.parents[id] = true
		l.turnParents[id] = true
		return nil
	}
	if kind == "tool_use" {
		caller, _ := block["caller"].(Object)
		if caller == nil || str(caller, "type") == "direct" {
			if id == "" || l.seen[id] {
				return fmt.Errorf("duplicate client tool ID")
			}
			l.seen[id] = true
			l.direct[id] = true
			return nil
		}
		if err := checkProviderCaller(caller); err != nil {
			return err
		}
		parent := str(caller, "tool_id")
		if !l.parents[parent] || id == "" || l.seen[id] {
			return fmt.Errorf("programmatic call has no live execution parent or repeats an ID")
		}
		l.seen[id] = true
		l.children[id] = parent
	}
	if kind == "code_execution_tool_result" {
		parent := str(block, "tool_use_id")
		if !l.parents[parent] {
			return fmt.Errorf("programmatic result has no matching execution")
		}
		for _, pending := range l.children {
			if pending == parent {
				return fmt.Errorf("execution completed before its client tool results")
			}
		}
		for _, pending := range l.serverChildren {
			if pending == parent {
				return fmt.Errorf("execution completed before its server tool results")
			}
		}
		delete(l.parents, parent)
	}
	return nil
}

// Dynamic filtering emits provider-side children in the assistant stream. They
// are not client tool_result obligations, but still belong to a live parent.
func (l *ptcLedger) serverCaller(block Object) error {
	kind := str(block, "type")
	if kind != "server_tool_use" && kind != "web_search_tool_result" && kind != "web_fetch_tool_result" {
		return nil
	}
	caller, exists := block["caller"]
	parent := ""
	if exists {
		if err := checkProviderCaller(caller); err != nil {
			return err
		}
		obj, _ := caller.(Object)
		if str(obj, "type") != "direct" {
			parent = str(obj, "tool_id")
		}
	}
	if kind == "server_tool_use" {
		if parent == "" {
			return nil
		}
		id := str(block, "id")
		if !l.parents[parent] || id == "" || l.seen[id] {
			return fmt.Errorf("programmatic server call has no live execution parent or repeats an ID")
		}
		l.serverChildren[id] = parent
		l.seen[id] = true
		return nil
	}
	id := str(block, "tool_use_id")
	if expected := l.serverChildren[id]; expected != parent {
		return fmt.Errorf("server result caller differs from its invocation")
	}
	delete(l.serverChildren, id)
	return nil
}
func (l *ptcLedger) user(blocks []Object) error {
	if len(l.children) == 0 {
		for _, block := range blocks {
			if str(block, "type") == "tool_result" {
				delete(l.direct, str(block, "tool_use_id"))
			}
		}
		return nil
	}
	pending := map[string]bool{}
	var completedDirect []string
	for id := range l.children {
		pending[id] = true
	}
	for _, block := range blocks {
		if str(block, "type") != "tool_result" {
			return fmt.Errorf("programmatic continuation user messages contain only tool results")
		}
		id := str(block, "tool_use_id")
		if !pending[id] {
			if l.direct[id] {
				for _, seen := range completedDirect {
					if seen == id {
						return fmt.Errorf("duplicate direct tool result in programmatic continuation")
					}
				}
				completedDirect = append(completedDirect, id)
				continue
			}
			return fmt.Errorf("programmatic continuation has an unexpected or duplicate result")
		}
		switch value := block["content"].(type) {
		case string:
		case []Object:
			for _, part := range value {
				if str(part, "type") != "text" {
					return fmt.Errorf("programmatic tool results must be text only")
				}
			}
		case []any:
			for _, value := range value {
				part, ok := value.(Object)
				if !ok || str(part, "type") != "text" {
					return fmt.Errorf("programmatic tool results must be text only")
				}
			}
		default:
			return fmt.Errorf("programmatic result requires text content")
		}
		delete(pending, id)
	}
	if len(pending) != 0 {
		return fmt.Errorf("programmatic continuation must return all pending tool results together")
	}
	l.children = map[string]string{}
	for _, id := range completedDirect {
		delete(l.direct, id)
	}
	return nil
}

func (l *ptcLedger) beginTurn() { l.turnParents = map[string]bool{} }
