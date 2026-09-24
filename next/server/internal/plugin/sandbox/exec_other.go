//go:build !linux

package sandbox

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
)

// runExec (development mode, non-Linux): no sandbox, run the plugin as a
// child with the filtered environment and pass its exit code through.
func runExec(o *execOptions) int {
	path, err := exec.LookPath(o.Binary)
	if err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec:", err)
		return exitNotFound
	}
	cmd := exec.Command(path, o.Args...)
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	cmd.Env = buildEnv(os.Environ(), o)
	if err := cmd.Start(); err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec:", err)
		return exitExecFail
	}
	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt)
	defer signal.Stop(sig)
	go func() {
		for s := range sig {
			_ = cmd.Process.Signal(s)
		}
	}()
	err = cmd.Wait()
	var ee *exec.ExitError
	if errors.As(err, &ee) {
		return ee.ExitCode()
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec:", err)
		return exitExecFail
	}
	return 0
}
