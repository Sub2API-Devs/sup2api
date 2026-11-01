// Package compose runs `docker compose` for the controller and egress
// services only, rewrites one line of .env at a time, and serializes every
// lifecycle operation with the compose lock (03 §9.1, §9.4).
package compose

import (
	"bytes"
	"context"
	"errors"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"ccgateway/guard/internal/files"
	"ccgateway/guard/internal/policy"
)

// Services are the only services the guard ever touches.
var Services = map[string]bool{"controller": true, "egress": true}

// ErrService is a service outside the whitelist (a guard bug).
var ErrService = errors.New("compose service not allowed")

// Exec runs one compose command; it returns the tail of stderr.
type Exec interface {
	Run(ctx context.Context, argv, env []string) (stderrTail string, err error)
}

// EnvStore reads and replaces <ProjectDir>/.env.
type EnvStore interface {
	Read() ([]byte, error)
	Write(data []byte) error
}

// Locker is the compose lock (<ProjectDir>/.compose.lock).
type Locker interface {
	Lock(ctx context.Context) (unlock func(), err error)
}

// Runner is one compose project.
type Runner struct {
	Docker  string // /usr/bin/docker
	Project string
	Dir     string
	Socket  string
	X       Exec
	Env     EnvStore
	L       Locker
}

// File is the compose file path.
func (r *Runner) File() string { return r.Dir + "/compose.yml" }

// EnvFile is the .env path.
func (r *Runner) EnvFile() string { return r.Dir + "/.env" }

// Environ is the clean child environment (03 §9.1): the guard's own
// CCG_GUARD_* variables would take precedence over --env-file.
func (r *Runner) Environ() []string {
	return []string{
		"PATH=/usr/local/bin:/usr/bin:/bin",
		"HOME=/tmp",
		"DOCKER_CONFIG=/tmp/.docker",
		"DOCKER_HOST=unix://" + r.Socket,
	}
}

func (r *Runner) base(profile bool) []string {
	args := []string{r.Docker, "compose", "-p", r.Project, "--project-directory", r.Dir, "-f", r.File(), "--env-file", r.EnvFile()}
	if profile {
		args = append(args, "--profile", "egress")
	}
	return args
}

// UpArgs is the fixed `up` command line.
func (r *Runner) UpArgs(service string, force bool) ([]string, error) {
	if !Services[service] {
		return nil, ErrService
	}
	args := append(r.base(service == "egress"), "up", "-d", "--no-deps")
	if force {
		args = append(args, "--force-recreate")
	}
	return append(args, service), nil
}

// Error is a failed compose command.
type Error struct {
	Step   string
	Stderr string
	Err    error
}

func (e *Error) Error() string { return "compose " + e.Step + " failed: " + e.Err.Error() }
func (e *Error) Unwrap() error { return e.Err }

// Up runs `config -q` and then `up -d --no-deps [--force-recreate]`.
// The caller holds the compose lock.
func (r *Runner) Up(ctx context.Context, service string, force bool) error {
	args, err := r.UpArgs(service, force)
	if err != nil {
		return err
	}
	cctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	tail, err := r.X.Run(cctx, append(r.base(service == "egress"), "config", "-q"), r.Environ())
	cancel()
	if err != nil {
		return &Error{Step: "config", Stderr: tail, Err: err}
	}
	uctx, cancel := context.WithTimeout(ctx, 120*time.Second)
	defer cancel()
	tail, err = r.X.Run(uctx, args, r.Environ())
	if err != nil {
		return &Error{Step: "up", Stderr: tail, Err: err}
	}
	return nil
}

// EnvValue returns the value of key in .env ("" when absent).
func (r *Runner) EnvValue(key string) (string, error) {
	b, err := r.Env.Read()
	if err != nil {
		return "", err
	}
	return Value(b, key), nil
}

// SetEnv sets key=value, dropping key and every drop key first; it
// returns the old file for RestoreEnv.
func (r *Runner) SetEnv(key, value string, drop ...string) ([]byte, error) {
	old, err := r.Env.Read()
	if err != nil {
		return nil, err
	}
	next, err := Rewrite(old, key, value, drop...)
	if err != nil {
		return nil, err
	}
	if err := r.Env.Write(next); err != nil {
		return nil, err
	}
	return old, nil
}

// RestoreEnv writes back an old .env.
func (r *Runner) RestoreEnv(old []byte) error { return r.Env.Write(old) }

// ErrValue is an .env value that is not an image reference.
var ErrValue = errors.New("invalid .env value")

