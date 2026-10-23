package ccgateway

import (
	"log/slog"
	"sort"
	"strings"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// A stored policy outlives the vocabulary that validated it: when the
// console's choices narrow (the injection tools went from 20 to 7 on
// 2026-10-23), what was saved under the old vocabulary must still load.
// Decoding therefore reads the structure only (FeatureOverrides.UnmarshalJSON,
// RequestPolicy.UnmarshalJSON); saving validates strictly (mergeConfig,
// SaveAccountFeaturePolicyTx, the preview); and resolving drops what the
// current vocabulary does not know, with one warning per item, so a stale
// group or account override never takes every CCGateway request down (audit
// A3, 2026-10-23).

// sanitizePolicy drops the items of p the current vocabulary does not know and
// names them. Maps are replaced, never edited in place: the stored value stays
// as it was.
func sanitizePolicy(p *RequestPolicy) []string {
	var dropped []string
	if p.Level != "" && features.ValidateRequestLevel(p.Level) != nil {
		dropped = append(dropped, "level="+p.Level)
		p.Level = ""
	}
	if p.BuildBillingEntrypoint != "" && features.ValidateBillingEntrypoint(p.BuildBillingEntrypoint) != nil {
		dropped = append(dropped, "build_billing_entrypoint="+p.BuildBillingEntrypoint)
		p.BuildBillingEntrypoint = ""
	}
	p.BuildAttachmentSources, dropped = keepValid(p.BuildAttachmentSources, "build_attachment_sources", features.BuildAttachmentSources.Validate, dropped)
	p.BuildBillingSources, dropped = keepValid(p.BuildBillingSources, "build_billing_sources", features.BuildBillingSources.Validate, dropped)
	p.BuildInjection, dropped = keepValidInjection(p.BuildInjection, dropped)
	return dropped
}

// sanitizeOverrides is sanitizePolicy for one layer's overrides. The identity
// lines and sources are not resolved (ResolveFeaturePolicy), so whatever an
// override stored for them is left alone.
func sanitizeOverrides(o *FeatureOverrides) []string {
	var dropped []string
	if o.Level != nil && features.ValidateRequestLevel(*o.Level) != nil {
		dropped = append(dropped, "level="+*o.Level)
		o.Level = nil
	}
	if o.BuildBillingEntrypoint != nil && features.ValidateBillingEntrypoint(*o.BuildBillingEntrypoint) != nil {
		dropped = append(dropped, "build_billing_entrypoint="+*o.BuildBillingEntrypoint)
		o.BuildBillingEntrypoint = nil
	}
	o.BuildAttachmentSources, dropped = keepValid(o.BuildAttachmentSources, "build_attachment_sources", features.BuildAttachmentSources.Validate, dropped)
	o.BuildBillingSources, dropped = keepValid(o.BuildBillingSources, "build_billing_sources", features.BuildBillingSources.Validate, dropped)
	o.BuildInjection, dropped = keepValidInjection(o.BuildInjection, dropped)
	return dropped
}

// keepValid returns the entries of m that validate on their own (a new map;
// nil stays nil) and appends the others to dropped as "name.key=value".
func keepValid[M ~map[string]string](m M, name string, valid func(M) error, dropped []string) (M, []string) {
	if m == nil {
		return nil, dropped
	}
	out := make(M, len(m))
	for k, v := range m {
		if valid(M{k: v}) != nil {
			dropped = append(dropped, name+"."+k+"="+v)
			continue
		}
		out[k] = v
	}
	return out, dropped
}

// keepValidInjection drops the attachments and tools the vocabulary does not
// name; the result is a copy.
func keepValidInjection(in *features.BuildInjection, dropped []string) (*features.BuildInjection, []string) {
	if in == nil {
		return nil, dropped
	}
	out := in.Merge(nil)
	for _, list := range []struct {
		name string
		set  map[string]bool
		item func(string) *features.BuildInjection
	}{
		{"attachments", out.Attachments, func(k string) *features.BuildInjection {
			return &features.BuildInjection{Attachments: map[string]bool{k: true}}
		}},
		{"tools", out.Tools, func(k string) *features.BuildInjection {
			return &features.BuildInjection{Tools: map[string]bool{k: true}}
		}},
	} {
		for k := range list.set {
			if list.item(k).Validate() != nil {
				dropped = append(dropped, "build_injection."+list.name+"."+k)
				delete(list.set, k)
			}
		}
	}
	return out, dropped
}

// droppedWarned keeps each (layer, item) to one warning per process: the
// policy is resolved on every request.
var droppedWarned sync.Map

func warnDropped(layer string, dropped []string) {
	if len(dropped) == 0 {
		return
	}
	sort.Strings(dropped)
	key := layer + ":" + strings.Join(dropped, ",")
	if _, seen := droppedWarned.LoadOrStore(key, true); seen {
		return
	}
	slog.Warn("CCGateway: a stored CC feature setting is no longer a choice and is ignored; save the policy again to clear it", "layer", layer, "ignored", dropped)
}
