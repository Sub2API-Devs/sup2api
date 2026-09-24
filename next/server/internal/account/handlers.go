package account

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// row is one accounts row.
type row struct {
	ID             int64
	Name           string
	PluginKey      string
	Type           string
	CredEnc        []byte
	Settings       []byte
	ProxyID        *int64
	Status         string
	StatusReason   string
	Schedulable    bool
	Priority       int
	MaxConcurrency int
	LastUsedAt     *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

const selectRow = `SELECT a.id, a.name, a.plugin_key, a.type, a.credentials_enc, a.settings, a.proxy_id,
	a.status, a.status_reason, a.schedulable, a.priority, a.max_concurrency, a.last_used_at, a.created_at, a.updated_at
	FROM accounts a`

func scanRow(r pgx.Row) (*row, error) {
	var a row
	err := r.Scan(&a.ID, &a.Name, &a.PluginKey, &a.Type, &a.CredEnc, &a.Settings, &a.ProxyID,
		&a.Status, &a.StatusReason, &a.Schedulable, &a.Priority, &a.MaxConcurrency, &a.LastUsedAt, &a.CreatedAt, &a.UpdatedAt)
	return &a, err
}

func notFound(ctx context.Context) error {
	return core.ErrNotFound.WithMessage(t(ctx, "account not found", "账号不存在"))
}

func (s *Service) loadRow(ctx context.Context, q store.Querier, id int64, lock bool) (*row, error) {
	sql := selectRow + ` WHERE a.id = $1 AND a.deleted_at IS NULL`
	if lock {
		sql += ` FOR UPDATE`
	}
	a, err := scanRow(q.QueryRow(ctx, sql, id))
	if store.IsNoRows(err) {
		return nil, notFound(ctx)
	}
	return a, err
}

// GroupRef names a group an account belongs to.
type GroupRef struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// View is the API representation of an account.
type View struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	PluginKey string `json:"plugin_key"`
	Type      string `json:"type"`
	// TypeLabel is the account type label; null when the type is no longer
	// registered (plugin disabled or uninstalled).
	TypeLabel      manifest.LocalizedText `json:"type_label"`
	GroupIDs       []int64                `json:"group_ids"`
	Groups         []GroupRef             `json:"groups"`
	ProxyID        *int64                 `json:"proxy_id"`
	Status         string                 `json:"status"`
	StatusReason   string                 `json:"status_reason"`
	Schedulable    bool                   `json:"schedulable"`
	Priority       int                    `json:"priority"`
	MaxConcurrency int                    `json:"max_concurrency"`
	InUse          int                    `json:"in_use"`
	CooldownUntil  *time.Time             `json:"cooldown_until"`
	CooldownReason string                 `json:"cooldown_reason,omitempty"`
	// Orphaned is true when the plugin declaring the account type is not
	// enabled (disabled or uninstalled).
	Orphaned bool            `json:"orphaned"`
	Settings json.RawMessage `json:"settings"`
	// Credentials (settings + secret fields, sensitive ones masked) is only
	// present on single-account responses.
	Credentials json.RawMessage `json:"credentials,omitempty"`
	LastUsedAt  *time.Time      `json:"last_used_at"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

// views builds list views, filling groups, in_use, cooldown and orphaned.
func (s *Service) views(ctx context.Context, rows []*row) ([]*View, error) {
	out := make([]*View, len(rows))
	ids := make([]int64, len(rows))
	byID := map[int64]*View{}
	for i, a := range rows {
		st := a.Settings
		if len(st) == 0 {
			st = json.RawMessage("{}")
		}
		v := &View{
			ID: a.ID, Name: a.Name, PluginKey: a.PluginKey, Type: a.Type, TypeLabel: s.typeLabel(a.PluginKey, a.Type),
			GroupIDs: []int64{}, Groups: []GroupRef{}, ProxyID: a.ProxyID, Status: a.Status,
			StatusReason: a.StatusReason, Schedulable: a.Schedulable, Priority: a.Priority,
			MaxConcurrency: a.MaxConcurrency, Orphaned: !s.pluginActive(a.PluginKey), Settings: st,
			LastUsedAt: a.LastUsedAt, CreatedAt: a.CreatedAt, UpdatedAt: a.UpdatedAt,
		}
		out[i], ids[i], byID[a.ID] = v, a.ID, v
	}
	if len(rows) == 0 {
		return out, nil
	}
	gr, err := s.d.DB.Pool.Query(ctx, `SELECT ag.account_id, g.id, g.name FROM account_groups ag
		JOIN groups g ON g.id = ag.group_id WHERE ag.account_id = ANY($1) ORDER BY g.id`, ids)
	if err != nil {
		return nil, err
	}
	defer gr.Close()
	for gr.Next() {
		var aid int64
		var g GroupRef
		if err := gr.Scan(&aid, &g.ID, &g.Name); err != nil {
			return nil, err
		}
		v := byID[aid]
		v.GroupIDs = append(v.GroupIDs, g.ID)
		v.Groups = append(v.Groups, g)
	}
	if err := gr.Err(); err != nil {
		return nil, err
	}
	if s.d.Redis != nil {
		now := time.Now().UTC()
		pipe := s.d.Redis.Pipeline()
		gets := make([]*redis.StringCmd, len(ids))
		ttls := make([]*redis.DurationCmd, len(ids))
		for i, id := range ids {
			gets[i] = pipe.Get(ctx, cooldownKey(id))
			ttls[i] = pipe.PTTL(ctx, cooldownKey(id))
		}
		if _, err := pipe.Exec(ctx); err != nil && err != redis.Nil {
			slog.WarnContext(ctx, "account: read cooldowns", "err", err)
		}
		for i, v := range out {
			if reason, err := gets[i].Result(); err == nil {
				if ttl, err := ttls[i].Result(); err == nil && ttl > 0 {
					until := now.Add(ttl).Truncate(time.Second)
					v.CooldownUntil, v.CooldownReason = &until, reason
				}
			}
		}
	}
	if s.d.Slots != nil {
		for _, v := range out {
			n, err := s.d.Slots.InUse(ctx, "account", v.ID)
			if err != nil {
				slog.WarnContext(ctx, "account: read slots", "err", err)
				break
			}
			v.InUse = n
		}
	}
	return out, nil
}

// credentialView returns the merged credentials with sensitive values masked.
func (s *Service) credentialView(a *row) (json.RawMessage, error) {
	plain, err := s.decrypt(a.PluginKey, a.CredEnc)
	if err != nil {
		return nil, fmt.Errorf("decrypt account %d: %w", a.ID, err)
	}
	bt, ok := s.accountType(a.PluginKey, a.Type)
	if !ok {
		sec, err := parseObject(plain)
		if err != nil {
			return nil, err
		}
		all, err := merge(mustJSON(maskAll(sec)), a.Settings)
		if err != nil {
			return nil, err
		}
		return mustJSON(all), nil
	}
	all, err := merge(plain, a.Settings)
	if err != nil {
		return nil, err
	}
	return mask(mustJSON(all), bt.Type.SensitiveFields), nil
}

func (s *Service) fullView(ctx context.Context, id int64) (*View, error) {
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, false)
	if err != nil {
		return nil, err
	}
	vs, err := s.views(ctx, []*row{a})
	if err != nil {
		return nil, err
	}
	if vs[0].Credentials, err = s.credentialView(a); err != nil {
		return nil, err
	}
	return vs[0], nil
}

// ---------------------------------------------------------------- list / get

func (s *Service) list(c *gin.Context) {
	ctx := c.Request.Context()
	page, size := httpapi.Pagination(c)
	where := ` WHERE a.deleted_at IS NULL`
	var args []any
	add := func(cond string, v any) {
		args = append(args, v)
		where += " AND " + strings.ReplaceAll(cond, "?", "$"+strconv.Itoa(len(args)))
	}
	if v := c.Query("plugin_key"); v != "" {
		add("a.plugin_key = ?", v)
	}
	if v := c.Query("type"); v != "" {
		add("a.type = ?", v)
	}
	if v := c.Query("status"); v != "" {
		add("a.status = ?", v)
	}
	if v := c.Query("group_id"); v != "" {
		gid, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid group_id"))
			return
		}
		add("EXISTS (SELECT 1 FROM account_groups ag WHERE ag.account_id = a.id AND ag.group_id = ?)", gid)
	}
	if v := strings.TrimSpace(c.Query("q")); v != "" {
		add("a.name ILIKE '%' || ? || '%'", v)
	}
	var total int64
	if err := s.d.DB.Pool.QueryRow(ctx, `SELECT count(*) FROM accounts a`+where, args...).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	n := len(args)
	rs, err := s.d.DB.Pool.Query(ctx, selectRow+where+fmt.Sprintf(` ORDER BY a.priority, a.id LIMIT $%d OFFSET $%d`, n+1, n+2),
		append(args, size, (page-1)*size)...)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows, err := pgx.CollectRows(rs, func(r pgx.CollectableRow) (*row, error) { return scanRow(r) })
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	vs, err := s.views(ctx, rows)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, vs, httpapi.Page{Page: page, PageSize: size, Total: total})
}

func (s *Service) get(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	v, err := s.fullView(c.Request.Context(), id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

// ---------------------------------------------------------------- create / update

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

type input struct {
	Name           *string         `json:"name"`
	PluginKey      string          `json:"plugin_key"`
	Type           string          `json:"type"`
	GroupIDs       *[]int64        `json:"group_ids"`
	ProxyID        nullable[int64] `json:"proxy_id"`
	Priority       *int            `json:"priority"`
	MaxConcurrency *int            `json:"max_concurrency"`
	Schedulable    *bool           `json:"schedulable"`
	Status         *string         `json:"status"`
	Credentials    json.RawMessage `json:"credentials"`
}

func (in *input) validate(ctx context.Context, create bool) []core.FieldError {
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
	if create && (in.PluginKey == "" || in.Type == "") {
		add("type", "required", "plugin_key and type are required", "账号类型（plugin_key 和 type）必填")
	}
	if in.Priority != nil && (*in.Priority < 0 || *in.Priority > 1000000) {
		add("priority", "invalid", "priority must be 0-1000000", "优先级必须为 0-1000000")
	}
	if in.MaxConcurrency != nil && (*in.MaxConcurrency < 0 || *in.MaxConcurrency > 100000) {
		add("max_concurrency", "invalid", "max concurrency must be 0-100000 (0 = unlimited)", "最大并发必须为 0-100000（0 表示不限）")
	}
	if in.Status != nil && *in.Status != "active" && *in.Status != "disabled" {
		add("status", "invalid", "status must be active or disabled", "状态必须为 active 或 disabled")
	}
	if in.ProxyID.Valid && in.ProxyID.V <= 0 {
		add("proxy_id", "invalid", "invalid proxy", "代理无效")
	}
	if create && len(in.Credentials) == 0 {
		add("credentials", "required", "credentials are required", "凭证必填")
	}
	return fe
}

// checkRefs verifies that the proxy and groups exist.
func checkRefs(ctx context.Context, q store.Querier, proxyID *int64, groupIDs []int64) error {
	if proxyID != nil {
		var ok bool
		if err := q.QueryRow(ctx, `SELECT true FROM proxies WHERE id = $1`, *proxyID).Scan(&ok); err != nil {
			if store.IsNoRows(err) {
				return core.InvalidFields(core.FieldError{Field: "proxy_id", Code: "not_found",
					Message: t(ctx, "proxy not found", "代理不存在")})
			}
			return err
		}
	}
	if len(groupIDs) > 0 {
		var n int
		if err := q.QueryRow(ctx, `SELECT count(*) FROM groups WHERE id = ANY($1)`, groupIDs).Scan(&n); err != nil {
			return err
		}
		if n != len(groupIDs) {
			return core.InvalidFields(core.FieldError{Field: "group_ids", Code: "not_found",
				Message: t(ctx, "some groups do not exist", "部分分组不存在")})
		}
	}
	return nil
}

func uniqueIDs(in []int64) []int64 {
	seen := map[int64]struct{}{}
	out := []int64{}
	for _, id := range in {
		if _, ok := seen[id]; !ok {
			seen[id] = struct{}{}
			out = append(out, id)
		}
	}
	return out
}

func setGroups(ctx context.Context, tx pgx.Tx, id int64, groupIDs []int64) error {
	if _, err := tx.Exec(ctx, `DELETE FROM account_groups WHERE account_id = $1 AND NOT (group_id = ANY($2))`, id, groupIDs); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `INSERT INTO account_groups (account_id, group_id) SELECT $1, unnest($2::bigint[])
		ON CONFLICT DO NOTHING`, id, groupIDs)
	return err
}

// basicPayload is the payload of account.created/updated/deleted (CONTRACTS §12).
func basicPayload(id int64, pluginKey, typ, name string) map[string]any {
	return map[string]any{"account_id": id, "plugin_key": pluginKey, "type": typ, "name": name}
}

// statusPayload is the payload of account.status_changed.
func statusPayload(id int64, pluginKey, typ, name, status, reason string, until *time.Time) map[string]any {
	p := basicPayload(id, pluginKey, typ, name)
	p["status"], p["reason"] = status, reason
	if until != nil {
		p["cooldown_until"] = until.UTC().Format(time.RFC3339)
	}
	return p
}

func (s *Service) create(c *gin.Context) {
	ctx := c.Request.Context()
	var in input
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if fe := in.validate(ctx, true); len(fe) > 0 {
		httpapi.Fail(c, core.InvalidFields(fe...))
		return
	}
	bt, ok := s.accountType(in.PluginKey, in.Type)
	if !ok {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "type", Code: "unknown",
			Message: t(ctx, "unknown account type (is its plugin enabled?)", "未知的账号类型（插件是否已启用？）")}))
		return
	}
	var groupIDs []int64
	if in.GroupIDs != nil {
		groupIDs = uniqueIDs(*in.GroupIDs)
	}
	var proxyID *int64
	if in.ProxyID.Valid {
		proxyID = &in.ProxyID.V
	}
	if err := checkRefs(ctx, s.d.DB.Pool, proxyID, groupIDs); err != nil {
		httpapi.Fail(c, err)
		return
	}
	p, err := s.prepare(ctx, bt, in.Credentials, nil)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	status, sched, prio, maxc := "active", true, 10, 10
	if in.Status != nil {
		status = *in.Status
	}
	if in.Schedulable != nil {
		sched = *in.Schedulable
	}
	if in.Priority != nil {
		prio = *in.Priority
	}
	if in.MaxConcurrency != nil {
		maxc = *in.MaxConcurrency
	}
	uid, _ := core.UserID(ctx)
	var id int64
	err = s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx, `INSERT INTO accounts (name, plugin_key, type, credentials_enc, settings,
			proxy_id, status, schedulable, priority, max_concurrency, created_by)
			VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, NULLIF($11::bigint, 0)) RETURNING id`,
			*in.Name, bt.Plugin.Key, bt.Type.ID, p.enc, string(p.settings),
			proxyID, status, sched, prio, maxc, uid).Scan(&id); err != nil {
			return err
		}
		if err := setGroups(ctx, tx, id, groupIDs); err != nil {
			return err
		}
		return s.d.Events.Emit(ctx, tx, core.Event{Type: core.EventAccountCreated,
			Payload: basicPayload(id, bt.Plugin.Key, bt.Type.ID, *in.Name)})
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, id)
	v, err := s.fullView(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, v)
}

func (s *Service) update(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in input
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if fe := in.validate(ctx, false); len(fe) > 0 {
		httpapi.Fail(c, core.InvalidFields(fe...))
		return
	}
	cur, err := s.loadRow(ctx, s.d.DB.Pool, id, false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	var groupIDs []int64
	if in.GroupIDs != nil {
		groupIDs = uniqueIDs(*in.GroupIDs)
	}
	var proxyID *int64
	if in.ProxyID.Valid {
		proxyID = &in.ProxyID.V
	}
	if err := checkRefs(ctx, s.d.DB.Pool, proxyID, groupIDs); err != nil {
		httpapi.Fail(c, err)
		return
	}
	// Validate credentials (may call the plugin) before opening the transaction.
	var p *prepared
	if creds := strings.TrimSpace(string(in.Credentials)); creds != "" && creds != "null" {
		bt, ok := s.accountType(cur.PluginKey, cur.Type)
		if !ok {
			httpapi.Fail(c, core.ErrPluginUnavailable.WithMessage(t(ctx,
				"the plugin providing this account type is not enabled; credentials cannot be changed",
				"提供该账号类型的插件未启用，无法修改凭证")))
			return
		}
		plain, err := s.decrypt(cur.PluginKey, cur.CredEnc)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		old, err := merge(plain, cur.Settings)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		if p, err = s.prepare(ctx, bt, in.Credentials, mustJSON(old)); err != nil {
			httpapi.Fail(c, err)
			return
		}
	}
	statusChanged := in.Status != nil && *in.Status != cur.Status
	err = s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		locked, err := s.loadRow(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if p != nil && !locked.UpdatedAt.Equal(cur.UpdatedAt) {
			return core.ErrConflict.WithMessage(t(ctx, "the account was modified concurrently, please retry",
				"账号已被其他操作修改，请重试"))
		}
		var enc []byte
		var settings *string
		if p != nil {
			enc = p.enc
			st := string(p.settings)
			settings = &st
		}
		var reason *string
		if statusChanged {
			r := ""
			if *in.Status == "disabled" {
				r = "disabled by administrator"
			}
			reason = &r
		}
		if _, err := tx.Exec(ctx, `UPDATE accounts SET
			name = COALESCE($2, name),
			proxy_id = CASE WHEN $3 THEN $4 ELSE proxy_id END,
			priority = COALESCE($5, priority),
			max_concurrency = COALESCE($6, max_concurrency),
			schedulable = COALESCE($7, schedulable),
			status = COALESCE($8, status),
			status_reason = COALESCE($9, status_reason),
			credentials_enc = COALESCE($10, credentials_enc),
			settings = COALESCE($11::jsonb, settings),
			updated_at = clock_timestamp()
			WHERE id = $1`, id, in.Name, in.ProxyID.Set, proxyID, in.Priority, in.MaxConcurrency, in.Schedulable,
			in.Status, reason, enc, settings); err != nil {
			return err
		}
		if in.GroupIDs != nil {
			if err := setGroups(ctx, tx, id, groupIDs); err != nil {
				return err
			}
		}
		name := locked.Name
		if in.Name != nil {
			name = *in.Name
		}
		evs := []core.Event{{Type: core.EventAccountUpdated,
			Payload: basicPayload(id, locked.PluginKey, locked.Type, name)}}
		if statusChanged {
			evs = append(evs, core.Event{Type: core.EventAccountStatusChanged,
				Payload: statusPayload(id, locked.PluginKey, locked.Type, name, *in.Status, *reason, nil)})
		}
		return s.d.Events.Emit(ctx, tx, evs...)
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, id)
	v, err := s.fullView(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

func (s *Service) delete(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	err := s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		var pk, typ, name string
		err := tx.QueryRow(ctx, `UPDATE accounts SET deleted_at = now(), updated_at = now()
			WHERE id = $1 AND deleted_at IS NULL RETURNING plugin_key, type, name`, id).Scan(&pk, &typ, &name)
		if store.IsNoRows(err) {
			return notFound(ctx)
		}
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM account_groups WHERE account_id = $1`, id); err != nil {
			return err
		}
		return s.d.Events.Emit(ctx, tx, core.Event{Type: core.EventAccountDeleted, Payload: basicPayload(id, pk, typ, name)})
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if s.d.Redis != nil {
		_ = s.d.Redis.Del(ctx, cooldownKey(id)).Err()
	}
	s.changed(ctx, id)
	httpapi.NoContent(c)
}

// ---------------------------------------------------------------- reveal

func (s *Service) reveal(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	plain, err := s.decrypt(a.PluginKey, a.CredEnc)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	all, err := merge(plain, a.Settings)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	uid, _ := core.UserID(ctx)
	if _, err := s.d.DB.Pool.Exec(ctx, `INSERT INTO audit_logs (user_id, action, target_type, target_id, ip)
		VALUES (NULLIF($1::bigint, 0), 'account.credentials.reveal', 'account', $2, $3)`, uid, itoa(id), c.ClientIP()); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"credentials": json.RawMessage(mustJSON(all))})
}
