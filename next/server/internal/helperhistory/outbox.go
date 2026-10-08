package helperhistory

import (
	"context"
	"encoding/json"
	"time"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

const maxUsageBytes = 2 << 20

func usageAAD(requestID, attemptID, digest string, o core.ResourceOwner) []byte {
	b, _ := json.Marshal([]any{"helper-usage-v1", requestID, attemptID, digest, o})
	return b
}
func freezeUsage(a attempt, r *core.UsageRecord) ([]byte, string, error) {
	if r == nil || r.RequestID != a.requestID || r.UserID != a.owner.UserID || r.GroupID != a.owner.GroupID || r.AccountID == nil || *r.AccountID != a.Binding.AccountID {
		return nil, "", core.ErrInvalidArgument.WithMessage("helper usage identity mismatch")
	}
	raw, digest, e := core.HelperHistoryUsageBytes(r)
	if e != nil || len(raw) > maxUsageBytes {
		return nil, "", core.ErrInvalidArgument.WithMessage("helper usage envelope invalid")
	}
	return raw, digest, nil
}
func (s *Service) saveUsage(ctx context.Context, q store.Querier, a attempt, r *core.UsageRecord) error {
	raw, digest, e := freezeUsage(a, r)
	if e != nil {
		return e
	}
	if a.usageDigest != "" {
		if a.usageDigest != digest {
			return core.ErrConflict.WithMessage("helper usage changed after freeze")
		}
		return nil
	}
	var old string
	e = q.QueryRow(ctx, `SELECT digest FROM provider_helper_usage_outbox WHERE request_id=$1`, a.requestID).Scan(&old)
	if e == nil {
		if old != digest {
			return core.ErrConflict.WithMessage("helper usage changed after freeze")
		}
		return nil
	}
	if !store.IsNoRows(e) {
		return e
	}
	encrypted, e := s.cipher.Encrypt(raw, usageAAD(a.requestID, a.ID, digest, a.owner))
	if e != nil {
		return e
	}
	if _, e = q.Exec(ctx, `UPDATE provider_helper_attempts SET usage_digest=$1 WHERE id=$2`, digest, a.ID); e != nil {
		return e
	}
	_, e = q.Exec(ctx, `INSERT INTO provider_helper_usage_outbox(request_id,attempt_id,user_id,group_id,digest,payload,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, a.requestID, a.ID, a.owner.UserID, a.owner.GroupID, digest, encrypted, s.now())
	return e
}
func (s *Service) PersistUncertainUsage(ctx context.Context, o core.ResourceOwner, id string, r *core.UsageRecord) error {
	return s.transaction(ctx, o, func(tx pgx.Tx) error {
		a, e := readAttempt(ctx, tx, o, id)
		if e != nil {
			return e
		}
		if a.State == "committed" {
			return s.saveUsage(ctx, tx, a, r)
		}
		if a.State != "dispatched" && a.State != "uncertain" {
			return core.ErrConflict
		}
		if e = s.saveUsage(ctx, tx, a, r); e != nil {
			return e
		}
		_, e = tx.Exec(ctx, `UPDATE provider_helper_attempts SET state='uncertain' WHERE id=$1`, id)
		return e
	})
}

// PendingUsage does not consume or lease entries. Consumers must persist by the
// existing usage request-ID unique key before acknowledgement; repeats are safe.
func (s *Service) PendingUsage(ctx context.Context, limit int) ([]core.HelperHistoryUsage, error) {
	if limit < 1 || limit > 100 || s.db == nil || s.cipher == nil {
		return nil, core.ErrInvalidArgument
	}
	rows, e := s.db.Pool.Query(ctx, `SELECT request_id,attempt_id,user_id,group_id,digest,payload FROM provider_helper_usage_outbox WHERE next_attempt_at<=$2 ORDER BY next_attempt_at,created_at,request_id LIMIT $1`, limit, s.now())
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []core.HelperHistoryUsage{}
	var invalid []struct{ id, digest, code string }
	for rows.Next() {
		var v core.HelperHistoryUsage
		var owner core.ResourceOwner
		var encrypted []byte
		if e = rows.Scan(&v.RequestID, &v.AttemptID, &owner.UserID, &owner.GroupID, &v.Digest, &encrypted); e != nil {
			return nil, e
		}
		raw, e := s.cipher.Decrypt(encrypted, usageAAD(v.RequestID, v.AttemptID, v.Digest, owner))
		if e != nil || len(raw) > maxUsageBytes || wire.Digest(raw) != v.Digest {
			invalid = append(invalid, struct{ id, digest, code string }{v.RequestID, v.Digest, "integrity"})
			continue
		}
		record, _, decodeErr := core.DecodeHelperHistoryUsage(raw)
		if decodeErr != nil || record.RequestID != v.RequestID || record.UserID != owner.UserID || record.GroupID != owner.GroupID {
			invalid = append(invalid, struct{ id, digest, code string }{v.RequestID, v.Digest, "envelope"})
			continue
		}
		v.Record = record
		v.FrozenEnvelope = append([]byte(nil), raw...)
		out = append(out, v)
	}
	err := rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	for _, item := range invalid {
		if err := s.deferUsage(ctx, item.id, item.digest, item.code); err != nil {
			return nil, err
		}
	}
	return out, nil
}

// DeferUsage retains the immutable evidence and frees the next batch to make
// progress. No error text, payload or credentials are persisted as diagnostics.
func (s *Service) DeferUsage(ctx context.Context, requestID, digest string) error {
	if !bounded(requestID) || !wire.ValidDigest(digest) {
		return core.ErrInvalidArgument
	}
	return s.deferUsage(ctx, requestID, digest, "delivery")
}

func (s *Service) deferUsage(ctx context.Context, requestID, digest, code string) error {
	// Internal callers use the exact stored identity, even when a corrupted
	// digest cannot pass the public delivery contract.
	if s.db == nil {
		return core.ErrInvalidArgument
	}
	_, err := s.db.Pool.Exec(ctx, `UPDATE provider_helper_usage_outbox SET next_attempt_at=GREATEST(next_attempt_at,$3),retry_count=LEAST(retry_count,2147483646)+1,failure_code=$4 WHERE request_id=$1 AND digest=$2`, requestID, digest, s.now().Add(time.Minute), code)
	return err
}
func (s *Service) AckUsage(ctx context.Context, requestID, digest string) error {
	if !bounded(requestID) || !wire.ValidDigest(digest) {
		return core.ErrInvalidArgument
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		var old string
		e := tx.QueryRow(ctx, `SELECT digest FROM provider_helper_usage_outbox WHERE request_id=$1 FOR UPDATE`, requestID).Scan(&old)
		if store.IsNoRows(e) {
			return nil
		}
		if e != nil {
			return e
		}
		if old != digest {
			return core.ErrConflict
		}
		_, e = tx.Exec(ctx, `DELETE FROM provider_helper_usage_outbox WHERE request_id=$1`, requestID)
		return e
	})
}
