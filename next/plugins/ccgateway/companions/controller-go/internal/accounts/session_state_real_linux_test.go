//go:build linux && realvalkey

package accounts

import (
	"bufio"
	"context"
	"net"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/sessionstate"
)

// SESSION-MEMORY-TOOLS-USED-DESIGN.md §7.5 §10.2: the Manager against a
// real Valkey (integration/state/run.sh; the settings are those of
// sessionstate's realvalkey_linux_test.go; -tags realvalkey only).

func (e *env) withRealValkey() *sessionstate.Client {
	e.t.Helper()
	sock, secret := os.Getenv("CCG_REAL_VALKEY_SOCKET"), os.Getenv("CCG_REAL_VALKEY_SECRET_FILE")
	if sock == "" || secret == "" {
		e.t.Fatal("CCG_REAL_VALKEY_SOCKET / CCG_REAL_VALKEY_SECRET_FILE not set")
	}
	c := &sessionstate.Client{Socket: sock, Timeout: 2 * time.Second,
		Secret: func() ([]byte, error) { return os.ReadFile(secret) }}
	e.m.state = c
	e.g.SetSessionState(true)
	e.t.Cleanup(func() {
		for _, k := range []string{"7", "8"} {
			c.DelUser(context.Background(), k)
		}
	})
	return c
}

