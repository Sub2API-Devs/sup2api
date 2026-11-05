package fakevalkey

import (
	"bufio"
	"strings"
	"testing"
)

func roundTrip(t *testing.T, s *Server, cmds ...[]string) []string {
	t.Helper()
	c, err := s.Dial(t.Context(), "")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	r := bufio.NewReader(c)
	var out []string
	for _, argv := range cmds {
		var b strings.Builder
		b.WriteString("*" + itoa(len(argv)) + "\r\n")
		for _, a := range argv {
			b.WriteString("$" + itoa(len(a)) + "\r\n" + a + "\r\n")
		}
		if _, err := c.Write([]byte(b.String())); err != nil {
			t.Fatal(err)
		}
		line, err := r.ReadString('\n')
		if err != nil {
			t.Fatal(err)
		}
		out = append(out, strings.TrimRight(line, "\r\n"))
	}
	return out
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for ; n > 0; n /= 10 {
		s = string(rune('0'+n%10)) + s
	}
	return s
}

// covers: the fake enforces what users.acl grants ccg-controller (so a
// controller that needed more would fail here, as on a real Valkey)
func TestFakeEnforcesAdminACL(t *testing.T) {
	s := New("pw")
	got := roundTrip(t, s,
		[]string{"PING"},
		[]string{"AUTH", "ccg-controller", "wrong"},
		[]string{"AUTH", "ccg-controller", "pw"},
		[]string{"GET", "ccg:21:x"},
		[]string{"KEYS", "*"},
		[]string{"ACL", "SAVE"},
		[]string{"CONFIG", "GET", "*"},
		[]string{"ACL", "SETUSER", "acct-21", "reset", "on"},
		[]string{"PING"})
	want := []string{"-NOAUTH", "-WRONGPASS", "+OK", "-NOPERM", "-NOPERM", "-NOPERM", "-NOPERM", "+OK", "+PONG"}
	for i := range want {
		if !strings.HasPrefix(got[i], want[i]) {
			t.Fatalf("reply %d = %q, want %s", i, got[i], want[i])
		}
	}
	if s.Commands()[1] != "auth ccg-controller <redacted>" {
		t.Fatal("passwords must not be recorded:", s.Commands())
	}
}
