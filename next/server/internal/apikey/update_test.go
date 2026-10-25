package apikey

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
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
