// Package messagediagnostics stores bounded, owner-scoped response correlation.
package messagediagnostics

import (
	"context"
	"encoding/hex"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
	"strings"
	"time"
)

type Service struct {
	db        *store.DB
	limit     int
	retention time.Duration
}

func New(db *store.DB, limit int, retention time.Duration) *Service {
	if limit <= 0 {
		limit = 4096
	}
	if retention <= 0 {
		retention = 24 * time.Hour
	}
	return &Service{db, limit, retention}
}

var _ core.MessageDiagnostics = (*Service)(nil)

func validHash(s string) bool {
	b, e := hex.DecodeString(s)
	return e == nil && len(b) == 32 && s == strings.ToLower(s)
}
func bounded(s string) bool { return s != "" && len(s) <= 256 && !strings.ContainsAny(s, "\x00\r\n") }

const columns = `id_hash,user_id,group_id,account_id,principal_id,generation,observed_at,retention_until`

func read(ctx context.Context, q store.Querier, hash string) (r core.DiagnosticMessage, err error) {
	err = q.QueryRow(ctx, `SELECT `+columns+` FROM provider_diagnostic_messages WHERE id_hash=$1`, hash).Scan(&r.IDHash, &r.Owner.UserID, &r.Owner.GroupID, &r.Binding.AccountID, &r.Binding.PrincipalID, &r.Binding.Generation, &r.ObservedAt, &r.RetentionUntil)
	return
}
func (s *Service) Record(ctx context.Context, in core.DiagnosticMessage) error {
	now := time.Now()
	if !validHash(in.IDHash) || in.Owner.UserID <= 0 || in.Owner.GroupID <= 0 || in.Binding.AccountID <= 0 || !bounded(in.Binding.PrincipalID) || !bounded(in.Binding.Generation) || in.ObservedAt.IsZero() || in.ObservedAt.After(now) {
		return core.ErrInvalidArgument
	}
	in.ObservedAt = in.ObservedAt.UTC().Truncate(time.Microsecond)
	in.RetentionUntil = in.ObservedAt.Add(s.retention)
	if !in.RetentionUntil.After(now) {
		return core.ErrInvalidArgument.WithMessage("diagnostics observation outside platform retention")
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		for _, key := range []string{fmt.Sprintf("diagnostics-owner:%d:%d", in.Owner.UserID, in.Owner.GroupID), "diagnostics-id:" + in.IDHash} {
			if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, key); err != nil {
				return err
			}
		}
		old, err := read(ctx, tx, in.IDHash)
		if err == nil {
			if !old.RetentionUntil.After(now) {
				return core.ErrNotFound.WithMessage("diagnostics response ownership expired")
			}
			if old.Owner != in.Owner || old.Binding != in.Binding {
				return core.ErrConflict.WithMessage("diagnostics response identity conflict")
			}
			return nil
		}
		if !store.IsNoRows(err) {
			return err
		}
		if _, err = tx.Exec(ctx, `DELETE FROM provider_diagnostic_messages WHERE user_id=$1 AND group_id=$2 AND retention_until<=now()`, in.Owner.UserID, in.Owner.GroupID); err != nil {
			return err
		}
		var count int
		if err = tx.QueryRow(ctx, `SELECT count(*) FROM provider_diagnostic_messages WHERE user_id=$1 AND group_id=$2`, in.Owner.UserID, in.Owner.GroupID).Scan(&count); err != nil {
			return err
		}
		if count >= s.limit {
			return core.ErrRateLimited.WithMessage("diagnostics ownership tracking capacity exceeded")
		}
		_, err = tx.Exec(ctx, `INSERT INTO provider_diagnostic_messages(`+columns+`) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, in.IDHash, in.Owner.UserID, in.Owner.GroupID, in.Binding.AccountID, in.Binding.PrincipalID, in.Binding.Generation, in.ObservedAt, in.RetentionUntil)
		return err
	})
}
func (s *Service) LookupOwned(ctx context.Context, owner core.ResourceOwner, hash string) (core.DiagnosticMessage, error) {
	if owner.UserID <= 0 || owner.GroupID <= 0 || !validHash(hash) {
		return core.DiagnosticMessage{}, core.ErrInvalidArgument
	}
	r, err := read(ctx, s.db.Pool, hash)
	if store.IsNoRows(err) || err == nil && (r.Owner != owner || !r.RetentionUntil.After(time.Now())) {
		return core.DiagnosticMessage{}, core.ErrNotFound
	}
	return r, err
}
