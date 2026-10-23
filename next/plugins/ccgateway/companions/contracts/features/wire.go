package features

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
)

// PolicyHeader carries a request's policy from the core to the Worker.
const PolicyHeader = "X-CCGateway-Request-Policy"

// MaxPolicyHeaderBytes bounds the header value the Worker reads.
const MaxPolicyHeaderBytes = 16384

var cliVersionPattern = regexp.MustCompile(`^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$`)

// WorkerPolicy is the request policy on the wire (PolicyHeader): exactly what
// the Worker reads, nothing the core only stores (2026-10-23 audit A1/C4).
// The core builds it from the resolved policy (its workerPolicy), the Worker
// decodes it with ParseWorkerPolicy, and contracts/testdata/core-worker-
// policies.json holds the core's output for the editor cases so the Worker's
// tests read the same bytes.
//
// The level is not sent: it decides RelayMode (none is direct) and which
// layers go along (none: billing; low: plus attachments and the attachments
// added; high: plus the system prompt and tools). Sources at their default
// (client) are left out, as is the default entrypoint (sdk-cli), so a policy
// that changes nothing asks nothing of the Worker.
type WorkerPolicy struct {
	SchemaVersion int `json:"schema_version"`
	// RelayMode is build or direct.
	RelayMode string `json:"relay_mode"`
	// CLIVersion is the Claude Code version the Worker must run.
	CLIVersion             string                 `json:"cli_version"`
	BuildBillingSources    BuildBillingSources    `json:"build_billing_sources,omitempty"`
	BuildBillingEntrypoint string                 `json:"build_billing_entrypoint,omitempty"`
	BuildAttachmentSources BuildAttachmentSources `json:"build_attachment_sources,omitempty"`
	// BuildInjection is what the level adds to a request without a billing
	// header, only the items added (BuildInjection.Effective); nil adds nothing.
	BuildInjection *BuildInjection `json:"build_injection,omitempty"`
}

// Validate checks every field's vocabulary. The core always names the relay
// mode and CLI version; a value the Worker reads without them (the CLI run by
// hand, a test) means its own.
func (p WorkerPolicy) Validate() error {
	if p.SchemaVersion != 0 && p.SchemaVersion != PolicySchemaVersion {
		return errors.New("unsupported request policy schema_version")
	}
	if p.RelayMode != "" && p.RelayMode != "build" && p.RelayMode != "direct" {
		return errors.New("invalid relay_mode: must be build or direct")
	}
	if p.CLIVersion != "" && !cliVersionPattern.MatchString(p.CLIVersion) {
		return errors.New("invalid cli_version")
	}
	if err := p.BuildBillingSources.Validate(); err != nil {
		return err
	}
	if err := ValidateBillingEntrypoint(p.BuildBillingEntrypoint); err != nil {
		return err
	}
	if err := p.BuildAttachmentSources.Validate(); err != nil {
		return err
	}
	return p.BuildInjection.Validate()
}

// ParseWorkerPolicy decodes and validates a header value. Keys this version
// does not know are ignored, not refused: the Worker is updated before its
// core (plugin first, then core), so an older core's extra keys must keep
// serving requests. What the core sends is pinned by the fixture instead.
func ParseWorkerPolicy(raw []byte) (WorkerPolicy, error) {
	var out WorkerPolicy
	if len(raw) > MaxPolicyHeaderBytes {
		return out, fmt.Errorf("request policy exceeds %d bytes", MaxPolicyHeaderBytes)
	}
	if err := ValidatePolicySchemaJSON(raw); err != nil {
		return out, err
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return out, err
	}
	return out, out.Validate()
}

// CLIPolicy is the requestPolicy of the build envelope the Worker writes for
// the CLI (contract 2, cli-mods request-policy.js validateRequestPolicy): the
// content and billing choices alone. The relay mode and CLI version are the
// Worker's to check; the identity context travels in its own variable.
type CLIPolicy struct {
	ContractVersion        int                    `json:"contract_version"`
	BuildAttachmentSources BuildAttachmentSources `json:"build_attachment_sources,omitempty"`
	BuildBillingSources    BuildBillingSources    `json:"build_billing_sources,omitempty"`
	BuildBillingEntrypoint string                 `json:"build_billing_entrypoint,omitempty"`
	BuildInjection         *BuildInjection        `json:"build_injection,omitempty"`
}

// CLIContractVersion is the build envelope contract the CLI accepts.
const CLIContractVersion = 2

// CLI is the envelope policy for p; the injection is reduced to what is added.
func (p WorkerPolicy) CLI() CLIPolicy {
	return CLIPolicy{ContractVersion: CLIContractVersion, BuildAttachmentSources: p.BuildAttachmentSources, BuildBillingSources: p.BuildBillingSources,
		BuildBillingEntrypoint: p.BuildBillingEntrypoint, BuildInjection: p.BuildInjection.Effective()}
}
