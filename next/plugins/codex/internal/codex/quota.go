package codex

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/textutil"
)

// Subscription quota of codex_device accounts (CONTRACTS §44,
// docs/PLUGIN-CODEX.md §9). The ChatGPT Codex backend reports two usage
// windows, "primary" and "secondary", in GET /backend-api/wham/usage and in
// the x-codex-{primary,secondary}-* headers of every answer. Which one is the
// 5-hour window and which the weekly one is NOT fixed (older backends sent
// primary = weekly, the Codex CLI usually sees primary = 300 minutes), so a
// window is always keyed by its own length (windowKey), never by its slot.
//
// The plugin only describes the usage request and reads the answer; the core
// sends it through the account's proxy (no "net" grant for chatgpt.com).
// chatgpt_siwc accounts have no quota: Sign in with ChatGPT documents no
// usage headers and forbids calling backend-api.

const (
	// QuotaKey5h and QuotaKey7d are the console's 5-hour and weekly windows.
	QuotaKey5h = "5h"
	QuotaKey7d = "7d"

	// usagePath is the Codex usage endpoint under the ChatGPT root.
	usagePath = "/backend-api/wham/usage"

	minutes5h = 300
	minutes7d = 7 * 24 * 60
	// windowTolerance is how far (relative) a window length may be from 5 h /
	// 7 d and still be that window.
	windowTolerance = 0.05
	// maxWindowMinutes bounds a believable window length (a year).
	maxWindowMinutes = 366 * 24 * 60
	// maxResetUnix is 9999-12-31T23:59:59Z.
	maxResetUnix = 253402300799
	// quotaRecheckAfterReset is how long after a window's reset the plugin
	// suggests the next usage query.
	quotaRecheckAfterReset = time.Minute
	// quotaRefresh is the core's normal query period; a suggestion later than
	// this is left out.
	quotaRefresh = 30 * time.Minute
)

// windowKey names a window by its length: about 300 minutes is "5h", about
// 10080 minutes "7d"; another length gets its own key ("1d", "8h", "90m").
// A missing or unbelievable length gives "": the window is ignored.
func windowKey(minutes int) string {
	switch {
	case minutes <= 0 || minutes > maxWindowMinutes:
		return ""
	case near(minutes, minutes5h):
		return QuotaKey5h
	case near(minutes, minutes7d):
		return QuotaKey7d
	case minutes%(24*60) == 0:
		return strconv.Itoa(minutes/(24*60)) + "d"
	case minutes%60 == 0:
		return strconv.Itoa(minutes/60) + "h"
	default:
		return strconv.Itoa(minutes) + "m"
	}
}

func near(v, target int) bool {
	return math.Abs(float64(v-target)) <= float64(target)*windowTolerance
}

// codexWindow is one usage window as the backend reports it.
type codexWindow struct {
	Key string
	// UsedPercent is the share used, in percent; Known is false when the
	// answer did not say.
	UsedPercent float64
	Known       bool
	// ResetAt is Unix seconds, 0 = unknown.
	ResetAt int64
}

// full reports whether the window is used up.
func (w codexWindow) full() bool { return w.Known && w.UsedPercent >= 100 }

// quotaWindow is the core's view of w. A used-up window is "rejected"; other
// windows carry no status (the backend reports none).
func (w codexWindow) quotaWindow() *pluginv1.QuotaWindow {
	q := &pluginv1.QuotaWindow{Key: w.Key, ResetsAtUnix: w.ResetAt}
	if w.Known {
		q.Utilization = w.UsedPercent
	} else {
		q.UtilizationUnknown = true
	}
	if w.full() {
		q.Status = manifest.QuotaRejected
	}
	return q
}

