package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/tidwall/gjson"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	quotaRefresh = 3 * time.Minute
	quotaRetry   = time.Minute
	maxQuotaBody = 64 << 10
)

var _ pluginsdk.QuotaReader = (*Plugin)(nil)

type usageWindow struct {
	Utilization *float64 `json:"utilization"`
	ResetsAt    *string  `json:"resets_at"`
	Status      string   `json:"status"`
}

type usageLimit struct {
	Kind     string   `json:"kind"`
	Percent  *float64 `json:"percent"`
	ResetsAt *string  `json:"resets_at"`
	Status   string   `json:"status"`
	Scope    *struct {
		Model *struct {
			DisplayName string `json:"display_name"`
		} `json:"model"`
		Surface json.RawMessage `json:"surface"`
	} `json:"scope"`
}

type usageExtra struct {
	Enabled *bool    `json:"is_enabled"`
	Limit   *float64 `json:"monthly_limit"`
	Used    *float64 `json:"used_credits"`
}

func (p *Plugin) BuildQuotaRequest(_ context.Context, in *pluginv1.BuildQuotaRequestRequest) (*pluginv1.BuildQuotaRequestResponse, error) {
	if in.GetAccount().GetType() != AccountTypeManaged {
		return nil, status.Error(codes.Unimplemented, "only managed accounts have subscription usage")
	}
	return &pluginv1.BuildQuotaRequestResponse{RuntimeOperation: "usage"}, nil
}

func (p *Plugin) ParseQuotaResponse(_ context.Context, in *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	if in.GetAccount().GetType() != AccountTypeManaged {
		return nil, status.Error(codes.Unimplemented, "only managed accounts have subscription usage")
	}
	now := p.now()
	if in.GetTruncated() || len(in.GetBody()) > maxQuotaBody {
		return quotaFailure(now, false, "usage response too large"), nil
	}
	if in.GetStatus() == 0 {
		return quotaFailure(now, false, "usage runtime request failed"), nil
	}
	if in.GetStatus() != 200 {
		return usageFailure(now, in.GetStatus(), in.GetBody()), nil
	}
	windows, err := parseUsage(in.GetBody())
	if err != nil {
		return quotaFailure(now, false, err.Error()), nil
	}
	return &pluginv1.QuotaResult{Windows: windows, NextCheckAtUnix: nextQuotaCheck(now, windows)}, nil
}

func quotaFailure(now time.Time, auth bool, message string) *pluginv1.QuotaResult {
	kind := pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT
	if auth {
		kind = pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED
	}
	return &pluginv1.QuotaResult{ErrorType: kind, ErrorMessage: message, NextCheckAtUnix: now.Add(quotaRetry).Unix()}
}

func usageFailure(now time.Time, code int32, raw []byte) *pluginv1.QuotaResult {
	var body struct {
		Error struct {
			Type string `json:"type"`
			Code string `json:"code"`
		} `json:"error"`
		Code string `json:"code"`
	}
	err := json.Unmarshal(raw, &body)
	reason := body.Error.Type
	if reason == "" {
		reason = body.Error.Code
	}
	if reason == "" {
		reason = body.Code
	}
	if err != nil {
		reason = ""
		var controller struct {
			Error string `json:"error"`
		}
		if json.Unmarshal(raw, &controller) == nil {
			reason = controller.Error
		}
	}
	switch reason {
	case "not_logged_in", "token_expired":
		return quotaFailure(now, true, reason+": refresh the account authorization")
	case "api_key_account":
		return quotaFailure(now, false, "API key accounts have no subscription usage")
	}
	if code == 404 && (reason == "" || reason == "not_found" || reason == "not_found_error") {
		return quotaFailure(now, false, "runtime does not support usage queries; upgrade the CCGateway runtime")
	}
	if code == 409 {
		return quotaFailure(now, false, "account runtime is not synchronized")
	}
	return quotaFailure(now, false, fmt.Sprintf("usage runtime returned %d", code))
}

