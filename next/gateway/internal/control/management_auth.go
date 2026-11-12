package control

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"time"
)

// The management socket's file mode does not separate processes of the same
// UID, and the core's plugins run as the shell's UID. Every request on the
// socket therefore carries a per-boot bearer token:
//
//	Authorization: Bearer <64 hex characters>
//
// The shell writes the token to a mode-0600 file before it starts a core and
// passes the core only the file's path (SUB2API_UPDATER_TOKEN_FILE). Local
// operator commands read the same file.
//
// A mode-0600 file does not hide the token from a same-UID plugin by itself:
// that separation comes from the plugin sandbox's Landlock rules, which deny
// plugins the shell's state directory. The gateway therefore turns Landlock
// on for the core it supervises (config.coreEnvironment) unless the operator
// explicitly disables it.
const managementTokenBytes = 32

// NewManagementToken returns a fresh random management token.
func NewManagementToken() (string, error) {
	b := make([]byte, managementTokenBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func validManagementToken(token string) bool {
	if len(token) != 2*managementTokenBytes {
		return false
	}
	_, err := hex.DecodeString(token)
	return err == nil
}

// WriteManagementToken atomically replaces path with token, mode 0600. The
// rename replaces a planted symlink instead of following it.
func WriteManagementToken(path, token string) error {
	if !validManagementToken(token) {
		return errors.New("invalid management token")
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}
	f, err := os.CreateTemp(dir, ".shell-token-")
	if err != nil {
		return err
	}
	defer os.Remove(f.Name())
	if err = f.Chmod(0600); err == nil {
		if _, err = f.WriteString(token + "\n"); err == nil {
			err = f.Sync()
		}
	}
	if ce := f.Close(); err == nil {
		err = ce
	}
	if err != nil {
		return err
	}
	return os.Rename(f.Name(), path)
}

// ReadManagementToken reads a token written by WriteManagementToken.
func ReadManagementToken(path string) (string, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	token := strings.TrimSpace(string(b))
	if !validManagementToken(token) {
		return "", errors.New("management token file is malformed")
	}
	return token, nil
}

// tokenlessStats is how the migration switch stands in this process (a
// gateway serves one management socket): whether RequireManagementToken
// serves requests without a token, and how many it served. /metrics exports
// both and the upgrade preflight warns while the switch is on, so the
// operator can tell when it is safe to clear.
var tokenlessStats struct {
	enabled  atomic.Bool
	accepted atomic.Int64
}

// tokenlessWarning is the preflight warning of the switch left on.
const tokenlessWarning = "tokenless management is enabled; clear it once every core sends the token"

// writeTokenlessMetrics writes tokenlessStats in the Prometheus text format.
func writeTokenlessMetrics(w io.Writer) {
	enabled := 0
	if tokenlessStats.enabled.Load() {
		enabled = 1
	}
	fmt.Fprintf(w, "# HELP gateway_management_tokenless_enabled Whether management requests without a token are served (1) or not (0)\n")
	fmt.Fprintf(w, "# TYPE gateway_management_tokenless_enabled gauge\n")
	fmt.Fprintf(w, "gateway_management_tokenless_enabled %d\n", enabled)
	fmt.Fprintf(w, "# HELP gateway_management_tokenless_accepted_total Management requests served without a token\n")
	fmt.Fprintf(w, "# TYPE gateway_management_tokenless_accepted_total counter\n")
	fmt.Fprintf(w, "gateway_management_tokenless_accepted_total %d\n", tokenlessStats.accepted.Load())
}

// RequireManagementToken admits only requests that carry token. With
// allowMissing, a request without any Authorization header is still served
// (logged and counted in tokenlessStats) so a core release that predates the
// token keeps working during a migration; a present but wrong token is always
// rejected.
func RequireManagementToken(token string, allowMissing bool, next http.Handler) http.Handler {
	want := []byte("Bearer " + token)
	var lastWarn atomic.Int64
	tokenlessStats.enabled.Store(allowMissing)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got := r.Header.Get("Authorization")
		if got == "" && allowMissing {
			tokenlessStats.accepted.Add(1)
			if now := time.Now().Unix(); lastWarn.Swap(now) < now-60 {
				slog.Warn("management request without token accepted; remove allow_tokenless_management once every core sends it", "method", r.Method, "path", r.URL.Path)
			}
			next.ServeHTTP(w, r)
			return
		}
		if token == "" || subtle.ConstantTimeCompare([]byte(got), want) != 1 {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("WWW-Authenticate", "Bearer")
			w.WriteHeader(http.StatusUnauthorized)
			_ = json.NewEncoder(w).Encode(map[string]any{"error": map[string]string{"code": "updater_unauthorized", "message": "management token required"}})
			return
		}
		next.ServeHTTP(w, r)
	})
}
