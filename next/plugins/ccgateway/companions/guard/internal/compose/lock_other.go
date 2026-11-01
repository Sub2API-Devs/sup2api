//go:build !linux

package compose

import (
	"context"
	"errors"
	"time"
)

// FileLock is Linux only; the stub lets the module build elsewhere.
type FileLock struct {
	Path string
	Wait time.Duration
}

// ErrLockTimeout means the compose lock stayed busy.
var ErrLockTimeout = errors.New("compose lock timeout")

func (f FileLock) Lock(ctx context.Context) (func(), error) { return nil, errors.ErrUnsupported }
