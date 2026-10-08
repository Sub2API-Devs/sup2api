package core

import (
	"context"
	"time"
)

// HelperHistoryReservation is created by the core, never by a public client.
// PriorPrefixes contains every previously delivered assistant boundary in order.
type HelperHistoryReservation struct {
	Owner                               ResourceOwner
	Binding                             ResourceBinding
	RequestID, RequestDigest, Namespace string
	PriorPrefixes                       []string
	ReserveBytes                        int64
}
type HelperHistoryAttempt struct {
	ID, ParentReceipt, State string
	Binding                  ResourceBinding
	ExpiresAt                time.Time
}
type HelperHistoryCompletion struct {
	Usage              *UsageRecord // frozen core-produced usage, atomically persisted with receipt
	PublicPrefixDigest string
	Payload            []byte // private helperhistory.Payload; no credentials
}
type HelperHistoryRecord struct {
	Receipt, ParentReceipt, PublicPrefixDigest, ChainDigest, Namespace string
	Binding                                                            ResourceBinding
	Payload                                                            []byte
	ExpiresAt                                                          time.Time
}
type HelperHistoryChain struct {
	Records []HelperHistoryRecord
	Binding ResourceBinding
}

type HelperHistoryUsage struct {
	AttemptID, RequestID, Digest string
	Record                       *UsageRecord
}

type HelperHistory interface {
	Reserve(context.Context, HelperHistoryReservation) (HelperHistoryAttempt, error)
	MarkDispatched(context.Context, ResourceOwner, string) error
	// Commit may durably retain ambiguity evidence and usage before returning an error.
	// On error, always use PersistUncertainUsage with the final failure record;
	// never infer transaction success from a nonempty returned record.
	Commit(context.Context, ResourceOwner, string, HelperHistoryCompletion) (HelperHistoryRecord, error)
	Resolve(context.Context, ResourceOwner, []string, string) (HelperHistoryChain, error)
	MarkUncertain(context.Context, ResourceOwner, string) error
	PersistUncertainUsage(context.Context, ResourceOwner, string, *UsageRecord) error
	PendingUsage(context.Context, int) ([]HelperHistoryUsage, error)
	AckUsage(context.Context, string, string) error
	ExpirePayloads(context.Context) error
	Abort(context.Context, ResourceOwner, string) error
}

// HelperHistoryStorageFailure freezes the public storage-failure outcome while
// preserving every actual provider usage and pricing input. Callers must stop
// mutating the returned record before passing it to the durable outbox.
func HelperHistoryStorageFailure(r *UsageRecord) *UsageRecord {
	if r == nil {
		return nil
	}
	copy := *r
	copy.StatusCode = 503
	copy.Success = false
	copy.ErrorType = "gateway_helper_history_storage"
	copy.ErrorMessage = "helper history could not be durably committed"
	return &copy
}
