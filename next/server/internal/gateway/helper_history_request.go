package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type helperHistoryRequest struct {
	prefixes   []string
	messages   []json.RawMessage
	lookup     core.HelperHistoryLookup
	envelope   wire.RequestEnvelope
	attempt    core.HelperHistoryAttempt
	dispatched bool
	held       *helperResponseWriter
	response   *wire.ResponseEnvelope
	rt         *typeRoute
}

func stripHelperHistoryHeaders(h http.Header) {
	for name := range h {
		if strings.HasPrefix(strings.ToLower(name), "x-ccgateway-helper-history") {
			delete(h, name)
		}
	}
}

func helperBudgetRequested(raw []byte) bool {
	var body struct {
		Output map[string]json.RawMessage `json:"output_config"`
	}
	return json.Unmarshal(raw, &body) == nil && len(body.Output["task_budget"]) > 0 && string(body.Output["task_budget"]) != "null"
}
func (c *call) discoverHelperHistory(ctx context.Context) *gwError {
	if c.ep.Protocol != "anthropic.messages" || c.g.d.HelperHistory == nil {
		return nil
	}
	messages, prefixes, err := publicHelperPrefixes(c.body)
	if err != nil {
		return invalidModelReference("invalid helper history message framing")
	}
	if len(prefixes) == 0 && !helperBudgetRequested(c.body) {
		return nil
	}
	lookup := core.HelperHistoryLookup{State: core.HelperHistoryUnknown}
	if len(prefixes) > 0 {
		lookup, err = c.g.d.HelperHistory.Lookup(ctx, c.resourceOwner(), prefixes)
	}
	if err != nil {
		return fromCore(core.ErrUnavailable.WithMessage("helper history lookup unavailable").WithCause(err), errTypeInternal)
	}
	if lookup.State == core.HelperHistoryKnownUnrestorable {
		return invalidModelReference("known helper history cannot be restored")
	}
	if lookup.State != core.HelperHistoryKnownReady && lookup.State != core.HelperHistoryUnknown {
		return fromCore(core.ErrUnavailable, errTypeInternal)
	}
	if lookup.State == core.HelperHistoryUnknown && !helperBudgetRequested(c.body) {
		return nil
	}
	if lookup.State == core.HelperHistoryKnownReady && !c.g.d.EnableHelperHistory {
		return invalidModelReference("helper history custody is not enabled")
	}
	c.helperHistory = &helperHistoryRequest{messages: messages, prefixes: prefixes, lookup: lookup}
	return nil
}
func (c *call) helperAccountAllowed(a *core.AccountRef) bool {
	h := c.helperHistory
	return h == nil || h.lookup.State != core.HelperHistoryKnownReady || a.PluginKey == "ccgateway" && a.ID == h.lookup.Chain.Binding.AccountID
}
func (c *call) helperWasDispatched() bool {
	return c.helperHistory != nil && c.helperHistory.dispatched
}

