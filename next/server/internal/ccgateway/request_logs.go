package ccgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// Request log levels (REQUEST-LOG-LEVELS-DESIGN §2/§4,
// REQUEST-LOG-POLICY-DESIGN.md, CONTRACTS §65). The core decides each
// request's level (an account's own setting, else the configuration's default
// rule) and sends it with the request; it records no log itself. The Worker's
// state (limits, usage) is passed through; the logs themselves are read
// through request_log_viewer.go.
const (
	requestLogOff     = "off"
	requestLogSummary = "summary"
	requestLogFull    = "full"
)

var requestLogLevels = map[string]bool{requestLogOff: true, requestLogSummary: true, requestLogFull: true}

// requestLogFullHours are the only durations the full level may be enabled for.
var requestLogFullHours = map[int]bool{1: true, 4: true, 24: true}

const maxSafeInteger = 1<<53 - 1

// requestLogFollow is an account without its own level: it follows the
// default rule of the CCGateway configuration.
const requestLogFollow = "follow"

// RequestLogDefault is the default request log rule of the CCGateway
// configuration (CONTRACTS §65): off or summary. Full is only ever enabled
// for one account at a time, temporarily.
type RequestLogDefault struct {
	Level string `json:"level"`
}

// UnmarshalJSON is strict: an unknown key is a mistake, not a later field.
func (r *RequestLogDefault) UnmarshalJSON(raw []byte) error {
	type plain RequestLogDefault
	var out plain
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(&out); err != nil {
		return err
	}
	*r = RequestLogDefault(out)
	return nil
}

// DefaultRequestLog is the level of an account without its own setting:
// summary unless the configuration says off.
func (c Config) DefaultRequestLog() string {
	if c.RequestLogs != nil && c.RequestLogs.Level == requestLogOff {
		return requestLogOff
	}
	return requestLogSummary
}

// mergeRequestLogs: omitted keeps the stored rule; a named one must be off or
// summary (full is refused: it is per account and temporary).
func mergeRequestLogs(c *Config, old Config) error {
	if c.RequestLogs == nil {
		c.RequestLogs = old.RequestLogs
		return nil
	}
	if l := c.RequestLogs.Level; l != requestLogOff && l != requestLogSummary {
		return errors.New(`invalid request_logs.level: must be "off" or "summary"`)
	}
	return nil
}

// AccountRequestLog is an account's own request log level
// (ccgateway_account_request_logs). Level "" follows the default rule.
type AccountRequestLog struct {
	Level     string
	FullUntil *time.Time
}

// set reports whether the setting applies at now: a full level past its
// full_until counts as no setting.
func (a AccountRequestLog) set(now time.Time) bool {
	switch a.Level {
	case requestLogOff, requestLogSummary:
		return true
	case requestLogFull:
		return a.FullUntil != nil && now.Before(*a.FullUntil)
	}
	return false
}

// effectiveRequestLog is the level a request of the account is logged at
// (REQUEST-LOG-POLICY-DESIGN.md §1).
func effectiveRequestLog(c Config, a AccountRequestLog, now time.Time) string {
	if a.set(now) {
		return a.Level
	}
	return c.DefaultRequestLog()
}

// LoadAccountRequestLog reads account id's own level; no row follows.
func LoadAccountRequestLog(ctx context.Context, q store.Querier, id int64) (AccountRequestLog, error) {
	var a AccountRequestLog
	err := q.QueryRow(ctx, `SELECT level, full_until FROM ccgateway_account_request_logs WHERE account_id=$1`, id).Scan(&a.Level, &a.FullUntil)
	if store.IsNoRows(err) {
		return AccountRequestLog{}, nil
	}
	return a, err
}

// requestLogLevel is the request_log a request of account id carries: read
// through the request cache, the expiry of full checked now (not when the
// setting was cached). An account-less request follows the default.
func (s *Service) requestLogLevel(ctx context.Context, c Config, id int64) (string, error) {
	if id <= 0 {
		return c.DefaultRequestLog(), nil
	}
	a, _, err := readThrough(&s.cache, &s.cache.requestLogs, id, func() (AccountRequestLog, error) { return LoadAccountRequestLog(ctx, s.DB.Pool, id) })
	if err != nil {
		return "", err
	}
	return effectiveRequestLog(c, a, time.Now()), nil
}

