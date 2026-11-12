package segment

import (
	"context"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Deps is what the segment service needs of the rest of the server.
type Deps struct {
	DB *store.DB
	// Authz tells whether the caller may read users (see Masked).
	Authz core.Authorizer
	// Platforms returns the platforms each group serves (group.Service.Platforms).
	Platforms func(ctx context.Context, groupIDs []int64) (map[int64][]string, error)
	// PriceRulesChanged drops the cached price rules on every node (billing.Service.PriceRulesChanged).
	PriceRulesChanged func(ctx context.Context)
	// RuleCounts counts the price rules of each segment by group id, on the
	// models each group provides now (group.Service.SegmentRuleCounts).
	RuleCounts func(ctx context.Context, segmentIDs []int64) (map[int64]map[int64]int64, error)
}

// Service serves the segment endpoints.
type Service struct {
	db                *store.DB
	authz             core.Authorizer
	platforms         func(ctx context.Context, groupIDs []int64) (map[int64][]string, error)
	priceRulesChanged func(ctx context.Context)
	ruleCounts        func(ctx context.Context, segmentIDs []int64) (map[int64]map[int64]int64, error)
}

// New builds the segment service.
func New(d Deps) *Service {
	return &Service{db: d.DB, authz: d.Authz, platforms: d.Platforms, priceRulesChanged: d.PriceRulesChanged,
		ruleCounts: d.RuleCounts}
}

// RegisterRoutes mounts the segment endpoints. The members of a segment are
// listed by iam (GET /segments/:id/members): they are user rows.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Perm("GET", "/segments", "segment:read", s.list)
	r.Perm("POST", "/segments", "segment:manage", s.create)
	r.Perm("GET", "/segments/:id", "segment:read", s.get)
	r.Perm("PATCH", "/segments/:id", "segment:manage", s.update)
	r.Perm("DELETE", "/segments/:id", "segment:manage", s.delete)
	r.Perm("POST", "/segments/:id/members", "segment:manage", s.addMembers)
	r.Perm("GET", "/segments/:id/groups", "segment:read", s.segmentGroups)
	r.Perm("PUT", "/segments/:id/groups", "segment:manage", s.setSegmentGroups)
	r.Perm("GET", "/groups/:id/segments", "group:read", s.groupSegments)
	r.Perm("PUT", "/groups/:id/segments", "group:manage", s.setGroupSegments)
	r.Perm("POST", "/users/:id/personal-segment", "segment:manage", s.makePersonal)
	r.Perm("DELETE", "/users/:id/personal-segment", "segment:manage", s.removePersonal)
}

func t(ctx context.Context, en, zh string) string { return core.Text(ctx, en, zh) }

func fieldError(ctx context.Context, field, code, en, zh string) core.FieldError {
	return core.FieldError{Field: field, Code: code, Message: t(ctx, en, zh)}
}

// NotFound is the not_found of a user group that does not exist. It is the
// one wording of it: iam and billing answer with it too. It is
// core.ErrNotFound to errors.Is.
func NotFound(ctx context.Context) error {
	return core.ErrNotFound.WithMessage(t(ctx, "user group not found", "用户组不存在")).WithCause(core.ErrNotFound)
}

// UnknownMessage is the message of a field that names a user group that does not
// exist, or not one it may name.
func UnknownMessage(ctx context.Context) string {
	return t(ctx, "unknown user group", "用户组不存在")
}

// UserNotFound is the not_found of a user that does not exist or was
// deleted. It is core.ErrNotFound to errors.Is.
func UserNotFound(ctx context.Context) error {
	return core.ErrNotFound.WithMessage(t(ctx, "user not found", "用户不存在")).WithCause(core.ErrNotFound)
}

// tx runs fn in a transaction. A row the writes refer to that was deleted
// meanwhile (a foreign key violation) is a conflict, not a failure, and so is
// a deadlock with another writer, should the lock order leave one possible.
func (s *Service) tx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	err := s.db.Tx(ctx, fn)
	if store.IsForeignKeyViolation(err) || store.IsDeadlock(err) {
		return core.ErrConflict.WithMessage(t(ctx, "the data changed meanwhile, try again", "数据已被其他操作修改，请重试")).WithCause(err)
	}
	return err
}

// segmentKind returns the kind of a segment and whether it is the default
// one, locking the row as lock says ("" = not at all).
func segmentKind(ctx context.Context, q store.Querier, id int64, lock string) (kind string, isDefault bool, err error) {
	err = q.QueryRow(ctx, `SELECT kind, is_default FROM segments WHERE id = $1 `+lock, id).Scan(&kind, &isDefault)
	if store.IsNoRows(err) {
		return "", false, NotFound(ctx)
	}
	return kind, isDefault, err
}
