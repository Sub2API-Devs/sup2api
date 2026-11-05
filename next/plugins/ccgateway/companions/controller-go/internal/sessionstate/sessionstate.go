// Package sessionstate is the controller side of the per-host session Valkey
// (SESSION-MEMORY-TOOLS-USED-DESIGN.md §5.4, §7.5): one ACL user per
// account, created, refreshed, switched off and deleted through the
// management user ccg-controller, whose password the install script leaves
// in the data root. The controller never reads or writes a key.
//
// Every call is bounded and every failure is only a failure of that call:
// an account whose Valkey user cannot be set keeps working, its Worker
// falls back to process memory.
package sessionstate

import (
	"bufio"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io/fs"
	"net"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"syscall"
	"time"

	"ccgateway/controller/internal/names"
)

const (
	// Feature is the guard feature (new app containers get the socket
	// mount) and the controller feature (it hands out credentials).
	Feature = "session-state-v1"
	// SocketPath is the Valkey socket in the controller container and in
	// account containers (the guard's read-only bind of <runtime>/state).
	SocketPath = "/run/ccg-state/valkey.sock"
	// AdminUser is the management user of users.acl.
	AdminUser = "ccg-controller"
	// SecretFile is the management password, relative to the data root
	// (/data/state-admin.secret; the install script writes it).
	SecretFile = "state-admin.secret"
	// Worker environment (set when the container is created).
	EnvSocket   = "CCG_STATE_SOCKET"
	EnvUser     = "CCG_STATE_USER"
	EnvPassword = "CCG_STATE_PASSWORD"
	// DefaultTimeout bounds one call: dial, AUTH and the commands.
	DefaultTimeout = 3 * time.Second
)

// UserName is the account's ACL user.
func UserName(key string) string { return "acct-" + key }

// KeyPattern is the only key pattern the account's user may touch.
func KeyPattern(key string) string { return "~ccg:" + key + ":*" }

// commands are the account user's commands (§5.4), in order. +hello: the
// Worker's go-redis sends HELLO first on every new connection; refused, it
// falls back to AUTH at the cost of a round trip and a rejection.
var commands = []string{"+hello", "+get", "+set", "+getex", "+expire", "+del", "+exists", "+ttl", "+evalsha", "+eval",
	"+script|load", "+ping"}

// Rules are the ACL SETUSER arguments after the user name (§5.4, verbatim):
// reset on|off #<sha256(password)> resetkeys ~ccg:<key>:* resetchannels
// -@all +hello +get ... +ping. Only the hash goes to Valkey. "reset" first makes
// the call idempotent: the user ends up with exactly these rules.
func Rules(key, password string, enabled bool) []string {
	sum := sha256.Sum256([]byte(password))
	state := "on"
	if !enabled {
		state = "off"
	}
	out := []string{"reset", state, "#" + hex.EncodeToString(sum[:]), "resetkeys", KeyPattern(key), "resetchannels", "-@all"}
	return append(out, commands...)
}

// Info is one observation of the server.
type Info struct {
	RunID       string
	UsedMemory  int64
	EvictedKeys int64
	// Users are the acct-* users, sorted.
	Users []string
}

// HasUser reports whether the account's user exists.
func (i *Info) HasUser(key string) bool {
	name := UserName(key)
	n := sort.SearchStrings(i.Users, name)
	return n < len(i.Users) && i.Users[n] == name
}

// Admin is what the accounts manager and /health need.
type Admin interface {
	// SetUser creates or replaces the account's user (Rules).
	SetUser(ctx context.Context, key, password string, enabled bool) error
	// DelUser removes the account's user (absent is fine); Valkey closes
	// the connections authenticated as it.
	DelUser(ctx context.Context, key string) error
	// Observe reads INFO server/memory/stats and ACL LIST.
	Observe(ctx context.Context) (*Info, error)
}

// ErrNotConfigured is a host without the session Valkey: no socket, or no
// management password. Callers log it once, not per account.
var ErrNotConfigured = errors.New("session state not configured")

var (
	secretHex = regexp.MustCompile(`^[0-9A-Fa-f]{32,256}$`)
	errSecret = errors.New("session state: the management password file is not one line of hex")
	errKey    = errors.New("session state: invalid account key")
)

// Client is Admin over the unix socket, one connection per call.
type Client struct {
	Socket string // SocketPath
	// Secret reads the management password file (store.ReadFile(SecretFile));
	// it is read on every call, so the file may appear after the start.
	Secret func() ([]byte, error)
	// Timeout of one call; 0 is DefaultTimeout.
	Timeout time.Duration
	// Dial is the connection (tests); nil dials the unix socket.
	Dial func(ctx context.Context, socket string) (net.Conn, error)
}

var _ Admin = (*Client)(nil)

