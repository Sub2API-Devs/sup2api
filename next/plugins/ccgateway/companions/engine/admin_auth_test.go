package engine

import (
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

// Every management endpoint takes the key one way: "Bearer <key>", never an
// empty key, never the bare key (audit C13).
func TestAdminAuthorizedIsTheOneManagementCheck(t *testing.T) {
	for _, tc := range []struct {
		header, key string
		ok          bool
	}{
		{"Bearer admin", "admin", true},
		{"admin", "admin", false},
		{"Bearer admin2", "admin", false},
		{"Bearer ", "", false},
		{"", "", false},
		{"bearer admin", "admin", false},
	} {
		r := httptest.NewRequest("GET", "/admin/status", nil)
		if tc.header != "" {
			r.Header.Set("Authorization", tc.header)
		}
		require.Equal(t, tc.ok, AdminAuthorized(r, tc.key), "%q / %q", tc.header, tc.key)
	}
	// Each endpoint keeps its own refusal: the management answer is JSON.
	rt := &Runtime{admin: &authManager{key: "admin"}}
	for _, serve := range []func(*httptest.ResponseRecorder, string){
		func(w *httptest.ResponseRecorder, h string) {
			r := httptest.NewRequest("GET", "/admin/status", nil)
			r.Header.Set("Authorization", h)
			rt.admin.ServeHTTP(w, r)
		},
		func(w *httptest.ResponseRecorder, h string) {
			r := httptest.NewRequest("GET", "/admin/runtime", nil)
			r.Header.Set("Authorization", h)
			rt.serveRuntimeMaintenance(w, r)
		},
		func(w *httptest.ResponseRecorder, h string) {
			r := httptest.NewRequest("GET", "/admin/cli", nil)
			r.Header.Set("Authorization", h)
			rt.serveCLI(w, r)
		},
	} {
		for _, header := range []string{"admin", "Bearer wrong", ""} {
			w := httptest.NewRecorder()
			serve(w, header)
			require.Equal(t, 401, w.Code, header)
			require.Contains(t, w.Body.String(), "Invalid management key")
		}
	}
}
