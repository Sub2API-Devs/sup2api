package billing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Price sync source kinds (CONTRACTS §17).
const (
	KindLiteLLM   = "litellm"    // LiteLLM model_prices_and_context_window.json
	KindModelsDev = "models_dev" // models.dev api.json
	KindSup2API   = "sup2api"    // an upstream sup2api, read with one of its API keys
)

// Default URLs and provider filters of the public price catalogs.
const (
	DefaultLiteLLMURL   = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json"
	DefaultModelsDevURL = "https://models.dev/api.json"
)

var (
	defaultLiteLLMProviders   = []string{"anthropic", "openai", "gemini"}
	defaultModelsDevProviders = []string{"anthropic", "openai", "google"}
)

const (
	maxSourceBytes  = 64 << 20
	sourceAPIKeyAAD = "price-source:api-key"
	// longContextLen is the prompt length above which the catalogs' long
	// context prices apply (len counts input plus cache tokens).
	longContextLen = 200000
)

// SyncDeps enables price sync sources and the API-key price export.
type SyncDeps struct {
	Cipher *secret.Cipher           // encrypts upstream sup2api API keys
	Keys   core.APIKeyAuthenticator // authenticates GET /key/prices
	HTTP   *http.Client             // fetches sources (default: 60s timeout)
}

// SetSyncDeps wires the sync dependencies (app assembly).
func (s *Service) SetSyncDeps(d SyncDeps) {
	if d.HTTP == nil {
		d.HTTP = &http.Client{Timeout: 60 * time.Second}
	}
	s.sync = d
}

// PriceSource is the API view of a price_sync_sources row.
type PriceSource struct {
	ID           int64           `json:"id"`
	Name         string          `json:"name"`
	Kind         string          `json:"kind"`
	URL          string          `json:"url"`
	HasAPIKey    bool            `json:"has_api_key"`
	Options      json.RawMessage `json:"options"`
	Enabled      bool            `json:"enabled"`
	LastSyncedAt *time.Time      `json:"last_synced_at"`
	LastError    string          `json:"last_error"`
	PriceCount   int64           `json:"price_count"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`

	apiKeyEnc []byte
}

// sourceOptions is the union of the per-kind options.
type sourceOptions struct {
	Providers       []string `json:"providers,omitempty"`        // litellm, models_dev
	ApplyMultiplier *bool    `json:"apply_multiplier,omitempty"` // sup2api (default true)
}

const sourceColumns = `ps.id, ps.name, ps.kind, ps.url, ps.api_key_enc, ps.options, ps.enabled,
	ps.last_synced_at, ps.last_error, ps.created_at, ps.updated_at,
	(SELECT count(*) FROM model_prices mp WHERE mp.sync_source_id = ps.id)`

func scanSource(row pgx.Row) (*PriceSource, error) {
	p := &PriceSource{}
	err := row.Scan(&p.ID, &p.Name, &p.Kind, &p.URL, &p.apiKeyEnc, &p.Options, &p.Enabled,
		&p.LastSyncedAt, &p.LastError, &p.CreatedAt, &p.UpdatedAt, &p.PriceCount)
	if err != nil {
		return nil, err
	}
	p.HasAPIKey = len(p.apiKeyEnc) > 0
	return p, nil
}

func (s *Service) getSource(ctx context.Context, q store.Querier, id int64) (*PriceSource, error) {
	p, err := scanSource(q.QueryRow(ctx, `SELECT `+sourceColumns+` FROM price_sync_sources ps WHERE ps.id = $1`, id))
	if store.IsNoRows(err) {
		return nil, core.ErrNotFound.WithMessage("price source not found")
	}
	return p, err
}

func (s *Service) registerSyncRoutes(r *httpapi.Router) {
	r.Perm("GET", "/price-sources", "price:read", s.listSources)
	r.Perm("POST", "/price-sources", "price:manage", s.createSource)
	r.Perm("PATCH", "/price-sources/:id", "price:manage", s.updateSource)
	r.Perm("DELETE", "/price-sources/:id", "price:manage", s.deleteSource)
	r.Perm("POST", "/price-sources/:id/preview", "price:manage", s.previewSync)
	r.Perm("POST", "/price-sources/:id/apply", "price:manage", s.applySync)
	// Downstream sup2api instances read our prices with one of our API keys.
	r.Public("GET", "/key/prices", s.keyPrices)
}

