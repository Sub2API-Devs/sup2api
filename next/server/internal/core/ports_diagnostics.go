package core

import (
	"context"
	"time"
)

// DiagnosticMessage proves correlation ownership, not provider fingerprint retention.
type DiagnosticMessage struct {
	IDHash                     string
	Owner                      ResourceOwner
	Binding                    ResourceBinding
	ObservedAt, RetentionUntil time.Time
}
type MessageDiagnostics interface {
	Record(context.Context, DiagnosticMessage) error
	LookupOwned(context.Context, ResourceOwner, string) (DiagnosticMessage, error)
}
