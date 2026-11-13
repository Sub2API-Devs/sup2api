// Package iam implements console identity: users, login with JWT access
// tokens and rotating refresh tokens and the super
// admin bootstrap. It implements core.TokenVerifier.
package iam

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"log/slog"
	"math"
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
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// statusCacheTTL bounds how long a disabled user's access token keeps
// working on a node that missed the authz:changed or iam:user:changed
// broadcast.
const statusCacheTTL = 30 * time.Second

// Deps are the dependencies of Service.
type Deps struct {
	DB     *store.DB
	Redis  redis.Cmdable
	Config *config.Config
	Events core.EventPublisher
	Authz  *authz.Service
	// Bus announces ended sessions to the other nodes (iam:user:changed).
	// Optional: without it only this node's status cache is dropped.
	Bus core.Bus
	// Cipher seals the two-factor secrets.
	Cipher *secret.Cipher
	// BcryptCost defaults to bcrypt.DefaultCost (tests lower it).
	BcryptCost int
	// PriceRulesChanged drops the cached price rules on every node
	// (billing.Service.PriceRulesChanged): deleting a user deletes those of
	// their personal segment. Optional.
	PriceRulesChanged func(ctx context.Context)
}

// Service is the iam module.
type Service struct {
	db     *store.DB
	rdb    redis.Cmdable
	cfg    *config.Config
	events core.EventPublisher
	authz  *authz.Service
	bus    core.Bus
	cipher *secret.Cipher
	cost   int

	priceRulesChanged func(ctx context.Context)

	limiter *loginLimiter

	dummyHash []byte

	mu          sync.Mutex
	status      map[int64]statusEntry
	statusEpoch uint64
}

type statusEntry struct {
	active       bool
	tokenVersion int
	at           time.Time
}

var (
	_ core.TokenVerifier     = (*Service)(nil)
	_ core.SessionVerifier   = (*Service)(nil)
	_ core.AccessKeyVerifier = (*Service)(nil)
	_ core.StepUpVerifier    = (*Service)(nil)
)

// New creates the service. The authz service must be started before
// Bootstrap is called (built-in roles are seeded by authz.Start).
func New(d Deps) *Service {
	if d.BcryptCost == 0 {
		d.BcryptCost = bcrypt.DefaultCost
	}
	if d.PriceRulesChanged == nil {
		d.PriceRulesChanged = func(context.Context) {}
	}
	s := &Service{db: d.DB, rdb: d.Redis, cfg: d.Config, events: d.Events, authz: d.Authz, bus: d.Bus, cipher: d.Cipher, cost: d.BcryptCost, status: map[int64]statusEntry{},
		priceRulesChanged: d.PriceRulesChanged, limiter: newLoginLimiter(d.Redis)}
	s.dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password-for-timing"), s.cost)
	if d.Authz != nil {
		// Status changes (disable/delete) bump the authz version.
		d.Authz.OnChange(s.clearStatusCache)
	}
	if d.Bus != nil {
		s.subscribe(d.Bus)
	}
	return s
}

// subscribe keeps the status cache in step with sessions ended on other
// nodes; after a reconnect, whose missed messages are lost, it drops it all.
func (s *Service) subscribe(bus core.Bus) {
	bus.Subscribe(core.ChannelUserSessionsChanged, func(payload []byte) {
		uid, err := strconv.ParseInt(string(payload), 10, 64)
		if err != nil {
			s.clearStatusCache()
			return
		}
		s.forgetStatus(uid)
	})
	if r, ok := bus.(core.BusReconnects); ok {
		r.OnReconnect(s.clearStatusCache)
	}
}

func (s *Service) clearStatusCache() {
	s.mu.Lock()
	s.statusEpoch++
	s.status = map[int64]statusEntry{}
	s.mu.Unlock()
}

func (s *Service) forgetStatus(userID int64) {
	s.mu.Lock()
	s.statusEpoch++
	delete(s.status, userID)
	s.mu.Unlock()
}

// ------------------------------------------------------------ tokens

type accessClaims struct {
	jwt.RegisteredClaims
	TokenVersion int `json:"tv,omitempty"` // token_version from users table (SEC-M1)
	// Family is the login session, so the console can tell which one is its own.
	Family string `json:"fam,omitempty"`
}

func (s *Service) issueAccessToken(userID int64, tokenVersion int, family string) (string, error) {
	now := time.Now()
	claims := accessClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.cfg.AccessTokenTTL)),
		},
		TokenVersion: tokenVersion,
		Family:       family,
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.cfg.JWTSecret)
}

// VerifyAccessToken implements core.TokenVerifier: checks signature and
// expiry, then that the user still exists, is active, and token_version matches.
func (s *Service) VerifyAccessToken(ctx context.Context, token string) (int64, error) {
	uid, _, err := s.VerifySession(ctx, token)
	return uid, err
}

// VerifySession implements core.SessionVerifier: VerifyAccessToken that also
// returns the token's login session.
func (s *Service) VerifySession(ctx context.Context, token string) (int64, string, error) {
	var claims accessClaims
	_, err := jwt.ParseWithClaims(token, &claims, func(*jwt.Token) (any, error) { return s.cfg.JWTSecret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())
	if err != nil {
		return 0, "", core.ErrUnauthenticated.WithCause(err)
	}
	uid, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil || uid <= 0 {
		return 0, "", core.ErrUnauthenticated.WithMessage("invalid token subject")
	}
	active, currentVersion, err := s.isActiveWithVersion(ctx, uid, claims.TokenVersion)
	if err != nil {
		return 0, "", err
	}
	if !active {
		return 0, "", core.ErrUnauthenticated.WithMessage("user is disabled or deleted")
	}
	// SEC-M1: reject tokens from before password change / logout-all / disable
	if claims.TokenVersion != currentVersion {
		return 0, "", core.ErrUnauthenticated.WithMessage("token has been invalidated")
	}
	return uid, claims.Family, nil
}

// isActiveWithVersion reads the user's status through the cache. seen is the
// token_version a signed token carries: a cached entry older than that missed
// a change this node was not told about (the server CLI has no bus), so it is
// read again instead of rejecting the new login for up to statusCacheTTL. A
// deleted user is cached with the highest version, since no token can be
// newer than that: their leftover tokens do not read the row on every request.
func (s *Service) isActiveWithVersion(ctx context.Context, uid int64, seen int) (bool, int, error) {
	s.mu.Lock()
	e, ok := s.status[uid]
	epoch := s.statusEpoch
	s.mu.Unlock()
	if ok && time.Since(e.at) < statusCacheTTL && e.tokenVersion >= seen {
		return e.active, e.tokenVersion, nil
	}
	var active bool
	var version int
	err := s.db.Pool.QueryRow(ctx, `SELECT status = 'active', token_version FROM users WHERE id = $1 AND deleted_at IS NULL`, uid).Scan(&active, &version)
	if store.IsNoRows(err) {
		active, version, err = false, math.MaxInt, nil
	}
	if err != nil {
		return false, 0, err
	}
	s.mu.Lock()
	if epoch == s.statusEpoch {
		s.status[uid] = statusEntry{active: active, tokenVersion: version, at: time.Now()}
	}
	s.mu.Unlock()
	return active, version, nil
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
