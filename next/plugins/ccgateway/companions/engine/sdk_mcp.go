package engine

import "sort"

func (r *Request) sdkToolName(name string) (server, short string) {
	if server, short, ok := splitMCPToolName(name); ok {
		return server, short
	}
	return r.customToolServer(), name
}

// Only names explicitly supplied by this request become SDK servers. This is
// a definition adapter, not a connection to the caller's real MCP endpoint.
func (r *Request) sdkMCPServers() []string {
	servers := []string{}
	seen := map[string]bool{}
	if !r.NoTools {
		for _, tool := range r.Tools {
			server, _ := r.sdkToolName(tool.Name)
			if r.runtimeToolSearchable(tool.Name) && !r.Native[tool.Name] && !seen[server] {
				seen[server] = true
				servers = append(servers, server)
			}
		}
	}
	sort.Strings(servers)
	return servers
}

func sdkMCPReply(q Object, r *Request) Object {
	message, _ := q["message"].(map[string]any)
	response := Object{"jsonrpc": "2.0", "id": message["id"]}
	server := str(q, "server_name")
	allowed := false
	for _, name := range r.sdkMCPServers() {
		if name == server {
			allowed = true
			break
		}
	}
	if !allowed {
		response["error"] = Object{"code": -32601, "message": "Unknown request-scoped MCP server"}
		return response
	}
	switch str(message, "method") {
	case "initialize":
		params, _ := message["params"].(map[string]any)
		version := str(params, "protocolVersion")
		if version == "" {
			version = "2024-11-05"
		}
		response["result"] = Object{"protocolVersion": version, "capabilities": Object{"tools": Object{}}, "serverInfo": Object{"name": server, "version": "0.1.0"}}
	case "tools/list":
		tools := []Object{}
		for _, tool := range r.Tools {
			name, short := r.sdkToolName(tool.Name)
			if r.runtimeToolSearchable(tool.Name) && name == server && !r.Native[tool.Name] {
				tools = append(tools, Object{"name": short, "description": tool.Description, "inputSchema": tool.Schema})
			}
		}
		response["result"] = Object{"tools": tools}
	case "ping", "notifications/initialized":
		response["result"] = Object{}
	default:
		response["error"] = Object{"code": -32601, "message": "Tool execution belongs to the API client"}
	}
	return response
}
