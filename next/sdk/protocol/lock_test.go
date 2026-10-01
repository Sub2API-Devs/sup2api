package protocol

import (
	"math"
	"strings"
	"testing"
	"time"
)

func TestLockRules(t *testing.T) {
	for _, c := range []struct {
		ms int64
		ok bool
	}{
		{999, false}, {1000, true}, {300000, true}, {300001, false}, {0, false}, {-1, false},
		// Would wrap around into range if converted before the check.
		{math.MaxInt64, false}, {math.MaxInt64/int64(time.Millisecond) + 2000, false},
	} {
		d, ok := LockTTLFromMs(c.ms)
		if ok != c.ok || (ok && d != time.Duration(c.ms)*time.Millisecond) {
			t.Errorf("LockTTLFromMs(%d) = %v, %v", c.ms, d, ok)
		}
		if ok && !ValidLockTTL(d) {
			t.Errorf("ValidLockTTL(%v) disagrees", d)
		}
	}
	for tok, ok := range map[string]bool{
		strings.Repeat("a", 16): true, strings.Repeat("Z", 128): true, "Ab0_-Ab0_-Ab0_-Ab0_-12": true,
		strings.Repeat("a", 15): false, strings.Repeat("a", 129): false, "": false,
		"aaaaaaaaaaaaaaa=": false, "aaaaaaaaaaaaaaa+": false, "aaaaaaaaaaaaaaa/": false, "aaaaaaaaaaaaaaa:": false,
	} {
		if ValidLockToken(tok) != ok {
			t.Errorf("ValidLockToken(%q) = %v", tok, !ok)
		}
	}
	for name, ok := range map[string]bool{"a": true, "jobs/sync:1.x-y_z": true, "": false, "a b": false, strings.Repeat("x", 129): false} {
		if ValidLockName(name) != ok {
			t.Errorf("ValidLockName(%q) = %v", name, !ok)
		}
	}
}
