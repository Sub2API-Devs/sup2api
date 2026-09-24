// Package apikey implements user API keys: self-service and admin endpoints,
// and the gateway authenticator (core.APIKeyAuthenticator).
package apikey

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"math/big"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const (
	// KeyPrefix starts every client key.
	KeyPrefix     = "sk-s2a-"
	keyRandomLen  = 40
	keyLen        = len(KeyPrefix) + keyRandomLen
	displayPrefix = 12
	cacheTTL      = 60 * time.Second
	flushInterval = 10 * time.Second
	base62        = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
)

// Service serves API key endpoints and authenticates gateway requests.
type Service struct {
	db    *store.DB
	rdb   redis.UniversalClient // optional cache
	authz core.Authorizer

	mu      sync.Mutex
	touched map[int64]time.Time
}

var _ core.APIKeyAuthenticator = (*Service)(nil)

// New builds the service. rdb may be nil (no cache). Call Run to persist
// last_used_at in the background.
func New(db *store.DB, rdb redis.UniversalClient, authz core.Authorizer) *Service {
	return &Service{db: db, rdb: rdb, authz: authz, touched: map[int64]time.Time{}}
}

// RegisterRoutes mounts the API key endpoints.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Perm("GET", "/me/api-keys", "apikey:self:manage", s.listMine)
	r.Perm("POST", "/me/api-keys", "apikey:self:manage", s.createMine)
	r.Perm("DELETE", "/me/api-keys/:id", "apikey:self:manage", s.deleteMine)
	r.Perm("GET", "/api-keys", "apikey:all:read", s.listAll)
	r.Perm("PATCH", "/api-keys/:id", "apikey:all:manage", s.update)
	r.Perm("DELETE", "/api-keys/:id", "apikey:all:manage", s.deleteAny)
}

// Run flushes last_used_at every 10 s until ctx is done, then flushes once more.
func (s *Service) Run(ctx context.Context) {
	tk := time.NewTicker(flushInterval)
	defer tk.Stop()
	for {
		select {
		case <-ctx.Done():
			fctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			if err := s.FlushLastUsed(fctx); err != nil {
				slog.Warn("apikey: flush last_used_at", "err", err)
			}
			cancel()
			return
		case <-tk.C:
			if err := s.FlushLastUsed(ctx); err != nil {
				slog.WarnContext(ctx, "apikey: flush last_used_at", "err", err)
			}
		}
	}
}

// FlushLastUsed writes pending last_used_at updates in one statement.
func (s *Service) FlushLastUsed(ctx context.Context) error {
	s.mu.Lock()
	if len(s.touched) == 0 {
		s.mu.Unlock()
		return nil
	}
	pending := s.touched
	s.touched = map[int64]time.Time{}
	s.mu.Unlock()
	ids := make([]int64, 0, len(pending))
	ts := make([]time.Time, 0, len(pending))
	for id, at := range pending {
		ids = append(ids, id)
		ts = append(ts, at)
	}
	_, err := s.db.Pool.Exec(ctx, `UPDATE api_keys k SET last_used_at = v.t
		FROM (SELECT unnest($1::bigint[]) AS id, unnest($2::timestamptz[]) AS t) v
		WHERE k.id = v.id AND (k.last_used_at IS NULL OR k.last_used_at < v.t)`, ids, ts)
	if err != nil {
		// Put them back so the next tick retries.
		s.mu.Lock()
		for id, at := range pending {
			if cur, ok := s.touched[id]; !ok || cur.Before(at) {
				s.touched[id] = at
			}
		}
		s.mu.Unlock()
	}
	return err
}

func (s *Service) touch(id int64) {
	s.mu.Lock()
	s.touched[id] = time.Now().UTC()
	s.mu.Unlock()
}

// ---------------------------------------------------------------- key material

