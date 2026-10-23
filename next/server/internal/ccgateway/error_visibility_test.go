package ccgateway

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

// The controller's reason for refusing a configuration reaches the sync
// endpoint (and the reconcile log) as details.reason instead of a blanket
// sync_failed (audit B1).
func TestSyncReportsTheControllerReason(t *testing.T) {
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/health":
			_, _ = w.Write([]byte(`{"features":["cli-profile-v1"]}`))
		case strings.HasSuffix(r.URL.Path, "/status"):
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending"})
		case strings.HasSuffix(r.URL.Path, "/config"):
			w.WriteHeader(http.StatusConflict)
			_, _ = w.Write([]byte(`{"error":"cli_profile_unavailable"}`))
		default:
			t.Errorf("unexpected controller call %s", r.URL.Path)
		}
	})
	id := f.account(false)
	code, out := f.call("POST", id, "sync", `{}`)
	require.Equal(t, http.StatusServiceUnavailable, code, out)
	require.Equal(t, "cli_profile_unavailable", reason(out))
	e, _ := out["error"].(map[string]any)
	require.Contains(t, e["message"], "Claude Code version")
	require.EqualValues(t, 409, e["details"].(map[string]any)["status"])
}

// A refused controller answer without a code stays sync_failed; an unknown
// code is named as such.
func TestSyncErrorMapsControllerCodes(t *testing.T) {
	e := syncError(503, []byte(`{"error":"some_future_code"}`))
	require.Equal(t, "some_future_code", e.Details["reason"])
	require.Contains(t, e.Message, "some_future_code", "an unknown code is named as such")
	require.Equal(t, reasonMessages["egress_not_ready"], syncError(503, []byte(`{"error":"egress_not_ready"}`)).Message)
	e = syncError(500, []byte(`internal server error`))
	require.Equal(t, "sync_failed", e.Details["reason"])
	e = syncError(409, []byte(`{"error":"disk_quota_unavailable"}`))
	require.Equal(t, "disk_quota_unavailable", e.Details["reason"])
	require.Equal(t, reasonMessages["disk_quota_unavailable"], e.Message)
}

// Saving the configuration says what is wrong with it (audit A5), and a CC
// feature group whose group was deleted meanwhile is dropped on the next save
// instead of lingering.
func TestSaveNamesTheProblemAndPrunesDeletedGroups(t *testing.T) {
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) { http.NotFound(w, r) })
	uid := f.user("owner@test")
	f.auth.keys[uid] = []string{"settings:manage", "settings:read"}
	ctx := context.Background()
	var gid int64
	require.NoError(t, f.db.Pool.QueryRow(ctx, `INSERT INTO groups(name) VALUES('cc-'||clock_timestamp()::text) RETURNING id`).Scan(&gid))
	key := strconv.FormatInt(gid, 10)
	code, out := f.request(uid, "PUT", "/system/ccgateway/remote-config", `{"mode":"disabled","request_policy":{"schema_version":1,"relay_mode":"native"}}`)
	require.Equal(t, 400, code, out)
	e, _ := out["error"].(map[string]any)
	require.Contains(t, e["message"], "relay_mode", "the validation message, not a blanket one")
	code, out = f.request(uid, "PUT", "/system/ccgateway/remote-config", `{"mode":"disabled","cc_feature_groups":{"999999":{"enabled":true,"overrides":{}}}}`)
	require.Equal(t, 400, code, out)
	e, _ = out["error"].(map[string]any)
	require.Equal(t, "Unknown CC feature group.", e["message"])
	code, out = f.request(uid, "PUT", "/system/ccgateway/remote-config", `{"mode":"disabled","cc_feature_groups":{"`+key+`":{"enabled":true,"overrides":{"level":"none"}}}}`)
	require.Equal(t, 200, code, out)
	cfg, err := f.s.Load(ctx)
	require.NoError(t, err)
	require.Contains(t, cfg.CCFeatureGroups, key)
	_, err = f.db.Pool.Exec(ctx, `DELETE FROM groups WHERE id=$1`, gid)
	require.NoError(t, err)
	// The orphan is still stored; the next save (not naming it) drops it.
	cfg, err = f.s.Load(ctx)
	require.NoError(t, err)
	require.Contains(t, cfg.CCFeatureGroups, key)
	code, out = f.request(uid, "PUT", "/system/ccgateway/remote-config", `{"mode":"disabled","feature_revision":`+strconv.FormatInt(cfg.FeatureRevision, 10)+`}`)
	require.Equal(t, 200, code, out)
	cfg, err = f.s.Load(ctx)
	require.NoError(t, err)
	require.NotContains(t, cfg.CCFeatureGroups, key)
}
