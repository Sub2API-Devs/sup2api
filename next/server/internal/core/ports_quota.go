package core

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

type AccountModelAvailabilityPlugin interface {
	CheckModelAvailability(context.Context, *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error)
}

type AccountQuotaRuntime interface {
	QueryAccountQuota(context.Context, int64, string) (*pluginv1.ParseQuotaResponseRequest, error)
}

type AccountQuotaSource interface {
	AccountQuotaSnapshots(context.Context, []int64) (map[int64]*pluginv1.AccountQuotaSnapshot, error)
	// AccountQuotaView is the request-path read of the model availability
	// precheck (MODEL-AVAILABILITY-PRECHECK-DESIGN §4.3): it says which
	// snapshots are stale and which could not be read in time, instead of
	// failing the whole read.
	AccountQuotaView(context.Context, []int64) (QuotaView, error)
	ApplyAccountQuotaObservation(context.Context, int64, int64, *pluginv1.QuotaResult) error
}

// QuotaView is a read of account quota snapshots for a set of ids.
type QuotaView struct {
	// Snapshots holds the snapshot of each id that has one. The values are
	// shared and read-only: clone before modifying.
	Snapshots map[int64]*pluginv1.AccountQuotaSnapshot
	// Stale marks ids whose snapshot was invalidated and not yet read again
	// in time: the value predates the last change of the account.
	Stale map[int64]bool
	// Missing lists ids nothing could be read for in time (no cached value
	// and the read did not finish). An id absent from Snapshots and Missing
	// has no snapshot row.
	Missing []int64
}
