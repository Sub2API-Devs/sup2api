package protocol

// Environment variable keys (CONTRACTS §73.3). The core declares them;
// plugins read the resolved values from RequestMeta.environment or
// HostService.GetEnvironment.
const (
	EnvVarRelayTimeoutSeconds          = "relay_timeout_seconds"
	EnvVarResponseHeaderTimeoutSeconds = "response_header_timeout_seconds"
	EnvVarStreamingIdleTimeoutSeconds  = "streaming_idle_timeout_seconds"
	EnvVarMaxRequestBodyMB             = "max_request_body_mb"
	EnvVarTaskTimeoutMinutes           = "task_timeout_minutes"
	EnvVarTaskPollMaxFailures          = "task_poll_max_failures"
)
