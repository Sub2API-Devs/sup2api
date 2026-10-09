package remotedocker

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/ssh"
)

// ScriptResult is the outcome of a script that ran: its standard output
// (bounded, credentials of the SSH configuration redacted) and exit status.
type ScriptResult struct {
	Output     string
	ExitStatus int
}

// RunScript runs a fixed shell script on the Docker host and feeds stdin to
// it. The script must be built only from constants and values the caller
// validated against a strict pattern, never from user input; secrets go
// through stdin, never into the script (it can show up in process lists and
// logs). stderr is discarded. err is only for failures to reach or
// authenticate the host or to run the session (a script that ran and failed
// has a nonzero ExitStatus and a nil error). limit bounds the whole run.
func RunScript(ctx context.Context, cfg Config, script string, stdin []byte, limit time.Duration) (ScriptResult, error) {
	return RunScriptStream(ctx, cfg, script, bytes.NewReader(stdin), limit)
}

// RunScriptStream is RunScript with stdin streamed from a reader (e.g. an
// image archive for docker load, CONTRACTS §53.10): the session's stdin is
// closed once stdin returns EOF. A read error of stdin fails the run (err),
// so the caller can make a reader refuse to finish (checksum mismatch).
func RunScriptStream(ctx context.Context, cfg Config, script string, stdin io.Reader, limit time.Duration) (ScriptResult, error) {
	if script == "" || strings.ContainsRune(script, 0) {
		return ScriptResult{}, errors.New("invalid script")
	}
	addr, err := address(cfg.Host, cfg.Port)
	if err != nil {
		return ScriptResult{}, err
	}
	sshCfg, err := clientConfig(cfg)
	if err != nil {
		return ScriptResult{}, err
	}
	ctx, cancel := context.WithTimeout(ctx, limit)
	defer cancel()
	conn, err := (&net.Dialer{Timeout: timeout}).DialContext(ctx, "tcp", addr)
	if err != nil {
		return ScriptResult{}, safeError(ctx, "SSH connection failed")
	}
	defer conn.Close()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()
	cc, chans, reqs, err := ssh.NewClientConn(conn, addr, sshCfg)
	if err != nil {
		return ScriptResult{}, safeError(ctx, "SSH handshake, host key verification, or authentication failed")
	}
	client := ssh.NewClient(cc, chans, reqs)
	defer client.Close()
	session, err := client.NewSession()
	if err != nil {
		return ScriptResult{}, safeError(ctx, "SSH session failed")
	}
	defer session.Close()
	var out boundedOutput
	session.Stdout = &out
	if stdin == nil {
		stdin = bytes.NewReader(nil)
	}
	// The copy into the session runs in its own goroutine; Run waits for it.
	// A failing reader fails the run even when the script exited 0 (the
	// session closes stdin after a read error, which the script sees as EOF).
	in := &trackedInput{r: stdin}
	session.Stdin = in
	// The script is passed as one quoted argument of sh -c so the remote
	// login shell does not reinterpret it.
	err = session.Run("sh -c " + shellQuote(script))
	if ctx.Err() != nil {
		return ScriptResult{}, ctx.Err()
	}
	if in.failed() != nil {
		return ScriptResult{}, errors.New("remote script input failed")
	}
	res := ScriptResult{Output: string(out.data)}
	for _, secret := range []string{cfg.Password, cfg.PrivateKey, cfg.Passphrase} {
		if secret != "" {
			res.Output = strings.ReplaceAll(res.Output, secret, "[REDACTED]")
		}
	}
	var exit *ssh.ExitError
	switch {
	case err == nil:
	case errors.As(err, &exit):
		res.ExitStatus = exit.ExitStatus()
	default:
		return ScriptResult{}, errors.New("remote script failed to run")
	}
	return res, nil
}

// trackedInput remembers the first read error of a script's stdin other
// than EOF.
type trackedInput struct {
	r   io.Reader
	mu  sync.Mutex
	err error
}

func (t *trackedInput) Read(p []byte) (int, error) {
	n, err := t.r.Read(p)
	if err != nil && err != io.EOF {
		t.mu.Lock()
		if t.err == nil {
			t.err = err
		}
		t.mu.Unlock()
	}
	return n, err
}

func (t *trackedInput) failed() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.err
}
