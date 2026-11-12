package iam

import (
	"context"
	"errors"
	"net/mail"
	"slices"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/segment"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// User statuses.
const (
	StatusActive   = "active"
	StatusDisabled = "disabled"
)

// User is the API view of a user.
type User struct {
	ID          int64      `json:"id"`
	Email       string     `json:"email"`
	DisplayName string     `json:"display_name"`
	Status      string     `json:"status"`
	Roles       []string   `json:"roles"`
	Balance     *string    `json:"balance,omitempty"` // only for callers with balance:all:read
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	// Segment is the user group the user is priced by (CONTRACTS §97). A
	// personal one goes by the user's own email, so there is nothing to mask.
	// It is an administrator's label: the user's own token response omits it.
	Segment core.SegmentRef `json:"segment,omitzero"`
}

const userSelect = `
SELECT u.id, u.email, u.display_name, u.status, u.last_login_at, u.created_at, u.updated_at,
    COALESCE((SELECT array_agg(r.key ORDER BY r.key) FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id), '{}'),
    ` + segment.RefColumns + `,
    COALESCE((SELECT b.balance FROM user_balances b WHERE b.user_id = u.id), 0)::numeric(20,8)::text
FROM users u JOIN segments s ON s.id = u.segment_id`

func scanUser(row pgx.Row) (*User, error) {
	var u User
	var balance string
	err := row.Scan(&u.ID, &u.Email, &u.DisplayName, &u.Status, &u.LastLoginAt, &u.CreatedAt, &u.UpdatedAt,
		&u.Roles, &u.Segment.ID, &u.Segment.Kind, &u.Segment.Name, &u.Segment.UserID, &balance)
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

// LookupUsers implements core.UserDirectory (HostService.GetUsers).
func (s *Service) LookupUsers(ctx context.Context, ids []int64) ([]core.UserSummary, error) {
	rows, err := s.db.Pool.Query(ctx, `SELECT u.id, u.display_name, u.status
		FROM unnest($1::bigint[]) WITH ORDINALITY AS q(id, n) JOIN users u ON u.id = q.id AND u.deleted_at IS NULL
		ORDER BY q.n`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []core.UserSummary{}
	seen := map[int64]bool{}
	for rows.Next() {
		var u core.UserSummary
		if err := rows.Scan(&u.ID, &u.DisplayName, &u.Status); err != nil {
			return nil, err
		}
		if !seen[u.ID] {
			seen[u.ID] = true
			out = append(out, u)
		}
	}
	return out, rows.Err()
}

// ListUsersFilter filters GET /users.
type ListUsersFilter struct {
	Query    string // matches email or display name
	Status   string
	Role     string // role key
	Segment  string // a segment id, or "personal" for the users with a personal segment
	Page     int
	PageSize int
}

// ListUsers returns a page of non-deleted users ordered by id.
func (s *Service) ListUsers(ctx context.Context, f ListUsersFilter) ([]*User, int64, error) {
	var filter store.Filter
	filter.And("u.deleted_at IS NULL")
	if q := strings.TrimSpace(f.Query); q != "" {
		pattern := "%" + store.Like(q) + "%"
		filter.And(`(u.email ILIKE ? OR u.display_name ILIKE ?)`, pattern, pattern)
	}
	if f.Status != "" {
		filter.And("u.status = ?", f.Status)
	}
	if f.Role != "" {
		filter.And(`EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = u.id AND r.key = ?)`, f.Role)
	}
	switch {
	case f.Segment == core.SegmentPersonal:
		filter.And(`u.segment_id IN (SELECT id FROM segments WHERE kind = ?)`, core.SegmentPersonal)
	case f.Segment != "":
		// A value that is not a segment id selects nobody.
		id, _ := strconv.ParseInt(f.Segment, 10, 64)
		filter.And("u.segment_id = ?", id)
	}
	where, args := filter.Cond(), filter.Args()
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
	Email       string   `json:"email"`
	DisplayName string   `json:"display_name"`
	Password    string   `json:"password"`
	RoleKeys    []string `json:"role_keys"`
	// SegmentID is the named segment the user starts in; nil = the default one.
	SegmentID *int64 `json:"segment_id"`
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
	if len(fields) > 0 {
		return nil, 0, core.InvalidFields(fields...)
	}
	if err := lockNamedSegment(ctx, tx, in.SegmentID); err != nil {
		return nil, 0, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), s.cost)
	if err != nil {
		return nil, 0, err
	}
	var id int64
	err = tx.QueryRow(ctx, `INSERT INTO users (email, display_name, password_hash, segment_id)
		VALUES ($1, $2, $3, COALESCE($4, default_segment_id())) RETURNING id`,
		email, in.DisplayName, string(hash), in.SegmentID).Scan(&id)
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
	// SetUserRoles checks the actor may grant the roles (SEC-H1).
	v, err := s.authz.SetUserRoles(ctx, tx, actorID, id, roles)
	if err != nil {
		return nil, 0, err
	}
	if err := s.emit(ctx, tx, "user.created", id, email, StatusActive); err != nil {
		return nil, 0, err
	}

	// SEC-M5: audit user creation
	detail := map[string]any{
		"email": email,
		"roles": roles,
	}
	if err := audit.Audit(ctx, tx, actorID, "user.create", "user", strconv.FormatInt(id, 10), detail); err != nil {
		return nil, 0, err
	}

	u, err := s.getUser(ctx, tx, id)
	return u, v, err
}

// lockNamedSegment checks that id, when given, is a named segment and keeps
// the segment from being deleted until the transaction ends, so the user
// about to join it cannot be left pointing at nothing.
func lockNamedSegment(ctx context.Context, tx pgx.Tx, id *int64) error {
	if id == nil {
		return nil
	}
	_, err := segment.LockNamed(ctx, tx, id)
	if errors.Is(err, core.ErrNotFound) {
		return core.InvalidFields(core.FieldError{Field: "segment_id", Code: "invalid", Message: "unknown user group"})
	}
	return err
}

// UpdateUserInput is the body of PATCH /users/:id (all fields optional).
type UpdateUserInput struct {
	Email       *string `json:"email"`
	DisplayName *string `json:"display_name"`
	Status      *string `json:"status"`
	Password    *string `json:"password"`
	// SelfConfirmation is required when a user changes their own email or
	// password through this operator route (SEC-H3).
	SelfConfirmation
}

// SelfConfirmation re-authenticates a user who changes their own sign-in
// through an operator route (PATCH /users/:id, DELETE /users/:id/security):
// the current password, and a verification code (TOTP or backup code) when
// two-factor authentication is enabled - the same proof /me/password and
// /me/two-factor/disable ask for. Without it a stolen access token, or an
// access key granted only user:update, could set a new password and drop the
// second factor, and so turn into a full session (SEC-H3).
type SelfConfirmation struct {
	CurrentPassword *string `json:"current_password"`
	Code            string  `json:"code"`
}

var (
	errCurrentPasswordRequired = core.InvalidFields(core.FieldError{Field: "current_password", Code: "required", Message: "enter your current password to change your own sign-in"})
	errSecondFactorRequired    = core.InvalidFields(core.FieldError{Field: "code", Code: "required", Message: "enter a verification code: two-factor authentication is enabled"})
)

// confirmSelf checks a SelfConfirmation for userID: the password under the
// login rate limit, then the second factor when one is enrolled (a wrong
// code counts towards the TOTP lockout, as everywhere else).
func (s *Service) confirmSelf(ctx context.Context, userID int64, in SelfConfirmation, ip string) error {
	if in.CurrentPassword == nil || *in.CurrentPassword == "" {
		return errCurrentPasswordRequired
	}
	if _, err := s.confirmPassword(ctx, userID, *in.CurrentPassword, ip); err != nil {
		return err
	}
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockRefreshUser(ctx, tx, userID); err != nil {
			return err
		}
		var enrolled bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM user_totp WHERE user_id = $1)`, userID).Scan(&enrolled); err != nil {
			return err
		}
		if !enrolled {
			return nil
		}
		if strings.TrimSpace(in.Code) == "" {
			return errSecondFactorRequired
		}
		return s.checkSecondFactor(ctx, tx, userID, in.Code)
	})
	if isBadSecondFactor(err) {
		if ferr := s.recordSecondFactorFailure(ctx, userID); ferr != nil {
			return ferr
		}
	}
	return err
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

// validateUpdate normalizes the partial update in place (email casing,
// display-name trimming) and collects field errors in response order.
func validateUpdate(in UpdateUserInput) (email string, fields []core.FieldError) {
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
	if in.Password != nil {
		if f := validatePassword("password", *in.Password); f != nil {
			fields = append(fields, *f)
		}
	}
	return email, fields
}

// assertTargetPermissionsWithinActor is SEC-H2: the actor may not touch a
// target whose roles grant any permission the actor does not hold. The roles
// are measured, not the effective set, so that a disabled target (whose
// effective set is empty) stays as protected as an active one.
func (s *Service) assertTargetPermissionsWithinActor(ctx context.Context, actorID, id int64) error {
	return s.authz.CanActOnUser(ctx, actorID, id)
}

// UpdateUser applies a partial update. ip is the caller's address, for the
// login rate limit when a user confirms a change to their own sign-in.
func (s *Service) UpdateUser(ctx context.Context, actorID, id int64, in UpdateUserInput, ip string) (*User, error) {
	email, fields := validateUpdate(in)
	if len(fields) > 0 {
		return nil, core.InvalidFields(fields...)
	}
	if err := s.guardTarget(ctx, actorID, id); err != nil {
		return nil, err
	}

	// SEC-H1: check authorization to modify target user
	if actorID != id {
		if err := s.authz.CanActOnUser(ctx, actorID, id); err != nil {
			return nil, err
		}
	}

	// SEC-H3: a user's own email or password changes only with proof of the
	// current sign-in, as on /me/password; this route must not be the way
	// around it for an access key or a stolen token.
	if actorID == id && (in.Password != nil || in.Email != nil) {
		if err := s.confirmSelf(ctx, id, in.SelfConfirmation, ip); err != nil {
			return nil, err
		}
	}

	// SEC-H1: password reset for others requires user:password:reset
	changingOthersPassword := in.Password != nil && actorID != id
	if changingOthersPassword {
		actor, err := s.authz.PermissionSet(ctx, actorID)
		if err != nil {
			return nil, err
		}
		if !actor.Has("user:password:reset") {
			return nil, core.ErrPermissionDenied.WithMessage("missing permission: user:password:reset")
		}
		// SEC-H2: target permissions must not exceed actor's
		if err := s.assertTargetPermissionsWithinActor(ctx, actorID, id); err != nil {
			return nil, err
		}
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
		var err error
		v, u, err = s.applyUpdateTx(ctx, tx, actorID, id, in, email, hash)
		return err
	})
	if err != nil {
		return nil, err
	}
	s.sessionsChanged(ctx, id)
	if v != 0 {
		s.authz.Committed(ctx, v)
	}
	return u, nil
}

// applyUpdateTx performs the locked read, authorization checks and the write
// inside the caller's transaction.
func (s *Service) applyUpdateTx(ctx context.Context, tx pgx.Tx, actorID, id int64, in UpdateUserInput, email string, hash []byte) (int64, *User, error) {
	var v int64
	// Keep the established authz -> user lock order. Even an apparently
	// unchanged status must invalidate authorization after concurrent edits.
	if in.Status != nil {
		var err error
		if v, err = s.authz.Bump(ctx, tx); err != nil {
			return 0, nil, err
		}
	}
	if err := lockRefreshUser(ctx, tx, id); err != nil {
		if err == errBadRefresh {
			return 0, nil, core.ErrNotFound.WithMessage("user not found")
		}
		return 0, nil, err
	}
	cur, err := s.getUser(ctx, tx, id)
	if err != nil {
		return 0, nil, err
	}
	statusChange := in.Status != nil && *in.Status != cur.Status
	if statusChange {
		if actorID == id {
			return 0, nil, errSelfDisable
		}
		// SEC-H2: target permissions must not exceed actor's - in both
		// directions. Re-enabling a disabled account hands its holder every
		// permission its roles grant, so it is as sensitive as disabling.
		if err := s.assertTargetPermissionsWithinActor(ctx, actorID, id); err != nil {
			return 0, nil, err
		}
		if *in.Status == StatusDisabled {
			if err := s.authz.EnsureNotLastSuperAdmin(ctx, tx, id); err != nil {
				return 0, nil, err
			}
		}
	}

	_, err = tx.Exec(ctx, `
UPDATE users SET
    email = COALESCE($2, email),
    display_name = COALESCE($3, display_name),
    status = COALESCE($4, status),
    password_hash = COALESCE($5, password_hash),
    updated_at = now()
WHERE id = $1`, id, nilStr(email), in.DisplayName, in.Status, nilBytes(hash))
	if store.IsUniqueViolation(err, "") {
		return 0, nil, emailTaken()
	}
	if err != nil {
		return 0, nil, err
	}
	// SEC-M1: a new password or disabling ends every session
	if hash != nil || (statusChange && *in.Status == StatusDisabled) {
		if _, err := invalidateSessions(ctx, tx, id, allSessions); err != nil {
			return 0, nil, err
		}
	}
	u, err := s.getUser(ctx, tx, id)
	if err != nil {
		return 0, nil, err
	}
	if err := s.emit(ctx, tx, "user.updated", id, u.Email, u.Status); err != nil {
		return 0, nil, err
	}

	// SEC-M5: audit user changes
	detail := map[string]any{}
	if in.Email != nil {
		detail["email_changed"] = true
	}
	if in.DisplayName != nil {
		detail["display_name_changed"] = true
	}
	if in.Status != nil {
		detail["status"] = *in.Status
	}
	if in.Password != nil {
		detail["password_changed"] = true
	}
	if err := audit.Audit(ctx, tx, actorID, "user.update", "user", strconv.FormatInt(id, 10), detail); err != nil {
		return 0, nil, err
	}
	return v, u, nil
}

// DeleteUser soft-deletes a user and ends their sessions.
func (s *Service) DeleteUser(ctx context.Context, actorID, id int64) error {
	if actorID == id {
		return errSelfDisable
	}
	if err := s.guardTarget(ctx, actorID, id); err != nil {
		return err
	}

	// SEC-H1: check authorization to delete target user
	if err := s.authz.CanActOnUser(ctx, actorID, id); err != nil {
		return err
	}

	var v int64
	var dropped bool // a personal segment went, with its price rules
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
		// A soft delete does not fire the cascade of segments.user_id: the
		// user goes back to the default segment and a personal one is removed
		// here, with its grants, rates and prices.
		if _, err := tx.Exec(ctx, `UPDATE users SET deleted_at = now(), updated_at = now(), segment_id = default_segment_id() WHERE id = $1`, id); err != nil {
			return err
		}
		if dropped, err = segment.DropPersonal(ctx, tx, id); err != nil {
			return err
		}
		if _, err := invalidateSessions(ctx, tx, id, allSessions); err != nil {
			return err
		}
		// The user's API keys go with the user: authentication already
		// rejects them, and left behind they would block deleting their group.
		if _, err := tx.Exec(ctx, `UPDATE api_keys SET deleted_at = now() WHERE user_id = $1 AND deleted_at IS NULL`, id); err != nil {
			return err
		}
		if err := s.emit(ctx, tx, "user.updated", id, email, "deleted"); err != nil {
			return err
		}

		// SEC-M5: audit user deletion
		detail := map[string]any{"email": email}
		return audit.Audit(ctx, tx, actorID, "user.delete", "user", strconv.FormatInt(id, 10), detail)
	})
	if err != nil {
		return err
	}
	s.sessionsChanged(ctx, id)
	s.authz.Committed(ctx, v)
	if dropped {
		s.priceRulesChanged(ctx)
	}
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

func lockRefreshUser(ctx context.Context, tx pgx.Tx, userID int64) error {
	var id int64
	err := tx.QueryRow(ctx, `SELECT id FROM users WHERE id=$1 FOR UPDATE`, userID).Scan(&id)
	if store.IsNoRows(err) {
		return errBadRefresh
	}
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