// requestLogView is the answer of GET and PUT .../request-logs: the
// account's setting, the default rule, what applies now, and the Worker's
// own state (limits, usage, viewer) as it reported it; worker is null when
// the Worker could not be asked. The level is decided here and sent with
// every request (X-CCGateway-Request-Policy request_log); the Worker's local
// level in its state is only what it falls back to without one.
type requestLogView struct {
	Setting   requestLogSetting `json:"setting"`
	Default   string            `json:"default"`
	Effective string            `json:"effective"`
	Worker    any               `json:"worker"`
}

type requestLogSetting struct {
	Level     string  `json:"level"`
	FullUntil *string `json:"full_until"`
}

func viewSetting(a AccountRequestLog, now time.Time) requestLogSetting {
	if !a.set(now) {
		return requestLogSetting{Level: requestLogFollow}
	}
	out := requestLogSetting{Level: a.Level}
	if a.FullUntil != nil {
		v := a.FullUntil.UTC().Format(time.RFC3339)
		out.FullUntil = &v
	}
	return out
}

// workerRequestLogTimeout bounds asking the Worker for its state: the core's
// own part of the answer does not wait on an unreachable runtime.
var workerRequestLogTimeout = 10 * time.Second

func (s *Service) serveRequestLogs(c *gin.Context, ctx context.Context, d accountDesired) {
	method := c.Request.Method
	if method != http.MethodGet && method != http.MethodPut {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	var change requestLogChange
	if method == http.MethodPut {
		var in map[string]json.RawMessage
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1024)
		if !httpapi.BindJSON(c, &in) {
			return
		}
		var e *core.Error
		if change, e = parseRequestLogChange(in); e != nil {
			httpapi.Fail(c, e)
			return
		}
		if d.Deleted {
			httpapi.Fail(c, reasonError(core.ErrInvalidArgument, reasonAccountDeleted))
			return
		}
	}
	cfg, err := s.Load(ctx)
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	var worker any
	switch {
	case change.Clear != "":
		// Deleting logs is the Worker's: forwarded in canonical form.
		if reason := d.unavailable(); reason != "" {
			httpapi.Fail(c, reasonError(core.ErrInvalidArgument, reason))
			return
		}
		out, e := s.workerRequestLogs(ctx, d, http.MethodPut, change.body())
		if e != nil {
			httpapi.Fail(c, e)
			return
		}
		worker = out
		s.recordDetail(c, "account."+strconv.FormatInt(d.AccountID, 10)+".request-logs", map[string]any{"change": change.Clear})
	case method == http.MethodPut:
		if e := s.saveAccountRequestLog(c, ctx, d.AccountID, change); e != nil {
			httpapi.Fail(c, e)
			return
		}
	}
	a, err := LoadAccountRequestLog(ctx, s.DB.Pool, d.AccountID)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if worker == nil && d.unavailable() == "" {
		// Best effort: the core's part is answered without it.
		wctx, cancel := context.WithTimeout(ctx, workerRequestLogTimeout)
		if out, e := s.workerRequestLogs(wctx, d, http.MethodGet, nil); e == nil {
			worker = out
		}
		cancel()
	}
	now := time.Now()
	httpapi.OK(c, requestLogView{Setting: viewSetting(a, now), Default: cfg.DefaultRequestLog(), Effective: effectiveRequestLog(cfg, a, now), Worker: worker})
}

