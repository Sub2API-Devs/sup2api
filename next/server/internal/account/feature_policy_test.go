package account

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/stretchr/testify/require"
)

func TestCCFeatureAccountPatchAtomicAndScoped(t *testing.T) {
	e := setup(t)
	ccg := e.withCCGateway(true, func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200); _, _ = w.Write([]byte(`{}`)) })
	ctx := context.Background()
	gid := e.exec1("INSERT INTO groups(name) VALUES('features') RETURNING id")
	enc, err := e.svc.d.Cipher.Encrypt([]byte(`{}`), aad("ccgateway"))
	require.NoError(t, err)
	id := e.exec1("INSERT INTO accounts(name,plugin_key,type,credentials_enc,created_by) VALUES('original','ccgateway','managed',$1,$2) RETURNING id", enc, e.uid)
	_, err = e.db.Pool.Exec(ctx, "INSERT INTO account_groups(account_id,group_id) VALUES($1,$2)", id, gid)
	require.NoError(t, err)
	cfg, err := ccg.Load(ctx)
	require.NoError(t, err)
	require.Empty(t, cfg.CCFeatureGroups)
	path := "/accounts/" + itoa(id)
	p := map[string]any{"mode": "custom", "revision": 0, "overrides": map[string]any{"build_billing_sources": map[string]string{"cc_version": "worker"}}}
	code, out := e.do("PATCH", path, map[string]any{"name": "changed", "cc_feature_policy": p})
	require.Equal(t, 200, code, out)
	data := out["data"].(map[string]any)
	require.Equal(t, float64(1), data["cc_feature_policy"].(map[string]any)["revision"])
	after, err := ccg.Load(ctx)
	require.NoError(t, err)
	require.Empty(t, after.CCFeatureGroups, "account edits must not create a group policy")
	// Stale feature revision rolls back the account name in the same tx.
	code, out = e.do("PATCH", path, map[string]any{"name": "must-rollback", "cc_feature_policy": p})
	require.Equal(t, 409, code, out)
	var name string
	require.NoError(t, e.db.Pool.QueryRow(ctx, "SELECT name FROM accounts WHERE id=$1", id).Scan(&name))
	require.Equal(t, "changed", name)
	p["mode"] = "follow"
	p["revision"] = 1
	code, out = e.do("PATCH", path, map[string]any{"cc_feature_policy": p})
	require.Equal(t, 200, code, out)
	saved, err := ccgateway.LoadAccountFeaturePolicy(ctx, e.db.Pool, id)
	require.NoError(t, err)
	require.Empty(t, saved.Overrides.BuildBillingSources)
	require.EqualValues(t, 2, saved.Revision)
	setGroup := func(enabled bool) {
		cfg.CCFeatureGroups = map[string]ccgateway.GroupFeaturePolicy{strconv.FormatInt(gid, 10): {Enabled: enabled, AllowAccountOverride: false}}
		plain, err := json.Marshal(cfg)
		require.NoError(t, err)
		cipher, err := e.svc.d.Cipher.Encrypt(plain, []byte("system:ccgateway:v1"))
		require.NoError(t, err)
		envelope, err := json.Marshal(map[string]any{"cipher": cipher})
		require.NoError(t, err)
		_, err = e.db.Pool.Exec(ctx, "UPDATE settings SET value=$1 WHERE key='ccgateway_remote'", envelope)
		require.NoError(t, err)
	}
	p["mode"], p["revision"] = "custom", 2
	setGroup(true)
	code, _ = e.do("PATCH", path, map[string]any{"name": "must-not-save", "cc_feature_policy": p})
	require.Equal(t, 403, code)
	require.NoError(t, e.db.Pool.QueryRow(ctx, "SELECT name FROM accounts WHERE id=$1", id).Scan(&name))
	require.Equal(t, "changed", name)
	// An inactive group restriction cannot block direct overrides of global defaults.
	setGroup(false)
	code, out = e.do("PATCH", path, map[string]any{"cc_feature_policy": p})
	require.Equal(t, 200, code, out)
	require.Equal(t, float64(3), out["data"].(map[string]any)["cc_feature_policy"].(map[string]any)["revision"])
	// Creating with a feature draft is rejected before any account is inserted.
	code, _ = e.do("POST", "/accounts", map[string]any{"name": "bad", "plugin_key": "ccgateway", "type": "managed", "credentials": map[string]any{}, "cc_feature_policy": p})
	require.Equal(t, 400, code)
	other := e.exec1("INSERT INTO accounts(name,plugin_key,type,credentials_enc,created_by) VALUES('other','anthropic','apikey',$1,$2) RETURNING id", enc, e.uid)
	code, _ = e.do("PATCH", "/accounts/"+itoa(other), map[string]any{"cc_feature_policy": p})
	require.Equal(t, 400, code)
}
