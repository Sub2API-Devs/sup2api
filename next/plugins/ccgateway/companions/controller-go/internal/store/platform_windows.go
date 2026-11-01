//go:build windows

package store

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// fileLock on Windows is a development stand-in only (02 §8.1): a
// process-wide registry of locked roots plus the open lock file. It keeps
// two stores of one test process off the same root; it does not protect
// against another process. Production runs on Linux (platform_unix.go).
type fileLock struct {
	key string
	f   *os.File
}

var (
	locksMu sync.Mutex
	held    = map[string]bool{}
)

var errLocked = errors.New("lock is held")

func acquireLock(path string) (*fileLock, error) {
	key := strings.ToLower(filepath.Clean(path))
	locksMu.Lock()
	defer locksMu.Unlock()
	if held[key] {
		return nil, errLocked
	}
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, privateFile)
	if err != nil {
		return nil, err
	}
	held[key] = true
	return &fileLock{key: key, f: f}, nil
}

func (l *fileLock) release() {
	if l == nil || l.f == nil {
		return
	}
	locksMu.Lock()
	defer locksMu.Unlock()
	l.f.Close()
	l.f = nil
	delete(held, l.key)
}

func syncDir(string) {}

func inodeOf(fs.FileInfo) uint64 { return 0 }

func isUnsupported(err error) bool { return err != nil }
