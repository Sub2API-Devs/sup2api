package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Subscription quota (CONTRACTS §44). Both account types declare the
// anthropic-ratelimit-unified-{5h,7d,7d_oi}-* response headers in
// manifest.json, which the host samples from every gateway response at no
// extra cost. claude_oauth tokens carry the user:profile scope and can also
// read GET /api/oauth/usage, which the host asks for through
// BuildQuotaRequest / ParseQuotaResponse when its snapshot is stale.
// claude_setup_token tokens are inference-only: like sub2api
// (estimateSetupTokenUsage) they rely on the headers alone.
//
// Request and response shapes follow sub2api
// backend/internal/repository/claude_usage_service.go and
// backend/internal/service/account_usage_service.go (ClaudeUsageResponse,
// buildUsageInfo).

const (
	// UsageURL is Anthropic's OAuth usage endpoint.
	UsageURL = "https://api.anthropic.com/api/oauth/usage"
	// usageUserAgent is the Claude Code user agent sub2api sends by default.
	usageUserAgent = "claude-code/2.1.7"
	// typeOAuth is the account type that may query the usage endpoint.
	typeOAuth = "claude_oauth"
)

// usageWindow is one window of the usage response. utilization is already
// a percentage (sub2api uses it as is and divides by 100 only for its 0-1
// passive cache); resets_at is an RFC 3339 time or null.
type usageWindow struct {
	Utilization float64 `json:"utilization"`
	ResetsAt    *string `json:"resets_at"`
}

// usageResponse is the body of GET /api/oauth/usage. seven_day_overage_included
// is the Fable-only weekly window (header prefix 7d_oi).
type usageResponse struct {
	FiveHour                *usageWindow `json:"five_hour"`
	SevenDay                *usageWindow `json:"seven_day"`
	SevenDaySonnet          *usageWindow `json:"seven_day_sonnet"`
	SevenDayOverageIncluded *usageWindow `json:"seven_day_overage_included"`
}

// BuildQuotaRequest describes GET /api/oauth/usage for a claude_oauth
// account; the host sends it through the account's proxy.
func (p *Plugin) BuildQuotaRequest(_ context.Context, req *pluginv1.BuildQuotaRequestRequest) (*pluginv1.BuildQuotaRequestResponse, error) {
	acc := req.GetAccount()
	if acc.GetType() != typeOAuth {
		// Setup tokens have no user:profile scope: the usage endpoint
		// rejects them, so the host keeps the header samples.
		return nil, status.Error(codes.Unimplemented, "only claude_oauth accounts can query their usage")
	}
	var creds credentials
	if err := json.Unmarshal([]byte(acc.GetCredentialsJson()), &creds); err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "parse credentials: %v", err)
	}
	if strings.TrimSpace(creds.AccessToken) == "" {
		return nil, status.Error(codes.InvalidArgument, "missing access_token")
	}
	// Same headers as sub2api's usage fetcher (no Accept-Encoding: the
	// host's transport negotiates compression).
	return &pluginv1.BuildQuotaRequestResponse{
		Method: "GET",
		Url:    UsageURL,
		Headers: map[string]string{
			"accept":         "application/json, text/plain, */*",
			"content-type":   "application/json",
			"authorization":  "Bearer " + creds.AccessToken,
			"anthropic-beta": "oauth-2025-04-20",
			"user-agent":     usageUserAgent,
		},
	}, nil
}

// ParseQuotaResponse reads the usage answer into the 5h, 7d, 7d_sonnet and
// 7d_fable windows. Like sub2api's buildUsageInfo the 5-hour window is always
// reported and the weekly ones only when they carry a reset time (a window
// that has not started yet has none).
func (p *Plugin) ParseQuotaResponse(_ context.Context, req *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	switch st := req.GetStatus(); {
	case st == 0:
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, "usage request failed: "+req.GetTransportError()), nil
	case st == 401 || st == 403:
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED, fmt.Sprintf("usage API returned %d: %s", st, bodySnippet(req.GetBody()))), nil
	case st != 200:
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, fmt.Sprintf("usage API returned %d: %s", st, bodySnippet(req.GetBody()))), nil
	case req.GetTruncated():
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, "usage response too large"), nil
	}
	var u usageResponse
	if err := json.Unmarshal(req.GetBody(), &u); err != nil {
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, "decode usage response: "+err.Error()), nil
	}
	res := &pluginv1.QuotaResult{}
	five := u.FiveHour
	if five == nil {
		five = &usageWindow{}
	}
	res.Windows = append(res.Windows, quotaWindow("5h", five))
	for _, w := range []struct {
		key string
		win *usageWindow
	}{{"7d", u.SevenDay}, {"7d_sonnet", u.SevenDaySonnet}, {"7d_fable", u.SevenDayOverageIncluded}} {
		if w.win != nil && w.win.ResetsAt != nil && *w.win.ResetsAt != "" {
			res.Windows = append(res.Windows, quotaWindow(w.key, w.win))
		}
	}
	return res, nil
}

func quotaWindow(key string, w *usageWindow) *pluginv1.QuotaWindow {
	out := &pluginv1.QuotaWindow{Key: key, Utilization: w.Utilization}
	if w.ResetsAt != nil {
		if t, ok := parseUsageTime(*w.ResetsAt); ok {
			out.ResetsAtUnix = t.Unix()
		}
	}
	return out
}

// parseUsageTime accepts the time layouts sub2api's parseTime accepts.
func parseUsageTime(s string) (time.Time, bool) {
	for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05Z", "2006-01-02T15:04:05.000Z"} {
		if t, err := time.Parse(layout, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func quotaError(t pluginv1.QuotaResult_ErrorType, msg string) *pluginv1.QuotaResult {
	return &pluginv1.QuotaResult{ErrorType: t, ErrorMessage: msg}
}

// bodySnippet is the start of an error body, for the snapshot's error text.
func bodySnippet(b []byte) string {
	const max = 200
	s := strings.TrimSpace(string(b))
	if len(s) <= max {
		return s
	}
	s = s[:max]
	for !utf8.ValidString(s) && len(s) > 0 {
		s = s[:len(s)-1]
	}
	return s + "…"
}