func (s *Service) listSources(c *gin.Context) {
	ctx := c.Request.Context()
	rows, err := s.db.Pool.Query(ctx, `SELECT `+sourceColumns+` FROM price_sync_sources ps ORDER BY ps.id`)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	out := []*PriceSource{}
	for rows.Next() {
		p, err := scanSource(rows)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

// sourceInput is the body of POST/PATCH /price-sources. api_key: omitted or
// null keeps the stored key, "" clears it.
type sourceInput struct {
	Name    *string         `json:"name"`
	Kind    *string         `json:"kind"`
	URL     *string         `json:"url"`
	APIKey  *string         `json:"api_key"`
	Options json.RawMessage `json:"options"`
	Enabled *bool           `json:"enabled"`
}

// validateSource checks a complete source definition and returns its
// normalized options.
func validateSource(name, kind, rawURL string, hasKey bool, options json.RawMessage) (json.RawMessage, error) {
	var fields []core.FieldError
	add := func(f, code, msg string) {
		fields = append(fields, core.FieldError{Field: f, Code: code, Message: msg})
	}
	if n := strings.TrimSpace(name); n == "" || len(n) > 100 {
		add("name", "invalid", "1-100 characters")
	}
	switch kind {
	case KindLiteLLM, KindModelsDev, KindSup2API:
	default:
		add("kind", "invalid", "litellm, models_dev or sup2api")
	}
	if u, err := url.Parse(rawURL); err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		add("url", "invalid", "an absolute http(s) URL")
	}
	if kind == KindSup2API && !hasKey {
		add("api_key", "required", "an API key of the upstream sup2api is required")
	}
	var o sourceOptions
	if len(options) > 0 && string(options) != "null" {
		dec := json.NewDecoder(strings.NewReader(string(options)))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&o); err != nil {
			add("options", "invalid", err.Error())
		}
	}
	switch kind {
	case KindLiteLLM, KindModelsDev:
		o.ApplyMultiplier = nil
		for _, p := range o.Providers {
			if strings.TrimSpace(p) == "" {
				add("options.providers", "invalid", "provider ids must not be empty")
				break
			}
		}
	case KindSup2API:
		o.Providers = nil
		if o.ApplyMultiplier == nil {
			t := true
			o.ApplyMultiplier = &t
		}
	}
	if len(fields) > 0 {
		return nil, core.InvalidFields(fields...)
	}
	b, _ := json.Marshal(o)
	return b, nil
}

func (s *Service) encryptKey(key string) ([]byte, error) {
	if s.sync.Cipher == nil {
		return nil, core.ErrUnavailable.WithMessage("price source keys cannot be stored on this node")
	}
	return s.sync.Cipher.Encrypt([]byte(key), []byte(sourceAPIKeyAAD))
}

