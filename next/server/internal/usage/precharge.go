package usage

import (
	"context"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func (s *Service) releasePrechargeTx(ctx context.Context, tx pgx.Tx, userID int64, requestID string) (*core.LedgerResult, error) {
	if ledger, ok := s.ledger.(core.PrechargeReleaser); ok {
		return ledger.ReleasePrechargeTx(ctx, tx, userID, requestID)
	}
	return nil, nil
}
