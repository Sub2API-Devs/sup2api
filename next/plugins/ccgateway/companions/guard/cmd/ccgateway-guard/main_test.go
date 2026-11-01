package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"ccgateway/guard/internal/dockerapi"
)

// covers: 03§10.4 ready: fresh heartbeat of a live serving process
func TestReady(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "ready")
	now := time.Now()
	write := func(pid int, hb time.Time) {
		b, _ := json.Marshal(readyState{PID: pid, Heartbeat: hb.UTC().Format(time.RFC3339Nano)})
		_ = os.WriteFile(p, b, 0o600)
	}
	if ready(p, now) != 1 {
		t.Fatal("missing file")
	}
	write(os.Getpid(), now.Add(-20*time.Second))
	if ready(p, now) != 1 {
		t.Fatal("stale heartbeat")
	}
	write(os.Getpid(), now)
	// The test binary is not "ccgateway-guard serve" (and off Linux there is no /proc).
	if ready(p, now) != 1 {
		t.Fatal("foreign process accepted")
	}
	_ = os.WriteFile(p, []byte("{"), 0o600)
	if ready(p, now) != 1 {
		t.Fatal("garbage")
	}
}

// covers: 03§5.1 the daemon must support the fixed API version
func TestAPIVersionOK(t *testing.T) {
	cases := map[[2]string]bool{
		{"1.40", "1.54"}: true, {"1.24", "1.54"}: true, {"1.40", "1.53"}: false, {"1.55", "1.60"}: false, {"x", "1.54"}: false,
	}
	for c, want := range cases {
		if got := apiVersionOK(dockerapi.VersionInfo{MinAPIVersion: c[0], APIVersion: c[1]}); got != want {
			t.Errorf("%v: %v", c, got)
		}
	}
}

// covers: 03§7.9 print-cleanup and unknown chains
func TestCommands(t *testing.T) {
	var out, errb strings.Builder
	t.Setenv("CCG_GUARD_CHAIN_PREFIX", "CCG-GT")
	if printCleanup(&out, &errb) != 0 || !strings.Contains(out.String(), "-X CCG-GT-CONTROL-IN") {
		t.Fatal(out.String(), errb.String())
	}
	if code := printRules([]string{"--chain", "CCG-PROXY-BRIDGE"}, &out, &errb); code != 2 {
		t.Fatal("foreign chain accepted", code)
	}
	t.Setenv("CCG_GUARD_PREFIX", "Bad")
	if printCleanup(&out, &errb) != 2 {
		t.Fatal("bad config")
	}
}
