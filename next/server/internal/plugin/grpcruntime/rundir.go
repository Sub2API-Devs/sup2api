package grpcruntime

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// maxSocketPath is the longest unix socket path accepted (sun_path is 108
// bytes on Linux and 104 on the BSDs and macOS, including the terminating
// NUL).
const maxSocketPath = 103

// socketSuffixLen is what go-plugin appends below UnixSocketConfig.TempDir:
// "/plugin-dir<up to 10 digits>/plugin<up to 10 digits>".
const socketSuffixLen = len("/plugin-dir") + 10 + len("/plugin") + 10

// runDirTmp is the plugin's TMPDIR inside its run directory.
const runDirTmp = "tmp"

// newRunDir creates the private run directory of one plugin process,
// <root>/<key>-<random>/ with mode 0700, and its tmp/ subdirectory. go-plugin
// puts both unix sockets of the process (the plugin's server and the core's
// broker serving HostService/EgressService) in a directory it creates inside
// it; nothing lands in the shared temporary directory.
//
// Unix socket paths are short. When root is too deep for them, a private
// per-user directory /tmp/sub2api-<uid> (0700, owned by this user, not a
// symlink - anything else is refused) is used instead; fallback reports it.
func newRunDir(root, key string) (dir string, fallback bool, err error) {
	if root == "" {
		return "", false, fmt.Errorf("plugin run directory not configured")
	}
	if root, err = filepath.Abs(root); err != nil {
		return "", false, err
	}
	if runtime.GOOS != "windows" && len(root)+runDirNameLen(key)+socketSuffixLen > maxSocketPath {
		if root, err = fallbackRunRoot(); err != nil {
			return "", false, fmt.Errorf("plugin run directory too long for unix sockets and no fallback: %w; set SUB2API_PLUGIN_RUN_DIR to a shorter path", err)
		}
		fallback = true
	} else {
		if err := os.MkdirAll(root, 0o700); err != nil {
			return "", false, fmt.Errorf("create plugin run directory: %w", err)
		}
		if runtime.GOOS != "windows" {
			// MkdirAll keeps the mode of an existing directory.
			if err := os.Chmod(root, 0o700); err != nil {
				return "", false, fmt.Errorf("restrict plugin run directory: %w", err)
			}
		}
	}
	dir, err = os.MkdirTemp(root, runDirPrefix(key)) // 0700
	if err != nil {
		return "", false, fmt.Errorf("create plugin run directory: %w", err)
	}
	if err := os.Mkdir(filepath.Join(dir, runDirTmp), 0o700); err != nil {
		_ = os.RemoveAll(dir)
		return "", false, fmt.Errorf("create plugin tmp directory: %w", err)
	}
	return dir, fallback, nil
}

// runDirPrefix is the key, at most 12 bytes, and a dash.
func runDirPrefix(key string) string {
	if len(key) > 12 {
		key = key[:12]
	}
	return key + "-"
}

// runDirNameLen bounds "/<prefix><random>" (MkdirTemp appends up to 10
// digits).
func runDirNameLen(key string) int { return 1 + len(runDirPrefix(key)) + 10 }

// runDirEnv points the plugin's temporary directory into its run directory.
func runDirEnv(dir string) []string {
	tmp := filepath.Join(dir, runDirTmp)
	return []string{"TMPDIR=" + tmp, "TEMP=" + tmp, "TMP=" + tmp}
}
