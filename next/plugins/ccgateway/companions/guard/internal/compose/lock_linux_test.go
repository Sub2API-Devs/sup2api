//go:build linux

package compose

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"
)

// covers: 03§9.1 the compose lock is flock on <ProjectDir>/.compose.lock, shared with the core scripts
func TestFileLock(t *testing.T) {
	p := filepath.Join(t.TempDir(), ".compose.lock")
	a := FileLock{Path: p, Wait: time.Second}
	unlock, err := a.Lock(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	b := FileLock{Path: p, Wait: 150 * time.Millisecond}
	start := time.Now()
	if _, err := b.Lock(context.Background()); !errors.Is(err, ErrLockTimeout) || time.Since(start) < 100*time.Millisecond {
		t.Fatal("second holder", err)
	}
	unlock()
	u2, err := b.Lock(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	u2()
}
