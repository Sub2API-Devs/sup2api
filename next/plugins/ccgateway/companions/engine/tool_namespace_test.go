package engine

import (
	"strings"
	"testing"
)

func TestResolveToolNamespace(t *testing.T) {
	tests := []struct {
		name            string
		customPrefix    string
		mcpServers      []string
		hasTools        bool
		expectNamespace string
	}{
		{
			name:            "no MCP - default namespace",
			customPrefix:    "",
			mcpServers:      nil,
			hasTools:        true,
			expectNamespace: "ccgateway",
		},
		{
			name:            "no MCP - custom namespace",
			customPrefix:    "mygateway",
			mcpServers:      nil,
			hasTools:        true,
			expectNamespace: "mygateway",
		},
		{
			name:            "MCP without conflict",
			customPrefix:    "",
			mcpServers:      []string{"filesystem", "database"},
			hasTools:        true,
			expectNamespace: "ccgateway",
		},
		{
			name:            "MCP with default conflict",
			customPrefix:    "",
			mcpServers:      []string{"ccgateway", "filesystem"},
			hasTools:        true,
			expectNamespace: "ccgateway-mapped",
		},
		{
			name:            "MCP with custom conflict",
			customPrefix:    "mygateway",
			mcpServers:      []string{"mygateway", "filesystem"},
			hasTools:        true,
			expectNamespace: "mygateway-mapped",
		},
		{
			name:            "no tools - no conflict check",
			customPrefix:    "",
			mcpServers:      []string{"ccgateway"},
			hasTools:        false,
			expectNamespace: "ccgateway",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := &Request{
				CustomToolPrefix: tc.customPrefix,
			}
			if tc.hasTools {
				r.Tools = []Tool{{Name: "test", Schema: Object{"type": "object"}}}
			}
			if len(tc.mcpServers) > 0 {
				servers := []Object{}
				for _, name := range tc.mcpServers {
					servers = append(servers, Object{"name": name})
				}
				r.MCP = &MCPConnectorPlan{servers: servers}
			}

			result := r.resolveToolNamespace()
			if result != tc.expectNamespace {
				t.Errorf("expected namespace %q, got %q", tc.expectNamespace, result)
			}

			// Verify effectiveToolServer returns the same
			effective := r.effectiveToolServer()
			if effective != result {
				t.Errorf("effectiveToolServer() = %q, resolveToolNamespace() = %q, should match", effective, result)
			}
		})
	}
}

func TestValidateToolNamespace(t *testing.T) {
	t.Run("no conflict", func(t *testing.T) {
		r := &Request{
			Tools: []Tool{{Name: "lookup", Schema: Object{"type": "object"}}},
			MCP: &MCPConnectorPlan{
				servers: []Object{{"name": "filesystem"}},
			},
		}
		if err := r.validateToolNamespace(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("conflict resolved by mapping", func(t *testing.T) {
		r := &Request{
			Tools: []Tool{{Name: "lookup", Schema: Object{"type": "object"}}},
			MCP: &MCPConnectorPlan{
				servers: []Object{{"name": "ccgateway"}},
			},
		}
		// Should not error because we use ccgateway-mapped
		if err := r.validateToolNamespace(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		// Verify the namespace was actually changed
		namespace := r.effectiveToolServer()
		if namespace != "ccgateway-mapped" {
			t.Errorf("expected namespace ccgateway-mapped, got %q", namespace)
		}
	})

	t.Run("mapped namespace also conflicts", func(t *testing.T) {
		r := &Request{
			Tools: []Tool{{Name: "lookup", Schema: Object{"type": "object"}}},
			MCP: &MCPConnectorPlan{
				servers: []Object{
					{"name": "ccgateway"},
					{"name": "ccgateway-mapped"},
				},
			},
		}
		err := r.validateToolNamespace()
		if err == nil {
			t.Fatal("expected error when both namespaces conflict")
		}
		if !strings.Contains(err.Error(), "conflicts with MCP server") {
			t.Errorf("wrong error: %v", err)
		}
	})

	t.Run("native tools skip mapping", func(t *testing.T) {
		r := &Request{
			Tools: []Tool{
				{Name: "Read", Schema: Object{"type": "object"}},
				{Name: "custom", Schema: Object{"type": "object"}},
			},
			Native: map[string]bool{"Read": true},
			MCP: &MCPConnectorPlan{
				servers: []Object{{"name": "filesystem"}},
			},
		}
		if err := r.validateToolNamespace(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("already qualified MCP tools skip mapping", func(t *testing.T) {
		r := &Request{
			Tools: []Tool{
				{Name: "mcp__files__read", Schema: Object{"type": "object"}},
				{Name: "custom", Schema: Object{"type": "object"}},
			},
			MCP: &MCPConnectorPlan{
				servers: []Object{{"name": "files"}},
			},
		}
		if err := r.validateToolNamespace(); err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestWireNameWithNamespaceConflict(t *testing.T) {
	r := &Request{
		Tools: []Tool{
			{Name: "lookup", Schema: Object{"type": "object"}},
			{Name: "custom", Schema: Object{"type": "object"}},
		},
		MCP: &MCPConnectorPlan{
			servers: []Object{{"name": "ccgateway"}},
		},
	}

	// With conflict, should use ccgateway-mapped
	wire := r.wireName("lookup")
	expected := "mcp__ccgateway-mapped__lookup"
	if wire != expected {
		t.Errorf("wireName() = %q, want %q", wire, expected)
	}

	wire2 := r.wireName("custom")
	expected2 := "mcp__ccgateway-mapped__custom"
	if wire2 != expected2 {
		t.Errorf("wireName() = %q, want %q", wire2, expected2)
	}
}

func TestToolServerConsistency(t *testing.T) {
	// Ensure toolServer() is used consistently across the codebase
	r := &Request{
		Tools: []Tool{{Name: "test", Schema: Object{"type": "object"}}},
		MCP: &MCPConnectorPlan{
			servers: []Object{{"name": "ccgateway"}},
		},
	}

	// All these should return the same value
	ts := r.toolServer()
	ets := r.effectiveToolServer()
	rns := r.resolveToolNamespace()

	if ts != ets || ts != rns {
		t.Errorf("inconsistent namespace: toolServer()=%q, effectiveToolServer()=%q, resolveToolNamespace()=%q",
			ts, ets, rns)
	}

	// wireName should use this namespace
	wire := r.wireName("test")
	expectedPrefix := "mcp__" + ts + "__"
	if !strings.HasPrefix(wire, expectedPrefix) {
		t.Errorf("wireName() = %q, expected prefix %q", wire, expectedPrefix)
	}

	// sdkToolName should use this namespace
	server, short := r.sdkToolName("test")
	if server != ts {
		t.Errorf("sdkToolName() server = %q, want %q", server, ts)
	}
	if short != "test" {
		t.Errorf("sdkToolName() short = %q, want %q", short, "test")
	}
}
