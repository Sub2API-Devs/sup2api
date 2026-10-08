package providerresources

import (
	"bytes"
	"context"
	"encoding/json"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Service) ReserveSkillUpload(ctx context.Context, input core.SkillUploadIntent) (out core.SkillUploadReservation, err error) {
	normalizer := *s
	normalizer.limits.DefaultTTL = 0
	in, hash, err := normalizer.normalize(input.ResourceIntent)
	if err != nil {
		return out, err
	}
	if in.PluginKey != "ccgateway" || in.Kind != "skill" || in.TTL != 0 || !in.ExpiresAt.IsZero() {
		return out, core.ErrInvalidArgument
	}
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if e := lockOwner(ctx, tx, in.Owner); e != nil {
			return e
		}
		var parent core.ProviderResource
		fresh := false
		if input.ParentID != "" {
			var e error
			parent, e = skillParent(ctx, tx, in.Owner, input.ParentID, true)
			if e != nil {
				return e
			}
			if parent.Binding != in.Binding {
				return core.ErrConflict
			}
		} else {
			var oldHash string
			var e error
			parent, oldHash, e = read(ctx, tx, `user_id=$1 AND group_id=$2 AND request_id=$3`, in.Owner.UserID, in.Owner.GroupID, in.RequestID)
			if store.IsNoRows(e) {
				fresh = true
			} else if e != nil {
				return e
			} else if parent.Kind != "skill" || oldHash != hash {
				return core.ErrConflict
			}
		}
		if !fresh {
			v, e := readSkillVersion(ctx, tx, parent, `parent_id=$1 AND request_id=$2`, parent.PublicID, in.RequestID)
			if e == nil {
				var prior string
				if e = tx.QueryRow(ctx, `SELECT intent_hash FROM provider_skill_versions WHERE public_id=$1`, v.PublicVersionID).Scan(&prior); e != nil {
					return e
				}
				if prior != hash {
					return core.ErrConflict
				}
				out = core.SkillUploadReservation{Parent: parent, Version: v}
				return nil
			}
			if !store.IsNoRows(e) {
				return e
			}
			if input.ParentID == "" {
				return core.ErrConflict
			}
		}
		needed := 1
		if fresh {
			needed++
		}
		if e := s.quota(ctx, tx, in.Owner, needed, in.Bytes); e != nil {
			return e
		}
		op := uuid.NewString()
		if fresh {
			id := "s2res_" + uuid.NewString()
			_, e := tx.Exec(ctx, `INSERT INTO provider_resources(public_id,user_id,group_id,request_id,plugin_key,kind,account_id,principal_id,generation,state,operation_id,bytes,metadata,intent_hash) VALUES($1,$2,$3,$4,'ccgateway','skill',$5,$6,$7,'pending',$8,0,$9,$10)`, id, in.Owner.UserID, in.Owner.GroupID, in.RequestID, in.Binding.AccountID, in.Binding.PrincipalID, in.Binding.Generation, op, in.Metadata, hash)
			if e != nil {
				return e
			}
			parent, _, e = read(ctx, tx, `public_id=$1`, id)
			if e != nil {
				return e
			}
		}
		id := "s2skv_" + uuid.NewString()
		_, e := tx.Exec(ctx, `INSERT INTO provider_skill_versions(public_id,parent_id,request_id,state,operation_id,bytes,intent_hash) VALUES($1,$2,$3,'pending',$4,$5,$6)`, id, parent.PublicID, in.RequestID, op, in.Bytes, hash)
		if e != nil {
			return e
		}
		v, e := readSkillVersion(ctx, tx, parent, `public_id=$1`, id)
		if e != nil {
			return e
		}
		out = core.SkillUploadReservation{Parent: parent, Version: v, Dispatch: true}
		return nil
	})
	return
}

