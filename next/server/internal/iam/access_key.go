package iam

import (
	"context"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const (
	accessKeyMaxPerUser  = 20
	accessKeyMinLifetime = time.Hour
	accessKeyTouchEvery  = time.Minute
)

// AccessKey is the API view of an access key (CONTRACTS §80). Lost lists the
// chosen permissions the user no longer holds: the key cannot use them, and
// gets them back if the user does.
type AccessKey struct {
	ID          int64      `json:"id"`
	Name        string     `json:"name"`
	Hint        string     `json:"hint"`
	Permissions []string   `json:"permissions"`
	Lost        []string   `json:"lost"`
	ExpiresAt   *time.Time `json:"expires_at"`
	LastUsedAt  *time.Time `json:"last_used_at"`
	LastUsedIP  string     `json:"last_used_ip"`
	CreatedAt   time.Time  `json:"created_at"`
	// Key is the secret: only in the response that creates it.
	Key string `json:"key,omitempty"`
}

// CreateAccessKeyInput is the body of POST /me/access-keys.
type CreateAccessKeyInput struct {
	Name        string     `json:"name"`
	Password    string     `json:"password"`
	Permissions []string   `json:"permissions"`
	ExpiresAt   *time.Time `json:"expires_at"`
}

// UpdateAccessKeyInput is the body of PATCH /me/access-keys/:id.
type UpdateAccessKeyInput struct {
	Name        *string  `json:"name"`
	Password    string   `json:"password"`
	Permissions []string `json:"permissions"`
}

func normalizeAccessKeyName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" || utf8.RuneCountInString(name) > 64 {
		return "", core.InvalidFields(core.FieldError{Field: "name", Code: "invalid", Message: "1 to 64 characters"})
	}
	return name, nil
}

// grantablePermissions checks a key's permissions against what the user holds
// right now, the rule of §80: a key is a subset of its user. It returns them
// sorted without duplicates. A superuser may choose any active permission.
// Permissions no access key may carry (authz.KeyAllowed) are not offered and,
// when held, are refused with their own detail (session_only) rather than as
// missing.
func (s *Service) grantablePermissions(ctx context.Context, userID int64, wanted []string) ([]string, error) {
	if len(wanted) == 0 {
		return nil, core.InvalidFields(core.FieldError{Field: "permissions", Code: "required", Message: "choose at least one permission"})
	}
	set, err := s.authz.PermissionSet(ctx, userID)
	if err != nil {
		return nil, err
	}
	active, err := s.authz.ActivePermissionKeys(ctx)
	if err != nil {
		return nil, err
	}
	known := make(map[string]struct{}, len(active))
	for _, k := range active {
		known[k] = struct{}{}
	}
	out := slices.Clone(wanted)
	slices.Sort(out)
	out = slices.Compact(out)
	var missing, sessionOnly []string
	for _, p := range out {
		if _, ok := known[p]; !ok || !set.Has(p) {
			missing = append(missing, p)
		} else if !authz.KeyAllowed(p) {
			sessionOnly = append(sessionOnly, p)
		}
	}
	if len(missing) > 0 {
		return nil, core.ErrPermissionDenied.WithMessage(t(ctx,
			"an access key can only have permissions you hold",
			"访问密钥只能拥有你自己的权限")).WithDetails(map[string]any{"missing": missing})
	}
	if len(sessionOnly) > 0 {
		return nil, core.ErrPermissionDenied.WithMessage(t(ctx,
			"these permissions can only be used in a signed-in session, not by an access key",
			"这些权限只能在登录会话中使用，不能授予访问密钥")).WithDetails(map[string]any{"session_only": sessionOnly})
	}
	return out, nil
}

func (s *Service) lostPermissions(ctx context.Context, userID int64, keys []*AccessKey) error {
	set, err := s.authz.PermissionSet(ctx, userID)
	if err != nil {
		return err
	}
	for _, k := range keys {
		k.Lost = []string{}
		for _, p := range k.Permissions {
			if !set.Has(p) || !authz.KeyAllowed(p) {
				k.Lost = append(k.Lost, p)
			}
		}
	}
	return nil
}

