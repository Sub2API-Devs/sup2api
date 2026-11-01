//go:build unix

package cleanup

import (
	"os"
	"strings"
	"testing"

	"ccgateway/controller/internal/pyjson"
)

// covers: X1 X2 X3 BUG-18 (symbolic links: a linked runtime directory is not a runtime; a linked state or backup is unreadable)
func TestSymlinksAreNeverFollowed(t *testing.T) {
	e := newEnv(t)
	target := t.TempDir()
	if err := os.Symlink(target, e.st.Path("21")); err != nil {
		t.Fatal(err)
	}
	if rows := e.inventory(); len(rows) != 0 {
		t.Fatal(js(rows))
	}
	if err := e.st.EnsureAccountDir("22"); err != nil {
		t.Fatal(err)
	}
	os.WriteFile(target+"/state.json", []byte("{}"), 0o600)
	if err := os.Symlink(target+"/state.json", e.st.Path("22/state.json")); err != nil {
		t.Fatal(err)
	}
	rows := e.inventory()
	if keysOf(rows) != "22" || get(rows[0].(pyjson.Ordered), "identity") != UnreadableIdentity("22") ||
		!strings.Contains(e.log.String(), "runtime state is a symlink") {
		t.Fatal(js(rows), e.log.String())
	}
	r := e.cleanup(keepList(), rows)
	if js(get(r, "results")) != `[{"key": "22", "status": "failed", "reason": "resource_cleanup_failed"}]` {
		t.Fatal(js(r))
	}
	if _, err := os.Stat(target + "/state.json"); err != nil {
		t.Fatal("link target removed")
	}
	// A dangling link is absent (Path.exists follows it).
	os.Remove(target + "/state.json")
	if rows := e.inventory(); get(rows[0].(pyjson.Ordered), "identity") == UnreadableIdentity("22") {
		t.Fatal(js(rows))
	}
}
