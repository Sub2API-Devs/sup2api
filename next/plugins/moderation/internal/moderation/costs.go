package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Cost sources (costs.source, CONTRACTS §72.13.3).
const (
	SourceAudit    = "audit"
	SourceAnalysis = "analysis"
	SourceTest     = "test"
	SourceTry      = "try"
	SourceSimulate = "simulate"
)

// Price modes of one call.
const (
	PricePriced   = "priced"
	PriceUnpriced = "unpriced"
	PriceFree     = "free"
)

// CallCost is the price of one metered call (or of several summed).
type CallCost struct {
	Mode         string `json:"mode"`
	Cost         string `json:"cost,omitempty"` // USD, 8 places; empty when not priced
	Reason       string `json:"reason,omitempty"`
	BillingModel string `json:"billing_model,omitempty"`
	TokensIn     int64  `json:"tokens_in"`
	TokensOut    int64  `json:"tokens_out"`
	units        int64  // cost in 1e-8 USD
}

// costUnit is 1e-8 USD, the precision the core prices with.
const costUnit int64 = 100_000_000

// parseCost reads a decimal string ("0.00001230") into 1e-8 USD units.
func parseCost(s string) (int64, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}
	neg := strings.HasPrefix(s, "-")
	s = strings.TrimPrefix(s, "-")
	whole, frac, _ := strings.Cut(s, ".")
	if len(frac) > 8 {
		frac = frac[:8]
	}
	frac += strings.Repeat("0", 8-len(frac))
	w, err1 := strconv.ParseInt(whole, 10, 64)
	f, err2 := strconv.ParseInt(frac, 10, 64)
	if err1 != nil || err2 != nil || w > math.MaxInt64/costUnit-1 {
		return 0, false
	}
	v := w*costUnit + f
	if neg {
		v = -v
	}
	return v, true
}

// formatCost renders 1e-8 USD units as a decimal string with 8 places.
func formatCost(units int64) string {
	sign := ""
	if units < 0 {
		sign, units = "-", -units
	}
	return fmt.Sprintf("%s%d.%08d", sign, units/costUnit, units%costUnit)
}

// metered reports whether a call has a known cost: it succeeded, or failed
// after the upstream reported usage.
func metered(res EngineResult, err error) bool {
	if errors.Is(err, ErrNoInput) || errors.Is(err, errNoChannel) {
		return false
	}
	u := res.Usage
	return err == nil || u.InputTokens+u.OutputTokens+u.CacheRead+u.CacheCreation > 0
}

// billingModel is the model a channel's calls are priced on.
func (ch *liveChannel) billingModel() string {
	if ch.BillingModel != "" {
		return ch.BillingModel
	}
	return ch.Model
}

// tokens returns the input (cache included) and output tokens of a usage.
func tokensOf(u EngineUsage) (in, out int64) {
	in = u.InputTokens
	if u.Semantics != SemanticsInclusive {
		in += u.CacheRead + u.CacheCreation
	}
	return in, u.OutputTokens
}

// quote prices one call of ch with the core prices (PriceUsage). OpenAI
// moderation is free; TypeSafe bills the input only.
func (p *Plugin) quote(ctx context.Context, ch *liveChannel, u EngineUsage) CallCost {
	c := CallCost{BillingModel: ch.billingModel()}
	c.TokensIn, c.TokensOut = tokensOf(u)
	switch ch.Type {
	case ChannelOpenAI:
		c.Mode = PriceFree
		return c
	case ChannelTypeSafe:
		u = EngineUsage{InputTokens: u.InputTokens, Semantics: SemanticsInclusive}
	}
	if p.host == nil {
		c.Mode, c.Reason = PriceUnpriced, "unavailable"
		return c
	}
	sem := u.Semantics
	if sem == "" {
		sem = SemanticsInclusive
	}
	q, err := p.host.PriceUsage(ctx, pluginsdk.PriceUsage{Model: c.BillingModel, Semantics: sem,
		Input: u.InputTokens, Output: u.OutputTokens, CacheRead: u.CacheRead, CacheCreation: u.CacheCreation})
	switch {
	case err != nil && status.Code(err) == codes.Unimplemented:
		c.Mode, c.Reason = PriceUnpriced, "host_too_old"
	case err != nil:
		c.Mode, c.Reason = PriceUnpriced, "unavailable"
	case !q.Priced:
		c.Mode, c.Reason = PriceUnpriced, q.Reason
	default:
		units, ok := parseCost(q.Cost)
		if !ok || units < 0 {
			c.Mode, c.Reason = PriceUnpriced, "eval_error"
			break
		}
		c.Mode, c.Cost, c.units = PricePriced, formatCost(units), units
	}
	return c
}

// ---------------------------------------------------------------- price state

// PriceState is the current pricing of a channel's billing model.
type PriceState struct {
	Priced       bool   `json:"priced"`
	Free         bool   `json:"free,omitempty"`
	Reason       string `json:"reason,omitempty"`
	BillingModel string `json:"billing_model"`
}

