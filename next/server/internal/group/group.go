// Package group implements scheduling groups: CRUD, the groups visible to the
// current user, and the per-user restricted group assignment.
package group

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
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

// Service serves the group endpoints.
type Service struct {
	db  *store.DB
	rdb redis.UniversalClient // optional: drops cached API key principals
	bus core.Bus              // optional: announces membership changes
	reg core.PluginRegistry   // optional: platforms are [] without it
}

// New builds the group service. rdb, bus and reg may be nil; reg resolves
// the platforms a group serves from its account types.
func New(db *store.DB, rdb redis.UniversalClient, bus core.Bus, reg core.PluginRegistry) *Service {
	return &Service{db: db, rdb: rdb, bus: bus, reg: reg}
}

// RegisterRoutes mounts the group endpoints.
func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Authed("GET", "/me/groups", s.myGroups)
	r.Perm("GET", "/groups", "group:read", s.list)
	r.Perm("POST", "/groups", "group:manage", s.create)
	r.Perm("GET", "/groups/:id", "group:read", s.get)
	r.Perm("PATCH", "/groups/:id", "group:manage", s.update)
	r.Perm("DELETE", "/groups/:id", "group:manage", s.delete)
	r.Perm("GET", "/users/:id/groups", "group:read", s.userGroups)
	r.Perm("PUT", "/users/:id/groups", "group:manage", s.setUserGroups)
}

// Group is the API view of a groups row.
type Group struct {
	ID             int64    `json:"id"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	Status         string   `json:"status"`
	RateMultiplier string   `json:"rate_multiplier"`
	Visibility     string   `json:"visibility"`
	ModelAllowlist []string `json:"model_allowlist"`
	AccountCount   int64    `json:"account_count"`
	APIKeyCount    int64    `json:"api_key_count"`
	// Platforms the group serves: those of its accounts' types (CONTRACTS §13).
	Platforms []string  `json:"platforms"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// MyGroup is the reduced view returned by GET /me/groups.
type MyGroup struct {
	ID             int64    `json:"id"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	RateMultiplier string   `json:"rate_multiplier"`
	ModelAllowlist []string `json:"model_allowlist"`
	Platforms      []string `json:"platforms"`
}

const selectGroup = `SELECT g.id, g.name, g.description, g.status, g.rate_multiplier::text, g.visibility,
	g.model_allowlist, g.created_at, g.updated_at,
	(SELECT count(*) FROM account_groups ag JOIN accounts a ON a.id = ag.account_id
	  WHERE ag.group_id = g.id AND a.deleted_at IS NULL),
	(SELECT count(*) FROM api_keys k WHERE k.group_id = g.id AND k.deleted_at IS NULL)
	FROM groups g`

func scanGroup(row pgx.Row) (*Group, error) {
	var g Group
	var rate string
	if err := row.Scan(&g.ID, &g.Name, &g.Description, &g.Status, &rate, &g.Visibility,
		&g.ModelAllowlist, &g.CreatedAt, &g.UpdatedAt, &g.AccountCount, &g.APIKeyCount); err != nil {
		return nil, err
	}
	g.RateMultiplier = normRate(rate)
	if g.ModelAllowlist == nil {
		g.ModelAllowlist = []string{}
	}
	return &g, nil
}

func normRate(s string) string {
	d, err := decimal.NewFromString(s)
	if err != nil {
		return s
	}
	return d.String()
}

func t(ctx context.Context, en, zh string) string {
	if core.Locale(ctx) == "zh" {
		return zh
	}
	return en
}

func (s *Service) list(c *gin.Context) {
	ctx := c.Request.Context()
	page, size := httpapi.Pagination(c)
	q := strings.TrimSpace(c.Query("q"))
	status := c.Query("status")
	where := ` WHERE ($1 = '' OR g.name ILIKE '%' || $1 || '%') AND ($2 = '' OR g.status = $2)`
	var total int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM groups g`+where, q, status).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows, err := s.db.Pool.Query(ctx, selectGroup+where+` ORDER BY g.id LIMIT $3 OFFSET $4`, q, status, size, (page-1)*size)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	items := []*Group{}
	for rows.Next() {
		g, err := scanGroup(rows)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		items = append(items, g)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows.Close()
	if err := s.fillPlatforms(ctx, items); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
}

// fillPlatforms sets Platforms of the groups with one query.
func (s *Service) fillPlatforms(ctx context.Context, gs []*Group) error {
	ids := make([]int64, len(gs))
	for i, g := range gs {
		ids[i] = g.ID
	}
	ps, err := s.groupPlatforms(ctx, ids)
	if err != nil {
		return err
	}
	for _, g := range gs {
		g.Platforms = ps[g.ID]
	}
	return nil
}

func (s *Service) load(ctx context.Context, id int64) (*Group, error) {
	g, err := scanGroup(s.db.Pool.QueryRow(ctx, selectGroup+` WHERE g.id = $1`, id))
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage(t(ctx, "group not found", "分组不存在"))
	}
	if err != nil {
		return nil, err
	}
	if err := s.fillPlatforms(ctx, []*Group{g}); err != nil {
		return nil, err
	}
	return g, nil
}

