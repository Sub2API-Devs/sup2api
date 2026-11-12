package segment

import (
	"context"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Segment is the API view of a segments row.
type Segment struct {
	core.SegmentRef
	Description string `json:"description"`
	// Discount multiplies the default rate of every group; 1 = none.
	Discount    decimal.Decimal `json:"discount"`
	IsDefault   bool            `json:"is_default"`
	MemberCount int64           `json:"member_count"`
	// GrantedGroups are the private groups the segment is granted.
	GrantedGroups []core.GroupRef `json:"granted_groups"`
	// RateOverrideCount counts the groups whose rate it overrides and
	// PriceRuleCount its own model prices, over all groups.
	RateOverrideCount int64 `json:"rate_override_count"`
	PriceRuleCount    int64 `json:"price_rule_count"`
	*Personal
	CreatedAt time.Time `json:"created_at"`
}

// Personal is what only a personal segment has.
type Personal struct {
	// User is the member; callers that may not read users do not get it.
	User *Member `json:"user,omitempty"`
	// Origin is the segment the user came from; null once it is deleted.
	Origin *core.SegmentRef `json:"origin"`
}

// Member is the user of a personal segment.
type Member struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
}

const fromSegments = ` FROM segments s LEFT JOIN users u ON u.id = s.user_id`

// selectSegment reads a segment with its counts in one statement. A deleted
// user is no member.
const selectSegment = `SELECT ` + RefColumns + `, s.description, s.discount, s.is_default, s.created_at,
	(SELECT count(*) FROM users m WHERE m.segment_id = s.id AND m.deleted_at IS NULL),
	(SELECT COALESCE(jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name) ORDER BY g.id), '[]')
	  FROM segment_groups sg JOIN groups g ON g.id = sg.group_id
	  WHERE sg.segment_id = s.id AND sg.granted AND g.visibility = 'restricted'),
	(SELECT count(*) FROM segment_groups sg WHERE sg.segment_id = s.id AND sg.rate_override IS NOT NULL),
	(SELECT count(*) FROM price_rules pr WHERE pr.segment_id = s.id),
	COALESCE(u.display_name, ''), o.id, o.kind, o.name` + fromSegments + `
	LEFT JOIN segments o ON o.id = s.origin_id`

// scanSegment reads a selectSegment row as a caller may see it (Masked).
func scanSegment(row pgx.Row, showUsers bool) (*Segment, error) {
	var sg Segment
	var displayName string
	var originID *int64
	var originKind, originName *string
	if err := row.Scan(&sg.ID, &sg.Kind, &sg.Name, &sg.UserID, &sg.Description, &sg.Discount, &sg.IsDefault, &sg.CreatedAt,
		&sg.MemberCount, &sg.GrantedGroups, &sg.RateOverrideCount, &sg.PriceRuleCount,
		&displayName, &originID, &originKind, &originName); err != nil {
		return nil, err
	}
	if sg.UserID == nil {
		return &sg, nil
	}
	sg.Personal = &Personal{}
	if showUsers {
		sg.User = &Member{ID: *sg.UserID, Email: sg.Name, DisplayName: displayName}
	}
	if originID != nil {
		sg.Origin = &core.SegmentRef{ID: *originID, Kind: *originKind, Name: *originName}
	}
	sg.SegmentRef = Masked(sg.SegmentRef, showUsers)
	return &sg, nil
}

func (s *Service) load(ctx context.Context, id int64) (*Segment, error) {
	show, err := ShowUsers(ctx, s.authz)
	if err != nil {
		return nil, err
	}
	sg, err := scanSegment(s.db.Pool.QueryRow(ctx, selectSegment+` WHERE s.id = $1`, id), show)
	if store.IsNoRows(err) {
		return nil, segmentNotFound(ctx)
	}
	return sg, err
}

// render answers with the segment as the caller may see it.
func (s *Service) render(c *gin.Context, id int64, respond func(*gin.Context, any)) {
	sg, err := s.load(c.Request.Context(), id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	respond(c, sg)
}

// searchSegments narrows the filter to the segments matching q. Users are
// only searched for callers that may read them: a match would tell an email
// apart from the others.
func searchSegments(f *store.Filter, q string, showUsers bool) {
	pattern := "%" + store.Like(q) + "%"
	cond, args := `s.name ILIKE ? OR s.description ILIKE ?`, []any{pattern, pattern}
	if showUsers {
		cond, args = cond+` OR u.email ILIKE ? OR u.display_name ILIKE ?`, append(args, pattern, pattern)
	}
	f.And(`(`+cond+`)`, args...)
}

// list returns a page of the named segments, the default one first, or with
// ?kind=personal of the personal ones.
func (s *Service) list(c *gin.Context) {
	ctx := c.Request.Context()
	show, err := ShowUsers(ctx, s.authz)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	kind := core.SegmentNamed
	if c.Query("kind") == core.SegmentPersonal {
		kind = core.SegmentPersonal
	}
	var f store.Filter
	f.And(`s.kind = ?`, kind)
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		searchSegments(&f, q, show)
	}
	where, args := f.Cond(), f.Args()
	var total int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*)`+fromSegments+where, args...).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	page, size := httpapi.Pagination(c)
	args = append(args, size, (page-1)*size)
	rows, err := s.db.Pool.Query(ctx, selectSegment+where+` ORDER BY s.is_default DESC, s.id LIMIT $`+strconv.Itoa(len(args)-1)+
		` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	items := []*Segment{}
	for rows.Next() {
		sg, err := scanSegment(rows, show)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		items = append(items, sg)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
}

