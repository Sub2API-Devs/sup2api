package engine

import (
	"encoding/json"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const mcpConnectorBeta = "mcp-client-2025-11-20"
const mcpListingBeta = "mcp-client-2026-09-15"

// MCPConnectorPlan is deliberately not serializable. Public configuration and
// credentials have separate storage; no CLI configuration receives either.
type MCPConnectorPlan struct {
	servers     []Object
	toolsets    []Object
	catalog     []Object
	credentials map[string]mcpCredential
}

func (p *MCPConnectorPlan) stripLocalRequest(o Object) {
	delete(o, "mcp_servers")
	tools, _ := o["tools"].([]any)
	p.catalog, _ = historyContent(o["tools"])
	var local []any
	for _, value := range tools {
		tool, _ := value.(map[string]any)
		if str(tool, "type") != "mcp_toolset" {
			local = append(local, value)
		}
	}
	if len(local) == 0 {
		delete(o, "tools")
	} else {
		o["tools"] = local
	}
}

func (p *MCPConnectorPlan) safeRaw(o Object) []byte {
	copy, _ := decodeObject(mustMCPJSON(o))
	copy["mcp_servers"] = p.servers
	return mustMCPJSON(copy)
}

func (r *Request) applyMCPConnector(body Object) error {
	if r.MCP == nil {
		return nil
	}
	servers, err := r.MCP.wireServers()
	if err != nil {
		return err
	}
	body["mcp_servers"] = servers
	tools, err := historyContent(body["tools"])
	if body["tools"] != nil && err != nil {
		return err
	}
	for _, toolset := range r.MCP.toolsets {
		copy, _ := decodeObject(mustMCPJSON(toolset))
		tools = append(tools, copy)
	}
	byIdentity := map[string]Object{}
	for _, tool := range tools {
		name := mcpCatalogIdentity(tool)
		if byIdentity[name] != nil {
			return fmt.Errorf("MCP catalog has duplicate wire identity")
		}
		byIdentity[name] = tool
	}
	var ordered []Object
	for _, tool := range r.MCP.catalog {
		name := mcpCatalogIdentity(tool)
		if str(tool, "type") == "" || str(tool, "type") == "custom" {
			name = r.wireName(str(tool, "name"))
		}
		actual := byIdentity[name]
		if actual == nil {
			return fmt.Errorf("MCP combined catalog lost a declared tool")
		}
		ordered = append(ordered, actual)
		delete(byIdentity, name)
	}
	if len(byIdentity) > 0 {
		return fmt.Errorf("MCP combined catalog contains an unexpected tool")
	}
	body["tools"] = ordered
	return nil
}

func mcpCatalogIdentity(tool Object) string {
	if str(tool, "type") == "mcp_toolset" {
		return "mcp:" + str(tool, "mcp_server_name")
	}
	return apiToolName(tool)
}

func (p *MCPConnectorPlan) hasServer(name string) bool {
	if p == nil {
		return false
	}
	for _, server := range p.servers {
		if str(server, "name") == name {
			return true
		}
	}
	return false
}

func (r *Request) validateMCPConfiguration() error {
	if r.MCP != nil && r.InlineTools != nil {
		return fmt.Errorf("MCP connector with inline tool changes requires a server-scoped secret timeline")
	}
	if r.MCP != nil && r.Plan != nil && len(r.Plan.fields["safeguards"]) > 0 {
		return fmt.Errorf("MCP connector with safeguards requires server-scoped classifier identity adaptation")
	}
	if r.MCP != nil {
		for _, tool := range r.ServerTools {
			if strings.HasPrefix(str(tool, "type"), "tool_search_tool_") {
				return fmt.Errorf("MCP connector with tool search requires verified cross-server tool_reference identity encoding")
			}
		}
	}
	for _, message := range r.Messages {
		for _, block := range message.Content {
			kind := str(block, "type")
			if kind != "mcp_tool_use" && kind != "mcp_tool_result" && kind != "mcp_tool_listing" {
				continue
			}
			if !hasBetaHeader(r.Betas, mcpConnectorBeta) && !hasBetaHeader(r.Betas, mcpListingBeta) {
				return fmt.Errorf("MCP history requires a connector beta")
			}
			if kind == "mcp_tool_listing" && !hasBetaHeader(r.Betas, mcpListingBeta) {
				return fmt.Errorf("MCP listing history requires mcp-client-2026-09-15")
			}
		}
	}
	_, err := r.serverHistoryLedger()
	return err
}

type mcpCredential struct{ url, token string }

func mustMCPJSON(value any) []byte { raw, _ := json.Marshal(value); return raw }

func validateMCPURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.Fragment != "" {
		return fmt.Errorf("MCP server URL must be HTTPS with a hostname and no userinfo or fragment")
	}
	host := strings.ToLower(strings.TrimSuffix(u.Hostname(), "."))
	if port := u.Port(); port != "" {
		n, err := strconv.Atoi(port)
		if err != nil || n < 1 || n > 65535 {
			return fmt.Errorf("MCP URL has an invalid port")
		}
	}
	if ip := net.ParseIP(host); ip != nil {
		if !ip.IsGlobalUnicast() || ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() {
			return fmt.Errorf("MCP server URL must not address a local network")
		}
		return nil
	}
	numeric := true
	for _, c := range host {
		if c != '.' && (c < '0' || c > '9') {
			numeric = false
			break
		}
	}
	if numeric || !strings.Contains(host, ".") || strings.HasSuffix(host, ".localhost") || strings.HasSuffix(host, ".local") || strings.HasSuffix(host, ".internal") || strings.HasSuffix(host, ".localdomain") || strings.ContainsAny(host, "\\% \t\r\n") {
		return fmt.Errorf("MCP server URL requires a public hostname")
	}
	return nil
}