// workerRequestLogs asks the account's Worker for its request log state
// (GET) or to delete logs (PUT clear_full / clear_all) and decodes the answer.
func (s *Service) workerRequestLogs(ctx context.Context, d accountDesired, method string, body []byte) (any, *core.Error) {
	res, closeConn, e := s.runtimeRequest(ctx, d.Key, method, "admin/request-logs", body, d.Revision)
	if e != nil {
		return nil, transportError(e)
	}
	defer closeConn()
	defer res.Body.Close()
	raw, e := readBounded(res.Body, 4096)
	if e != nil {
		return nil, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	if res.StatusCode != http.StatusOK {
		return nil, runtimeError(res.StatusCode, raw)
	}
	out, err := decodeRequestLogState(raw)
	if err != nil {
		return nil, reasonError(core.ErrUnavailable, "runtime_unavailable")
	}
	return out, nil
}

// saveAccountRequestLog writes the account's level (follow deletes the row)
// and its audit row in one transaction, then drops the cached setting here
// and, through the bus, on the other nodes.
func (s *Service) saveAccountRequestLog(c *gin.Context, ctx context.Context, id int64, change requestLogChange) error {
	ctx = audit.WithClientIP(ctx, c.ClientIP())
	uid, _ := core.UserID(ctx)
	var updatedBy *int64
	if uid > 0 {
		updatedBy = &uid
	}
	detail := map[string]any{"change": "level", "level": change.Level}
	var fullUntil *time.Time
	if change.Level == requestLogFull {
		t := time.Now().UTC().Truncate(time.Second).Add(time.Duration(change.FullForHours) * time.Hour)
		fullUntil = &t
		detail["full_for_hours"] = change.FullForHours
		detail["full_until"] = t.Format(time.RFC3339)
	}
	err := s.DB.Tx(ctx, func(tx pgx.Tx) error {
		old, err := LoadAccountRequestLog(ctx, tx, id)
		if err != nil {
			return err
		}
		detail["previous"] = viewSetting(old, time.Now()).Level
		if change.Level == requestLogFollow {
			_, err = tx.Exec(ctx, `DELETE FROM ccgateway_account_request_logs WHERE account_id=$1`, id)
		} else {
			_, err = tx.Exec(ctx, `INSERT INTO ccgateway_account_request_logs(account_id,level,full_until,updated_by)
				VALUES($1,$2,$3,$4) ON CONFLICT(account_id) DO UPDATE SET level=EXCLUDED.level,full_until=EXCLUDED.full_until,
				updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp()`, id, change.Level, fullUntil, updatedBy)
		}
		if err != nil {
			return err
		}
		return audit.Audit(ctx, tx, uid, "ccgateway.account."+strconv.FormatInt(id, 10)+".request-logs", "system", "ccgateway", detail)
	})
	if err != nil {
		return err
	}
	s.requestLogChanged(ctx, id)
	return nil
}

// requestLogChange is one validated PUT form: Level (+FullForHours for
// full) or Clear (clear_full / clear_all).
type requestLogChange struct {
	Level        string
	FullForHours int
	Clear        string
}

// parseRequestLogChange accepts exactly one of {"level":"follow"},
// {"level":"off"}, {"level":"summary"},
// {"level":"full","full_for_hours":1|4|24}, {"clear_full":true} or
// {"clear_all":true}. Unknown and mixed keys are rejected, the old switch
// {"enabled":bool} included: the level is the core's now.
func parseRequestLogChange(in map[string]json.RawMessage) (requestLogChange, *core.Error) {
	var out requestLogChange
	invalid := core.ErrInvalidArgument.WithMessage(`Send exactly one of {"level":"follow"}, {"level":"off"}, {"level":"summary"}, {"level":"full","full_for_hours":1|4|24}, {"clear_full":true} or {"clear_all":true}.`)
	has := func(keys ...string) bool {
		if len(in) != len(keys) {
			return false
		}
		for _, k := range keys {
			if _, ok := in[k]; !ok {
				return false
			}
		}
		return true
	}
	switch {
	case has("clear_full"), has("clear_all"):
		key := "clear_full"
		if has("clear_all") {
			key = "clear_all"
		}
		var v bool
		if json.Unmarshal(in[key], &v) != nil || !v {
			return out, core.ErrInvalidArgument.WithMessage(key + " must be true.")
		}
		out.Clear = key
	case has("level"):
		var v string
		if json.Unmarshal(in["level"], &v) != nil || (v != requestLogFollow && !requestLogLevels[v]) {
			return out, core.ErrInvalidArgument.WithMessage(`level must be "follow", "off", "summary" or "full".`)
		}
		if v == requestLogFull {
			return out, core.ErrInvalidArgument.WithMessage("The full level needs full_for_hours (1, 4 or 24).")
		}
		out.Level = v
	case has("level", "full_for_hours"):
		var v string
		if json.Unmarshal(in["level"], &v) != nil || v != requestLogFull {
			return out, core.ErrInvalidArgument.WithMessage(`full_for_hours is only valid with level "full".`)
		}
		var h int
		if json.Unmarshal(in["full_for_hours"], &h) != nil || !requestLogFullHours[h] {
			return out, core.ErrInvalidArgument.WithMessage("full_for_hours must be 1, 4 or 24.")
		}
		out.Level, out.FullForHours = v, h
	default:
		return out, invalid
	}
	return out, nil
}

// body is the canonical form of a clear forwarded to the Worker; nothing
// from the client body is copied verbatim.
func (r requestLogChange) body() []byte {
	b, _ := json.Marshal(map[string]bool{r.Clear: true})
	return b
}

// requestLogState is the legacy shape: an old Worker without levels. The UI
// shows the old switch for it.
type requestLogState struct {
	Enabled              *bool  `json:"enabled"`
	PerRequestLimitBytes *int64 `json:"per_request_limit_bytes,omitempty"`
	RetentionHours       *int64 `json:"retention_hours,omitempty"`
	StorageBudgetBytes   *int64 `json:"storage_budget_bytes,omitempty"`
	OverflowBehavior     string `json:"overflow_behavior,omitempty"`
}

type requestLogTier struct {
	RetentionHours       *int64 `json:"retention_hours,omitempty"`
	StorageBudgetBytes   *int64 `json:"storage_budget_bytes,omitempty"`
	PerRequestLimitBytes *int64 `json:"per_request_limit_bytes,omitempty"`
}

type requestLogUsage struct {
	SummaryBytes *int64 `json:"summary_bytes,omitempty"`
	FullBytes    *int64 `json:"full_bytes,omitempty"`
	Requests     *int64 `json:"requests,omitempty"`
}

// requestLogLimits is the per-tier limit block a Worker reports.
type requestLogLimits struct {
	Summary *requestLogTier `json:"summary,omitempty"`
	Full    *requestLogTier `json:"full,omitempty"`
}

// requestLogLevelState is the shape of a Worker that reports levels. The
// legacy top-level fields (full tier values) are kept for old consumers.
type requestLogLevelState struct {
	requestLogState
	Level     string           `json:"level"`
	FullUntil *string          `json:"full_until"`
	Levels    []string         `json:"levels"`
	Limits    requestLogLimits `json:"limits"`
	Usage     *requestLogUsage `json:"usage,omitempty"`
	// Viewer: the Worker serves the log reads (REQUEST-LOG-VIEWER-DESIGN.md).
	Viewer bool `json:"viewer"`
	// ViewerSearch: the Worker's query takes mode/session_id/sha256/changed
	// (REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md §3).
	ViewerSearch bool `json:"viewer_search"`
	// ClearAll: the Worker deletes all of an account's logs on
	// {"clear_all":true} (REQUEST-LOG-POLICY-DESIGN.md §3).
	ClearAll bool `json:"clear_all"`
}

func validLimit(limit *int64) bool {
	return limit == nil || (*limit > 0 && *limit <= maxSafeInteger)
}

func validUsage(n *int64) bool {
	return n == nil || (*n >= 0 && *n <= maxSafeInteger)
}

// decodeRequestLogState returns requestLogState for an old Worker (no
// "levels") and requestLogLevelState otherwise. Unknown fields are dropped.
// A failure returns no value: callers answer 503 without looking at the
// shape.
func decodeRequestLogState(raw []byte) (any, error) {
	legacy, err := decodeLegacyState(raw)
	if err != nil {
		return nil, err
	}
	out, hasLevels, err := decodeLevelState(raw, legacy)
	if err != nil {
		return nil, err
	}
	if !hasLevels {
		return legacy, nil
	}
	return out, nil
}

// decodeLegacyState reads and validates the fields every Worker reports.
func decodeLegacyState(raw []byte) (requestLogState, error) {
	var legacy requestLogState
	if err := json.Unmarshal(raw, &legacy); err != nil {
		return legacy, err
	}
	if legacy.Enabled == nil {
		return legacy, errors.New("request log state has no enabled value")
	}
	if err := validateLogLimits(legacy.PerRequestLimitBytes, legacy.RetentionHours, legacy.StorageBudgetBytes); err != nil {
		return legacy, err
	}
	// Unknown future behavior is not an assurance that partial logs survive.
	if legacy.OverflowBehavior != "retain_partial_with_metadata" {
		legacy.OverflowBehavior = ""
	}
	return legacy, nil
}

// decodeLevelState reads the level model when the Worker reports one.
// hasLevels=false means an old Worker without the extension.
func decodeLevelState(raw []byte, legacy requestLogState) (requestLogLevelState, bool, error) {
	var probe struct {
		Levels json.RawMessage `json:"levels"`
	}
	_ = json.Unmarshal(raw, &probe)
	if len(probe.Levels) == 0 || bytes.Equal(bytes.TrimSpace(probe.Levels), []byte("null")) {
		return requestLogLevelState{}, false, nil
	}
	var in struct {
		Level        *string           `json:"level"`
		FullUntil    *string           `json:"full_until"`
		Levels       []string          `json:"levels"`
		Limits       *requestLogLimits `json:"limits"`
		Usage        *requestLogUsage  `json:"usage"`
		Viewer       bool              `json:"viewer"`
		ViewerSearch bool              `json:"viewer_search"`
		ClearAll     bool              `json:"clear_all"`
	}
	if err := json.Unmarshal(raw, &in); err != nil {
		return requestLogLevelState{}, false, err
	}
	out := requestLogLevelState{requestLogState: legacy, Viewer: in.Viewer, ViewerSearch: in.ViewerSearch, ClearAll: in.ClearAll}
	if len(in.Levels) == 0 || len(in.Levels) > len(requestLogLevels) {
		return requestLogLevelState{}, false, errors.New("invalid request log levels")
	}
	seen := map[string]bool{}
	for _, l := range in.Levels {
		if !requestLogLevels[l] || seen[l] {
			return requestLogLevelState{}, false, errors.New("invalid request log levels")
		}
		seen[l] = true
	}
	out.Levels = in.Levels
	if in.Level == nil || !seen[*in.Level] {
		return requestLogLevelState{}, false, errors.New("invalid request log level")
	}
	out.Level = *in.Level
	if *legacy.Enabled != (out.Level != requestLogOff) {
		return requestLogLevelState{}, false, errors.New("request log enabled and level disagree")
	}
	if in.FullUntil != nil {
		t, err := time.Parse(time.RFC3339, *in.FullUntil)
		if err != nil {
			return requestLogLevelState{}, false, errors.New("invalid request log full_until")
		}
		// Only the full level has an expiry.
		if out.Level == requestLogFull {
			v := t.UTC().Format(time.RFC3339)
			out.FullUntil = &v
		}
	}
	if out.Level == requestLogFull && out.FullUntil == nil {
		return requestLogLevelState{}, false, errors.New("the full request log level has no expiry")
	}
	if err := validateLogTierLimits(in.Limits); err != nil {
		return requestLogLevelState{}, false, err
	}
	if in.Limits != nil {
		out.Limits.Summary, out.Limits.Full = in.Limits.Summary, in.Limits.Full
	}
	if err := validateLogUsage(in.Usage); err != nil {
		return requestLogLevelState{}, false, err
	}
	out.Usage = in.Usage
	return out, true, nil
}

// validateLogLimits checks one set of request-log size/time limits.
func validateLogLimits(limits ...*int64) error {
	for _, limit := range limits {
		if !validLimit(limit) {
			return errors.New("invalid request log limit")
		}
	}
	return nil
}

// validateLogTierLimits checks the per-tier limits when the Worker reports
// them.
func validateLogTierLimits(limits *requestLogLimits) error {
	if limits == nil {
		return nil
	}
	for _, tier := range []*requestLogTier{limits.Summary, limits.Full} {
		if tier == nil {
			continue
		}
		if err := validateLogLimits(tier.RetentionHours, tier.StorageBudgetBytes, tier.PerRequestLimitBytes); err != nil {
			return err
		}
	}
	return nil
}

// validateLogUsage checks the reported storage usage.
func validateLogUsage(usage *requestLogUsage) error {
	if usage == nil {
		return nil
	}
	for _, n := range []*int64{usage.SummaryBytes, usage.FullBytes, usage.Requests} {
		if !validUsage(n) {
			return errors.New("invalid request log usage")
		}
	}
	return nil
}
