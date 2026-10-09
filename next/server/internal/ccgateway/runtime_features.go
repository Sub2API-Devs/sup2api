package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Inspection only: never reconcile, start a container or change routing state.
func (s *Service) serveFeatures(c *gin.Context, ctx context.Context, d accountDesired) {
	if c.Request.Method != http.MethodGet {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if !d.Enabled {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "runtime_unavailable"))
		return
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	res, closeConn, err := s.runtimeRequest(ctx, d.Key, http.MethodGet, "admin/features", nil, d.Revision)
	if err != nil {
		httpapi.Fail(c, transportError(err))
		return
	}
	defer closeConn()
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("Worker capability inspection unavailable; this may be an older Worker or controller."))
		return
	}
	raw, err := io.ReadAll(io.LimitReader(res.Body, 128*1024+1))
	if err != nil || len(raw) > 128*1024 {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	doc, err := features.DecodeRuntimeCapabilities(raw)
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("Worker capability document is invalid or uses an unsupported protocol."))
		return
	}
	c.Header("Cache-Control", "no-store")
	httpapi.OK(c, doc)
}

// cliVersionTimeout bounds the extra capability read of GET .../health.
const cliVersionTimeout = 3 * time.Second

var cliVersionPattern = regexp.MustCompile(`^[0-9A-Za-z][0-9A-Za-z.+_-]{0,63}$`)

// observedCLIVersion is the Claude Code version the account's Worker observed
// (the cli_version probe of GET admin/features; the controller does not expose
// the Worker's /health). Read only and best effort: "" when the Worker is older,
// not ready, slow, or reports none or an ambiguous value.
func (s *Service) observedCLIVersion(ctx context.Context, d accountDesired) string {
	ctx, cancel := context.WithTimeout(ctx, cliVersionTimeout)
	defer cancel()
	res, closeConn, err := s.runtimeRequest(ctx, d.Key, http.MethodGet, "admin/features", nil, d.Revision)
	if err != nil {
		return ""
	}
	defer closeConn()
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return ""
	}
	raw, err := io.ReadAll(io.LimitReader(res.Body, 128*1024+1))
	if err != nil || len(raw) > 128*1024 {
		return ""
	}
	doc, err := features.DecodeRuntimeCapabilities(raw)
	if err != nil {
		return ""
	}
	return cliVersionOf(doc)
}

// cliVersionOf returns the single observed cli_version probe value, or "".
func cliVersionOf(doc features.RuntimeCapabilities) string {
	version := ""
	for _, p := range doc.Probes {
		if p.Name != "cli_version" || p.Status != "observed" || p.Value == "" {
			continue
		}
		if version != "" && version != p.Value {
			return ""
		}
		version = p.Value
	}
	if !cliVersionPattern.MatchString(version) {
		return ""
	}
	return version
}

// withCLIVersion adds cli_version to a health answer when it is known.
func withCLIVersion(out any, version string) any {
	if version == "" {
		return out
	}
	raw, err := json.Marshal(out)
	var fields map[string]any
	if err != nil || json.Unmarshal(raw, &fields) != nil || fields == nil {
		return out
	}
	fields["cli_version"] = version
	return fields
}
