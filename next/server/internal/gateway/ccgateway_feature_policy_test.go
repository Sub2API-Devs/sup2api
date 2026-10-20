package gateway

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/require"
)

// This exercises HTTP authentication -> scheduler -> dispatch -> managed
// transport -> actual policy header. Authentication/adapter/accounting use the
// gateway's normal doubles; configuration and account policy use real PG.
func TestCCGatewayAuthenticatedKeyGroupReachesWorkerAndFollowClearsAll(t *testing.T) {
	e := managedCCGatewayEnv(t, true)
	svc := e.gw.d.CCGateway
	ctx := context.Background()
	str := func(s string) *string { return &s }
	cfg, err := svc.Load(ctx)
	require.NoError(t, err)
	cfg.RequestPolicy = &ccgateway.RequestPolicy{SchemaVersion: 1, UnknownField: "reject", RelayMode: "build", CLIVersion: "2.1.304",
		BuildAttachmentSources: features.BuildAttachmentSources{"platform_name": "worker"}}
	cfg.CCFeatureGroups = map[string]ccgateway.GroupFeaturePolicy{
		"3": {Enabled: true, AllowAccountOverride: true, Overrides: ccgateway.FeatureOverrides{
			BuildAttachmentSources: features.BuildAttachmentSources{"platform_name": "erase", "os_version": "worker"},
			BuildBillingSources:    features.BuildBillingSources{"cc_version": "worker"},
		}},
		"4": {Enabled: true, AllowAccountOverride: false, Overrides: ccgateway.FeatureOverrides{
			BuildAttachmentSources: features.BuildAttachmentSources{"platform_name": "erase", "shell": "worker"},
			BuildBillingSources:    features.BuildBillingSources{"cc_version": "worker"},
		}},
		"5": {Enabled: false, AllowAccountOverride: true, Overrides: ccgateway.FeatureOverrides{
			BuildAttachmentSources: features.BuildAttachmentSources{"platform_name": "erase"},
		}},
		// Group 6 intentionally has no configured overrides.
		"7": {Enabled: true, AllowAccountOverride: false, Overrides: ccgateway.FeatureOverrides{RelayMode: str("direct"),
			BuildAttachmentSources: features.BuildAttachmentSources{"platform_name": "erase", "shell": "worker"},
			BuildBillingSources:    features.BuildBillingSources{"cc_version": "worker"},
		}},
		"8": {Enabled: true, AllowAccountOverride: true, Overrides: ccgateway.FeatureOverrides{RelayMode: str("direct")}},
	}
	raw, err := json.Marshal(cfg)
	require.NoError(t, err)
	encrypted, err := svc.Cipher.Encrypt(raw, []byte("system:ccgateway:v1"))
	require.NoError(t, err)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	_, err = svc.DB.Pool.Exec(ctx, "UPDATE settings SET value=$1 WHERE key='ccgateway_remote'", envelope)
	require.NoError(t, err)
	ap := ccgateway.AccountFeaturePolicy{Mode: "custom", Overrides: ccgateway.FeatureOverrides{
		RelayMode:              str("build"),
		BuildAttachmentSources: features.BuildAttachmentSources{"platform_name": "client", "shell": "erase"},
		BuildBillingSources:    features.BuildBillingSources{"cc_entrypoint": "worker"},
	}}
	save := func(p ccgateway.AccountFeaturePolicy) error {
		return svc.DB.Tx(ctx, func(tx pgx.Tx) error {
			var id int64
			if err := tx.QueryRow(ctx, "SELECT id FROM accounts WHERE id=1 FOR UPDATE").Scan(&id); err != nil {
				return err
			}
			return ccgateway.SaveAccountFeaturePolicyTx(ctx, tx, 1, p)
		})
	}
	require.NoError(t, save(ap))
	for gid := int64(3); gid <= 8; gid++ {
		_, err = svc.DB.Pool.Exec(ctx, "INSERT INTO groups(id,name) VALUES($1,$2)", gid, "feature-group-"+strconv.FormatInt(gid, 10))
		require.NoError(t, err)
		_, err = svc.DB.Pool.Exec(ctx, "INSERT INTO account_groups(account_id,group_id) VALUES(1,$1)", gid)
		require.NoError(t, err)
		principal := *e.auth.keys[testKey]
		principal.Group.ID = gid
		principal.KeyID = 100 + gid
		e.auth.keys["feature-key-"+strconv.FormatInt(gid, 10)] = &principal
		e.accounts.groups[gid] = []int64{1}
	}
	var healthProbes atomic.Int32
	worker := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" {
			healthProbes.Add(1)
			require.Equal(t, "managed-sidecar-secret", r.Header.Get("x-api-key"))
			_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "claude_version": "2.1.304", "capabilities": []string{
				features.RequestPolicyModeCapability, features.BuildAttachmentCapability, features.BuildAttachmentCapabilityV2,
				features.BuildBillingCapability, features.BuildContentPreservationCapability,
			}})
			return
		}
		e.up.handle(w, r)
	}))
	t.Cleanup(worker.Close)
	t.Setenv("CCGATEWAY_URL", worker.URL)
	check := func(gid int64, mode string, attachments features.BuildAttachmentSources, billing features.BuildBillingSources) {
		t.Helper()
		response := e.do("/v1/messages", body(testModel, false), map[string]string{
			"x-api-key":                  "feature-key-" + strconv.FormatInt(gid, 10),
			"X-CCGateway-Request-Policy": `{"schema_version":1,"relay_mode":"direct","build_attachment_sources":{"shell":"client"},"group_id":999}`,
		})
		require.Equal(t, 200, response.status, string(response.body))
		call := e.up.last()
		var policy ccgateway.RequestPolicy
		require.NoError(t, json.Unmarshal([]byte(call.header.Get("X-CCGateway-Request-Policy")), &policy))
		require.Equal(t, mode, policy.RelayMode)
		require.Equal(t, attachments, policy.BuildAttachmentSources, "group %d", gid)
		require.Equal(t, billing, policy.BuildBillingSources, "group %d", gid)
		record := e.record()
		require.Equal(t, gid, record.GroupID)
		require.EqualValues(t, 1, *record.AccountID)
	}
	check(3, "build", features.BuildAttachmentSources{"os_version": "worker", "shell": "erase"}, features.BuildBillingSources{"cc_version": "worker", "cc_entrypoint": "worker"})
	check(4, "build", features.BuildAttachmentSources{"platform_name": "erase", "shell": "worker"}, features.BuildBillingSources{"cc_version": "worker"})
	check(5, "build", features.BuildAttachmentSources{"platform_name": "worker"}, nil)
	check(6, "build", features.BuildAttachmentSources{"platform_name": "worker"}, nil)
	check(7, "direct", nil, nil)
	check(8, "build", features.BuildAttachmentSources{"shell": "erase"}, features.BuildBillingSources{"cc_entrypoint": "worker"})
	// Returning to the first key must restore that key's context, not retain
	// a recently used group's cached policy for the same account.
	check(3, "build", features.BuildAttachmentSources{"os_version": "worker", "shell": "erase"}, features.BuildBillingSources{"cc_version": "worker", "cc_entrypoint": "worker"})
	// Follow clears the complete account record, including relay_mode and
	// both source maps, and must affect the very next model request.
	ap.Mode = "follow"
	ap.Revision = 1
	require.NoError(t, save(ap))
	stored, err := ccgateway.LoadAccountFeaturePolicy(ctx, svc.DB.Pool, 1)
	require.NoError(t, err)
	require.Equal(t, ccgateway.FeatureOverrides{}, stored.Overrides)
	require.EqualValues(t, 2, stored.Revision)
	check(3, "build", features.BuildAttachmentSources{"platform_name": "erase", "os_version": "worker"}, features.BuildBillingSources{"cc_version": "worker"})
	check(8, "direct", nil, nil)
	require.Equal(t, 9, len(e.up.keys()))
	require.EqualValues(t, 9, healthProbes.Load())
}
