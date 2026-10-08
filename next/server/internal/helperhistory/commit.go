package helperhistory

import (
	"context"
	"time"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

func (s *Service) Commit(ctx context.Context, o core.ResourceOwner, id string, in core.HelperHistoryCompletion) (out core.HelperHistoryRecord, err error) {
	if !bounded(id) || !wire.ValidDigest(in.PublicPrefixDigest) || wire.Validate(in.Payload) != nil {
		return out, core.ErrInvalidArgument
	}
	var committedConflict error
	err = s.transaction(ctx, o, func(tx pgx.Tx) error {
		now := s.now()
		a, e := readAttempt(ctx, tx, o, id)
		if e != nil {
			return e
		}
		if !a.ExpiresAt.After(now) {
			return core.ErrNotFound
		}
		payloadDigest := wire.Digest(in.Payload)
		if a.State == "committed" {
			old, d, e := readRecord(ctx, tx, o, id)
			if e != nil {
				return e
			}
			if old.PublicPrefixDigest != in.PublicPrefixDigest || d != payloadDigest {
				return core.ErrConflict
			}
			if _, e = prefixRecord(ctx, tx, o, a.namespace, in.PublicPrefixDigest, now); e != nil {
				return e
			}
			if e = s.saveUsage(ctx, tx, a, in.Usage); e != nil {
				return e
			}
			raw, e := s.cipher.Decrypt(old.Payload, aad(o, old, d))
			if e != nil {
				return e
			}
			old.Payload = raw
			out = old
			return nil
		}
		if a.State != "dispatched" && a.State != "uncertain" {
			return core.ErrConflict.WithMessage("helper history result has no dispatched attempt")
		}
		if int64(len(in.Payload)) > a.reservedBytes {
			return core.ErrRateLimited.WithMessage("helper history exceeded reserved capacity")
		}
		parentDigest := ""
		expiry := a.ExpiresAt
		if a.ParentReceipt != "" {
			chain, e := s.parentChain(ctx, tx, o, a.ParentReceipt, a.namespace, now)
			if e != nil {
				return e
			}
			totalBytes := len(in.Payload)
			for _, r := range chain.Records {
				totalBytes += len(r.Payload)
			}
			if totalBytes > wire.MaxPayloadBytes {
				return core.ErrRateLimited.WithMessage("helper chain exceeds restore capacity")
			}
			p := chain.Records[len(chain.Records)-1]
			if p.Binding != a.Binding {
				return core.ErrConflict
			}
			parentDigest = p.ChainDigest
			if p.ExpiresAt.Before(expiry) {
				expiry = p.ExpiresAt
			}
		}
		out = core.HelperHistoryRecord{Receipt: id, ParentReceipt: a.ParentReceipt, PublicPrefixDigest: in.PublicPrefixDigest, Namespace: a.namespace, Binding: a.Binding, ExpiresAt: expiry}
		out.ChainDigest = chainDigest(parentDigest, a.Binding, a.namespace, in.PublicPrefixDigest, payloadDigest)
		ciphertext, e := s.cipher.Encrypt(in.Payload, aad(o, out, payloadDigest))
		if e != nil {
			return e
		}
		_, e = tx.Exec(ctx, `INSERT INTO provider_helper_records(receipt,attempt_id,user_id,group_id,namespace,account_id,principal_id,generation,parent_receipt,public_prefix_digest,chain_digest,payload_digest,payload,payload_bytes,created_at,expires_at,tombstone_until) VALUES($1,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`, id, o.UserID, o.GroupID, a.namespace, a.Binding.AccountID, a.Binding.PrincipalID, a.Binding.Generation, a.ParentReceipt, in.PublicPrefixDigest, out.ChainDigest, payloadDigest, ciphertext, len(ciphertext), now, expiry, expiry.Add(s.options.TombstoneRetention))
		if e != nil {
			return e
		}
		if _, e = tx.Exec(ctx, `UPDATE provider_helper_attempts SET state='committed' WHERE id=$1`, id); e != nil {
			return e
		}
		out.Payload = append([]byte(nil), in.Payload...)
		// Keep conflicting immutable evidence, even though this response cannot be
		// advertised as uniquely resumable. Returning the error inside Tx would erase it.
		_, committedConflict = prefixRecord(ctx, tx, o, a.namespace, in.PublicPrefixDigest, now)
		frozen := in.Usage
		if committedConflict != nil {
			frozen = core.HelperHistoryStorageFailure(frozen)
		}
		return s.saveUsage(ctx, tx, a, frozen)
	})
	if err == nil {
		err = committedConflict
	}
	return
}
func (s *Service) parentChain(ctx context.Context, q store.Querier, o core.ResourceOwner, id, namespace string, now time.Time) (core.HelperHistoryChain, error) {
	prefixes := []string{}
	for id != "" {
		if len(prefixes) >= wire.MaxChainDepth {
			return core.HelperHistoryChain{}, core.ErrConflict
		}
		r, _, e := readRecord(ctx, q, o, id)
		if e != nil {
			return core.HelperHistoryChain{}, e
		}
		prefixes = append(prefixes, r.PublicPrefixDigest)
		id = r.ParentReceipt
	}
	for i, j := 0, len(prefixes)-1; i < j; i, j = i+1, j-1 {
		prefixes[i], prefixes[j] = prefixes[j], prefixes[i]
	}
	return s.resolve(ctx, q, o, prefixes, namespace, now)
}