func helperRuntimeNamespace(caps features.RuntimeCapabilities, model string, policy json.RawMessage) (string, error) {
	if !slices.Contains(caps.HelperHistorySchemaVersions, wire.Version) {
		return "", core.ErrUnsupported.WithMessage("Worker does not support helper history custody")
	}
	cli := ""
	for _, p := range caps.Probes {
		if p.Name == "cli_version" && p.Status == "observed" {
			if cli != "" {
				return "", fmt.Errorf("ambiguous CLI version")
			}
			cli = p.Value
		}
	}
	return wire.Namespace(model, cli, policy)
}
func (c *call) wrapHelperHistoryRequest(ctx context.Context, req *http.Request, a *core.Account, rt *typeRoute, body []byte) error {
	stripHelperHistoryHeaders(req.Header)
	h := c.helperHistory
	if h == nil {
		return nil
	}
	if a.PluginKey != "ccgateway" {
		if h.lookup.State == core.HelperHistoryKnownReady {
			return fmt.Errorf("helper history account changed")
		}
		return nil
	}
	if !c.g.d.EnableHelperHistory {
		return nil
	} // Existing Worker gate remains authoritative for unknown requests.
	if h.lookup.State == core.HelperHistoryUnknown {
		// The bounded probe cannot impose a new limit on ordinary execution.
		// This is deliberately not proof that the request needs no helpers.
		if len(body) > wire.MaxPayloadBytes {
			return nil
		}
		probe := c.g.helperRequirement
		if probe == nil && c.g.d.CCGateway != nil {
			probe = c.g.d.CCGateway.HelperHistoryRequirement
		}
		if probe == nil {
			return core.ErrUnavailable.WithMessage("Worker requirement probe unavailable")
		}
		clone := req.Clone(ctx)
		clone.Body = io.NopCloser(bytes.NewReader(body))
		clone.ContentLength = int64(len(body))
		clone.GetBody = func() (io.ReadCloser, error) { return io.NopCloser(bytes.NewReader(body)), nil }
		decision, err := probe(ctx, a.ID, clone)
		if err != nil {
			return core.ErrUnavailable.WithMessage("Worker requirement probe unavailable").WithCause(err)
		}
		switch decision {
		case wire.RequirementOrdinary, wire.RequirementDeferToOrdinary:
			return nil
		case wire.RequirementNeedsCustody:
		default:
			return core.ErrUnavailable.WithMessage("Worker requirement probe invalid")
		}
	}
	if rt.conv != nil || rt.pluginUsage || rt.upstream != "anthropic.messages" || c.resourceAccess != nil || c.creditAccess != nil || c.diagnosticAccess != nil {
		return fmt.Errorf("helper history does not support this protocol or resource combination")
	}
	if h.lookup.State == core.HelperHistoryUnknown && len(h.prefixes) > 0 {
		return fmt.Errorf("unregistered assistant history cannot establish helper custody")
	}
	current, _, err := publicHelperPrefixes(body)
	if err != nil {
		return err
	}
	left, _ := json.Marshal(current)
	right, _ := json.Marshal(h.messages)
	ld, _ := wire.CanonicalDigest(left)
	rd, _ := wire.CanonicalDigest(right)
	if ld != rd {
		return fmt.Errorf("public history changed after helper admission")
	}
	var model struct {
		Model string `json:"model"`
	}
	if err = json.Unmarshal(body, &model); err != nil {
		return err
	}
	runtime := c.g.helperRuntime
	if runtime == nil {
		runtime = c.g.helperHistoryRuntime
	}
	ns, binding, err := runtime(ctx, a.ID, model.Model)
	if err != nil {
		return c.helperRuntimeFailure(err)
	}
	if binding.AccountID != a.ID {
		return fmt.Errorf("helper issuer account mismatch")
	}
	if h.lookup.State == core.HelperHistoryKnownReady && (h.lookup.Namespace != ns || h.lookup.Chain.Binding != binding) {
		return fmt.Errorf("helper history policy or issuer changed")
	}
	digest, err := wire.CanonicalDigest(body)
	if err != nil {
		return err
	}
	h.envelope = wire.RequestEnvelope{Version: wire.Version, RequestDigest: digest, Namespace: ns, Identity: resources.Identity{PrincipalID: binding.PrincipalID, Generation: binding.Generation}, Request: body}
	for _, r := range h.lookup.Chain.Records {
		h.envelope.History = append(h.envelope.History, json.RawMessage(r.Payload))
	}
	// Validate size and framing before reserving any persistent attempt.
	h.envelope.AttemptID = "pending"
	if err = h.envelope.Validate(); err != nil {
		return err
	}
	attempt, err := c.g.d.HelperHistory.Reserve(ctx, core.HelperHistoryReservation{Owner: c.resourceOwner(), Binding: binding, RequestID: c.rid, RequestDigest: digest, Namespace: ns, PriorPrefixes: h.prefixes, ReserveBytes: wire.MaxPayloadBytes})
	if err != nil {
		return err
	}
	h.attempt = attempt
	h.envelope.AttemptID = attempt.ID
	raw, err := json.Marshal(h.envelope)
	if err != nil || len(raw) > wire.MaxEnvelopeBytes {
		_ = c.g.d.HelperHistory.Abort(context.WithoutCancel(ctx), c.resourceOwner(), attempt.ID)
		return fmt.Errorf("helper request envelope exceeds transport bound")
	}
	if err = c.g.d.HelperHistory.MarkDispatched(ctx, c.resourceOwner(), attempt.ID); err != nil {
		_ = c.g.d.HelperHistory.Abort(context.WithoutCancel(ctx), c.resourceOwner(), attempt.ID)
		return err
	}
	h.dispatched = true
	h.rt = rt
	h.held = newHelperResponseWriter(c.c.Writer)
	c.c.Writer = h.held
	req.Body = io.NopCloser(bytes.NewReader(raw))
	req.ContentLength = int64(len(raw))
	req.GetBody = nil
	req.Header.Del("Content-Length")
	req.Header.Del("Content-Encoding")
	req.Header.Set(wire.Header, "1")
	req.Header.Set("Content-Type", wire.ContentType)
	return nil
}

func (c *call) helperRuntimeFailure(err error) error {
	h := c.helperHistory
	var typed *core.Error
	errors.As(err, &typed)
	if h != nil && h.lookup.State == core.HelperHistoryUnknown && h.attempt.ID == "" && !h.dispatched && typed != nil && typed.Code == core.ErrUnsupported.Code {
		return &resourceEligibilityError{err}
	}
	if typed != nil && typed.Code == core.ErrUnsupported.Code {
		return err
	}
	return core.ErrUnavailable.WithMessage("helper history runtime verification unavailable").WithCause(err)
}

func (g *Gateway) helperHistoryRuntime(ctx context.Context, accountID int64, model string) (string, core.ResourceBinding, error) {
	var binding core.ResourceBinding
	if g.d.CCGateway == nil || g.d.ResourceTransport == nil {
		return "", binding, fmt.Errorf("helper history runtime unavailable")
	}
	caps, err := g.d.CCGateway.WorkerCapabilities(ctx, accountID)
	if err != nil {
		return "", binding, err
	}
	cfg, err := g.d.CCGateway.Load(ctx)
	if err != nil {
		return "", binding, err
	}
	policy, err := json.Marshal(cfg.EffectiveRequestPolicy())
	if err != nil {
		return "", binding, err
	}
	ns, err := helperRuntimeNamespace(caps, model, policy)
	if err != nil {
		return "", binding, err
	}
	binding, err = g.d.ResourceTransport.Identity(ctx, accountID)
	return ns, binding, err
}
