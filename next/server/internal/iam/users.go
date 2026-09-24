package iam

import (
	"context"
	"net/mail"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// User statuses.
const (
	StatusActive   = "active"
	StatusDisabled = "disabled"
)

// User is the API view of a user.
type User struct {
	ID             int64      `json:"id"`
	Email          string     `json:"email"`
	DisplayName    string     `json:"display_name"`
	Status         string     `json:"status"`
	MaxConcurrency int        `json:"max_concurrency"`
	Roles          []string   `json:"roles"`
	GroupIDs       []int64    `json:"group_ids"`
	Balance        *string    `json:"balance,omitempty"` // only for callers with balance:all:read
	LastLoginAt    *time.Time `json:"last_login_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

const userSelect = `
SELECT u.id, u.email, u.display_name, u.status, u.max_concurrency, u.last_login_at, u.created_at, u.updated_at,
    COALESCE((SELECT array_agg(r.key ORDER BY r.key) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id), '{}'),
    COALESCE((SELECT array_agg(ug.group_id ORDER BY ug.group_id) FROM user_groups ug WHERE ug.user_id = u.id), '{}'),
    COALESCE((SELECT b.balance FROM user_balances b WHERE b.user_id = u.id), 0)::numeric(20,8)::text
FROM users u`

func scanUser(row pgx.Row) (*User, error) {
	var u User
	var balance string
	err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &u.Status, &u.MaxConcurrency, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		&u.Roles, &u.GroupIDs, &balance)
	if err != nil {
		return nil, err
	}
	u.Balance = &balance
	return &u, nil
}

// GetUser returns a non-deleted user or ErrNotFound.
func (s *Service) GetUser(ctx context.Context, id int64) (*User, error) {
	return s.getUser(ctx, s.db.Pool, id)
}

func (s *Service) getUser(ctx context.Context, q store.Querier, id int64) (*User, error) {
	u, err := scanUser(q.QueryRow(ctx, userSelect+` WHERE u.id = $1 AND u.deleted_at IS NULL`, id))
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage("user not found")
	}
	return u, err
}

// ListUsersFilter filters GET /users.
type ListUsersFilter struct {
	Query    string // matches email or display name
	Status   string
	Role     string // role key
	Page     int
	PageSize int
}

// ListUsers returns a page of non-deleted users ordered by id.
func (s *Service) ListUsers(ctx context.Context, f ListUsersFilter) ([]*User, int64, error) {
	where := ` WHERE u.deleted_at IS NULL`
	var args []any
	if q := strings.TrimSpace(f.Query); q != "" {
		args = append(args, "%"+escapeLike(q)+"%")
		where += ` AND (u.email ILIKE $1 OR u.display_name ILIKE $1)`
	}
	if f.Status != "" {
		args = append(args, f.Status)
		where += ` AND u.status = $` + strconv.Itoa(len(args))
	}
	if f.Role != "" {
		args = append(args, f.Role)
		where += ` AND EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.key = $` + strconv.Itoa(len(args)) + `)`
	}
	var total int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM users u`+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, f.PageSize, (f.Page-1)*f.PageSize)
	rows, err := s.db.Pool.Query(ctx, userSelect+where+` ORDER BY u.id LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []*User{}
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, u)
	}
	return out, total, rows.Err()
}

// CreateUserInput is the body of POST /users.
type CreateUserInput struct {
	Email          string   `json:"email"`
	DisplayName    string   `json:"display_name"`
	Password       string   `json:"password"`
	RoleKeys       []string `json:"role_keys"`
	MaxConcurrency *int     `json:"max_concurrency"`
}

// IsDefaultRoles reports whether keys is empty or exactly the default role.
func IsDefaultRoles(keys []string) bool {
	return len(keys) == 0 || (len(keys) == 1 && keys[0] == authz.RoleUser)
}

// CreateUser creates a user; empty RoleKeys assigns the default "user" role.
// actorID is used for the superuser grant rules (0 = system).
func (s *Service) CreateUser(ctx context.Context, actorID int64, in CreateUserInput) (*User, error) {
	var u *User
	var v int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var err error
		u, v, err = s.createUserTx(ctx, tx, actorID, in)
		return err
	})
	if err != nil {
		return nil, err
	}
	s.authz.Committed(ctx, v)
	return u, nil
}

func (s *Service) createUserTx(ctx context.Context, tx pgx.Tx, actorID int64, in CreateUserInput) (*User, int64, error) {
	email, fields := normalizeEmail(in.Email)
	if f := validatePassword("password", in.Password); f != nil {
		fields = append(fields, *f)
	}
	in.DisplayName = strings.TrimSpace(in.DisplayName)
	if utf8.RuneCountInString(in.DisplayName) > 100 {
		fields = append(fields, core.FieldError{Field: "display_name", Code: "too_long", Message: "at most 100 characters"})
	}
	maxConc := 5
	if in.MaxConcurrency != nil {
		maxConc = *in.MaxConcurrency
		if maxConc < 0 {
			fields = append(fields, core.FieldError{Field: "max_concurrency", Code: "invalid", Message: "must be >= 0"})
		}
	}
	if len(fields) > 0 {
		return nil, 0, core.InvalidFields(fields...)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), s.cost)
	if err != nil {
		return nil, 0, err
	}
	var id int64
	err = tx.QueryRow(ctx, `INSERT INTO users (email, display_name, password_hash, max_concurrency) VALUES ($1, $2, $3, $4) RETURNING id`,
		email, in.DisplayName, string(hash), maxConc).Scan(&id)
	if store.IsUniqueViolation(err, "") {
		return nil, 0, emailTaken()
	}
	if err != nil {
		return nil, 0, err
	}
	roles := in.RoleKeys
	if len(roles) == 0 {
		roles = []string{authz.RoleUser}
	}
	v, err := s.authz.SetUserRoles(ctx, tx, actorID, id, roles)
	if err != nil {
		return nil, 0, err
	}
	if err := s.emit(ctx, tx, "user.created", id, email, StatusActive); err != nil {
		return nil, 0, err
	}
	u, err := s.getUser(ctx, tx, id)
	return u, v, err
}

// UpdateUserInput is the body of PATCH /users/:id (all fields optional).
type UpdateUserInput struct {
	Email          *string `json:"email"`
	DisplayName    *string `json:"display_name"`
	Status         *string `json:"status"`
	MaxConcurrency *int    `json:"max_concurrency"`
	Password       *string `json:"password"`
}

var (
	errSelfDisable     = core.ErrConflict.WithMessage("you cannot disable or delete yourself")
	errProtectedTarget = core.ErrPermissionDenied.WithMessage("only a super admin can modify a super admin")
)

// guardTarget rejects changes to a superuser by a non-superuser.
func (s *Service) guardTarget(ctx context.Context, actorID, targetID int64) error {
	if actorID == 0 || actorID == targetID {
		return nil
	}
	targetSuper, err := s.authz.IsSuperuser(ctx, s.db.Pool, targetID)
	if err != nil {
		return err
	}
	if !targetSuper {
		return nil
	}
	actor, err := s.authz.PermissionSet(ctx, actorID)
	if err != nil {
		return err
	}
	if !actor.Superuser {
		return errProtectedTarget
	}
	return nil
}

// UpdateUser applies a partial update.
func (s *Service) UpdateUser(ctx context.Context, actorID, id int64, in UpdateUserInput) (*User, error) {
	var fields []core.FieldError
	var email string
	if in.Email != nil {
		email, fields = normalizeEmail(*in.Email)
	}
	if in.DisplayName != nil {
		*in.DisplayName = strings.TrimSpace(*in.DisplayName)
		if utf8.RuneCountInString(*in.DisplayName) > 100 {
			fields = append(fields, core.FieldError{Field: "display_name", Code: "too_long", Message: "at most 100 characters"})
		}
	}
	if in.Status != nil && *in.Status != StatusActive && *in.Status != StatusDisabled {
		fields = append(fields, core.FieldError{Field: "status", Code: "invalid", Message: "must be active or disabled"})
	}
	if in.MaxConcurrency != nil && *in.MaxConcurrency < 0 {
		fields = append(fields, core.FieldError{Field: "max_concurrency", Code: "invalid", Message: "must be >= 0"})
	}
	if in.Password != nil {
		if f := validatePassword("password", *in.Password); f != nil {
			fields = append(fields, *f)
		}
	}
	if len(fields) > 0 {
		return nil, core.InvalidFields(fields...)
	}
	if err := s.guardTarget(ctx, actorID, id); err != nil {
		return nil, err
	}
	var hash []byte
	if in.Password != nil {
		var err error
		if hash, err = bcrypt.GenerateFromPassword([]byte(*in.Password), s.cost); err != nil {
			return nil, err
		}
	}
	var v int64
	var u *User
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		cur, err := s.getUser(ctx, tx, id)
		if err != nil {
			return err
		}
		statusChange := in.Status != nil && *in.Status != cur.Status
		if statusChange {
			if v, err = s.authz.Bump(ctx, tx); err != nil {
				return err
			}
			if *in.Status == StatusDisabled {
				if actorID == id {
					return errSelfDisable
				}
				if err := s.authz.EnsureNotLastSuperAdmin(ctx, tx, id); err != nil {
					return err
				}
			}
		}
		_, err = tx.Exec(ctx, `
UPDATE users SET
    email = COALESCE($2, email),
    display_name = COALESCE($3, display_name),
    status = COALESCE($4, status),
    max_concurrency = COALESCE($5, max_concurrency),
    password_hash = COALESCE($6, password_hash),
    updated_at = now()
WHERE id = $1`, id, nilStr(email), in.DisplayName, in.Status, in.MaxConcurrency, nilBytes(hash))
		if store.IsUniqueViolation(err, "") {
			return emailTaken()
		}
		if err != nil {
			return err
		}
		if hash != nil || (statusChange && *in.Status == StatusDisabled) {
			if err := revokeAllRefreshTokens(ctx, tx, id); err != nil {
				return err
			}
		}
		if u, err = s.getUser(ctx, tx, id); err != nil {
			return err
		}
		return s.emit(ctx, tx, "user.updated", id, u.Email, u.Status)
	})
	if err != nil {
		return nil, err
	}
	s.forgetStatus(id)
	if v != 0 {
		s.authz.Committed(ctx, v)
	}
	return u, nil
}

// DeleteUser soft-deletes a user and revokes their refresh tokens.
func (s *Service) DeleteUser(ctx context.Context, actorID, id int64) error {
	if actorID == id {
		return errSelfDisable
	}
	if err := s.guardTarget(ctx, actorID, id); err != nil {
		return err
	}
	var v int64
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var err error
		if v, err = s.authz.Bump(ctx, tx); err != nil {
			return err
		}
		var email string
		err = tx.QueryRow(ctx, `SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, id).Scan(&email)
		if store.IsNoRows(err) {
			return core.ErrNotFound.WithMessage("user not found")
		}
		if err != nil {
			return err
		}
		if err := s.authz.EnsureNotLastSuperAdmin(ctx, tx, id); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE users SET deleted_at = now(), updated_at = now() WHERE id = $1`, id); err != nil {
			return err
		}
		if err := revokeAllRefreshTokens(ctx, tx, id); err != nil {
			return err
		}
		// The user's API keys go with the user: authentication already
		// rejects them, and left behind they would block deleting their group.
		if _, err := tx.Exec(ctx, `UPDATE api_keys SET deleted_at = now() WHERE user_id = $1 AND deleted_at IS NULL`, id); err != nil {
			return err
		}
		return s.emit(ctx, tx, "user.updated", id, email, "deleted")
	})
	if err != nil {
		return err
	}
	s.forgetStatus(id)
	s.authz.Committed(ctx, v)
	return nil
}

// SetUserRoles replaces a user's roles (PUT /users/:id/roles).
func (s *Service) SetUserRoles(ctx context.Context, actorID, id int64, roleKeys []string) (*User, error) {
	var v int64
	var u *User
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		cur, err := s.getUser(ctx, tx, id)
		if err != nil {
			return err
		}
		if v, err = s.authz.SetUserRoles(ctx, tx, actorID, id, roleKeys); err != nil {
			return err
		}
		if u, err = s.getUser(ctx, tx, id); err != nil {
			return err
		}
		if !slices.Equal(cur.Roles, u.Roles) {
			return s.emit(ctx, tx, "user.updated", id, u.Email, u.Status)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	s.authz.Committed(ctx, v)
	return u, nil
}

// ------------------------------------------------------------ helpers

func (s *Service) emit(ctx context.Context, tx pgx.Tx, typ string, userID int64, email, status string) error {
	if s.events == nil {
		return nil
	}
	return s.events.Emit(ctx, tx, core.Event{Type: typ, Payload: map[string]any{
		"user_id": userID, "email": email, "status": status,
	}})
}

func normalizeEmail(raw string) (string, []core.FieldError) {
	email := strings.ToLower(strings.TrimSpace(raw))
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email || len(email) > 255 {
		return email, []core.FieldError{{Field: "email", Code: "invalid", Message: "invalid email address"}}
	}
	return email, nil
}

func validatePassword(field, p string) *core.FieldError {
	switch {
	case utf8.RuneCountInString(p) < 8:
		return &core.FieldError{Field: field, Code: "too_short", Message: "at least 8 characters"}
	case len(p) > 72:
		return &core.FieldError{Field: field, Code: "too_long", Message: "at most 72 bytes"}
	}
	return nil
}

func emailTaken() error {
	return core.ErrConflict.WithMessage("email already in use").WithDetails(map[string]any{
		"fields": []core.FieldError{{Field: "email", Code: "taken", Message: "email already in use"}},
	})
}

func revokeAllRefreshTokens(ctx context.Context, q store.Querier, userID int64) error {
	_, err := q.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, userID)
	return err
}

func nilStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func nilBytes(b []byte) *string {
	if b == nil {
		return nil
	}
	s := string(b)
	return &s
}

func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}
