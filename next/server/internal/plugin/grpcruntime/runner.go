package grpcruntime

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strconv"

	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin/runner"
)

// cmdRunner starts the launcher's command for go-plugin. go-plugin only
// creates a private socket directory (UnixSocketConfig.TempDir) and passes it
// to the plugin when a RunnerFunc is used; its own command runner is
// internal, so this is the equivalent: start, wait, kill one exec.Cmd.
type cmdRunner struct {
	cmd    *exec.Cmd
	stdout io.ReadCloser
	stderr io.ReadCloser
	pid    int
	// verify runs right before the process is started (binary checksum).
	verify func() error
}

var _ runner.Runner = (*cmdRunner)(nil)

// newCmdRunner merges the environment go-plugin prepared in spec (magic
// cookie, AutoMTLS client certificate, socket directory; the host
// environment is skipped) into the launcher's command.
func newCmdRunner(cmd, spec *exec.Cmd, verify func() error) (*cmdRunner, error) {
	cmd.Env = append(cmd.Env, spec.Env...)
	if spec.Stdin != nil {
		cmd.Stdin = spec.Stdin
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}
	return &cmdRunner{cmd: cmd, stdout: stdout, stderr: stderr, verify: verify}, nil
}

func (r *cmdRunner) Start(context.Context) error {
	if r.verify != nil {
		if err := r.verify(); err != nil {
			return err
		}
	}
	if err := r.cmd.Start(); err != nil {
		return err
	}
	r.pid = r.cmd.Process.Pid
	return nil
}

func (r *cmdRunner) Wait(context.Context) error { return r.cmd.Wait() }

func (r *cmdRunner) Kill(context.Context) error {
	if r.cmd.Process == nil {
		return nil
	}
	if err := r.cmd.Process.Kill(); err != nil && !errors.Is(err, os.ErrProcessDone) {
		return err
	}
	return nil
}

func (r *cmdRunner) Stdout() io.ReadCloser { return r.stdout }
func (r *cmdRunner) Stderr() io.ReadCloser { return r.stderr }
func (r *cmdRunner) Name() string          { return r.cmd.Path }
func (r *cmdRunner) ID() string            { return strconv.Itoa(r.pid) }
func (r *cmdRunner) Diagnose(context.Context) string {
	return fmt.Sprintf("plugin command %s did not complete the go-plugin handshake", r.cmd.Path)
}

func (r *cmdRunner) PluginToHost(network, addr string) (string, string, error) {
	return network, addr, nil
}

func (r *cmdRunner) HostToPlugin(network, addr string) (string, string, error) {
	return network, addr, nil
}

// runnerFunc adapts newCmdRunner to plugin.ClientConfig.RunnerFunc and
// records the runner for the caller (its pid).
func runnerFunc(cmd *exec.Cmd, verify func() error, out **cmdRunner) func(hclog.Logger, *exec.Cmd, string) (runner.Runner, error) {
	return func(_ hclog.Logger, spec *exec.Cmd, _ string) (runner.Runner, error) {
		r, err := newCmdRunner(cmd, spec, verify)
		if err != nil {
			return nil, err
		}
		*out = r
		return r, nil
	}
}
