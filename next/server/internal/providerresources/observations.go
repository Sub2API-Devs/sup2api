package providerresources

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type remoteIdentity struct {
	Plugin, Kind string
	Binding      core.ResourceBinding
	ID           string
}

func remoteKey(plugin, kind string, binding core.ResourceBinding, id string) string {
	raw, _ := json.Marshal(remoteIdentity{plugin, kind, binding, id})
	hash := sha256.Sum256(raw)
	return hex.EncodeToString(hash[:])
}
func lockRemote(ctx context.Context, tx pgx.Tx, plugin, kind string, binding core.ResourceBinding, id string) error {
	_, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "provider-resource-identity:"+remoteKey(plugin, kind, binding, id))
	return err
}
func lookupRemote(ctx context.Context, q store.Querier, plugin, kind string, binding core.ResourceBinding, id string) ([]core.ProviderResource, error) {
	rows, err := q.Query(ctx, `SELECT `+columns+` FROM provider_resources WHERE plugin_key=$1 AND kind=$2 AND account_id=$3 AND principal_id=$4 AND generation=$5 AND remote_id=$6`, plugin, kind, binding.AccountID, binding.PrincipalID, binding.Generation, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []core.ProviderResource
	for rows.Next() {
		r, _, e := scan(rows)
		if e != nil {
			return nil, e
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func observedExpiry(in core.ResourceObservation, current *core.ProviderResource, now time.Time) (time.Time, error) {
	var expiry time.Time
	if in.ExpiresAt != nil && !in.ExpiresAt.IsZero() {
		expiry = in.ExpiresAt.UTC().Truncate(time.Microsecond)
	}
	if in.Kind == "container" && expiry.IsZero() {
		return time.Time{}, core.ErrInvalidArgument.WithMessage("container requires a verified provider expiry")
	}
	if in.Kind == "container" && (in.RequestStartedAt.IsZero() || in.RequestStartedAt.After(now)) {
		return time.Time{}, core.ErrInvalidArgument.WithMessage("container observation requires a trusted dispatch time")
	}
	if current == nil {
		if !expiry.IsZero() && !expiry.After(now) {
			return time.Time{}, core.ErrConflict.WithMessage("observed resource has already expired")
		}
		return expiry, nil
	}
	if current.State != "ready" {
		return time.Time{}, core.ErrConflict.WithMessage("resource is not available for observation")
	}
	if in.Kind == "container" {
		if in.RequestStartedAt.IsZero() || in.RequestStartedAt.After(now) || current.ExpiresAt.IsZero() || !current.ExpiresAt.After(in.RequestStartedAt) {
			return time.Time{}, core.ErrConflict.WithMessage("container was not valid at the verified dispatch time")
		}
		if current.ExpiresAt.After(expiry) {
			expiry = current.ExpiresAt
		}
		if !expiry.After(now) {
			return time.Time{}, core.ErrConflict.WithMessage("observed container remains expired")
		}
		return expiry, nil
	}
	if !current.ExpiresAt.IsZero() && !current.ExpiresAt.After(now) {
		return time.Time{}, core.ErrConflict.WithMessage("expired file cannot be revived")
	}
	if in.ExpiresAt == nil || expiry.IsZero() {
		return current.ExpiresAt, nil
	}
	if !current.ExpiresAt.IsZero() && current.ExpiresAt.Before(expiry) {
		return current.ExpiresAt, nil
	}
	if !expiry.After(now) {
		return time.Time{}, core.ErrConflict.WithMessage("observed file has expired")
	}
	return expiry, nil
}

func (s *Service) RegisterObserved(ctx context.Context, in core.ResourceObservation) (out core.ProviderResource, err error) {
	if !validOwner(in.Owner) || !validBinding(in.Binding) || !bounded(in.PluginKey) || !bounded(in.RemoteID) || (in.Kind != "file" && in.Kind != "container") || in.Bytes < 0 || in.Bytes > s.limits.MaxResourceBytes {
		return out, core.ErrInvalidArgument
	}
	meta, err := metadata(in.Metadata)
	if err != nil {
		return out, err
	}
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if e := lockOwner(ctx, tx, in.Owner); e != nil {
			return e
		}
		if e := lockRemote(ctx, tx, in.PluginKey, in.Kind, in.Binding, in.RemoteID); e != nil {
			return e
		}
		rows, e := lookupRemote(ctx, tx, in.PluginKey, in.Kind, in.Binding, in.RemoteID)
		if e != nil {
			return e
		}
		if len(rows) > 1 {
			return core.ErrConflict.WithMessage("remote resource identity has multiple historical records")
		}
		now := time.Now()
		if len(rows) == 1 {
			r := rows[0]
			if r.Owner != in.Owner {
				return core.ErrConflict.WithMessage("remote resource belongs to another owner")
			}
			// The owner advisory lock also serializes deletion/finalization.
			expiry, e := observedExpiry(in, &r, now)
			if e != nil {
				return e
			}
			if in.Kind == "file" && r.Bytes != in.Bytes {
				return core.ErrConflict.WithMessage("observed file size changed")
			}
			countDelta, bytesDelta := 0, in.Bytes-r.Bytes
			if !resourceOccupiesQuota(r, now) {
				countDelta, bytesDelta = 1, in.Bytes
			}
			if countDelta > 0 && in.Kind == "container" {
				if e = s.contextQuota(ctx, tx, in.Owner, 0, now, r.PublicID); e != nil {
					return e
				}
			}
			if e = s.quotaAt(ctx, tx, in.Owner, countDelta, bytesDelta, now); e != nil {
				return e
			}
			var expires *time.Time
			if !expiry.IsZero() {
				expires = &expiry
			}
			_, e = tx.Exec(ctx, `UPDATE provider_resources SET metadata=$2,bytes=$3,expires_at=$4,updated_at=now() WHERE public_id=$1`, r.PublicID, meta, in.Bytes, expires)
			if e != nil {
				return e
			}
			out, _, e = read(ctx, tx, `public_id=$1`, r.PublicID)
			return e
		}
		expiry, e := observedExpiry(in, nil, now)
		if e != nil {
			return e
		}
		if e = s.quotaAt(ctx, tx, in.Owner, 1, in.Bytes, now); e != nil {
			return e
		}
		id, op := "s2res_"+uuid.NewString(), uuid.NewString()
		key := remoteKey(in.PluginKey, in.Kind, in.Binding, in.RemoteID)
		var expires *time.Time
		if !expiry.IsZero() {
			expires = &expiry
		}
		_, e = tx.Exec(ctx, `INSERT INTO provider_resources(public_id,user_id,group_id,request_id,plugin_key,kind,account_id,principal_id,generation,remote_id,state,operation_id,bytes,metadata,intent_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ready',$11,$12,$13,$14,$15)`, id, in.Owner.UserID, in.Owner.GroupID, "observed:"+key, in.PluginKey, in.Kind, in.Binding.AccountID, in.Binding.PrincipalID, in.Binding.Generation, in.RemoteID, op, in.Bytes, meta, key, expires)
		if store.IsUniqueViolation(e, "") {
			return core.ErrConflict
		}
		if e != nil {
			return e
		}
		out, _, e = read(ctx, tx, `public_id=$1`, id)
		return e
	})
	return
}
