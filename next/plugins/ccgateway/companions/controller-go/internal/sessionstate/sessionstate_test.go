package sessionstate

import (
	"bufio"
	"context"
	"errors"
	"io/fs"
	"strconv"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/sessionstate/fakevalkey"
)

const adminPass = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

func client(fv *fakevalkey.Server) *Client {
	return &Client{Socket: SocketPath, Secret: func() ([]byte, error) { return []byte(adminPass + "\n"), nil },
		Dial: fv.Dial, Timeout: 300 * time.Millisecond}
}

// covers: SESSION-MEMORY §5.4 the account user's rules, verbatim
func TestRulesVerbatim(t *testing.T) {
	got := strings.Join(append([]string{"ACL", "SETUSER", UserName("21")}, Rules("21", "pw", true)...), " ")
	want := "ACL SETUSER acct-21 reset on #30c952fab122c3f9759f02a6d95c3758b246b4fee239957b2d4fee46e26170c4 resetkeys " +
		"~ccg:21:* resetchannels -@all +hello +get +set +getex +expire +del +exists +ttl +evalsha +eval +script|load +ping"
	if got != want {
		t.Fatalf("got  %s\nwant %s", got, want)
	}
	off := Rules("d0123456789abcdef", "pw", false)
	if off[1] != "off" || off[4] != "~ccg:d0123456789abcdef:*" {
		t.Fatal(off)
	}
	if strings.Contains(strings.Join(Rules("21", "secret-pw", true), " "), "secret-pw") {
		t.Fatal("the password itself must never reach Valkey")
	}
}

