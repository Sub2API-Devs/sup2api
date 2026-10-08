package engine

import (
	"strings"
	"testing"
)

func mcpPlanFixture() Object {
	return Object{"mcp_servers": []any{Object{"type": "url", "name": "one", "url": "https://one.example.test/mcp", "authorization_token": "fixture-secret-one"}, Object{"type": "url", "name": "two", "url": "https://two.example.test/mcp", "authorization_token": "fixture-secret-two"}}, "tools": []any{Object{"type": "mcp_toolset", "mcp_server_name": "one"}, Object{"type": "mcp_toolset", "mcp_server_name": "two", "configs": Object{"dynamic_tool": Object{"enabled": false}}}}}
}

func TestMCPConnectorPrivateCredentials(t *testing.T) {
	o := mcpPlanFixture()
	p, err := parseMCPConnector(o, []string{mcpConnectorBeta})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(mustMCPJSON(p)), "secret") || strings.Contains(string(mustMCPJSON(p.servers)), "secret") {
		t.Fatal("public serialization contains credential")
	}
	wire, err := p.wireServers()
	if err != nil {
		t.Fatal(err)
	}
	for i, name := range []string{"one", "two"} {
		server := wire[i].(map[string]any)
		if str(server, "name") != name || str(server, "authorization_token") != "fixture-secret-"+name {
			t.Fatal("credential binding changed")
		}
	}
	wire[0].(map[string]any)["authorization_token"] = "mutated"
	again, _ := p.wireServers()
	if str(again[0].(map[string]any), "authorization_token") != "fixture-secret-one" {
		t.Fatal("caller mutated plan")
	}
	p.servers[0]["url"] = "https://wrong.example.test/mcp"
	if _, err := p.wireServers(); err == nil {
		t.Fatal("credential sent to changed destination")
	}
}

func TestMCPConnectorAdmissionValidation(t *testing.T) {
	for _, address := range []string{"http://example.test/mcp", "https://user:pass@example.test/mcp", "https://localhost/mcp", "https://127.0.0.1/mcp", "https://[::1]/mcp", "https://10.0.0.1/mcp", "https://169.254.169.254/mcp", "https://service.local/mcp"} {
		if err := validateMCPURL(address); err == nil {
			t.Errorf("accepted local/invalid URL %q", address)
		}
	}
	for _, beta := range [][]string{nil, {"mcp-client-2025-04-04"}, {mcpConnectorBeta, "mcp-client-2025-04-04"}} {
		if _, err := parseMCPConnector(mcpPlanFixture(), beta); err == nil {
			t.Fatal("accepted missing or deprecated beta")
		}
	}
	o := mcpPlanFixture()
	o["tools"].([]any)[0].(map[string]any)["tools"] = []any{Object{"name": "same", "input_schema": Object{"type": "object"}}}
	if _, err := parseMCPConnector(o, []string{mcpConnectorBeta}); err == nil {
		t.Fatal("accepted pinned list with older beta")
	}
	if _, err := parseMCPConnector(o, []string{mcpListingBeta}); err != nil {
		t.Fatal(err)
	}
	o["tools"].([]any)[1].(map[string]any)["mcp_server_name"] = "one"
	if _, err := parseMCPConnector(o, []string{mcpListingBeta}); err == nil {
		t.Fatal("accepted duplicate toolset")
	}
}

func TestMCPConnectorParsedPlanNeverStoresTokens(t *testing.T) {
	body := mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	body["messages"] = []any{Object{"role": "user", "content": "hello"}}
	req, err := parsePolicyRequest(mustMCPJSON(body), map[string][]string{"Anthropic-Beta": {mcpConnectorBeta}})
	if err != nil {
		t.Fatal(err)
	}
	for label, value := range map[string]any{"raw": string(req.Plan.RawRequest()), "plan": req.Plan.MainRequestFields(), "request": req, "key": req.configKey()} {
		if strings.Contains(string(mustMCPJSON(value)), "fixture-secret-") {
			t.Fatalf("credential escaped private storage via %s", label)
		}
	}
	if len(req.Tools) != 0 || len(req.APIClientTools) != 0 || len(req.ServerTools) != 0 {
		t.Fatal("connector registered local tools")
	}
	input := Object{"tools": []any{}}
	if err := req.ApplyMainRequestFeatures(input); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(mustMCPJSON(input)), "fixture-secret-one") {
		t.Fatal("final attributed adapter omitted credentials")
	}
}
