package leaselifecycle

import (
	"errors"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestRenewalDelayApproachesExpiryWithoutExceedingIt(t *testing.T) {
	now := time.Now()
	if got := RenewalDelay(30*time.Second, now.Add(time.Minute), now); got != 30*time.Second {
		t.Fatalf("initial delay = %v", got)
	}
	if got := RenewalDelay(30*time.Second, now.Add(10*time.Second), now); got != 5*time.Second {
		t.Fatalf("short lease delay = %v", got)
	}
	if got := RenewalDelay(time.Second, now.Add(-time.Second), now); got != 0 {
		t.Fatalf("expired delay = %v", got)
	}
}

func TestTerminalRPCErrorSeparatesAuthorityFromAvailability(t *testing.T) {
	if !TerminalRPCError(status.Error(codes.PermissionDenied, "wrong owner")) || !TerminalRPCError(status.Error(codes.NotFound, "expired")) {
		t.Fatal("authoritative lease rejection was treated as transient")
	}
	if TerminalRPCError(status.Error(codes.Unavailable, "retry")) || TerminalRPCError(errors.New("network failure")) {
		t.Fatal("transient renewal failure was treated as terminal")
	}
}
