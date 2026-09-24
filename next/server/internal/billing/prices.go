package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Price is the API view of a model_prices row. Prices are global per model
// (ARCHITECTURE 7.3) and set by administrators only: typed in (manual) or
// imported from a price sync source (sync).
type Price struct {
	ID             int64           `json:"id"`
	Model          string          `json:"model"`
	Mode           string          `json:"mode"`
	Config         json.RawMessage `json:"config"`
	Expression     string          `json:"expression"`
	ExprVersion    int             `json:"expr_version"`
	ExprHash       string          `json:"expr_hash"`
	Source         string          `json:"source"`
	SyncSourceID   *int64          `json:"sync_source_id"`
	SyncSourceName *string         `json:"sync_source_name"`
	SyncedAt       *time.Time      `json:"synced_at"`
	Enabled        bool            `json:"enabled"`
	Note           string          `json:"note"`
	UpdatedBy      *int64          `json:"updated_by"`
	UpdatedAt      time.Time       `json:"updated_at"`
	Analysis       *expr.Analysis  `json:"analysis,omitempty"`
}

const priceColumns = `mp.id, mp.model, mp.mode, mp.config, mp.expression, mp.expr_version, mp.expr_hash,
	mp.source, mp.sync_source_id, ps.name, mp.synced_at, mp.enabled, mp.note, mp.updated_by, mp.updated_at`

const priceFrom = ` FROM model_prices mp LEFT JOIN price_sync_sources ps ON ps.id = mp.sync_source_id`

func scanPrice(row pgx.Row) (*Price, error) {
	p := &Price{}
	err := row.Scan(&p.ID, &p.Model, &p.Mode, &p.Config, &p.Expression, &p.ExprVersion,
		&p.ExprHash, &p.Source, &p.SyncSourceID, &p.SyncSourceName, &p.SyncedAt, &p.Enabled, &p.Note, &p.UpdatedBy, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if prog, err := expr.CompileCached(p.Expression); err == nil {
		p.Analysis = prog.Analyze()
	}
	return p, nil
}

func (s *Service) getPrice(ctx context.Context, q store.Querier, id int64, lock bool) (*Price, error) {
	sql := `SELECT ` + priceColumns + priceFrom + ` WHERE mp.id = $1`
	if lock {
		sql += ` FOR UPDATE OF mp`
	}
	p, err := scanPrice(q.QueryRow(ctx, sql, id))
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage("price not found")
	}
	return p, err
}

func (s *Service) registerPriceRoutes(r *httpapi.Router) {
	r.Perm("GET", "/prices", "price:read", s.listPrices)
	r.Perm("POST", "/prices", "price:manage", s.createPrice)
	r.Perm("POST", "/prices/validate", "price:read", s.validatePrice)
	r.Perm("POST", "/prices/preview", "price:read", s.previewPrice)
	r.Perm("GET", "/prices/history/:expr_hash", "price:read", s.priceHistory)
	r.Perm("GET", "/prices/:id", "price:read", s.showPrice)
	r.Perm("PATCH", "/prices/:id", "price:manage", s.updatePrice)
	r.Perm("DELETE", "/prices/:id", "price:manage", s.deletePrice)
}

// GET /prices?mode=&source=&sync_source_id=&enabled=&q=
func (s *Service) listPrices(c *gin.Context) {
	ctx := c.Request.Context()
	page, size := httpapi.Pagination(c)
	var where []string
	var args []any
	add := func(cond string, v any) {
		args = append(args, v)
		where = append(where, strings.ReplaceAll(cond, "?", "$"+strconv.Itoa(len(args))))
	}
	if v := c.Query("mode"); v != "" {
		add("mp.mode = ?", v)
	}
	if v := c.Query("source"); v != "" {
		add("mp.source = ?", v)
	}
	if v := c.Query("sync_source_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "sync_source_id", Code: "invalid", Message: "must be an integer"}))
			return
		}
		add("mp.sync_source_id = ?", id)
	}
	if v := c.Query("enabled"); v != "" {
		add("mp.enabled = ?", v == "true" || v == "1")
	}
	if v := strings.TrimSpace(c.Query("q")); v != "" {
		add("(mp.model ILIKE ? OR mp.note ILIKE ?)", "%"+escapeLike(v)+"%")
	}
	cond := ""
	if len(where) > 0 {
		cond = " WHERE " + strings.Join(where, " AND ")
	}
	var total int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*)`+priceFrom+cond, args...).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	args = append(args, size, (page-1)*size)
	rows, err := s.db.Pool.Query(ctx, `SELECT `+priceColumns+priceFrom+cond+
		` ORDER BY mp.model, mp.id LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	items := []*Price{}
	for rows.Next() {
		p, err := scanPrice(rows)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		items = append(items, p)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
}