func (s *Service) createSource(c *gin.Context) {
	ctx := c.Request.Context()
	var in sourceInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	key := strings.TrimSpace(deref(in.APIKey))
	opts, err := validateSource(deref(in.Name), deref(in.Kind), strings.TrimSpace(deref(in.URL)), key != "", in.Options)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	var enc []byte
	if key != "" {
		if enc, err = s.encryptKey(key); err != nil {
			httpapi.Fail(c, err)
			return
		}
	}
	enabled := in.Enabled == nil || *in.Enabled
	var id int64
	err = s.db.Pool.QueryRow(ctx, `
		INSERT INTO price_sync_sources (name, kind, url, api_key_enc, options, enabled)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		strings.TrimSpace(*in.Name), *in.Kind, strings.TrimSpace(*in.URL), enc, opts, enabled).Scan(&id)
	if store.IsUniqueViolation(err, "") {
		httpapi.Fail(c, core.ErrConflict.WithMessage("a price source with this name already exists"))
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	p, err := s.getSource(ctx, s.db.Pool, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.Created(c, p)
}

func (s *Service) updateSource(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in sourceInput
	if !httpapi.BindJSON(c, &in) {
		return
	}
	cur, err := s.getSource(ctx, s.db.Pool, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	name, kind, u, opts, enabled := cur.Name, cur.Kind, cur.URL, cur.Options, cur.Enabled
	if in.Name != nil {
		name = strings.TrimSpace(*in.Name)
	}
	if in.Kind != nil {
		kind = *in.Kind
	}
	if in.URL != nil {
		u = strings.TrimSpace(*in.URL)
	}
	if in.Options != nil {
		opts = in.Options
	}
	if in.Enabled != nil {
		enabled = *in.Enabled
	}
	enc := cur.apiKeyEnc
	if in.APIKey != nil {
		if k := strings.TrimSpace(*in.APIKey); k == "" {
			enc = nil
		} else if enc, err = s.encryptKey(k); err != nil {
			httpapi.Fail(c, err)
			return
		}
	}
	if opts, err = validateSource(name, kind, u, len(enc) > 0, opts); err != nil {
		httpapi.Fail(c, err)
		return
	}
	_, err = s.db.Pool.Exec(ctx, `
		UPDATE price_sync_sources SET name = $2, kind = $3, url = $4, api_key_enc = $5, options = $6,
			enabled = $7, updated_at = now() WHERE id = $1`, id, name, kind, u, enc, opts, enabled)
	if store.IsUniqueViolation(err, "") {
		httpapi.Fail(c, core.ErrConflict.WithMessage("a price source with this name already exists"))
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	p, err := s.getSource(ctx, s.db.Pool, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, p)
}

// deleteSource keeps the prices imported from the source (sync_source_id
// becomes NULL).
func (s *Service) deleteSource(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	tag, err := s.db.Pool.Exec(ctx, `DELETE FROM price_sync_sources WHERE id = $1`, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		httpapi.Fail(c, core.ErrNotFound.WithMessage("price source not found"))
		return
	}
	s.changed(ctx, "prices")
	httpapi.NoContent(c)
}

// ---------------------------------------------------------------- fetch and parse

// syncPrice is one price offered by a source.
type syncPrice struct {
	Model      string          `json:"model"`
	Mode       string          `json:"mode"`
	Config     json.RawMessage `json:"config"`
	Expression string          `json:"expression"`
	hash       string
	version    int
}

// fetched is the parsed content of a source.
type fetched struct {
	prices  map[string]*syncPrice
	skipped int
}

func (s *Service) fetchSource(ctx context.Context, src *PriceSource) (*fetched, error) {
	var opts sourceOptions
	_ = json.Unmarshal(src.Options, &opts)
	target := src.URL
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "sub2api-next price sync")
	if src.Kind == KindSup2API {
		u, err := url.Parse(strings.TrimRight(src.URL, "/") + "/api/v1/key/prices")
		if err != nil {
			return nil, err
		}
		req.URL = u
		if len(src.apiKeyEnc) == 0 || s.sync.Cipher == nil {
			return nil, errors.New("no API key for the upstream sup2api")
		}
		key, err := s.sync.Cipher.Decrypt(src.apiKeyEnc, []byte(sourceAPIKeyAAD))
		if err != nil {
			return nil, fmt.Errorf("decrypt API key: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+string(key))
	}
	client := s.sync.HTTP
	if client == nil {
		client = &http.Client{Timeout: 60 * time.Second}
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxSourceBytes+1))
	if err != nil {
		return nil, err
	}
	if len(body) > maxSourceBytes {
		return nil, fmt.Errorf("response larger than %d MiB", maxSourceBytes>>20)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%s returned HTTP %d: %s", req.URL.Redacted(), resp.StatusCode, truncate(string(body), 200))
	}
	var out *fetched
	switch src.Kind {
	case KindLiteLLM:
		providers := opts.Providers
		if len(providers) == 0 {
			providers = defaultLiteLLMProviders
		}
		out, err = parseLiteLLM(body, providers)
	case KindModelsDev:
		providers := opts.Providers
		if len(providers) == 0 {
			providers = defaultModelsDevProviders
		}
		out, err = parseModelsDev(body, providers)
	case KindSup2API:
		apply := opts.ApplyMultiplier == nil || *opts.ApplyMultiplier
		out, err = parseSup2API(body, apply)
	default:
		err = fmt.Errorf("unknown source kind %q", src.Kind)
	}
	if err != nil {
		return nil, err
	}
	for m, p := range out.prices {
		if err := p.compile(); err != nil {
			delete(out.prices, m)
			out.skipped++
		}
	}
	return out, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

// compile generates (when needed) and compiles the expression.
func (p *syncPrice) compile() error {
	if p.Expression == "" {
		src, err := expressionFor(p.Mode, p.Config, "")
		if err != nil {
			return err
		}
		p.Expression = src
	}
	prog, err := expr.CompileCached(p.Expression)
	if err != nil {
		return err
	}
	p.hash, p.version = prog.Hash(), prog.Version()
	p.Expression = prog.Expression()
	return nil
}

// perMillion converts a USD-per-token price to USD per million tokens.
func perMillion(v *expr.Num) *decimal.Decimal {
	if v == nil {
		return nil
	}
	d := decimal.NewFromFloat(float64(*v)).Shift(6)
	return &d
}

// tokenSet is one price level in USD per million tokens (nil = not billed).
type tokenSet struct{ p, c, cr, cc, cc1h *decimal.Decimal }

func (t tokenSet) config() map[string]any {
	m := map[string]any{}
	put := func(k string, v *decimal.Decimal) {
		if v != nil {
			m[k] = json.Number(v.String())
		}
	}
	put("p", t.p)
	put("c", t.c)
	put("cr", t.cr)
	put("cc", t.cc)
	put("cc1h", t.cc1h)
	return m
}

// or fills the unset prices of t from base.
func (t tokenSet) or(base tokenSet) tokenSet {
	pick := func(a, b *decimal.Decimal) *decimal.Decimal {
		if a != nil {
			return a
		}
		return b
	}
	return tokenSet{pick(t.p, base.p), pick(t.c, base.c), pick(t.cr, base.cr), pick(t.cc, base.cc), pick(t.cc1h, base.cc1h)}
}

func (t tokenSet) empty() bool {
	return t.p == nil && t.c == nil && t.cr == nil && t.cc == nil && t.cc1h == nil
}

// levelsPrice builds a per_token price, or an expression price with context
// tiers: levels[0] applies up to sizes[0] tokens of prompt, levels[i] above
// sizes[i-1]. The standard level must set input or output.
func levelsPrice(model string, levels []tokenSet, sizes []int64) *syncPrice {
	if len(levels) == 0 || levels[0].p == nil && levels[0].c == nil {
		return nil
	}
	zero := decimal.Zero
	if levels[0].p == nil {
		levels[0].p = &zero
	}
	if levels[0].c == nil {
		levels[0].c = &zero
	}
	if len(levels) == 1 {
		cfg, _ := json.Marshal(levels[0].config())
		return &syncPrice{Model: model, Mode: expr.ModePerToken, Config: cfg}
	}
	tiers := make([]map[string]any, 0, len(levels))
	for i, l := range levels {
		t := l.or(levels[0]).config()
		switch {
		case i == 0:
			t["name"] = "standard"
		case len(levels) == 2:
			t["name"] = "long_context"
		default:
			t["name"] = fmt.Sprintf("over_%d", sizes[i-1])
		}
		if i < len(sizes) {
			t["max_len"] = sizes[i]
		} else {
			t["max_len"] = nil
		}
		tiers = append(tiers, t)
	}
	cfg, _ := json.Marshal(map[string]any{"tiers": tiers})
	return &syncPrice{Model: model, Mode: expr.ModeExpression, Config: cfg}
}

// litellmEntry is the part of a LiteLLM catalog entry used here (USD per token).
type litellmEntry struct {
	Provider string    `json:"litellm_provider"`
	Mode     string    `json:"mode"`
	In       *expr.Num `json:"input_cost_per_token"`
	Out      *expr.Num `json:"output_cost_per_token"`
	CR       *expr.Num `json:"cache_read_input_token_cost"`
	CC       *expr.Num `json:"cache_creation_input_token_cost"`
	CC1h     *expr.Num `json:"cache_creation_input_token_cost_above_1hr"`
	In200    *expr.Num `json:"input_cost_per_token_above_200k_tokens"`
	Out200   *expr.Num `json:"output_cost_per_token_above_200k_tokens"`
	CR200    *expr.Num `json:"cache_read_input_token_cost_above_200k_tokens"`
	CC200    *expr.Num `json:"cache_creation_input_token_cost_above_200k_tokens"`
	CC1h200  *expr.Num `json:"cache_creation_input_token_cost_above_1hr_above_200k_tokens"`
}

var litellmModes = map[string]bool{"chat": true, "completion": true, "responses": true, "embedding": true}

// parseLiteLLM reads model_prices_and_context_window.json. Keys are native
// model ids, sometimes prefixed with "<provider>/"; entries of providers not
// listed are ignored, and the earlier provider wins when two give the same id.
func parseLiteLLM(body []byte, providers []string) (*fetched, error) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("not a LiteLLM price catalog: %w", err)
	}
	rank := map[string]int{}
	for i, p := range providers {
		rank[p] = i + 1
	}
	out := &fetched{prices: map[string]*syncPrice{}}
	best := map[string]int{}
	keys := make([]string, 0, len(raw))
	for k := range raw {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		var e litellmEntry
		if json.Unmarshal(raw[k], &e) != nil || rank[e.Provider] == 0 || !litellmModes[e.Mode] {
			continue
		}
		model := strings.TrimPrefix(k, e.Provider+"/")
		if !manifest.ValidModelID(model) || strings.Contains(model, "/") {
			out.skipped++
			continue
		}
		std := tokenSet{perMillion(e.In), perMillion(e.Out), perMillion(e.CR), perMillion(e.CC), perMillion(e.CC1h)}
		long := tokenSet{perMillion(e.In200), perMillion(e.Out200), perMillion(e.CR200), perMillion(e.CC200), perMillion(e.CC1h200)}
		levels, sizes := []tokenSet{std}, []int64{}
		if !long.empty() {
			levels, sizes = append(levels, long), []int64{longContextLen}
		}
		p := levelsPrice(model, levels, sizes)
		if p == nil {
			out.skipped++
			continue
		}
		if r, ok := best[model]; ok && r <= rank[e.Provider] {
			continue
		}
		best[model] = rank[e.Provider]
		out.prices[model] = p
	}
	return out, nil
}

// modelsDevCost is models.dev's cost object (USD per million tokens).
type modelsDevCost struct {
	Input     *expr.Num `json:"input"`
	Output    *expr.Num `json:"output"`
	CacheRead *expr.Num `json:"cache_read"`
	CacheW    *expr.Num `json:"cache_write"`
	Tiers     []struct {
		Input     *expr.Num `json:"input"`
		Output    *expr.Num `json:"output"`
		CacheRead *expr.Num `json:"cache_read"`
		CacheW    *expr.Num `json:"cache_write"`
		Tier      struct {
			Type string `json:"type"`
			Size int64  `json:"size"`
		} `json:"tier"`
	} `json:"tiers"`
}

func num(v *expr.Num) *decimal.Decimal {
	if v == nil {
		return nil
	}
	d := decimal.NewFromFloat(float64(*v))
	return &d
}

// parseModelsDev reads models.dev api.json: {provider: {models: {id: {cost}}}}.
// Only the listed providers are read; the earlier provider wins on an id
// clash. models.dev has no 1-hour cache write price.
func parseModelsDev(body []byte, providers []string) (*fetched, error) {
	var raw map[string]struct {
		Models map[string]struct {
			Cost *modelsDevCost `json:"cost"`
		} `json:"models"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("not a models.dev catalog: %w", err)
	}
	out := &fetched{prices: map[string]*syncPrice{}}
	for _, prov := range providers {
		ms := raw[prov].Models
		ids := make([]string, 0, len(ms))
		for id := range ms {
			ids = append(ids, id)
		}
		sort.Strings(ids)
		for _, id := range ids {
			c := ms[id].Cost
			if _, dup := out.prices[id]; dup || c == nil {
				continue
			}
			if !manifest.ValidModelID(id) {
				out.skipped++
				continue
			}
			levels := []tokenSet{{p: num(c.Input), c: num(c.Output), cr: num(c.CacheRead), cc: num(c.CacheW)}}
			var sizes []int64
			tiers := c.Tiers
			sort.SliceStable(tiers, func(i, j int) bool { return tiers[i].Tier.Size < tiers[j].Tier.Size })
			for _, t := range tiers {
				if t.Tier.Type != "context" || t.Tier.Size <= 0 {
					continue
				}
				sizes = append(sizes, t.Tier.Size)
				levels = append(levels, tokenSet{p: num(t.Input), c: num(t.Output), cr: num(t.CacheRead), cc: num(t.CacheW)})
			}
			p := levelsPrice(id, levels, sizes)
			if p == nil {
				out.skipped++
				continue
			}
			out.prices[id] = p
		}
	}
	return out, nil
}