// generateKey returns a new client key: "sk-s2a-" + 40 base62 characters.
func generateKey() (string, error) {
	b := make([]byte, keyLen)
	copy(b, KeyPrefix)
	max := big.NewInt(int64(len(base62)))
	for i := len(KeyPrefix); i < keyLen; i++ {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		b[i] = base62[n.Int64()]
	}
	return string(b), nil
}

// HashKey returns the sha256 hex stored in api_keys.key_hash.
func HashKey(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func cacheKey(hash string) string { return "apikey:" + hash }

// ---------------------------------------------------------------- authenticator

// cached is the Redis representation of a key lookup. It stores facts, not a
// verdict, so expiry is evaluated at use time.
type cached struct {
	Found              bool       `json:"found"`
	KeyID              int64      `json:"key_id,omitempty"`
	UserID             int64      `json:"user_id,omitempty"`
	KeyStatus          string     `json:"key_status,omitempty"`
	ExpiresAt          *time.Time `json:"expires_at,omitempty"`
	UserActive         bool       `json:"user_active,omitempty"`
	UserMaxConcurrency int        `json:"user_max_concurrency,omitempty"`
	GroupID            int64      `json:"group_id,omitempty"`
	GroupName          string     `json:"group_name,omitempty"`
	GroupStatus        string     `json:"group_status,omitempty"`
	RateMultiplier     string     `json:"rate_multiplier,omitempty"`
	ModelAllowlist     []string   `json:"model_allowlist,omitempty"`
	GroupAvailable     bool       `json:"group_available,omitempty"`
}

// Authenticate resolves a raw client key into a principal.
func (s *Service) Authenticate(ctx context.Context, rawKey string) (*core.APIKeyPrincipal, error) {
	rawKey = strings.TrimSpace(rawKey)
	if len(rawKey) != keyLen || !strings.HasPrefix(rawKey, KeyPrefix) {
		return nil, core.ErrUnauthenticated.WithMessage("invalid api key")
	}
	hash := HashKey(rawKey)
	e, err := s.lookup(ctx, hash)
	if err != nil {
		return nil, err
	}
	if !e.Found || e.KeyStatus != "active" {
		return nil, core.ErrUnauthenticated.WithMessage("invalid api key")
	}
	if e.ExpiresAt != nil && !time.Now().Before(*e.ExpiresAt) {
		return nil, core.ErrUnauthenticated.WithMessage("api key expired")
	}
	if !e.UserActive {
		return nil, core.ErrUnauthenticated.WithMessage("user disabled")
	}
	if e.GroupStatus != "active" || !e.GroupAvailable {
		return nil, core.ErrPermissionDenied.WithMessage("group not available")
	}
	ok, err := s.authz.Can(ctx, e.UserID, "gateway:use")
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, core.ErrPermissionDenied.WithDetails(map[string]any{"permission": "gateway:use"})
	}
	rate, err := decimal.NewFromString(e.RateMultiplier)
	if err != nil {
		rate = decimal.NewFromInt(1)
	}
	allow := e.ModelAllowlist
	if allow == nil {
		allow = []string{}
	}
	s.touch(e.KeyID)
	return &core.APIKeyPrincipal{
		KeyID:              e.KeyID,
		UserID:             e.UserID,
		UserMaxConcurrency: e.UserMaxConcurrency,
		Group: core.GroupInfo{
			ID:             e.GroupID,
			Name:           e.GroupName,
			Status:         e.GroupStatus,
			RateMultiplier: rate,
			ModelAllowlist: allow,
		},
	}, nil
}

