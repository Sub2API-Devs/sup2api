package engine

import "testing"

func TestReviewPinnedSearchLoadsOnlyResponseLedger(t *testing.T) {
	r, err := parseMCPInline(pinnedSearchFixture())
	if err != nil {
		t.Fatal(err)
	}
	blocks := pinnedSearchBlocks()
	first := newServerToolLedger()
	for _, b := range blocks[:2] {
		if err := first.accept(b, r); err != nil {
			t.Fatal(err)
		}
	}
	if err := first.accept(blocks[2], r); err != nil {
		t.Fatal(err)
	}
	if err := newServerToolLedger().accept(blocks[2], r); err == nil {
		t.Fatal("response discovery escaped its ledger")
	}
	other := Object{"type": "mcp_tool_use", "id": "other-server", "server_name": "two", "name": "echo", "input": Object{}}
	if err := first.accept(other, r); err == nil {
		t.Fatal("discovery crossed server identity")
	}
}

func TestReviewPinnedSearchBatchFailureDoesNotDiscover(t *testing.T) {
	b := pinnedSearchFixture()
	b["tools"].([]any)[1].(Object)["configs"] = Object{"echo": Object{"enabled": false}}
	r, err := parseMCPInline(b)
	if err != nil {
		t.Fatal(err)
	}
	blocks := pinnedSearchBlocks()
	blocks[1]["content"].(Object)["tool_references"] = []any{Object{"type": "tool_reference", "tool_name": "one_echo"}, Object{"type": "tool_reference", "tool_name": "two_echo"}}
	l := newServerToolLedger()
	if err := l.accept(blocks[0], r); err != nil {
		t.Fatal(err)
	}
	if err := l.accept(blocks[1], r); err == nil {
		t.Fatal("disabled reference admitted")
	}
	if err := l.accept(blocks[2], r); err == nil {
		t.Fatal("failed batch partially loaded a tool")
	}
}

func TestReviewPinnedSearchHistoricalOrderAndReset(t *testing.T) {
	for _, scenario := range []string{"discovery-after-call", "set-withdrawal", "fresh-request"} {
		t.Run(scenario, func(t *testing.T) {
			b := pinnedSearchFixture()
			blocks := pinnedSearchBlocks()
			if scenario == "discovery-after-call" {
				blocks = []Object{blocks[2], blocks[3], blocks[0], blocks[1]}
			}
			b["messages"] = append(b["messages"].([]any), Object{"role": "assistant", "content": blocks})
			if scenario == "set-withdrawal" {
				b["messages"] = append(b["messages"].([]any), Object{"role": "user", "content": "withdraw toolset"})
				b["messages"] = append(b["messages"].([]any), Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "mcp_toolset_reference", "server_name": "one"}}}})
			}
			if scenario != "set-withdrawal" {
				b["messages"] = append(b["messages"].([]any), Object{"role": "user", "content": "next"})
			}
			r, err := parseMCPInline(b)
			if scenario == "discovery-after-call" {
				if err == nil {
					t.Fatal("future discovery authorized earlier call")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if scenario == "fresh-request" {
				if !r.MCP.permitsCall("one", "echo") {
					t.Fatal("historical discovery missing")
				}
				r, err = parseMCPInline(pinnedSearchFixture())
				if err != nil {
					t.Fatal(err)
				}
			}
			l := newServerToolLedger()
			if err := l.accept(pinnedSearchBlocks()[2], r); err == nil {
				t.Fatal("withdrawn or rolled-back discovery survived")
			}
		})
	}
}
