package e2e

import (
	"net/http"
	"sync"
	"testing"
	"time"

	"github.com/tidwall/gjson"
)

// Session is a logged-in console user.
type Session struct {
	*Client
	Email    string
	Password string
	UserID   int64
	Refresh  string

	mu        sync.Mutex
	stepToken string
	stepUntil time.Time
}

// Login performs POST /auth/login and returns a session. Fails the test on
// any non-200 answer.
func (e *Env) Login(email, password string) *Session {
	e.T.Helper()
	c := NewClient(e.BaseURL)
	r := c.API(e.T, http.MethodPost, "/auth/login", map[string]any{"email": email, "password": password})
	if r.Status != 200 {
		e.T.Fatalf("login %s: %s", email, r)
	}
	d := r.Data()
	if d.Get("access_token").String() == "" || d.Get("refresh_token").String() == "" || d.Get("expires_in").Int() <= 0 {
		e.T.Fatalf("login response incomplete: %s", r)
	}
	c.Token = d.Get("access_token").String()
	return &Session{Client: c, Email: email, Password: password, UserID: d.Get("user.id").Int(), Refresh: d.Get("refresh_token").String()}
}

// TryLogin returns the raw login response (for negative tests).
func (e *Env) TryLogin(email, password string) *Resp {
	e.T.Helper()
	return NewClient(e.BaseURL).API(e.T, http.MethodPost, "/auth/login", map[string]any{"email": email, "password": password})
}

var (
	adminMu   sync.Mutex
	adminSess *Session
	adminAt   time.Time
)

// Admin returns a cached super-admin session (re-login every 30 minutes).
func (e *Env) Admin() *Session {
	e.T.Helper()
	e.RequireAdmin()
	adminMu.Lock()
	defer adminMu.Unlock()
	if adminSess == nil || time.Since(adminAt) > 30*time.Minute {
		adminSess = e.Login(e.AdminEmail, e.AdminPassword)
		adminAt = time.Now()
	}
	return adminSess
}

// StepUp returns a ReqOpt carrying a valid X-Step-Up-Token, obtaining a new
// token via POST /auth/step-up when the cached one is older than 4 minutes.
func (s *Session) StepUp(t testing.TB) ReqOpt {
	t.Helper()
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.stepToken == "" || time.Now().After(s.stepUntil) {
		d := s.OK(t, http.MethodPost, "/auth/step-up", map[string]any{"password": s.Password})
		s.stepToken = d.Get("step_up_token").String()
		if s.stepToken == "" {
			t.Fatalf("step-up returned no token: %s", d.Raw)
		}
		ttl := time.Duration(d.Get("expires_in").Int()) * time.Second
		if ttl <= 0 || ttl > 4*time.Minute {
			ttl = 4 * time.Minute
		}
		s.stepUntil = time.Now().Add(ttl - 15*time.Second)
	}
	return Header("X-Step-Up-Token", s.stepToken)
}

// Me returns GET /me.
func (s *Session) Me(t testing.TB) gjson.Result {
	t.Helper()
	return s.OK(t, http.MethodGet, "/me", nil)
}

// Menus returns GET /me/menus flattened to items (each with its section).
func (s *Session) Menus(t testing.TB) []gjson.Result {
	t.Helper()
	var out []gjson.Result
	for _, sec := range s.OK(t, http.MethodGet, "/me/menus", nil).Array() {
		out = append(out, sec.Get("items").Array()...)
	}
	return out
}