func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

func (s *Service) showPrice(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	p, err := s.getPrice(c.Request.Context(), s.db.Pool, id, false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, p)
}

// priceInput is the body of POST/PATCH /prices.
type priceInput struct {
	Model      *string         `json:"model"`
	Mode       *string         `json:"mode"`
	Config     json.RawMessage `json:"config"`
	Expression *string         `json:"expression"`
	Enabled    *bool           `json:"enabled"`
	Note       *string         `json:"note"`
	// Confirm acknowledges the big-cost warning.
	Confirm bool `json:"confirm"`
}

// checked is a validated expression ready to store.
type checked struct {
	mode   string
	config json.RawMessage
	src    string
	prog   *expr.Program
}

// check builds and validates the expression for a price. Validation errors
// and an unconfirmed big-cost warning are returned as invalid_argument with
// details {errors, warnings, confirmation_required}.
func (s *Service) check(ctx context.Context, mode string, config json.RawMessage, expression string, confirm bool) (*checked, error) {
	if len(config) == 0 || string(config) == "null" {
		config = json.RawMessage("{}")
	}
	if !json.Valid(config) {
		return nil, core.InvalidFields(core.FieldError{Field: "config", Code: "invalid", Message: "must be a JSON object"})
	}
	src, err := expressionFor(mode, config, strings.TrimSpace(expression))
	if err != nil {
		if ce, ok := err.(*expr.ConfigError); ok {
			return nil, core.ErrInvalidArgument.WithMessage(ce.Error()).WithDetails(map[string]any{
				"fields": []core.FieldError{{Field: ce.Field, Code: ce.Issue.Code, Message: ce.Issue.Detail}},
				"errors": []expr.Issue{ce.Issue},
			})
		}
		return nil, core.InvalidFields(core.FieldError{Field: "mode", Code: "invalid", Message: err.Error()})
	}
	st, _ := s.Settings(ctx)
	rep := expr.Validate(src, expr.ValidateOptions{Facts: s.factsFor(), BigCostUSD: st.BigCostWarningUSD})
	if !rep.OK {
		return nil, core.ErrInvalidArgument.WithMessage("invalid price expression").WithDetails(map[string]any{
			"expression": src, "errors": rep.Errors, "warnings": rep.Warnings,
		})
	}
	if !confirm {
		for _, w := range rep.Warnings {
			if w.Code == expr.CodeBigCost {
				return nil, core.ErrInvalidArgument.WithMessage("confirmation required").WithDetails(map[string]any{
					"expression": src, "errors": []expr.Issue{}, "warnings": rep.Warnings, "confirmation_required": true,
				})
			}
		}
	}
	prog, err := expr.CompileCached(src)
	if err != nil {
		return nil, err
	}
	return &checked{mode: mode, config: config, src: src, prog: prog}, nil
}

// modelField is the field error for a model that is not a complete model id.
func modelField(code string) core.FieldError {
	return core.FieldError{Field: "model", Code: code,
		Message: "a complete model id: letters, digits and . _ : / @ + - (no wildcards)"}
}

