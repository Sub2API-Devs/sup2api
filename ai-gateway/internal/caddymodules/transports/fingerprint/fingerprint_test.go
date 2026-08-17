package fingerprint

import (
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/caddyserver/caddy/v2"
)

func TestTransportPoolsByFingerprintAndProxyDigest(t *testing.T) {
	transport := new(Transport)
	if err := transport.Provision(caddy.Context{}); err != nil {
		t.Fatalf("Provision: %v", err)
	}
	defer transport.Cleanup()
	plan := &controlv1.ExecutionPlan{
		UpstreamUrl: "https://api.example.com/v1/messages",
		TlsFingerprint: &controlv1.TLSFingerprintProfile{
			ProfileKey: "node-24", CipherSuites: []uint32{0x1301, 0x1302},
		},
	}
	first, err := transport.Transport(plan)
	if err != nil {
		t.Fatalf("first Transport: %v", err)
	}
	second, err := transport.Transport(plan)
	if err != nil {
		t.Fatalf("second Transport: %v", err)
	}
	if first != second {
		t.Fatal("identical immutable profiles did not reuse a transport")
	}
}

func TestTransportRejectsUnsafeOrUnsupportedProfiles(t *testing.T) {
	transport := new(Transport)
	if err := transport.Provision(caddy.Context{}); err != nil {
		t.Fatalf("Provision: %v", err)
	}
	defer transport.Cleanup()
	tests := []struct {
		name string
		plan *controlv1.ExecutionPlan
	}{
		{name: "missing profile", plan: &controlv1.ExecutionPlan{UpstreamUrl: "https://api.example.com"}},
		{name: "plaintext upstream", plan: &controlv1.ExecutionPlan{UpstreamUrl: "http://api.example.com", TlsFingerprint: &controlv1.TLSFingerprintProfile{}}},
		{name: "HTTPS proxy", plan: &controlv1.ExecutionPlan{UpstreamUrl: "https://api.example.com", ProxyUrl: "https://proxy.example.com", TlsFingerprint: &controlv1.TLSFingerprintProfile{}}},
		{name: "out of range", plan: &controlv1.ExecutionPlan{UpstreamUrl: "https://api.example.com", TlsFingerprint: &controlv1.TLSFingerprintProfile{CipherSuites: []uint32{0x10000}}}},
		{name: "unsupported ALPN", plan: &controlv1.ExecutionPlan{UpstreamUrl: "https://api.example.com", TlsFingerprint: &controlv1.TLSFingerprintProfile{AlpnProtocols: []string{"h2"}}}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if _, err := transport.Transport(test.plan); err == nil {
				t.Fatal("expected execution plan to be rejected")
			}
		})
	}
}
