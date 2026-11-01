//go:build linux && (amd64 || arm64)

package containerfs

import (
	"os"
	"syscall"
)

// Linux values (linux/fs.h, linux/fadvise.h).
const (
	syncFileRangeWaitBefore = 1
	syncFileRangeWrite      = 2
	syncFileRangeWaitAfter  = 4
	fadvDontNeed            = 4
)

// writeThrough writes [off, off+n) of f to disk and drops it from the page
// cache: spool pages are charged to the controller's memory cgroup, and
// dirty ones cannot be reclaimed before writeback.
func writeThrough(f *os.File, off, n int64) error {
	rc, err := f.SyscallConn()
	if err != nil {
		return err
	}
	var errno syscall.Errno
	if err := rc.Control(func(fd uintptr) {
		_, _, errno = syscall.Syscall6(syscall.SYS_SYNC_FILE_RANGE, fd, uintptr(off), uintptr(n),
			syncFileRangeWaitBefore|syncFileRangeWrite|syncFileRangeWaitAfter, 0, 0)
		if errno == 0 {
			syscall.Syscall6(syscall.SYS_FADVISE64, fd, uintptr(off), uintptr(n), fadvDontNeed, 0, 0)
		}
	}); err != nil {
		return err
	}
	if errno == syscall.ENOSYS || errno == syscall.EINVAL || errno == syscall.ESPIPE {
		return nil // a file system without sync_file_range: the cache stays, reclaimable later
	}
	if errno != 0 {
		return errno
	}
	return nil
}

// dropCache drops [off, off+n) of f from the page cache, best effort
// (clean pages: reclaimable anyway, dropped so they are not charged long).
func dropCache(f *os.File, off, n int64) {
	rc, err := f.SyscallConn()
	if err != nil {
		return
	}
	rc.Control(func(fd uintptr) {
		syscall.Syscall6(syscall.SYS_FADVISE64, fd, uintptr(off), uintptr(n), fadvDontNeed, 0, 0)
	})
}
