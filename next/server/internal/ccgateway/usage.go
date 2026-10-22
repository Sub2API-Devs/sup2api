package ccgateway

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Subscription usage of Claude Code (OAuth) accounts, CONTRACTS §44.8. The
// OAuth token lives in the account's container and the CLI's own requests
// (with Anthropic's rate-limit headers) never reach the core, so the core
// asks the container: GET /admin/usage reads Anthropic's OAuth usage endpoint
// with the stored token, through the container's egress, and answers the
// upstream JSON verbatim. The account service turns it into quota windows.

// UsageError is a failed usage query. Auth is set when the account's
// authorization is the problem (signed out, token rejected): re-authorize the
// account; anything else is transient.
type UsageError struct {
	Code    string
	Message string
	Auth    bool
}

func (e *UsageError) Error() string          { return e.Code + ": " + e.Message }
func usageFail(code, msg string) *UsageError { return &UsageError{Code: code, Message: msg} }

// maxUsageBody bounds the container's answer (Anthropic's is about 1 KiB).
const maxUsageBody = 64 << 10

// QueryUsage asks the runtime of a ccgateway/managed account for its
// subscription usage: the account's own container with per-account runtimes,
// the shared container otherwise. Errors are *UsageError.
func (s *Service) QueryAccountQuota(ctx context.Context, accountID int64, operation string) (*pluginv1.ParseQuotaResponseRequest, error) {
	if operation != "usage" {
		return nil, usageFail("unsupported", "Unsupported quota operation.")
	}
	// A disabled account is only kept out of scheduling; its usage is queried.
	var exists bool
	if err := s.DB.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM accounts WHERE id=$1 AND plugin_key='ccgateway' AND type='managed' AND deleted_at IS NULL)`, accountID).Scan(&exists); err != nil || !exists {
		return nil, usageFail("account_unavailable", "The account is not available for quota queries.")
	}
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
		if reason := d.unavailable(); reason != "" {
			return nil, usageFail(reason, reasonMessages[reason])
		}
		res, closeConn, e = s.runtimeRequest(ctx, d.Key, http.MethodGet, "admin/usage", nil, d.Revision)
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
		req, _ := http.NewRequestWithContext(ctx, http.MethodGet, base+"/admin/usage", nil)
		req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
		if res, e = client.Do(req); e != nil {
			_ = c()
			return nil, usageFail("runtime_unavailable", "CCGateway cannot be reached.")
		}
		closeConn = c
	}
	defer closeConn()
	defer res.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(res.Body, maxUsageBody+1))
	out := &pluginv1.ParseQuotaResponseRequest{Status: int32(res.StatusCode), Headers: map[string]string{}}
	if e != nil {
		out.TransportError = "quota runtime response could not be read"
	}
	if len(raw) > maxUsageBody {
		raw = raw[:maxUsageBody]
		out.Truncated = true
	}
	out.Body = raw
	for _, key := range []string{"content-type", "retry-after", "date", "x-request-id"} {
		if value := res.Header.Get(key); value != "" && len(value) <= 256 && !strings.ContainsAny(value, "\r\n") {
			out.Headers[key] = value
		}
	}
	return out, nil
}

var _ core.AccountQuotaRuntime = (*Service)(nil)
