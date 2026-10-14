package ccgateway

import (
	"context"
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
	windows := map[string]*pluginv1.QuotaWindow{}
	invalid := len(snapshot.GetWindows()) > 64 || snapshot.GetRevision() < 0
	var shared, scoped *pluginv1.QuotaWindow
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
		switch key {
		case "5h", "7d":
			if shared == nil || window.GetResetsAtUnix() > shared.GetResetsAtUnix() {
				shared = window
			}
		case "7d_fable", "7d_sonnet":
			if quotaApplies(key, out.Model) {
				scoped = window
			}
		}
	}
	blocked := shared
	if blocked == nil {
		blocked = scoped
	}
	if blocked != nil {
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
		out.Reason = "authorization_required"
		return
	}
	if snapshot.GetError() != "" {
		out.Reason = "quota_refresh_failed"
		return
	}
	if now-snapshot.GetUpdatedAtUnix() >= int64(quotaRefresh.Seconds()) {
		out.Reason = "quota_stale"
		return
	}
	if windows["5h"] == nil {
		return
	}
	for _, key := range []string{"5h", "7d", "7d_fable", "7d_sonnet"} {
		window := windows[key]
		if window == nil || !quotaApplies(key, out.Model) {
			continue
		}
		if window.GetUtilizationUnknown() || (window.GetStatus() != "allowed" && window.GetStatus() != "allowed_warning") {
			out.Reason = "quota_unknown:" + key
			return
		}
		if reset := window.GetResetsAtUnix(); reset != 0 && reset <= now {
			out.Reason = "quota_reset_unconfirmed:" + key
			return
		}
	}
	out.State, out.Reason = pluginv1.ModelAvailability_AVAILABLE, "quota_available"
}

func quotaApplies(key, model string) bool {
	switch key {
	case "5h", "7d":
		return true
	case "7d_fable":
		return strings.HasPrefix(model, "claude-fable-")
	case "7d_sonnet":
		return strings.HasPrefix(model, "claude-sonnet-")
	default:
		return false
	}
}

func validCachedQuotaWindow(window *pluginv1.QuotaWindow) bool {
	if window == nil || !validUsage(window.GetUtilization()) || window.GetResetsAtUnix() < 0 || window.GetResetsAtUnix() > 253402300799 || window.GetUsed() < 0 || window.GetLimit() < 0 {
		return false
	}
	if window.GetUtilizationUnknown() && (window.GetUtilization() != 0 || window.GetUsed() != 0 || window.GetLimit() != 0) {
		return false
	}
	switch window.GetKey() {
	case "5h", "7d", "7d_sonnet", "7d_fable":
	default:
		return false
	}
	switch window.GetStatus() {
	case "", "allowed", "allowed_warning", "rejected":
		return true
	default:
		return false
	}
}