func parseMCPConnector(o Object, betas []string) (*MCPConnectorPlan, error) {
	if hasBetaHeader(betas, "mcp-client-2025-04-04") {
		return nil, fmt.Errorf("deprecated MCP connector beta 2025-04-04 is not supported; use a current connector schema")
	}
	value, exists := o["mcp_servers"]
	if !exists {
		return nil, nil
	}
	listing := hasBetaHeader(betas, mcpListingBeta)
	if !listing && !hasBetaHeader(betas, mcpConnectorBeta) {
		return nil, fmt.Errorf("MCP connector requires mcp-client-2025-11-20 or mcp-client-2026-09-15")
	}
	servers, ok := value.([]any)
	if !ok || len(servers) == 0 {
		return nil, fmt.Errorf("mcp_servers must be a nonempty array")
	}
	p := &MCPConnectorPlan{credentials: map[string]mcpCredential{}}
	seen := map[string]bool{}
	for _, value := range servers {
		s, ok := value.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("MCP server must be an object")
		}
		if err := keys(s, "type", "name", "url", "authorization_token"); err != nil {
			return nil, err
		}
		name, address := str(s, "name"), str(s, "url")
		if str(s, "type") != "url" || name == "" || seen[name] {
			return nil, fmt.Errorf("MCP server requires a unique name and type url")
		}
		if err := validateMCPURL(address); err != nil {
			return nil, err
		}
		seen[name] = true
		public := Object{"type": "url", "name": name, "url": address}
		if token, exists := s["authorization_token"]; exists {
			if token == nil {
				public["authorization_token"] = nil
			} else {
				text, ok := token.(string)
				if !ok {
					return nil, fmt.Errorf("MCP authorization_token must be a string or null")
				}
				if len(text) > 64<<10 {
					return nil, fmt.Errorf("MCP authorization_token exceeds the 64 KiB credential isolation limit")
				}
				p.credentials[name] = mcpCredential{address, text}
			}
		}
		p.servers = append(p.servers, public)
	}
	tools, _ := o["tools"].([]any)
	used := map[string]bool{}
	for _, value := range tools {
		t, ok := value.(map[string]any)
		if !ok || str(t, "type") != "mcp_toolset" {
			continue
		}
		name := str(t, "mcp_server_name")
		if !seen[name] || used[name] {
			return nil, fmt.Errorf("each MCP server requires exactly one matching toolset")
		}
		if err := checkMCPToolset(t, listing); err != nil {
			return nil, err
		}
		used[name] = true
		copy, _ := decodeObject(mustMCPJSON(t))
		p.toolsets = append(p.toolsets, copy)
	}
	if len(used) != len(seen) {
		return nil, fmt.Errorf("each MCP server requires exactly one matching toolset")
	}
	return p, nil
}

func checkMCPToolset(t Object, listing bool) error {
	if err := keys(t, "type", "mcp_server_name", "default_config", "configs", "cache_control", "tools"); err != nil {
		return err
	}
	if v, ok := t["default_config"]; ok {
		if err := checkMCPConfig(v); err != nil {
			return err
		}
	}
	if v, ok := t["configs"]; ok && v != nil {
		configs, ok := v.(map[string]any)
		if !ok {
			return fmt.Errorf("MCP configs must be an object or null")
		}
		for _, config := range configs {
			if err := checkMCPConfig(config); err != nil {
				return err
			}
		}
	}
	if v, ok := t["tools"]; ok {
		if !listing {
			return fmt.Errorf("pinned MCP tools require mcp-client-2026-09-15")
		}
		if v != nil {
			return checkMCPListing(v)
		}
	}
	return nil
}

func checkMCPConfig(value any) error {
	c, ok := value.(map[string]any)
	if !ok {
		return fmt.Errorf("MCP tool configuration must be an object")
	}
	if err := keys(c, "enabled", "defer_loading"); err != nil {
		return err
	}
	for _, value := range c {
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("MCP tool configuration flags must be booleans")
		}
	}
	return nil
}

