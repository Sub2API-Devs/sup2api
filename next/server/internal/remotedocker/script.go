package remotedocker

import (
	"bytes"
	"context"
	"errors"
	"net"
	"strings"
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
	session.Stdin = bytes.NewReader(stdin)
	// The script is passed as one quoted argument of sh -c so the remote
	// login shell does not reinterpret it.
	err = session.Run("sh -c " + shellQuote(script))
	if ctx.Err() != nil {
		return ScriptResult{}, ctx.Err()
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
