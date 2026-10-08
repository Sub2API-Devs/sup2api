package engine

import "testing"

func TestReviewDynamicMCPResponseIsolation(t *testing.T) {
	r, err := parseMCPInline(dynamicMCPFixture())
	if err != nil {
		t.Fatal(err)
	}
	first := newServerToolLedger()
	for _, block := range dynamicMCPBlocks() {
		if err := first.accept(block, r); err != nil {
			t.Fatal(err)
		}
	}
	if r.MCP.timeline.current["one"].listing != nil || r.MCP.permitsCall("one", "echo") {
		t.Fatal("response state escaped into shared request")
	}
	second := newServerToolLedger()
	blocks := dynamicMCPBlocks()
	if err := second.accept(blocks[1], r); err != nil {
		t.Fatal(err)
	}
	if err := second.accept(blocks[2], r); err == nil {
		t.Fatal("another response inherited listing")
	}
	if err := second.accept(blocks[3], r); err == nil {
		t.Fatal("another response inherited discovery")
	}
}

func TestReviewDynamicMCPFutureListingCannotAuthorizePast(t *testing.T) {
	for _, order := range [][]int{{1, 2, 0, 3, 4}, {3, 4, 0, 1, 2}} {
		b := dynamicMCPFixture()
		blocks := dynamicMCPBlocks()
		for _, index := range order {
			b["messages"] = append(b["messages"].([]any), Object{"role": "assistant", "content": []any{blocks[index]}})
		}
		b["messages"] = append(b["messages"].([]any), Object{"role": "user", "content": "continue"})
		if _, err := parseMCPInline(b); err == nil {
			t.Fatal("future listing authorized earlier history")
		}
	}
}

func TestReviewDynamicMCPNoneAndUndeclaredServer(t *testing.T) {
	for _, variant := range []string{"none", "unknown-server"} {
		t.Run(variant, func(t *testing.T) {
			r, err := parseMCPInline(dynamicMCPFixture())
			if err != nil {
				t.Fatal(err)
			}
			ledger := newServerToolLedger()
			blocks := dynamicMCPBlocks()
			for _, block := range blocks[:3] {
				if err := ledger.accept(block, r); err != nil {
					t.Fatal(err)
				}
			}
			if variant == "none" {
				r.NoTools = true
			} else {
				blocks[3]["server_name"] = "unknown"
			}
			if err := ledger.accept(blocks[3], r); err == nil {
				t.Fatal("discovery bypassed call permission")
			}
		})
	}
}

func TestReviewDynamicMCPListingCopyAndConflictAtomicity(t *testing.T) {
	r, err := parseMCPInline(dynamicMCPFixture())
	if err != nil {
		t.Fatal(err)
	}
	ledger := newServerToolLedger()
	listing := dynamicMCPListing()
	if err := ledger.accept(listing, r); err != nil {
		t.Fatal(err)
	}
	listing["tools"].([]any)[0].(Object)["name"] = "changed"
	if _, ok := mustReviewDynamicIndex(t, r, ledger)["one_echo"]; !ok {
		t.Fatal("caller mutated accepted catalog")
	}
	if err := ledger.accept(listing, r); err == nil {
		t.Fatal("conflicting second listing accepted")
	}
	if _, ok := mustReviewDynamicIndex(t, r, ledger)["one_changed"]; ok {
		t.Fatal("failed listing changed catalog")
	}
}

func mustReviewDynamicIndex(t *testing.T, r *Request, ledger *serverToolLedger) map[string]mcpSearchIdentity {
	t.Helper()
	index, err := r.mcpSearchIdentitiesAt(ledger.mcpSearchTimeline(r))
	if err != nil {
		t.Fatal(err)
	}
	return index
}
