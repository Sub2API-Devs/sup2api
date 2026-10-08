package usage

import (
	"bytes"
	"context"
	"errors"
	"fmt"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

// PersistUsage returns only after usage_logs and its billing-pending state have
// committed. Unlike Submit, it is suitable for acknowledging a durable outbox.
// Billing can finish later through the existing retry loop.
func (s *Service) PersistHelperUsage(ctx context.Context, rec *core.UsageRecord, frozen []byte, digest string) error {
	if rec == nil || rec.RequestID == "" || len(rec.RequestID) > 64 {
		return fmt.Errorf("invalid durable usage identity")
	}
	original, actual, err := core.DecodeHelperHistoryUsage(frozen)
	if err != nil || digest != actual {
		return fmt.Errorf("durable usage digest mismatch")
	}
	left, _, err := core.HelperHistoryUsageBytes(original)
	if err != nil {
		return err
	}
	right, _, err := core.HelperHistoryUsageBytes(rec)
	if err != nil || !bytes.Equal(left, right) {
		return fmt.Errorf("durable usage record differs from frozen envelope")
	}
	known := false
	before := func(tx pgx.Tx) error {
		known = false
		if _, e := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "helper-usage:"+rec.RequestID); e != nil {
			return e
		}
		var old string
		e := tx.QueryRow(ctx, `SELECT digest FROM provider_helper_usage_receipts WHERE request_id=$1 FOR UPDATE`, rec.RequestID).Scan(&old)
		if e != nil && !store.IsNoRows(e) {
			return e
		}
		known = e == nil
		if known && old != digest {
			return fmt.Errorf("durable usage receipt conflict")
		}
		var usageID int64
		e = tx.QueryRow(ctx, `SELECT id FROM usage_logs WHERE request_id=$1 FOR UPDATE`, rec.RequestID).Scan(&usageID)
		if e != nil && !store.IsNoRows(e) {
			return e
		}
		if known != (e == nil) {
			return fmt.Errorf("durable usage receipt and row disagree")
		}
		return nil
	}
	after := func(tx pgx.Tx, inserted map[string]int64) error {
		if known {
			return nil
		}
		if inserted[rec.RequestID] == 0 {
			return fmt.Errorf("durable usage raced with another source")
		}
		_, e := tx.Exec(ctx, `INSERT INTO provider_helper_usage_receipts(request_id,digest) VALUES($1,$2)`, rec.RequestID, digest)
		return e
	}
	_, err = s.insertAtomic(ctx, []*core.UsageRecord{rec}, before, after, false)
	return err
}

type helperUsageOutbox interface {
	PendingUsage(context.Context, int) ([]core.HelperHistoryUsage, error)
	AckUsage(context.Context, string, string) error
	DeferUsage(context.Context, string, string) error
}

// DrainHelperHistoryUsage does not claim exactly-once delivery. Replays after a
// crash between persistence and acknowledgement use usage_logs.request_id's
// unique constraint and cannot charge the same request a second time.
func (s *Service) DrainHelperHistoryUsage(ctx context.Context, outbox helperUsageOutbox) error {
	return drainHelperUsage(ctx, outbox, s.PersistHelperUsage)
}

func drainHelperUsage(ctx context.Context, outbox helperUsageOutbox, persist func(context.Context, *core.UsageRecord, []byte, string) error) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	batch, err := outbox.PendingUsage(ctx, 64)
	if err != nil {
		return err
	}
	var failures []error
	for _, item := range batch {
		if err := ctx.Err(); err != nil {
			return errors.Join(append(failures, err)...)
		}
		var failure error
		if item.Record == nil || item.RequestID == "" || item.Record.RequestID != item.RequestID || item.Digest == "" {
			failure = fmt.Errorf("invalid helper usage outbox identity")
		} else {
			failure = persist(ctx, item.Record, item.FrozenEnvelope, item.Digest)
			if failure == nil && ctx.Err() == nil {
				failure = outbox.AckUsage(ctx, item.RequestID, item.Digest)
			}
		}
		if err := ctx.Err(); err != nil {
			return errors.Join(append(failures, err)...)
		}
		if failure != nil {
			failures = append(failures, failure)
			// Keep the immutable record, but let later due entries progress.
			// Delay is persisted, not an in-memory skip lost on the next node.
			if err := outbox.DeferUsage(ctx, item.RequestID, item.Digest); err != nil {
				failures = append(failures, err)
			}
		}
	}
	if err := ctx.Err(); err != nil {
		failures = append(failures, err)
	}
	return errors.Join(failures...)
}
