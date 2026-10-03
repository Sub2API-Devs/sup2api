//go:build linux

package supervisor

import (
	"context"
	"os"
	"path/filepath"
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
