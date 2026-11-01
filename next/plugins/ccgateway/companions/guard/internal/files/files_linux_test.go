//go:build linux

package files

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"
)

// root makes <tmp>/root (0755) and opens it with the test hook: owner =
// current uid, the temp directory itself trusted (it sits under /tmp).
func root(t *testing.T) (*Root, string) {
	t.Helper()
	base := t.TempDir()
	p := filepath.Join(base, "root")
	if err := os.Mkdir(p, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(p, 0o755); err != nil {
		t.Fatal(err)
	}
	r, err := openRoot(p, uint32(os.Getuid()), base)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { r.Close() })
	return r, p
}

func ino(t *testing.T, p string) uint64 {
	t.Helper()
	var st syscall.Stat_t
	if err := syscall.Lstat(p, &st); err != nil {
		t.Fatal(err)
	}
	return st.Ino
}

func why(err error) string {
	if e, ok := IsRejected(err); ok {
		return e.Why
	}
	if err == nil {
		return "nil"
	}
	return "other:" + err.Error()
}

// covers: 03§6.1 opening the root checks every level
func TestOpenRootChecks(t *testing.T) {
	base := t.TempDir()
	real := filepath.Join(base, "real")
	_ = os.Mkdir(real, 0o755)
	_ = os.Symlink(real, filepath.Join(base, "link"))
	if _, err := openRoot(filepath.Join(base, "link"), uint32(os.Getuid()), base); why(err) != "symlink" {
		t.Fatalf("symlink root: %v", err)
	}
	gw := filepath.Join(base, "gw")
	_ = os.Mkdir(gw, 0o755)
	_ = os.Chmod(gw, 0o775)
	if _, err := openRoot(gw, uint32(os.Getuid()), base); why(err) != "mode" {
		t.Fatalf("group writable: %v", err)
	}
	if _, err := openRoot(real, uint32(os.Getuid())+1, base); why(err) != "owner" {
		t.Fatalf("owner: %v", err)
	}
	if _, err := openRoot("relative", 0, ""); err == nil {
		t.Fatal("relative root")
	}
	if _, err := OpenRoot(base); err == nil {
		t.Fatal("/tmp is world writable and must be rejected without the test hook")
	}
}

// covers: 03§6.2 WriteReplace: new inode, mode independent of umask, no temp files, links replaced not followed
func TestWriteReplace(t *testing.T) {
	r, p := root(t)
	old := syscall.Umask(0o077)
	defer syscall.Umask(old)
	if err := r.WriteReplace([]string{"21", "app.nft"}, []byte("a"), 0o644, true); err != nil {
		t.Fatal(err)
	}
	f := filepath.Join(p, "21", "app.nft")
	st, _ := os.Stat(f)
	if st.Mode().Perm() != 0o644 {
		t.Fatalf("mode %v", st.Mode())
	}
	if d, _ := os.Stat(filepath.Join(p, "21")); d.Mode().Perm() != 0o700 {
		t.Fatalf("dir mode %v", d.Mode())
	}
	i1 := ino(t, f)
	if err := r.WriteReplace([]string{"21", "app.nft"}, []byte("bb"), 0o600, false); err != nil {
		t.Fatal(err)
	}
	if ino(t, f) == i1 {
		t.Fatal("inode kept")
	}
	if b, _ := os.ReadFile(f); string(b) != "bb" {
		t.Fatal(string(b))
	}
	entries, _ := os.ReadDir(filepath.Join(p, "21"))
	if len(entries) != 1 {
		t.Fatalf("leftovers %v", entries)
	}
	// A symlink at the target is replaced, its target untouched.
	victim := filepath.Join(t.TempDir(), "victim")
	_ = os.WriteFile(victim, []byte("secret"), 0o600)
	_ = os.Symlink(victim, filepath.Join(p, "21", "resolv.conf"))
	if err := r.WriteReplace([]string{"21", "resolv.conf"}, []byte("ns"), 0o644, false); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(victim); string(b) != "secret" {
		t.Fatal("followed the link")
	}
	if fi, _ := os.Lstat(filepath.Join(p, "21", "resolv.conf")); fi.Mode()&os.ModeSymlink != 0 {
		t.Fatal("link kept")
	}
	// A symlinked directory in the middle is refused.
	_ = os.Symlink(t.TempDir(), filepath.Join(p, "22"))
	if err := r.WriteReplace([]string{"22", "app.nft"}, []byte("x"), 0o600, true); why(err) != "symlink" {
		t.Fatalf("dir link: %v", err)
	}
	for _, bad := range [][]string{{"..", "x"}, {"21", "../x"}, {"a/b"}, {""}, {"."}} {
		if err := r.WriteReplace(bad, []byte("x"), 0o600, true); why(err) != "path" {
			t.Fatalf("%v: %v", bad, err)
		}
	}
}

