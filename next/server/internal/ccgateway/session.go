package ccgateway

import (
	"context"
	"encoding/json"
	"log/slog"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// authSession is a pending OAuth authorization of one account runtime, as
// returned by POST .../accounts/:id/start (CONTRACTS §49.4).
//
// The business container keeps exactly one pending login per account and
// refuses a second start until it is completed, cancelled or expired, while
// cancel needs the session id. The core therefore remembers the last started
// session so a console that lost it (page reload, another administrator,
// another node) can resume, cancel or complete it.
type authSession struct {
	SessionID string    `json:"session_id"`
	URL       string    `json:"url"`
	ExpiresAt time.Time `json:"expires_at"`
}

func sessionKey(id int64) string { return "ccgateway:auth:" + strconv.FormatInt(id, 10) }

// saveSession stores sess until it expires. Without Redis nothing is kept.
func (s *Service) saveSession(ctx context.Context, id int64, sess authSession) {
	ttl := time.Until(sess.ExpiresAt)
	if s.Redis == nil || sess.SessionID == "" || ttl <= 0 {
		return
	}
	raw, _ := json.Marshal(sess)
	if err := s.Redis.Set(context.WithoutCancel(ctx), sessionKey(id), raw, ttl).Err(); err != nil {
		slog.WarnContext(ctx, "CCGateway: save authorization session", "account_id", id, "err", err)
	}
}

// loadSession returns the saved, unexpired session of the account, or nil.
func (s *Service) loadSession(ctx context.Context, id int64) *authSession {
	if s.Redis == nil {
		return nil
	}
	raw, err := s.Redis.Get(ctx, sessionKey(id)).Bytes()
	if err != nil {
		if err != redis.Nil {
			slog.WarnContext(ctx, "CCGateway: read authorization session", "account_id", id, "err", err)
		}
		return nil
	}
	var sess authSession
	if json.Unmarshal(raw, &sess) != nil || sess.SessionID == "" || !time.Now().Before(sess.ExpiresAt) {
		return nil
	}
	return &sess
}

// dropSession forgets the saved session (completed, cancelled, logged out or
// unknown to the container).
func (s *Service) dropSession(ctx context.Context, id int64) {
	if s.Redis == nil {
		return
	}
	if err := s.Redis.Del(context.WithoutCancel(ctx), sessionKey(id)).Err(); err != nil {
		slog.WarnContext(ctx, "CCGateway: drop authorization session", "account_id", id, "err", err)
	}
}