func (s *Service) get(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	g, err := s.load(c.Request.Context(), id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, g)
}

type groupInput struct {
	Name           *string   `json:"name"`
	Description    *string   `json:"description"`
	Status         *string   `json:"status"`
	RateMultiplier *string   `json:"rate_multiplier"`
	Visibility     *string   `json:"visibility"`
	ModelAllowlist *[]string `json:"model_allowlist"`
}

// validate checks the provided fields; create requires name.
func (in *groupInput) validate(ctx context.Context, create bool) error {
	var fe []core.FieldError
	add := func(field, code, en, zh string) {
		fe = append(fe, core.FieldError{Field: field, Code: code, Message: t(ctx, en, zh)})
	}
	if in.Name != nil {
		n := strings.TrimSpace(*in.Name)
		in.Name = &n
		if n == "" || utf8.RuneCountInString(n) > 100 {
			add("name", "invalid", "name must be 1-100 characters", "名称长度须为 1-100 个字符")
		}
	} else if create {
		add("name", "required", "name is required", "名称必填")
	}
	if in.Description != nil && utf8.RuneCountInString(*in.Description) > 2000 {
		add("description", "too_long", "description is too long", "描述过长")
	}
	if in.Status != nil && *in.Status != "active" && *in.Status != "disabled" {
		add("status", "invalid", "status must be active or disabled", "状态必须为 active 或 disabled")
	}
	if in.Visibility != nil && *in.Visibility != "public" && *in.Visibility != "restricted" {
		add("visibility", "invalid", "visibility must be public or restricted", "可见性必须为 public 或 restricted")
	}
	if in.RateMultiplier != nil {
		d, err := decimal.NewFromString(strings.TrimSpace(*in.RateMultiplier))
		if err != nil || d.IsNegative() || d.GreaterThanOrEqual(decimal.NewFromInt(1000000)) || d.Exponent() < -4 {
			add("rate_multiplier", "invalid", "rate multiplier must be a non-negative number with at most 4 decimals",
				"倍率必须为非负数，最多 4 位小数")
		} else {
			v := d.String()
			in.RateMultiplier = &v
		}
	}
	if in.ModelAllowlist != nil {
		clean := make([]string, 0, len(*in.ModelAllowlist))
		for _, m := range *in.ModelAllowlist {
			m = strings.TrimSpace(m)
			if m == "" || len(m) > 200 {
				add("model_allowlist", "invalid", "model patterns must be 1-200 characters", "模型模式长度须为 1-200 个字符")
				break
			}
			clean = append(clean, m)
		}
		in.ModelAllowlist = &clean
	}
	if len(fe) > 0 {
		return core.InvalidFields(fe...)
	}
	return nil
}

func dupName(ctx context.Context) error {
	return core.InvalidFields(core.FieldError{Field: "name", Code: "duplicate",
		Message: t(ctx, "a group with this name already exists", "分组名称已存在")})
}

