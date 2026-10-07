package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Only switch state and validated limits are exposed; log contents stay on the runtime.
func (s *Service) serveRequestLogs(c *gin.Context, ctx context.Context, d accountDesired) {
	method := c.Request.Method
	if method != http.MethodGet && method != http.MethodPut {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if !d.Enabled {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, d.Blocked))
		return
	}
	var body []byte
	if method == http.MethodPut {
		var in struct {
			Enabled *bool `json:"enabled"`
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1024)
		if !httpapi.BindJSON(c, &in) {
			return
		}
		if in.Enabled == nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("enabled must be a boolean."))
			return
		}
		body, _ = json.Marshal(map[string]bool{"enabled": *in.Enabled})
	}
	res, closeConn, e := s.runtimeRequest(ctx, d.Key, method, "admin/request-logs", body, d.Revision)
	if e != nil {
		httpapi.Fail(c, transportError(e))
		return
	}
	defer closeConn()
	defer res.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(res.Body, 4097))
	if e != nil || len(raw) > 4096 {
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
		s.record(c, "account."+strconv.FormatInt(d.AccountID, 10)+".request-logs")
	}
	httpapi.OK(c, out)
}

type requestLogState struct {
	Enabled              *bool  `json:"enabled"`
	PerRequestLimitBytes *int64 `json:"per_request_limit_bytes,omitempty"`
	RetentionHours       *int64 `json:"retention_hours,omitempty"`
	StorageBudgetBytes   *int64 `json:"storage_budget_bytes,omitempty"`
	OverflowBehavior     string `json:"overflow_behavior,omitempty"`
}

func decodeRequestLogState(raw []byte) (requestLogState, error) {
	var out requestLogState
	if err := json.Unmarshal(raw, &out); err != nil {
		return out, err
	}
	if out.Enabled == nil {
		return out, errors.New("request log state has no enabled value")
	}
	for _, limit := range []*int64{out.PerRequestLimitBytes, out.RetentionHours, out.StorageBudgetBytes} {
		if limit != nil && (*limit <= 0 || *limit > 1<<53-1) {
			return out, errors.New("invalid request log limit")
		}
	}
	// Unknown future behavior is not an assurance that partial logs survive.
	if out.OverflowBehavior != "retain_partial_with_metadata" {
		out.OverflowBehavior = ""
	}
	return out, nil
}
