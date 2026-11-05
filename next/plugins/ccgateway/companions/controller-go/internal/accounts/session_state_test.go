package accounts

import (
	"regexp"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/auth"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/sessionstate"
	"ccgateway/controller/internal/sessionstate/fakevalkey"
	"ccgateway/controller/internal/store"
)

// Session state (SESSION-MEMORY-TOOLS-USED-DESIGN.md §5.4, §7.5) against a
// FakeGuard and a fake Valkey that records every command.

const stateAdminPass = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"

var hex64 = regexp.MustCompile(`^[0-9a-f]{64}$`)

// withValkey gives the Manager a session Valkey; guardOn is the guard's
// CCG_GUARD_SESSION_STATE switch.
func (e *env) withValkey(guardOn bool) *fakevalkey.Server {
	e.t.Helper()
	fv := fakevalkey.New(stateAdminPass)
	e.m.state = &sessionstate.Client{Socket: sessionstate.SocketPath, Dial: fv.Dial, Timeout: 200 * time.Millisecond,
		Secret: func() ([]byte, error) { return []byte(stateAdminPass + "\n"), nil }}
	e.g.SetSessionState(guardOn)
	return fv
}

func (e *env) stateMounts(aid string) int {
	n := 0
	for _, m := range e.app(aid).Mounts {
		if m.Source == "/opt/ccgateway-runtime/state" && m.Destination == "/run/ccg-state" && !m.RW {
			n++
		}
	}
	return n
}

func wantRules(t *testing.T, fv *fakevalkey.Server, aid, password string, on bool) {
	t.Helper()
	got := strings.Join(fv.User("acct-"+aid), " ")
	if want := strings.Join(sessionstate.Rules(aid, password, on), " "); got != want {
		t.Fatalf("acct-%s rules:\n got  %s\n want %s", aid, got, want)
	}
}

// covers: SESSION-MEMORY §7.5 provision with the guard's session state: a
// password (hex 64) in state.json, the user set before the container is
// created, the three Worker settings, the third mount
func TestSessionStateProvision(t *testing.T) {
	e := newEnv(t)
	fv := e.withValkey(true)
	e.mustApply("7", desired(rev))
	st := e.state("7")
	if !hex64.MatchString(st.StatePassword) {
		t.Fatalf("state_password %q", st.StatePassword)
	}
	b, _ := e.st.StateBytes("7")
	if !strings.Contains(string(b), `"state_password": "`+st.StatePassword+`"`) {
		t.Fatalf("state.json: %s", b)
	}
	wantRules(t, fv, "7", st.StatePassword, true)
	env := e.appEnv("7")
	if env["CCG_STATE_SOCKET"] != "/run/ccg-state/valkey.sock" || env["CCG_STATE_USER"] != "acct-7" ||
		env["CCG_STATE_PASSWORD"] != st.StatePassword {
		t.Fatalf("env %v", env)
	}
	if e.stateMounts("7") != 1 {
		t.Fatalf("mounts %+v", e.app("7").Mounts)
	}
	// The user existed before PUT app: the first SETUSER precedes it.
	calls := strings.Join(fv.Commands(), "\n")
	if !strings.Contains(calls, "acl setuser acct-7 reset on #") {
		t.Fatal(calls)
	}
	// Two runtimes, two passwords.
	e.mustApply("8", desired(rev))
	if p8 := e.state("8").StatePassword; p8 == st.StatePassword || !hex64.MatchString(p8) {
		t.Fatal("passwords must differ per account")
	}
}

// covers: SESSION-MEMORY §7.4 §11 a guard without session-state-v1 (switch
// off): no password, no user, no settings, two mounts
func TestSessionStateGuardOff(t *testing.T) {
	e := newEnv(t)
	fv := e.withValkey(false)
	e.mustApply("7", desired(rev))
	if e.state("7").StatePassword != "" || e.state("7").Has("state_password") {
		t.Fatal("password without the guard feature")
	}
	for k := range e.appEnv("7") {
		if strings.HasPrefix(k, "CCG_STATE_") {
			t.Fatal(k)
		}
	}
	if e.stateMounts("7") != 0 || len(e.app("7").Mounts) != 2 {
		t.Fatal(e.app("7").Mounts)
	}
	if fv.Count("acl setuser") != 0 {
		t.Fatal(fv.Commands())
	}
	// And without any session state client nothing asks the guard either.
	e2 := newEnv(t)
	e2.mustApply("7", desired(rev))
	if n := e2.g.Count("GET /v1/health"); n != 0 {
		t.Fatalf("%d guard health calls without session state", n)
	}
}

