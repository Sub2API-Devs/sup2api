package billing

import (
	"context"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/segment"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// QuoteRequest is the body of POST /pricing/quote: a sample call of a user,
// or of any member of a segment, in a group. Exactly one of user_id and
// segment_id is given.
type QuoteRequest struct {
	UserID    *int64     `json:"user_id"`
	SegmentID *int64     `json:"segment_id"`
	GroupID   int64      `json:"group_id"`
	Model     string     `json:"model"`
	Usage     QuoteUsage `json:"usage"`
}

// QuoteUsage is the usage of the sample call: tokens, by the variables of a
// price expression. Numbers as a form sends them; whole tokens are billed.
type QuoteUsage struct {
	P    float64 `json:"p"`
	C    float64 `json:"c"`
	CR   float64 `json:"cr"`
	CC   float64 `json:"cc"`
	CC1h float64 `json:"cc1h"`
}

func (u QuoteUsage) tokens() core.UsageTokens {
	return core.UsageTokens{Input: int64(u.P), Output: int64(u.C), CacheRead: int64(u.CR),
		CacheCreation: int64(u.CC), CacheCreation1h: int64(u.CC1h)}
}

// PricingQuote is the response of POST /pricing/quote: what the call costs
// and how both sides of the price were resolved (CONTRACTS §97).
type PricingQuote struct {
	Segment    core.SegmentRef `json:"segment"`
	Accessible bool            `json:"accessible"`
	// AccessSource is why the segment may use the group: public, grant or none.
	AccessSource string    `json:"access_source"`
	Base         *PriceDef `json:"base"`
	ListPrice    *PriceDef `json:"list_price"`
	PriceSource  string    `json:"price_source"`
	// PriceLevels are the rules as configured; the one PriceSource names applies.
	PriceLevels struct {
		Segment *Rule `json:"segment"`
		Group   *Rule `json:"group"`
	} `json:"price_levels"`
	Rate segment.EffectiveRate `json:"rate"`
	// RateOverride is the segment's own rate in the group, if it has one.
	RateOverride *decimal.Decimal `json:"rate_override"`
	ListCost     decimal.Decimal  `json:"list_cost"` // list price x usage
	Cost         decimal.Decimal  `json:"cost"`      // list cost x rate
}

// POST /pricing/quote
func (s *Service) quotePricing(c *gin.Context) {
	ctx := c.Request.Context()
	var in QuoteRequest
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if (in.UserID == nil) == (in.SegmentID == nil) {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "user_id", Code: "invalid",
			Message: core.Text(ctx, "give either user_id or segment_id", "user_id 与 segment_id 须二选一")}))
		return
	}
	out, err := s.quote(ctx, in)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

// quoteTerms returns the terms in the group of who the quote is for: the
// segment of the user, or the segment itself.
func quoteTerms(ctx context.Context, q store.Querier, in QuoteRequest) (segment.Terms, error) {
	read, id := segment.SegmentTerms, in.SegmentID
	if in.UserID != nil {
		read, id = segment.UserTerms, in.UserID
	}
	terms, err := read(ctx, q, *id, []int64{in.GroupID})
	if err != nil {
		return segment.Terms{}, err
	}
	t, ok := terms[in.GroupID]
	if !ok {
		return t, core.ErrNotFound.WithMessage(core.Text(ctx, "user or user group not found", "用户或用户组不存在"))
	}
	return t, nil
}

func (s *Service) quote(ctx context.Context, in QuoteRequest) (*PricingQuote, error) {
	gp, err := loadGroupPrices(ctx, s.db.Pool, ` WHERE g.id = $1`, in.GroupID)
	if err != nil {
		return nil, err
	}
	terms, err := quoteTerms(ctx, s.db.Pool, in)
	if err != nil {
		return nil, err
	}
	if !slices.Contains(gp.models, in.Model) {
		return nil, core.InvalidFields(core.FieldError{Field: "model", Code: "invalid",
			Message: core.Text(ctx, "the group does not provide this model", "该分组不提供此模型")})
	}
	showUsers, err := segment.ShowUsers(ctx, s.Authz)
	if err != nil {
		return nil, err
	}
	ref, err := segment.Ref(ctx, s.db.Pool, terms.SegmentID, showUsers)
	if err != nil {
		return nil, err
	}
	on := core.PriceQuery{Model: in.Model, GroupID: in.GroupID, SegmentID: terms.SegmentID}
	rules, err := loadRules(ctx, s.db.Pool, ` WHERE group_id = $1 AND model = $2`, on.GroupID, on.Model)
	if err != nil {
		return nil, err
	}
	base, levels := gp.prices.base(on.Model), rules.levels(on)
	row := levels.row(on.Model, base)
	out := &PricingQuote{Segment: ref, Accessible: terms.Open, AccessSource: accessSource(gp.group.public, terms.Granted),
		Base: row.Base, ListPrice: row.ListPrice, PriceSource: row.Source, Rate: terms.EffectiveRate(), RateOverride: terms.Override}
	out.PriceLevels.Segment, out.PriceLevels.Group = levels.segment.view(base), row.GroupRule
	out.ListCost, out.Cost, err = s.quoteCosts(ctx, on, in.Usage, terms.Rate)
	return out, err
}

// accessSource says why a segment may use a group.
func accessSource(public, granted bool) string {
	switch {
	case public:
		return "public"
	case granted:
		return "grant"
	}
	return "none"
}

// quoteCosts prices usage the way a request of on is billed: the list price
// Resolve gives, through Quote with the multiplier of the rule. listCost is
// before the rate and cost after it. Both are zero for a model without a
// global price, whatever the missing-price policy. A price the usage cannot
// be evaluated with is an error, as it is for a request.
func (s *Service) quoteCosts(ctx context.Context, on core.PriceQuery, u QuoteUsage, rate decimal.Decimal) (listCost, cost decimal.Decimal, err error) {
	snap, err := s.snapshot(ctx)
	if err != nil {
		return decimal.Zero, decimal.Zero, err
	}
	rule := snap.resolve(on)
	if rule == nil {
		return decimal.Zero, decimal.Zero, nil
	}
	in := core.QuoteInputs{Expression: rule.Expression, UsageSemantics: expr.SemanticsExclusive, Tokens: u.tokens()}
	quote := func(rate decimal.Decimal) (decimal.Decimal, error) {
		in.RateMultiplier = rule.Multiplier(rate)
		amount, err := s.Quote(ctx, in)
		if err != nil {
			return decimal.Zero, core.ErrInvalidArgument.WithMessage(err.Error())
		}
		return amount, nil
	}
	if listCost, err = quote(decimal.NewFromInt(1)); err != nil {
		return decimal.Zero, decimal.Zero, err
	}
	cost, err = quote(rate)
	return listCost, cost, err
}
