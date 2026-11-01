package updates

import (
	"context"
	"errors"
	"io"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"ccgateway/controller/internal/containerfs"
	"ccgateway/controller/internal/errs"
)

// spoolBlob is a spooled blob of n bytes in dir (a real spool file, so its
// removal can be checked).
func spoolBlob(t *testing.T, dir string, n int) containerfs.Blob {
	t.Helper()
	b, err := containerfs.ReadBlob(io.LimitReader(zeros{}, int64(n)), int64(n), func() (*os.File, error) { return os.CreateTemp(dir, "spool-*") })
	if err != nil {
		t.Fatal(err)
	}
	return b
}

type zeros struct{}

func (zeros) Read(p []byte) (int, error) {
	clear(p)
	return len(p), nil
}

func (c *fileCache) size() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.files)
}

func spoolFiles(t *testing.T, dir string) int {
	t.Helper()
	list, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	return len(list)
}

// Concurrent callers share one load; the last release removes the spool file.
func TestFileCacheSharesOneLoadAndRemovesSpool(t *testing.T) {
	dir := t.TempDir()
	c := newFileCache(0)
	var loads atomic.Int32
	gate := make(chan struct{})
	load := func(context.Context) (containerfs.Blob, error) {
		loads.Add(1)
		<-gate
		return spoolBlob(t, dir, containerfs.SpoolThreshold+10), nil
	}
	key := fileKey{image: "sha256:x", path: "/cli", limit: 1 << 30}
	var wg sync.WaitGroup
	releases := make(chan func(), 8)
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			b, done, err := c.get(context.Background(), key, load)
			if err != nil || b.Size() != containerfs.SpoolThreshold+10 {
				t.Error(b, err)
				return
			}
			releases <- done
		}()
	}
	for c.size() == 0 {
		time.Sleep(time.Millisecond)
	}
	close(gate)
	wg.Wait()
	close(releases)
	if n := loads.Load(); n != 1 {
		t.Fatalf("%d loads", n)
	}
	if spoolFiles(t, dir) != 1 {
		t.Fatal("one spool file while in use")
	}
	for done := range releases {
		done()
		done() // a second call does nothing
	}
	if spoolFiles(t, dir) != 0 || c.size() != 0 {
		t.Fatal("spool file kept after the last release")
	}
}

// A failed load is answered to its waiters and not kept: the next caller loads again.
func TestFileCacheDoesNotKeepFailures(t *testing.T) {
	c := newFileCache(time.Hour)
	boom := errors.New("boom")
	key := fileKey{image: "i", path: "/w"}
	if _, _, err := c.get(context.Background(), key, func(context.Context) (containerfs.Blob, error) { return nil, boom }); err != boom {
		t.Fatal(err)
	}
	b, done, err := c.get(context.Background(), key, func(context.Context) (containerfs.Blob, error) {
		return containerfs.MemBlob([]byte("ok")), nil
	})
	if err != nil || b.Size() != 2 {
		t.Fatal(b, err)
	}
	done()
}

// The last caller giving up cancels the load, whose result is removed.
func TestFileCacheAbandonedLoadIsCancelled(t *testing.T) {
	dir := t.TempDir()
	c := newFileCache(time.Hour)
	cancelled := make(chan struct{})
	finished := make(chan struct{})
	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(10 * time.Millisecond)
		cancel()
	}()
	_, _, err := c.get(ctx, fileKey{image: "i", path: "/cli"}, func(lctx context.Context) (containerfs.Blob, error) {
		defer close(finished)
		<-lctx.Done()
		close(cancelled)
		return spoolBlob(t, dir, containerfs.SpoolThreshold+1), nil
	})
	if !errs.Is(err, errs.RuntimeBusy) {
		t.Fatal(err)
	}
	<-cancelled
	<-finished
	deadline := time.Now().Add(5 * time.Second)
	for spoolFiles(t, dir) != 0 {
		if time.Now().After(deadline) {
			t.Fatal("abandoned load's spool file kept")
		}
		time.Sleep(time.Millisecond)
	}
}

// A released file lingers for the next activation, then goes.
func TestFileCacheLinger(t *testing.T) {
	dir := t.TempDir()
	c := newFileCache(50 * time.Millisecond)
	var loads atomic.Int32
	load := func(context.Context) (containerfs.Blob, error) {
		loads.Add(1)
		return spoolBlob(t, dir, containerfs.SpoolThreshold+1), nil
	}
	key := fileKey{image: "i", path: "/cli"}
	for i := 0; i < 3; i++ {
		_, done, err := c.get(context.Background(), key, load)
		if err != nil {
			t.Fatal(err)
		}
		done()
	}
	if loads.Load() != 1 || spoolFiles(t, dir) != 1 {
		t.Fatal(loads.Load(), spoolFiles(t, dir))
	}
	deadline := time.Now().Add(5 * time.Second)
	for spoolFiles(t, dir) != 0 {
		if time.Now().After(deadline) {
			t.Fatal("spool file kept after the linger")
		}
		time.Sleep(5 * time.Millisecond)
	}
}