func (s *Service) get(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	s.render(c, id, httpapi.OK)
}

type segmentInput struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Discount    *string `json:"discount"`
}

// validate checks the provided fields of a segment of the kind; create
// requires name. A personal segment has no name of its own (it goes by its
// user) and no description.
func (in *segmentInput) validate(ctx context.Context, kind string, create bool) error {
	if kind == core.SegmentPersonal && (in.Name != nil || in.Description != nil) {
		return core.InvalidFields(fieldError(ctx, "name", "invalid", "a personal user group only has a discount", "个人专属只能修改折扣"))
	}
	var fe []core.FieldError
	name, given := "", in.Name != nil
	if given {
		name = strings.TrimSpace(*in.Name)
		in.Name = &name
	}
	if (given || create) && name == "" {
		fe = append(fe, fieldError(ctx, "name", "required", "name is required", "名称必填"))
	} else if utf8.RuneCountInString(name) > 100 {
		fe = append(fe, fieldError(ctx, "name", "invalid", "name must be at most 100 characters", "名称最多 100 个字符"))
	}
	if in.Description != nil && utf8.RuneCountInString(*in.Description) > 2000 {
		fe = append(fe, fieldError(ctx, "description", "too_long", "description is too long", "描述过长"))
	}
	if in.Discount != nil {
		d, ok := core.ParseRate(*in.Discount)
		if !ok || !d.IsPositive() {
			fe = append(fe, fieldError(ctx, "discount", "invalid", "must be a positive number with at most 4 decimals", "必须为正数，最多 4 位小数"))
		}
		discount := d.String()
		in.Discount = &discount
	}
	if len(fe) > 0 {
		return core.InvalidFields(fe...)
	}
	return nil
}

// nameTaken turns a clash with the name of another named segment into the
// field error; other errors pass through.
func nameTaken(ctx context.Context, err error) error {
	if store.IsUniqueViolation(err, "segments_name_uq") {
		return core.InvalidFields(fieldError(ctx, "name", "duplicate", "name already in use", "名称已被使用"))
	}
	return err
}

func (s *Service) create(c *gin.Context) {
	ctx := c.Request.Context()
	var in segmentInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := in.validate(ctx, core.SegmentNamed, true); err != nil {
		httpapi.Fail(c, err)
		return
	}
	var id int64
	err := s.db.Pool.QueryRow(ctx, `INSERT INTO segments (name, description, discount) VALUES ($1, $2, $3::numeric) RETURNING id`,
		*in.Name, core.ValueOr(in.Description, ""), core.ValueOr(in.Discount, "1")).Scan(&id)
	if err != nil {
		httpapi.Fail(c, nameTaken(ctx, err))
		return
	}
	s.render(c, id, httpapi.Created)
}

func (s *Service) update(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in segmentInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	kind, _, err := segmentKind(ctx, s.db.Pool, id, "")
	if err == nil {
		err = in.validate(ctx, kind, false)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	_, err = s.db.Pool.Exec(ctx, `UPDATE segments SET
		name = COALESCE($2, name),
		description = COALESCE($3, description),
		discount = COALESCE($4::numeric, discount),
		updated_at = now()
		WHERE id = $1`, id, in.Name, in.Description, in.Discount)
	if err != nil {
		httpapi.Fail(c, nameTaken(ctx, err))
		return
	}
	s.render(c, id, httpapi.OK)
}

// delete removes a named segment with its grants, rates and model prices
// (they cascade). Its members fall back to the default segment. A personal
// segment only goes this way once its user is deleted (requireOrphan).
func (s *Service) delete(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	err := s.tx(ctx, func(tx pgx.Tx) error {
		// The lock keeps new members out until the segment is gone.
		kind, isDefault, err := segmentKind(ctx, tx, id, "FOR UPDATE")
		switch {
		case err != nil:
			return err
		case isDefault:
			return core.ErrConflict.WithMessage(t(ctx, "the default user group cannot be deleted", "默认用户组不能删除"))
		case kind == core.SegmentPersonal:
			if err := requireOrphan(ctx, tx, id); err != nil {
				return err
			}
		}
		// Deleted users leave too: users.segment_id references the row.
		// Members are locked before they are moved, as moveUsers does.
		members, err := lockUsers(ctx, tx, `segment_id = $1`, id)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE users SET segment_id = default_segment_id() WHERE id = ANY($1)`, members); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `DELETE FROM segments WHERE id = $1`, id)
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.priceRulesChanged(ctx)
	httpapi.NoContent(c)
}

// requireOrphan fails unless the user of the personal segment is deleted. A
// personal segment goes when its user leaves it; one a deleted user is still
// in was left by a node of the version before segments, which deletes a user
// without the user's segment, and can only be deleted itself.
func requireOrphan(ctx context.Context, q store.Querier, id int64) error {
	var live bool
	err := q.QueryRow(ctx, `SELECT u.deleted_at IS NULL FROM segments s JOIN users u ON u.id = s.user_id WHERE s.id = $1`, id).Scan(&live)
	if err == nil && live {
		return core.ErrConflict.WithMessage(t(ctx, "a personal user group is deleted by moving its user to a user group",
			"个人专属通过把用户移回用户组来删除"))
	}
	return err
}
