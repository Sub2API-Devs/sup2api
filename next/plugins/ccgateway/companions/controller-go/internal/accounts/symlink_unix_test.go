//go:build unix

package accounts

import (
	"os"
	"path/filepath"
	"testing"
)

// covers: Y4 G15 BUG-18(fixed) X1 (a symbolic link named like a runtime is neither listed nor recovered)
func TestSymlinkedRuntimeDirectoriesAreIgnored(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	target := filepath.Join(t.TempDir(), "elsewhere")
	if err := os.Mkdir(target, 0o700); err != nil {
		t.Fatal(err)
	}
	os.WriteFile(filepath.Join(target, "state.json"), []byte(`{"status": "ready", "revision": "`+rev+`"}`), 0o600)
	if err := os.Symlink(target, filepath.Join(e.dir, "22")); err != nil {
		t.Fatal(err)
	}
	list, err := e.m.Runtimes(bg)
	if err != nil || len(list.Runtimes) != 1 || list.Runtimes[0].Key != "21" {
		t.Fatalf("%+v %v", list, err)
	}
	e.g.ResetCalls()
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	for _, c := range e.g.Calls() {
		if c.AID == "22" {
			t.Fatal("the link is not recovered:", c.Route)
		}
	}
}