// KeyPrices is the response of GET /key/prices.
type KeyPrices struct {
	Prices         []syncPrice     `json:"prices"`
	RateMultiplier decimal.Decimal `json:"rate_multiplier"`
	Group          struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	} `json:"group"`
}

// parseSup2API reads another sup2api's GET /key/prices. With apply, prices
// are multiplied by the upstream group's rate multiplier so they are what
// this instance pays upstream.
func parseSup2API(body []byte, apply bool) (*fetched, error) {
	var env struct {
		Data *KeyPrices `json:"data"`
	}
	if err := json.Unmarshal(body, &env); err != nil || env.Data == nil {
		if err == nil {
			err = errors.New("missing data")
		}
		return nil, fmt.Errorf("not a sup2api price list: %w", err)
	}
	kp := env.Data
	m := decimal.NewFromInt(1)
	if apply && kp.RateMultiplier.IsPositive() {
		m = kp.RateMultiplier
	}
	out := &fetched{prices: map[string]*syncPrice{}}
	for i := range kp.Prices {
		p := kp.Prices[i]
		// Visual prices are regenerated locally from their config.
		if p.Mode != expr.ModeExpression || expr.HasVisualConfig(p.Config) {
			p.Expression = ""
		}
		if !manifest.ValidModelID(p.Model) {
			out.skipped++
			continue
		}
		if !m.Equal(decimal.NewFromInt(1)) {
			if err := scalePrice(&p, m); err != nil {
				out.skipped++
				continue
			}
		}
		out.prices[p.Model] = &p
	}
	return out, nil
}

