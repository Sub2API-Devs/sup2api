package engine

import (
	"encoding/base64"
	"testing"
	"time"
)

func TestMediaBlocksPreserveSources(t *testing.T) {
	for _, block := range []Object{
		{"type": "document", "source": Object{"type": "base64", "media_type": "application/pdf", "data": base64.StdEncoding.EncodeToString(messageProbePDF())}, "title": nil, "context": "fixture", "citations": Object{"enabled": true}},
		{"type": "document", "source": Object{"type": "url", "url": "https://example.com/fixture.pdf"}},
		{"type": "document", "source": Object{"type": "text", "media_type": "text/plain", "data": "fixture"}},
		{"type": "document", "source": Object{"type": "content", "content": []any{Object{"type": "text", "text": "fixture"}, Object{"type": "image", "source": Object{"type": "url", "url": "https://example.com/image.png"}}}}},
		{"type": "document", "source": Object{"type": "content", "content": "fixture"}},
		{"type": "image", "source": Object{"type": "url", "url": "https://example.com/image.png"}},
	} {
		ttl := 5 * time.Minute
		before := digest(block)
		if err := checkBlock(block, "user", &ttl); err != nil {
			t.Fatal(err)
		}
		if digest(block) != before {
			t.Fatal("media source changed during validation")
		}
	}
}

func TestMediaBlocksRejectUnmappedFilesAndInvalidShapes(t *testing.T) {
	for _, block := range []Object{
		{"type": "document", "source": Object{"type": "file", "file_id": "file_other_client"}},
		{"type": "image", "source": Object{"type": "file", "file_id": "file_other_client"}},
		{"type": "document", "source": Object{"type": "url", "url": "file:///private/document.pdf"}},
		{"type": "image", "source": Object{"type": "url", "url": "https://name:password@example.com/image"}},
		{"type": "document", "source": Object{"type": "base64", "media_type": "application/pdf", "data": "invalid base64"}},
		{"type": "document", "source": Object{"type": "text", "media_type": "text/html", "data": "text"}},
		{"type": "document", "source": Object{"type": "content", "content": []any{Object{"type": "tool_use", "name": "Bash"}}}},
		{"type": "document", "source": Object{"type": "text", "media_type": "text/plain", "data": "text"}, "citations": Object{"enabled": "true"}},
	} {
		ttl := 5 * time.Minute
		if err := checkBlock(block, "user", &ttl); err == nil {
			t.Fatalf("invalid media accepted: %v", block)
		}
	}
}

func TestDocumentInToolResult(t *testing.T) {
	block := Object{"type": "tool_result", "tool_use_id": "toolu_doc", "content": []any{citationDocument("tool document")}}
	ttl := 5 * time.Minute
	if err := checkBlock(block, "user", &ttl); err != nil {
		t.Fatal(err)
	}
	if err := checkBlock(citationDocument("fixture"), "assistant", &ttl); err == nil {
		t.Fatal("assistant document accepted")
	}
}
