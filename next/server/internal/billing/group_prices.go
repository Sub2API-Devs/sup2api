package billing

import (
	"context"
	"errors"
	"maps"
	"slices"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/group"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/segment"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

func (s *Service) registerPricingRoutes(r *httpapi.Router) {
	r.Perm("GET", "/groups/:id/model-prices", "group:read", s.showGroupPrices)
	r.Perm("PUT", "/groups/:id/model-prices", "group:manage", s.saveGroupPrices)
	r.Perm("POST", "/pricing/quote", "price:read", s.quotePricing)
}

// showsUsers reports whether the caller may read users: only then is a
// personal segment named by its user's email (segment.Masked).
func (s *Service) showsUsers(ctx context.Context) bool {
	if s.Authz == nil {
		return false
	}
	uid, _ := core.UserID(ctx)
	ok, err := s.Authz.Can(ctx, uid, "user:read")
	return err == nil && ok
}

// GroupRef names a group where a pricing row refers to it.
type GroupRef struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// pricedGroup is what pricing reads of a group.
type pricedGroup struct {
	core.GroupInfo
	public bool
}

func (g pricedGroup) ref() GroupRef { return GroupRef{ID: g.ID, Name: g.Name} }

// loadGroups reads the groups cond selects.
func loadGroups(ctx context.Context, q store.Querier, cond string, args ...any) ([]pricedGroup, error) {
	rows, err := q.Query(ctx, `SELECT g.id, g.name, g.rate_multiplier, g.model_allowlist, g.model_filter_mode,
		g.visibility = 'public' FROM groups g`+cond, args...)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (g pricedGroup, err error) {
		err = row.Scan(&g.ID, &g.Name, &g.RateMultiplier, &g.ModelAllowlist, &g.ModelFilterMode, &g.public)
		return g, err
	})
}

// catalog is the enabled global prices by model.
type catalog map[string]PriceDef