// scalePrice multiplies a price by m: visual configs are scaled in place,
// other expressions get a constant surcharge rule.
func scalePrice(p *syncPrice, m decimal.Decimal) error {
	scale := func(v any) any {
		switch x := v.(type) {
		case float64:
			return json.Number(decimal.NewFromFloat(x).Mul(m).String())
		case json.Number:
			d, err := decimal.NewFromString(string(x))
			if err != nil {
				return x
			}
			return json.Number(d.Mul(m).String())
		}
		return v
	}
	var cfg map[string]any
	dec := json.NewDecoder(strings.NewReader(string(p.Config)))
	dec.UseNumber()
	_ = dec.Decode(&cfg)
	switch p.Mode {
	case expr.ModePerRequest:
		cfg["price"] = scale(cfg["price"])
	case expr.ModePerToken:
		for _, k := range []string{"p", "c", "cr", "cc", "cc1h"} {
			if v, ok := cfg[k]; ok {
				cfg[k] = scale(v)
			}
		}
	default:
		if p.Expression == "" {
			src, err := expressionFor(p.Mode, p.Config, "")
			if err != nil {
				return err
			}
			p.Expression = src
		}
		p.Mode, p.Config = expr.ModeExpression, json.RawMessage("{}")
		p.Expression = strings.TrimSpace(p.Expression) + " " + expr.RuleSeparator + " true ? " + m.String() + " : 1"
		return nil
	}
	b, err := json.Marshal(cfg)
	if err != nil {
		return err
	}
	p.Config, p.Expression = b, ""
	return nil
}