// newWindow builds a window from the raw values: minutes is its length, used
// its share in percent (nil = unknown), resetAt a Unix time (seconds, or
// milliseconds above 1e11; 0 = absent) and resetAfter seconds from now (<0 =
// absent), used when resetAt is absent. ok is false for a window without a
// usable length.
func newWindow(now time.Time, minutes int, used *float64, resetAt float64, resetAfter float64) (codexWindow, bool) {
	w := codexWindow{Key: windowKey(minutes)}
	if w.Key == "" {
		return w, false
	}
	if used != nil && !math.IsNaN(*used) && !math.IsInf(*used, 0) && *used >= 0 {
		w.UsedPercent, w.Known = *used, true
	}
	switch {
	case resetAt > 0 && !math.IsInf(resetAt, 0):
		if resetAt > resetsAtMillis {
			resetAt /= 1000
		}
		w.ResetAt = int64(resetAt)
	case resetAfter >= 0 && resetAfter <= float64(maxWindowMinutes)*60:
		w.ResetAt = now.Add(time.Duration(resetAfter * float64(time.Second))).Unix()
	}
	if w.ResetAt < 0 || w.ResetAt > maxResetUnix {
		w.ResetAt = 0
	}
	return w, true
}

// mergeWindows keys the windows; two windows of the same length keep the
// more used one.
func mergeWindows(in []codexWindow) []codexWindow {
	var out []codexWindow
	index := map[string]int{}
	for _, w := range in {
		i, dup := index[w.Key]
		switch {
		case !dup:
			index[w.Key] = len(out)
			out = append(out, w)
		case w.Known && (!out[i].Known || w.UsedPercent > out[i].UsedPercent):
			out[i] = w
		}
	}
	return out
}

// headerWindows reads the x-codex-{primary,secondary}-* headers (lower-cased
// names): used-percent, window-minutes and reset-at (Unix seconds, newer
// backends) or reset-after-seconds (older ones).
func headerWindows(h map[string]string, now time.Time) []codexWindow {
	var ws []codexWindow
	for _, slot := range []string{"primary", "secondary"} {
		prefix := "x-codex-" + slot + "-"
		minutes, err := strconv.Atoi(strings.TrimSpace(h[prefix+"window-minutes"]))
		if err != nil {
			continue
		}
		var used *float64
		if v, err := strconv.ParseFloat(strings.TrimSpace(h[prefix+"used-percent"]), 64); err == nil {
			used = &v
		}
		resetAt, _ := strconv.ParseFloat(strings.TrimSpace(h[prefix+"reset-at"]), 64)
		resetAfter, err := strconv.ParseFloat(strings.TrimSpace(h[prefix+"reset-after-seconds"]), 64)
		if err != nil {
			resetAfter = -1
		}
		if used == nil && resetAt <= 0 && resetAfter < 0 {
			continue
		}
		if w, ok := newWindow(now, minutes, used, resetAt, resetAfter); ok {
			ws = append(ws, w)
		}
	}
	return mergeWindows(ws)
}

// usageWindow is one window of the wham/usage answer.
type usageWindow struct {
	UsedPercent        *float64 `json:"used_percent"`
	LimitWindowSeconds float64  `json:"limit_window_seconds"`
	ResetAfterSeconds  *float64 `json:"reset_after_seconds"`
	ResetAt            float64  `json:"reset_at"`
}

// usageResponse is the part of GET /backend-api/wham/usage the plugin reads.
// An unused slot is null; rate_limit itself may be null (no limit).
type usageResponse struct {
	RateLimit *struct {
		PrimaryWindow   *usageWindow `json:"primary_window"`
		SecondaryWindow *usageWindow `json:"secondary_window"`
	} `json:"rate_limit"`
}

func (r usageResponse) windows(now time.Time) []codexWindow {
	if r.RateLimit == nil {
		return nil
	}
	var ws []codexWindow
	for _, u := range []*usageWindow{r.RateLimit.PrimaryWindow, r.RateLimit.SecondaryWindow} {
		if u == nil {
			continue
		}
		resetAfter := -1.0
		if u.ResetAfterSeconds != nil {
			resetAfter = *u.ResetAfterSeconds
		}
		minutes := int(math.Round(u.LimitWindowSeconds / 60))
		if w, ok := newWindow(now, minutes, u.UsedPercent, u.ResetAt, resetAfter); ok {
			ws = append(ws, w)
		}
	}
	return mergeWindows(ws)
}

