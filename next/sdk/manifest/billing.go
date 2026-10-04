package manifest

import "slices"

// SupportsBillingType is an admission constraint, not a price supplied by a
// plugin. Video always requires an explicit declaration on a video submit.
func (e Endpoint) SupportsBillingType(kind string) bool {
	if e.Billing == "free" {
		return false
	}
	if kind == "video" && (!e.TaskSubmit() || e.Task.Kind != "video") {
		return false
	}
	return slices.Contains(e.BillingTypes, kind)
}
