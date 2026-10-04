package core

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// RequestPrecharger owns money reserved before any upstream traffic.
type RequestPrecharger interface {
	PreConsumeTokens(context.Context) (int64, error)
	Precharge(context.Context, *UsageRecord) error
}

// PrechargeReleaser is implemented by the ledger. Release and final billing
// share the usage transaction, so final settlement never charges twice.
type PrechargeReleaser interface {
	ReleasePrechargeTx(context.Context, pgx.Tx, int64, string) (*LedgerResult, error)
	ReleaseExpiredPrecharges(context.Context) error
}
