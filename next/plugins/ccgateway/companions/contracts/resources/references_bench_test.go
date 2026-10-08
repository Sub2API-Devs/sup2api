package resources

import (
	"encoding/json"
	"strings"
	"testing"
)

func BenchmarkScanLargeHistoryNoResources(b *testing.B) {
	message := map[string]any{"role": "user", "content": []any{map[string]any{"type": "text", "text": strings.Repeat("x", 8192)}}}
	items := make([]any, 128)
	for i := range items {
		items[i] = message
	}
	body, _ := json.Marshal(map[string]any{"model": "fixture", "messages": items})
	b.SetBytes(int64(len(body)))
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, e := ScanReferences(body); e != nil {
			b.Fatal(e)
		}
	}
}