const accessKeyColumns = `id, name, token_hint, permissions, expires_at, last_used_at, last_used_ip, created_at`

func scanAccessKey(row pgx.Row) (*AccessKey, error) {
	k := &AccessKey{}
	err := row.Scan(&k.ID, &k.Name, &k.Hint, &k.Permissions, &k.ExpiresAt, &k.LastUsedAt, &k.LastUsedIP, &k.CreatedAt)
	return k, err
}

// AccessKeys lists the user's keys.
func (s *Service) AccessKeys(ctx context.Context, userID int64) ([]*AccessKey, error) {
	rows, err := s.db.Pool.Query(ctx, `SELECT `+accessKeyColumns+` FROM user_access_keys WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*AccessKey{}
	for rows.Next() {
		k, err := scanAccessKey(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, s.lostPermissions(ctx, userID, out)
}

// CreateAccessKey checks the password and the permissions and creates a key.
// The secret appears only in this result.
func (s *Service) CreateAccessKey(ctx context.Context, userID int64, in CreateAccessKeyInput, ip string) (*AccessKey, error) {
	name, err := normalizeAccessKeyName(in.Name)
	if err != nil {
		return nil, err
	}
	if in.ExpiresAt != nil && in.ExpiresAt.Before(time.Now().Add(accessKeyMinLifetime)) {
		return nil, core.InvalidFields(core.FieldError{Field: "expires_at", Code: "too_soon", Message: "at least one hour from now"})
	}
	if _, err := s.confirmPassword(ctx, userID, in.Password, ip); err != nil {
		return nil, err
	}
	perms, err := s.grantablePermissions(ctx, userID, in.Permissions)
	if err != nil {
		return nil, err
	}
	secret, err := randomToken()
	if err != nil {
		return nil, err
	}
	raw := core.AccessKeyPrefix + secret
	var key *AccessKey
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockRefreshUser(ctx, tx, userID); err != nil {
			return err
		}
		var n int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM user_access_keys WHERE user_id = $1`, userID).Scan(&n); err != nil {
			return err
		}
		if n >= accessKeyMaxPerUser {
			return core.ErrConflict.WithMessage(t(ctx, "too many access keys", "访问密钥数量已达上限"))
		}
		key, err = scanAccessKey(tx.QueryRow(ctx, `INSERT INTO user_access_keys (user_id, name, token_hash, token_hint, permissions, expires_at)
			VALUES ($1, $2, $3, $4, $5, $6) RETURNING `+accessKeyColumns, userID, name, hashToken(raw), raw[len(raw)-4:], perms, in.ExpiresAt))
		if err != nil {
			return err
		}
		return audit.Audit(ctx, tx, userID, "user.access_key.create", "user", strconv.FormatInt(userID, 10),
			map[string]any{"access_key_id": key.ID, "name": name, "permissions": perms})
	})
	if err != nil {
		return nil, err
	}
	key.Key = raw
	key.Lost = []string{}
	return key, nil
}

// UpdateAccessKey renames a key or replaces its permissions. Replacing them
// asks for the password, as creating a key does.
func (s *Service) UpdateAccessKey(ctx context.Context, userID, id int64, in UpdateAccessKeyInput, ip string) (*AccessKey, error) {
	var name *string
	if in.Name != nil {
		v, err := normalizeAccessKeyName(*in.Name)
		if err != nil {
			return nil, err
		}
		name = &v
	}
	var perms []string
	if in.Permissions != nil {
		if _, err := s.confirmPassword(ctx, userID, in.Password, ip); err != nil {
			return nil, err
		}
		var err error
		if perms, err = s.grantablePermissions(ctx, userID, in.Permissions); err != nil {
			return nil, err
		}
	}
	var key *AccessKey
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var err error
		key, err = scanAccessKey(tx.QueryRow(ctx, `UPDATE user_access_keys SET name = COALESCE($3, name), permissions = COALESCE($4, permissions)
			WHERE id = $1 AND user_id = $2 RETURNING `+accessKeyColumns, id, userID, name, perms))
		if store.IsNoRows(err) {
			return core.ErrNotFound
		}
		if err != nil {
			return err
		}
		return audit.Audit(ctx, tx, userID, "user.access_key.update", "user", strconv.FormatInt(userID, 10),
			map[string]any{"access_key_id": id, "name": key.Name, "permissions": key.Permissions})
	})
	if err != nil {
		return nil, err
	}
	return key, s.lostPermissions(ctx, userID, []*AccessKey{key})
}

