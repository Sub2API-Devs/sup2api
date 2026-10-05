package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

// Subscription usage of Claude Code (OAuth) accounts, CONTRACTS §44.8. The
// OAuth token lives in the account's container and the CLI's own requests
// (with Anthropic's rate-limit headers) never reach the core, so the core
// asks the container: GET /admin/usage reads Anthropic's OAuth usage endpoint
// with the stored token, through the container's egress, and answers the
// upstream JSON verbatim. The account service turns it into quota windows.

// UsageWindow is one window of an account's subscription usage.
type UsageWindow struct {
	Key string
	// Utilization is in percent, as Anthropic reports it.
	Utilization float64
	// ResetsAt is nil when the window has not started.
	ResetsAt *time.Time
}

// UsageError is a failed usage query. Auth is set when the account's
// authorization is the problem (signed out, token rejected): re-authorize the
// account; anything else is transient.
type UsageError struct {
	Code    string
	Message string
	Auth    bool
}

func (e *UsageError) Error() string { return e.Code + ": " + e.Message }

func usageFail(code, msg string) *UsageError {
	return &UsageError{Code: code, Message: msg, Auth: code == "not_logged_in" || code == "token_expired"}
}

// maxUsageBody bounds the container's answer (Anthropic's is about 1 KiB).
const maxUsageBody = 64 << 10

// QueryUsage asks the runtime of a ccgateway/managed account for its
// subscription usage: the account's own container with per-account runtimes,
// the shared container otherwise. Errors are *UsageError.
func (s *Service) QueryUsage(ctx context.Context, accountID int64) ([]UsageWindow, error) {
	cfg, e := s.Load(ctx)
	if e != nil {
		return nil, usageFail("not_configured", reasonMessages["not_configured"])
	}
	var res *http.Response
	var closeConn func() error
	if cfg.AccountRuntimes {
		d, e := s.desired(ctx, accountID, false)
		if e != nil {
			return nil, usageFail("not_found", "The account is not a CCGateway account.")
		}
		if d.Kind != "managed" {
			return nil, usageFail("api_key_account", "API key accounts have no subscription usage.")
		}
		if !d.Enabled {
			return nil, usageFail(d.Blocked, reasonMessages[d.Blocked])
		}
		res, closeConn, e = s.runtimeRequest(ctx, d.Key, "GET", "admin/usage", nil, d.Revision)
		if e != nil {
			te := transportError(e)
			return nil, usageFail(fmt.Sprint(te.Details["reason"]), te.Message)
		}
	} else {
		if cfg.AdminKey == "" {
			return nil, usageFail("not_configured", reasonMessages["not_configured"])
		}
		client, base, c, e := s.open(ctx, cfg)
		if e != nil {
			return nil, usageFail("not_configured", reasonMessages["not_configured"])
		}
		req, _ := http.NewRequestWithContext(ctx, "GET", base+"/admin/usage", nil)
		req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
		if res, e = client.Do(req); e != nil {
			_ = c()
			return nil, usageFail("not_configured", "CCGateway cannot be reached.")
		}
		closeConn = c
	}
	defer closeConn()
	defer res.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(res.Body, maxUsageBody+1))
	if e != nil || len(raw) > maxUsageBody {
		return nil, usageFail("runtime_unavailable", reasonMessages["runtime_unavailable"])
	}
	if res.StatusCode != http.StatusOK {
		return nil, usageError(res.StatusCode, raw)
	}
	windows, e := ParseUsage(raw)
	if e != nil {
		return nil, usageFail("upstream_error", e.Error())
	}
	return windows, nil
}

// usageError maps a non-200 answer of the controller or the container.
func usageError(status int, raw []byte) *UsageError {
	code, msg := parseRuntimeError(raw)
	switch {
	case status == http.StatusNotFound && (code == "" || code == "not_found" || code == "not_found_error"):
		// The controller or the container predates GET /admin/usage.
		return usageFail("unsupported", "The account runtime does not support usage queries yet: upgrade the CCGateway runtime.")
	case status == http.StatusConflict && code == "api_key_account":
		return usageFail(code, "API key accounts have no subscription usage.")
	case status == http.StatusConflict:
		return usageFail("not_synchronized", reasonMessages["not_synchronized"])
	}
	if code == "" {
		code = "runtime_unavailable"
	}
	if msg == "" {
		if msg = reasonMessages[code]; msg == "" {
			msg = "The account runtime answered " + strconv.Itoa(status) + "."
		}
	}
	return usageFail(code, msg)
}

// usageWindow is one window of Anthropic's GET /api/oauth/usage answer:
// utilization is already a percentage, resets_at an RFC 3339 time or null.
type usageWindow struct {
	Utilization float64 `json:"utilization"`
	ResetsAt    *string `json:"resets_at"`
}

// ParseUsage reads Anthropic's usage answer into the 5h, 7d, 7d_sonnet and
// 7d_fable windows (the keys and the source fields of the claude-oauth
// plugin; seven_day_overage_included is the Fable weekly window). The 5-hour,
// weekly and Fable weekly windows are reported whenever Anthropic sends them,
// a window that has not started yet as 0 % without a reset time; the Sonnet
// weekly window only when it has started (as the claude-oauth plugin).
func ParseUsage(raw []byte) ([]UsageWindow, error) {
	var u struct {
		FiveHour                *usageWindow `json:"five_hour"`
		SevenDay                *usageWindow `json:"seven_day"`
		SevenDaySonnet          *usageWindow `json:"seven_day_sonnet"`
		SevenDayOverageIncluded *usageWindow `json:"seven_day_overage_included"`
	}
	if err := json.Unmarshal(raw, &u); err != nil {
		return nil, errors.New("the usage answer is not valid JSON")
	}
	five := u.FiveHour
	if five == nil {
		five = &usageWindow{}
	}
	out := []UsageWindow{toUsageWindow("5h", five)}
	for _, w := range []struct {
		key     string
		win     *usageWindow
		started bool // only once it has a reset time
	}{{"7d", u.SevenDay, false}, {"7d_sonnet", u.SevenDaySonnet, true}, {"7d_fable", u.SevenDayOverageIncluded, false}} {
		if w.win == nil || (w.started && (w.win.ResetsAt == nil || *w.win.ResetsAt == "")) {
			continue
		}
		out = append(out, toUsageWindow(w.key, w.win))
	}
	return out, nil
}

func toUsageWindow(key string, w *usageWindow) UsageWindow {
	out := UsageWindow{Key: key, Utilization: w.Utilization}
	if w.ResetsAt != nil {
		for _, layout := range []string{time.RFC3339Nano, time.RFC3339} {
			if t, err := time.Parse(layout, *w.ResetsAt); err == nil {
				t = t.UTC()
				out.ResetsAt = &t
				break
			}
		}
	}
	return out
}
