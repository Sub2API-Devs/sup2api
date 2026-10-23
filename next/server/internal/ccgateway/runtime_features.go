package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"regexp"
	"slices"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Probe the same account route immediately before sending a transformed model
// request. Do not cache this across in-place Worker updates/downgrades: an old
// Worker ignores unknown policy fields. This local read never calls a model.
func requireBuildAttachmentCapability(ctx context.Context, client *http.Client, base, key, cliVersion string) error {
	return requireCapabilities(ctx, client, base, key, cliVersion, []string{features.BuildAttachmentCapability})
}

// requestPolicyCapabilities are what the Worker and CLI must confirm for a
// wire policy (workerPolicy). Every policy follows the request levels: an
// older CLI would add the identity line in direct and complete a request
// without a billing header as a subagent.
func requestPolicyCapabilities(p RequestPolicy) []string {
	required := []string{}
	if p.CLIVersion == "2.1.304" || p.RelayMode == "direct" {
		required = append(required, features.RequestPolicyModeCapability)
	}
	required = append(required, features.RequestLevelsCapability)
	if p.RequestIdentitySources.Explicit() {
		required = append(required, features.RequestIdentityCapability)
	}
	identityLines := p.BuildBillingEntrypoint != "" || len(p.BuildIdentityLines) > 0
	if p.RelayMode == "direct" {
		if identityLines || p.BuildBillingSources.UsesWorker() {
			required = append(required, features.DirectBillingCapability)
		}
		return required
	}
	if p.CLIVersion == "2.1.304" {
		required = append(required, features.BuildContentPreservationCapability)
	}
	if p.BuildAttachmentSources.RequiresV2() {
		required = append(required, features.BuildAttachmentCapabilityV2)
	} else if p.BuildAttachmentSources.UsesWorker() {
		required = append(required, features.BuildAttachmentCapability)
	}
	if p.BuildBillingSources.UsesWorker() {
		required = append(required, features.BuildBillingCapability)
	}
	if identityLines {
		required = append(required, features.BuildIdentityCapability)
	}
	if p.BuildInjection != nil {
		required = append(required, features.BuildInjectionCapability)
	}
	return required
}

func requireRequestPolicyCapabilities(ctx context.Context, client *http.Client, base, key string, p RequestPolicy) error {
	return requireCapabilities(ctx, client, base, key, p.CLIVersion, requestPolicyCapabilities(p))
}

func requireCapabilities(ctx context.Context, client *http.Client, base, key, cliVersion string, required []string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/healthz", nil)
	if err != nil {
		return err
	}
	req.Header.Set("x-api-key", key)
	res, err := client.Do(req)
	if err != nil && errors.Is(err, errAccountNotSynchronized) {
		// The route's revision was refused: not a capability answer, the
		// caller reads the account again (forwardAttempt).
		return err
	}
	if err == nil {
		defer res.Body.Close()
		raw, readErr := io.ReadAll(io.LimitReader(res.Body, 8193))
		var health struct {
			Status       string   `json:"status"`
			CLIVersion   string   `json:"claude_version"`
			Capabilities []string `json:"capabilities"`
		}
		if res.StatusCode == http.StatusOK && readErr == nil && len(raw) <= 8192 &&
			json.Unmarshal(raw, &health) == nil && health.Status == "ok" &&
			(cliVersion == "" || cliVersion == health.CLIVersion) {
			complete := true
			for _, capability := range required {
				complete = complete && slices.Contains(health.Capabilities, capability)
			}
			if complete {
				return nil
			}
		}
	}
	return core.ErrConflict.WithMessage("The account Worker/CLI does not confirm the requested feature policy capabilities or CLI version.").WithDetails(map[string]any{"reason": "configuration_error", "required_capabilities": required})
}

// Inspection only: never reconcile, start a container or change routing state.
func (s *Service) serveFeatures(c *gin.Context, ctx context.Context, d accountDesired) {
	if c.Request.Method != http.MethodGet {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if d.unavailable() != "" {
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
