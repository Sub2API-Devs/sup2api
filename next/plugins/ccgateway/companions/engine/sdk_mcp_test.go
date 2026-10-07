package engine

import "testing"

func TestSDKMCPRequestScopedDefinitions(t *testing.T) {
	files := Tool{Name: "mcp__files__lookup", Description: "File lookup", Schema: Object{"type": "object", "properties": Object{"path": Object{"type": "string"}}}}
	other := Tool{Name: "mcp__other__lookup", Description: "Other lookup", Schema: Object{"type": "object", "properties": Object{"id": Object{"type": "number"}}}}
	r := &Request{Tools: []Tool{other, files, {Name: "plain", Schema: Object{"type": "object"}}, {Name: "mcp__files__save", Schema: Object{"type": "object"}}, verifiedNativeTools["Read"]}, Native: map[string]bool{"Read": true}}
	if digest(r.sdkMCPServers()) != digest([]string{"ccgateway", "files", "other"}) {
		t.Fatalf("servers were not sorted/deduplicated: %v", r.sdkMCPServers())
	}
	call := func(server, method string) Object {
		return sdkMCPReply(Object{"server_name": server, "message": Object{"jsonrpc": "2.0", "id": "request-42", "method": method}}, r)
	}
	initialize := sdkMCPReply(Object{"server_name": "files", "message": Object{"id": "init-1", "method": "initialize", "params": Object{"protocolVersion": "2025-03-26"}}}, r)
	initialized, _ := initialize["result"].(map[string]any)
	if str(initialized, "protocolVersion") != "2025-03-26" || str(initialize, "id") != "init-1" {
		t.Fatalf("initialize lost protocol version or request ID: %v", initialize)
	}
	for _, tc := range []struct {
		server string
		count  int
		tool   Tool
	}{{"files", 2, files}, {"other", 1, other}} {
		reply := call(tc.server, "tools/list")
		if str(reply, "id") != "request-42" || reply["error"] != nil {
			t.Fatalf("invalid JSONRPC reply: %v", reply)
		}
		result, _ := reply["result"].(map[string]any)
		tools, _ := result["tools"].([]Object)
		if len(tools) != tc.count {
			t.Fatalf("server %s exposed wrong tools: %v", tc.server, tools)
		}
		if str(tools[0], "name") != "lookup" || str(tools[0], "description") != tc.tool.Description || digest(tools[0]["inputSchema"]) != digest(tc.tool.Schema) {
			t.Fatalf("server %s received another server's lookup definition: %v", tc.server, tools)
		}
	}
	for _, tc := range []struct{ server, method string }{{"missing", "tools/list"}, {"files", "tools/call"}, {"files", "resources/list"}} {
		if reply := call(tc.server, tc.method); reply["error"] == nil || reply["result"] != nil {
			t.Fatalf("unsupported request succeeded: %v", reply)
		}
	}
	plainReply := call("ccgateway", "tools/list")
	plainResult, _ := plainReply["result"].(map[string]any)
	plainTools, _ := plainResult["tools"].([]Object)
	if len(plainTools) != 1 || str(plainTools[0], "name") != "plain" {
		t.Fatalf("ordinary custom tool was not registered through SDK: %v", plainReply)
	}
	r.NoTools = true
	if len(r.sdkMCPServers()) != 0 || call("files", "tools/list")["error"] == nil {
		t.Fatal("tool_choice:none exposed an SDK server")
	}
}
