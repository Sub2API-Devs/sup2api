package iam

import (
	"context"
	"log/slog"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// How a login session started.
const (
	loginMethodPassword  = "password"
	loginMethodTwoFactor = "two_factor"
	loginMethodPasskey   = "passkey"
)

// LoginSession is one signed-in browser or device: a refresh token family with
// a live token.
type LoginSession struct {
	ID         string    `json:"id"`
	Method     string    `json:"method"`
	IP         string    `json:"ip"`
	UserAgent  string    `json:"user_agent"`
	CreatedAt  time.Time `json:"created_at"`
	LastUsedAt time.Time `json:"last_used_at"`
	Current    bool      `json:"current"`
}

type sessionMeta struct {
	method, ip, userAgent string
}

type sessionMetaKey struct{}

func sessionContext(c *gin.Context, method string) context.Context {
	ua := c.Request.UserAgent()
	if utf8.RuneCountInString(ua) > 512 {
		ua = string([]rune(ua)[:512])
	}
	return context.WithValue(c.Request.Context(), sessionMetaKey{}, sessionMeta{method: method, ip: c.ClientIP(), userAgent: ua})
}

func withLoginMethod(ctx context.Context, method string) context.Context {
	meta, _ := ctx.Value(sessionMetaKey{}).(sessionMeta)
	meta.method = method
	return context.WithValue(ctx, sessionMetaKey{}, meta)
}

// touchLoginSession records a new login session, or that an existing one was
// just used. A family from before these rows exists gets its row on the next
// refresh, with what is known then. A new login also clears the user's rows
// that have outlived any refresh token.
func (s *Service) touchLoginSession(ctx context.Context, tx pgx.Tx, userID int64, familyID string, isNew bool) error {
	meta, _ := ctx.Value(sessionMetaKey{}).(sessionMeta)
	if isNew {
		if _, err := tx.Exec(ctx, `DELETE FROM login_sessions WHERE user_id = $1 AND last_used_at < $2`, userID, time.Now().Add(-s.cfg.RefreshTokenTTL)); err != nil {
			return err
		}
	}
	_, err := tx.Exec(ctx, `INSERT INTO login_sessions (family_id, user_id, method, ip, user_agent) VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (family_id) DO UPDATE SET last_used_at = now(),
			ip = CASE WHEN EXCLUDED.ip = '' THEN login_sessions.ip ELSE EXCLUDED.ip END,
			user_agent = CASE WHEN EXCLUDED.user_agent = '' THEN login_sessions.user_agent ELSE EXCLUDED.user_agent END`,
		familyID, userID, meta.method, meta.ip, meta.userAgent)
	return err
}

// Sessions lists the user's live login sessions, most recently used first.
// currentFamily marks the caller's own.
func (s *Service) Sessions(ctx context.Context, userID int64, currentFamily string) ([]LoginSession, error) {
	rows, err := s.db.Pool.Query(ctx, `SELECT t.family_id, COALESCE(l.method, ''), COALESCE(l.ip, ''), COALESCE(l.user_agent, ''),
			COALESCE(l.created_at, t.created_at), COALESCE(l.last_used_at, t.created_at)
		FROM (SELECT family_id, min(created_at) AS created_at FROM refresh_tokens
			WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now() AND family_id <> ''
			GROUP BY family_id) t
		LEFT JOIN login_sessions l ON l.family_id = t.family_id
		ORDER BY 6 DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []LoginSession{}
	for rows.Next() {
		var v LoginSession
		if err := rows.Scan(&v.ID, &v.Method, &v.IP, &v.UserAgent, &v.CreatedAt, &v.LastUsedAt); err != nil {
			return nil, err
		}
		v.Current = v.ID == currentFamily
		out = append(out, v)
	}
	return out, rows.Err()
}

// RevokeSession ends one of the user's login sessions at once: its refresh
// token stops and its access token is rejected; the other sessions renew on
// their next 401.
func (s *Service) RevokeSession(ctx context.Context, userID int64, familyID string) error {
	return s.changeSessions(ctx, userID, oneSession(familyID), func(tx pgx.Tx) error {
		var live bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM refresh_tokens WHERE user_id = $1 AND family_id = $2 AND revoked_at IS NULL)`,
			userID, familyID).Scan(&live); err != nil {
			return err
		}
		if !live {
			return core.ErrNotFound
		}
		return audit.Audit(ctx, tx, userID, "user.session.revoke", "user", strconv.FormatInt(userID, 10), nil)
	})
}

