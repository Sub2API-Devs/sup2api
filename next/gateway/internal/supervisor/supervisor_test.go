package supervisor

import (
	"strings"
	"testing"
)

func TestCoreEnvironmentDropsNodeKey(t *testing.T) {
	env := coreEnvironment(
		[]string{"PATH=/bin", "SUB2API_PEER_AUTH_KEY=inherited-secret", "sub2api_peer_auth_key=lower"},
		[]string{"SUB2API_LOG_LEVEL=debug", "SUB2API_PEER_AUTH_KEY=explicit-secret"},
	)
	joined := strings.Join(env, "\n")
	if strings.Contains(joined, "secret") || strings.Contains(joined, "lower") {
		t.Fatalf("node key reached the core environment: %v", env)
	}
	if !strings.Contains(joined, "PATH=/bin") || !strings.Contains(joined, "SUB2API_LOG_LEVEL=debug") {
		t.Fatalf("unrelated variables lost: %v", env)
	}
}
