package apikey

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ratelimit"
)

// PATCH /me/api-keys/:id switches the owner's key off and on and moves it to
// another usable group; authentication sees each change on the next call.
func TestAPIKeyStatusAndGroupUpdate(t *testing.T) {
	e := setup(t)
	first := e.exec1(`INSERT INTO groups (name) VALUES ('first') RETURNING id`)
	second := e.exec1(`INSERT INTO groups (name) VALUES ('second') RETURNING id`)
	restricted := e.exec1(`INSERT INTO groups (name, visibility) VALUES ('restricted', 'restricted') RETURNING id`)
	status, out := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "laptop", "group_id": first})
	require.Equal(t, 201, status)
	key := out["data"].(map[string]any)
	raw := key["key"].(string)
	path := fmt.Sprintf("/me/api-keys/%d", int64(key["id"].(float64)))

	status, out = e.do(e.user, "PATCH", path, map[string]any{"status": "disabled"})
	require.Equal(t, 200, status)
	require.Equal(t, "disabled", out["data"].(map[string]any)["status"])
	require.NotContains(t, out["data"], "key")
	_, err := e.svc.Authenticate(t.Context(), raw)
	require.Equal(t, "unauthenticated", codeOf(err))

	status, _ = e.do(e.user, "PATCH", path, map[string]any{"status": "active", "group_id": second})
	require.Equal(t, 200, status)
	p, err := e.svc.Authenticate(t.Context(), raw)
	require.NoError(t, err)
	require.Equal(t, second, p.Group.ID)

	for _, body := range []map[string]any{{}, {"status": "expired"}, {"group_id": restricted}} {
		status, _ = e.do(e.user, "PATCH", path, body)
		require.Equal(t, 400, status, body)
	}
	status, _ = e.do(e.admin, "PATCH", path, map[string]any{"status": "disabled"})
	require.Equal(t, 404, status, "another user's key")
	p, err = e.svc.Authenticate(t.Context(), raw)
	require.NoError(t, err)
	require.Equal(t, second, p.Group.ID)

	var audits int
	require.NoError(t, e.db.Pool.QueryRow(t.Context(), `SELECT count(*) FROM audit_logs WHERE action='apikey.update' AND user_id=$1`, e.user).Scan(&audits))
	require.Equal(t, 2, audits)
}

// The owner sets the caps on create and PATCH; authentication hands them to
// the gateway, and the list reports their live use (CONTRACTS §60).
func TestAPIKeyCapsSetByOwner(t *testing.T) {
	e := setup(t)
	e.svc.Windows, e.svc.Slots = ratelimit.NewMinute(redis.NewClient(&redis.Options{Addr: e.mr.Addr()}), "apikey"), liveSlots{}
	group := e.exec1(`INSERT INTO groups (name) VALUES ('caps') RETURNING id`)
	status, out := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "ci", "group_id": group, "rpm_limit": 60, "tpm_limit": 100000, "max_concurrency": 2})
	require.Equal(t, 201, status, out)
	key := out["data"].(map[string]any)
	require.Equal(t, []any{float64(60), float64(100000), float64(2)}, []any{key["rpm_limit"], key["tpm_limit"], key["max_concurrency"]})
	raw, id := key["key"].(string), int64(key["id"].(float64))
	p, err := e.svc.Authenticate(t.Context(), raw)
	require.NoError(t, err)
	require.Equal(t, core.KeyLimits{RPM: 60, TPM: 100000, Concurrency: 2}, p.KeyLimits)

	path := fmt.Sprintf("/me/api-keys/%d", id)
	status, _ = e.do(e.user, "PATCH", path, map[string]any{"rpm_limit": 0, "max_concurrency": 5})
	require.Equal(t, 200, status)
	p, err = e.svc.Authenticate(t.Context(), raw)
	require.NoError(t, err)
	require.Equal(t, core.KeyLimits{RPM: 0, TPM: 100000, Concurrency: 5}, p.KeyLimits, "absent fields stay, 0 clears")

	for _, body := range []map[string]any{{"rpm_limit": -1}, {"tpm_limit": maxTPM + 1}, {"max_concurrency": maxConcurrency + 1}} {
		status, _ = e.do(e.user, "PATCH", path, body)
		require.Equal(t, 400, status, body)
	}
	status, _ = e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "bad", "group_id": group, "rpm_limit": -5})
	require.Equal(t, 400, status)

	_, _, err = e.svc.Windows.Admit(t.Context(), id, 0, 0)
	require.NoError(t, err)
	e.svc.Slots = liveSlots{id: 2}
	status, out = e.do(e.user, "GET", "/me/api-keys", nil)
	require.Equal(t, 200, status)
	live := out["data"].([]any)[0].(map[string]any)["live"].(map[string]any)
	require.Equal(t, map[string]any{"rpm": float64(1), "tpm": float64(0), "concurrency": float64(2)}, live)
}

