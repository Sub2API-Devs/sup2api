package protocol

// Notification severities (CONTRACTS §73.4): NotifyRequest.severity as a
// sender sets it and DeliverNotificationRequest.severity as a channel gets it.
const (
	SeverityInfo     = "info"
	SeverityWarning  = "warning"
	SeverityCritical = "critical"
)
