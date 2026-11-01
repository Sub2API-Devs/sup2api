//go:build linux && (amd64 || arm64)

package files

import (
	"io"
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

// writeThroughStep is how much of dst may be dirty before it is written to
// disk and dropped from the page cache.
const writeThroughStep = 8 << 20

// CopyWriteThrough is io.Copy(dst, src) that keeps dst out of the page
// cache: every writeThroughStep bytes the new range is written to disk and
// dropped. The pages of a file the guard writes are charged to its memory
// cgroup (256m), and dirty ones cannot be reclaimed before writeback: on
// 2026-11-01 an app image archive loaded at network speed filled the cgroup
// with dirty pages and got the guard OOM-killed.
func CopyWriteThrough(dst *os.File, src io.Reader) (int64, error) {
	buf := make([]byte, 1<<20)
	var off, flushed int64
	for {
		n, rerr := src.Read(buf)
		if n > 0 {
			w, werr := dst.Write(buf[:n])
			off += int64(w)
			if werr != nil {
				return off, werr
			}
			if off-flushed >= writeThroughStep {
				if err := writeThrough(dst, flushed, off-flushed); err != nil {
					return off, err
				}
				flushed = off
			}
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return off, rerr
		}
	}
	if off > flushed {
		if err := writeThrough(dst, flushed, off-flushed); err != nil {
			return off, err
		}
	}
	return off, nil
}

// DropCache drops f from the page cache, best effort (clean pages, read
// again by the image load: reclaimable anyway, dropped so they are not
// charged to the guard for long).
func DropCache(f *os.File) {
	rc, err := f.SyscallConn()
	if err != nil {
		return
	}
	rc.Control(func(fd uintptr) {
		syscall.Syscall6(syscall.SYS_FADVISE64, fd, 0, 0, fadvDontNeed, 0, 0)
	})
}

// writeThrough writes [off, off+n) of f to disk and drops it from the page
// cache.
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
	switch errno {
	case 0, syscall.ENOSYS, syscall.EINVAL, syscall.ESPIPE:
		return nil // a file system without sync_file_range: the cache stays, reclaimable later
	}
	return errno
}
