package ccgateway

import (
	"errors"
	"fmt"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/stretchr/testify/require"
)

func TestRefreshTokenAction(t *testing.T) {
	var answer atomic.Value
	var calls atomic.Int32
	var accountID atomic.Int64
	answer.Store([2]any{200, `{"refreshed":true,"expires_at":"2026-10-15T20:04:00Z"}`})
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		require.Equal(t, http.MethodPost, r.Method)
		require.Equal(t, fmt.Sprintf("/accounts/%d/admin/auth/refresh", accountID.Load()), r.URL.Path)
		require.Equal(t, "Bearer controller-secret", r.Header.Get("Authorization"))
		require.NotEmpty(t, r.Header.Get("X-CCG-Revision"))
		a := answer.Load().([2]any)
		w.WriteHeader(a[0].(int))
		fmt.Fprint(w, a[1].(string))
	})
	f.runtimes(true)
	id := f.account(true)
	accountID.Store(id)

	out, err := f.s.AccountAction(t.Context(), id, "refresh_token")
	require.NoError(t, err)
	require.Equal(t, map[string]any{"refreshed": true, "expires_at": time.Date(2026, 10, 15, 20, 4, 0, 0, time.UTC)}, out)

	for _, tc := range []struct {
		status int
		body   string
		reason string
	}{
		{400, `{"type":"error","error":{"type":"refresh_failed","message":"Claude Code could not renew the stored OAuth token"}}`, "refresh_failed"},
		{400, `{"type":"error","error":{"type":"not_logged_in","message":"Claude Code is not signed in"}}`, "not_logged_in"},
		{409, `{"error":"not_synchronized"}`, "not_synchronized"},
		{200, `{"refreshed":true}`, "runtime_unavailable"},
	} {
		answer.Store([2]any{tc.status, tc.body})
		_, err := f.s.AccountAction(t.Context(), id, "refresh_token")
		var e *core.Error
		require.True(t, errors.As(err, &e), tc.body)
		require.Equal(t, tc.reason, reasonOf(e), tc.body)
	}

	before := calls.Load()
	_, err = f.db.Pool.Exec(t.Context(), `UPDATE accounts SET type='apikey' WHERE id=$1`, id)
	require.NoError(t, err)
	_, err = f.s.AccountAction(t.Context(), id, "refresh_token")
	var e *core.Error
	require.True(t, errors.As(err, &e))
	require.Equal(t, "api_key_account", reasonOf(e))
	_, err = f.s.AccountAction(t.Context(), id+100000, "refresh_token")
	require.ErrorIs(t, err, core.ErrNotFound)
	require.Equal(t, before, calls.Load())
}