// covers: SESSION-MEMORY §7.5 state_password is not in the auth
// fingerprint: an existing runtime keeps its container when the guard turns
// session state on, and when a password is added to its state
func TestSessionStatePasswordNeverRecreates(t *testing.T) {
	e := newEnv(t)
	e.mustApply("7", desired(rev))
	id, label := e.appID("7"), e.app("7").Labels["io.sup2api.ccgateway.auth"]
	st := e.state("7")
	a, err := auth.Parse(nil)
	if err != nil {
		t.Fatal(err)
	}
	before := auth.Fingerprint(st.AdminKey, a)
	fv := e.withValkey(true)
	e.mustApply("7", desired(revB))
	if e.appID("7") != id || e.state("7").StatePassword != "" {
		t.Fatal("an old runtime is kept as it is: no recreation, no password")
	}
	// A password added later (by hand, a newer controller, a backup).
	st = e.state("7")
	st.StatePassword = strings.Repeat("ab", 32)
	e.save("7", st)
	if auth.Fingerprint(e.state("7").AdminKey, a) != before {
		t.Fatal("fingerprint changed")
	}
	e.mustApply("7", desired(revC))
	if e.appID("7") != id || e.app("7").Labels["io.sup2api.ccgateway.auth"] != label {
		t.Fatal("the container was recreated for a session state password")
	}
	if _, ok := e.appEnv("7")["CCG_STATE_PASSWORD"]; ok {
		t.Fatal("environment changed without recreation?")
	}
	// The apply set its user (it has a password), the container just
	// cannot use it until it is recreated.
	wantRules(t, fv, "7", st.StatePassword, true)
	// A recreation (network policy change) keeps the password and hands it out.
	e.mustApply("7", desired(rev, kv("network", obj(t, `{"pool": "10.80.0.0/16", "allocation": "sequential"}`))))
	if e.appID("7") == id || e.state("7").StatePassword != st.StatePassword ||
		e.appEnv("7")["CCG_STATE_PASSWORD"] != st.StatePassword || e.stateMounts("7") != 1 {
		t.Fatal("a recreated container gets the kept password and the mount")
	}
}

// covers: SESSION-MEMORY §7.5 apply re-sets the user before activation;
// block switches it off, the next apply on
func TestSessionStateApplyAndBlock(t *testing.T) {
	e := newEnv(t)
	fv := e.withValkey(true)
	e.mustApply("7", desired(rev))
	pw := e.state("7").StatePassword
	fv.Restart() // Valkey lost its users
	e.mustApply("7", desired(revB))
	wantRules(t, fv, "7", pw, true)

	if s := e.kindOf("7", pyjson.Ordered{kv("revision", revC), kv("proxy", nil)}); s != "blocked" {
		t.Fatal(s)
	}
	wantRules(t, fv, "7", pw, false)
	// The background pass keeps a blocked runtime's user off.
	fv.Restart()
	e.m.sharedPass(bg)
	wantRules(t, fv, "7", pw, false)
	e.mustApply("7", desired(revC))
	wantRules(t, fv, "7", pw, true)
}

// covers: SESSION-MEMORY §7.5 delete removes the user after the containers
// and before the state directory; a failed DELUSER is cleaned up later
func TestSessionStateDelete(t *testing.T) {
	e := newEnv(t)
	fv := e.withValkey(true)
	e.mustApply("7", desired(rev))
	e.mustApply("8", desired(rev))
	if _, err := e.m.Delete(bg, "7", true, true); err != nil {
		t.Fatal(err)
	}
	if fv.User("acct-7") != nil {
		t.Fatal("user kept")
	}
	if fv.User("acct-8") == nil {
		t.Fatal("the other account's user is untouched")
	}
	// Valkey down during the delete: the delete still succeeds.
	fv.SetDown(true)
	if _, err := e.m.Delete(bg, "8", true, true); err != nil {
		t.Fatal(err)
	}
	fv.SetDown(false)
	if fv.User("acct-8") == nil {
		t.Fatal("precondition: the user survived the delete")
	}
	e.m.sharedPass(bg)
	if fv.User("acct-8") != nil {
		t.Fatal("orphan user not removed by the background pass")
	}
	// A draft is deleted the same way.
	e.mustApply(draftKey, desired(rev))
	if fv.User("acct-"+draftKey) == nil {
		t.Fatal("draft user")
	}
	if _, err := e.m.Delete(bg, draftKey, false, false); err != nil {
		t.Fatal(err)
	}
	if fv.User("acct-"+draftKey) != nil {
		t.Fatal("draft user kept")
	}
}

