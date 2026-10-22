package features

import (
	"fmt"
	"slices"
)

// BuildInjectionCapability: build gives a request without a billing header
// (one that is not Claude Code's) the chosen layers of Claude Code's own:
// its system prompt, its first-turn attachments and its tools by name, all
// rendered by the CLI (2026-10-23: only the billing header is required, every
// other layer is the console's choice).
const BuildInjectionCapability = "build_injection_v1"

// InjectionAttachments are the first-turn attachments build may add, in the
// order Claude Code sends them: the environment, the model identity, the token
// budget and the date. The CLI makes and places each (system turn or reminder,
// per model); none is copied anywhere else.
var InjectionAttachments = []string{"environment", "model", "total_tokens", "date"}

// InjectionTools are Claude Code 2.1.304's own tools a request may be given
// (the CLI's tool pool, getTools, in a Worker), in its order. The CLI refuses
// a name it does not have. A tool the model calls goes back to the client like
// any other.
var InjectionTools = []string{"Agent", "Bash", "Read", "Edit", "Write", "NotebookEdit", "ReportFindings", "WebSearch", "TaskStop", "Skill",
	"EnterWorktree", "ExitWorktree", "SendMessage", "ListAgents", "Workflow", "CronCreate", "CronDelete", "CronList", "ScheduleWakeup", "ToolSearch"}

// BuildInjection is what a request without a billing header is given. Every
// choice is optional and inherits on its own when omitted: the system prompt,
// and each attachment and tool by name (true adds it, false does not).
type BuildInjection struct {
	SystemPrompt *bool          `json:"system_prompt,omitempty"`
	Attachments  map[string]bool `json:"attachments,omitempty"`
	Tools        map[string]bool `json:"tools,omitempty"`
}

func (p *BuildInjection) Validate() error {
	if p == nil {
		return nil
	}
	for name := range p.Attachments {
		if !slices.Contains(InjectionAttachments, name) {
			return fmt.Errorf("invalid build_injection.attachments: %s", name)
		}
	}
	for name := range p.Tools {
		if !slices.Contains(InjectionTools, name) {
			return fmt.Errorf("invalid build_injection.tools: %s", name)
		}
	}
	return nil
}

// Merge applies child's choices over p, returning a new value.
func (p *BuildInjection) Merge(child *BuildInjection) *BuildInjection {
	if p == nil && child == nil {
		return nil
	}
	out := &BuildInjection{}
	for _, layer := range []*BuildInjection{p, child} {
		if layer == nil {
			continue
		}
		if layer.SystemPrompt != nil {
			value := *layer.SystemPrompt
			out.SystemPrompt = &value
		}
		for name, on := range layer.Attachments {
			if out.Attachments == nil {
				out.Attachments = map[string]bool{}
			}
			out.Attachments[name] = on
		}
		for name, on := range layer.Tools {
			if out.Tools == nil {
				out.Tools = map[string]bool{}
			}
			out.Tools[name] = on
		}
	}
	return out
}

// Effective keeps only what is added; nil means nothing is.
func (p *BuildInjection) Effective() *BuildInjection {
	if p == nil {
		return nil
	}
	out := &BuildInjection{}
	if p.SystemPrompt != nil && *p.SystemPrompt {
		value := true
		out.SystemPrompt = &value
	}
	for _, list := range []struct {
		from map[string]bool
		to   *map[string]bool
	}{{p.Attachments, &out.Attachments}, {p.Tools, &out.Tools}} {
		for name, on := range list.from {
			if on {
				if *list.to == nil {
					*list.to = map[string]bool{}
				}
				(*list.to)[name] = true
			}
		}
	}
	if out.SystemPrompt == nil && out.Attachments == nil && out.Tools == nil {
		return nil
	}
	return out
}

// Added lists what is added, attachments and tools in Claude Code's order:
// the form the CLI takes.
func (p *BuildInjection) Added() (systemPrompt bool, attachments, tools []string) {
	p = p.Effective()
	if p == nil {
		return false, nil, nil
	}
	for _, name := range InjectionAttachments {
		if p.Attachments[name] {
			attachments = append(attachments, name)
		}
	}
	for _, name := range InjectionTools {
		if p.Tools[name] {
			tools = append(tools, name)
		}
	}
	return p.SystemPrompt != nil, attachments, tools
}
