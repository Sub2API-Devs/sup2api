package updates

import (
	"context"
	"sync"
	"time"

	"ccgateway/controller/internal/containerfs"
	"ccgateway/controller/internal/errs"
)

// Limits that keep the controller's memory and spool independent of the
// number of runtimes updated at once.
const (
	// fileLinger keeps an image file read for this long after its last
	// user: the core activates runtimes one after another, and each would
	// otherwise read the same CLI from the image again.
	fileLinger = 2 * time.Minute
	// maxActivations is how many in-place updates work in containers at
	// the same time (each holds a Worker backup and streams to the guard).
	maxActivations = 4
)

// fileKey is one file of one image: by image ID, so references to the
// same image share it.
type fileKey struct {
	image string
	path  string
	limit int64
}

// sharedFile is a file read once and used by every activation that needs
// it; the last release (after fileLinger) removes its spool file.
type sharedFile struct {
	key    fileKey
	done   chan struct{} // closed when the load finished
	loaded bool          // the load finished (under fileCache.mu)
	blob   containerfs.Blob
	err    error
	refs   int
	cancel context.CancelFunc
	timer  *time.Timer
}

// fileCache is a single-flight, reference-counted cache of image files.
type fileCache struct {
	mu     sync.Mutex
	files  map[fileKey]*sharedFile
	linger time.Duration
}

func newFileCache(linger time.Duration) *fileCache {
	return &fileCache{files: map[fileKey]*sharedFile{}, linger: linger}
}

// get is key's file, loaded by load unless another caller loads or holds
// it already. The load runs detached from ctx and is cancelled only when
// every caller waiting for it has gone. release must be called once.
func (c *fileCache) get(ctx context.Context, key fileKey, load func(context.Context) (containerfs.Blob, error)) (containerfs.Blob, func(), error) {
	c.mu.Lock()
	f := c.files[key]
	if f == nil {
		lctx, cancel := context.WithCancel(context.WithoutCancel(ctx))
		f = &sharedFile{key: key, done: make(chan struct{}), cancel: cancel}
		c.files[key] = f
		go c.load(lctx, f, load)
	}
	f.refs++
	if f.timer != nil {
		f.timer.Stop()
		f.timer = nil
	}
	c.mu.Unlock()
	select {
	case <-f.done:
	case <-ctx.Done():
		c.release(f)
		return nil, nil, errs.Wrap(errs.RuntimeBusy, "image file read abandoned", ctx.Err())
	}
	if f.err != nil {
		c.release(f)
		return nil, nil, f.err
	}
	var once sync.Once
	return f.blob, func() { once.Do(func() { c.release(f) }) }, nil
}

func (c *fileCache) load(ctx context.Context, f *sharedFile, load func(context.Context) (containerfs.Blob, error)) {
	blob, err := load(ctx)
	f.cancel()
	c.mu.Lock()
	f.blob, f.err, f.loaded = blob, err, true
	close(f.done)
	abandoned := f.refs == 0
	if err != nil || abandoned {
		c.forget(f)
	}
	c.mu.Unlock()
	if err == nil && abandoned {
		blob.Close()
	}
}

// forget drops f from the map, unless a newer entry replaced it (under mu).
func (c *fileCache) forget(f *sharedFile) {
	if c.files[f.key] == f {
		delete(c.files, f.key)
	}
}

// release is one user done with f: the last one closes it (after the
// linger) or, while it still loads, cancels the load (load closes it then).
func (c *fileCache) release(f *sharedFile) {
	c.mu.Lock()
	f.refs--
	if f.refs > 0 {
		c.mu.Unlock()
		return
	}
	if !f.loaded {
		c.forget(f)
		c.mu.Unlock()
		f.cancel()
		return
	}
	if f.err != nil {
		c.forget(f)
		c.mu.Unlock()
		return
	}
	if c.linger > 0 && c.files[f.key] == f {
		f.timer = time.AfterFunc(c.linger, func() { c.expire(f) })
		c.mu.Unlock()
		return
	}
	c.forget(f)
	c.mu.Unlock()
	f.blob.Close()
}

// expire closes f once its linger passed with no new user.
func (c *fileCache) expire(f *sharedFile) {
	c.mu.Lock()
	if f.refs > 0 || c.files[f.key] != f {
		c.mu.Unlock()
		return
	}
	f.timer = nil
	c.forget(f)
	c.mu.Unlock()
	f.blob.Close()
}

// slot waits for one of maxActivations (until ctx ends: RuntimeBusy, as
// for the account lock); the returned function gives it back.
func (u *updater) slot(ctx context.Context) (func(), error) {
	select {
	case u.slots <- struct{}{}:
		return func() { <-u.slots }, nil
	case <-ctx.Done():
		return nil, errs.Wrap(errs.RuntimeBusy, "too many runtime updates in progress", ctx.Err())
	}
}
