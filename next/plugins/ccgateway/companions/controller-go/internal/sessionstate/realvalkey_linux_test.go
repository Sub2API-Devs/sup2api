//go:build linux && realvalkey

package sessionstate

import (
	"bufio"
	"context"
	"errors"
	"net"
	"os"
	"strings"
	"testing"
	"time"
)

// SESSION-MEMORY-TOOLS-USED-DESIGN.md §10.2 against a real Valkey: the
// compose service's image, arguments and users.acl, set up by
// integration/state/run.sh, which runs the test binaries inside that image
// next to a loop that keeps valkey-server running (RestartRealValkey stops
// it), with
//
//	CCG_REAL_VALKEY_SOCKET       the socket
//	CCG_REAL_VALKEY_SECRET_FILE  the management password file
//
// Built only with -tags realvalkey (never in the default suite, which may not
// skip); there the settings are required. The binaries share the server and
// run one after another.

func realClient(t *testing.T) *Client {
	t.Helper()
	sock, secret := os.Getenv("CCG_REAL_VALKEY_SOCKET"), os.Getenv("CCG_REAL_VALKEY_SECRET_FILE")
	if sock == "" || secret == "" {
		t.Fatal("CCG_REAL_VALKEY_SOCKET / CCG_REAL_VALKEY_SECRET_FILE not set")
	}
	return &Client{Socket: sock, Secret: func() ([]byte, error) { return os.ReadFile(secret) }, Timeout: 2 * time.Second}
}

// raw is one plain connection, unauthenticated.
type raw struct {
	t *testing.T
	k *conn
}

func dialRaw(t *testing.T, c *Client) *raw {
	t.Helper()
	nc, err := net.DialTimeout("unix", c.Socket, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { nc.Close() })
	return &raw{t: t, k: &conn{c: nc, r: bufio.NewReader(nc), w: bufio.NewWriter(nc)}}
}

func (r *raw) do(argv ...string) (any, error) {
	r.k.c.SetDeadline(time.Now().Add(2 * time.Second))
	return r.k.do(argv...)
}

func (r *raw) ok(argv ...string) any {
	r.t.Helper()
	v, err := r.do(argv...)
	if err != nil {
		r.t.Fatalf("%q: %v", argv, err)
	}
	return v
}

// refused wants an error reply with code.
func (r *raw) refused(code string, argv ...string) {
	r.t.Helper()
	v, err := r.do(argv...)
	if !IsServerError(err, code) {
		r.t.Fatalf("%q: want %s, got %v %v", argv, code, v, err)
	}
}

func asUser(t *testing.T, c *Client, key, pw string) *raw {
	t.Helper()
	r := dialRaw(t, c)
	r.ok("AUTH", UserName(key), pw)
	return r
}

const (
	realA, realB   = "21", "22"
	realPA, realPB = "aaaa1111aaaa1111aaaa1111aaaa1111", "bbbb2222bbbb2222bbbb2222bbbb2222"
)

func setUsers(t *testing.T, c *Client) {
	t.Helper()
	ctx := context.Background()
	for k, pw := range map[string]string{realA: realPA, realB: realPB} {
		if err := c.SetUser(ctx, k, pw, true); err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { c.DelUser(context.Background(), k) })
	}
}

