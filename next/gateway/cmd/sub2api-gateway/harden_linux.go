//go:build linux

package main

import "syscall"

const prSetDumpable = 4 // PR_SET_DUMPABLE

// hardenProcess makes the gateway non-dumpable: /proc/<pid>/environ, mem and
// fd then require CAP_SYS_PTRACE even for processes of the same UID, such as
// the plugins of its core. It also disables core dumps of the gateway. Only
// this process is affected; execve resets the flag for the core.
func hardenProcess() error {
	if _, _, e := syscall.Syscall6(syscall.SYS_PRCTL, prSetDumpable, 0, 0, 0, 0, 0); e != 0 {
		return e
	}
	return nil
}
