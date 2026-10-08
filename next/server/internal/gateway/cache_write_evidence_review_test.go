package gateway

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"testing"
)

func TestReviewCacheReservedEvidenceCannotBeForgedOrAliased(t *testing.T) {
	key := core.CacheWriteEvidenceKey
	forged := map[string]any{key: map[string]any{"version": 1, "secret": "untrusted"}, "other": 2}
	empty := preserveHostCacheEvidence(nil, forged)
	if empty[key] != nil || empty["other"] != 2 {
		t.Fatal("plugin created reserved host evidence")
	}
	host := map[string]any{key: map[string]any{"version": json.Number("1"), "total": map[string]any{"state": "value", "value": json.Number("9007199254740993")}}}
	after := preserveHostCacheEvidence(host, map[string]any{key: "forged"})
	after[key].(map[string]any)["total"].(map[string]any)["value"] = json.Number("0")
	if host[key].(map[string]any)["total"].(map[string]any)["value"] != json.Number("9007199254740993") {
		t.Fatal("private host snapshot aliased")
	}
}