type priceStateEntry struct {
	state PriceState
	at    time.Time
}

// priceState asks the core whether the model has a price (cached 60 s).
func (p *Plugin) priceState(ctx context.Context, typ, model string) PriceState {
	if typ == ChannelOpenAI {
		return PriceState{Free: true, BillingModel: model}
	}
	p.priceMu.Lock()
	e, ok := p.priceCache[model]
	p.priceMu.Unlock()
	if ok && p.now().Sub(e.at) < time.Minute {
		return e.state
	}
	c := p.quote(ctx, &liveChannel{Type: typ, Model: model}, EngineUsage{Semantics: SemanticsInclusive})
	st := PriceState{Priced: c.Mode == PricePriced, Reason: c.Reason, BillingModel: model}
	if c.Reason != "unavailable" {
		p.priceMu.Lock()
		p.priceCache[model] = priceStateEntry{state: st, at: p.now()}
		p.priceMu.Unlock()
	}
	return st
}

// ---------------------------------------------------------------- GET /costs

// CostSummary adds up metered calls. The cost is kept in 1e-8 USD units and
// rendered as "cost": USD with 8 places, so the zero value is valid. Calls
// counts metered calls (priced + unpriced + free).
type CostSummary struct {
	units          int64
	Calls          int64 `json:"calls"`
	PricedCalls    int64 `json:"priced_calls"`
	UnpricedCalls  int64 `json:"unpriced_calls"`
	UnpricedTokens int64 `json:"unpriced_tokens"`
	FreeCalls      int64 `json:"free_calls"`
	TokensIn       int64 `json:"tokens_in"`
	TokensOut      int64 `json:"tokens_out"`
}

type costSummaryJSON struct {
	Cost string `json:"cost"`
	costSummaryFields
}

type costSummaryFields CostSummary

// Cost is the USD amount with 8 places.
func (s CostSummary) Cost() string { return formatCost(s.units) }

func (s CostSummary) MarshalJSON() ([]byte, error) {
	return json.Marshal(costSummaryJSON{Cost: s.Cost(), costSummaryFields: costSummaryFields(s)})
}

func (s *CostSummary) UnmarshalJSON(b []byte) error {
	var v costSummaryJSON
	if err := json.Unmarshal(b, &v); err != nil {
		return err
	}
	*s = CostSummary(v.costSummaryFields)
	units, ok := parseCost(v.Cost)
	if !ok && strings.TrimSpace(v.Cost) != "" {
		return fmt.Errorf("invalid cost %q", v.Cost)
	}
	s.units = units
	return nil
}

func (s *CostSummary) add(o CostSummary) {
	s.units += o.units
	s.Calls += o.Calls
	s.PricedCalls += o.PricedCalls
	s.UnpricedCalls += o.UnpricedCalls
	s.UnpricedTokens += o.UnpricedTokens
	s.FreeCalls += o.FreeCalls
	s.TokensIn += o.TokensIn
	s.TokensOut += o.TokensOut
}

// ChannelCost is one row of by_channel.
type ChannelCost struct {
	ChannelID    int64       `json:"channel_id"`
	Name         string      `json:"name"`
	Type         string      `json:"type"`
	Model        string      `json:"model"`
	BillingModel string      `json:"billing_model"`
	Deleted      bool        `json:"deleted"`
	Summary      CostSummary `json:"summary"`
}

// SourceCost is one row of by_source.
type SourceCost struct {
	Source  string      `json:"source"`
	Summary CostSummary `json:"summary"`
}

// CostPoint is one bucket of the trend.
type CostPoint struct {
	Bucket time.Time `json:"bucket"`
	Cost   string    `json:"cost"`
}

// CostReport is GET /costs.
type CostReport struct {
	Range     string        `json:"range"`
	From      time.Time     `json:"from"`
	To        time.Time     `json:"to"`
	Bucket    string        `json:"bucket"`
	Totals    CostSummary   `json:"totals"`
	ByChannel []ChannelCost `json:"by_channel"`
	BySource  []SourceCost  `json:"by_source"`
	Trend     []CostPoint   `json:"trend"`
}

// costSums selects a CostSummary (targets) from costs rows.
const costSums = `coalesce(round(sum(cost) * 100000000), 0)::bigint, coalesce(sum(priced_calls + unpriced_calls + free_calls), 0),
	coalesce(sum(priced_calls), 0), coalesce(sum(unpriced_calls), 0), coalesce(sum(unpriced_tokens), 0), coalesce(sum(free_calls), 0),
	coalesce(sum(tokens_in), 0), coalesce(sum(tokens_out), 0)`

func (s *CostSummary) targets() []any {
	return []any{&s.units, &s.Calls, &s.PricedCalls, &s.UnpricedCalls, &s.UnpricedTokens, &s.FreeCalls, &s.TokensIn, &s.TokensOut}
}

