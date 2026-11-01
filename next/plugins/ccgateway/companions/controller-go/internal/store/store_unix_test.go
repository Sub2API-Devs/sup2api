//go:build unix

package store

import (
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
)

// covers: S1 S3 E2 (private modes on Linux)
func TestPrivateModes(t *testing.T) {
	old := syscall.Umask(0o022)
	defer syscall.Umask(old)
	dir := filepath.Join(t.TempDir(), "root")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	s, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	mode := func(rel string) os.FileMode {
		info, err := os.Stat(s.Path(rel))
		if err != nil {
			t.Fatal(err)
		}
		return info.Mode().Perm()
	}
	if mode(".") != 0o700 {
		t.Fatalf("root %o (forced 0700)", mode("."))
	}
	s.EnsureAccountDir("21")
	if err := s.SaveState("21", NewAccountState("a", "b", "c", "d", "e")); err != nil {
		t.Fatal(err)
	}
	if mode("21") != 0o700 || mode("21/state.json") != 0o600 {
		t.Fatalf("dir %o file %o", mode("21"), mode("21/state.json"))
	}
	s.WriteBackup("21", []byte("{}"))
	if _, err := s.SaveWorkerBackup("21", fixedNow, "ab0123456789abcdef", strings.NewReader("p")); err != nil {
		t.Fatal(err)
	}
	if mode("backups") != 0o700 || mode("backups/21.json") != 0o600 || mode("21/worker-backups") != 0o700 {
		t.Fatal("backups")
	}
	up, _ := s.UploadsPath()
	if info, _ := os.Stat(up); info.Mode().Perm() != 0o700 {
		t.Fatal("uploads")
	}
}

// covers: S2 (flock: the lock is held against any other open file description)
func TestFlockExcludesOtherOpeners(t *testing.T) {
	s, err := Open(filepath.Join(t.TempDir(), "root"))
	if err != nil {
		t.Fatal(err)
	}
	f, err := os.OpenFile(s.Path(LockFile), os.O_WRONLY, 0)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err == nil {
		t.Fatal("a second flock succeeded while the store is open")
	}
	s.Close()
	if err := syscall.Flock(int(f.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		t.Fatalf("the lock is released on Close: %v", err)
	}
}

// covers: S1 (rename over the target keeps no temporary file, survives a fsync of the directory)
func TestAtomicReplaceInode(t *testing.T) {
	s, _ := Open(filepath.Join(t.TempDir(), "root"))
	defer s.Close()
	s.WriteAtomic("x.json", []byte("1"))
	first, _ := s.Stat("x.json")
	s.WriteAtomic("x.json", []byte("2"))
	second, _ := s.Stat("x.json")
	if first.Inode == 0 || first.Inode == second.Inode {
		t.Fatal("an atomic write replaces the inode")
	}
	if b, _ := s.ReadFile("x.json"); string(b) != "2" || s.Exists("x.json.tmp") {
		t.Fatal("content")
	}
}

// covers: Y4 BUG-18(fixed) (symbolic links are reported, not followed as runtimes)
func TestSymlinkEntries(t *testing.T) {
	s, _ := Open(filepath.Join(t.TempDir(), "root"))
	defer s.Close()
	target := t.TempDir()
	os.Symlink(target, s.Path("21"))
	entries, _ := s.AccountEntries()
	if len(entries) != 1 || !entries[0].IsSymlink || !entries[0].IsDir {
		t.Fatal(entries)
	}
	if err := s.RemoveAccountDir("21"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(target); err != nil {
		t.Fatal("the link target must survive")
	}
	if info, _ := s.Stat("21"); !info.IsSymlink {
		t.Fatal("a symlinked runtime directory is never removed through the link")
	}
	if _, err := s.ReadFile("21/../../etc/passwd"); err == nil {
		t.Fatal("os.Root keeps paths inside the root")
	}
}