// covers: SESSION-MEMORY §10.2 an account user reaches its own prefix with
// the commands the Worker uses, and nothing else
func TestRealValkeyIsolation(t *testing.T) {
	c := realClient(t)
	setUsers(t, c)
	b := asUser(t, c, realB, realPB)
	b.ok("SET", "ccg:22:s:x:tools", `["Read"]`, "EX", "60")

	a := asUser(t, c, realA, realPA)
	// Own keys: the Worker's commands.
	a.ok("PING")
	a.ok("SET", "ccg:21:s:x:t:y", "v", "EX", "60")
	if v := a.ok("GET", "ccg:21:s:x:t:y"); v != "v" {
		t.Fatal(v)
	}
	a.ok("GETEX", "ccg:21:s:x:t:y", "EX", "120")
	if v := a.ok("TTL", "ccg:21:s:x:t:y"); v.(int64) < 100 {
		t.Fatal(v)
	}
	a.ok("EXPIRE", "ccg:21:s:x:t:y", "60")
	a.ok("EXISTS", "ccg:21:s:x:t:y")
	sha := a.ok("SCRIPT", "LOAD", "return redis.call('GET', KEYS[1])").(string)
	if v := a.ok("EVALSHA", sha, "1", "ccg:21:s:x:t:y"); v != "v" {
		t.Fatal(v)
	}
	a.ok("EVAL", "return redis.call('SET', KEYS[1], 'w', 'EX', 60)", "1", "ccg:21:s:x:t:z")
	a.ok("DEL", "ccg:21:s:x:t:z")

	// The other account's keys, directly and through a script.
	a.refused("NOPERM", "GET", "ccg:22:s:x:tools")
	a.refused("NOPERM", "SET", "ccg:22:s:x:tools", "[]")
	a.refused("NOPERM", "DEL", "ccg:22:s:x:tools")
	a.refused("NOPERM", "EXPIRE", "ccg:22:s:x:tools", "1")
	a.refused("NOPERM", "GETEX", "ccg:22:s:x:tools", "PERSIST")
	a.refused("NOPERM", "EVAL", "return redis.call('GET', KEYS[1])", "1", "ccg:22:s:x:tools")
	a.refused("NOPERM", "EVALSHA", sha, "1", "ccg:22:s:x:tools")
	// A key the script did not declare, own prefix or not.
	if _, err := a.do("EVAL", "return redis.call('GET', 'ccg:22:s:x:tools')", "1", "ccg:21:s:x:t:y"); err == nil {
		t.Fatal("undeclared key through a script")
	}
	// Prefix games: the pattern is ccg:21:*, nothing shorter or beside it.
	a.refused("NOPERM", "SET", "ccg:2", "x")
	a.refused("NOPERM", "SET", "ccg:210:x", "x")
	a.refused("NOPERM", "GET", "other")
	// Everything outside the Worker's commands.
	for _, argv := range [][]string{
		{"KEYS", "*"}, {"SCAN", "0"}, {"FLUSHALL"}, {"FLUSHDB"}, {"CONFIG", "GET", "*"}, {"INFO"},
		{"ACL", "LIST"}, {"ACL", "WHOAMI"}, {"ACL", "SETUSER", "acct-21", "on", "allkeys"}, {"CLIENT", "LIST"},
		{"CLIENT", "KILL", "TYPE", "normal"}, {"SCRIPT", "FLUSH"}, {"SUBSCRIBE", "x"}, {"PUBLISH", "x", "y"},
		{"MONITOR"}, {"SHUTDOWN"}, {"SAVE"}, {"MODULE", "LIST"}, {"FUNCTION", "LIST"},
		{"DBSIZE"}, {"RANDOMKEY"}, {"SELECT", "1"}, {"MIGRATE", "x", "1", "k", "0", "1"}, {"RENAME", "ccg:21:a", "ccg:21:b"},
		{"COPY", "ccg:22:s:x:tools", "ccg:21:c"}, {"OBJECT", "ENCODING", "ccg:21:s:x:t:y"}, {"MEMORY", "USAGE", "ccg:21:s:x:t:y"},
	} {
		a.refused("NOPERM", argv...)
	}
	// DEBUG is refused before the ACL (enable-debug-command no).
	a.refused("", "DEBUG", "SLEEP", "0")
	// B's key is intact.
	if v := b.ok("GET", "ccg:22:s:x:tools"); v != `["Read"]` {
		t.Fatal(v)
	}
}

// covers: SESSION-MEMORY §10.2 the default user and wrong passwords are
// refused; HELLO (go-redis's first command) and AUTH both sign in
func TestRealValkeySignIn(t *testing.T) {
	c := realClient(t)
	setUsers(t, c)
	r := dialRaw(t, c)
	r.refused("NOAUTH", "PING")
	r.refused("NOAUTH", "GET", "ccg:21:x")
	r.refused("WRONGPASS", "AUTH", "nopass")
	r.refused("WRONGPASS", "AUTH", "default", "")
	r.refused("WRONGPASS", "AUTH", "default", "x")
	r.refused("WRONGPASS", "AUTH", UserName(realA), realPB)
	r.refused("WRONGPASS", "AUTH", UserName("23"), realPA)
	r.refused("WRONGPASS", "AUTH", AdminUser, realPA)
	r.refused("NOAUTH", "PING")
	// HELLO 2 (RESP2 replies; go-redis's own HELLO is the engine's real tests).
	for _, proto := range []string{"2"} {
		h := dialRaw(t, c)
		if _, err := h.do("HELLO", proto, "AUTH", UserName(realA), realPA); err != nil {
			t.Fatalf("HELLO %s: %v", proto, err)
		}
		h.ok("PING")
		h.refused("NOPERM", "GET", "ccg:22:x")
	}
	h := dialRaw(t, c)
	h.refused("WRONGPASS", "HELLO", "2", "AUTH", UserName(realA), realPB)
	// The management user: ACL and INFO, never a key.
	adm := dialRaw(t, c)
	pw, err := c.password()
	if err != nil {
		t.Fatal(err)
	}
	adm.ok("AUTH", AdminUser, pw)
	adm.ok("INFO", "server")
	adm.ok("ACL", "LIST")
	adm.refused("NOPERM", "GET", "ccg:21:x")
	adm.refused("NOPERM", "KEYS", "*")
	adm.refused("NOPERM", "CONFIG", "SET", "maxmemory", "0")
	adm.refused("NOPERM", "ACL", "SAVE")
	adm.refused("NOPERM", "ACL", "LOAD")
	adm.refused("NOPERM", "FLUSHALL")
	adm.refused("NOPERM", "SHUTDOWN")
}