func (s *Service) lookup(ctx context.Context, hash string) (*cached, error) {
	if s.rdb != nil {
		b, err := s.rdb.Get(ctx, cacheKey(hash)).Bytes()
		if err == nil {
			var e cached
			if json.Unmarshal(b, &e) == nil {
				return &e, nil
			}
		} else if err != redis.Nil {
			slog.WarnContext(ctx, "apikey: cache read", "err", err)
		}
	}
	e := &cached{}
	var rate string
	err := s.db.Pool.QueryRow(ctx, `SELECT k.id, k.user_id, k.status, k.expires_at,
			(u.status = 'active' AND u.deleted_at IS NULL), u.max_concurrency,
			g.id, g.name, g.status, g.rate_multiplier::text, g.model_allowlist,
			(g.visibility = 'public' OR EXISTS (SELECT 1 FROM user_groups ug WHERE ug.user_id = k.user_id AND ug.group_id = g.id))
		FROM api_keys k
		JOIN users u ON u.id = k.user_id
		JOIN groups g ON g.id = k.group_id
		WHERE k.key_hash = $1 AND k.deleted_at IS NULL`, hash).Scan(
		&e.KeyID, &e.UserID, &e.KeyStatus, &e.ExpiresAt, &e.UserActive, &e.UserMaxConcurrency,
		&e.GroupID, &e.GroupName, &e.GroupStatus, &rate, &e.ModelAllowlist, &e.GroupAvailable)
	switch {
	case store.IsNoRows(err):
		e = &cached{Found: false}
	case err != nil:
		return nil, err
	default:
		e.Found = true
		e.RateMultiplier = rate
	}
	if s.rdb != nil {
		b, _ := json.Marshal(e)
		if err := s.rdb.Set(ctx, cacheKey(hash), b, cacheTTL).Err(); err != nil {
			slog.WarnContext(ctx, "apikey: cache write", "err", err)
		}
	}
	return e, nil
}

func (s *Service) dropCache(ctx context.Context, hash string) {
	if s.rdb == nil || hash == "" {
		return
	}
	if err := s.rdb.Del(ctx, cacheKey(hash)).Err(); err != nil {
		slog.WarnContext(ctx, "apikey: cache drop", "err", err)
	}
}

// ---------------------------------------------------------------- HTTP

// APIKey is the API view of an api_keys row.
type APIKey struct {
	ID         int64      `json:"id"`
	UserID     int64      `json:"user_id"`
	UserEmail  string     `json:"user_email,omitempty"`
	Name       string     `json:"name"`
	KeyPrefix  string     `json:"key_prefix"`
	GroupID    int64      `json:"group_id"`
	GroupName  string     `json:"group_name"`
	Status     string     `json:"status"`
	ExpiresAt  *time.Time `json:"expires_at"`
	LastUsedAt *time.Time `json:"last_used_at"`
	CreatedAt  time.Time  `json:"created_at"`
	// Key is the plaintext key, returned only once by create.
	Key string `json:"key,omitempty"`
}

const selectKey = `SELECT k.id, k.user_id, u.email, k.name, k.key_prefix, k.group_id, g.name, k.status,
	k.expires_at, k.last_used_at, k.created_at
	FROM api_keys k JOIN users u ON u.id = k.user_id JOIN groups g ON g.id = k.group_id`

func scanKey(row pgx.Row) (*APIKey, error) {
	var k APIKey
	err := row.Scan(&k.ID, &k.UserID, &k.UserEmail, &k.Name, &k.KeyPrefix, &k.GroupID, &k.GroupName,
		&k.Status, &k.ExpiresAt, &k.LastUsedAt, &k.CreatedAt)
	return &k, err
}

func t(ctx context.Context, en, zh string) string {
	if core.Locale(ctx) == "zh" {
		return zh
	}
	return en
}

func notFound(ctx context.Context) error {
	return core.ErrNotFound.WithMessage(t(ctx, "api key not found", "API Key 不存在"))
}