// RevokeOtherSessions ends every login session of the user but keepFamily.
func (s *Service) RevokeOtherSessions(ctx context.Context, userID int64, keepFamily string) error {
	return s.changeSessions(ctx, userID, otherSessions(keepFamily), func(tx pgx.Tx) error {
		return audit.Audit(ctx, tx, userID, "user.session.revoke_others", "user", strconv.FormatInt(userID, 10), nil)
	})
}

// sessionsToEnd picks the refresh-token families invalidateSessions revokes:
// only that one family, or every family but keep (empty fields select all).
type sessionsToEnd struct{ only, keep string }

var allSessions = sessionsToEnd{}

func otherSessions(keep string) sessionsToEnd { return sessionsToEnd{keep: keep} }

func oneSession(family string) sessionsToEnd { return sessionsToEnd{only: family} }

// invalidateSessions stops every access token of userID at once
// (token_version+1, CONTRACTS §43.2) and revokes the refresh tokens and
// login sessions `which` selects; a session whose refresh token survives
// renews on its next 401. Callers lock the user row first and call
// sessionsChanged after commit.
func invalidateSessions(ctx context.Context, tx pgx.Tx, userID int64, which sessionsToEnd) (revoked int64, err error) {
	if _, err := tx.Exec(ctx, `UPDATE users SET token_version = token_version + 1 WHERE id = $1`, userID); err != nil {
		return 0, err
	}
	const families = `($2 = '' OR family_id = $2) AND ($3 = '' OR family_id IS DISTINCT FROM $3)`
	tag, err := tx.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL AND `+families,
		userID, which.only, which.keep)
	if err != nil {
		return 0, err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM login_sessions WHERE user_id = $1 AND `+families, userID, which.only, which.keep); err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// changeSessions runs fn (optional) and invalidateSessions in one transaction
// holding the user row lock, then announces the change. It takes no authz
// lock; a caller that needs one opens its own transaction in the authz ->
// user lock order and calls invalidateSessions and sessionsChanged itself.
func (s *Service) changeSessions(ctx context.Context, userID int64, which sessionsToEnd, fn func(tx pgx.Tx) error) error {
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockRefreshUser(ctx, tx, userID); err != nil {
			return err
		}
		if fn != nil {
			if err := fn(tx); err != nil {
				return err
			}
		}
		_, err := invalidateSessions(ctx, tx, userID, which)
		return err
	})
	if err != nil {
		return err
	}
	s.sessionsChanged(ctx, userID)
	return nil
}

// sessionsChanged drops the cached status of uids on this node and asks the
// other nodes to do the same (iam:user:changed). A lost message is covered by
// the reconnect reset and statusCacheTTL.
func (s *Service) sessionsChanged(ctx context.Context, uids ...int64) {
	for _, uid := range uids {
		s.forgetStatus(uid)
		if s.bus == nil {
			continue
		}
		if err := s.bus.Publish(ctx, core.ChannelUserSessionsChanged, []byte(strconv.FormatInt(uid, 10))); err != nil {
			slog.WarnContext(ctx, "iam: publish iam:user:changed failed", "user_id", uid, "err", err)
		}
	}
}

// currentFamily reads the session id from the caller's verified access token.
func (s *Service) currentFamily(c *gin.Context) string {
	token := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
	var claims accessClaims
	if _, err := jwt.ParseWithClaims(token, &claims, func(*jwt.Token) (any, error) { return s.cfg.JWTSecret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()})); err != nil {
		return ""
	}
	return claims.Family
}

// UpdateProfile changes what the user may change about themselves.
func (s *Service) UpdateProfile(ctx context.Context, userID int64, displayName string) error {
	displayName = strings.TrimSpace(displayName)
	if utf8.RuneCountInString(displayName) > 100 {
		return core.InvalidFields(core.FieldError{Field: "display_name", Code: "too_long", Message: "at most 100 characters"})
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE users SET display_name = $2, updated_at = now() WHERE id = $1 AND deleted_at IS NULL`, userID, displayName); err != nil {
			return err
		}
		return audit.Audit(ctx, tx, userID, "user.profile.update", "user", strconv.FormatInt(userID, 10), map[string]any{"display_name": displayName})
	})
}
