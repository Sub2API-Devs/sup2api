package engine

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// Claude Code's tools-used header (features.ToolsUsedHeader,
// SESSION-MEMORY-TOOLS-USED-DESIGN.md §4.3–4.6). The CLI writes it with
// Claude Code's own code; the Worker only keeps the session's set:
//
//   - a request of a session the client names (as for the thread memory,
//     attachSessionState) reads the set (loadTools) and hands it to the CLI
//     with the client's own value, if it sent a valid one;
//   - its answer adds what the CLI reports it used and the tool calls the
//     answer makes (mergeTools), in that order.

// requestTools is one request's part in its session's tools-used set.
type requestTools struct {
	session string
	// memory is the set as the request found it.
	memory []string
	// client are the names of the client's own header value.
	client []string
	// kept: the answer's names were merged (once).
	kept bool
	// sideQuery: the request is one of Claude Code's side queries (WebSearch's
	// own search, a title, a summary), whose answer is not the conversation's:
	// Claude Code records the server and MCP tool calls of its query loop
	// only (main thread and subagents), so the answer's calls are not kept.
	sideQuery bool
}

// planToolsUsed says whether the request reads and adds to its session's
// set: a Messages request of a session the client names, for a CLI with
// features.ToolsUsedCapability. Console tests are the gateway's own.
func (g *Gateway) planToolsUsed(p *requestPlan, body *requestBody) bool {
	if p.probe || p.count || p.agent == nil || !g.CLIInfo.supports(features.ToolsUsedCapability) || p.identity == nil || !p.identity.named || p.identity.Session == "" {
		return false
	}
	p.tools = &requestTools{session: p.identity.Session, sideQuery: sideQuery(p.agent, body)}
	return true
}

// sideQuery says whether a request is a Claude Code side query: the client
// names it auxiliary, or, naming no class (the third-party shape), it offers
// tools and none of them is a client tool (WebSearch's search offers only the
// web_search server tool; the query loop always offers client tools).
func sideQuery(agent *requestAgent, body *requestBody) bool {
	if class, ok := agent.Client["request_class"]; ok {
		return class == "auxiliary"
	}
	if body == nil || body.top == nil {
		return false
	}
	var tools []struct {
		Type string `json:"type"`
	}
	if json.Unmarshal(body.top["tools"], &tools) != nil || len(tools) == 0 {
		return false
	}
	for _, t := range tools {
		if t.Type == "" || t.Type == "custom" {
			return false
		}
	}
	return true
}

// attachToolsUsed gives the CLI the request's tools_used: for a CLI with the
// capability, on every request with an agent context (Messages requests that
// are not console tests). The client's value goes as it came when it has
// the header's shape; the memory, up to toolsUsedMax names, the last of them
// the stand-in when it had more.
func (g *Gateway) attachToolsUsed(p *requestPlan, h http.Header) {
	if p.agent == nil || p.count || p.probe || !g.CLIInfo.supports(features.ToolsUsedCapability) {
		return
	}
	tools := &requestToolsUsed{}
	if value := h.Get(features.ToolsUsedHeader); value != "" {
		if features.ValidToolsUsed(value) {
			tools.Client = value
			if p.tools != nil {
				p.tools.client = features.ToolsUsedNames(value)
			}
		} else {
			p.diagnostic.trace("tools_used_client_invalid", Object{"bytes": len(value)})
		}
	}
	if p.tools != nil && len(p.tools.memory) > 0 {
		tools.Memory = memoryForCLI(p.tools.memory)
	}
	p.agent.ToolsUsed = tools
}

// memoryForCLI is the memory as the CLI is given it: valid names, at most
// toolsUsedMax, the last the stand-in when some were cut (Claude Code's own
// cut, features.ToolsUsedUnreadable).
func memoryForCLI(names []string) []string {
	out := make([]string, 0, min(len(names), toolsUsedMax))
	seen := make(map[string]bool, len(names))
	for _, name := range names {
		if !validToolName(name) {
			name = features.ToolsUsedUnreadable
		}
		if seen[name] {
			continue
		}
		if len(out) == toolsUsedMax {
			out[toolsUsedMax-1] = features.ToolsUsedUnreadable
			break
		}
		seen[name] = true
		out = append(out, name)
	}
	return out
}

// rememberToolsUsed adds what the request leaves to its session's set, once:
// the names the CLI reports it used (they include the client's), the
// client's (when the CLI could not report), then the tool calls the answer
// made that the Worker read in full (not a side query's). A failed request keeps what the CLI
// reports: Claude Code records a tool before it sends the next request.
// It runs when the answer has ended, before its last bytes reach the client
// (the conversation's next request reads the set), else when the CLI has
// finished.
func (g *Gateway) rememberToolsUsed(p *requestPlan, o *requestCommandOutput) {
	t := p.tools
	if t == nil || t.kept {
		return
	}
	t.kept = true
	// The metadata as the answer started, else as the CLI left it.
	if !o.toolsRead || len(o.toolsReported) == 0 {
		o.toolsReported, o.toolsRead = readToolsReport(o.meta), true
	}
	names := append(append([]string{}, o.toolsReported...), t.client...)
	if !t.sideQuery {
		names = append(names, o.observer.toolNames()...)
	}
	_, toolsTTL := memoryTTLs(p.memory)
	_ = g.sessionStates.backing().mergeTools(withStoreReport(context.Background(), p.diagnostic), t.session, toolNames(names), toolsTTL)
}

// readToolsReport is the tools_used the CLI wrote into its response
// metadata (nil when it wrote none).
func readToolsReport(meta string) []string {
	if meta == "" {
		return nil
	}
	raw, err := os.ReadFile(meta)
	if err != nil {
		return nil
	}
	var report struct {
		ToolsUsed []string `json:"tools_used"`
	}
	if json.Unmarshal(raw, &report) != nil {
		return nil
	}
	return reportedTools(report.ToolsUsed)
}

// reportedTools are the CLI's reported names as the set keeps them (each
// valid, or the stand-in), at most toolsUsedMax.
func reportedTools(names []string) []string {
	if len(names) == 0 {
		return nil
	}
	return toolNames(names)
}
