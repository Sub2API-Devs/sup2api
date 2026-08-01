package proxy

import (
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/caddyserver/caddy/v2"
)

func TestTransportPoolsByProxyCredentialWithoutAcceptingUnsafeSchemes(t *testing.T) {
	transport := new(Transport)
	if err := transport.Provision(caddy.Context{}); err != nil {
		t.Fatalf("Provision: %v", err)
	}
	defer transport.Cleanup()
	plan := &controlv1.ExecutionPlan{ProxyUrl: "http://user:password@127.0.0.1:8080"}
	first, err := transport.Transport(plan)
	if err != nil {
		t.Fatalf("Transport: %v", err)
	}
	second, err := transport.Transport(plan)
	if err != nil || first != second {
		t.Fatalf("pooled transport first=%p second=%p err=%v", first, second, err)
	}
	if _, err := transport.Transport(&controlv1.ExecutionPlan{ProxyUrl: "file:///tmp/socket"}); err == nil {
		t.Fatal("expected unsafe proxy scheme rejection")
	}
}