// covers: SESSION-MEMORY §7.5 §10.2 the background pass: first pass and a
// Valkey restart put every user back; a user deleted behind the
// controller's back comes back on the next pass; otherwise nothing is sent
// but INFO and ACL LIST
func TestSessionStateReconcile(t *testing.T) {
	e := newEnv(t)
	fv := e.withValkey(true)
	e.mustApply("7", desired(rev))
	e.mustApply("8", desired(rev))
	p7, p8 := e.state("7").StatePassword, e.state("8").StatePassword
	// A controller restart over the same root: the first pass sets them all.
	e.open("app:test", "ccgateway-egress:test")
	fv2 := fv
	e.m.state = &sessionstate.Client{Socket: sessionstate.SocketPath, Dial: fv2.Dial, Timeout: 200 * time.Millisecond,
		Secret: func() ([]byte, error) { return []byte(stateAdminPass), nil }}
	fv.ResetCommands()
	e.m.sharedPass(bg)
	// Each user at least once (the restarted controller also re-activates
	// the runtimes, and sharedApply sets the user again).
	if fv.Count("acl setuser acct-7 ") == 0 || fv.Count("acl setuser acct-8 ") == 0 {
		t.Fatalf("first pass:\n%s", strings.Join(fv.Commands(), "\n"))
	}
	fv.ResetCommands()
	e.m.sharedPass(bg)
	for _, c := range fv.Commands() {
		if !strings.HasPrefix(c, "auth ") && c != "info server memory stats" && c != "acl list" {
			t.Fatalf("steady state sent %q", c)
		}
	}
	fv.Restart()
	e.m.sharedPass(bg)
	wantRules(t, fv, "7", p7, true)
	wantRules(t, fv, "8", p8, true)
	if !strings.Contains(e.logs.String(), "session state Valkey restarted") {
		t.Fatal(e.logs.String())
	}
	fv.DeleteUser("acct-8")
	e.m.sharedPass(bg) // sees it missing
	wantRules(t, fv, "8", p8, true)
	// A failed SETUSER is retried on the next pass.
	fv.Restart()
	fv.FailNext("acl|setuser", "ERR transient")
	e.m.sharedPass(bg)
	e.m.sharedPass(bg)
	wantRules(t, fv, "7", p7, true)
	wantRules(t, fv, "8", p8, true)
}

// covers: SESSION-MEMORY §7.5 D8 a Valkey that is absent, stopped, hung or
// refusing never fails or blocks an account operation; it is logged once
// per outage
func TestSessionStateUnavailable(t *testing.T) {
	for _, mode := range []string{"absent", "down", "hang", "noperm"} {
		t.Run(mode, func(t *testing.T) {
			e := newEnv(t)
			fv := e.withValkey(true)
			switch mode {
			case "absent":
				e.m.state.(*sessionstate.Client).Secret = func() ([]byte, error) { return nil, store.ErrNotExist }
			case "down":
				fv.SetDown(true)
			case "hang":
				fv.SetHang(true)
			}
			if mode == "noperm" {
				for i := 0; i < 20; i++ {
					fv.FailNext("acl|setuser", "NOPERM no permissions")
				}
			}
			start := time.Now()
			p := e.mustApply("7", desired(rev))
			if p.Status != "ready" {
				t.Fatal(p.Status)
			}
			pw := e.state("7").StatePassword
			// The password and settings are handed out anyway: the Worker
			// connects once the background pass set the user.
			if !hex64.MatchString(pw) || e.appEnv("7")["CCG_STATE_PASSWORD"] != pw {
				t.Fatal("password and settings")
			}
			if out, err := e.apply("7", pyjson.Ordered{kv("revision", revB), kv("proxy", nil)}); err != nil {
				t.Fatal(err)
			} else if _, ok := out.(*contract.Blocked); !ok {
				t.Fatal(out)
			}
			e.mustApply("7", desired(revC))
			e.m.sharedPass(bg)
			e.m.sharedPass(bg)
			if _, err := e.m.Delete(bg, "7", true, true); err != nil {
				t.Fatal(err)
			}
			// hang: each call is bounded by the client timeout (200 ms here).
			if d := time.Since(start); d > 10*time.Second {
				t.Fatalf("operations took %v", d)
			}
			logs := e.logs.String()
			switch mode {
			case "absent":
				if strings.Count(logs, "not configured on this host") != 1 {
					t.Fatal(logs)
				}
			case "down", "hang":
				if strings.Count(logs, "session state Valkey unavailable") != 1 {
					t.Fatal(logs)
				}
			case "noperm":
				if !strings.Contains(logs, "NOPERM") {
					t.Fatal(logs)
				}
			}
			if strings.Contains(logs, pw) || strings.Contains(logs, stateAdminPass) {
				t.Fatal("a password reached the log")
			}
		})
	}
}