// quotaResult turns windows into the core's QuotaResult with a suggested
// next check shortly after the earliest reset within the normal period.
func quotaResult(now time.Time, ws []codexWindow) *pluginv1.QuotaResult {
	res := &pluginv1.QuotaResult{}
	var next int64
	for _, w := range ws {
		res.Windows = append(res.Windows, w.quotaWindow())
		if w.ResetAt > now.Unix() {
			at := w.ResetAt + int64(quotaRecheckAfterReset/time.Second)
			if at < now.Add(quotaRefresh).Unix() && (next == 0 || at < next) {
				next = at
			}
		}
	}
	res.NextCheckAtUnix = next
	return res
}

// BuildQuotaRequest implements pluginsdk.QuotaReader: GET
// https://chatgpt.com/backend-api/wham/usage with the account's bearer token
// and ChatGPT account, identified truthfully as sup2api. Only codex_device
// accounts have a quota; the core sends the request.
func (p *Plugin) BuildQuotaRequest(_ context.Context, in *pluginv1.BuildQuotaRequestRequest) (*pluginv1.BuildQuotaRequestResponse, error) {
	acc := in.GetAccount()
	if acc.GetType() != TypeDevice {
		// Sign in with ChatGPT may not call backend-api.
		return nil, status.Errorf(codes.Unimplemented, "account type %q has no usage query", acc.GetType())
	}
	c, err := parseCredentials(acc.GetCredentialsJson())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "cannot read the credentials / 无法解析凭证: "+err.Error())
	}
	if c.AccessToken == "" {
		return nil, status.Error(codes.FailedPrecondition, "the account has no access_token; authorize it again / 账号没有 access_token，请重新授权")
	}
	return &pluginv1.BuildQuotaRequestResponse{Method: http.MethodGet, Url: p.ep.ChatGPT + usagePath, Headers: backendHeaders(c)}, nil
}

// backendHeaders are the headers of a codex_device request to the ChatGPT
// backend's JSON endpoints (usage, reset credits).
func backendHeaders(c credentials) map[string]string {
	h := upstreamHeaders(TypeDevice, c)
	h["accept"] = "application/json"
	return h
}

// ParseQuotaResponse implements pluginsdk.QuotaReader. 401/403 are
// AUTH_REJECTED, other failures TRANSIENT (recorded on the snapshot only; the
// account is never cooled down or disabled for a failed query). A null
// rate_limit or null window is no window.
func (p *Plugin) ParseQuotaResponse(_ context.Context, in *pluginv1.ParseQuotaResponseRequest) (*pluginv1.QuotaResult, error) {
	st := in.GetStatus()
	switch {
	case st == 0:
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, "cannot reach the usage endpoint / 无法连接用量接口: "+in.GetTransportError()), nil
	case st == http.StatusUnauthorized || st == http.StatusForbidden:
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED, usageStatusMessage(st, in.GetBody())), nil
	case st < 200 || st > 299:
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, usageStatusMessage(st, in.GetBody())), nil
	case in.GetTruncated():
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, "usage response too large / 用量响应过大"), nil
	}
	var u usageResponse
	if err := json.Unmarshal(in.GetBody(), &u); err != nil {
		return quotaError(pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, "unreadable usage response / 无法解析用量响应: "+err.Error()), nil
	}
	now := p.now()
	return quotaResult(now, u.windows(now)), nil
}

func usageStatusMessage(st int32, body []byte) string {
	return fmt.Sprintf("usage endpoint status %d / 用量接口返回状态 %d: %s", st, st, textutil.Clip(strings.TrimSpace(string(body)), 200))
}

func quotaError(t pluginv1.QuotaResult_ErrorType, msg string) *pluginv1.QuotaResult {
	return &pluginv1.QuotaResult{ErrorType: t, ErrorMessage: textutil.Clip(msg, 500)}
}