func loadCatalog(ctx context.Context, q store.Querier) (catalog, error) {
	rows, err := q.Query(ctx, `SELECT model, mode, config, expression FROM model_prices WHERE enabled`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := catalog{}
	for rows.Next() {
		var model string
		var p PriceDef
		if err := rows.Scan(&model, &p.Mode, &p.Config, &p.Expression); err != nil {
			return nil, err
		}
		out[model] = p
	}
	return out, rows.Err()
}

// models returns the priced models, sorted.
func (c catalog) models() []string { return slices.Sorted(maps.Keys(c)) }

// base returns the global price of model; nil when it has none.
func (c catalog) base(model string) *PriceDef {
	p, ok := c[model]
	if !ok {
		return nil
	}
	return &p
}

// offeredModels returns the models each of the groups provides
// (group.Models.Offered), by group id.
func offeredModels(ctx context.Context, q store.Querier, groups []pricedGroup, prices catalog) (map[int64][]string, error) {
	ids := make([]int64, len(groups))
	for i, g := range groups {
		ids[i] = g.ID
	}
	provided, err := group.ProvidedModels(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	priced := prices.models()
	out := make(map[int64][]string, len(groups))
	for _, g := range groups {
		out[g.ID] = provided[g.ID].Offered(priced, g.GroupInfo)
	}
	return out, nil
}

// groupPrices is what the models of one group are priced against: the group,
// the global prices and the models the group provides.
type groupPrices struct {
	group  pricedGroup
	prices catalog
	models []string
}

// loadGroupPrices reads the one group cond selects; not_found without one.
func loadGroupPrices(ctx context.Context, q store.Querier, cond string, args ...any) (*groupPrices, error) {
	groups, err := loadGroups(ctx, q, cond, args...)
	if err != nil {
		return nil, err
	}
	if len(groups) == 0 {
		return nil, core.ErrNotFound.WithMessage(core.Text(ctx, "group not found", "分组不存在"))
	}
	gp := &groupPrices{group: groups[0]}
	if gp.prices, err = loadCatalog(ctx, q); err != nil {
		return nil, err
	}
	offered, err := offeredModels(ctx, q, groups, gp.prices)
	if err != nil {
		return nil, err
	}
	gp.models = offered[gp.group.ID]
	return gp, nil
}

// ModelPriceRow is one model a group provides, with the rules on it.
type ModelPriceRow struct {
	Model string `json:"model"`
	// Base is the global price; null = the model has none and cannot be billed.
	Base      *PriceDef `json:"base"`
	GroupRule *Rule     `json:"group_rule"`
	// SegmentRule is there, null without a rule, when a segment was asked
	// for; SegmentRuleCount, the segments with a rule of their own on the
	// model, when none was.
	SegmentRule      **Rule `json:"segment_rule,omitempty"`
	SegmentRuleCount *int   `json:"segment_rule_count,omitempty"`
	// ListPrice is the price after the first rule that applies; null without
	// a global price.
	ListPrice *PriceDef `json:"list_price"`
	Source    string    `json:"source"`
}

// row prices model for the segment of the levels: its global price (nil =
// none), both rules as configured and the list price after the first that
// applies. Without a global price no rule applies.
func (l ruleLevels) row(model string, base *PriceDef) ModelPriceRow {
	segmentRule := l.segment.view(base)
	row := ModelPriceRow{Model: model, Base: base, GroupRule: l.group.view(base), SegmentRule: &segmentRule, Source: core.PriceSourceGlobal}
	if base == nil {
		return row
	}
	rule, source := l.applied(base.Mode)
	price, _ := listPrice(*base, rule)
	row.ListPrice, row.Source = &price, source
	return row
}

// GroupModelPrices is the response of GET and PUT /groups/:id/model-prices.
type GroupModelPrices struct {
	Group   GroupRef         `json:"group"`
	Segment *core.SegmentRef `json:"segment,omitempty"`
	// Rate is the rate of the segment asked for, else the group's default.
	Rate   segment.EffectiveRate `json:"rate"`
	Models []ModelPriceRow       `json:"models"`
}

// scope starts the answer on the group's model prices: the group, the
// segment asked for (0 = none) and the rate that applies.
func (gp *groupPrices) scope(ctx context.Context, q store.Querier, segmentID int64, showUsers bool) (*GroupModelPrices, error) {
	g := gp.group
	out := &GroupModelPrices{Group: g.ref()}
	if segmentID == 0 {
		one := decimal.NewFromInt(1)
		rate, source := core.SegmentRate(g.RateMultiplier, one, nil)
		out.Rate = segment.EffectiveRate{Value: rate, Source: source, GroupDefault: g.RateMultiplier, Discount: one}
		return out, nil
	}
	terms, err := segment.SegmentTerms(ctx, q, segmentID, []int64{g.ID})
	if err != nil {
		return nil, err
	}
	t, ok := terms[g.ID]
	if !ok {
		return nil, core.ErrNotFound.WithMessage(core.Text(ctx, "user group not found", "用户组不存在"))
	}
	ref, err := segment.Ref(ctx, q, segmentID, showUsers)
	if err != nil {
		return nil, err
	}
	out.Segment, out.Rate = &ref, t.EffectiveRate()
	return out, nil
}

// fill adds a row for every model the group provides, priced for the segment
// of out.
func (gp *groupPrices) fill(ctx context.Context, q store.Querier, out *GroupModelPrices) error {
	rules, err := loadRules(ctx, q, ` WHERE group_id = $1`, gp.group.ID)
	if err != nil {
		return err
	}
	ofSegments := map[string]int{}
	for key := range rules {
		if key.SegmentID != 0 {
			ofSegments[key.Model]++
		}
	}
	on := core.PriceQuery{GroupID: gp.group.ID}
	if out.Segment != nil {
		on.SegmentID = out.Segment.ID
	}
	out.Models = make([]ModelPriceRow, 0, len(gp.models))
	for _, model := range gp.models {
		on.Model = model
		row := rules.levels(on).row(model, gp.prices.base(model))
		if out.Segment == nil {
			count := ofSegments[model]
			row.SegmentRule, row.SegmentRuleCount = nil, &count
		}
		out.Models = append(out.Models, row)
	}
	return nil
}

// groupPricesQuery reads :id and ?segment_id= (0 = none) of
// /groups/:id/model-prices, or renders invalid_argument.
func groupPricesQuery(c *gin.Context) (groupID, segmentID int64, ok bool) {
	if groupID, ok = httpapi.PathID(c, "id"); !ok {
		return 0, 0, false
	}
	raw := c.Query("segment_id")
	if raw == "" {
		return groupID, 0, true
	}
	segmentID, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || segmentID <= 0 {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "segment_id", Code: "invalid", Message: "must be a positive integer"}))
		return 0, 0, false
	}
	return groupID, segmentID, true
}

