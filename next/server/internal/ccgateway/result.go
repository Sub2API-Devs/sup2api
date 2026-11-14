package ccgateway

import (
	"encoding/json"
	"errors"
	"net/url"
	"time"
)

// safeResult keeps only the allowed fields of a runtime's admin answer
// (per-account status and authorization, §49).
func safeResult(path string, raw []byte) (any, error) {
	switch path {
	case "/status":
		return safeAuthStatus(raw)
	case "/auth/start":
		var v struct {
			SessionID string    `json:"session_id"`
			URL       string    `json:"url"`
			ExpiresAt time.Time `json:"expires_at"`
		}
		if json.Unmarshal(raw, &v) != nil {
			return nil, errors.New("invalid auth result")
		}
		u, e := url.Parse(v.URL)
		if e != nil || u.Scheme != "https" || u.User != nil || u.Fragment != "" || (u.Host != "claude.com" && u.Host != "claude.ai" && u.Host != "platform.claude.com" && u.Host != "console.anthropic.com") || u.Query().Get("state") == "" || u.Query().Get("code_challenge") == "" || u.Query().Get("code_challenge_method") != "S256" {
			return nil, errors.New("invalid OAuth URL")
		}
		return v, nil
	default:
		var v struct {
			Success bool `json:"success"`
		}
		if json.Unmarshal(raw, &v) != nil {
			return nil, errors.New("invalid action result")
		}
		return v, nil
	}
}

// sessionResult reads GET /admin/auth/session ({"session": {...} | null}):
// the pending login, checked like a start result, or nil.
func sessionResult(raw []byte) (any, error) {
	var v struct {
		Session json.RawMessage `json:"session"`
	}
	if json.Unmarshal(raw, &v) != nil {
		return nil, errors.New("invalid session result")
	}
	if len(v.Session) == 0 || string(v.Session) == "null" {
		return nil, nil
	}
	return safeResult("/auth/start", v.Session)
}