// signIn is AUTH acct-<key> and a write to the account's own prefix and to
// another's; it returns the AUTH error ("" = signed in) and whether each
// write was allowed.
func signIn(t *testing.T, c *sessionstate.Client, key, pw, other string) (authErr string, own, foreign bool) {
	t.Helper()
	nc, err := net.DialTimeout("unix", c.Socket, time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer nc.Close()
	nc.SetDeadline(time.Now().Add(2 * time.Second))
	r, w := bufio.NewReader(nc), bufio.NewWriter(nc)
	do := func(argv ...string) string {
		w.WriteString("*" + strconv.Itoa(len(argv)) + "\r\n")
		for _, a := range argv {
			w.WriteString("$" + strconv.Itoa(len(a)) + "\r\n" + a + "\r\n")
		}
		w.Flush()
		line, err := r.ReadString('\n')
		if err != nil {
			t.Fatal(err)
		}
		return strings.TrimRight(line, "\r\n")
	}
	if l := do("AUTH", sessionstate.UserName(key), pw); l != "+OK" {
		return l, false, false
	}
	own = do("SET", "ccg:"+key+":probe", "1", "EX", "60") == "+OK"
	foreign = do("SET", "ccg:"+other+":probe", "1", "EX", "60") == "+OK"
	return "", own, foreign
}

func observe(t *testing.T, c *sessionstate.Client) *sessionstate.Info {
	t.Helper()
	info, err := c.Observe(bg)
	if err != nil {
		t.Fatal(err)
	}
	return info
}

func restartReal(t *testing.T, c *sessionstate.Client) {
	t.Helper()
	old := observe(t, c).RunID
	entries, _ := os.ReadDir("/proc")
	killed := false
	for _, e := range entries {
		comm, err := os.ReadFile("/proc/" + e.Name() + "/comm")
		if err != nil || strings.TrimSpace(string(comm)) != "valkey-server" {
			continue
		}
		pid := 0
		for _, r := range e.Name() {
			pid = pid*10 + int(r-'0')
		}
		if p, err := os.FindProcess(pid); err == nil && p.Signal(os.Interrupt) == nil {
			killed = true
		}
	}
	if !killed {
		t.Fatal("no valkey-server process")
	}
	for i := 0; i < 150; i++ {
		if info, err := c.Observe(bg); err == nil && info.RunID != old {
			return
		}
		time.Sleep(200 * time.Millisecond)
	}
	t.Fatal("Valkey did not come back")
}

// covers: SESSION-MEMORY §7.5 §10.2 provision, the background pass after a
// user is deleted behind the controller's back and after a Valkey restart,
// block and delete, each checked by signing in as the Worker would
func TestRealValkeyManager(t *testing.T) {
	e := newEnv(t)
	c := e.withRealValkey()
	e.mustApply("7", desired(rev))
	e.mustApply("8", desired(rev))
	p7, p8 := e.state("7").StatePassword, e.state("8").StatePassword
	if a, own, foreign := signIn(t, c, "7", p7, "8"); a != "" || !own || foreign {
		t.Fatalf("acct-7: auth %q own %v foreign %v", a, own, foreign)
	}
	if a, own, foreign := signIn(t, c, "8", p8, "7"); a != "" || !own || foreign {
		t.Fatalf("acct-8: auth %q own %v foreign %v", a, own, foreign)
	}
	if a, _, _ := signIn(t, c, "7", p8, "8"); !strings.HasPrefix(a, "-WRONGPASS") {
		t.Fatalf("acct-7 with 8's password: %q", a)
	}
	e.m.sharedPass(bg)

	// Deleted behind the controller's back: the next pass puts it back.
	if err := c.DelUser(bg, "8"); err != nil {
		t.Fatal(err)
	}
	e.m.sharedPass(bg)
	if !observe(t, c).HasUser("8") {
		t.Fatal("acct-8 not restored")
	}
	if a, own, _ := signIn(t, c, "8", p8, "7"); a != "" || !own {
		t.Fatal("acct-8 after the pass", a)
	}

	// A restart loses every runtime user; one pass restores them all.
	restartReal(t, c)
	if info := observe(t, c); info.HasUser("7") || info.HasUser("8") {
		t.Fatal("users survived the restart", info.Users)
	}
	e.m.sharedPass(bg)
	info := observe(t, c)
	if !info.HasUser("7") || !info.HasUser("8") {
		t.Fatal("not restored after the restart", info.Users)
	}
	if !strings.Contains(e.logs.String(), "session state Valkey restarted") {
		t.Fatal(e.logs.String())
	}
	for _, k := range []struct{ key, pw, other string }{{"7", p7, "8"}, {"8", p8, "7"}} {
		if a, own, foreign := signIn(t, c, k.key, k.pw, k.other); a != "" || !own || foreign {
			t.Fatalf("acct-%s after the restart: %q %v %v", k.key, a, own, foreign)
		}
	}

	// Block switches the user off; the pass keeps it off; apply turns it on.
	if s := e.kindOf("7", pyjson.Ordered{kv("revision", revB), kv("proxy", nil)}); s != "blocked" {
		t.Fatal(s)
	}
	if a, _, _ := signIn(t, c, "7", p7, "8"); !strings.HasPrefix(a, "-WRONGPASS") {
		t.Fatalf("blocked acct-7 signed in: %q", a)
	}
	restartReal(t, c)
	e.m.sharedPass(bg)
	if a, _, _ := signIn(t, c, "7", p7, "8"); !strings.HasPrefix(a, "-WRONGPASS") {
		t.Fatalf("blocked acct-7 after restart and pass: %q", a)
	}
	e.mustApply("7", desired(revC))
	if a, own, _ := signIn(t, c, "7", p7, "8"); a != "" || !own {
		t.Fatal("unblocked acct-7", a)
	}

	// Delete removes the user; the other stays.
	if _, err := e.m.Delete(bg, "7", true, true); err != nil {
		t.Fatal(err)
	}
	info = observe(t, c)
	if info.HasUser("7") || !info.HasUser("8") {
		t.Fatal(info.Users)
	}
	if a, _, _ := signIn(t, c, "7", p7, "8"); !strings.HasPrefix(a, "-WRONGPASS") {
		t.Fatalf("deleted acct-7 signed in: %q", a)
	}
	e.m.sharedPass(bg)
	if observe(t, c).HasUser("7") {
		t.Fatal("the pass brought a deleted user back")
	}
}
