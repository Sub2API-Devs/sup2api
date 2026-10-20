package engine

import (
	"encoding/json"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

const requestContentDiagnosticPrefix = "CCG_CONTENT_DIAGNOSTIC "

// Only low-cardinality identifiers cross the CLI stderr boundary. In
// particular path, before/after text, environment values and credentials
// are never copied from diagnostics into logs.
func (p *requestErrorReader) acceptContentDiagnostic(raw []byte) {
	if len(raw) > 8192 || p.diagnosticCount >= 128 {
		return
	}
	var frame struct {
		Protocol string `json:"protocol"`
		Field    string `json:"field"`
		Status   string `json:"status"`
		Carrier  string `json:"carrier"`
	}
	if json.Unmarshal(raw, &frame) != nil || frame.Protocol != "ccgateway.content.diagnostic.v1" {
		return
	}
	if !slices.Contains(features.BuildAttachmentFields, frame.Field) && frame.Field != "cc_version" && frame.Field != "cc_entrypoint" {
		return
	}
	if !slices.Contains([]string{"not_found", "unsupported_format", "ambiguous", "unchanged", "replaced", "inserted", "erased", "removed_server_absent", "missing_baseline", "unavailable", "source_unavailable"}, frame.Status) {
		return
	}
	if !slices.Contains([]string{"system", "user", "message_system", "request", ""}, frame.Carrier) {
		return
	}
	p.diagnosticCount++
	if p.diagnostic != nil {
		p.diagnostic.trace("build_content_policy", Object{"field": frame.Field, "status": frame.Status, "carrier": frame.Carrier})
	}
}
