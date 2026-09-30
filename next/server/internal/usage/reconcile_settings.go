package usage

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// The "reconcile" row of the settings table (CONTRACTS §8): how long the core
// keeps asking about a pre-charged entry, and how fast.
//
// These are deliberately global rather than per plugin. How long an ANSWER
// exists upstream is a plugin fact and the plugin states it per entry
// (Reservation.deadline_sec); how long this deployment is willing to keep an
// unfinished charge open is an operator decision, and it is the one that wins.
const settingsKeyReconcile = "reconcile"

// ReconcileSettings is that row.
type ReconcileSettings struct {
	// MaxAgeSec caps Reservation.deadline_sec. Default 7 days.
	//
	// It was 24 hours until 2026-09-30, which would have quietly mis-billed
	// the first real user: an Ark video task is queryable for 7 days and the
	// plugin says so (deadline_sec = 7d), the cap clamped that to 24h, and
	// every task still running after a day was abandoned - "abandoned" being
	// the outcome that keeps the estimate as the charge. A default that turns
	// a reconcilable job into an estimated bill is a product decision hiding
	// in a constant; 7 days is what the first upstream needs, and the ceiling
	// (maxReconcileAge, 30 days) leaves room for the next one.
	MaxAgeSec int `json:"max_reconcile_age_sec"`
	// Backoff is the delay ladder between checks, comma separated Go
	// durations. The last entry repeats for every further attempt.
	Backoff string `json:"reconcile_backoff"`
	// MaxAttempts stops an entry whose plugin keeps saying "ask again soon"
	// long before its deadline. It is a safety net, not the primary bound:
	// the deadline is.
	MaxAttempts int `json:"max_reconcile_attempts"`
}

// DefaultReconcileAgeSec is the default of max_reconcile_age_sec: 7 days.
const DefaultReconcileAgeSec = 7 * 24 * 3600

// DefaultReconcileSettings are used when the row is absent.
func DefaultReconcileSettings() ReconcileSettings {
	return ReconcileSettings{MaxAgeSec: DefaultReconcileAgeSec, Backoff: "10s,30s,1m,5m,15m", MaxAttempts: 100}
}

// Bounds. minReconcileDelay keeps a plugin (or an administrator) from turning
// the loop into a busy wait on an upstream API; maxReconcileDelay keeps an
// entry from sleeping past a deadline it could still have been answered
// within.
const (
	minReconcileDelay = 5 * time.Second
	maxReconcileDelay = 6 * time.Hour
	minReconcileAge   = time.Minute
	maxReconcileAge   = 30 * 24 * time.Hour
	maxReconcileTries = 1000
)

// resolved is the usable form of the settings: parsed, clamped, defaulted.
type resolved struct {
	maxAge      time.Duration
	backoff     []time.Duration
	maxAttempts int
}

func (s ReconcileSettings) resolve() resolved {
	d := DefaultReconcileSettings()
	r := resolved{
		maxAge:      time.Duration(s.MaxAgeSec) * time.Second,
		maxAttempts: s.MaxAttempts,
	}
	if r.maxAge < minReconcileAge || r.maxAge > maxReconcileAge {
		r.maxAge = time.Duration(d.MaxAgeSec) * time.Second
	}
	if r.maxAttempts <= 0 || r.maxAttempts > maxReconcileTries {
		r.maxAttempts = d.MaxAttempts
	}
	r.backoff = parseBackoff(s.Backoff)
	if len(r.backoff) == 0 {
		r.backoff = parseBackoff(d.Backoff)
	}
	return r
}

// parseBackoff reads "10s,30s,1m" into a ladder. An unparsable or
// out-of-range entry is dropped rather than failing the whole setting: the
// ladder is advice about pacing, and half a ladder still paces.
func parseBackoff(spec string) []time.Duration {
	var out []time.Duration
	for _, part := range strings.Split(spec, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		d, err := time.ParseDuration(part)
		if err != nil || d < minReconcileDelay || d > maxReconcileDelay {
			continue
		}
		out = append(out, d)
	}
	return out
}

// clampDeadline turns the plugin's stated deadline into one this deployment
// accepts. The plugin states an upstream fact (this task is queryable for 7
// days); the operator states a policy (do not keep a charge open longer than
// this). The smaller wins, and 0 means "no opinion".
func (r resolved) clampDeadline(d time.Duration) time.Duration {
	if d <= 0 || d > r.maxAge {
		return r.maxAge
	}
	if d < minReconcileDelay {
		return minReconcileDelay
	}
	return d
}

