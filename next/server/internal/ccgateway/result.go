package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
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

func (s *Service) Ready(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	cfg, e := s.Load(ctx)
	if e != nil || cfg.AdminKey == "" || cfg.APIKey == "" {
		return errors.New("CCGateway keys are not configured")
	}
	client, base, close, e := s.open(ctx, cfg)
	if e != nil {
		return e
	}
	defer close()
	req, _ := http.NewRequestWithContext(ctx, "GET", base+"/admin/status", nil)
	req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	res, e := client.Do(req)
	if e != nil {
		return errors.New("CCGateway unavailable")
	}
	defer res.Body.Close()
	var v struct {
		LoggedIn bool `json:"logged_in"`
	}
	if res.StatusCode != 200 || json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&v) != nil || !v.LoggedIn {
		return errors.New("CCGateway is not authorized")
	}
	return nil
}
