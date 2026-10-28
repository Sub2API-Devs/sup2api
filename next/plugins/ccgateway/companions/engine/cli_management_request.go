package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Non-model provider calls (the OAuth usage and profile endpoints, and the
// Files/Skills resource operations) are performed by the CLI, never by Go. The
// CLI owns the account's credential and its HTTPS client, so the TLS/HTTP
// fingerprint of these calls is the CLI's own instead of Go's. Go keeps the
// operation allowlist, the request headers the operation itself needs, and
// every response limit; it never passes a token (Authorization/X-Api-Key
// headers are refused before the process starts).
//
// Exit codes of `claude ccgateway-mgmt`: 0 an answer was obtained (any HTTP
// status), 1 argument/allowlist/output rejection, 2 transport failure, 3 the
// response exceeded --max-bytes, 4 no usable login. The CLI also writes a
// bounded error frame to stderr; its code is preferred over the exit code when
// the two describe the same failure.
const (
	cliManagementSubcommand       = "ccgateway-mgmt"
	cliManagementMetaLimit        = 64 << 10
	cliManagementStderrLimit      = 64 << 10
	cliManagementDefaultTimeout   = 10 * time.Minute
	cliManagementExitAnswered     = 0
	cliManagementExitRejected     = 1
	cliManagementExitTransport    = 2
	cliManagementExitTooLarge     = 3
	cliManagementExitNotLoggedIn  = 4
	cliManagementFrameCodeTooBig  = "response_too_large"
	cliManagementFrameCodeNoLogin = "not_logged_in"
	// cliManagementFrameCodeNoLoginLegacy is the code the previous CLI build
	// used for the same condition; accepted during rollout.
	cliManagementFrameCodeNoLoginLegacy = "cli_credentials_unavailable"
	// managementHTTPCapability is the profile capability that admits the
	// ccgateway-mgmt command (Claude Code 2.1.304 and later builds).
	managementHTTPCapability = "management_http_v1"
)

var (
	// errCLIManagementRejected means the CLI refused the call before it was
	// sent (arguments or allowlist) or could not write its answer.
	errCLIManagementRejected = errors.New("management CLI rejected the operation")
	// errCLIManagementTransport means the call was attempted and no HTTP
	// answer exists: a connect/TLS/timeout failure or a crashed CLI.
	errCLIManagementTransport = errors.New("management CLI transport failed")
	// errCLIManagementTooLarge means the CLI stopped reading because the
	// response exceeded the --max-bytes limit Go passed.
	errCLIManagementTooLarge = errors.New("management response exceeds the size limit")
	// errCLIManagementNotLoggedIn means the CLI has no usable login for the
	// call; callers surface it as their own not-logged-in answer.
	errCLIManagementNotLoggedIn = errors.New("management CLI has no usable login")
)

// cliManagementCall is one provider management operation. Header values are
// passed to the CLI; credentials are not (the CLI reads the login state).
type cliManagementCall struct {
	Method  string
	Path    string // path, optionally with a query
	Header  http.Header
	Body    string // file the CLI reads the request body from ("" for none)
	Timeout time.Duration
	// MaxBytes bounds the response body the CLI will spool; 0 means unlimited.
	// Every caller sets it explicitly (the operation's own limit).
	MaxBytes int64
}

// cliManagementAnswer is one provider answer as files: meta.json decoded and
// the response body spooled by the CLI. Close removes the temporary directory.
type cliManagementAnswer struct {
	status int
	header http.Header
	body   string
	size   int64
	dir    string
}

func (a *cliManagementAnswer) Close() error {
	if a == nil || a.dir == "" {
		return nil
	}
	return os.RemoveAll(a.dir)
}

// cliManagementRequest runs `claude ccgateway-mgmt` and returns its answer.
// The caller's context bounds the process (and the CLI's own --timeout-ms).
func cliManagementRequest(ctx context.Context, runner *Runner, env []string, call cliManagementCall) (*cliManagementAnswer, error) {
	if runner == nil || runner.CLI == "" || call.Path == "" {
		return nil, errCLIManagementTransport
	}
	timeout := call.Timeout
	if timeout <= 0 {
		timeout = cliManagementDefaultTimeout
	}
	if deadline, ok := ctx.Deadline(); ok {
		remaining := time.Until(deadline)
		if remaining <= 0 {
			return nil, errCLIManagementTransport
		}
		if remaining < timeout {
			timeout = remaining
		}
	}
	// Answer files live under the account's work directory when there is one,
	// so they share its lifecycle and storage.
	dir, err := os.MkdirTemp(runner.Work, "ccgateway-mgmt-")
	if err != nil {
		return nil, errCLIManagementTransport
	}
	answer := &cliManagementAnswer{body: filepath.Join(dir, "body"), header: http.Header{}, dir: dir}
	meta := filepath.Join(dir, "meta.json")
	args := []string{cliManagementSubcommand, "--path", call.Path}
	if call.Method != "" {
		args = append(args, "--method", call.Method)
	}
	for _, name := range sortedHeaderNames(call.Header) {
		for _, value := range call.Header.Values(name) {
			if !cliManagementHeaderAllowed(name) || !validResourceHeaderName(name) || !validResourceHeader(value) {
				answer.Close()
				return nil, errCLIManagementRejected
			}
			args = append(args, "--header", name+":"+value)
		}
	}
	if call.Body != "" {
		args = append(args, "--body", call.Body)
	}
	args = append(args, "--output", answer.body, "--meta", meta,
		"--timeout-ms", strconv.FormatInt(max(timeout.Milliseconds(), 1), 10),
		"--max-bytes", strconv.FormatInt(max(call.MaxBytes, 0), 10))
	cmd := exec.CommandContext(ctx, runner.CLI, args...)
	cmd.Env, cmd.Dir, cmd.WaitDelay = env, runner.Work, time.Second
	// CLI stdout/stderr may carry credential or helper details: stdout is
	// discarded, stderr is kept only to read the bounded error frame's code.
	cmd.Stdout = io.Discard
	stderr := &limitedBuffer{limit: cliManagementStderrLimit}
	cmd.Stderr = stderr
	if runErr := cmd.Run(); runErr != nil {
		answer.Close()
		// A context deadline or cancellation (including a killed process whose
		// platform exit code says "1") is a transport failure, never a
		// rejection: the CLI did not decide anything.
		if ctx.Err() != nil {
			return nil, errCLIManagementTransport
		}
		if err := cliManagementFailure(cliManagementFrameCode(stderr.Bytes()), runErr); err != nil {
			return nil, err
		}
		return nil, errCLIManagementTransport
	}
	if ctx.Err() != nil {
		answer.Close()
		return nil, errCLIManagementTransport
	}
	if err := answer.load(meta); err != nil {
		answer.Close()
		return nil, err
	}
	return answer, nil
}

// cliManagementFailure classifies a failed run. The error frame's code is
// preferred when it names a known condition; the exit code is the fallback.
func cliManagementFailure(frameCode string, runErr error) error {
	switch frameCode {
	case cliManagementFrameCodeTooBig:
		return errCLIManagementTooLarge
	case cliManagementFrameCodeNoLogin, cliManagementFrameCodeNoLoginLegacy:
		return errCLIManagementNotLoggedIn
	}
	var exit *exec.ExitError
	if errors.As(runErr, &exit) {
		switch exit.ExitCode() {
		case cliManagementExitRejected:
			return errCLIManagementRejected
		case cliManagementExitTooLarge:
			return errCLIManagementTooLarge
		case cliManagementExitNotLoggedIn:
			return errCLIManagementNotLoggedIn
		}
	}
	return errCLIManagementTransport
}

// cliManagementFrameCode reads the code of the last CCG_REQUEST_ERROR frame in
// the CLI's stderr, if any. Only the code is used: the frame's message may
// carry provider text and is never exposed.
func cliManagementFrameCode(raw []byte) string {
	const prefix = "CCG_REQUEST_ERROR "
	code := ""
	for _, line := range strings.Split(string(raw), "\n") {
		payload, ok := strings.CutPrefix(strings.TrimRight(line, "\r"), prefix)
		if !ok {
			continue
		}
		var frame struct {
			Error struct {
				Code string `json:"code"`
			} `json:"error"`
		}
		if json.Unmarshal([]byte(payload), &frame) == nil && frame.Error.Code != "" {
			code = frame.Error.Code
		}
	}
	return code
}

// limitedBuffer keeps at most limit bytes of what is written to it; it never
// blocks or fails the writer.
type limitedBuffer struct {
	buf   []byte
	limit int
}

func (b *limitedBuffer) Write(p []byte) (int, error) {
	if room := b.limit - len(b.buf); room > 0 {
		if len(p) < room {
			room = len(p)
		}
		b.buf = append(b.buf, p[:room]...)
	}
	return len(p), nil
}

func (b *limitedBuffer) Bytes() []byte { return b.buf }

// load decodes the CLI's meta file and validates the answer files.
func (a *cliManagementAnswer) load(metaPath string) error {
	raw, err := readLimitedFile(metaPath, cliManagementMetaLimit)
	if err != nil {
		return errCLIManagementTransport
	}
	var meta struct {
		Status  *int                       `json:"status"`
		Headers map[string]json.RawMessage `json:"headers"`
	}
	if json.Unmarshal(raw, &meta) != nil || meta.Status == nil || *meta.Status < 100 || *meta.Status > 599 {
		return errCLIManagementTransport
	}
	a.status = *meta.Status
	for name, rawValues := range meta.Headers {
		if !validResourceHeaderName(name) {
			return errCLIManagementTransport
		}
		values, ok := cliManagementHeaderValues(rawValues)
		if !ok {
			return errCLIManagementTransport
		}
		for _, value := range values {
			if !validResourceHeader(value) {
				return errCLIManagementTransport
			}
			a.header.Add(name, value)
		}
	}
	info, err := os.Stat(a.body)
	if err != nil || !info.Mode().IsRegular() {
		return errCLIManagementTransport
	}
	a.size = info.Size()
	return nil
}

// cliManagementHeaderValues accepts either a JSON string or an array of
// strings for one header of the meta file.
func cliManagementHeaderValues(raw json.RawMessage) ([]string, bool) {
	var one string
	if json.Unmarshal(raw, &one) == nil {
		return []string{one}, true
	}
	var many []string
	if json.Unmarshal(raw, &many) == nil {
		return many, true
	}
	return nil, false
}

// cliManagementHeaderAllowed refuses credential and hop-by-hop headers: the
// CLI supplies its own credential, and the transport owns the rest.
// Accept-Encoding stays allowed: identity is the byte-exact response contract.
func cliManagementHeaderAllowed(name string) bool {
	switch strings.ToLower(strings.TrimSpace(name)) {
	case "authorization", "x-api-key", "proxy-authorization", "cookie", "set-cookie",
		"host", "content-length", "transfer-encoding", "connection":
		return false
	}
	return true
}

func validResourceHeaderName(name string) bool {
	switch name {
	case "":
		return false
	}
	for _, c := range name {
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9':
		case strings.ContainsRune("!#$%&'*+-.^_`|~", c):
		default:
			return false
		}
	}
	return true
}

func sortedHeaderNames(h http.Header) []string {
	names := make([]string, 0, len(h))
	for name := range h {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// readLimitedFile reads at most limit bytes; a larger file is an error, never
// a silently truncated answer.
func readLimitedFile(path string, limit int64) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	raw, err := io.ReadAll(io.LimitReader(f, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(raw)) > limit {
		return nil, fmt.Errorf("file exceeds limit")
	}
	return raw, nil
}
