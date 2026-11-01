//go:build linux

package compose

import (
	"context"
	"errors"
	"os"
	"syscall"
	"time"
)

// FileLock is flock(LOCK_EX) on <ProjectDir>/.compose.lock, waiting at most
// Wait (60 s) (03 §9.1).
type FileLock struct {
	Path string
	Wait time.Duration
}

// ErrLockTimeout means the compose lock stayed busy.
var ErrLockTimeout = errors.New("compose lock timeout")

func (f FileLock) Lock(ctx context.Context) (func(), error) {
	fd, err := syscall.Open(f.Path, syscall.O_RDWR|syscall.O_CREAT|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0o600)
	if err != nil {
		return nil, err
	}
	file := os.NewFile(uintptr(fd), f.Path)
	wait := f.Wait
	if wait <= 0 {
		wait = 60 * time.Second
	}
	deadline := time.Now().Add(wait)
	for {
		err := syscall.Flock(fd, syscall.LOCK_EX|syscall.LOCK_NB)
		if err == nil {
			return func() {
				_ = syscall.Flock(fd, syscall.LOCK_UN)
				file.Close()
			}, nil
		}
		if err != syscall.EWOULDBLOCK && err != syscall.EINTR {
			file.Close()
			return nil, err
		}
		if time.Now().After(deadline) {
			file.Close()
			return nil, ErrLockTimeout
		}
		select {
		case <-ctx.Done():
			file.Close()
			return nil, ctx.Err()
		case <-time.After(100 * time.Millisecond):
		}
	}
}
