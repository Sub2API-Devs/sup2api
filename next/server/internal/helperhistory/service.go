// Package helperhistory persists private, immutable helper-history chains.
package helperhistory

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

type Options struct {
	MaxRecords                    int
	MaxBytes                      int64
	Retention, TombstoneRetention time.Duration
}
type Service struct {
	db      *store.DB
	cipher  *secret.Cipher
	options Options
	now     func() time.Time
}

var _ core.HelperHistory = (*Service)(nil)

func New(db *store.DB, cipher *secret.Cipher, options Options) *Service {
	if options.MaxRecords <= 0 {
		options.MaxRecords = 4096
	}
	if options.MaxBytes <= 0 {
		options.MaxBytes = 256 << 20
	}
	if options.Retention <= 0 {
		options.Retention = 24 * time.Hour
	}
	if options.TombstoneRetention <= 0 {
		options.TombstoneRetention = 24 * time.Hour
	}
	return &Service{db: db, cipher: cipher, options: options, now: time.Now}
}
func identifier() (string, error) {
	var b [24]byte
	_, err := rand.Read(b[:])
	return hex.EncodeToString(b[:]), err
}
func validOwner(o core.ResourceOwner) bool { return o.UserID > 0 && o.GroupID > 0 }
func bounded(s string) bool                { return s != "" && len(s) <= 256 && !strings.ContainsAny(s, "\x00\r\n") }
func validBinding(b core.ResourceBinding) bool {
	return b.AccountID > 0 && bounded(b.PrincipalID) && bounded(b.Generation)
}
func lock(ctx context.Context, q store.Querier, o core.ResourceOwner) error {
	_, e := q.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, fmt.Sprintf("helper-history:%d:%d", o.UserID, o.GroupID))
	return e
}
func (s *Service) transaction(ctx context.Context, o core.ResourceOwner, fn func(pgx.Tx) error) error {
	if !validOwner(o) || s.db == nil || s.cipher == nil {
		return core.ErrInvalidArgument
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		if e := lock(ctx, tx, o); e != nil {
			return e
		}
		return fn(tx)
	})
}
func aad(o core.ResourceOwner, r core.HelperHistoryRecord, payloadDigest string) []byte {
	b, _ := json.Marshal([]any{"helper-history-v1", o, r.Receipt, r.ParentReceipt, r.PublicPrefixDigest, r.ChainDigest, r.Namespace, r.Binding, payloadDigest})
	return b
}
func chainDigest(parent string, b core.ResourceBinding, namespace, prefix, payloadDigest string) string {
	raw, _ := json.Marshal([]any{wire.Version, parent, b, namespace, prefix, payloadDigest})
	return wire.Digest(raw)
}
func (s *Service) clean(ctx context.Context, q store.Querier, o core.ResourceOwner, now time.Time) error {
	// Identity tombstones are never automatically evicted: a later identical
	// public prefix must not resurrect an old client with a different hidden chain.
	if _, e := q.Exec(ctx, `UPDATE provider_helper_records SET payload=NULL WHERE user_id=$1 AND group_id=$2 AND expires_at<=$3 AND payload IS NOT NULL`, o.UserID, o.GroupID, now); e != nil {
		return e
	}

	_, e := q.Exec(ctx, `DELETE FROM provider_helper_attempts WHERE user_id=$1 AND group_id=$2 AND expires_at<=$3`, o.UserID, o.GroupID, now.Add(-s.options.TombstoneRetention))
	return e
}
func (s *Service) quota(ctx context.Context, q store.Querier, o core.ResourceOwner, now time.Time, bytes int64) error {
	var count, size int64
	// Every live reservation can become both a record and an outbox entry.
	// Existing outbox rows are counted once; acknowledged frozen usage needs
	// no future outbox reservation. Abort retains only bounded identity metadata.
	e := q.QueryRow(ctx, `WITH owned_attempts AS (
 SELECT a.* FROM provider_helper_attempts a WHERE user_id=$1 AND group_id=$2 AND state!='committed'
 ) SELECT
 (SELECT count(*) FROM provider_helper_records WHERE user_id=$1 AND group_id=$2)+
 (SELECT count(*) FROM provider_helper_usage_outbox WHERE user_id=$1 AND group_id=$2)+
 (SELECT coalesce(sum(CASE WHEN state='aborted' THEN 1 WHEN usage_digest!='' THEN 1 ELSE 2 END),0) FROM owned_attempts),
 (SELECT coalesce(sum(payload_bytes),0) FROM provider_helper_records WHERE user_id=$1 AND group_id=$2 AND expires_at>$3)+
 (SELECT coalesce(sum(octet_length(payload)),0) FROM provider_helper_usage_outbox WHERE user_id=$1 AND group_id=$2)+
 (SELECT coalesce(sum(CASE WHEN state='aborted' THEN 0 ELSE
 CASE WHEN expires_at>$3 THEN reserved_bytes+$4 ELSE 0 END+
 CASE WHEN usage_digest='' THEN $5 ELSE 0 END END),0) FROM owned_attempts)`, o.UserID, o.GroupID, now, 64, maxUsageBytes+64).Scan(&count, &size)
	if e != nil {
		return e
	}
	if count+2 > int64(s.options.MaxRecords) || bytes+64+maxUsageBytes+64 > s.options.MaxBytes-size {
		return core.ErrRateLimited.WithMessage("helper history capacity exhausted")
	}
	return nil
}

// ExpirePayloads clears expired content without deleting the identity tombstone.
// The host maintenance loop must call this even when no new requests arrive.
func (s *Service) ExpirePayloads(ctx context.Context) error {
	if s.db == nil {
		return core.ErrInvalidArgument
	}
	_, err := s.db.Pool.Exec(ctx, `UPDATE provider_helper_records SET payload=NULL WHERE expires_at<=$1 AND payload IS NOT NULL`, s.now())
	return err
}
