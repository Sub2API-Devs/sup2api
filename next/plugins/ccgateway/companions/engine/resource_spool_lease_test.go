package engine

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResourceSpoolLeaseReclaimsOnlyDeadInstances(t *testing.T) {
	root := t.TempDir()
	alive, err := openResourceSpool(root)
	if err != nil {
		t.Fatal(err)
	}
	defer alive.Close()
	activePath := filepath.Join(alive.dir, "resource-body-active")
	os.WriteFile(activePath, []byte("active"), 0600)
	dead, err := openResourceSpool(root)
	if err != nil {
		t.Fatal(err)
	}
	deadPath := filepath.Join(dead.dir, "resource-body-dead")
	os.WriteFile(deadPath, []byte("dead"), 0600)
	dead.file.Close() // Simulate process exit: OS lease released, files remain.
	next, err := openResourceSpool(root)
	if err != nil {
		t.Fatal(err)
	}
	defer next.Close()
	if _, err := os.Stat(activePath); err != nil {
		t.Fatal("live runtime spool removed", err)
	}
	if _, err := os.Stat(dead.dir); !os.IsNotExist(err) {
		t.Fatal("dead spool remains", err)
	}
	if _, err := os.Stat(dead.file.Name()); !os.IsNotExist(err) {
		t.Fatal("dead lease remains", err)
	}
}