func (s *Service) create(c *gin.Context) {
	ctx := c.Request.Context()
	var in groupInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := in.validate(ctx, true); err != nil {
		httpapi.Fail(c, err)
		return
	}
	desc, status, rate, vis, allow := "", "active", "1", "public", []string{}
	if in.Description != nil {
		desc = *in.Description
	}
	if in.Status != nil {
		status = *in.Status
	}
	if in.RateMultiplier != nil {
		rate = *in.RateMultiplier
	}
	if in.Visibility != nil {
		vis = *in.Visibility
	}
	if in.ModelAllowlist != nil {
		allow = *in.ModelAllowlist
	}
	allowJSON, _ := json.Marshal(allow)
	var id int64
	err := s.db.Pool.QueryRow(ctx, `INSERT INTO groups (name, description, status, rate_multiplier, visibility, model_allowlist)
		VALUES ($1, $2, $3, $4::numeric, $5, $6::jsonb) RETURNING id`,
		*in.Name, desc, status, rate, vis, string(allowJSON)).Scan(&id)
	if store.IsUniqueViolation(err, "") {
		httpapi.Fail(c, dupName(ctx))
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	g, err := s.load(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, g)
}

func (s *Service) update(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in groupInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := in.validate(ctx, false); err != nil {
		httpapi.Fail(c, err)
		return
	}
	var allowJSON *string
	if in.ModelAllowlist != nil {
		b, _ := json.Marshal(*in.ModelAllowlist)
		v := string(b)
		allowJSON = &v
	}
	tag, err := s.db.Pool.Exec(ctx, `UPDATE groups SET
		name = COALESCE($2, name),
		description = COALESCE($3, description),
		status = COALESCE($4, status),
		rate_multiplier = COALESCE($5::numeric, rate_multiplier),
		visibility = COALESCE($6, visibility),
		model_allowlist = COALESCE($7::jsonb, model_allowlist),
		updated_at = now()
		WHERE id = $1`, id, in.Name, in.Description, in.Status, in.RateMultiplier, in.Visibility, allowJSON)
	if store.IsUniqueViolation(err, "") {
		httpapi.Fail(c, dupName(ctx))
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		httpapi.Fail(c, core.ErrNotFound.WithMessage(t(ctx, "group not found", "分组不存在")))
		return
	}
	s.dropKeyCache(ctx, `SELECT key_hash FROM api_keys WHERE group_id = $1`, id)
	g, err := s.load(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, g)
}

func (s *Service) delete(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var hashes []string
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT true FROM groups WHERE id = $1 FOR UPDATE`, id).Scan(&exists); err != nil {
			if store.IsNoRows(err) {
				return core.ErrNotFound.WithMessage(t(ctx, "group not found", "分组不存在"))
			}
			return err
		}
		var live int64
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM api_keys WHERE group_id = $1 AND deleted_at IS NULL`, id).Scan(&live); err != nil {
			return err
		}
		if live > 0 {
			return core.ErrConflict.WithMessage(t(ctx,
				"the group still has API keys; delete them or move them to another group first",
				"该分组下仍有 API Key，请先删除或迁移到其他分组")).WithDetails(map[string]any{"api_key_count": live})
		}
		// Soft-deleted keys only keep the foreign key alive; drop them.
		rows, err := tx.Query(ctx, `DELETE FROM api_keys WHERE group_id = $1 RETURNING key_hash`, id)
		if err != nil {
			return err
		}
		hashes, err = pgx.CollectRows(rows, pgx.RowTo[string])
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `DELETE FROM groups WHERE id = $1`, id)
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.delKeys(ctx, hashes)
	s.announceAccounts(ctx)
	httpapi.NoContent(c)
}

