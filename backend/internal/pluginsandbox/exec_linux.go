//go:build linux

package pluginsandbox

import (
	"fmt"
	"os"
	"runtime"
	"syscall"

	"golang.org/x/sys/unix"
)

func runExec(opts *execOptions) int {
	runtime.LockOSThread()
	if err := verifyBinary(opts.Binary, opts.ExpectedSHA256); err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec: verify:", err)
		return exitSetup
	}
	if err := applyProcessLimits(opts); err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec: limits:", err)
		return exitSetup
	}
	if err := applyLandlock(opts); err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec: landlock:", err)
		return exitSetup
	}
	if opts.Seccomp {
		if err := loadSeccomp(); err != nil {
			fmt.Fprintln(os.Stderr, "plugin-exec: seccomp:", err)
			return exitSetup
		}
	}
	if err := os.Chdir(opts.WorkDir); err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec: chdir:", err)
		return exitSetup
	}
	err := syscall.Exec(opts.Binary, []string{opts.Binary}, execEnvironment(os.Environ()))
	if os.IsNotExist(err) {
		fmt.Fprintln(os.Stderr, "plugin-exec: exec:", err)
		return exitNotFound
	}
	fmt.Fprintln(os.Stderr, "plugin-exec: exec:", err)
	return exitExecFail
}

func applyProcessLimits(opts *execOptions) error {
	if err := unix.Prctl(unix.PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0); err != nil {
		return fmt.Errorf("no_new_privs: %w", err)
	}
	if err := unix.Prctl(unix.PR_SET_PDEATHSIG, uintptr(syscall.SIGKILL), 0, 0, 0); err != nil {
		return fmt.Errorf("parent death signal: %w", err)
	}
	if err := syscall.Setrlimit(syscall.RLIMIT_CORE, &syscall.Rlimit{}); err != nil {
		return fmt.Errorf("disable core dumps: %w", err)
	}
	var current syscall.Rlimit
	if err := syscall.Getrlimit(syscall.RLIMIT_NOFILE, &current); err != nil {
		return fmt.Errorf("read open-file limit: %w", err)
	}
	limit := uint64(opts.MaxOpenFiles)
	if limit > current.Max {
		limit = current.Max
	}
	if err := syscall.Setrlimit(syscall.RLIMIT_NOFILE, &syscall.Rlimit{Cur: limit, Max: limit}); err != nil {
		return fmt.Errorf("set open-file limit: %w", err)
	}
	if err := os.WriteFile("/proc/self/oom_score_adj", []byte("1000"), 0); err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec: warning: oom_score_adj:", err)
	}
	if opts.Nice > 0 {
		raw, err := unix.Getpriority(unix.PRIO_PROCESS, 0)
		if err != nil {
			return fmt.Errorf("getpriority: %w", err)
		}
		target := min(20-raw+opts.Nice, 19)
		if err := unix.Setpriority(unix.PRIO_PROCESS, 0, target); err != nil {
			return fmt.Errorf("setpriority: %w", err)
		}
	}
	return nil
}
