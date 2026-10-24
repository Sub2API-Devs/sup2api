package ccgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Request log levels (REQUEST-LOG-LEVELS-DESIGN §2/§4). Only the level,
// expiry, validated limits and usage are exposed here; the logs themselves are
// read through request_log_viewer.go.
const (
	requestLogOff     = "off"
	requestLogSummary = "summary"
	requestLogFull    = "full"
)

var requestLogLevels = map[string]bool{requestLogOff: true, requestLogSummary: true, requestLogFull: true}

// requestLogFullHours are the only durations the full level may be enabled for.
var requestLogFullHours = map[int]bool{1: true, 4: true, 24: true}

const maxSafeInteger = 1<<53 - 1

func (s *Service) serveRequestLogs(c *gin.Context, ctx context.Context, d accountDesired) {
	method := c.Request.Method
	if method != http.MethodGet && method != http.MethodPut {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if reason := d.unavailable(); reason != "" {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, reason))
		return
	}
	var body []byte
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
		body = change.body()
	}
	res, closeConn, e := s.runtimeRequest(ctx, d.Key, method, "admin/request-logs", body, d.Revision)
	if e != nil {
		httpapi.Fail(c, transportError(e))
		return
	}
	defer closeConn()
	defer res.Body.Close()
	raw, e := readBounded(res.Body, 4096)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if res.StatusCode != http.StatusOK {
		httpapi.Fail(c, runtimeError(res.StatusCode, raw))
		return
	}
	out, err := decodeRequestLogState(raw)
	if err != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if method == http.MethodPut {
		s.recordDetail(c, "account."+strconv.FormatInt(d.AccountID, 10)+".request-logs", change.audit(out))
	}
	httpapi.OK(c, out)
}

// requestLogChange is one validated PUT form. Exactly one of the fields is
// meaningful: Enabled (legacy switch), Level (+FullForHours for full) or
// ClearFull.
type requestLogChange struct {
	Enabled      *bool
	Level        string
	FullForHours int
	ClearFull    bool
}