// clampDelay is how long to wait before check number `attempts`+1. The
// plugin's own suggestion wins when it gives one - it is the only party that
// knows how long this upstream takes - and the ladder is the fallback.
func (r resolved) clampDelay(want time.Duration, attempts int) time.Duration {
	if want <= 0 {
		i := attempts
		if i >= len(r.backoff) {
			i = len(r.backoff) - 1
		}
		if i < 0 {
			return minReconcileDelay
		}
		want = r.backoff[i]
	}
	return min(max(want, minReconcileDelay), maxReconcileDelay)
}

// reconcileSettings reads the row with the same short-lived cache the rest of
// the module uses for settings; on a read error the defaults stand, which
// keeps the loop running rather than stalling every entry.
func (s *Service) reconcileSettings(ctx context.Context) resolved {
	s.mu.Lock()
	snap, at := s.reconcileCfg, s.reconcileCfgAt
	s.mu.Unlock()
	if snap != nil && time.Since(at) < reconcileSettingsTTL {
		return *snap
	}
	v, err := loadReconcileSettings(ctx, s.db.Pool)
	if err != nil {
		return DefaultReconcileSettings().resolve()
	}
	r := v.resolve()
	s.mu.Lock()
	s.reconcileCfg, s.reconcileCfgAt = &r, time.Now()
	s.mu.Unlock()
	return r
}

const reconcileSettingsTTL = 10 * time.Second

func loadReconcileSettings(ctx context.Context, q store.Querier) (ReconcileSettings, error) {
	v := DefaultReconcileSettings()
	var raw []byte
	err := q.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, settingsKeyReconcile).Scan(&raw)
	if store.IsNoRows(err) {
		return v, nil
	}
	if err != nil {
		return v, err
	}
	// Fields absent from the stored document keep their defaults.
	var partial struct {
		MaxAgeSec   *int    `json:"max_reconcile_age_sec"`
		Backoff     *string `json:"reconcile_backoff"`
		MaxAttempts *int    `json:"max_reconcile_attempts"`
	}
	if err := json.Unmarshal(raw, &partial); err != nil {
		return v, err
	}
	if partial.MaxAgeSec != nil {
		v.MaxAgeSec = *partial.MaxAgeSec
	}
	if partial.Backoff != nil {
		v.Backoff = *partial.Backoff
	}
	if partial.MaxAttempts != nil {
		v.MaxAttempts = *partial.MaxAttempts
	}
	return v, nil
}

func (s *Service) getReconcileSettings(c *gin.Context) {
	v, err := loadReconcileSettings(c.Request.Context(), s.db.Pool)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, v)
}

func (s *Service) putReconcileSettings(c *gin.Context) {
	ctx := c.Request.Context()
	cur, err := loadReconcileSettings(ctx, s.db.Pool)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	var in struct {
		MaxAgeSec   *int    `json:"max_reconcile_age_sec"`
		Backoff     *string `json:"reconcile_backoff"`
		MaxAttempts *int    `json:"max_reconcile_attempts"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	var fields []core.FieldError
	if in.MaxAgeSec != nil {
		d := time.Duration(*in.MaxAgeSec) * time.Second
		if d < minReconcileAge || d > maxReconcileAge {
			fields = append(fields, core.FieldError{Field: "max_reconcile_age_sec", Code: "out_of_range",
				Message: "must be between 60 and 2592000 seconds"})
		}
		cur.MaxAgeSec = *in.MaxAgeSec
	}
	if in.Backoff != nil {
		if len(parseBackoff(*in.Backoff)) == 0 {
			fields = append(fields, core.FieldError{Field: "reconcile_backoff", Code: "invalid",
				Message: "comma separated durations between 5s and 6h, e.g. 10s,30s,1m,5m,15m"})
		}
		cur.Backoff = *in.Backoff
	}
	if in.MaxAttempts != nil {
		if *in.MaxAttempts <= 0 || *in.MaxAttempts > maxReconcileTries {
			fields = append(fields, core.FieldError{Field: "max_reconcile_attempts", Code: "out_of_range",
				Message: "must be between 1 and 1000"})
		}
		cur.MaxAttempts = *in.MaxAttempts
	}
	if len(fields) > 0 {
		httpapi.Fail(c, core.InvalidFields(fields...))
		return
	}
	raw, _ := json.Marshal(cur)
	uid, _ := core.UserID(ctx)
	var updatedBy *int64
	if uid > 0 {
		updatedBy = &uid
	}
	_, err = s.db.Pool.Exec(ctx, `
		INSERT INTO settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
		settingsKeyReconcile, raw, updatedBy)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	s.mu.Lock()
	s.reconcileCfg = nil
	s.mu.Unlock()
	httpapi.OK(c, cur)
}
