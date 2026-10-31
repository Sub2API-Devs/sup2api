package observation

import (
	"regexp"
	"slices"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

const (
	Capability             = "gateway.observe.v1"
	Permission             = "gateway.observe"
	AttemptStarted         = "attempt_started"
	AttemptFinished        = "attempt_finished"
	ResponseStarted        = "response_started"
	FirstStreamEvent       = "first_stream_event"
	Completed              = "completed"
	UsageFinalized         = "usage_finalized"
	CoreNamespace          = "core.account"
	SuccessRequests        = "success_requests"
	SuccessTokens          = "success_tokens"
	PendingUsage           = "pending_usage"
	FailedRequests         = "failed_requests"
	MaxBatch               = 64
	MaxMetrics             = 16
	MaxValue         int64 = 1<<53 - 1
	MaxWindow              = 3600
)

// CoreMetrics are the core's own account metrics (namespace CoreNamespace),
// in the order the core reads them back.
var CoreMetrics = []string{SuccessRequests, SuccessTokens, PendingUsage, FailedRequests}

var metricKey = regexp.MustCompile(`^[a-z][a-z0-9_]{0,47}$`)

func ValidMetric(name string) bool { return metricKey.MatchString(name) }

func ValidPhase(phase string) bool {
	switch phase {
	case AttemptStarted, AttemptFinished, ResponseStarted, FirstStreamEvent, Completed, UsageFinalized:
		return true
	}
	return false
}

func PluginNamespace(key string) string { return "plugin." + key }

// AttemptOutcome classifies a finished attempt for an account's error rate,
// the one rule the core's success rate (CONTRACTS §73.1) and dynweight
// (§74.5) share. counted is false for what the account is not judged by:
// events other than attempt_finished, client cancellations and local
// failures (§74.1). status is the upstream's HTTP status of a failed
// attempt, never the status the client got (a plugin may map it); 0 when the
// upstream sent no response (connection failure, timeout).
func AttemptOutcome(o *pluginv1.RequestObservation) (counted, failed bool, status int) {
	if o.GetPhase() != AttemptFinished || o.GetCanceled() || o.GetLocalFailure() {
		return false, false, 0
	}
	if o.GetSuccess() {
		return true, false, 0
	}
	if code := int(o.GetUpstreamStatusCode()); code >= 100 && code <= 599 {
		status = code
	}
	return true, true, status
}

// AccountFailure reports whether a finished attempt counts as a failure of
// its account: counted, failed, and its upstream status not exempt. A
// failure without an upstream response (status 0) is never exempt.
func AccountFailure(o *pluginv1.RequestObservation, exempt ...int) bool {
	counted, failed, status := AttemptOutcome(o)
	return counted && failed && (status == 0 || !slices.Contains(exempt, status))
}
