//go:build linux

package main

import (
	"syscall"
	"testing"
)

const prGetDumpable = 3 // PR_GET_DUMPABLE

func dumpable(t *testing.T) uintptr {
	t.Helper()
	v, _, e := syscall.Syscall6(syscall.SYS_PRCTL, prGetDumpable, 0, 0, 0, 0, 0)
	if e != 0 {
		t.Fatal(e)
	}
	return v
}

// The serving gateway is not dumpable, so processes of its UID cannot read
// its environment or memory through /proc.
func TestHardenProcessClearsDumpable(t *testing.T) {
	before := dumpable(t)
	t.Cleanup(func() { _, _, _ = syscall.Syscall6(syscall.SYS_PRCTL, prSetDumpable, before, 0, 0, 0, 0) })
	if err := hardenProcess(); err != nil {
		t.Fatal(err)
	}
	if got := dumpable(t); got != 0 {
		t.Fatalf("dumpable = %d after hardenProcess", got)
	}
}
