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
// It reads tokens from two places:
//
//   - the answers of OpenAI's token endpoint (authorization and refresh),
//     straight over TLS in the same exchange;
//   - the id_token an administrator submits with the account's credentials
//     (ValidateCredentials), from which missing email / plan_type and, for
//     codex_device, chatgpt_account_id are filled in. That account id is
//     then sent upstream as the chatgpt-account-id header.
//
// Not verifying is deliberate and safe in both cases. The credentials are
// the operator's own (the account owner pastes or authorizes their own
// ChatGPT login; only administrators with account permissions can submit
// them), so there is no other party whose claims could be forged against
// them. The plugin copies display fields (email, plan) and the account id,
// which the upstream itself checks against the access token: a wrong id only
// makes the operator's own requests fail. No authorization decision of
// sup2api is ever made on these claims.
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
