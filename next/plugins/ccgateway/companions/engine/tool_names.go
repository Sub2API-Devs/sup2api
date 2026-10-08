package engine

import (
	"fmt"
	"regexp"
	"strings"
)

var customToolPrefix = regexp.MustCompile(`^[A-Za-z0-9_-]{1,32}$`)

func (r *Request) customToolServer() string {
	if r.CustomToolPrefix == "" {
		return "ccgateway"
	}
	return r.CustomToolPrefix
}

// toolServer returns the effective namespace used for mapping non-MCP tools.
// This may differ from customToolServer() when conflicts are detected.
func (r *Request) toolServer() string {
	if r.MCP != nil {
		return r.effectiveToolServer()
	}
	return r.customToolServer()
}

// Namespace changes cannot resume a JSONL containing the previous wire names.
// Preserve the existing default cache keys for backwards compatibility.
func (r *Request) toolHistoryNamespace() string {
	base := r.baseToolHistoryNamespace()
	if len(r.ServerTools) > 0 || len(r.toolMetadataKey()) > 0 {
		base = digest([]any{"api-tool-policy-v1", base, r.ServerTools, r.toolMetadataKey()})
	}
	if len(r.completedClientHistory) > 0 {
		base = digest([]any{"completed-client-history-v1", base})
	}
	if r.Plan != nil && len(r.Plan.taskBudget) > 0 && r.forcedLoadedClientCatalog() {
		base = digest([]any{"zero-helper-task-budget-v1", base})
	}
	return base
}

func (r *Request) baseToolHistoryNamespace() string {
	effective := r.toolServer()
	if r.AttachmentSource == "" && len(r.AttachmentSources) == 0 && r.UnknownClientAttachment == "" && r.UnknownGatewayAttachment == "" {
		if effective == "ccgateway" {
			return ""
		}
		return "tools:" + effective
	}
	return digest([]any{"attachment-policy-v2", effective, r.attachmentConfig()})
}

// Validate after native-tool selection: a selected native Read stays Read,
// while an ordinary custom Read occupies mcp__ccgateway__Read instead.
func validateToolNames(r *Request) error {
	seen := make(map[string]bool, len(r.Tools))
	for _, tool := range r.Tools {
		name := r.wireName(tool.Name)
		if seen[name] {
			return fmt.Errorf("tool definitions map to the same upstream name")
		}
		seen[name] = true
	}
	return nil
}

// A qualified MCP name splits at the first separator after mcp__. Tool names
// may themselves contain __. Incomplete lookalikes remain ordinary custom
// tools and receive the gateway's namespace when mapped to an upstream name.
func splitMCPToolName(name string) (server, tool string, ok bool) {
	if !toolName.MatchString(name) {
		return "", "", false
	}
	rest, found := strings.CutPrefix(name, "mcp__")
	if !found {
		return "", "", false
	}
	server, tool, found = strings.Cut(rest, "__")
	if !found || !toolName.MatchString(server) || !toolName.MatchString(tool) {
		return "", "", false
	}
	return server, tool, true
}
