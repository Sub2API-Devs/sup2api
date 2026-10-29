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

// evaluateQuotaAvailability admits a managed account whatever its quota
// snapshot says (CONTRACTS §44.7). An exhausted shared window answers the
// request with a 429 whose reset time cools the account down until then
// (classifyRateLimit), and a refused authorization answers with a 401 that
// disables it (the core's automatic disable rule). Holding the account back
// on the snapshot instead kept it unusable for good whenever the usage query
// that would clear the window kept failing.
//
// A model family's own exhausted window (7d_fable, 7d_sonnet) is the one
// exception: its 429 moves the request on without cooling the whole account
// down, so the window holds that family back until its reset time - no
// later, and without waiting for a query to confirm the reset.
func evaluateQuotaAvailability(snapshot *pluginv1.AccountQuotaSnapshot, now int64, out *pluginv1.ModelAvailability) {
	out.State, out.Reason = pluginv1.ModelAvailability_AVAILABLE, "quota_not_enforced"
	var blocked *pluginv1.QuotaWindow
	for _, window := range snapshot.GetWindows() {
		key := window.GetKey()
		if window.GetStatus() != "rejected" || !scopedQuota(key) || !quotaApplies(key, out.Model) ||
			!validCachedQuotaWindow(window) || window.GetResetsAtUnix() <= now {
			continue
		}
		if blocked == nil || window.GetResetsAtUnix() > blocked.GetResetsAtUnix() {
			blocked = window
		}
	}
	if blocked != nil {
		out.State, out.Reason = pluginv1.ModelAvailability_UNAVAILABLE, "quota_rejected:"+blocked.GetKey()
		out.RetryAtUnix = blocked.GetResetsAtUnix()
	}
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
