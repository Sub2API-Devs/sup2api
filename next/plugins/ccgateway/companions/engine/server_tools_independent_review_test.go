package engine

import "testing"

// WebFetchBlockParam.content is DocumentBlockParam, whose optional
// cache_control belongs to that document rather than the server-result block.
func TestReviewWebFetchNestedDocumentCache(t *testing.T) {
	result := webFixture("web_fetch")[1]
	content := result["content"].(Object)
	document := content["content"].(Object)
	document["cache_control"] = Object{"type": "ephemeral"}
	if err := checkServerSearchBlock(result, "assistant"); err != nil {
		t.Fatalf("official nested document cache field rejected: %v", err)
	}
}
