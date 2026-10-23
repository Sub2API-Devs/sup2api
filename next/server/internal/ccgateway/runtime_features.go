package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// requestPolicyCapabilities are what the Worker and CLI must confirm for a
// wire policy (workerPolicy), whatever the CLI version: every policy follows
// the request levels and may switch the mode per request, and build keeps the
// client's blocks (the Worker refuses build without it, CONTRACTS §53.21).
func requestPolicyCapabilities(p features.WorkerPolicy) []string {
	required := []string{features.RequestPolicyModeCapability, features.RequestLevelsCapability}
	// The identity line follows the entrypoint in the CLI.
	identityLines := p.BuildBillingEntrypoint != ""
	if p.RelayMode == "direct" {
		if identityLines || p.BuildBillingSources.UsesWorker() {
			required = append(required, features.DirectBillingCapability)
		}
		return required
	}
	required = append(required, features.BuildContentPreservationCapability)
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

// requireRequestPolicyCapabilities confirms the Worker behind r (nil: a
// connection of this request only) can apply p, reusing r's health answer
// while it is fresh.
func (s *Service) requireRequestPolicyCapabilities(ctx context.Context, client *http.Client, base, key string, r *accountRoute, p features.WorkerPolicy) error {
	required := requestPolicyCapabilities(p)
	if r != nil {
		if h := s.routeHealth(r); h != nil {
			return h.require(p.CLIVersion, required)
		}
	}
	h, err := readWorkerHealth(ctx, client, base, key)
	if err != nil {
		return err
	}
	if r != nil && h.Status == "ok" {
		s.keepRouteHealth(r, h)
	}
	return h.require(p.CLIVersion, required)
}

// workerHealth is the Worker's GET /healthz answer; why is set when it could
// not be read.
type workerHealth struct {
	Status       string   `json:"status"`
	CLIVersion   string   `json:"claude_version"`
	Capabilities []string `json:"capabilities"`
	why          string
}

const workerHealthLimit = 8192

// readWorkerHealth reads GET <base>/healthz. Only a refused route revision is
// an error (the caller reads the account again); a Worker that does not
// answer is a health whose require names why.
func readWorkerHealth(ctx context.Context, client *http.Client, base, key string) (workerHealth, error) {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+"/healthz", nil)
	if err != nil {
		return workerHealth{}, err
	}
	req.Header.Set("x-api-key", key)
	res, err := client.Do(req)
	if err != nil {
		if errors.Is(err, errAccountNotSynchronized) {
			return workerHealth{}, err
		}
		return workerHealth{why: "the account Worker did not answer its health check"}, nil
	}
	defer res.Body.Close()
	var h workerHealth
	raw, err := readBounded(res.Body, workerHealthLimit)
	if res.StatusCode != http.StatusOK || err != nil || json.Unmarshal(raw, &h) != nil || h.Status != "ok" {
		return workerHealth{why: "the account Worker's health check failed"}, nil
	}
	return h, nil
}

// require names what is missing (audit A6): the Worker's absence, its CLI
// version or the capabilities it lacks, so the cooldown reason and the
// client's error say which.
func (h workerHealth) require(cliVersion string, required []string) error {
	why := h.why
	switch {
	case why != "":
	case cliVersion != "" && cliVersion != h.CLIVersion:
		why = "the account runs Claude Code " + h.CLIVersion + ", the policy needs " + cliVersion
	default:
		var missing []string
		for _, capability := range required {
			if !slices.Contains(h.Capabilities, capability) {
				missing = append(missing, capability)
			}
		}
		if len(missing) == 0 {
			return nil
		}
		why = "the account Worker/CLI lacks " + strings.Join(missing, ", ") + " (update the Worker and CLI in place)"
	}
	return core.ErrConflict.WithMessage("The feature policy cannot be applied: " + why + ".").WithDetails(map[string]any{"reason": "configuration_error", "required_capabilities": required})
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
	raw, err := readBounded(res.Body, 128*1024)
	if err != nil {
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
	raw, err := readBounded(res.Body, 128*1024)
	if err != nil {
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
