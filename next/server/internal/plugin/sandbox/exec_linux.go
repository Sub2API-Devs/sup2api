//go:build linux

package sandbox

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"syscall"

	"golang.org/x/sys/unix"
)

func runExec(o *execOptions) int {
	// Per-thread attributes (nice, no_new_privs) must be set on the thread
	// that finally calls execve.
	runtime.LockOSThread()

	path, err := exec.LookPath(o.Binary)
	if err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec:", err)
		return exitNotFound
	}
	if err := applyLimits(o); err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec:", err)
		return exitSetup
	}
	env := buildEnv(os.Environ(), o)
	if o.Seccomp || o.StrictNetwork {
		if err := loadSeccomp(o.StrictNetwork); err != nil {
			fmt.Fprintln(os.Stderr, "plugin-exec: seccomp:", err)
			return exitSetup
		}
	}
	argv := append([]string{o.Binary}, o.Args...)
	err = syscall.Exec(path, argv, env)
	fmt.Fprintln(os.Stderr, "plugin-exec: exec:", err)
	return exitExecFail
}

// applyLimits sets no_new_privs, RLIMIT_NOFILE, oom_score_adj and nice.
// None of them needs privileges.
func applyLimits(o *execOptions) error {
	if err := unix.Prctl(unix.PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0); err != nil {
		return fmt.Errorf("no_new_privs: %w", err)
	}
	if o.MaxOpenFiles > 0 {
		var cur syscall.Rlimit
		if err := syscall.Getrlimit(syscall.RLIMIT_NOFILE, &cur); err != nil {
			return fmt.Errorf("getrlimit: %w", err)
		}
		n := uint64(o.MaxOpenFiles)
		if n > cur.Max {
			n = cur.Max // cannot raise the hard limit without privileges
		}
		// syscall.Setrlimit (not x/sys) so Go does not restore its saved
		// soft limit on exec.
		if err := syscall.Setrlimit(syscall.RLIMIT_NOFILE, &syscall.Rlimit{Cur: n, Max: n}); err != nil {
			return fmt.Errorf("setrlimit nofile: %w", err)
		}
	}
	if err := os.WriteFile("/proc/self/oom_score_adj", []byte(strconv.Itoa(OOMScoreAdj)), 0); err != nil {
		// Not fatal: the process still runs, it just is not the preferred OOM victim.
		fmt.Fprintln(os.Stderr, "plugin-exec: warning: oom_score_adj:", err)
	}
	if o.Nice > 0 {
		raw, err := unix.Getpriority(unix.PRIO_PROCESS, 0)
		if err != nil {
			return fmt.Errorf("getpriority: %w", err)
		}
		// The raw syscall returns 20 - nice.
		target := min(20-raw+o.Nice, 19)
		if err := unix.Setpriority(unix.PRIO_PROCESS, 0, target); err != nil {
			return fmt.Errorf("setpriority: %w", err)
		}
	}
	return nil
}
