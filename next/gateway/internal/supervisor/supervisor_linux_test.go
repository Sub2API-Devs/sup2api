//go:build linux

package supervisor

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
)

type blockedControl struct{}

func (blockedControl) Drain(context.Context, rc.DrainRequest) error { return nil }
func (blockedControl) Status(context.Context) (rc.Status, error) {
	return rc.Status{DrainComplete: false}, nil
}
func (blockedControl) Shutdown(context.Context) error { panic("must not shutdown before drain") }
func TestExclusiveSupervisorAndDrainDeadlineDoesNotKill(t *testing.T) {
	root := t.TempDir()
	m, e := New(root)
	if e != nil {
		t.Fatal(e)
	}
	defer m.Close()
	if second, e := New(root); e == nil {
		second.Close()
		t.Fatal("second supervisor acquired lock")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	script := filepath.Join(root, "core")
	if e = os.WriteFile(script, []byte("#!/bin/sh\ntrap 'exit 0' TERM\nwhile :; do sleep 0.05; done\n"), 0755); e != nil {
		t.Fatal(e)
	}
	state, e := m.Start(ctx, Spec{Executable: script, BootID: "chosen"})
	if e != nil {
		t.Fatal(e)
	}
	defer func() {
		cleanup, done := context.WithTimeout(context.Background(), time.Second)
		defer done()
		_ = m.Terminate(cleanup)
	}()
	if state.BootID != "chosen" {
		t.Fatal("boot ID changed")
	}
	time.Sleep(30 * time.Millisecond)
	deadline, stop := context.WithTimeout(ctx, 40*time.Millisecond)
	defer stop()
	if e = m.DrainStop(deadline, blockedControl{}, "op"); e == nil {
		t.Fatal("incomplete drain accepted")
	}
	if !m.Status().Running {
		t.Fatal("drain timeout killed process")
	}
	if e = m.Terminate(ctx); e != nil {
		t.Fatal(e)
	}
	if m.Status().Running {
		t.Fatal("process remains running")
	}
}
func TestRestartRejectsSurvivingRecordedProcess(t *testing.T) {
	root := t.TempDir()
	m, e := New(root)
	if e != nil {
		t.Fatal(e)
	}
	start, e := processStartID(os.Getpid())
	if e != nil {
		t.Fatal(e)
	}
	m.state = State{PID: os.Getpid(), StartID: start, Running: true}
	if e = m.persist(); e != nil {
		t.Fatal(e)
	}
	m.state.Running = false
	if e = m.Close(); e != nil {
		t.Fatal(e)
	}
	if other, e := New(root); e == nil {
		other.Close()
		t.Fatal("adopted unverified running process")
	}
}

// A real core process sees only the allowlisted part of the shell's
// environment plus the explicit entries.
func TestStartedCoreSeesOnlyAllowlistedEnvironment(t *testing.T) {
	t.Setenv("SUB2API_PEER_AUTH_KEY", "node-secret-value")
	t.Setenv("SUB2API_GATEWAY_POOL_MAX_CONNS", "8")
	t.Setenv("DATABASE_URL", "postgres://inherited/db")
	t.Setenv("UNRELATED_SHELL_SECRET", "shell-only")
	t.Setenv("SUB2API_MASTER_KEY", "master-for-core")
	root := t.TempDir()
	m, e := New(filepath.Join(root, "runtime"))
	if e != nil {
		t.Fatal(e)
	}
	defer m.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	out := filepath.Join(root, "env.txt")
	if _, e = m.Start(ctx, Spec{Executable: "/bin/sh", Args: []string{"-c", "env > " + out}, Env: []string{"DATABASE_URL=postgres://shell/db"}}); e != nil {
		t.Fatal(e)
	}
	if e = m.Wait(ctx); e != nil {
		t.Fatal(e)
	}
	b, e := os.ReadFile(out)
	if e != nil {
		t.Fatal(e)
	}
	env := map[string]string{}
	for _, line := range strings.Split(strings.TrimSpace(string(b)), "\n") {
		k, v, _ := strings.Cut(line, "=")
		env[k] = v
	}
	for _, name := range []string{"SUB2API_PEER_AUTH_KEY", "SUB2API_GATEWAY_POOL_MAX_CONNS", "UNRELATED_SHELL_SECRET"} {
		if _, ok := env[name]; ok {
			t.Errorf("%s reached the core", name)
		}
	}
	if env["DATABASE_URL"] != "postgres://shell/db" || env["SUB2API_MASTER_KEY"] != "master-for-core" {
		t.Errorf("core configuration lost: %v", env)
	}
}
