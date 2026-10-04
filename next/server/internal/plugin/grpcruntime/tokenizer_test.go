package grpcruntime

import (
	"context"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestHostCountTokensOffline(t *testing.T) {
	h := &hostServer{}
	r, err := h.CountTokens(context.Background(), &pluginv1.CountTokensRequest{Text: "hello"})
	if err != nil || r.Tokens != 1 || r.Encoding != "o200k_base" {
		t.Fatalf("count %v %v", r, err)
	}
	if _, err := h.CountTokens(context.Background(), &pluginv1.CountTokensRequest{Encoding: "not-supported"}); err == nil {
		t.Fatal("accepted unsupported tokenizer")
	}
}
