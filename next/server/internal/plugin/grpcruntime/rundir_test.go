package grpcruntime

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestNewRunDirPrivateAndBounded(t *testing.T) {
	root, err := os.MkdirTemp("", "s2r")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(root) })
	dir, fallback, err := newRunDir(filepath.Join(root, "run"), "averyveryverylongpluginkey")
	if err != nil {
		t.Fatal(err)
	}
	if fallback || filepath.Dir(dir) != filepath.Join(root, "run") || !strings.HasPrefix(filepath.Base(dir), "averyveryver-") {
		t.Fatalf("dir %q fallback %v", dir, fallback)
	}
	if runtime.GOOS != "windows" {
		for _, d := range []string{filepath.Join(root, "run"), dir, filepath.Join(dir, runDirTmp)} {
			st, err := os.Stat(d)
			if err != nil || st.Mode().Perm() != 0o700 {
				t.Fatalf("%s: %v %v", d, st.Mode(), err)
			}
		}
		if len(dir)+socketSuffixLen > maxSocketPath {
			t.Fatalf("socket paths below %s would be too long", dir)
		}
		// A pre-existing, more open run root is tightened.
		open := filepath.Join(root, "open")
		if err := os.Mkdir(open, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.Chmod(open, 0o755); err != nil {
			t.Fatal(err)
		}
		d2, _, err := newRunDir(open, "k")
		if err != nil {
			t.Fatal(err)
		}
		_ = os.RemoveAll(d2)
		if st, _ := os.Stat(open); st.Mode().Perm() != 0o700 {
			t.Fatalf("run root mode %v", st.Mode())
		}
	}
	if env := runDirEnv(dir); env[0] != "TMPDIR="+filepath.Join(dir, runDirTmp) {
		t.Fatalf("env %v", env)
	}
}

// A run root too deep for unix socket paths falls back to the private
// per-user directory instead of producing sockets that cannot be bound.
func TestNewRunDirTooLongFallsBack(t *testing.T) {
	if runtime.GOOS == "windows" {
		// No unix sockets: any length works.
		long := filepath.Join(t.TempDir(), strings.Repeat("d", 80))
		dir, fallback, err := newRunDir(long, "k")
		if err != nil || fallback || filepath.Dir(dir) != long {
			t.Fatalf("%q %v %v", dir, fallback, err)
		}
		return
	}
	long := filepath.Join(t.TempDir(), strings.Repeat("d", 80))
	dir, fallback, err := newRunDir(long, "k")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(dir) })
	want, err := fallbackRunRoot()
	if err != nil {
		t.Fatal(err)
	}
	if !fallback || filepath.Dir(dir) != want || len(dir)+socketSuffixLen > maxSocketPath {
		t.Fatalf("dir %q fallback %v, want below %s", dir, fallback, want)
	}
	if _, err := os.Stat(long); !os.IsNotExist(err) {
		t.Fatalf("too long root was created: %v", err)
	}
}
