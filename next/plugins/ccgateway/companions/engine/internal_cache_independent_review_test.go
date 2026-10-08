package engine

import (
	"sync"
	"testing"
)

func TestReviewInternalCacheFullAssistantAndResults(t *testing.T) {
	for _, mode := range []string{"text", "signature", "result-content", "result-envelope", "role", "reordered"} {
		t.Run(mode, func(t *testing.T) {
			r := internalCacheReviewRequest()
			suffix := internalCacheSuffix()
			assistant := suffix[0].(Object)
			blocks, _ := historyContent(assistant["content"])
			blocks = append([]Object{{"type": "thinking", "thinking": "fixture", "signature": "signed-fixture"}, {"type": "text", "text": "before search"}}, blocks...)
			assistant["content"] = blocks
			observeCacheFixture(r, blocks)
			if err := r.alignInternalCacheSuffix(suffix); err != nil {
				t.Fatal(err)
			}
			result := suffix[1].(Object)
			content, _ := historyContent(result["content"])
			switch mode {
			case "text":
				blocks[1]["text"] = "changed"
			case "signature":
				blocks[0]["signature"] = "changed"
			case "result-content":
				content[0]["content"] = []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__other"}}
			case "result-envelope":
				content[1]["text"] = "Tool loaded. changed"
			case "role":
				result["role"] = "assistant"
			case "reordered":
				assistant["content"] = []Object{blocks[2], blocks[1], blocks[0]}
			}
			if err := r.alignInternalCacheSuffix(suffix); err == nil {
				t.Fatal("mutated witnessed round accepted")
			}
		})
	}
}
func TestReviewInternalCacheClientPrefixCannotDisappear(t *testing.T) {
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "original client prefix"}}}}
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	observeCacheFixture(r, blocks)
	for _, prefix := range []any{Object{"role": "user", "content": "changed"}, Object{"role": "assistant", "content": "original client prefix"}} {
		wire := Object{"messages": append([]any{prefix}, suffix...)}
		if _, err := alignClientHistory(r, wire); err == nil {
			t.Fatal("cache ledger bypassed original client prefix")
		}
	}
}
func TestReviewInternalCacheConcurrentRequestIsolation(t *testing.T) {
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := internalCacheReviewRequest()
			suffix := internalCacheSuffix()
			blocks, _ := historyContent(suffix[0].(Object)["content"])
			observeCacheFixture(r, blocks)
			if err := r.alignInternalCacheSuffix(suffix); err != nil {
				t.Error(err)
			}
			if err := internalCacheReviewRequest().alignInternalCacheSuffix(suffix); err == nil {
				t.Error("other request accepted evidence")
			}
		}()
	}
	wg.Wait()
}
