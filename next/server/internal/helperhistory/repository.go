package helperhistory

import (
	"context"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

type attempt struct {
	core.HelperHistoryAttempt
	owner                                            core.ResourceOwner
	requestID, requestDigest, namespace, usageDigest string
	reservedBytes                                    int64
}

func readAttempt(ctx context.Context, q store.Querier, o core.ResourceOwner, id string) (a attempt, e error) {
	e = q.QueryRow(ctx, `SELECT id,parent_receipt,state,account_id,principal_id,generation,expires_at,request_id,request_digest,namespace,usage_digest,reserved_bytes FROM provider_helper_attempts WHERE user_id=$1 AND group_id=$2 AND id=$3`, o.UserID, o.GroupID, id).Scan(&a.ID, &a.ParentReceipt, &a.State, &a.Binding.AccountID, &a.Binding.PrincipalID, &a.Binding.Generation, &a.ExpiresAt, &a.requestID, &a.requestDigest, &a.namespace, &a.usageDigest, &a.reservedBytes)
	a.owner = o
	if store.IsNoRows(e) {
		e = core.ErrNotFound
	}
	return
}
func readRecord(ctx context.Context, q store.Querier, o core.ResourceOwner, id string) (r core.HelperHistoryRecord, digest string, e error) {
	e = q.QueryRow(ctx, `SELECT receipt,parent_receipt,public_prefix_digest,chain_digest,namespace,account_id,principal_id,generation,payload,expires_at,payload_digest FROM provider_helper_records WHERE user_id=$1 AND group_id=$2 AND receipt=$3`, o.UserID, o.GroupID, id).Scan(&r.Receipt, &r.ParentReceipt, &r.PublicPrefixDigest, &r.ChainDigest, &r.Namespace, &r.Binding.AccountID, &r.Binding.PrincipalID, &r.Binding.Generation, &r.Payload, &r.ExpiresAt, &digest)
	if store.IsNoRows(e) {
		e = core.ErrNotFound
	}
	return
}
func prefixRecord(ctx context.Context, q store.Querier, o core.ResourceOwner, namespace, prefix string, now time.Time) (string, error) {
	rows, e := q.Query(ctx, `SELECT receipt,chain_digest,expires_at,payload IS NOT NULL FROM provider_helper_records WHERE user_id=$1 AND group_id=$2 AND namespace=$3 AND public_prefix_digest=$4 ORDER BY created_at,receipt`, o.UserID, o.GroupID, namespace, prefix)
	if e != nil {
		return "", e
	}
	defer rows.Close()
	id, digest := "", ""
	expired := false
	for rows.Next() {
		var current, hash string
		var expiry time.Time
		var present bool
		if e = rows.Scan(&current, &hash, &expiry, &present); e != nil {
			return "", e
		}
		if digest != "" && digest != hash {
			return "", core.ErrConflict.WithMessage("ambiguous helper history prefix")
		}
		digest = hash
		if !present || !expiry.After(now) {
			expired = true
		}
		if id == "" {
			id = current
		}
	}
	if e = rows.Err(); e != nil {
		return "", e
	}
	if id == "" || expired {
		return "", core.ErrNotFound.WithMessage("helper history missing or expired")
	}
	return id, nil
}