func (s *Service) createPrice(c *gin.Context) {
	ctx := c.Request.Context()
	var in priceInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	var fields []core.FieldError
	model, mode := deref(in.Model), deref(in.Mode)
	switch {
	case model == "":
		fields = append(fields, modelField("required"))
	case !manifest.ValidModelID(model):
		fields = append(fields, modelField("invalid"))
	}
	if mode == "" {
		fields = append(fields, core.FieldError{Field: "mode", Code: "required", Message: "per_request, per_token or expression"})
	}
	if len(fields) > 0 {
		httpapi.Fail(c, core.InvalidFields(fields...))
		return
	}
	ck, err := s.check(ctx, mode, in.Config, deref(in.Expression), in.Confirm)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	enabled := in.Enabled == nil || *in.Enabled
	uid, _ := core.UserID(ctx)
	var p *Price
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		var id int64
		if err := tx.QueryRow(ctx, `
			INSERT INTO model_prices (model, mode, config, expression, expr_version, expr_hash,
				source, enabled, note, updated_by)
			VALUES ($1, $2, $3, $4, $5, $6, 'manual', $7, $8, $9)
			RETURNING id`,
			model, ck.mode, ck.config, ck.src, ck.prog.Version(), ck.prog.Hash(),
			enabled, deref(in.Note), nullID(uid)).Scan(&id); err != nil {
			return err
		}
		var err error
		if p, err = s.getPrice(ctx, tx, id, false); err != nil {
			return err
		}
		return recordHistory(ctx, tx, ck.prog)
	})
	if store.IsUniqueViolation(err, "") {
		httpapi.Fail(c, errPriceExists)
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, "prices")
	httpapi.Created(c, p)
}

func (s *Service) updatePrice(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in priceInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	uid, _ := core.UserID(ctx)
	var out *Price
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		cur, err := s.getPrice(ctx, tx, id, true)
		if err != nil {
			return err
		}
		model, mode := cur.Model, cur.Mode
		if in.Model != nil {
			model = *in.Model
		}
		if in.Mode != nil {
			mode = *in.Mode
		}
		if !manifest.ValidModelID(model) {
			return core.InvalidFields(modelField("invalid"))
		}
		config, expression := cur.Config, cur.Expression
		pricing := in.Mode != nil || in.Config != nil || in.Expression != nil
		if in.Config != nil {
			config = in.Config
		}
		if in.Expression != nil {
			expression = *in.Expression
		} else if in.Config != nil && mode == expr.ModeExpression && expr.HasVisualConfig(in.Config) {
			expression = "" // regenerate from the new visual config
		}
		src, hash, version := cur.Expression, cur.ExprHash, cur.ExprVersion
		if pricing {
			ck, err := s.check(ctx, mode, config, expression, in.Confirm)
			if err != nil {
				return err
			}
			config, src, hash, version = ck.config, ck.src, ck.prog.Hash(), ck.prog.Version()
			if err := recordHistory(ctx, tx, ck.prog); err != nil {
				return err
			}
		}
		enabled, note := cur.Enabled, cur.Note
		if in.Enabled != nil {
			enabled = *in.Enabled
		}
		if in.Note != nil {
			note = *in.Note
		}
		// Editing a synced price makes it manual: later syncs only replace
		// it when an administrator selects it in the preview.
		source, syncID := cur.Source, cur.SyncSourceID
		if pricing || in.Model != nil {
			source, syncID = SourceManual, nil
		}
		if _, err := tx.Exec(ctx, `
			UPDATE model_prices SET model = $2, mode = $3, config = $4, expression = $5,
				expr_version = $6, expr_hash = $7, enabled = $8, note = $9, updated_by = $10,
				source = $11, sync_source_id = $12, updated_at = now()
			WHERE id = $1`,
			id, model, mode, config, src, version, hash, enabled, note, nullID(uid), source, syncID); err != nil {
			return err
		}
		out, err = s.getPrice(ctx, tx, id, false)
		return err
	})
	if store.IsUniqueViolation(err, "") {
		httpapi.Fail(c, errPriceExists)
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, "prices")
	httpapi.OK(c, out)
}

