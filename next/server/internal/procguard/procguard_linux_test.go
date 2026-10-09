//go:build linux

package procguard

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"testing"
)

const childEnv = "PROCGUARD_TEST_CHILD"

// childReport is what the re-executed test binary reports about itself.
type childReport struct {
	DumpableBefore bool   `json:"dumpable_before"`
	DumpableAfter  bool   `json:"dumpable_after"`
	ScrubErr       string `json:"scrub_err"`
	DumpErr        string `json:"dump_err"`
	GoEnvHasSecret bool   `json:"go_env_has_secret"`
	ProcEnvSecret  bool   `json:"proc_env_secret"` // secret value still in /proc/self/environ
	ProcEnvKeep    bool   `json:"proc_env_keep"`   // unrelated value still there
	ProcEnvErr     string `json:"proc_env_err"`
}

const (
	childSecret = "procguard-secret-value-0123456789"
	childKeep   = "procguard-keep-value"
)

func TestMain(m *testing.M) {
	if os.Getenv(childEnv) == "1" {
		runChild()
		return
	}
	os.Exit(m.Run())
}

// runChild hardens itself the way main does and reports the result. It only
// inspects its own process.
func runChild() {
	var r childReport
	r.DumpableBefore, _ = Dumpable()
	if err := ScrubEnv([]string{"PROCGUARD_SECRET"}); err != nil {
		r.ScrubErr = err.Error()
	}
	_, r.GoEnvHasSecret = os.LookupEnv("PROCGUARD_SECRET")
	if raw, err := os.ReadFile("/proc/self/environ"); err != nil {
		r.ProcEnvErr = err.Error()
	} else {
		r.ProcEnvSecret = bytes.Contains(raw, []byte(childSecret))
		r.ProcEnvKeep = bytes.Contains(raw, []byte(childKeep))
	}
	if err := DisableDumping(); err != nil {
		r.DumpErr = err.Error()
	}
	r.DumpableAfter, _ = Dumpable()
	_ = json.NewEncoder(os.Stdout).Encode(r)
}

// The core scrubs its secrets from the environment, including the initial
// block /proc/<pid>/environ shows, and then is no longer dumpable.
func TestHardenLinux(t *testing.T) {
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command(exe, "-test.run=^$")
	cmd.Env = append(os.Environ(), childEnv+"=1", "PROCGUARD_SECRET="+childSecret, "PROCGUARD_KEEP="+childKeep)
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("child: %v", err)
	}
	var r childReport
	if err := json.Unmarshal(out, &r); err != nil {
		t.Fatalf("child output %q: %v", out, err)
	}
	if r.ScrubErr != "" || r.DumpErr != "" || r.ProcEnvErr != "" {
		t.Fatalf("errors: %+v", r)
	}
	if !r.DumpableBefore {
		t.Fatalf("child was not dumpable before hardening: %+v", r)
	}
	if r.DumpableAfter {
		t.Fatalf("dumpable flag still set after DisableDumping: %+v", r)
	}
	if r.GoEnvHasSecret || r.ProcEnvSecret {
		t.Fatalf("secret still visible: %+v", r)
	}
	if !r.ProcEnvKeep {
		t.Fatalf("unrelated variable lost from the initial environment: %+v", r)
	}
}
