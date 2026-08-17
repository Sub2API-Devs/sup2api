// Package leaselifecycle contains the shared fail-closed timing and RPC
// classification rules used by HTTP/SSE and Responses WebSocket leases.
package leaselifecycle

import (
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func RenewalDelay(interval time.Duration, expiresAt, now time.Time) time.Duration {
	if interval <= 0 {
		interval = 30 * time.Second
	}
	remaining := expiresAt.Sub(now)
	if remaining <= 0 {
		return 0
	}
	delay := interval
	if half := remaining / 2; half < delay {
		delay = half
	}
	floor := min(interval, 250*time.Millisecond)
	if delay < floor {
		delay = floor
	}
	if delay > remaining {
		delay = remaining
	}
	return delay
}

// TerminalRPCError distinguishes an authoritative rejection from a transient
// transport or availability failure. Terminal errors invalidate the local
// lease immediately instead of being retried until its prior expiry.
func TerminalRPCError(err error) bool {
	switch status.Code(err) {
	case codes.InvalidArgument, codes.NotFound, codes.PermissionDenied,
		codes.Unauthenticated, codes.FailedPrecondition, codes.Unimplemented:
		return true
	default:
		return false
	}
}