// ---------------------------------------------------------------- preview and apply

// SyncCurrent is the local price compared in a preview.
type SyncCurrent struct {
	ID           int64           `json:"id"`
	Mode         string          `json:"mode"`
	Config       json.RawMessage `json:"config"`
	Expression   string          `json:"expression"`
	Source       string          `json:"source"`
	SyncSourceID *int64          `json:"sync_source_id"`
	Enabled      bool            `json:"enabled"`
	hash         string
}

// SyncItem is one model of a preview. Action: create (no local price),
// update (local synced price differs), manual (local manual price differs;
// replaced only when selected), unchanged.
type SyncItem struct {
	Model    string       `json:"model"`
	Action   string       `json:"action"`
	Incoming *syncPrice   `json:"incoming"`
	Current  *SyncCurrent `json:"current"`
}

// SyncPreview is the response of POST /price-sources/:id/preview.
type SyncPreview struct {
	SourceID  int64      `json:"source_id"`
	FetchedAt time.Time  `json:"fetched_at"`
	Total     int        `json:"total"`
	Skipped   int        `json:"skipped"`
	Items     []SyncItem `json:"items"`
}

func (s *Service) loadAndFetch(ctx context.Context, id int64) (*PriceSource, *fetched, error) {
	src, err := s.getSource(ctx, s.db.Pool, id)
	if err != nil {
		return nil, nil, err
	}
	f, err := s.fetchSource(ctx, src)
	if err != nil {
		msg := truncate(err.Error(), 500)
		_, _ = s.db.Pool.Exec(context.WithoutCancel(ctx), `UPDATE price_sync_sources SET last_error = $2 WHERE id = $1`, id, msg)
		return src, nil, core.ErrUnavailable.WithMessage("fetch price source: " + msg)
	}
	return src, f, nil
}