// liveSlots reports fixed slots in use per key id.
type liveSlots map[int64]int

func (liveSlots) Acquire(context.Context, string, int64, int, string) (func(), bool, error) {
	return func() {}, true, nil
}
func (s liveSlots) InUse(_ context.Context, _ string, id int64) (int, error) { return s[id], nil }
func (s liveSlots) InUseMany(_ context.Context, _ string, ids []int64) (map[int64]int, error) {
	out := map[int64]int{}
	for _, id := range ids {
		out[id] = s[id]
	}
	return out, nil
}

// The owner sets a quota in USD, sees what was used and may reset it;
// authentication hands both to the gateway (CONTRACTS §61).
func TestAPIKeyQuotaSetByOwner(t *testing.T) {
	e := setup(t)
	group := e.exec1(`INSERT INTO groups (name) VALUES ('quota') RETURNING id`)
	status, out := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "budget", "group_id": group, "quota_limit": "10.5"})
	require.Equal(t, 201, status, out)
	key := out["data"].(map[string]any)
	require.Equal(t, []any{"10.5", "0"}, []any{key["quota_limit"], key["quota_used"]})
	raw, id := key["key"].(string), int64(key["id"].(float64))
	e.exec(`UPDATE api_keys SET quota_used = 10.5 WHERE id = $1`, id)
	p, err := e.svc.Authenticate(t.Context(), raw)
	require.NoError(t, err)
	require.True(t, p.KeyQuota.Exhausted())

	path := fmt.Sprintf("/me/api-keys/%d", id)
	status, out = e.do(e.user, "PATCH", path, map[string]any{"quota_limit": 20})
	require.Equal(t, 200, status)
	require.Equal(t, "20", out["data"].(map[string]any)["quota_limit"])
	p, _ = e.svc.Authenticate(t.Context(), raw)
	require.False(t, p.KeyQuota.Exhausted())

	status, out = e.do(e.user, "PATCH", path, map[string]any{"reset_quota": true})
	require.Equal(t, 200, status)
	require.Equal(t, []any{"20", "0"}, []any{out["data"].(map[string]any)["quota_limit"], out["data"].(map[string]any)["quota_used"]})

	for _, body := range []map[string]any{{"quota_limit": -1}, {"quota_limit": "0.000000001"}, {"quota_limit": 2e9}} {
		status, _ = e.do(e.user, "PATCH", path, body)
		require.Equal(t, 400, status, body)
	}
	status, out = e.do(e.user, "PATCH", path, map[string]any{"quota_limit": 0})
	require.Equal(t, 200, status)
	require.Equal(t, "0", out["data"].(map[string]any)["quota_limit"], "0 removes the quota")
}

// The edit form saves the name, expiry and IP allowlist with the same PATCH;
// expires_at null removes the expiry and absent fields stay.
func TestAPIKeyEditFields(t *testing.T) {
	e := setup(t)
	group := e.exec1(`INSERT INTO groups (name) VALUES ('edit') RETURNING id`)
	expiry := time.Now().Add(48 * time.Hour).UTC().Truncate(time.Second)
	status, out := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "old", "group_id": group, "expires_at": expiry, "allowed_ips": []string{"192.0.2.7"}})
	require.Equal(t, 201, status, out)
	raw, path := out["data"].(map[string]any)["key"].(string), fmt.Sprintf("/me/api-keys/%d", int64(out["data"].(map[string]any)["id"].(float64)))

	status, out = e.do(e.user, "PATCH", path, map[string]any{"name": "  renamed  ", "allowed_ips": []string{"198.51.100.9/24"}})
	require.Equal(t, 200, status, out)
	k := out["data"].(map[string]any)
	require.Equal(t, "renamed", k["name"])
	require.Equal(t, []any{"198.51.100.0/24"}, k["allowed_ips"])
	require.NotNil(t, k["expires_at"], "an absent expiry stays")
	_, err := e.svc.Authenticate(core.WithClientIP(t.Context(), "192.0.2.7"), raw)
	require.Equal(t, "ip_not_allowed", codeOf(err))

	status, out = e.do(e.user, "PATCH", path, map[string]any{"expires_at": nil, "allowed_ips": []string{}})
	require.Equal(t, 200, status, out)
	require.Nil(t, out["data"].(map[string]any)["expires_at"])
	_, err = e.svc.Authenticate(core.WithClientIP(t.Context(), "192.0.2.7"), raw)
	require.NoError(t, err)

	for _, body := range []map[string]any{{"name": " "}, {"expires_at": "yesterday"}, {"expires_at": time.Now().Add(-time.Hour)}, {"allowed_ips": []string{"bad"}}} {
		status, _ = e.do(e.user, "PATCH", path, body)
		require.Equal(t, 400, status, body)
	}
}