func checkMCPListing(value any) error {
	tools, ok := value.([]any)
	if !ok {
		return fmt.Errorf("MCP listing tools must be an array")
	}
	seen := map[string]bool{}
	for _, value := range tools {
		t, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("MCP listed tool must be an object")
		}
		if err := keys(t, "name", "description", "input_schema"); err != nil {
			return err
		}
		name := str(t, "name")
		if name == "" || seen[name] {
			return fmt.Errorf("MCP listed tool names must be nonempty and unique within a server")
		}
		seen[name] = true
		if _, ok := t["input_schema"].(map[string]any); !ok {
			return fmt.Errorf("MCP listed tool requires an input_schema object")
		}
		if v, ok := t["description"]; ok && v != nil {
			if _, ok := v.(string); !ok {
				return fmt.Errorf("MCP tool description must be a string or null")
			}
		}
	}
	return nil
}

// wireServers returns fresh copies and rechecks the exact credential destination.
// This method must only be called after main-request attribution succeeds.
func (p *MCPConnectorPlan) wireServers() ([]any, error) {
	var out []any
	for _, source := range p.servers {
		s, err := decodeObject(mustMCPJSON(source))
		if err != nil {
			return nil, err
		}
		if credential, ok := p.credentials[str(s, "name")]; ok {
			if credential.url != str(s, "url") {
				return nil, fmt.Errorf("MCP credential destination changed")
			}
			s["authorization_token"] = credential.token
		}
		out = append(out, s)
	}
	return out, nil
}

func checkMCPBlock(block Object, role string) error {
	if role != "assistant" {
		return fmt.Errorf("MCP protocol blocks require the assistant role")
	}
	switch str(block, "type") {
	case "mcp_tool_use":
		if err := keys(block, "type", "id", "name", "server_name", "input"); err != nil {
			return err
		}
		if str(block, "id") == "" || str(block, "name") == "" || str(block, "server_name") == "" {
			return fmt.Errorf("MCP tool call requires id, name and server_name")
		}
		if _, ok := block["input"].(map[string]any); !ok {
			return fmt.Errorf("MCP tool input must be an object")
		}
	case "mcp_tool_result":
		if err := keys(block, "type", "tool_use_id", "is_error", "content"); err != nil {
			return err
		}
		if str(block, "tool_use_id") == "" {
			return fmt.Errorf("MCP result requires tool_use_id")
		}
		if value, exists := block["is_error"]; exists {
			if _, ok := value.(bool); !ok {
				return fmt.Errorf("MCP result requires boolean is_error")
			}
		}
		if _, exists := block["content"]; !exists {
			return nil
		}
		if _, ok := block["content"].(string); ok {
			return nil
		}
		content, ok := block["content"].([]any)
		if !ok {
			return fmt.Errorf("MCP result content must be a string or text array")
		}
		for _, value := range content {
			text, ok := value.(map[string]any)
			if !ok || str(text, "type") != "text" {
				return fmt.Errorf("MCP result only supports text blocks")
			}
			if err := keys(text, "type", "text", "citations", "cache_control"); err != nil {
				return err
			}
			if _, ok := text["text"].(string); !ok {
				return fmt.Errorf("MCP result text must be a string")
			}
			if err := checkCitations(text["citations"]); err != nil {
				return err
			}
			ttl := time.Duration(0)
			if err := cacheTTL(text["cache_control"], &ttl); err != nil {
				return err
			}
		}
	case "mcp_tool_listing":
		if err := keys(block, "type", "mcp_server_name", "tools"); err != nil {
			return err
		}
		if str(block, "mcp_server_name") == "" {
			return fmt.Errorf("MCP listing requires mcp_server_name")
		}
		return checkMCPListing(block["tools"])
	default:
		return fmt.Errorf("unsupported MCP protocol block")
	}
	return nil
}

// CLI drops unresolved MCP calls while retaining their listing. Restore only
// these registered pending blocks after the complete preceding history aligns.
func (r *Request) restorePendingMCPContinuation(body Object, messages []any, expected, actual []Object) (bool, error) {
	ledger, err := r.serverHistoryLedger()
	if err != nil {
		return false, err
	}
	var visible []Object
	missing := 0
	for _, block := range expected {
		if str(block, "type") == "mcp_tool_use" && ledger.pending[str(block, "id")] == "mcp_tool_result" {
			missing++
			continue
		}
		visible = append(visible, block)
	}
	if missing == 0 || digest(historySkeleton(visible)) != digest(historySkeleton(actual)) {
		return false, nil
	}
	prefix := *r
	prefix.Messages = r.Messages[:len(r.Messages)-1]
	if _, err := alignClientHistory(&prefix, Object{"messages": messages[:len(messages)-1]}); err != nil {
		return false, fmt.Errorf("pending MCP continuation prefix changed: %w", err)
	}
	last, _ := messages[len(messages)-1].(map[string]any)
	if str(last, "role") != "assistant" {
		return false, fmt.Errorf("pending MCP continuation role changed")
	}
	last["content"] = expected
	return true, nil
}
