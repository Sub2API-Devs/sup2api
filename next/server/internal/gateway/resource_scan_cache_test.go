package gateway

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestResourceScanCacheInvalidatesAndChecksEscapedKeys(t *testing.T) {
	var cache resourceScanCache
	body := []byte(`{"messages":[{"content":[{"type":"image","source":{"type":"file","file_id":"a"}}]}]}`)
	a, e := cache.scan(body)
	if e != nil || len(a) != 1 || a[0].ID != "a" {
		t.Fatal(a, e)
	}
	idx := strings.Index(string(body), `"a"`)
	body[idx+1] = 'b'
	a, e = cache.scan(body)
	if e != nil || a[0].ID != "b" {
		t.Fatal("in-place edit reused stale admission", a, e)
	}
	escaped := []byte(`{"messages":[{"content":[{"type":"image","source":{"type":"file","file_\u0069d":"c"}}]}]}`)
	a, e = cache.scan(escaped)
	if e != nil || a[0].ID != "c" {
		t.Fatal("escaped key skipped", a, e)
	}
	for i := 0; i < 2; i++ {
		if _, e = cache.scan([]byte(`{"messages":[],"messages":[]}`)); e == nil {
			t.Fatal("duplicate bypassed cache")
		}
	}
}
func BenchmarkCachedResourceScanLargeHistory(b *testing.B) {
	m := map[string]any{"role": "user", "content": []any{map[string]any{"type": "text", "text": strings.Repeat("x", 8192)}}}
	items := make([]any, 128)
	for i := range items {
		items[i] = m
	}
	body, _ := json.Marshal(map[string]any{"model": "fixture", "messages": items})
	var cache resourceScanCache
	if _, e := cache.scan(body); e != nil {
		b.Fatal(e)
	}
	b.SetBytes(int64(len(body)))
	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, e := cache.scan(body); e != nil {
			b.Fatal(e)
		}
	}
}
