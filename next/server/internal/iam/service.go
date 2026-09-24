// Package iam implements console identity: users, login with JWT access
// tokens and rotating refresh tokens, step-up confirmation and the super
// admin bootstrap. It implements core.TokenVerifier and core.StepUpVerifier.
package iam

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// StepUpTTL is the lifetime of a step-up token.
const StepUpTTL = 5 * time.Minute

// statusCacheTTL bounds how long a disabled user's access token keeps
// working on a node that missed the authz:changed broadcast.
const statusCacheTTL = 30 * time.Second

// Deps are the dependencies of Service.
type Deps struct {
	DB     *store.DB
	Redis  redis.Cmdable
	Config *config.Config
	Events core.EventPublisher
	Authz  *authz.Service
	// BcryptCost defaults to bcrypt.DefaultCost (tests lower it).
	BcryptCost int
}

// Service is the iam module.
type Service struct {
	db     *store.DB
	rdb    redis.Cmdable
	cfg    *config.Config
	events core.EventPublisher
	authz  *authz.Service
	cost   int

	limiter *loginLimiter

	dummyHash []byte

	mu     sync.Mutex
	status map[int64]statusEntry
}

type statusEntry struct {
	active bool
	at     time.Time
}

var (
	_ core.TokenVerifier  = (*Service)(nil)
	_ core.StepUpVerifier = (*Service)(nil)
)

// New creates the service. The authz service must be started before
// Bootstrap is called (built-in roles are seeded by authz.Start).
func New(d Deps) *Service {
	if d.BcryptCost == 0 {
		d.BcryptCost = bcrypt.DefaultCost
	}
	s := &Service{db: d.DB, rdb: d.Redis, cfg: d.Config, events: d.Events, authz: d.Authz, cost: d.BcryptCost, status: map[int64]statusEntry{},
		limiter: newLoginLimiter(d.Redis)}
	s.dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password-for-timing"), s.cost)
	if d.Authz != nil {
		// Status changes (disable/delete) bump the authz version.
		d.Authz.OnChange(s.clearStatusCache)
	}
	return s
}

func (s *Service) clearStatusCache() {
	s.mu.Lock()
	s.status = map[int64]statusEntry{}
	s.mu.Unlock()
}

func (s *Service) forgetStatus(userID int64) {
	s.mu.Lock()
	delete(s.status, userID)
	s.mu.Unlock()
}

// ------------------------------------------------------------ tokens

type accessClaims struct {
	jwt.RegisteredClaims
}

func (s *Service) issueAccessToken(userID int64) (string, error) {
	now := time.Now()
	claims := accessClaims{jwt.RegisteredClaims{
		Subject:   strconv.FormatInt(userID, 10),
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(s.cfg.AccessTokenTTL)),
	}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.cfg.JWTSecret)
}

// VerifyAccessToken implements core.TokenVerifier: checks signature and
// expiry, then that the user still exists and is active.
func (s *Service) VerifyAccessToken(ctx context.Context, token string) (int64, error) {
	var claims accessClaims
	_, err := jwt.ParseWithClaims(token, &claims, func(*jwt.Token) (any, error) { return s.cfg.JWTSecret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())
	if err != nil {
		return 0, core.ErrUnauthenticated.WithCause(err)
	}
	uid, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil || uid <= 0 {
		return 0, core.ErrUnauthenticated.WithMessage("invalid token subject")
	}
	active, err := s.isActive(ctx, uid)
	if err != nil {
		return 0, err
	}
	if !active {
		return 0, core.ErrUnauthenticated.WithMessage("user is disabled or deleted")
	}
	return uid, nil
}

func (s *Service) isActive(ctx context.Context, uid int64) (bool, error) {
	s.mu.Lock()
	e, ok := s.status[uid]
	s.mu.Unlock()
	if ok && time.Since(e.at) < statusCacheTTL {
		return e.active, nil
	}
	var active bool
	err := s.db.Pool.QueryRow(ctx, `SELECT status = 'active' FROM users WHERE id = $1 AND deleted_at IS NULL`, uid).Scan(&active)
	if store.IsNoRows(err) {
		active, err = false, nil
	}
	if err != nil {
		return false, err
	}
	s.mu.Lock()
	s.status[uid] = statusEntry{active: active, at: time.Now()}
	s.mu.Unlock()
	return active, nil
}

func randomToken() (string, error) {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b[:]), nil
}

func hashToken(t string) string {
	h := sha256.Sum256([]byte(t))
	return hex.EncodeToString(h[:])
}

// ------------------------------------------------------------ step-up

func stepUpKey(token string) string { return "stepup:" + token }

// StepUp verifies the user's password and returns a step-up token.
func (s *Service) StepUp(ctx context.Context, userID int64, password string) (string, error) {
	var hash string
	err := s.db.Pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL AND status = 'active'`, userID).Scan(&hash)
	if store.IsNoRows(err) {
		return "", core.ErrUnauthenticated
	}
	if err != nil {
		return "", err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return "", core.ErrInvalidArgument.WithMessage("incorrect password").WithDetails(map[string]any{
			"fields": []core.FieldError{{Field: "password", Code: "incorrect", Message: "incorrect password"}},
		})
	}
	token, err := randomToken()
	if err != nil {
		return "", err
	}
	if err := s.rdb.Set(ctx, stepUpKey(token), strconv.FormatInt(userID, 10), StepUpTTL).Err(); err != nil {
		return "", core.ErrUnavailable.WithCause(err)
	}
	return token, nil
}

// VerifyStepUp implements core.StepUpVerifier. A token may be reused by the
// same user until it expires.
func (s *Service) VerifyStepUp(ctx context.Context, userID int64, token string) error {
	if token == "" {
		return core.ErrStepUpRequired
	}
	v, err := s.rdb.Get(ctx, stepUpKey(token)).Result()
	if err == redis.Nil {
		return core.ErrStepUpRequired.WithMessage("step-up token expired or invalid")
	}
	if err != nil {
		return core.ErrUnavailable.WithCause(err)
	}
	if v != strconv.FormatInt(userID, 10) {
		return core.ErrStepUpRequired.WithMessage("step-up token belongs to another user")
	}
	return nil
}

// ------------------------------------------------------------ bootstrap

// Bootstrap creates the first super admin from config when the database has
// no users. Without configured credentials it only logs a warning.
func (s *Service) Bootstrap(ctx context.Context) error {
	email, password := s.cfg.BootstrapAdminEmail, s.cfg.BootstrapAdminPassword
	var created *User
	var version int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext('sub2api:iam:bootstrap'))`); err != nil {
			return err
		}
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE deleted_at IS NULL)`).Scan(&exists); err != nil {
			return err
		}
		if exists {
			return nil
		}
		if email == "" || password == "" {
			slog.WarnContext(ctx, "iam: no users exist and SUB2API_BOOTSTRAP_ADMIN_EMAIL/PASSWORD are not set")
			return nil
		}
		u, v, err := s.createUserTx(ctx, tx, 0, CreateUserInput{
			Email: email, DisplayName: "Administrator", Password: password,
			RoleKeys: []string{authz.RoleSuperAdmin},
		})
		if err != nil {
			return fmt.Errorf("bootstrap admin: %w", err)
		}
		created, version = u, v
		return nil
	})
	if err != nil {
		return err
	}
	if created != nil {
		s.authz.Committed(ctx, version)
		slog.InfoContext(ctx, "iam: bootstrap super admin created", "email", created.Email, "user_id", created.ID)
	}
	return nil
}
