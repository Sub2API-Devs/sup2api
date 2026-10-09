package control

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/pluginblob"
)

func TestManagementTokenRequired(t *testing.T) {
	token, err := NewManagementToken()
	if err != nil {
		t.Fatal(err)
	}
	other, err := NewManagementToken()
	if err != nil {
		t.Fatal(err)
	}
	if token == other || len(token) != 64 {
		t.Fatalf("tokens are not fresh 32-byte values: %q %q", token, other)
	}
	reached := 0
	inner := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { reached++; w.WriteHeader(204) })
	for _, allowMissing := range []bool{false, true} {
		h := RequireManagementToken(token, allowMissing, inner)
		for _, tc := range []struct {
			name, header string
			want         int
		}{
			{"missing", "", 401},
			{"wrong token", "Bearer " + other, 401},
			{"bare token", token, 401},
			{"wrong scheme", "Basic " + token, 401},
			{"token prefix", "Bearer " + token[:32], 401},
			{"token with suffix", "Bearer " + token + "x", 401},
			{"lowercase scheme", "bearer " + token, 401},
			{"valid", "Bearer " + token, 204},
		} {
			if allowMissing && tc.name == "missing" {
				tc.want = 204 // migration mode serves requests without any header
			}
			reached = 0
			req := httptest.NewRequest("GET", "http://shell/system/upgrades", nil)
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			w := httptest.NewRecorder()
			h.ServeHTTP(w, req)
			if w.Code != tc.want {
				t.Errorf("allowMissing=%v %s: status %d want %d", allowMissing, tc.name, w.Code, tc.want)
			}
			if (tc.want == 401) != (reached == 0) {
				t.Errorf("allowMissing=%v %s: handler reached %d times", allowMissing, tc.name, reached)
			}
			if tc.want == 401 && (!strings.Contains(w.Body.String(), "updater_unauthorized") || w.Header().Get("WWW-Authenticate") != "Bearer") {
				t.Errorf("allowMissing=%v %s: unexpected 401 response %q", allowMissing, tc.name, w.Body.String())
			}
		}
	}
	// An empty token never matches, even "Bearer ".
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "http://shell/system/upgrades", nil)
	req.Header.Set("Authorization", "Bearer ")
	RequireManagementToken("", false, inner).ServeHTTP(w, req)
	if w.Code != 401 {
		t.Fatalf("empty token accepted: %d", w.Code)
	}
}

// Every route of the management socket - updater API, plugin packages and
// metrics - is behind the token.
func TestManagementHandlerRoutesRequireToken(t *testing.T) {
	token, err := NewManagementToken()
	if err != nil {
		t.Fatal(err)
	}
	blobs := &pluginblob.Service{Store: &pluginblob.Store{Dir: t.TempDir()}}
	h := RequireManagementToken(token, false, ManagementHandler(&Store{}, blobs))
	sum := strings.Repeat("a", 64)
	for _, tc := range []struct{ method, path string }{
		{"GET", "/system/upgrades"},
		{"GET", "/system/releases"},
		{"POST", "/system/upgrades"},
		{"POST", "/system/upgrades/x/rollback"},
		{"POST", "/system/nodes/n/disable"},
		{"GET", "/system/offload"},
		{"PUT", "/system/update-source"},
		{"GET", "/system/plugin-blobs/" + sum},
		{"PUT", "/system/plugin-blobs/" + sum},
		{"GET", "/metrics"},
	} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest(tc.method, "http://shell"+tc.path, strings.NewReader("{}")))
		if w.Code != 401 {
			t.Errorf("%s %s without token: %d", tc.method, tc.path, w.Code)
		}
	}
	// With the token the request reaches the handler: a malformed package
	// name is a 404 from the blob service, not a 401.
	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "http://shell/system/plugin-blobs/not-a-digest", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	h.ServeHTTP(w, req)
	if w.Code != 404 {
		t.Fatalf("valid token: status %d, want the handler's 404", w.Code)
	}
}

func TestManagementTokenFile(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "runtime")
	path := filepath.Join(dir, "shell.token")
	token, err := NewManagementToken()
	if err != nil {
		t.Fatal(err)
	}
	if err = WriteManagementToken(path, token); err != nil {
		t.Fatal(err)
	}
	got, err := ReadManagementToken(path)
	if err != nil || got != token {
		t.Fatalf("read back %q %v", got, err)
	}
	if runtime.GOOS != "windows" {
		info, err := os.Stat(path)
		if err != nil {
			t.Fatal(err)
		}
		if info.Mode().Perm() != 0600 {
			t.Fatalf("token file mode %v", info.Mode().Perm())
		}
		dirInfo, err := os.Stat(dir)
		if err != nil {
			t.Fatal(err)
		}
		if dirInfo.Mode().Perm() != 0700 {
			t.Fatalf("token directory mode %v", dirInfo.Mode().Perm())
		}
		// A planted symlink is replaced, never written through.
		target := filepath.Join(t.TempDir(), "target")
		if err = os.WriteFile(target, []byte("keep"), 0600); err != nil {
			t.Fatal(err)
		}
		if err = os.Remove(path); err != nil {
			t.Fatal(err)
		}
		if err = os.Symlink(target, path); err != nil {
			t.Fatal(err)
		}
		if err = WriteManagementToken(path, token); err != nil {
			t.Fatal(err)
		}
		if b, _ := os.ReadFile(target); string(b) != "keep" {
			t.Fatal("token written through a symlink")
		}
		if info, err = os.Lstat(path); err != nil || info.Mode()&os.ModeSymlink != 0 {
			t.Fatalf("symlink not replaced: %v %v", info, err)
		}
	}
	// A new boot replaces the token; the old one stops being valid.
	next, err := NewManagementToken()
	if err != nil {
		t.Fatal(err)
	}
	if err = WriteManagementToken(path, next); err != nil {
		t.Fatal(err)
	}
	if got, _ = ReadManagementToken(path); got != next {
		t.Fatal("token not replaced")
	}
	if err = WriteManagementToken(path, "short"); err == nil {
		t.Fatal("malformed token written")
	}
	if err = os.WriteFile(path, []byte("not-a-token"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err = ReadManagementToken(path); err == nil {
		t.Fatal("malformed token file accepted")
	}
	if _, err = ReadManagementToken(filepath.Join(dir, "missing")); err == nil {
		t.Fatal("missing token file accepted")
	}
}
