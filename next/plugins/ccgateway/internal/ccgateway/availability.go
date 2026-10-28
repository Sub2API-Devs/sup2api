package ccgateway

import (
	"context"
	"slices"
	"strings"
	"unicode"
	"unicode/utf8"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

var _ pluginsdk.ModelAvailabilityChecker = (*Plugin)(nil)

func (p *Plugin) CheckModelAvailability(_ context.Context, in *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
	type identity struct {
		account int64
		model   string
	}
	counts := make(map[identity]int, len(in.GetCandidates()))
	for _, candidate := range in.GetCandidates() {
		counts[identity{candidate.GetAccountId(), candidate.GetModel()}]++
	}
	out := &pluginv1.CheckModelAvailabilityResponse{Results: make([]*pluginv1.ModelAvailability, 0, len(in.GetCandidates()))}
	for _, candidate := range in.GetCandidates() {
		result := &pluginv1.ModelAvailability{AccountId: candidate.GetAccountId(), Model: candidate.GetModel(), State: pluginv1.ModelAvailability_UNKNOWN}
		switch {
		case in.GetNowUnix() <= 0 || in.GetNowUnix() > 253402300799 || candidate.GetAccountId() <= 0 || !validAvailabilityModel(candidate.GetModel()):
			result.Reason = "invalid_candidate"
		case counts[identity{candidate.GetAccountId(), candidate.GetModel()}] != 1:
			result.Reason = "duplicate_candidate"
		case candidate.GetAccountType() == AccountTypeAPIKey:
			result.State, result.Reason = pluginv1.ModelAvailability_AVAILABLE, "subscription_not_required"
		case candidate.GetAccountType() != AccountTypeManaged:
			result.Reason = "unsupported_account_type"
		default:
			evaluateQuotaAvailability(candidate.GetQuota(), in.GetNowUnix(), result)
		}
		out.Results = append(out.Results, result)
	}
	return out, nil
}

func validAvailabilityModel(model string) bool {
	return model != "" && len(model) <= 256 && utf8.ValidString(model) && strings.IndexFunc(model, func(r rune) bool { return unicode.IsSpace(r) || unicode.IsControl(r) }) < 0
}

// tokenExpiredQuotaError starts the usage error of an expired access token
// that a stored refresh token renews (quota.go); the core keeps it after the
// error kind ("transient: token_expired: ...").
const tokenExpiredQuotaError = "token_expired"

func evaluateQuotaAvailability(snapshot *pluginv1.AccountQuotaSnapshot, now int64, out *pluginv1.ModelAvailability) {
	// The container's stored OAuth access token expired and a refresh token can
	// renew it. The container's Claude Code renews it only on a model request,
	// so holding requests back here would keep the account unusable for good:
	// let the request through. Signed out or refused authorizations
	// (auth_rejected) stay held back; a known exhausted window still blocks
	// (CONTRACTS §44.7).
	authRefused := strings.HasPrefix(snapshot.GetError(), "auth_rejected:")
	refreshOnRequest := strings.HasPrefix(snapshot.GetError(), "transient: "+tokenExpiredQuotaError+":")
	out.Reason = "quota_unobserved"
	if authRefused {
		out.Reason = "authorization_required"
	}
	if snapshot.GetUpdatedAtUnix() <= 0 && refreshOnRequest && len(snapshot.GetWindows()) == 0 {
		out.State, out.Reason = pluginv1.ModelAvailability_AVAILABLE, "quota_auth_refresh_on_request"
		return
	}
	if snapshot.GetUpdatedAtUnix() <= 0 || snapshot.GetUpdatedAtUnix() > now {
		return
	}
	// When the quota query is permanently refused (token revoked / not logged
	// in), the snapshot can never be refreshed after a window reset. Treat
	// expired rejected windows as cleared so the account is not blocked for
	// good by a stale "rejected" label from a previous 5-hour cycle.
	skipExpired := authRefused
	windows, invalid, shared, scoped := scanQuotaWindows(snapshot, out.Model, skipExpired, now)
	if blocked := blockedWindow(shared, scoped); blocked != nil {
		out.State, out.Reason = pluginv1.ModelAvailability_UNAVAILABLE, "quota_rejected:"+blocked.GetKey()
		if blocked.GetResetsAtUnix() > now {
			out.RetryAtUnix = blocked.GetResetsAtUnix()
		}
		return
	}
	if invalid {
		out.Reason = "invalid_quota_snapshot"
		return
	}
	if refreshOnRequest {
		out.State, out.Reason = pluginv1.ModelAvailability_AVAILABLE, "quota_auth_refresh_on_request"
		return
	}
	if authRefused {
		return // Reason already says authorization_required
	}
	finalQuotaState(snapshot, now, windows, out)
}

// scanQuotaWindows indexes the cached windows and picks the blocking ones: the
// shared window with the latest reset, and the scoped window for this model.
// When skipExpired is set, rejected windows whose reset time has already passed
// are treated as cleared (used when the quota query is known-rejected and can
// never confirm the reset, so the stale label must not permanently block).
func scanQuotaWindows(snapshot *pluginv1.AccountQuotaSnapshot, model string, skipExpired bool, now int64) (windows map[string]*pluginv1.QuotaWindow, invalid bool, shared, scoped *pluginv1.QuotaWindow) {
	windows = map[string]*pluginv1.QuotaWindow{}
	invalid = len(snapshot.GetWindows()) > 64 || snapshot.GetRevision() < 0
	for _, window := range snapshot.GetWindows() {
		if !validCachedQuotaWindow(window) {
			invalid = true
			continue
		}
		key := window.GetKey()
		if windows[key] != nil {
			invalid = true
		}
		windows[key] = window
		if window.GetStatus() != "rejected" {
			continue
		}
		// A window whose reset time has already passed is treated as cleared:
		// the quota refilled at that moment and the stale "rejected" label no
		// longer blocks requests while the next active query is pending.
		if skipExpired {
			if r := window.GetResetsAtUnix(); r > 0 && r <= now {
				continue
			}
		}
		switch {
		case !scopedQuota(key):
			if shared == nil || window.GetResetsAtUnix() > shared.GetResetsAtUnix() {
				shared = window
			}
		case quotaApplies(key, model):
			scoped = window
		}
	}
	return windows, invalid, shared, scoped
}

// blockedWindow prefers the shared exhausted window over the scoped one.
func blockedWindow(shared, scoped *pluginv1.QuotaWindow) *pluginv1.QuotaWindow {
	if shared != nil {
		return shared
	}
	return scoped
}

// finalQuotaState decides from a fresh, unblocked snapshot. A failed query
// keeps the windows of the last successful one; they decide until too old.
func finalQuotaState(snapshot *pluginv1.AccountQuotaSnapshot, now int64, windows map[string]*pluginv1.QuotaWindow, out *pluginv1.ModelAvailability) {
	if now-snapshot.GetUpdatedAtUnix() >= int64(quotaValid.Seconds()) {
		out.Reason = "quota_stale"
		if snapshot.GetError() != "" {
			out.Reason = "quota_refresh_failed"
		}
		return
	}
	if windows[quota5h] == nil {
		return
	}
	for _, key := range quotaKeys {
		window := windows[key]
		if window == nil || !quotaApplies(key, out.Model) {
			continue
		}
		// An allowed window whose reset passed only got more room. A known
		// exhaustion (above) still waits for a query after its reset.
		if window.GetUtilizationUnknown() || (window.GetStatus() != "allowed" && window.GetStatus() != "allowed_warning") {
			out.Reason = "quota_unknown:" + key
			return
		}
	}
	out.State, out.Reason = pluginv1.ModelAvailability_AVAILABLE, "quota_available"
}

func validCachedQuotaWindow(window *pluginv1.QuotaWindow) bool {
	if window == nil || !validUsage(window.GetUtilization()) || window.GetResetsAtUnix() < 0 || window.GetResetsAtUnix() > 253402300799 || window.GetUsed() < 0 || window.GetLimit() < 0 {
		return false
	}
	if window.GetUtilizationUnknown() && (window.GetUtilization() != 0 || window.GetUsed() != 0 || window.GetLimit() != 0) {
		return false
	}
	if !slices.Contains(quotaKeys, window.GetKey()) {
		return false
	}
	switch window.GetStatus() {
	case "", "allowed", "allowed_warning", "rejected":
		return true
	default:
		return false
	}
}
