package usage

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func (s *Service) releasePrechargeTx(ctx context.Context, tx pgx.Tx, userID int64, requestID string) (*core.LedgerResult, error) {
	if s.ledger == nil {
		return nil, errors.New("no ledger configured")
	}
	return s.ledger.ReleasePrechargeTx(ctx, tx, userID, requestID)
}
