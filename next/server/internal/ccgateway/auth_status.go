package ccgateway

import (
	"encoding/json"
	"errors"
)

// Local credential presence is not a provider authorization verdict.
func safeAuthStatus(raw []byte) (any, error) {
	var v struct {
		Healthy                    bool     `json:"healthy"`
		LoggedIn                   bool     `json:"logged_in"`
		AuthMethod                 string   `json:"auth_method"`
		StatusSource               string   `json:"status_source,omitempty"`
		OnlineVerified             *bool    `json:"online_verified,omitempty"`
		SelectionVerified          *bool    `json:"selection_verified,omitempty"`
		CredentialPresent          *bool    `json:"credential_present,omitempty"`
		CredentialSources          []string `json:"credential_sources,omitempty"`
		CredentialSourceUnresolved *bool    `json:"credential_source_unresolved,omitempty"`
		AccessTokenExpired         *bool    `json:"access_token_expired,omitempty"`
	}
	if json.Unmarshal(raw, &v) != nil {
		return nil, errors.New("invalid status")
	}
	switch v.AuthMethod {
	case "oauth", "api_key", "claude_ai", "claude.ai", "oauth_token", "none", "", "unresolved", "third_party":
	default:
		v.AuthMethod = "unknown"
	}
	if v.StatusSource == "" { // Older Worker contract: retain only its original facts.
		return struct {
			Healthy    bool   `json:"healthy"`
			LoggedIn   bool   `json:"logged_in"`
			AuthMethod string `json:"auth_method"`
		}{v.Healthy, v.LoggedIn, v.AuthMethod}, nil
	}
	if v.StatusSource != "local_snapshot" || v.OnlineVerified == nil || *v.OnlineVerified || v.CredentialPresent == nil || v.SelectionVerified == nil || *v.SelectionVerified {
		return nil, errors.New("invalid local status facts")
	}
	seen := map[string]bool{}
	if *v.CredentialPresent && len(v.CredentialSources) == 0 {
		return nil, errors.New("credential presence lacks a known source")
	}
	for _, source := range v.CredentialSources {
		switch source {
		case "api_key_env", "bearer_env", "oauth_token_env", "stored_oauth", "managed_api_key", "external_credential_source", "credential_helper_configured":
		default:
			return nil, errors.New("invalid credential source")
		}
		if seen[source] {
			return nil, errors.New("duplicate credential source")
		}
		seen[source] = true
	}
	v.LoggedIn = *v.CredentialPresent
	return v, nil
}
