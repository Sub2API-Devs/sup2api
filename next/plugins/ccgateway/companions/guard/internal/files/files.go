// Package files reads and writes the host files the guard mounts into
// containers (03 §6): every path is walked level by level with
// openat(O_NOFOLLOW) from a checked root directory descriptor.
package files

import (
	"errors"
	"regexp"
	"strings"
)

// Error is a rejected path: Why is symlink, hardlink, owner, mode, type,
// name, missing or path.
type Error struct {
	Rel string
	Why string
}

func (e *Error) Error() string { return "mount source rejected: " + e.Rel + ": " + e.Why }

// IsRejected reports an *Error.
func IsRejected(err error) (*Error, bool) {
	var e *Error
	ok := errors.As(err, &e)
	return e, ok
}

// ErrTooLarge is a file over the read limit.
var ErrTooLarge = errors.New("file too large")

// Entry is one directory entry (lstat view).
type Entry struct {
	Name  string
	Type  string // file, dir, symlink, special
	Nlink uint64
	UID   uint32
	Mode  uint32
	Size  int64
	Mtime int64
}

var segment = regexp.MustCompile(`^[A-Za-z0-9._-]{1,64}$`)

// ValidSegment: [A-Za-z0-9._-]{1,64}, not "." or "..".
func ValidSegment(s string) bool { return segment.MatchString(s) && s != "." && s != ".." }

// GatewayFiles are the only names under shared-egress/ (03 §3.7.7).
var GatewayFiles = map[string]bool{
	"boot.json": true, "boot.nft": true, "dns.json": true, "active.nft": true, "operation.json": true,
}

// GatewayDirAllowed is the VerifyDir rule for shared-egress/: the five
// gateway files and temporary files (the guard's and Python's *.tmp).
// state.json is rejected: it holds every account's proxy credentials.
func GatewayDirAllowed(name string) bool {
	if GatewayFiles[name] {
		return true
	}
	if strings.HasPrefix(name, ".") && strings.Contains(name, ".tmp-") {
		base, _, _ := strings.Cut(strings.TrimPrefix(name, "."), ".tmp-")
		return GatewayFiles[base]
	}
	return strings.HasSuffix(name, ".tmp") && name != "state.json.tmp"
}
