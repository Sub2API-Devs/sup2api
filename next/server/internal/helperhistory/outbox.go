package helperhistory

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

const maxUsageBytes = 2 << 20

type usageEnvelope struct {
	Version int
	Record  *core.UsageRecord
}

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
	rows, e := s.db.Pool.Query(ctx, `SELECT request_id,attempt_id,user_id,group_id,digest,payload FROM provider_helper_usage_outbox ORDER BY created_at,request_id LIMIT $1`, limit)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []core.HelperHistoryUsage{}
	for rows.Next() {
		var v core.HelperHistoryUsage
		var owner core.ResourceOwner
		var encrypted []byte
		if e = rows.Scan(&v.RequestID, &v.AttemptID, &owner.UserID, &owner.GroupID, &v.Digest, &encrypted); e != nil {
			return nil, e
		}
		raw, e := s.cipher.Decrypt(encrypted, usageAAD(v.RequestID, v.AttemptID, v.Digest, owner))
		if e != nil || len(raw) > maxUsageBytes || wire.Digest(raw) != v.Digest {
			return nil, fmt.Errorf("helper usage integrity failure")
		}
		var envelope usageEnvelope
		decoder := json.NewDecoder(bytes.NewReader(raw))
		decoder.UseNumber()
		if decoder.Decode(&envelope) != nil || envelope.Version != 1 || envelope.Record == nil || envelope.Record.RequestID != v.RequestID || envelope.Record.UserID != owner.UserID || envelope.Record.GroupID != owner.GroupID {
			return nil, fmt.Errorf("helper usage envelope mismatch")
		}
		v.Record = envelope.Record
		out = append(out, v)
	}
	return out, rows.Err()
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
