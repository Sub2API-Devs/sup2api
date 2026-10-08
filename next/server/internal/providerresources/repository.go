package providerresources

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"time"
)

const columns = `public_id,plugin_key,kind,remote_id,state,operation_id,user_id,group_id,account_id,principal_id,generation,bytes,metadata,created_at,expires_at,intent_hash`

type scanner interface{ Scan(...any) error }

func scan(row scanner) (r core.ProviderResource, hash string, err error) {
	var expiry *time.Time
	err = row.Scan(&r.PublicID, &r.PluginKey, &r.Kind, &r.RemoteID, &r.State, &r.OperationID, &r.Owner.UserID, &r.Owner.GroupID, &r.Binding.AccountID, &r.Binding.PrincipalID, &r.Binding.Generation, &r.Bytes, &r.Metadata, &r.CreatedAt, &expiry, &hash)
	if expiry != nil {
		r.ExpiresAt = *expiry
	}
	return
}
func read(ctx context.Context, q store.Querier, predicate string, args ...any) (core.ProviderResource, string, error) {
	return scan(q.QueryRow(ctx, `SELECT `+columns+` FROM provider_resources WHERE `+predicate, args...))
}