func parseUsage(raw []byte) ([]*pluginv1.QuotaWindow, error) {
	var body struct {
		Five   *usageWindow `json:"five_hour"`
		Week   *usageWindow `json:"seven_day"`
		Sonnet *usageWindow `json:"seven_day_sonnet"`
		Fable  *usageWindow `json:"seven_day_overage_included"`
		Limits []usageLimit `json:"limits"`
		Extra  *usageExtra  `json:"extra_usage"`
	}
	if json.Unmarshal(raw, &body) != nil || !uniqueUsageFields(gjson.ParseBytes(raw), 0) {
		return nil, errors.New("usage response is invalid or ambiguous JSON")
	}
	windows := map[string]*usageWindow{"5h": body.Five, "7d": body.Week, "7d_sonnet": body.Sonnet, "7d_fable": body.Fable}
	seen := map[string]bool{}
	for _, limit := range body.Limits {
		key := usageLimitKey(limit)
		if key == "" {
			continue
		}
		if seen[key] {
			return nil, errors.New("usage response has duplicate scoped limits")
		}
		seen[key] = true
		candidate := &usageWindow{Utilization: limit.Percent, ResetsAt: limit.ResetsAt, Status: limit.Status}
		parsed, err := parseUsageWindow(key, candidate, body.Extra)
		if err != nil {
			return nil, err
		}
		if windows[key] == nil {
			windows[key] = candidate
			continue
		}
		legacy, err := parseUsageWindow(key, windows[key], body.Extra)
		if err != nil {
			return nil, err
		}
		if parsed.Status != legacy.Status || parsed.Utilization != legacy.Utilization || parsed.ResetsAtUnix != legacy.ResetsAtUnix {
			return nil, errors.New("usage response has conflicting scoped limits")
		}
	}
	out := make([]*pluginv1.QuotaWindow, 0, len(windows))
	for _, key := range []string{"5h", "7d", "7d_sonnet", "7d_fable"} {
		if windows[key] == nil {
			continue
		}
		window, err := parseUsageWindow(key, windows[key], body.Extra)
		if err != nil {
			return nil, err
		}
		out = append(out, window)
	}
	if len(out) == 0 {
		return nil, errors.New("usage response has no authoritative quota windows")
	}
	return out, nil
}

func uniqueUsageFields(node gjson.Result, depth int) bool {
	if depth > 32 {
		return false
	}
	if !node.IsObject() && !node.IsArray() {
		return true
	}
	seen, valid := map[string]bool{}, true
	node.ForEach(func(key, value gjson.Result) bool {
		if node.IsObject() && seen[key.String()] {
			valid = false
			return false
		}
		seen[key.String()] = true
		valid = uniqueUsageFields(value, depth+1)
		return valid
	})
	return valid
}

func usageLimitKey(limit usageLimit) string {
	if limit.Kind != "weekly_scoped" || limit.Scope == nil || limit.Scope.Model == nil {
		return ""
	}
	if surface := strings.TrimSpace(string(limit.Scope.Surface)); surface != "" && surface != "null" {
		return ""
	}
	switch {
	case strings.EqualFold(limit.Scope.Model.DisplayName, "Fable"):
		return "7d_fable"
	case strings.EqualFold(limit.Scope.Model.DisplayName, "Sonnet"):
		return "7d_sonnet"
	default:
		return ""
	}
}

func validUsage(value float64) bool { return !math.IsNaN(value) && !math.IsInf(value, 0) && value >= 0 }

func parseUsageWindow(key string, in *usageWindow, extra *usageExtra) (*pluginv1.QuotaWindow, error) {
	if in.Utilization == nil || !validUsage(*in.Utilization) {
		return nil, errors.New("usage window is missing a valid percentage: " + key)
	}
	out := &pluginv1.QuotaWindow{Key: key, Utilization: *in.Utilization, Status: in.Status}
	if in.ResetsAt != nil && *in.ResetsAt != "" {
		reset, err := time.Parse(time.RFC3339Nano, *in.ResetsAt)
		if err != nil || reset.Unix() <= 0 {
			return nil, errors.New("usage window has an invalid reset: " + key)
		}
		out.ResetsAtUnix = reset.Unix()
	}
	switch out.Status {
	case "allowed", "allowed_warning", "rejected":
		return out, nil
	case "":
	default:
		return nil, errors.New("usage window has an unknown status: " + key)
	}
	if out.Utilization < 100 {
		out.Status = "allowed"
		return out, nil
	}
	out.Status = extraUsageStatus(extra)
	if out.Status == "" {
		return nil, errors.New("usage window exhaustion is not authoritative: " + key)
	}
	return out, nil
}

func extraUsageStatus(extra *usageExtra) string {
	if extra == nil || extra.Enabled == nil {
		return ""
	}
	if !*extra.Enabled {
		return "rejected"
	}
	if extra.Limit == nil || extra.Used == nil || !validUsage(*extra.Limit) || !validUsage(*extra.Used) {
		return ""
	}
	if *extra.Used >= *extra.Limit {
		return "rejected"
	}
	return "allowed"
}

func nextQuotaCheck(now time.Time, windows []*pluginv1.QuotaWindow) int64 {
	next := now.Add(quotaRefresh).Unix()
	for _, window := range windows {
		reset := window.GetResetsAtUnix()
		if reset > now.Unix() {
			next = min(next, reset+1)
		}
		if window.GetStatus() == "rejected" && reset <= now.Unix() {
			next = min(next, now.Add(30*time.Second).Unix())
		}
	}
	return next
}
