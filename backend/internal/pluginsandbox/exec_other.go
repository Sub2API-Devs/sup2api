//go:build !linux

package pluginsandbox

import (
	"fmt"
	"os"
	"os/exec"
)

func runExec(opts *execOptions) int {
	if err := verifyBinary(opts.Binary, opts.ExpectedSHA256); err != nil {
		fmt.Fprintln(os.Stderr, "plugin-exec: verify:", err)
		return exitSetup
	}
	cmd := exec.Command(opts.Binary)
	cmd.Dir = opts.WorkDir
	cmd.Env = execEnvironment(os.Environ())
	cmd.Stdin, cmd.Stdout, cmd.Stderr = os.Stdin, os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return exitErr.ExitCode()
		}
		fmt.Fprintln(os.Stderr, "plugin-exec:", err)
		return exitExecFail
	}
	return 0
}
