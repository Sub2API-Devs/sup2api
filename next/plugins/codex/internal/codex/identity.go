package codex

import (
	"encoding/base64"
	"encoding/json"
	"strings"
)

// identity is what the plugin reads from OpenAI's tokens.
type identity struct {
	Email     string
	AccountID string // chatgpt_account_id
	PlanType  string // chatgpt_plan_type
}

// authClaim is the OpenAI-specific claim object of OpenAI's tokens.
const authClaim = "https://api.openai.com/auth"

// jwtClaims decodes the payload of a JWT WITHOUT verifying its signature.
//
// That is deliberate and safe here: the tokens come straight from OpenAI's
// token endpoint over TLS in the same exchange, the plugin only copies
// display fields (email, plan) and the ChatGPT account id that the upstream
// itself checks against the access token, and it never makes an
// authorization decision on them. A forged token would only mislabel the
// operator's own account.
func jwtClaims(token string) map[string]any {
	parts := strings.Split(strings.TrimSpace(token), ".")
	if len(parts) != 3 {
		return nil
	}
	seg := strings.TrimRight(parts[1], "=")
	raw, err := base64.RawURLEncoding.DecodeString(seg)
	if err != nil {
		if raw, err = base64.RawStdEncoding.DecodeString(seg); err != nil {
			return nil
		}
	}
	var claims map[string]any
	if json.Unmarshal(raw, &claims) != nil {
		return nil
	}
	return claims
}

// parseIdentity reads email (top level), chatgpt_account_id and
// chatgpt_plan_type (in the https://api.openai.com/auth claim) from the
// id_token, falling back to the access token, which carries the same auth
// claim. Missing values stay empty.
func parseIdentity(idToken, accessToken string) identity {
	var id identity
	for _, tok := range []string{idToken, accessToken} {
		c := jwtClaims(tok)
		if c == nil {
			continue
		}
		if id.Email == "" {
			id.Email, _ = c["email"].(string)
		}
		if auth, ok := c[authClaim].(map[string]any); ok {
			if id.AccountID == "" {
				id.AccountID, _ = auth["chatgpt_account_id"].(string)
			}
			if id.PlanType == "" {
				id.PlanType, _ = auth["chatgpt_plan_type"].(string)
			}
		}
	}
	return id
}

// tokenExpiry returns the exp claim of a JWT access token, 0 when it has none.
func tokenExpiry(accessToken string) int64 {
	if exp, ok := jwtClaims(accessToken)["exp"].(float64); ok && exp > 0 {
		return int64(exp)
	}
	return 0
}
