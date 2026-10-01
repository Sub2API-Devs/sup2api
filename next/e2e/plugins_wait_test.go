package e2e

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

func TestWaitPluginDoesNotReturnDuringDisableRollout(t *testing.T) {
	for _, firstStatus := range []int{http.StatusOK, http.StatusInternalServerError, http.StatusServiceUnavailable} {
		t.Run(fmt.Sprint(firstStatus), func(t *testing.T) {
			var rolloutReads atomic.Int64
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				switch r.URL.Path {
				case "/api/v1/plugins/guard/rollouts/current":
					if rolloutReads.Add(1) == 1 {
						w.WriteHeader(firstStatus)
						fmt.Fprint(w, `{"data":{"phase":"activating","action":"disable"}}`)
					} else {
						fmt.Fprint(w, `{"data":null}`)
					}
				case "/api/v1/plugins/guard":
					fmt.Fprint(w, `{"data":{"status":"disabled","active_version":"0.2.0"}}`)
				default:
					http.NotFound(w, r)
				}
			}))
			defer srv.Close()
			e := &Env{Config: &Config{}, T: t}
			e.WaitPlugin(&Session{Client: NewClient(srv.URL)}, "guard", "disabled", "")
			if got := rolloutReads.Load(); got < 2 {
				t.Fatalf("returned without confirming rollout completion after HTTP %d: rollout reads=%d", firstStatus, got)
			}
		})
	}
}
