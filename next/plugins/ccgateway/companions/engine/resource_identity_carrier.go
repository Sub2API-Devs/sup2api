package engine

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

// resourceIdentityProbe consumes authentication selected by this CLI process.
// It never retains the credential itself.
type resourceIdentityProbe struct {
	issuer, epoch string
	local         *resources.Identity
}

func (p *resourceIdentityProbe) classify(h http.Header) (bool, error) {
	bearer, key := h.Values("Authorization"), h.Values("X-Api-Key")
	if len(bearer) > 1 || len(key) > 1 || len(bearer)+len(key) != 1 {
		return false, fmt.Errorf("resource carrier authentication is missing or ambiguous")
	}
	if len(key) == 1 {
		if strings.TrimSpace(key[0]) == "" {
			return false, fmt.Errorf("resource carrier API key is empty")
		}
		if p.issuer == "" || p.epoch == "" {
			return false, errManagedResourceIssuerMissing
		}
		p.local = &resources.Identity{AuthType: "api_key", PrincipalID: digest([]string{"resource-api-issuer-v1", p.issuer})}
		return true, nil
	}
	if !strings.HasPrefix(bearer[0], "Bearer ") || strings.TrimSpace(strings.TrimPrefix(bearer[0], "Bearer ")) == "" {
		return false, fmt.Errorf("resource carrier OAuth authentication is unavailable")
	}
	for _, line := range h.Values("Anthropic-Beta") {
		for _, beta := range strings.Split(line, ",") {
			if strings.TrimSpace(beta) == "oauth-2025-04-20" {
				return false, nil
			}
		}
	}
	return false, fmt.Errorf("resource carrier is not native Anthropic OAuth")
}

func resourceBackendSupported(env []string) bool {
	for _, key := range []string{"CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY", "CLAUDE_CODE_USE_ANTHROPIC_AWS", "CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD", "CLAUDE_CODE_USE_MANTLE", "CLAUDE_CODE_USE_GATEWAY"} {
		value := strings.ToLower(resourceEnv(env, key))
		if value != "" && value != "0" && value != "false" {
			return false
		}
	}
	return true
}
