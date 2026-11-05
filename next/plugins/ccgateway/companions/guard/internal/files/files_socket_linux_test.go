//go:build linux

package files

import (
	"net"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
)

// listenUnix binds a unix socket at p (what valkey-server does) and closes
// the listener without unlinking the file.
func listenUnix(t *testing.T, p string) {
	t.Helper()
	l, err := net.ListenUnix("unix", &net.UnixAddr{Name: p, Net: "unix"})
	if err != nil {
		t.Fatal(err)
	}
	l.SetUnlinkOnClose(false)
	l.Close()
	if err := os.Chmod(p, 0o666); err != nil { // --unixsocketperm 666
		t.Fatal(err)
	}
}

// covers: SESSION-MEMORY §7.2 §7.4 socket directory: empty or exactly one
// root socket valkey.sock; every other shape rejected
func TestVerifySocketDir(t *testing.T) {
	r, p := root(t)
	rt := Runtime{R: r}
	state := filepath.Join(p, "state")
	sock := filepath.Join(state, "valkey.sock")

	if err := rt.VerifySocketDir(); why(err) != "missing" {
		t.Fatalf("missing dir: %v", err)
	}
	if err := os.Mkdir(state, 0o755); err != nil {
		t.Fatal(err)
	}
	_ = os.Chmod(state, 0o755)
	if err := rt.VerifySocketDir(); err != nil {
		t.Fatalf("empty dir (valkey not up yet): %v", err)
	}
	listenUnix(t, sock)
	if err := rt.VerifySocketDir(); err != nil {
		t.Fatalf("one socket: %v", err)
	}

	// The directory itself: group or other write, wrong owner, a link.
	for _, mode := range []os.FileMode{0o775, 0o757, 0o777} {
		_ = os.Chmod(state, mode)
		if err := rt.VerifySocketDir(); why(err) != "mode" {
			t.Fatalf("dir mode %o: %v", mode, err)
		}
	}
	_ = os.Chmod(state, 0o755)
	other := &Root{fd: r.fd, path: r.path, uid: r.uid + 1} // shares r's descriptor; never closed
	if err := (Runtime{R: other}).VerifySocketDir(); why(err) != "owner" {
		t.Fatalf("dir owner: %v", err)
	}
	if err := os.Rename(state, filepath.Join(p, "real-state")); err != nil {
		t.Fatal(err)
	}
	_ = os.Symlink(filepath.Join(p, "real-state"), state)
	if err := rt.VerifySocketDir(); why(err) != "symlink" {
		t.Fatalf("dir is a link: %v", err)
	}
	_ = os.Remove(state)
	if err := os.Rename(filepath.Join(p, "real-state"), state); err != nil {
		t.Fatal(err)
	}
	if err := rt.VerifySocketDir(); err != nil {
		t.Fatal(err)
	}

	// A second entry next to the socket, whatever it is.
	for _, extra := range []string{"users.acl", ".valkey.sock.tmp", "valkey.sock.bak"} {
		f := filepath.Join(state, extra)
		_ = os.WriteFile(f, nil, 0o600)
		if err := rt.VerifySocketDir(); why(err) != "name" {
			t.Fatalf("extra %s: %v", extra, err)
		}
		_ = os.Remove(f)
	}
	extraSock := filepath.Join(state, "other.sock")
	listenUnix(t, extraSock)
	if err := rt.VerifySocketDir(); why(err) != "name" {
		t.Fatalf("second socket: %v", err)
	}
	_ = os.Remove(extraSock)

	// The right shape under the wrong name.
	_ = os.Remove(sock)
	listenUnix(t, filepath.Join(state, "redis.sock"))
	if err := rt.VerifySocketDir(); why(err) != "name" {
		t.Fatalf("wrong name: %v", err)
	}
	_ = os.Remove(filepath.Join(state, "redis.sock"))

	// Something else posing as valkey.sock.
	_ = os.WriteFile(sock, []byte("x"), 0o644)
	if err := rt.VerifySocketDir(); why(err) != "type" {
		t.Fatalf("regular file: %v", err)
	}
	_ = os.Remove(sock)
	_ = os.Symlink("/var/run/docker.sock", sock)
	if err := rt.VerifySocketDir(); why(err) != "symlink" {
		t.Fatalf("symlink: %v", err)
	}
	_ = os.Remove(sock)
	if err := syscall.Mkfifo(sock, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := rt.VerifySocketDir(); why(err) != "type" {
		t.Fatalf("fifo: %v", err)
	}
	_ = os.Remove(sock)
	_ = os.Mkdir(sock, 0o755)
	if err := rt.VerifySocketDir(); why(err) != "type" {
		t.Fatalf("directory: %v", err)
	}
	_ = os.Remove(sock)
	listenUnix(t, sock)
	if err := os.Link(sock, filepath.Join(p, "hl")); err != nil {
		t.Fatal(err)
	}
	if err := rt.VerifySocketDir(); why(err) != "hardlink" {
		t.Fatalf("hard link: %v", err)
	}
	_ = os.Remove(filepath.Join(p, "hl"))
	if err := rt.VerifySocketDir(); err != nil {
		t.Fatal(err)
	}

	// Socket owner: the real file when the test runs as root (ovh), the
	// stat check itself always.
	if os.Getuid() == 0 {
		if err := os.Lchown(sock, 1000, 1000); err != nil {
			t.Fatal(err)
		}
		if err := rt.VerifySocketDir(); why(err) != "owner" {
			t.Fatalf("socket owned by 1000: %v", err)
		}
		_ = os.Lchown(sock, 0, 0)
	}
	var st syscall.Stat_t
	if err := syscall.Lstat(sock, &st); err != nil {
		t.Fatal(err)
	}
	if err := checkSocket(&st, st.Uid, "state/valkey.sock"); err != nil {
		t.Fatal(err)
	}
	if err := checkSocket(&st, st.Uid+1, "state/valkey.sock"); why(err) != "owner" {
		t.Fatalf("socket owner: %v", err)
	}
}

// covers: 03§6.4 listing the same directory again (the root itself
// included) sees every entry: the listing never shares a directory offset
func TestListRepeats(t *testing.T) {
	r, p := root(t)
	for _, n := range []string{"a", "b", "c"} {
		_ = os.WriteFile(filepath.Join(p, n), nil, 0o600)
	}
	_ = os.Mkdir(filepath.Join(p, "sub"), 0o700)
	_ = os.WriteFile(filepath.Join(p, "sub", "x"), nil, 0o600)
	for i := 0; i < 3; i++ {
		root, err := r.List(nil)
		if err != nil || len(root) != 4 {
			t.Fatalf("root listing %d: %d entries, %v", i, len(root), err)
		}
		sub, err := r.List([]string{"sub"})
		if err != nil || len(sub) != 1 {
			t.Fatalf("sub listing %d: %d entries, %v", i, len(sub), err)
		}
	}
}

// covers: SESSION-MEMORY §7.4 the startup sweep checks state/ and never
// removes anything in it
func TestSweepState(t *testing.T) {
	r, p := root(t)
	rt := Runtime{R: r}
	state := filepath.Join(p, "state")
	_ = os.Mkdir(state, 0o755)
	_ = os.Chmod(state, 0o755)
	listenUnix(t, filepath.Join(state, "valkey.sock"))
	checked, rejected, err := rt.Sweep(func(string) bool { return false })
	if err != nil || len(rejected) != 0 || checked != 1 {
		t.Fatalf("clean state: %d %v %v", checked, rejected, err)
	}
	junk := filepath.Join(state, "dump.rdb")
	_ = os.WriteFile(junk, []byte("x"), 0o600)
	checked, rejected, err = rt.Sweep(func(string) bool { return false })
	if err != nil || checked != 1 || len(rejected) != 1 || rejected[0].Rel != "state/dump.rdb" || rejected[0].Why != "name" {
		t.Fatalf("junk: %d %v %v", checked, rejected, err)
	}
	if _, err := os.Stat(junk); err != nil {
		t.Fatal("sweep removed a file in state/:", err)
	}
	if _, err := os.Lstat(filepath.Join(state, "valkey.sock")); err != nil {
		t.Fatal("sweep removed the socket:", err)
	}
	_ = os.Remove(junk)
	_ = os.Remove(filepath.Join(state, "valkey.sock"))
	_ = os.Remove(state)
	_ = os.WriteFile(state, nil, 0o644)
	_, rejected, _ = rt.Sweep(func(string) bool { return false })
	if len(rejected) != 1 || rejected[0].Rel != "state" || rejected[0].Why != "type" {
		t.Fatalf("state is a file: %v", rejected)
	}
	_ = os.Remove(state)
	_ = os.Symlink("/", state)
	_, rejected, _ = rt.Sweep(func(string) bool { return false })
	if len(rejected) != 1 || !strings.HasPrefix(rejected[0].Rel, "state") || rejected[0].Why != "symlink" {
		t.Fatalf("state is a link: %v", rejected)
	}
}