// parseRequestLogChange accepts exactly one of {"level":"off"},
// {"level":"summary"}, {"level":"full","full_for_hours":1|4|24},
// {"clear_full":true} or the legacy {"enabled":bool}. Unknown and mixed keys
// are rejected.
func parseRequestLogChange(in map[string]json.RawMessage) (requestLogChange, *core.Error) {
	var out requestLogChange
	invalid := core.ErrInvalidArgument.WithMessage(`Send exactly one of {"level":"off"}, {"level":"summary"}, {"level":"full","full_for_hours":1|4|24}, {"clear_full":true} or {"enabled":true|false}.`)
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
	case has("enabled"):
		var v *bool
		if json.Unmarshal(in["enabled"], &v) != nil || v == nil {
			return out, core.ErrInvalidArgument.WithMessage("enabled must be a boolean.")
		}
		out.Enabled = v
	case has("clear_full"):
		var v bool
		if json.Unmarshal(in["clear_full"], &v) != nil || !v {
			return out, core.ErrInvalidArgument.WithMessage("clear_full must be true.")
		}
		out.ClearFull = true
	case has("level"):
		var v string
		if json.Unmarshal(in["level"], &v) != nil || !requestLogLevels[v] {
			return out, core.ErrInvalidArgument.WithMessage(`level must be "off", "summary" or "full".`)
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

// body is the canonical form forwarded to the Worker; nothing from the client
// body is copied verbatim.
func (r requestLogChange) body() []byte {
	var v any
	switch {
	case r.Enabled != nil:
		v = map[string]bool{"enabled": *r.Enabled}
	case r.ClearFull:
		v = map[string]bool{"clear_full": true}
	case r.Level == requestLogFull:
		v = map[string]any{"level": r.Level, "full_for_hours": r.FullForHours}
	default:
		v = map[string]string{"level": r.Level}
	}
	b, _ := json.Marshal(v)
	return b
}

// audit is the audit detail: the requested change and the resulting state.
// Only enum values, hours and a timestamp; never log contents.
func (r requestLogChange) audit(out any) map[string]any {
	detail := map[string]any{}
	switch {
	case r.Enabled != nil:
		detail["change"], detail["enabled"] = "enabled", *r.Enabled
	case r.ClearFull:
		detail["change"] = "clear_full"
	default:
		detail["change"] = "level"
		if r.FullForHours > 0 {
			detail["full_for_hours"] = r.FullForHours
		}
	}
	if st, ok := out.(requestLogLevelState); ok {
		detail["level"] = st.Level
		detail["full_until"] = st.FullUntil
	} else if st, ok := out.(requestLogState); ok && st.Enabled != nil {
		detail["result_enabled"] = *st.Enabled
	}
	return detail
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

// requestLogLevelState is the shape of a Worker that reports levels. The
// legacy top-level fields (full tier values) are kept for old consumers.
type requestLogLevelState struct {
	requestLogState
	Level     string   `json:"level"`
	FullUntil *string  `json:"full_until"`
	Levels    []string `json:"levels"`
	Limits    struct {
		Summary *requestLogTier `json:"summary,omitempty"`
		Full    *requestLogTier `json:"full,omitempty"`
	} `json:"limits"`
	Usage *requestLogUsage `json:"usage,omitempty"`
	// Viewer: the Worker serves the log reads (REQUEST-LOG-VIEWER-DESIGN.md).
	Viewer bool `json:"viewer"`
}

func validLimit(limit *int64) bool {
	return limit == nil || (*limit > 0 && *limit <= maxSafeInteger)
}

func validUsage(n *int64) bool {
	return n == nil || (*n >= 0 && *n <= maxSafeInteger)
}

// decodeRequestLogState returns requestLogState for an old Worker (no
// "levels") and requestLogLevelState otherwise. Unknown fields are dropped.
func decodeRequestLogState(raw []byte) (any, error) {
	legacy, err := decodeLegacyState(raw)
	if err != nil {
		return nil, err
	}
	out, hasLevels, err := decodeLevelState(raw, legacy)
	if err != nil || !hasLevels {
		return legacy, err
	}
	return *out, nil
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
func decodeLevelState(raw []byte, legacy requestLogState) (*requestLogLevelState, bool, error) {
	var probe struct {
		Levels json.RawMessage `json:"levels"`
	}
	_ = json.Unmarshal(raw, &probe)
	if len(probe.Levels) == 0 || bytes.Equal(bytes.TrimSpace(probe.Levels), []byte("null")) {
		return nil, false, nil
	}
	var in struct {
		Level     *string  `json:"level"`
		FullUntil *string  `json:"full_until"`
		Levels    []string `json:"levels"`
		Limits    *struct {
			Summary *requestLogTier `json:"summary"`
			Full    *requestLogTier `json:"full"`
		} `json:"limits"`
		Usage  *requestLogUsage `json:"usage"`
		Viewer bool             `json:"viewer"`
	}
	if err := json.Unmarshal(raw, &in); err != nil {
		return nil, false, err
	}
	out := &requestLogLevelState{requestLogState: legacy, Viewer: in.Viewer}
	if len(in.Levels) == 0 || len(in.Levels) > len(requestLogLevels) {
		return nil, false, errors.New("invalid request log levels")
	}
	seen := map[string]bool{}
	for _, l := range in.Levels {
		if !requestLogLevels[l] || seen[l] {
			return nil, false, errors.New("invalid request log levels")
		}
		seen[l] = true
	}
	out.Levels = in.Levels
	if in.Level == nil || !seen[*in.Level] {
		return nil, false, errors.New("invalid request log level")
	}
	out.Level = *in.Level
	if *legacy.Enabled != (out.Level != requestLogOff) {
		return nil, false, errors.New("request log enabled and level disagree")
	}
	if in.FullUntil != nil {
		t, err := time.Parse(time.RFC3339, *in.FullUntil)
		if err != nil {
			return nil, false, errors.New("invalid request log full_until")
		}
		// Only the full level has an expiry.
		if out.Level == requestLogFull {
			v := t.UTC().Format(time.RFC3339)
			out.FullUntil = &v
		}
	}
	if out.Level == requestLogFull && out.FullUntil == nil {
		return nil, false, errors.New("the full request log level has no expiry")
	}
	if err := validateLogTierLimits(in.Limits); err != nil {
		return nil, false, err
	}
	if in.Limits != nil {
		out.Limits.Summary, out.Limits.Full = in.Limits.Summary, in.Limits.Full
	}
	if err := validateLogUsage(in.Usage); err != nil {
		return nil, false, err
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
func validateLogTierLimits(limits *struct {
	Summary *requestLogTier `json:"summary"`
	Full    *requestLogTier `json:"full"`
}) error {
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
