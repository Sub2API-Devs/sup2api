package engine

// Group client system messages for native CLI configuration and diagnostics.
// Claude Code owns their rendering as system-role attachments; the gateway
// does not rewrite the resulting model request.

type systemGroup struct {
	Turn      int        // client assistants before the group
	Origin    int        // client array index of the group's first message
	Messages  [][]string // text blocks of each client system message
	Originals []Message  // exact client protocol metadata and block boundaries
}

func (r *Request) systemGroups() []systemGroup {
	var out []systemGroup
	turn, lastUser := 0, r.lastUserMessage()
	for i := 0; i < len(r.Messages); i++ {
		switch r.Messages[i].Role {
		case "assistant":
			turn++
		case "system":
			g := systemGroup{Turn: turn, Origin: i}
			if i < len(r.origin) {
				g.Origin = r.origin[i]
			}
			for ; i < len(r.Messages) && r.Messages[i].Role == "system"; i++ {
				if r.Messages[i].directiveOnly() || r.Messages[i].turnScoped() && i < lastUser {
					continue
				}
				g.Messages = append(g.Messages, systemTexts(r.Messages[i]))
				g.Originals = append(g.Originals, r.Messages[i])
			}
			i--
			if len(g.Messages) > 0 {
				out = append(out, g)
			}
		}
	}
	return out
}

// Internal discovery rounds stay in native history and on the wire; they are
// not client turns.
func internalAssistant(m Object) bool {
	blocks, _ := m["content"].([]any)
	for _, value := range blocks {
		if b, ok := value.(map[string]any); ok && str(b, "type") == "tool_use" && str(b, "name") == "ToolSearch" {
			return true
		}
	}
	return false
}
