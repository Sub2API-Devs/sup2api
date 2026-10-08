package helperhistory

import (
	"context"
	"time"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

func (s *Service) Resolve(ctx context.Context, o core.ResourceOwner, prefixes []string, namespace string) (out core.HelperHistoryChain, err error) {
	err = s.transaction(ctx, o, func(tx pgx.Tx) error {
		var e error
		out, e = s.resolve(ctx, tx, o, prefixes, namespace, s.now())
		return e
	})
	return
}
func (s *Service) resolve(ctx context.Context, q store.Querier, o core.ResourceOwner, prefixes []string, namespace string, now time.Time) (out core.HelperHistoryChain, err error) {
	if !bounded(namespace) || len(prefixes) > wire.MaxChainDepth {
		return out, core.ErrInvalidArgument
	}
	if len(prefixes) == 0 {
		return out, nil
	}
	seen := map[string]bool{}
	for _, prefix := range prefixes {
		if !wire.ValidDigest(prefix) || seen[prefix] {
			return out, core.ErrInvalidArgument
		}
		seen[prefix] = true
	}
	id, e := prefixRecord(ctx, q, o, namespace, prefixes[len(prefixes)-1], now)
	if e != nil {
		return out, e
	}
	totalBytes := 0
	records := make([]core.HelperHistoryRecord, len(prefixes))
	digests := make([]string, len(prefixes))
	for i := len(prefixes) - 1; i >= 0; i-- {
		if id == "" {
			return out, core.ErrConflict.WithMessage("helper history ancestry incomplete")
		}
		r, d, e := readRecord(ctx, q, o, id)
		if e != nil {
			return out, e
		}
		if r.Namespace != namespace || r.PublicPrefixDigest != prefixes[i] || !r.ExpiresAt.After(now) || r.Payload == nil {
			return out, core.ErrConflict.WithMessage("helper history ancestry mismatch")
		}
		if _, e = prefixRecord(ctx, q, o, namespace, prefixes[i], now); e != nil {
			return out, e
		}
		if len(r.Payload) > wire.MaxPayloadBytes+64 {
			return out, core.ErrConflict.WithMessage("oversized helper ciphertext")
		}
		raw, e := s.cipher.Decrypt(r.Payload, aad(o, r, d))
		if e != nil {
			return out, core.ErrConflict.WithMessage("helper history integrity failure")
		}
		if wire.Digest(raw) != d || wire.Validate(raw) != nil {
			return out, core.ErrConflict.WithMessage("helper history payload invalid")
		}
		totalBytes += len(raw)
		if totalBytes > wire.MaxPayloadBytes {
			return out, core.ErrRateLimited.WithMessage("helper chain exceeds restore capacity")
		}
		r.Payload = raw
		records[i] = r
		digests[i] = d
		id = r.ParentReceipt
	}
	if id != "" {
		return out, core.ErrConflict.WithMessage("helper history earlier prefix omitted")
	}
	parent := ""
	binding := records[0].Binding
	for i, r := range records {
		if r.Binding != binding || r.ChainDigest != chainDigest(parent, binding, namespace, r.PublicPrefixDigest, digests[i]) {
			return out, core.ErrConflict.WithMessage("helper history chain integrity failure")
		}
		parent = r.ChainDigest
	}
	return core.HelperHistoryChain{Records: records, Binding: binding}, nil
}
