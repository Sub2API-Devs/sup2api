package ccgateway

import (
	"fmt"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestQueryAccountQuotaRawRuntime(t *testing.T) {
	for _, shared := range []bool{false, true} {
		t.Run(fmt.Sprint(shared), func(t *testing.T) {
			var calls atomic.Int32
			var code atomic.Int32
			var large atomic.Bool
			var accountID atomic.Int64
			code.Store(200)
			f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				require.Equal(t, http.MethodGet, r.Method)
				require.Equal(t, "Bearer controller-secret", r.Header.Get("Authorization"))
				if shared {
					require.Equal(t, "/admin/usage", r.URL.Path)
				} else {
					require.Equal(t, fmt.Sprintf("/accounts/%d/admin/usage", accountID.Load()), r.URL.Path)
					require.NotEmpty(t, r.Header.Get("X-CCG-Revision"))
				}
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Set-Cookie", "secret=x")
				w.Header().Set("Authorization", "secret")
				w.WriteHeader(int(code.Load()))
				if large.Load() {
					fmt.Fprint(w, strings.Repeat("x", maxUsageBody+9))
					return
				}
				fmt.Fprint(w, `{"opaque_provider_fact":42}`)
			})
			f.runtimes(!shared)
			id := f.account(true)
			accountID.Store(id)
			for _, status := range []int32{200, 400, 404, 409, 503} {
				code.Store(status)
				out, err := f.s.QueryAccountQuota(t.Context(), id, "usage")
				require.NoError(t, err)
				require.Equal(t, status, out.Status)
				require.Equal(t, `{"opaque_provider_fact":42}`, string(out.Body))
				require.Empty(t, out.Headers["set-cookie"])
				require.Empty(t, out.Headers["authorization"])
				require.Equal(t, "application/json", out.Headers["content-type"])
			}
			large.Store(true)
			out, err := f.s.QueryAccountQuota(t.Context(), id, "usage")
			require.NoError(t, err)
			require.True(t, out.Truncated)
			require.Len(t, out.Body, maxUsageBody)
			before := calls.Load()
			for _, op := range []string{"", "start", "../admin/usage", "usage?account=2"} {
				_, err := f.s.QueryAccountQuota(t.Context(), id, op)
				require.Error(t, err)
			}
			_, err = f.s.QueryAccountQuota(t.Context(), id+100000, "usage")
			require.Error(t, err)
			require.Equal(t, before, calls.Load())
			// A disabled account is only kept out of scheduling; its usage is queried.
			_, err = f.db.Pool.Exec(t.Context(), `UPDATE accounts SET status='disabled' WHERE id=$1`, id)
			require.NoError(t, err)
			_, err = f.s.QueryAccountQuota(t.Context(), id, "usage")
			require.NoError(t, err)
			require.Equal(t, before+1, calls.Load())
		})
	}
}