// covers: SESSION-MEMORY §7.5 set, delete and observe through the
// management user; every call authenticates as ccg-controller
func TestClientCommands(t *testing.T) {
	fv := fakevalkey.New(adminPass)
	c := client(fv)
	ctx := context.Background()
	if err := c.SetUser(ctx, "21", "pw21", true); err != nil {
		t.Fatal(err)
	}
	if err := c.SetUser(ctx, "22", "pw22", false); err != nil {
		t.Fatal(err)
	}
	if got := strings.Join(fv.User("acct-21"), " "); got != strings.Join(Rules("21", "pw21", true), " ") {
		t.Fatal(got)
	}
	info, err := c.Observe(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if info.RunID != fv.RunID() || info.UsedMemory != 1<<20 || strings.Join(info.Users, ",") != "acct-21,acct-22" ||
		!info.HasUser("22") || info.HasUser("2") {
		t.Fatalf("%+v", info)
	}
	if err := c.DelUser(ctx, "22"); err != nil {
		t.Fatal(err)
	}
	if err := c.DelUser(ctx, "22"); err != nil {
		t.Fatal("deleting an absent user is fine:", err)
	}
	if fv.User("acct-22") != nil {
		t.Fatal("not deleted")
	}
	want := []string{"auth ccg-controller <redacted>", "acl setuser acct-21", "auth ccg-controller <redacted>",
		"acl setuser acct-22", "auth ccg-controller <redacted>", "info server memory stats", "acl list"}
	got := fv.Commands()
	for i, w := range want {
		if !strings.HasPrefix(got[i], w) {
			t.Fatalf("command %d = %q, want %q", i, got[i], w)
		}
	}
	// Keys are checked before anything is sent: a pattern character would
	// widen the user's key pattern.
	fv.ResetCommands()
	for _, bad := range []string{"", "*", "21*", "2?", "21:x", "acct", "0", "../21"} {
		if c.SetUser(ctx, bad, "pw", true) == nil || c.DelUser(ctx, bad) == nil {
			t.Fatalf("key %q accepted", bad)
		}
	}
	if c.SetUser(ctx, "21", "", true) == nil {
		t.Fatal("empty password accepted")
	}
	if n := len(fv.Commands()); n != 0 {
		t.Fatalf("%d commands sent for invalid input", n)
	}
}

// covers: SESSION-MEMORY §7.5 no password file, a bad one, a wrong one, a
// stopped or hung Valkey: each is an error of that call only, bounded
func TestClientFailures(t *testing.T) {
	ctx := context.Background()
	fv := fakevalkey.New(adminPass)

	c := client(fv)
	c.Secret = func() ([]byte, error) { return nil, fs.ErrNotExist }
	if err := c.SetUser(ctx, "21", "pw", true); !errors.Is(err, ErrNotConfigured) {
		t.Fatal(err)
	}
	c.Secret = nil
	if _, err := c.Observe(ctx); !errors.Is(err, ErrNotConfigured) {
		t.Fatal(err)
	}
	for _, bad := range []string{"", "\n", "short\n", "not hex at all, but long enough to pass the length check\n",
		adminPass + " trailing\n", adminPass + "\n" + adminPass + "\n"} {
		c.Secret = func() ([]byte, error) { return []byte(bad), nil }
		if err := c.SetUser(ctx, "21", "pw", true); err == nil || errors.Is(err, ErrNotConfigured) {
			t.Fatalf("secret %q: %v", bad, err)
		}
	}
	if len(fv.Commands()) != 0 {
		t.Fatal("a bad secret must not reach the server")
	}

	c = client(fv)
	c.Secret = func() ([]byte, error) { return []byte(strings.Repeat("ab", 32)), nil }
	if err := c.SetUser(ctx, "21", "pw", true); !IsServerError(err, "WRONGPASS") {
		t.Fatal(err)
	}

	c = client(fv)
	fv.FailNext("acl|setuser", "NOPERM this user has no permissions to run the 'acl|setuser' command")
	if err := c.SetUser(ctx, "21", "pw", true); !IsServerError(err, "NOPERM") {
		t.Fatal(err)
	}

	fv.SetDown(true)
	if err := c.SetUser(ctx, "21", "pw", true); err == nil || errors.Is(err, ErrNotConfigured) {
		t.Fatal("refused connection:", err)
	}
	fv.SetDown(false)

	fv.SetHang(true)
	start := time.Now()
	if _, err := c.Observe(ctx); err == nil {
		t.Fatal("hung server answered")
	}
	if d := time.Since(start); d > 2*time.Second {
		t.Fatalf("a hung Valkey held the call %v (timeout 300ms)", d)
	}
	fv.SetHang(false)
	cctx, cancel := context.WithCancel(ctx)
	cancel()
	if err := c.SetUser(cctx, "21", "pw", true); err == nil {
		t.Fatal("cancelled context")
	}
	if err := c.SetUser(ctx, "21", "pw", true); err != nil {
		t.Fatal("recovered:", err)
	}
}

// covers: the RESP decoder: every reply type, nested arrays, limits
func TestReadReply(t *testing.T) {
	cases := map[string]string{
		"+OK\r\n":                 "OK",
		":42\r\n":                 "42",
		"$5\r\nhello\r\n":         "hello",
		"$0\r\n\r\n":              "",
		"$-1\r\n":                 "<nil>",
		"*-1\r\n":                 "<nil>",
		"*2\r\n$1\r\na\r\n:1\r\n": "[a 1]",
		"*1\r\n*1\r\n+x\r\n":      "[[x]]",
		"-ERR boom\r\n":           "error:ERR",
		"$3\r\nabcd\r\n":          "error:protocol",
		"$99999999999\r\n":        "error:protocol",
		"*99999999\r\n":           "error:protocol",
		"?\r\n":                   "error:protocol",
		"*1\r\n*1\r\n*1\r\n*1\r\n*1\r\n*1\r\n+x\r\n": "error:protocol",
		"$5\r\nhel": "error:eof",
	}
	for in, want := range cases {
		v, err := readReply(bufio.NewReader(strings.NewReader(in)), 0)
		got := ""
		switch {
		case err == nil:
			got = fmtAny(v)
		case IsServerError(err, ""):
			got = "error:" + err.(*ServerError).Code()
		case errors.Is(err, errProtocol):
			got = "error:protocol"
		default:
			got = "error:eof"
		}
		if got != want {
			t.Errorf("%q: got %s, want %s", in, got, want)
		}
	}
}

func fmtAny(v any) string {
	switch x := v.(type) {
	case nil:
		return "<nil>"
	case string:
		return x
	case int64:
		return strconv.FormatInt(x, 10)
	case []any:
		parts := make([]string, len(x))
		for i, e := range x {
			parts[i] = fmtAny(e)
		}
		return "[" + strings.Join(parts, " ") + "]"
	}
	return "?"
}