func dropLine(line string, keys []string) bool {
	t := strings.TrimLeft(line, " \t")
	for _, k := range keys {
		if strings.HasPrefix(t, k+"=") {
			return true
		}
	}
	return false
}

// Rewrite keeps every line as is (comments, blank lines, other variables)
// except lines starting (after leading blanks) with key= or a drop key=,
// and appends key=value (upgrade.with_image). value must be an image
// reference: no blanks, quotes, '$' or newlines.
func Rewrite(content []byte, key, value string, drop ...string) ([]byte, error) {
	if !policy.ValidImage(value) {
		return nil, ErrValue
	}
	keys := append([]string{key}, drop...)
	var out bytes.Buffer
	text := string(content)
	if text != "" && !strings.HasSuffix(text, "\n") {
		text += "\n"
	}
	for _, line := range strings.SplitAfter(text, "\n") {
		if line == "" {
			continue
		}
		if dropLine(strings.TrimSuffix(line, "\n"), keys) {
			continue
		}
		out.WriteString(line)
	}
	out.WriteString(key + "=" + value + "\n")
	return out.Bytes(), nil
}

// Value returns the last value assigned to key ("" when absent).
func Value(content []byte, key string) string {
	v := ""
	for _, line := range strings.Split(string(content), "\n") {
		t := strings.TrimLeft(strings.TrimSuffix(line, "\r"), " \t")
		if rest, ok := strings.CutPrefix(t, key+"="); ok {
			v = strings.TrimSpace(rest)
		}
	}
	return v
}

// CmdExec runs commands as child processes, stdout discarded, the last
// 2 KiB of stderr kept.
type CmdExec struct{}

type tail struct{ b []byte }

func (t *tail) Write(p []byte) (int, error) {
	t.b = append(t.b, p...)
	if len(t.b) > 2048 {
		t.b = t.b[len(t.b)-2048:]
	}
	return len(p), nil
}

func (CmdExec) Run(ctx context.Context, argv, env []string) (string, error) {
	cmd := exec.CommandContext(ctx, argv[0], argv[1:]...)
	cmd.Env = env
	cmd.Dir = "/"
	t := &tail{}
	cmd.Stderr = t
	err := cmd.Run()
	return strings.TrimSpace(string(t.b)), err
}

// RootEnv is EnvStore over the checked project directory (03 §9.4): .env
// must be a regular root file with one link and mode 0600.
type RootEnv struct{ R *files.Root }

// ErrEnvMode is an .env whose mode is not 0600.
var ErrEnvMode = errors.New(".env must have mode 0600")

func (f RootEnv) Read() ([]byte, error) {
	mode, err := f.R.Mode([]string{".env"})
	if err != nil {
		return nil, err
	}
	if mode != 0o600 {
		return nil, ErrEnvMode
	}
	return f.R.ReadFile([]string{".env"}, 1<<20)
}

func (f RootEnv) Write(data []byte) error {
	return f.R.WriteReplace([]string{".env"}, data, 0o600, false)
}

// MemEnv is an in-memory EnvStore (tests, the contract runner).
type MemEnv struct {
	mu   sync.Mutex
	Data []byte
	Fail error
}

func (m *MemEnv) Read() ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return append([]byte(nil), m.Data...), nil
}

func (m *MemEnv) Write(d []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.Fail != nil {
		return m.Fail
	}
	m.Data = append([]byte(nil), d...)
	return nil
}

// MutexLocker is an in-process Locker (tests).
type MutexLocker struct{ ch chan struct{} }

func (m *MutexLocker) Lock(ctx context.Context) (func(), error) {
	if m.ch == nil {
		m.ch = make(chan struct{}, 1)
	}
	select {
	case m.ch <- struct{}{}:
		return func() { <-m.ch }, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// Lifecycle makes the controller upgrade and the gateway recreate
// mutually exclusive (409 upgrade_in_progress).
type Lifecycle struct {
	mu   sync.Mutex
	busy string
}

// Begin claims the lifecycle for kind; false when another one runs.
func (l *Lifecycle) Begin(kind string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.busy != "" {
		return false
	}
	l.busy = kind
	return true
}

// End releases it.
func (l *Lifecycle) End() {
	l.mu.Lock()
	l.busy = ""
	l.mu.Unlock()
}

// Busy reports the running kind ("" when idle).
func (l *Lifecycle) Busy() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.busy
}

// ErrNoFile is a missing .env.
var ErrNoFile = os.ErrNotExist
