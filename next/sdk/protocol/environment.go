package protocol

// Environment variable keys (CONTRACTS §73.3). The core declares them;
// plugins read the resolved values from RequestMeta.environment or
// HostService.GetEnvironment.
const (
	EnvRelayTimeoutSeconds          = "relay_timeout_seconds"
	EnvResponseHeaderTimeoutSeconds = "response_header_timeout_seconds"
	EnvStreamingIdleTimeoutSeconds  = "streaming_idle_timeout_seconds"
	EnvMaxRequestBodyMB             = "max_request_body_mb"
	EnvTaskTimeoutMinutes           = "task_timeout_minutes"
	EnvTaskPollMaxFailures          = "task_poll_max_failures"
)
