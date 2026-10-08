// Package providerresources stores tenant-owned remote resource intents. It
// never performs network operations or retries an ambiguous remote side effect.
package providerresources

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Options struct {
	MaxResources               int
	MaxContexts                int
	MaxBytes, MaxResourceBytes int64
	DefaultTTL, MaxTTL         time.Duration
}
type Service struct {
	db     *store.DB
	limits Options
}

var _ core.ProviderResources = (*Service)(nil)

func New(db *store.DB, opts Options) *Service {
	if opts.MaxContexts <= 0 {
		opts.MaxContexts = 100000
	}
	if opts.MaxResources <= 0 {
		opts.MaxResources = 1000
	}
	if opts.MaxBytes <= 0 {
		opts.MaxBytes = 10 << 30
	}
	if opts.MaxResourceBytes <= 0 {
		opts.MaxResourceBytes = 512 << 20
	}
	if opts.DefaultTTL <= 0 {
		opts.DefaultTTL = 0
	}
	if opts.MaxTTL <= 0 {
		opts.MaxTTL = 365 * 24 * time.Hour
	}
	return &Service{db: db, limits: opts}
}

func validOwner(o core.ResourceOwner) bool { return o.UserID > 0 && o.GroupID > 0 }
func bounded(s string) bool                { return s != "" && len(s) <= 256 && !strings.ContainsAny(s, "\x00\r\n") }
func validBinding(b core.ResourceBinding) bool {
	return b.AccountID > 0 && bounded(b.PrincipalID) && bounded(b.Generation)
}
func metadata(raw json.RawMessage) (json.RawMessage, error) {
	if len(raw) == 0 {
		return json.RawMessage(`{}`), nil
	}
	var obj map[string]any
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if len(raw) > 16384 || !json.Valid(raw) || dec.Decode(&obj) != nil || obj == nil {
		return nil, core.ErrInvalidArgument.WithMessage("resource metadata must be a bounded JSON object")
	}
	return json.Marshal(obj)
}

func (s *Service) normalize(in core.ResourceIntent) (core.ResourceIntent, string, error) {
	if !validOwner(in.Owner) || !validBinding(in.Binding) || !bounded(in.RequestID) || !bounded(in.PluginKey) || !bounded(in.Kind) || in.Bytes < 0 || in.Bytes > s.limits.MaxResourceBytes {
		return in, "", core.ErrInvalidArgument
	}
	if in.TTL == 0 {
		in.TTL = s.limits.DefaultTTL
	}
	if in.TTL < 0 || in.TTL > s.limits.MaxTTL {
		return in, "", core.ErrInvalidArgument.WithMessage("invalid resource TTL")
	}
	var err error
	if in.Metadata, err = metadata(in.Metadata); err != nil {
		return in, "", err
	}
	raw, _ := json.Marshal(in)
	h := sha256.Sum256(raw)
	return in, hex.EncodeToString(h[:]), nil
}

func lockOwner(ctx context.Context, tx pgx.Tx, owner core.ResourceOwner) error {
	// A transaction-scoped lock serializes reservations/finalization for this quota.
	raw, _ := json.Marshal(owner)
	_, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, "provider-resources:"+string(raw))
	return err
}

func (s *Service) quota(ctx context.Context, tx pgx.Tx, owner core.ResourceOwner, extraCount int, extraBytes int64) error {
	return s.quotaAt(ctx, tx, owner, extraCount, extraBytes, time.Now())
}

func resourceOccupiesQuota(r core.ProviderResource, at time.Time) bool {
	return r.State != "deleted" && r.State != "failed" && !(r.Kind == "container" && !r.ExpiresAt.IsZero() && !r.ExpiresAt.After(at))
}

