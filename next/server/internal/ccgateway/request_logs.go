package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Only the switch state is exposed; request log contents stay on the runtime.
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
	var out struct {
		Enabled *bool `json:"enabled"`
	}
	if json.Unmarshal(raw, &out) != nil || out.Enabled == nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	if method == http.MethodPut {
		s.record(c, "account."+strconv.FormatInt(d.AccountID, 10)+".request-logs")
	}
	httpapi.OK(c, map[string]bool{"enabled": *out.Enabled})
}