func (s *Service) myGroups(c *gin.Context) {
	ctx := c.Request.Context()
	uid, _ := core.UserID(ctx)
	rows, err := s.db.Pool.Query(ctx, `SELECT g.id, g.name, g.description, g.rate_multiplier::text, g.model_allowlist
		FROM groups g
		WHERE g.status = 'active'
		  AND (g.visibility = 'public' OR EXISTS (SELECT 1 FROM user_groups ug WHERE ug.group_id = g.id AND ug.user_id = $1))
		ORDER BY g.id`, uid)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	out := []MyGroup{}
	for rows.Next() {
		var g MyGroup
		var rate string
		if err := rows.Scan(&g.ID, &g.Name, &g.Description, &rate, &g.ModelAllowlist); err != nil {
			httpapi.Fail(c, err)
			return
		}
		g.RateMultiplier = normRate(rate)
		if g.ModelAllowlist == nil {
			g.ModelAllowlist = []string{}
		}
		out = append(out, g)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows.Close()
	ids := make([]int64, len(out))
	for i, g := range out {
		ids[i] = g.ID
	}
	ps, err := s.groupPlatforms(ctx, ids)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	for i := range out {
		out[i].Platforms = ps[out[i].ID]
	}
	httpapi.OK(c, out)
}

func (s *Service) userExists(ctx context.Context, q store.Querier, id int64) error {
	var ok bool
	err := q.QueryRow(ctx, `SELECT true FROM users WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&ok)
	if store.IsNoRows(err) {
		return core.ErrNotFound.WithMessage(t(ctx, "user not found", "用户不存在"))
	}
	return err
}

type userGroupsView struct {
	UserID   int64     `json:"user_id"`
	GroupIDs []int64   `json:"group_ids"`
	Groups   []groupID `json:"groups"`
}

type groupID struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Visibility string `json:"visibility"`
	Status     string `json:"status"`
}

func (s *Service) loadUserGroups(ctx context.Context, uid int64) (*userGroupsView, error) {
	rows, err := s.db.Pool.Query(ctx, `SELECT g.id, g.name, g.visibility, g.status FROM user_groups ug
		JOIN groups g ON g.id = ug.group_id WHERE ug.user_id = $1 ORDER BY g.id`, uid)
	if err != nil {
		return nil, err
	}
	gs, err := pgx.CollectRows(rows, pgx.RowToStructByPos[groupID])
	if err != nil {
		return nil, err
	}
	v := &userGroupsView{UserID: uid, GroupIDs: []int64{}, Groups: []groupID{}}
	for _, g := range gs {
		v.GroupIDs = append(v.GroupIDs, g.ID)
		v.Groups = append(v.Groups, g)
	}
	return v, nil
}

func (s *Service) userGroups(c *gin.Context) {
	ctx := c.Request.Context()
	uid, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if err := s.userExists(ctx, s.db.Pool, uid); err != nil {
		httpapi.Fail(c, err)
		return
	}
	v, err := s.loadUserGroups(ctx, uid)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

func (s *Service) setUserGroups(c *gin.Context) {
	ctx := c.Request.Context()
	uid, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		GroupIDs []int64 `json:"group_ids"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	ids := uniqueIDs(in.GroupIDs)
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := s.userExists(ctx, tx, uid); err != nil {
			return err
		}
		var n int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM groups WHERE id = ANY($1)`, ids).Scan(&n); err != nil {
			return err
		}
		if n != len(ids) {
			return core.InvalidFields(core.FieldError{Field: "group_ids", Code: "not_found",
				Message: t(ctx, "some groups do not exist", "部分分组不存在")})
		}
		if _, err := tx.Exec(ctx, `DELETE FROM user_groups WHERE user_id = $1 AND NOT (group_id = ANY($2))`, uid, ids); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO user_groups (user_id, group_id) SELECT $1, unnest($2::bigint[])
			ON CONFLICT DO NOTHING`, uid, ids)
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.dropKeyCache(ctx, `SELECT key_hash FROM api_keys WHERE user_id = $1`, uid)
	v, err := s.loadUserGroups(ctx, uid)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

func uniqueIDs(in []int64) []int64 {
	seen := make(map[int64]struct{}, len(in))
	out := make([]int64, 0, len(in))
	for _, id := range in {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	return out
}

// dropKeyCache deletes cached API key principals ("apikey:{sha256}", see
// CONTRACTS §7) for the keys selected by query, so group/user changes apply
// immediately instead of after the cache TTL.
func (s *Service) dropKeyCache(ctx context.Context, query string, arg int64) {
	if s.rdb == nil {
		return
	}
	rows, err := s.db.Pool.Query(ctx, query, arg)
	if err != nil {
		slog.WarnContext(ctx, "group: list api keys for cache drop", "err", err)
		return
	}
	hashes, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		slog.WarnContext(ctx, "group: list api keys for cache drop", "err", err)
		return
	}
	s.delKeys(ctx, hashes)
}

func (s *Service) delKeys(ctx context.Context, hashes []string) {
	if s.rdb == nil || len(hashes) == 0 {
		return
	}
	for start := 0; start < len(hashes); start += 500 {
		end := min(start+500, len(hashes))
		keys := make([]string, 0, end-start)
		for _, h := range hashes[start:end] {
			keys = append(keys, "apikey:"+h)
		}
		if err := s.rdb.Del(ctx, keys...).Err(); err != nil {
			slog.WarnContext(ctx, "group: drop api key cache", "err", err)
			return
		}
	}
}

func (s *Service) announceAccounts(ctx context.Context) {
	if s.bus == nil {
		return
	}
	if err := s.bus.Publish(ctx, core.ChannelAccountChanged, []byte(`{"reason":"group_deleted"}`)); err != nil {
		slog.WarnContext(ctx, "group: publish account:changed", "err", err)
	}
}