func (s *Service) CompleteSkillUpload(ctx context.Context, in core.SkillUploadCompletion) (out core.SkillUploadReservation, err error) {
	if in.CreatedAt.IsZero() || !validOwner(in.Owner) || !validBinding(in.Binding) || !bounded(in.RemoteSkillID) || !bounded(in.RemoteVersionID) || !bounded(in.OperationID) || (in.LegacyEpoch != "" && !bounded(in.LegacyEpoch)) {
		return out, core.ErrInvalidArgument
	}
	if in.LegacyEpoch != "" {
		for _, c := range in.LegacyEpoch {
			if c < '0' || c > '9' {
				return out, core.ErrInvalidArgument
			}
		}
	}
	in.CreatedAt = in.CreatedAt.UTC().Truncate(time.Microsecond)
	vm, err := metadata(in.VersionMetadata)
	if err != nil {
		return out, err
	}
	pm, err := metadata(in.ParentMetadata)
	if err != nil {
		return out, err
	}
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if e := lockOwner(ctx, tx, in.Owner); e != nil {
			return e
		}
		p, e := skillParent(ctx, tx, in.Owner, in.ParentID, false)
		if e != nil {
			return e
		}
		if p.Binding != in.Binding || (p.State != "ready" && p.State != "pending" && p.State != "uncertain") {
			return core.ErrConflict
		}
		v, e := readSkillVersion(ctx, tx, p, `parent_id=$1 AND public_id=$2`, p.PublicID, in.PublicVersionID)
		if store.IsNoRows(e) {
			return core.ErrNotFound
		}
		if e != nil {
			return e
		}
		if v.OperationID != in.OperationID {
			return core.ErrConflict
		}
		if v.State == "ready" {
			old, _ := metadata(v.Metadata)
			if p.RemoteID != in.RemoteSkillID || !v.CreatedAt.Equal(in.CreatedAt) || v.RemoteVersionID != in.RemoteVersionID || v.LegacyEpoch != in.LegacyEpoch || !bytes.Equal(old, vm) {
				return core.ErrConflict
			}
			out = core.SkillUploadReservation{Parent: p, Version: v}
			return nil
		}
		if v.State != "pending" && v.State != "uncertain" {
			return core.ErrConflict
		}
		if p.RemoteID != "" && p.RemoteID != in.RemoteSkillID {
			return core.ErrConflict
		}
		if e = lockRemote(ctx, tx, p.PluginKey, p.Kind, p.Binding, in.RemoteSkillID); e != nil {
			return e
		}
		known, e := lookupRemote(ctx, tx, p.PluginKey, p.Kind, p.Binding, in.RemoteSkillID)
		if e != nil {
			return e
		}
		for _, other := range known {
			if other.PublicID != p.PublicID {
				return core.ErrConflict
			}
		}
		if len(in.ParentMetadata) == 0 {
			if p.RemoteID == "" {
				return core.ErrInvalidArgument
			}
			pm = p.Metadata
		}
		_, e = tx.Exec(ctx, `UPDATE provider_resources SET remote_id=$2,state='ready',metadata=$3,updated_at=now() WHERE public_id=$1`, p.PublicID, in.RemoteSkillID, pm)
		if e != nil {
			return e
		}
		_, e = tx.Exec(ctx, `UPDATE provider_skill_versions SET remote_id=$2,legacy_epoch=$3,state='ready',metadata=$4,created_at=$5,updated_at=now() WHERE public_id=$1`, v.PublicVersionID, in.RemoteVersionID, in.LegacyEpoch, vm, in.CreatedAt)
		if store.IsUniqueViolation(e, "") {
			return core.ErrConflict
		}
		if e != nil {
			return e
		}
		p, _, e = read(ctx, tx, `public_id=$1`, p.PublicID)
		if e != nil {
			return e
		}
		v, e = readSkillVersion(ctx, tx, p, `public_id=$1`, v.PublicVersionID)
		out = core.SkillUploadReservation{Parent: p, Version: v}
		return e
	})
	return
}

func confirmedSkillRejection(code string) bool {
	return code == "invalid_request_error" || code == "authentication_error" || code == "permission_error"
}
func (s *Service) MarkSkillUpload(ctx context.Context, in core.SkillUploadFailure) error {
	if in.Outcome != "uncertain" && (in.Outcome != "rejected" || !confirmedSkillRejection(in.EvidenceCode)) {
		return core.ErrInvalidArgument
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		if e := lockOwner(ctx, tx, in.Owner); e != nil {
			return e
		}
		p, e := skillParent(ctx, tx, in.Owner, in.ParentID, false)
		if e != nil {
			return e
		}
		v, e := readSkillVersion(ctx, tx, p, `parent_id=$1 AND public_id=$2`, p.PublicID, in.PublicVersionID)
		if e != nil {
			return e
		}
		target := "uncertain"
		if in.Outcome == "rejected" {
			target = "failed"
		}
		if v.OperationID != in.OperationID || (v.State != "pending" && v.State != "uncertain" && v.State != target) {
			return core.ErrConflict
		}
		meta, e := mergeSkillUploadEvidence(v.Metadata, in.Evidence, p.Binding)
		if e != nil {
			return e
		}
		if _, e = tx.Exec(ctx, `UPDATE provider_skill_versions SET state=$2,metadata=$3,updated_at=now() WHERE public_id=$1`, v.PublicVersionID, target, meta); e != nil {
			return e
		}
		if p.RemoteID == "" {
			_, e = tx.Exec(ctx, `UPDATE provider_resources SET state=$2,updated_at=now() WHERE public_id=$1`, p.PublicID, target)
		}
		return e
	})
}

func mergeSkillUploadEvidence(prior json.RawMessage, evidence *core.SkillUploadEvidence, binding core.ResourceBinding) (json.RawMessage, error) {
	if evidence == nil {
		return metadata(prior)
	}
	if evidence.Binding != binding || !validBinding(evidence.Binding) {
		return nil, core.ErrConflict
	}
	for _, value := range []string{evidence.RemoteSkillID, evidence.RemoteVersionID, evidence.LegacyEpoch, evidence.SourceRequestID} {
		if value != "" && !bounded(value) {
			return nil, core.ErrInvalidArgument
		}
	}
	var root map[string]json.RawMessage
	if len(prior) > 0 && json.Unmarshal(prior, &root) != nil {
		return nil, core.ErrInvalidArgument
	}
	if root == nil {
		root = map[string]json.RawMessage{}
	}
	var old core.SkillUploadEvidence
	if value := root["upload_evidence"]; len(value) > 0 && json.Unmarshal(value, &old) != nil {
		return nil, core.ErrConflict
	}
	if old.Binding != (core.ResourceBinding{}) && old.Binding != binding {
		return nil, core.ErrConflict
	}
	merged := *evidence
	for _, pair := range [][2]*string{{&merged.RemoteSkillID, &old.RemoteSkillID}, {&merged.RemoteVersionID, &old.RemoteVersionID}, {&merged.LegacyEpoch, &old.LegacyEpoch}, {&merged.SourceRequestID, &old.SourceRequestID}} {
		if *pair[0] == "" {
			*pair[0] = *pair[1]
		} else if *pair[1] != "" && *pair[0] != *pair[1] {
			return nil, core.ErrConflict
		}
	}
	raw, _ := json.Marshal(merged)
	root["upload_evidence"] = raw
	raw, _ = json.Marshal(root)
	return metadata(raw)
}