// GET /groups/:id/model-prices?segment_id=
func (s *Service) showGroupPrices(c *gin.Context) {
	ctx := c.Request.Context()
	groupID, segmentID, ok := groupPricesQuery(c)
	if !ok {
		return
	}
	gp, err := loadGroupPrices(ctx, s.db.Pool, ` WHERE g.id = $1`, groupID)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	out, err := gp.scope(ctx, s.db.Pool, segmentID, s.showsUsers(ctx))
	if err == nil {
		err = gp.fill(ctx, s.db.Pool, out)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

// rulePatch is an item of PUT /groups/:id/model-prices: a null rule removes
// the one there; a null segment_id is the group's own rule.
type rulePatch struct {
	SegmentID *int64 `json:"segment_id"`
	Model     string `json:"model"`
	Rule      *Rule  `json:"rule"`
}

// ruleChange is a checked rulePatch: the rule to store on on, nil to remove.
type ruleChange struct {
	on   core.PriceQuery
	rule *storedRule
}

// check validates the items of a PUT, all or none: an item that cannot be
// saved is a field error on items.<index>. Removing a rule always can.
func (gp *groupPrices) check(ctx context.Context, q store.Querier, items []rulePatch) ([]ruleChange, error) {
	segmentIDs := []int64{}
	for _, item := range items {
		segmentIDs = append(segmentIDs, deref(item.SegmentID))
	}
	rows, err := q.Query(ctx, `SELECT id FROM segments WHERE id = ANY($1)`, segmentIDs)
	if err != nil {
		return nil, err
	}
	known, err := pgx.CollectRows(rows, pgx.RowTo[int64])
	if err != nil {
		return nil, err
	}
	changes := make([]ruleChange, 0, len(items))
	for i, item := range items {
		rule, err := gp.checkPatch(ctx, known, item)
		if err != nil {
			return nil, core.InvalidFields(core.FieldError{Field: "items." + strconv.Itoa(i), Code: "invalid", Message: err.Error()})
		}
		on := core.PriceQuery{Model: item.Model, GroupID: gp.group.ID, SegmentID: deref(item.SegmentID)}
		changes = append(changes, ruleChange{on: on, rule: rule})
	}
	return changes, nil
}

// checkPatch returns the rule an item stores, nil to remove the one there.
// The error says why the item cannot be saved; known are the segments that
// exist among those the items name.
func (gp *groupPrices) checkPatch(ctx context.Context, known []int64, item rulePatch) (*storedRule, error) {
	switch {
	case item.SegmentID != nil && !slices.Contains(known, *item.SegmentID):
		return nil, errors.New(core.Text(ctx, "unknown user group", "用户组不存在"))
	case item.Rule == nil:
		return nil, nil
	case !slices.Contains(gp.models, item.Model):
		return nil, errors.New(core.Text(ctx, "the group does not provide this model", "该分组不提供此模型"))
	}
	return checkRule(ctx, *item.Rule, gp.prices.base(item.Model))
}

// PUT /groups/:id/model-prices?segment_id= {items: [{segment_id, model, rule}]}
func (s *Service) saveGroupPrices(c *gin.Context) {
	ctx := c.Request.Context()
	groupID, segmentID, ok := groupPricesQuery(c)
	if !ok {
		return
	}
	var in struct {
		Items []rulePatch `json:"items"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	uid, _ := core.UserID(ctx)
	showUsers := s.showsUsers(ctx)
	var out *GroupModelPrices
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		gp, err := loadGroupPrices(ctx, tx, ` WHERE g.id = $1`, groupID)
		if err != nil {
			return err
		}
		if out, err = gp.scope(ctx, tx, segmentID, showUsers); err != nil {
			return err
		}
		changes, err := gp.check(ctx, tx, in.Items)
		if err != nil {
			return err
		}
		for _, change := range changes {
			if err := change.apply(ctx, tx, uid); err != nil {
				return err
			}
		}
		return gp.fill(ctx, tx, out)
	})
	// The group or a segment went away while its rules were stored.
	if store.IsForeignKeyViolation(err) {
		err = core.ErrConflict.WithMessage(core.Text(ctx, "the data changed meanwhile, try again", "数据已被其他操作修改，请重试")).WithCause(err)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, "price_rules")
	httpapi.OK(c, out)
}

func (ch ruleChange) apply(ctx context.Context, tx pgx.Tx, updatedBy int64) error {
	if ch.rule == nil {
		return deleteRule(ctx, tx, ch.on)
	}
	return saveRule(ctx, tx, ch.on, ch.rule, updatedBy)
}