// covers: R11 03§6.2 RewriteInPlace keeps the inode, refuses links, hard links and FIFOs without blocking
func TestRewriteInPlace(t *testing.T) {
	r, p := root(t)
	rel := []string{"21", "resolv.conf"}
	if err := r.RewriteInPlace(rel, []byte("x"), 0o644); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("missing: %v", err)
	}
	_ = r.WriteReplace(rel, []byte("nameserver 10.0.0.2\noptions timeout:2 attempts:2\n"), 0o644, true)
	f := filepath.Join(p, "21", "resolv.conf")
	i1 := ino(t, f)
	if err := r.RewriteInPlace(rel, []byte("short\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if ino(t, f) != i1 {
		t.Fatal("inode changed")
	}
	if b, _ := os.ReadFile(f); string(b) != "short\n" {
		t.Fatalf("%q", b)
	}
	// hard link
	_ = os.Link(f, filepath.Join(p, "21", "other"))
	if err := r.RewriteInPlace(rel, []byte("x"), 0o644); why(err) != "hardlink" {
		t.Fatalf("hardlink: %v", err)
	}
	_ = os.Remove(filepath.Join(p, "21", "other"))
	// symlink
	_ = os.Remove(f)
	_ = os.Symlink("/etc/hostname", f)
	if err := r.RewriteInPlace(rel, []byte("x"), 0o644); why(err) != "symlink" {
		t.Fatalf("symlink: %v", err)
	}
	// FIFO must not block
	_ = os.Remove(f)
	if err := syscall.Mkfifo(f, 0o644); err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { done <- r.RewriteInPlace(rel, []byte("x"), 0o644) }()
	select {
	case err := <-done:
		if why(err) != "type" {
			t.Fatalf("fifo: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("blocked on a FIFO")
	}
	done2 := make(chan error, 1)
	go func() { done2 <- r.VerifyFile(f) }()
	select {
	case err := <-done2:
		if why(err) != "type" {
			t.Fatalf("verify fifo: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("verify blocked")
	}
}

// covers: A3 A4 03§6.3 §6.4 mount source checks, WriteResolv replacement, startup sweep
func TestVerifyAndRuntime(t *testing.T) {
	r, p := root(t)
	rt := Runtime{R: r}
	if replaced, err := rt.WriteResolv("21", ResolvContent("10.0.0.2")); err != nil || replaced {
		t.Fatal(replaced, err)
	}
	if err := rt.VerifyResolv("21"); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(filepath.Join(p, "21", "resolv.conf")); string(b) != "nameserver 10.0.0.2\noptions timeout:2 attempts:2\n" {
		t.Fatalf("%q", b)
	}
	if err := r.VerifyFile(p + "/../etc/passwd"); why(err) != "path" {
		t.Fatal(err)
	}
	if err := r.VerifyFile("/etc/passwd"); why(err) != "path" {
		t.Fatal(err)
	}
	// Replace with a link: verify refuses, WriteResolv replaces and reports it.
	f := filepath.Join(p, "21", "resolv.conf")
	_ = os.Remove(f)
	_ = os.Symlink("/etc/shadow", f)
	if err := rt.VerifyResolv("21"); why(err) != "symlink" {
		t.Fatal(err)
	}
	if replaced, err := rt.WriteResolv("21", ResolvContent("10.0.0.3")); err != nil || !replaced {
		t.Fatal(replaced, err)
	}
	if err := rt.VerifyResolv("21"); err != nil {
		t.Fatal(err)
	}
	_ = os.Chmod(f, 0o666)
	if err := rt.VerifyResolv("21"); why(err) != "mode" {
		t.Fatal(err)
	}
	_ = os.Chmod(f, 0o644)
	// shared-egress
	for _, n := range []string{"boot.json", "dns.json"} {
		if err := rt.WriteGatewayFile(n, []byte("{}")); err != nil {
			t.Fatal(err)
		}
	}
	if err := rt.WriteGatewayFile("state.json", []byte("{}")); why(err) != "name" {
		t.Fatal(err)
	}
	if err := rt.VerifyGatewayDir(); err != nil {
		t.Fatal(err)
	}
	_ = os.WriteFile(filepath.Join(p, "shared-egress", "boot.json.tmp"), nil, 0o600)
	if err := rt.VerifyGatewayDir(); err != nil {
		t.Fatal("python temp file", err)
	}
	_ = os.WriteFile(filepath.Join(p, "shared-egress", "state.json"), []byte("{}"), 0o600)
	if err := rt.VerifyGatewayDir(); why(err) != "name" {
		t.Fatal("state.json", err)
	}
	_ = os.Remove(filepath.Join(p, "shared-egress", "state.json"))
	_ = os.Mkdir(filepath.Join(p, "shared-egress", "sub"), 0o700)
	if err := rt.VerifyGatewayDir(); why(err) != "type" {
		t.Fatal("subdir", err)
	}
	_ = os.Remove(filepath.Join(p, "shared-egress", "sub"))
	_ = os.Symlink("/etc", filepath.Join(p, "shared-egress", "active.nft"))
	if err := rt.VerifyGatewayDir(); why(err) != "symlink" {
		t.Fatal("link", err)
	}
	// Sweep: 21 is fine now, 22 has a hard-linked app.nft, shared-egress has a link.
	_ = rt.WriteAppNFT("22", []byte("t"))
	_ = os.Link(filepath.Join(p, "22", "app.nft"), filepath.Join(p, "hl"))
	_ = os.Symlink("/", filepath.Join(p, "23"))
	checked, rejected, err := rt.Sweep(func(s string) bool { return s == "21" || s == "22" || s == "23" })
	if err != nil {
		t.Fatal(err)
	}
	got := []string{}
	for _, r := range rejected {
		got = append(got, r.Rel+":"+r.Why)
	}
	want := "22/app.nft:hardlink,23:symlink,shared-egress/active.nft:symlink"
	if strings.Join(sorted(got), ",") != want || checked < 4 {
		t.Fatalf("%v %d", got, checked)
	}
}

func sorted(s []string) []string {
	for i := range s {
		for j := i + 1; j < len(s); j++ {
			if s[j] < s[i] {
				s[i], s[j] = s[j], s[i]
			}
		}
	}
	return s
}

// covers: 03§10.3 state files and load spool cleanup
func TestState(t *testing.T) {
	r, p := root(t)
	st := State{R: r}
	if err := st.Write("upgrade.json", []byte(`{"state":"idle"}`)); err != nil {
		t.Fatal(err)
	}
	if b, err := st.Read("upgrade.json"); err != nil || string(b) != `{"state":"idle"}` {
		t.Fatal(string(b), err)
	}
	if _, err := st.Read("gateway.json"); !errors.Is(err, os.ErrNotExist) {
		t.Fatal(err)
	}
	f, name, err := st.CreateLoad()
	if err != nil || !strings.HasSuffix(name, ".part") {
		t.Fatal(name, err)
	}
	f.Close()
	if fi, _ := os.Stat(filepath.Join(p, "loads", name)); fi.Mode().Perm() != 0o600 {
		t.Fatal(fi.Mode())
	}
	if n, _ := st.CleanLoads(time.Hour, time.Now()); n != 0 {
		t.Fatal("fresh file removed")
	}
	if n, _ := st.CleanLoads(0, time.Now()); n != 1 {
		t.Fatal("startup cleanup")
	}
	if free, err := st.FreeBytes(); err != nil || free == 0 {
		t.Fatal(free, err)
	}
}