func (s *Service) currentPrices(ctx context.Context, q store.Querier) (map[string]*SyncCurrent, error) {
	rows, err := q.Query(ctx, `SELECT id, model, mode, config, expression, expr_hash, source, sync_source_id, enabled FROM model_prices`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]*SyncCurrent{}
	for rows.Next() {
		var c SyncCurrent
		var model string
		if err := rows.Scan(&c.ID, &model, &c.Mode, &c.Config, &c.Expression, &c.hash, &c.Source, &c.SyncSourceID, &c.Enabled); err != nil {
			return nil, err
		}
		out[model] = &c
	}
	return out, rows.Err()
}

func syncAction(in *syncPrice, cur *SyncCurrent) string {
	switch {
	case cur == nil:
		return "create"
	case cur.hash == in.hash && cur.Mode == in.Mode:
		return "unchanged"
	case cur.Source == SourceManual:
		return "manual"
	}
	return "update"
}

func (s *Service) previewSync(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	_, f, err := s.loadAndFetch(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	cur, err := s.currentPrices(ctx, s.db.Pool)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	out := &SyncPreview{SourceID: id, FetchedAt: time.Now().UTC(), Total: len(f.prices), Skipped: f.skipped, Items: []SyncItem{}}
	for model, p := range f.prices {
		out.Items = append(out.Items, SyncItem{Model: model, Action: syncAction(p, cur[model]), Incoming: p, Current: cur[model]})
	}
	sort.Slice(out.Items, func(i, j int) bool { return out.Items[i].Model < out.Items[j].Model })
	httpapi.OK(c, out)
}

// SyncSkip is a model apply did not import.
type SyncSkip struct {
	Model  string `json:"model"`
	Reason string `json:"reason"`
}

// SyncResult is the response of POST /price-sources/:id/apply.
type SyncResult struct {
	Created   int        `json:"created"`
	Updated   int        `json:"updated"`
	Unchanged int        `json:"unchanged"`
	Skipped   []SyncSkip `json:"skipped"`
}

// applySync imports the selected models ({models: []}) from a fresh fetch.
// Selected manual prices are replaced; imported rows become source=sync.
func (s *Service) applySync(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		Models []string `json:"models"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if len(in.Models) == 0 {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "models", Code: "required", Message: "select at least one model"}))
		return
	}
	_, f, err := s.loadAndFetch(ctx, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	uid, _ := core.UserID(ctx)
	res := &SyncResult{Skipped: []SyncSkip{}}
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		cur, err := s.currentPrices(ctx, tx)
		if err != nil {
			return err
		}
		seen := map[string]bool{}
		for _, model := range in.Models {
			if seen[model] {
				continue
			}
			seen[model] = true
			p := f.prices[model]
			if p == nil {
				res.Skipped = append(res.Skipped, SyncSkip{Model: model, Reason: "not_in_source"})
				continue
			}
			c := cur[model]
			if syncAction(p, c) == "unchanged" {
				res.Unchanged++
				continue
			}
			prog, err := expr.CompileCached(p.Expression)
			if err != nil {
				res.Skipped = append(res.Skipped, SyncSkip{Model: model, Reason: "invalid_expression"})
				continue
			}
			if err := recordHistory(ctx, tx, prog); err != nil {
				return err
			}
			if c == nil {
				_, err = tx.Exec(ctx, `
					INSERT INTO model_prices (model, mode, config, expression, expr_version, expr_hash,
						source, sync_source_id, synced_at, enabled, note, updated_by)
					VALUES ($1, $2, $3, $4, $5, $6, 'sync', $7, now(), true, '', $8)`,
					model, p.Mode, p.Config, p.Expression, p.version, p.hash, id, nullID(uid))
				res.Created++
			} else {
				_, err = tx.Exec(ctx, `
					UPDATE model_prices SET mode = $2, config = $3, expression = $4, expr_version = $5,
						expr_hash = $6, source = 'sync', sync_source_id = $7, synced_at = now(),
						updated_by = $8, updated_at = now()
					WHERE id = $1`,
					c.ID, p.Mode, p.Config, p.Expression, p.version, p.hash, id, nullID(uid))
				res.Updated++
			}
			if err != nil {
				return err
			}
		}
		if _, err := tx.Exec(ctx, `UPDATE price_sync_sources SET last_synced_at = now(), last_error = '' WHERE id = $1`, id); err != nil {
			return err
		}
		detail, _ := json.Marshal(map[string]any{"created": res.Created, "updated": res.Updated,
			"unchanged": res.Unchanged, "skipped": len(res.Skipped)})
		_, err = tx.Exec(ctx, `INSERT INTO audit_logs (user_id, action, target_type, target_id, detail)
			VALUES (NULLIF($1::bigint, 0), 'price.sync', 'price_source', $2, $3)`, uid, fmt.Sprint(id), detail)
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.changed(ctx, "prices")
	httpapi.OK(c, res)
}

// ---------------------------------------------------------------- GET /key/prices

// keyPrices lists the enabled prices for the holder of an API key (another
// sup2api syncing from this one): only models the key's group allows, plus
// the group's rate multiplier. The key goes in Authorization: Bearer or
// x-api-key.
func (s *Service) keyPrices(c *gin.Context) {
	ctx := c.Request.Context()
	if s.sync.Keys == nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("API key authentication unavailable"))
		return
	}
	raw := strings.TrimSpace(c.GetHeader("x-api-key"))
	if raw == "" {
		raw = strings.TrimSpace(strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer "))
	}
	if raw == "" {
		httpapi.Fail(c, core.ErrUnauthenticated.WithMessage("missing API key"))
		return
	}
	pr, err := s.sync.Keys.Authenticate(ctx, raw)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows, err := s.db.Pool.Query(ctx, `SELECT model, mode, config, expression FROM model_prices WHERE enabled ORDER BY model`)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	out := KeyPrices{Prices: []syncPrice{}, RateMultiplier: pr.Group.RateMultiplier}
	out.Group.ID, out.Group.Name = pr.Group.ID, pr.Group.Name
	for rows.Next() {
		var p syncPrice
		if err := rows.Scan(&p.Model, &p.Mode, &p.Config, &p.Expression); err != nil {
			httpapi.Fail(c, err)
			return
		}
		if allowed(pr.Group.ModelAllowlist, p.Model) {
			out.Prices = append(out.Prices, p)
		}
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

// allowed applies a group model allowlist (globs; empty allows all).
func allowed(list []string, model string) bool {
	if len(list) == 0 {
		return true
	}
	for _, p := range list {
		if globMatch(p, model) {
			return true
		}
	}
	return false
}

// globMatch matches '*' (any run) and '?' (one byte), as the gateway does
// for model allowlists.
func globMatch(pattern, s string) bool {
	p, i := 0, 0
	star, mark := -1, 0
	for i < len(s) {
		switch {
		case p < len(pattern) && (pattern[p] == '?' || pattern[p] == s[i]):
			p++
			i++
		case p < len(pattern) && pattern[p] == '*':
			star, mark = p, i
			p++
		case star >= 0:
			p = star + 1
			mark++
			i = mark
		default:
			return false
		}
	}
	for p < len(pattern) && pattern[p] == '*' {
		p++
	}
	return p == len(pattern)
}