func (p *Plugin) getCosts(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	now := p.now().UTC()
	r := CostReport{Range: pluginsdk.Query(req, "range"), To: now, Bucket: "day", ByChannel: []ChannelCost{}, BySource: []SourceCost{}, Trend: []CostPoint{}}
	switch r.Range {
	case "", "24h":
		r.Range, r.Bucket, r.From = "24h", "hour", now.Add(-24*time.Hour).Truncate(time.Hour)
	case "7d":
		r.From = now.Add(-7 * 24 * time.Hour)
	case "30d":
		r.From = now.Add(-30 * 24 * time.Hour)
	default:
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效",
			pluginsdk.FieldErrors{}.Add("range", "enum", "range must be 24h, 7d or 30d / range 取值为 24h、7d、30d")), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	if err := p.loadCostReport(ctx, db, &r); err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(r), nil
}

// loadCostReport reads the costs rows since r.From, this node's pending sums
// included (a test shows up at once).
func (p *Plugin) loadCostReport(ctx context.Context, db *pgxpool.Pool, r *CostReport) error {
	p.flushStats(ctx)
	if err := db.QueryRow(ctx, `SELECT `+costSums+` FROM costs WHERE hour >= $1`, r.From).Scan(r.Totals.targets()...); err != nil {
		return err
	}
	rows, err := db.Query(ctx, `SELECT k.channel_id, coalesce(c.name, ''), coalesce(c.type, ''), coalesce(c.model, ''), coalesce(c.billing_model, ''),
			c.id IS NULL OR c.deleted_at IS NOT NULL, `+costSums+`
		FROM costs k LEFT JOIN channels c ON c.id = k.channel_id WHERE k.hour >= $1
		GROUP BY k.channel_id, c.id ORDER BY sum(k.cost) DESC, k.channel_id`, r.From)
	if err != nil {
		return err
	}
	r.ByChannel, err = pgx.CollectRows(rows, func(row pgx.CollectableRow) (ChannelCost, error) {
		var c ChannelCost
		err := row.Scan(append([]any{&c.ChannelID, &c.Name, &c.Type, &c.Model, &c.BillingModel, &c.Deleted}, c.Summary.targets()...)...)
		return c, err
	})
	if err != nil {
		return err
	}
	rows, err = db.Query(ctx, `SELECT source, `+costSums+` FROM costs WHERE hour >= $1 GROUP BY source ORDER BY source`, r.From)
	if err != nil {
		return err
	}
	r.BySource, err = pgx.CollectRows(rows, func(row pgx.CollectableRow) (SourceCost, error) {
		var s SourceCost
		err := row.Scan(append([]any{&s.Source}, s.Summary.targets()...)...)
		return s, err
	})
	if err != nil {
		return err
	}
	rows, err = db.Query(ctx, `SELECT date_trunc($2, hour, 'UTC'), coalesce(sum(cost), 0)::text FROM costs WHERE hour >= $1 GROUP BY 1 ORDER BY 1`, r.From, r.Bucket)
	if err != nil {
		return err
	}
	byBucket := map[int64]string{}
	var b time.Time
	var cost string
	if _, err := pgx.ForEachRow(rows, []any{&b, &cost}, func() error {
		u, _ := parseCost(cost)
		byBucket[b.Unix()] = formatCost(u)
		return nil
	}); err != nil {
		return err
	}
	step := 24 * time.Hour
	b = time.Date(r.From.Year(), r.From.Month(), r.From.Day(), 0, 0, 0, 0, time.UTC)
	if r.Bucket == "hour" {
		step, b = time.Hour, r.From.Truncate(time.Hour)
	}
	for ; !b.After(r.To); b = b.Add(step) {
		c, ok := byBucket[b.Unix()]
		if !ok {
			c = formatCost(0)
		}
		r.Trend = append(r.Trend, CostPoint{Bucket: b, Cost: c})
	}
	if r.ByChannel == nil {
		r.ByChannel = []ChannelCost{}
	}
	if r.BySource == nil {
		r.BySource = []SourceCost{}
	}
	return nil
}

// channelCosts30d sums the last 30 days of each channel, this node's pending
// sums included.
func (p *Plugin) channelCosts30d(ctx context.Context, db *pgxpool.Pool, since time.Time, channels []int64) (map[int64]CostSummary, error) {
	p.flushStats(ctx)
	rows, err := db.Query(ctx, `SELECT channel_id, `+costSums+` FROM costs WHERE hour >= $1 AND channel_id = ANY($2) GROUP BY channel_id`, since, channels)
	if err != nil {
		return nil, err
	}
	out := map[int64]CostSummary{}
	var id int64
	var s CostSummary
	_, err = pgx.ForEachRow(rows, append([]any{&id}, s.targets()...), func() error {
		out[id] = s
		return nil
	})
	return out, err
}