// covers: SESSION-MEMORY §10.2 §12 what block (off) and delete do to a
// connection that signed in before
func TestRealValkeyBlockAndDelete(t *testing.T) {
	c := realClient(t)
	ctx := context.Background()
	setUsers(t, c)
	before := asUser(t, c, realA, realPA)
	before.ok("SET", "ccg:21:k", "1", "EX", "60")
	if err := c.SetUser(ctx, realA, realPA, false); err != nil {
		t.Fatal(err)
	}
	// A new sign-in is refused.
	dialRaw(t, c).refused("WRONGPASS", "AUTH", UserName(realA), realPA)
	// The connection from before keeps working, still limited to its own
	// prefix (Valkey 9.1.2, 2026-11-05; design §12: a blocked account's
	// container is stopped anyway). Should Valkey start closing it, this
	// fails and §12 changes.
	if v := before.ok("GET", "ccg:21:k"); v != "1" {
		t.Fatal(v)
	}
	before.refused("NOPERM", "GET", "ccg:22:s:x:tools")
	if err := c.SetUser(ctx, realA, realPA, true); err != nil {
		t.Fatal(err)
	}
	before.ok("GET", "ccg:21:k")
	after := asUser(t, c, realA, realPA)
	if v := after.ok("GET", "ccg:21:k"); v != "1" {
		t.Fatal(v)
	}
	if err := c.DelUser(ctx, realA); err != nil {
		t.Fatal(err)
	}
	// DELUSER closes the connections of the user.
	if v, err := after.do("GET", "ccg:21:k"); err == nil || IsServerError(err, "") {
		t.Fatalf("after DELUSER the connection still answers: %v %v", v, err)
	}
	dialRaw(t, c).refused("WRONGPASS", "AUTH", UserName(realA), realPA)
	info, err := c.Observe(ctx)
	if err != nil || info.HasUser(realA) || !info.HasUser(realB) {
		t.Fatal(info, err)
	}
}

// covers: SESSION-MEMORY §5.1 §10.2 a restart keeps no data and no runtime
// user; the management user comes back from users.acl
func TestRealValkeyRestart(t *testing.T) {
	c := realClient(t)
	ctx := context.Background()
	setUsers(t, c)
	asUser(t, c, realA, realPA).ok("SET", "ccg:21:k", "1", "EX", "600")
	info, err := c.Observe(ctx)
	if err != nil || !info.HasUser(realA) {
		t.Fatal(info, err)
	}
	if info.UsedMemory <= 0 {
		t.Fatal(info.UsedMemory)
	}
	run := RestartRealValkey(t, c, info.RunID)
	info, err = c.Observe(ctx)
	if err != nil || info.RunID != run || len(info.Users) != 0 {
		t.Fatal(info, err)
	}
	if err := c.SetUser(ctx, realA, realPA, true); err != nil {
		t.Fatal(err)
	}
	if v := asUser(t, c, realA, realPA).ok("GET", "ccg:21:k"); v != nil {
		t.Fatalf("data survived the restart: %v", v)
	}
}

// RestartRealValkey stops valkey-server (run.sh's loop starts it again) and waits for a new run_id, which it returns.
func RestartRealValkey(t *testing.T, c *Client, old string) string {
	t.Helper()
	if err := killValkey(); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(30 * time.Second)
	for time.Now().Before(deadline) {
		if info, err := c.Observe(context.Background()); err == nil && info.RunID != old {
			return info.RunID
		}
		time.Sleep(200 * time.Millisecond)
	}
	t.Fatal("Valkey did not come back")
	return ""
}

func killValkey() error {
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return err
	}
	for _, e := range entries {
		comm, err := os.ReadFile("/proc/" + e.Name() + "/comm")
		if err != nil || strings.TrimSpace(string(comm)) != "valkey-server" {
			continue
		}
		p, err := os.FindProcess(atoi(e.Name()))
		if err != nil {
			return err
		}
		return p.Signal(os.Interrupt)
	}
	return errors.New("no valkey-server process (run inside the Valkey image)")
}

func atoi(s string) int {
	n := 0
	for _, r := range s {
		n = n*10 + int(r-'0')
	}
	return n
}