func (s *Service) quotaAt(ctx context.Context, tx pgx.Tx, owner core.ResourceOwner, extraCount int, extraBytes int64, at time.Time) error {
	var count, bytes int64
	err := tx.QueryRow(ctx, `SELECT count(*),COALESCE(sum(bytes),0) FROM (
 SELECT bytes FROM provider_resources WHERE user_id=$1 AND group_id=$2 AND state NOT IN ('deleted','failed') AND NOT(kind='container' AND expires_at IS NOT NULL AND expires_at<=$3)
 UNION ALL SELECT v.bytes FROM provider_skill_versions v JOIN provider_resources p ON p.public_id=v.parent_id WHERE p.user_id=$1 AND p.group_id=$2 AND p.state NOT IN ('deleted','failed') AND v.state NOT IN ('deleted','failed')
 ) occupied`, owner.UserID, owner.GroupID, at).Scan(&count, &bytes)
	if err != nil {
		return err
	}
	if count+int64(extraCount) > int64(s.limits.MaxResources) || extraBytes > s.limits.MaxBytes-bytes {
		return core.ErrRateLimited.WithMessage("provider resource quota exceeded")
	}
	return nil
}

func (s *Service) Reserve(ctx context.Context, input core.ResourceIntent) (out core.ResourceReservation, err error) {
	in, hash, err := s.normalize(input)
	if err != nil {
		return out, err
	}
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockOwner(ctx, tx, in.Owner); err != nil {
			return err
		}
		existing, oldHash, e := read(ctx, tx, `user_id=$1 AND group_id=$2 AND request_id=$3`, in.Owner.UserID, in.Owner.GroupID, in.RequestID)
		if e == nil {
			if oldHash != hash {
				return core.ErrConflict.WithMessage("resource request ID already has a different intent")
			}
			out.Resource = existing
			return nil
		}
		if !store.IsNoRows(e) {
			return e
		}
		if e = s.quota(ctx, tx, in.Owner, 1, in.Bytes); e != nil {
			return e
		}
		var expiry *time.Time
		if in.TTL > 0 {
			v := time.Now().Add(in.TTL)
			expiry = &v
		}
		if !in.ExpiresAt.IsZero() && (expiry == nil || in.ExpiresAt.Before(*expiry)) {
			v := in.ExpiresAt
			expiry = &v
		}
		id, op := "s2res_"+uuid.NewString(), uuid.NewString()
		_, e = tx.Exec(ctx, `INSERT INTO provider_resources(public_id,user_id,group_id,request_id,plugin_key,kind,account_id,principal_id,generation,state,operation_id,bytes,metadata,intent_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11,$12,$13,$14)`, id, in.Owner.UserID, in.Owner.GroupID, in.RequestID, in.PluginKey, in.Kind, in.Binding.AccountID, in.Binding.PrincipalID, in.Binding.Generation, op, in.Bytes, in.Metadata, hash, expiry)
		if e != nil {
			return e
		}
		out.Resource, _, e = read(ctx, tx, `public_id=$1`, id)
		out.Dispatch = e == nil
		return e
	})
	return out, err
}

func (s *Service) Get(ctx context.Context, owner core.ResourceOwner, id string) (core.ProviderResource, error) {
	if !validOwner(owner) || !bounded(id) {
		return core.ProviderResource{}, core.ErrInvalidArgument
	}
	r, _, err := read(ctx, s.db.Pool, `user_id=$1 AND group_id=$2 AND public_id=$3`, owner.UserID, owner.GroupID, id)
	if store.IsNoRows(err) {
		err = core.ErrNotFound
	}
	return r, err
}

// List includes pending/uncertain states for reconciliation. Public file lists
// must select only ready, unexpired resources before projecting API objects.
func (s *Service) List(ctx context.Context, owner core.ResourceOwner, after string, limit int) ([]core.ProviderResource, error) {
	if !validOwner(owner) || limit < 1 || limit > 100 || len(after) > 256 {
		return nil, core.ErrInvalidArgument
	}
	rows, err := s.db.Pool.Query(ctx, `SELECT `+columns+` FROM provider_resources WHERE user_id=$1 AND group_id=$2 AND public_id>$3 ORDER BY public_id LIMIT $4`, owner.UserID, owner.GroupID, after, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]core.ProviderResource, 0)
	for rows.Next() {
		r, _, e := scan(rows)
		if e != nil {
			return nil, e
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
