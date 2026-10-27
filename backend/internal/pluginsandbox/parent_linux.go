//go:build linux

package pluginsandbox

import (
	"os/exec"
	"syscall"
)

func configureParentCommand(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Pdeathsig: syscall.SIGKILL,
		Setpgid:   true,
	}
}

func killProcessGroup(processGroupID int) {
	if processGroupID > 0 {
		_ = syscall.Kill(-processGroupID, syscall.SIGKILL)
	}
}
