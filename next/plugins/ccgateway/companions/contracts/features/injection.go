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

// BuildInjectionToolsV2Capability: the CLI can render InjectionToolsV2
// (2026-11-02). A CLI without it (2.1.312 v41 and earlier, kept on accounts
// that are not upgraded) refuses a tool name it does not have, so the core
// never sends these names to such an account: it drops them from the
// injection and sends the rest unchanged (WithoutToolsV2), and the Worker
// refuses them as a second line.
const BuildInjectionToolsV2Capability = "build_injection_tools_v2"

// InjectionAttachments are the first-turn attachments build may add, in the
// order Claude Code sends them: the environment, the model identity, the token
// budget and the date. The CLI makes and places each (system turn or reminder,
// per model); none is copied anywhere else.
var InjectionAttachments = []string{"environment", "model", "total_tokens", "date"}

// InjectionToolsV2 are the tools official Claude Code 2.1.316 sends with
// their full definitions on a session's first turn beyond Bash, Read, Edit,
// Write and Agent (2026-11-02 user), in the order it sends them (by name).
// Each is a choice at high, off unless chosen, and needs
// BuildInjectionToolsV2Capability.
var InjectionToolsV2 = []string{"ListAgents", "ReportFindings", "ScheduleWakeup", "Skill", "ToolSearch", "Workflow"}

// InjectionTools are the Claude Code tools a request may be given, in console
// order: the ones high adds without a choice (DefaultInjectionTools), Agent
// and InjectionToolsV2 (with those, every tool official 2.1.316 sends on a
// session's first turn), then WebSearch and NotebookEdit, which it does not
// send there. Injecting a tool only carries its definition (2026-11-02 user:
// "工具注入不代表我们需要实现 只是带上定义而已"): a tool the model calls goes
// back to the client like any other, and the session state some of them read
// (the agent types, skills and deferred tools listings) is not added. The CLI
// renders every definition from its own tool pool as Claude Code would and
// sends the chosen ones in Claude Code's order, refusing a name it does not
// have; with ToolSearch, the tools Claude Code defers (WebSearch,
// NotebookEdit) are not sent, and its deferred placeholder is.
var InjectionTools = slices.Concat(DefaultInjectionTools, []string{"Agent"}, InjectionToolsV2, []string{"WebSearch", "NotebookEdit"})

// BuildInjection is what a request without a billing header is given. Every
// choice is optional and inherits on its own when omitted: the system prompt,
// and each attachment and tool by name (true adds it, false does not).
type BuildInjection struct {
	SystemPrompt *bool           `json:"system_prompt,omitempty"`
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

// Added lists what is added, attachments in Claude Code's order and tools in
// console order (the CLI orders them as Claude Code does).
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

// UsesToolsV2 says whether p adds a tool of InjectionToolsV2.
func (p *BuildInjection) UsesToolsV2() bool {
	if p == nil {
		return false
	}
	for _, name := range InjectionToolsV2 {
		if p.Tools[name] {
			return true
		}
	}
	return false
}

// WithoutToolsV2 is what p adds without the tools of InjectionToolsV2, for a
// CLI without BuildInjectionToolsV2Capability: the system prompt, the
// attachments and the other tools stay as they are. p is not changed; nil
// when nothing remains.
func (p *BuildInjection) WithoutToolsV2() *BuildInjection {
	out := p.Merge(nil)
	if out == nil {
		return nil
	}
	for _, name := range InjectionToolsV2 {
		delete(out.Tools, name)
	}
	return out.Effective()
}