func (s *Service) query(c *gin.Context, where string, args []any, hideEmail bool) {
	ctx := c.Request.Context()
	page, size := httpapi.Pagination(c)
	var total int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM api_keys k JOIN users u ON u.id = k.user_id
		JOIN groups g ON g.id = k.group_id`+where, args...).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	n := len(args)
	rows, err := s.db.Pool.Query(ctx, selectKey+where+` ORDER BY k.id DESC LIMIT $`+itoa(n+1)+` OFFSET $`+itoa(n+2),
		append(args, size, (page-1)*size)...)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	items := []*APIKey{}
	for rows.Next() {
		k, err := scanKey(rows)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		if hideEmail {
			k.UserEmail = ""
		}
		items = append(items, k)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
}

func itoa(n int) string { return strconv.Itoa(n) }

func (s *Service) listMine(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	s.query(c, ` WHERE k.deleted_at IS NULL AND k.user_id = $1`, []any{uid}, true)
}

func (s *Service) listAll(c *gin.Context) {
	where := ` WHERE k.deleted_at IS NULL`
	var args []any
	add := func(cond string, v any) {
		args = append(args, v)
		where += " AND " + strings.ReplaceAll(cond, "?", "$"+itoa(len(args)))
	}
	for _, f := range []struct{ param, cond string }{
		{"user_id", "k.user_id = ?"},
		{"group_id", "k.group_id = ?"},
	} {
		if v := c.Query(f.param); v != "" {
			id, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid "+f.param))
				return
			}
			add(f.cond, id)
		}
	}
	if v := c.Query("status"); v != "" {
		add("k.status = ?", v)
	}
	if v := strings.TrimSpace(c.Query("q")); v != "" {
		add("(k.name ILIKE '%' || ? || '%' OR u.email ILIKE '%' || ? || '%' OR k.key_prefix LIKE ? || '%')", v)
	}
	s.query(c, where, args, false)
}

func (s *Service) loadKey(ctx context.Context, id int64) (*APIKey, error) {
	k, err := scanKey(s.db.Pool.QueryRow(ctx, selectKey+` WHERE k.id = $1 AND k.deleted_at IS NULL`, id))
	if store.IsNoRows(err) {
		return nil, notFound(ctx)
	}
	return k, err
}

// groupAvailable reports whether group is active and usable by user.
func groupAvailable(ctx context.Context, q store.Querier, userID, groupID int64) (bool, error) {
	var ok bool
	err := q.QueryRow(ctx, `SELECT true FROM groups g WHERE g.id = $2 AND g.status = 'active'
		AND (g.visibility = 'public' OR EXISTS (SELECT 1 FROM user_groups ug WHERE ug.group_id = g.id AND ug.user_id = $1))`,
		userID, groupID).Scan(&ok)
	if store.IsNoRows(err) {
		return false, nil
	}
	return ok, err
}

func groupUnavailable(ctx context.Context) error {
	return core.InvalidFields(core.FieldError{Field: "group_id", Code: "not_available",
		Message: t(ctx, "the group does not exist or is not available to the user", "分组不存在或用户无权使用")})
}

func validName(ctx context.Context, name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" || utf8.RuneCountInString(name) > 100 {
		return "", core.InvalidFields(core.FieldError{Field: "name", Code: "invalid",
			Message: t(ctx, "name must be 1-100 characters", "名称长度须为 1-100 个字符")})
	}
	return name, nil
}

func futureExpiry(ctx context.Context, at *time.Time) error {
	if at != nil && !at.After(time.Now()) {
		return core.InvalidFields(core.FieldError{Field: "expires_at", Code: "invalid",
			Message: t(ctx, "expiry must be in the future", "过期时间必须晚于当前时间")})
	}
	return nil
}

func (s *Service) createMine(c *gin.Context) {
	ctx := c.Request.Context()
	uid, _ := core.UserID(ctx)
	var in struct {
		Name      string     `json:"name"`
		GroupID   int64      `json:"group_id"`
		ExpiresAt *time.Time `json:"expires_at"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	name, err := validName(ctx, in.Name)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if err := futureExpiry(ctx, in.ExpiresAt); err != nil {
		httpapi.Fail(c, err)
		return
	}
	ok, err := groupAvailable(ctx, s.db.Pool, uid, in.GroupID)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if !ok {
		httpapi.Fail(c, groupUnavailable(ctx))
		return
	}
	raw, err := generateKey()
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	hash := HashKey(raw)
	var id int64
	if err := s.db.Pool.QueryRow(ctx, `INSERT INTO api_keys (user_id, group_id, name, key_prefix, key_hash, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		uid, in.GroupID, name, raw[:displayPrefix], hash, in.ExpiresAt).Scan(&id); err != nil {
		httpapi.Fail(c, err)
		return
	}
	// A negative lookup of this hash cannot be cached (the key is new), but
	// drop it anyway to be safe.
	s.dropCache(ctx, hash)
	k, err := s.loadKey(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	k.UserEmail = ""
	k.Key = raw
	httpapi.Created(c, k)
}

func (s *Service) softDelete(ctx context.Context, id int64, ownerID *int64) error {
	var hash string
	err := s.db.Pool.QueryRow(ctx, `UPDATE api_keys SET deleted_at = now()
		WHERE id = $1 AND deleted_at IS NULL AND ($2::bigint IS NULL OR user_id = $2) RETURNING key_hash`,
		id, ownerID).Scan(&hash)
	if store.IsNoRows(err) {
		return notFound(ctx)
	}
	if err != nil {
		return err
	}
	s.dropCache(ctx, hash)
	return nil
}

func (s *Service) deleteMine(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	uid, _ := core.UserID(c.Request.Context())
	if err := s.softDelete(c.Request.Context(), id, &uid); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

func (s *Service) deleteAny(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if err := s.softDelete(c.Request.Context(), id, nil); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.NoContent(c)
}

// nullable distinguishes an absent JSON field from an explicit null.
type nullable[T any] struct {
	Set   bool
	Valid bool
	V     T
}

func (n *nullable[T]) UnmarshalJSON(b []byte) error {
	n.Set = true
	if string(b) == "null" {
		n.Valid = false
		return nil
	}
	n.Valid = true
	return json.Unmarshal(b, &n.V)
}

func (s *Service) update(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		Name      *string             `json:"name"`
		Status    *string             `json:"status"`
		GroupID   *int64              `json:"group_id"`
		ExpiresAt nullable[time.Time] `json:"expires_at"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.Name != nil {
		n, err := validName(ctx, *in.Name)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		in.Name = &n
	}
	if in.Status != nil && *in.Status != "active" && *in.Status != "disabled" {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "status", Code: "invalid",
			Message: t(ctx, "status must be active or disabled", "状态必须为 active 或 disabled")}))
		return
	}
	if in.ExpiresAt.Set && in.ExpiresAt.Valid {
		if err := futureExpiry(ctx, &in.ExpiresAt.V); err != nil {
			httpapi.Fail(c, err)
			return
		}
	}
	var hash string
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var owner int64
		if err := tx.QueryRow(ctx, `SELECT user_id, key_hash FROM api_keys WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
			id).Scan(&owner, &hash); err != nil {
			if store.IsNoRows(err) {
				return notFound(ctx)
			}
			return err
		}
		if in.GroupID != nil {
			ok, err := groupAvailable(ctx, tx, owner, *in.GroupID)
			if err != nil {
				return err
			}
			if !ok {
				return groupUnavailable(ctx)
			}
		}
		var exp *time.Time
		if in.ExpiresAt.Valid {
			exp = &in.ExpiresAt.V
		}
		_, err := tx.Exec(ctx, `UPDATE api_keys SET
			name = COALESCE($2, name),
			status = COALESCE($3, status),
			group_id = COALESCE($4, group_id),
			expires_at = CASE WHEN $5 THEN $6 ELSE expires_at END
			WHERE id = $1`, id, in.Name, in.Status, in.GroupID, in.ExpiresAt.Set, exp)
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.dropCache(ctx, hash)
	k, err := s.loadKey(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, k)
}
