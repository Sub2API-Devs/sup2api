// Package procguard keeps the core's own secrets away from other processes
// of the same user, plugins included (audit 2026-10-09, P0-1).
//
// After the configuration is loaded the core no longer needs the secret
// environment variables: ScrubEnv removes them from the process environment
// (so nothing started later inherits them and a stray os.Getenv sees
// nothing) and, on Linux, also blanks their values in the initial
// environment block that /proc/<pid>/environ shows. DisableDumping then marks
// the process non-dumpable, which makes /proc/<pid>/{environ,mem,maps,...}
// unreadable to other processes of the same user and refuses ptrace.
package procguard

import (
	"os"
	"strings"
)

// ScrubEnv removes keys from the environment. On Linux the values are also
// overwritten in the initial environment block; an error there is returned
// after the variables were removed from the Go environment, so the caller
// may log it and continue.
func ScrubEnv(keys []string) error {
	drop := map[string]bool{}
	for _, k := range keys {
		if k = strings.TrimSpace(k); k != "" {
			drop[k] = true
			_ = os.Unsetenv(k)
		}
	}
	if len(drop) == 0 {
		return nil
	}
	return scrubInitialEnv(drop)
}

// DisableDumping marks the process non-dumpable (Linux: PR_SET_DUMPABLE 0).
// Elsewhere it does nothing.
func DisableDumping() error { return disableDumping() }

// Dumpable reports the dumpable flag (Linux); elsewhere it returns true.
func Dumpable() (bool, error) { return dumpable() }

// blankValues overwrites, inside a NUL separated "KEY=value" block, the
// value bytes of every entry whose key is in drop. It returns whether
// anything changed.
func blankValues(block []byte, drop map[string]bool) bool {
	changed := false
	start := 0
	for start < len(block) {
		end := start
		for end < len(block) && block[end] != 0 {
			end++
		}
		entry := block[start:end]
		if eq := indexByte(entry, '='); eq > 0 && drop[string(entry[:eq])] {
			for i := start + eq + 1; i < end; i++ {
				if block[i] != 0 {
					block[i] = 0
					changed = true
				}
			}
		}
		start = end + 1
	}
	return changed
}

func indexByte(b []byte, c byte) int {
	for i, x := range b {
		if x == c {
			return i
		}
	}
	return -1
}
