package usage

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func (s *Service) releasePrechargeTx(ctx context.Context, tx pgx.Tx, userID int64, requestID string) (*core.LedgerResult, error) {
	if s.ledger == nil {
		return nil, errors.New("no ledger configured")
	}
	return s.ledger.ReleasePrechargeTx(ctx, tx, userID, requestID)
}

// settleLedgerTx releases the request's precharge and charges total (when
// positive) in one ledger batch. With no charge it returns the refund's
// result, or nil when there was no reservation.
func (s *Service) settleLedgerTx(ctx context.Context, tx pgx.Tx, userID int64, requestID string, total decimal.Decimal) (*core.LedgerResult, error) {
	if s.ledger == nil {
		return nil, errors.New("no ledger configured")
	}
	var charge *core.LedgerChange
	if total.Sign() > 0 {
		charge = &core.LedgerChange{UserID: userID, Amount: total, Credit: false, Kind: "usage",
			RefType: "usage", RefID: requestID, IdempotencyKey: "usage:" + requestID}
	}
	res, err := s.ledger.SettleTx(ctx, tx, userID, requestID, charge)
	if err != nil {
		return nil, fmt.Errorf("ledger: %w", err)
	}
	return res, nil
}
