// Package fallbackcredits binds opaque provider credits to their owner and
// issuing account. Redemption is not marked consumed: provider credits are
// stateless and the provider may permit explicit retries within their lifetime.
package fallbackcredits

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"slices"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

type Service struct {
	db          *store.DB
	maxRetained int
}

var _ core.FallbackCredits = (*Service)(nil)

func New(db *store.DB, maxRetained int) *Service {
	if maxRetained <= 0 {
		maxRetained = 10000
	}
	return &Service{db: db, maxRetained: maxRetained}
}
func bounded(value string) bool {
	return value != "" && len(value) <= 256 && !strings.ContainsAny(value, "\x00\r\n")
}
func hash(value string) bool {
	raw, err := hex.DecodeString(value)
	return err == nil && len(raw) == 32 && strings.ToLower(value) == value
}
func validOwner(owner core.ResourceOwner) bool { return owner.UserID > 0 && owner.GroupID > 0 }

func normalize(in core.FallbackCredit, now time.Time) (core.FallbackCredit, error) {
	if !validOwner(in.Owner) || !hash(in.TokenHash) || !bounded(in.PluginKey) || !bounded(in.SourceModel) || in.Binding.AccountID <= 0 || !bounded(in.Binding.PrincipalID) || !bounded(in.Binding.Generation) || len(in.PromptDigests) < 1 || len(in.PromptDigests) > 3 {
		return in, core.ErrInvalidArgument
	}
	in.PromptDigests = append([]string(nil), in.PromptDigests...)
	slices.Sort(in.PromptDigests)
	for i, value := range in.PromptDigests {
		if !hash(value) || i > 0 && value == in.PromptDigests[i-1] {
			return in, core.ErrInvalidArgument
		}
	}
	in.ObservedAt = in.ObservedAt.UTC().Truncate(time.Microsecond)
	in.ExpiresAt = in.ExpiresAt.UTC().Truncate(time.Microsecond)
	if in.ObservedAt.IsZero() || in.ObservedAt.After(now) || !in.ExpiresAt.After(now) || !in.ExpiresAt.After(in.ObservedAt) || in.ExpiresAt.Sub(in.ObservedAt) > credits.Lifetime {
		return in, core.ErrInvalidArgument.WithMessage("invalid fallback credit observation lifetime")
	}
	return in, nil
}

const columns = `token_hash,user_id,group_id,account_id,principal_id,generation,plugin_key,source_model,prompt_digests,observed_at,expires_at`

func read(ctx context.Context, q store.Querier, tokenHash string) (out core.FallbackCredit, err error) {
	var digests []byte
	err = q.QueryRow(ctx, `SELECT `+columns+` FROM provider_fallback_credits WHERE token_hash=$1`, tokenHash).Scan(&out.TokenHash, &out.Owner.UserID, &out.Owner.GroupID, &out.Binding.AccountID, &out.Binding.PrincipalID, &out.Binding.Generation, &out.PluginKey, &out.SourceModel, &digests, &out.ObservedAt, &out.ExpiresAt)
	if err == nil {
		err = json.Unmarshal(digests, &out.PromptDigests)
	}
	return
}

func (s *Service) Record(ctx context.Context, input core.FallbackCredit) error {
	in, err := normalize(input, time.Now())
	if err != nil {
		return err
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		owner, _ := json.Marshal(in.Owner)
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "fallback-credit-owner:"+string(owner)); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "fallback-credit-token:"+in.TokenHash); err != nil {
			return err
		}
		if !in.ExpiresAt.After(time.Now()) {
			return core.ErrInvalidArgument.WithMessage("fallback credit expired before registration")
		}
		old, err := read(ctx, tx, in.TokenHash)
		if err == nil {
			if old.Owner != in.Owner || old.Binding != in.Binding || old.PluginKey != in.PluginKey || old.SourceModel != in.SourceModel || !slices.Equal(old.PromptDigests, in.PromptDigests) {
				return core.ErrConflict.WithMessage("fallback credit registration conflicts with its issuing request")
			}
			// Seeing the same token again never extends its original deadline.
			return nil
		}
		if !store.IsNoRows(err) {
			return err
		}
		// Keep expired hashes briefly as anti-revival tombstones, but bound all
		// retained records rather than only active five-minute entries.
		if _, err = tx.Exec(ctx, `DELETE FROM provider_fallback_credits WHERE user_id=$1 AND group_id=$2 AND expires_at<now()-interval '24 hours'`, in.Owner.UserID, in.Owner.GroupID); err != nil {
			return err
		}
		var retained int
		if err = tx.QueryRow(ctx, `SELECT count(*) FROM provider_fallback_credits WHERE user_id=$1 AND group_id=$2`, in.Owner.UserID, in.Owner.GroupID).Scan(&retained); err != nil {
			return err
		}
		if retained >= s.maxRetained {
			return core.ErrRateLimited.WithMessage("fallback credit tracking capacity exceeded")
		}
		digests, _ := json.Marshal(in.PromptDigests)
		_, err = tx.Exec(ctx, `INSERT INTO provider_fallback_credits(`+columns+`) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, in.TokenHash, in.Owner.UserID, in.Owner.GroupID, in.Binding.AccountID, in.Binding.PrincipalID, in.Binding.Generation, in.PluginKey, in.SourceModel, digests, in.ObservedAt, in.ExpiresAt)
		return err
	})
}

func (s *Service) Resolve(ctx context.Context, in core.FallbackCreditLookup) (core.FallbackCredit, error) {
	if !validOwner(in.Owner) || !hash(in.TokenHash) || !hash(in.PromptDigest) {
		return core.FallbackCredit{}, core.ErrInvalidArgument
	}
	record, err := s.LookupOwned(ctx, in.Owner, in.TokenHash)
	if err != nil {
		return core.FallbackCredit{}, err
	}
	if !record.ExpiresAt.After(time.Now()) {
		return core.FallbackCredit{}, core.ErrNotFound
	}
	if !slices.Contains(record.PromptDigests, in.PromptDigest) {
		return core.FallbackCredit{}, core.ErrInvalidArgument.WithMessage("fallback credit retry does not match the issuing prompt and beta headers")
	}
	return record, nil
}

// LookupOwned separates custody from redemption eligibility, including retained expired records.
func (s *Service) LookupOwned(ctx context.Context, owner core.ResourceOwner, tokenHash string) (core.FallbackCredit, error) {
	if !validOwner(owner) || !hash(tokenHash) {
		return core.FallbackCredit{}, core.ErrInvalidArgument
	}
	record, err := read(ctx, s.db.Pool, tokenHash)
	if store.IsNoRows(err) || err == nil && (record.Owner != owner || record.ExpiresAt.Before(time.Now().Add(-24*time.Hour))) {
		return core.FallbackCredit{}, core.ErrNotFound
	}
	if err != nil {
		return core.FallbackCredit{}, err
	}
	return record, nil
}
