package observation

import "regexp"

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
