//go:build !linux

package pluginsandbox

import "os/exec"

func configureParentCommand(_ *exec.Cmd) {}

func killProcessGroup(_ int) {}
