package features

import (
	"strings"
	"testing"
)

func TestNinthBatchCatalogQualifiesCacheDiagnosticsAndPrefill(t *testing.T) {
	doc := Catalog()
	if doc.CatalogVersion != "2026-10-08.11" || doc.RuntimeVerified {
		t.Fatal("catalog version/runtime claim changed")
	}
	expected := map[string][]string{
		"F-CACHE":       {"ToolSearch", "automatic", "defer_loading:false", "本地重建", "legacy synthetic", "API output_config.format", "不代表真实上游"},
		"F-DIAGNOSTICS": {"24h", "4096", "user+group", "issuer", "冷 Worker", "1h", "previous_message_not_found", "正常 200", "官方指纹 TTL", "未验证"},
		"F-MESSAGES":    {"4.6", "不支持", "prefill", "pause_turn", "安全附件", "不证明真实模型"},
	}
	for _, f := range doc.Features {
		words, ok := expected[f.ID]
		if !ok {
			continue
		}
		if f.Status != "partial" {
			t.Errorf("%s must remain conditional", f.ID)
		}
		for _, word := range words {
			if !strings.Contains(f.Reason, word) {
				t.Errorf("%s missing %s", f.ID, word)
			}
		}
		delete(expected, f.ID)
	}
	if len(expected) != 0 {
		t.Fatal("missing features", expected)
	}
}
