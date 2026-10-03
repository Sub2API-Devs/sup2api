//go:build linux

package supervisor

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"syscall"
)

func configureProcess(cmd *exec.Cmd) { cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true} }
func configureSupervisor() error {
	_, _, e := syscall.Syscall6(syscall.SYS_PRCTL, 36, 1, 0, 0, 0, 0)
	if e != 0 {
		return e
	}
	return nil
}
func reapGroup(pgid int) {
	for {
		var status syscall.WaitStatus
		pid, e := syscall.Wait4(-pgid, &status, syscall.WNOHANG, nil)
		if e != nil || pid <= 0 {
			return
		}
	}
}
func processStartID(pid int) (string, error) {
	b, e := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	if e != nil {
		return "", e
	}
	end := strings.LastIndexByte(string(b), ')')
	if end < 0 {
		return "", errors.New("invalid proc stat")
	}
	fields := strings.Fields(string(b[end+1:]))
	if len(fields) < 20 {
		return "", errors.New("short proc stat")
	}
	boot, e := os.ReadFile("/proc/sys/kernel/random/boot_id")
	if e != nil {
		return "", e
	}
	return strings.TrimSpace(string(boot)) + ":" + fields[19], nil
}
func sameProcess(pid int, start string) bool {
	actual, e := processStartID(pid)
	return e == nil && actual == start
}
func terminateProcess(pid int) error {
	e := syscall.Kill(pid, syscall.SIGTERM)
	if errors.Is(e, syscall.ESRCH) {
		return nil
	}
	return e
}
func terminateGroup(pid int) error {
	e := syscall.Kill(-pid, syscall.SIGTERM)
	if errors.Is(e, syscall.ESRCH) {
		return nil
	}
	return e
}

// Zombies no longer execute or hold sockets. Scan /proc so an unreaped orphan
// zombie cannot prevent all future updates when running under a minimal init.
func groupGone(pgid int) bool {
	entries, e := os.ReadDir("/proc")
	if e != nil {
		return false
	}
	for _, entry := range entries {
		if _, e = strconv.Atoi(entry.Name()); e != nil {
			continue
		}
		b, e := os.ReadFile("/proc/" + entry.Name() + "/stat")
		if e != nil {
			continue
		}
		end := strings.LastIndexByte(string(b), ')')
		if end < 0 {
			continue
		}
		f := strings.Fields(string(b[end+1:]))
		if len(f) < 3 {
			continue
		}
		group, e := strconv.Atoi(f[2])
		if e == nil && group == pgid && f[0] != "Z" && f[0] != "X" {
			return false
		}
	}
	return true
}
func lockProcess(path string) (*os.File, error) {
	f, e := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0600)
	if e != nil {
		return nil, e
	}
	if e = syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); e != nil {
		f.Close()
		return nil, fmt.Errorf("another supervisor holds the process lock: %w", e)
	}
	return f, nil
}
func unlockProcess(f *os.File) error {
	_ = syscall.Flock(int(f.Fd()), syscall.LOCK_UN)
	return f.Close()
}
func syncProcessDir(path string) error {
	f, e := os.Open(path)
	if e != nil {
		return e
	}
	defer f.Close()
	return f.Sync()
}
