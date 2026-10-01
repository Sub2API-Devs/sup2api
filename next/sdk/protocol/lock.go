package protocol

import (
	"regexp"
	"time"
)

// Cluster lock rules (HostService.LockAcquire / LockRenew / LockRelease),
// shared by the host, which enforces them, and the SDK, which checks them
// before sending a request, so both sides always agree.
const (
	// LockMinTTL and LockMaxTTL bound ttl_ms (1s..5m).
	LockMinTTL = time.Second
	LockMaxTTL = 5 * time.Minute

	// LockNamePattern is the rule for a lock name.
	LockNamePattern = `^[A-Za-z0-9._:/-]{1,128}$`
	// LockTokenPattern is the rule for an owner token (URL-safe base64 or
	// hex). It checks the form only: the token's randomness is the plugin's
	// job. The SDK sends 16 random bytes as 22 characters of unpadded
	// URL-safe base64.
	LockTokenPattern = `^[A-Za-z0-9_-]{16,128}$`
)

var (
	lockNameRe  = regexp.MustCompile(LockNamePattern)
	lockTokenRe = regexp.MustCompile(LockTokenPattern)
)

// ValidLockName reports whether name matches LockNamePattern.
func ValidLockName(name string) bool { return lockNameRe.MatchString(name) }

// ValidLockToken reports whether token matches LockTokenPattern.
func ValidLockToken(token string) bool { return lockTokenRe.MatchString(token) }

// ValidLockTTL reports whether ttl is within LockMinTTL..LockMaxTTL.
func ValidLockTTL(ttl time.Duration) bool { return ttl >= LockMinTTL && ttl <= LockMaxTTL }

// LockTTLFromMs converts a request's ttl_ms, reporting false when it is out
// of range. The range is checked in milliseconds, before the conversion, so a
// huge value cannot overflow time.Duration into range.
func LockTTLFromMs(ms int64) (time.Duration, bool) {
	if ms < LockMinTTL.Milliseconds() || ms > LockMaxTTL.Milliseconds() {
		return 0, false
	}
	return time.Duration(ms) * time.Millisecond, true
}