// DeleteAccessKey revokes a key at once.
func (s *Service) DeleteAccessKey(ctx context.Context, userID, id int64) error {
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `DELETE FROM user_access_keys WHERE id = $1 AND user_id = $2`, id, userID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return core.ErrNotFound
		}
		return audit.Audit(ctx, tx, userID, "user.access_key.delete", "user", strconv.FormatInt(userID, 10), map[string]any{"access_key_id": id})
	})
}

// AccessKeyPermissions is the catalog a user chooses from: the core modules of
// the permissions they hold, with only those.
func (s *Service) AccessKeyPermissions(ctx context.Context, userID int64) ([]*authz.PermissionModule, error) {
	set, err := s.authz.PermissionSet(ctx, userID)
	if err != nil {
		return nil, err
	}
	modules, err := s.authz.ListPermissions(ctx)
	if err != nil {
		return nil, err
	}
	out := []*authz.PermissionModule{}
	for _, m := range modules {
		kept := m.Permissions[:0:0]
		for _, p := range m.Permissions {
			if (p.Status == "active" || p.Status == "") && set.Has(p.Key) && authz.KeyAllowed(p.Key) {
				kept = append(kept, p)
			}
		}
		if len(kept) > 0 && m.Source != "plugin" && (m.Status == "active" || m.Status == "") {
			m.Permissions = kept
			out = append(out, m)
		}
	}
	return out, nil
}

// VerifyAccessKey implements core.AccessKeyVerifier. The key must exist and be
// unexpired, and its user active. What it may do is decided per check by
// authz, which intersects the key's permissions with the user's current ones.
func (s *Service) VerifyAccessKey(ctx context.Context, raw, ip string) (core.AccessKeyIdentity, error) {
	var id core.AccessKeyIdentity
	var expiresAt, lastUsed *time.Time
	err := s.db.Pool.QueryRow(ctx, `SELECT id, user_id, permissions, expires_at, last_used_at FROM user_access_keys WHERE token_hash = $1`, hashToken(raw)).
		Scan(&id.KeyID, &id.UserID, &id.Permissions, &expiresAt, &lastUsed)
	if store.IsNoRows(err) {
		return id, core.ErrUnauthenticated.WithMessage("invalid access key")
	}
	if err != nil {
		return id, err
	}
	if expiresAt != nil && !expiresAt.After(time.Now()) {
		return id, core.ErrUnauthenticated.WithMessage("access key has expired")
	}
	active, _, err := s.isActiveWithVersion(ctx, id.UserID)
	if err != nil {
		return id, err
	}
	if !active {
		return id, core.ErrUnauthenticated.WithMessage("user is disabled or deleted")
	}
	// Stored keys may hold permissions no key may carry any more; they are
	// dropped here, the only source of the identity's permissions.
	id.Permissions = slices.DeleteFunc(id.Permissions, func(k string) bool { return !authz.KeyAllowed(k) })
	if lastUsed == nil || time.Since(*lastUsed) > accessKeyTouchEvery {
		if _, err := s.db.Pool.Exec(ctx, `UPDATE user_access_keys SET last_used_at = now(), last_used_ip = $2 WHERE id = $1`, id.KeyID, ip); err != nil {
			return id, err
		}
	}
	return id, nil
}