func (s *Service) deletePrice(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if _, err := s.getPrice(ctx, s.db.Pool, id, false); err != nil {
		httpapi.Fail(c, err)
		return
	}
	if _, err := s.db.Pool.Exec(ctx, `DELETE FROM model_prices WHERE id = $1`, id); err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, "prices")
	httpapi.NoContent(c)
}

var errPriceExists = core.ErrConflict.WithMessage("a price for this model already exists")

func (s *Service) priceHistory(c *gin.Context) {
	ctx := c.Request.Context()
	hash := c.Param("expr_hash")
	var out struct {
		ExprHash    string    `json:"expr_hash"`
		Expression  string    `json:"expression"`
		ExprVersion int       `json:"expr_version"`
		CreatedAt   time.Time `json:"created_at"`
	}
	err := s.db.Pool.QueryRow(ctx, `SELECT expr_hash, expression, expr_version, created_at FROM model_price_history WHERE expr_hash = $1`, hash).
		Scan(&out.ExprHash, &out.Expression, &out.ExprVersion, &out.CreatedAt)
	if store.IsNoRows(err) {
		httpapi.Fail(c, core.ErrNotFound.WithMessage("expression not found"))
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

// POST /prices/validate {mode, config?, expression?}
func (s *Service) validatePrice(c *gin.Context) {
	ctx := c.Request.Context()
	var in struct {
		Mode       string          `json:"mode"`
		Config     json.RawMessage `json:"config"`
		Expression string          `json:"expression"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.Mode == "" {
		in.Mode = expr.ModeExpression
	}
	if len(in.Config) == 0 || string(in.Config) == "null" {
		in.Config = json.RawMessage("{}")
	}
	src, err := expressionFor(in.Mode, in.Config, strings.TrimSpace(in.Expression))
	if err != nil {
		issue := expr.Issue{Code: expr.CodeConfig, Message: map[string]string{"en": err.Error(), "zh": err.Error()}}
		if ce, ok := err.(*expr.ConfigError); ok {
			issue = ce.Issue
		}
		httpapi.OK(c, &expr.Report{Errors: []expr.Issue{issue}, Warnings: []expr.Issue{}})
		return
	}
	st, _ := s.Settings(ctx)
	httpapi.OK(c, expr.Validate(src, expr.ValidateOptions{Facts: s.factsFor(), BigCostUSD: st.BigCostWarningUSD}))
}

// PreviewRequest is the body of POST /prices/preview.
type PreviewRequest struct {
	PriceID    *int64            `json:"price_id"`
	Mode       string            `json:"mode"`
	Config     json.RawMessage   `json:"config"`
	Expression string            `json:"expression"`
	Usage      PreviewUsage      `json:"usage"`
	Metrics    map[string]any    `json:"metrics"`
	Headers    map[string]string `json:"headers"`
	Params     map[string]any    `json:"params"`
	At         *time.Time        `json:"at"`
	GroupID    *int64            `json:"group_id"`
}

// PreviewUsage holds token counts in the exclusive form (p excludes cache).
// They are normalized like settlement (expr.Normalize): cache categories the
// expression does not price are not billed. len defaults to
// p + cr + cc + cc1h.
type PreviewUsage struct {
	P    float64  `json:"p"`
	C    float64  `json:"c"`
	CR   float64  `json:"cr"`
	CC   float64  `json:"cc"`
	CC1h float64  `json:"cc1h"`
	Len  *float64 `json:"len"`
}

// PreviewResult is the response of POST /prices/preview.
type PreviewResult struct {
	Cost           decimal.Decimal   `json:"cost"`      // after the group multiplier
	BaseCost       decimal.Decimal   `json:"base_cost"` // before the group multiplier
	RateMultiplier decimal.Decimal   `json:"rate_multiplier"`
	Tier           string            `json:"tier"`
	Rules          []expr.RuleResult `json:"rules"`
	Breakdown      expr.Breakdown    `json:"breakdown"`
	Expression     string            `json:"expression"`
	ExprHash       string            `json:"expr_hash"`
}

func (s *Service) previewPrice(c *gin.Context) {
	ctx := c.Request.Context()
	var in PreviewRequest
	if !httpapi.BindJSON(c, &in) {
		return
	}
	src := in.Expression
	if in.PriceID != nil {
		p, err := s.getPrice(ctx, s.db.Pool, *in.PriceID, false)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		src = p.Expression
	} else {
		mode := in.Mode
		if mode == "" {
			mode = expr.ModeExpression
		}
		var err error
		if src, err = expressionFor(mode, in.Config, strings.TrimSpace(in.Expression)); err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()))
			return
		}
	}
	prog, err := expr.CompileCached(src)
	if err != nil {
		details := map[string]any{"expression": src}
		if ce, ok := err.(*expr.CompileError); ok {
			details["errors"] = []expr.Issue{ce.Issue}
		}
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid price expression").WithDetails(details))
		return
	}
	u := in.Usage
	vars := expr.Normalize(expr.SemanticsExclusive, expr.Tokens{
		Input: int64(u.P), Output: int64(u.C), CacheRead: int64(u.CR), CacheCreation: int64(u.CC), CacheCreation1h: int64(u.CC1h),
	}, prog.Uses)
	if u.Len != nil {
		vars.Len = *u.Len
	}
	input := expr.Input{Vars: vars, Metrics: in.Metrics, Headers: map[string]string{}, Params: map[string]string{}}
	for k, v := range in.Headers {
		input.Headers[strings.ToLower(k)] = v
	}
	for k, v := range in.Params {
		b, _ := json.Marshal(v)
		input.Params[k] = string(b)
	}
	if in.At != nil {
		input.At = *in.At
	}
	res, err := prog.Eval(input)
	if err != nil {
		details := map[string]any{"expression": src}
		if ee, ok := err.(*expr.EvalError); ok {
			details["errors"] = []expr.Issue{ee.Issue}
		}
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage(err.Error()).WithDetails(details))
		return
	}
	mult := decimal.NewFromInt(1)
	if in.GroupID != nil {
		err := s.db.Pool.QueryRow(ctx, `SELECT rate_multiplier FROM groups WHERE id = $1`, *in.GroupID).Scan(&mult)
		if store.IsNoRows(err) {
			httpapi.Fail(c, core.ErrNotFound.WithMessage("group not found"))
			return
		}
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
	}
	httpapi.OK(c, &PreviewResult{
		Cost:           FinalCost(res.Cost, mult),
		BaseCost:       res.Cost,
		RateMultiplier: mult,
		Tier:           res.Tier,
		Rules:          res.Rules,
		Breakdown:      res.Breakdown,
		Expression:     prog.Expression(),
		ExprHash:       prog.Hash(),
	})
}

// FinalCost applies the group multiplier and rounds to the 8 decimal places
// stored in the database.
func FinalCost(cost, rateMultiplier decimal.Decimal) decimal.Decimal {
	return cost.Mul(rateMultiplier).Round(8)
}

func deref[T any](p *T) T {
	var zero T
	if p == nil {
		return zero
	}
	return *p
}

// expressionFor returns the expression stored for a price: generated from
// the visual config, or the hand-written expression in expression mode.
func expressionFor(mode string, config json.RawMessage, expression string) (string, error) {
	switch mode {
	case expr.ModePerRequest, expr.ModePerToken:
		return expr.Generate(mode, config)
	case expr.ModeExpression:
		if expression != "" {
			return expression, nil
		}
		return expr.Generate(mode, config)
	}
	return "", fmt.Errorf("unknown mode %q", mode)
}

func recordHistory(ctx context.Context, q store.Querier, p *expr.Program) error {
	_, err := q.Exec(ctx, `
		INSERT INTO model_price_history (expr_hash, expression, expr_version) VALUES ($1, $2, $3)
		ON CONFLICT (expr_hash) DO NOTHING`, p.Hash(), p.Expression(), p.Version())
	return err
}