func (c *Client) timeout() time.Duration {
	if c.Timeout > 0 {
		return c.Timeout
	}
	return DefaultTimeout
}

func (c *Client) password() (string, error) {
	if c.Secret == nil {
		return "", ErrNotConfigured
	}
	b, err := c.Secret()
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return "", ErrNotConfigured
		}
		return "", err
	}
	s := strings.TrimRight(string(b), "\r\n")
	if !secretHex.MatchString(s) {
		return "", errSecret
	}
	return s, nil
}

func (c *Client) dial(ctx context.Context) (net.Conn, error) {
	if c.Dial != nil {
		return c.Dial(ctx, c.Socket)
	}
	var d net.Dialer
	conn, err := d.DialContext(ctx, "unix", c.Socket)
	if err != nil && (errors.Is(err, fs.ErrNotExist) || errors.Is(err, syscall.ENOENT)) {
		return nil, ErrNotConfigured
	}
	return conn, err
}

// conn is one authenticated connection.
type conn struct {
	c net.Conn
	r *bufio.Reader
	w *bufio.Writer
}

func (k *conn) do(argv ...string) (any, error) {
	if err := writeCommand(k.w, argv); err != nil {
		return nil, err
	}
	return readReply(k.r, 0)
}

// with runs fn on a fresh connection authenticated as the management user.
func (c *Client) with(ctx context.Context, fn func(*conn) error) error {
	pw, err := c.password()
	if err != nil {
		return err
	}
	ctx, cancel := context.WithTimeout(ctx, c.timeout())
	defer cancel()
	nc, err := c.dial(ctx)
	if err != nil {
		return err
	}
	defer nc.Close()
	deadline, _ := ctx.Deadline()
	if err := nc.SetDeadline(deadline); err != nil {
		return err
	}
	stop := context.AfterFunc(ctx, func() { nc.SetDeadline(time.Unix(1, 0)) })
	defer stop()
	k := &conn{c: nc, r: bufio.NewReader(nc), w: bufio.NewWriter(nc)}
	if _, err := k.do("AUTH", AdminUser, pw); err != nil {
		return err
	}
	return fn(k)
}

func checkKey(key string) error {
	if !names.Key.MatchString(key) {
		return errKey
	}
	return nil
}

// SetUser is ACL SETUSER acct-<key> <Rules>.
func (c *Client) SetUser(ctx context.Context, key, password string, enabled bool) error {
	if err := checkKey(key); err != nil {
		return err
	}
	if password == "" {
		return errors.New("session state: empty account password")
	}
	return c.with(ctx, func(k *conn) error {
		argv := append([]string{"ACL", "SETUSER", UserName(key)}, Rules(key, password, enabled)...)
		v, err := k.do(argv...)
		if err != nil {
			return err
		}
		if v != "OK" {
			return errProtocol
		}
		return nil
	})
}

// DelUser is ACL DELUSER acct-<key>.
func (c *Client) DelUser(ctx context.Context, key string) error {
	if err := checkKey(key); err != nil {
		return err
	}
	return c.with(ctx, func(k *conn) error {
		v, err := k.do("ACL", "DELUSER", UserName(key))
		if err != nil {
			return err
		}
		if _, ok := v.(int64); !ok {
			return errProtocol
		}
		return nil
	})
}

// Observe is INFO server memory stats and ACL LIST on one connection.
func (c *Client) Observe(ctx context.Context) (*Info, error) {
	var info Info
	err := c.with(ctx, func(k *conn) error {
		v, err := k.do("INFO", "server", "memory", "stats")
		if err != nil {
			return err
		}
		text, ok := v.(string)
		if !ok {
			return errProtocol
		}
		fields := infoFields(text)
		info.RunID = fields["run_id"]
		if info.RunID == "" {
			return errors.New("session state: INFO has no run_id")
		}
		info.UsedMemory, _ = strconv.ParseInt(fields["used_memory"], 10, 64)
		info.EvictedKeys, _ = strconv.ParseInt(fields["evicted_keys"], 10, 64)
		v, err = k.do("ACL", "LIST")
		if err != nil {
			return err
		}
		lines, ok := v.([]any)
		if !ok {
			return errProtocol
		}
		for _, l := range lines {
			s, _ := l.(string)
			f := strings.Fields(s)
			if len(f) >= 2 && f[0] == "user" && strings.HasPrefix(f[1], "acct-") {
				info.Users = append(info.Users, f[1])
			}
		}
		sort.Strings(info.Users)
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &info, nil
}

// infoFields parses "key:value" lines (sections and comments skipped).
func infoFields(text string) map[string]string {
	out := map[string]string{}
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimRight(line, "\r")
		if line == "" || line[0] == '#' {
			continue
		}
		if k, v, ok := strings.Cut(line, ":"); ok {
			out[k] = v
		}
	}
	return out
}
