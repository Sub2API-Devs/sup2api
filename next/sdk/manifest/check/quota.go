package check

import (
	"fmt"
	"regexp"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

var (
	// quotaKeyRe is the shape of a quota window key ("5h", "7d_fable").
	quotaKeyRe = regexp.MustCompile(`^[a-z0-9][a-z0-9_]{0,31}$`)
	// headerNameRe is an HTTP field name (RFC 9110 token), at most 100 bytes.
	headerNameRe = regexp.MustCompile("^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,100}$")
)

// quota validates accountTypes[].quota (CONTRACTS §44): at least one header
// window or query, distinct well-formed window keys, every window naming at
// least one header, valid header names and known units and formats.
func (v *validator) quota(f string, q *manifest.AccountQuota) {
	if q == nil {
		return
	}
	f += ".quota"
	if !q.Supported() {
		v.add(f, "required", "quota must declare headers or query")
		return
	}
	if len(q.Headers) > manifest.MaxQuotaHeaders {
		v.add(f+".headers", "too_many", "at most %d quota windows", manifest.MaxQuotaHeaders)
	}
	keys := map[string]bool{}
	for i, h := range q.Headers {
		hf := fmt.Sprintf("%s.headers[%d]", f, i)
		switch {
		case h.Key == "":
			v.add(hf+".key", "required", "key is required")
		case !quotaKeyRe.MatchString(h.Key):
			v.add(hf+".key", "invalid_format", "key %q must match %s", h.Key, quotaKeyRe.String())
		case keys[h.Key]:
			v.add(hf+".key", "duplicate", "window %q declared twice", h.Key)
		}
		keys[h.Key] = true
		if h.Utilization == "" && h.Reset == "" && h.Status == "" {
			v.add(hf, "required", "at least one of utilization, reset and status is required")
		}
		for name, value := range map[string]string{"utilization": h.Utilization, "reset": h.Reset, "status": h.Status} {
			if value != "" && !headerNameRe.MatchString(value) {
				v.add(hf+"."+name, "invalid_format", "%q is not an HTTP header name", value)
			}
		}
		switch h.UtilizationUnit {
		case "", manifest.QuotaUnitRatio, manifest.QuotaUnitPercent:
			if h.UtilizationUnit != "" && h.Utilization == "" {
				v.add(hf+".utilizationUnit", "unexpected", "utilizationUnit needs utilization")
			}
		default:
			v.add(hf+".utilizationUnit", "invalid", "utilizationUnit must be %q or %q", manifest.QuotaUnitRatio, manifest.QuotaUnitPercent)
		}
		switch h.ResetFormat {
		case "", manifest.QuotaResetUnix, manifest.QuotaResetRFC3339, manifest.QuotaResetDelta:
			if h.ResetFormat != "" && h.Reset == "" {
				v.add(hf+".resetFormat", "unexpected", "resetFormat needs reset")
			}
		default:
			v.add(hf+".resetFormat", "invalid", "resetFormat must be %q, %q or %q",
				manifest.QuotaResetUnix, manifest.QuotaResetRFC3339, manifest.QuotaResetDelta)
		}
	}
}
