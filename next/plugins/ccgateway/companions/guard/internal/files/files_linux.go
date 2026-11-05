//go:build linux

package files

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"strings"
	"syscall"
)

// oPath is O_PATH (same value on amd64 and arm64; the frozen syscall
// package does not export it). An O_PATH|O_NOFOLLOW descriptor of a
// symlink, FIFO or device refers to the node itself and never opens it.
const oPath = 0x200000

// Root is a directory descriptor; every operation starts from it and walks
// down with openat(O_NOFOLLOW), never by joining path strings.
type Root struct {
	fd   int
	path string
	uid  uint32 // required owner: 0, except in tests (openRoot)
}

// OpenRoot opens path from "/" level by level. Every level must be a
// directory owned by root without group or other write permission.
func OpenRoot(path string) (*Root, error) { return openRoot(path, 0, "") }

// openRoot is the test hook: owner uid and a trusted ancestor that is
// opened but not checked (t.TempDir lives under a sticky /tmp).
func openRoot(path string, uid uint32, trusted string) (*Root, error) {
	if !strings.HasPrefix(path, "/") || cleanAbs(path) != path {
		return nil, &Error{Rel: path, Why: "path"}
	}
	fd, err := syscall.Open("/", syscall.O_RDONLY|syscall.O_DIRECTORY|syscall.O_CLOEXEC, 0)
	if err != nil {
		return nil, err
	}
	cur := ""
	check := trusted == "" || trusted == "/"
	if check {
		if err := checkDir(fd, uid, "/"); err != nil {
			syscall.Close(fd)
			return nil, err
		}
	}
	for _, seg := range strings.Split(strings.TrimPrefix(path, "/"), "/") {
		if seg == "" {
			continue
		}
		cur += "/" + seg
		next, err := syscall.Openat(fd, seg, syscall.O_RDONLY|syscall.O_DIRECTORY|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0)
		syscall.Close(fd)
		if err != nil {
			if err == syscall.ELOOP || err == syscall.ENOTDIR {
				return nil, &Error{Rel: cur, Why: "symlink"}
			}
			return nil, err
		}
		fd = next
		if !check && cur == trusted {
			check = true
			continue
		}
		if check {
			if err := checkDir(fd, uid, cur); err != nil {
				syscall.Close(fd)
				return nil, err
			}
		}
	}
	return &Root{fd: fd, path: path, uid: uid}, nil
}

func cleanAbs(p string) string {
	parts := []string{}
	for _, s := range strings.Split(p, "/") {
		if s == "" || s == "." {
			continue
		}
		if s == ".." {
			return ""
		}
		parts = append(parts, s)
	}
	return "/" + strings.Join(parts, "/")
}

func checkDir(fd int, uid uint32, rel string) error {
	var st syscall.Stat_t
	if err := syscall.Fstat(fd, &st); err != nil {
		return err
	}
	if st.Mode&syscall.S_IFMT != syscall.S_IFDIR {
		return &Error{Rel: rel, Why: "type"}
	}
	if st.Uid != uid {
		return &Error{Rel: rel, Why: "owner"}
	}
	if st.Mode&0o022 != 0 {
		return &Error{Rel: rel, Why: "mode"}
	}
	return nil
}

// Path is the root's absolute path.
func (r *Root) Path() string { return r.path }

// Close releases the descriptor.
func (r *Root) Close() error { return syscall.Close(r.fd) }

// openDir walks rel (directories only) from the root; mkdir creates
// missing levels with 0700.
func (r *Root) openDir(rel []string, mkdir bool) (int, error) {
	fd, err := syscall.Dup(r.fd)
	if err != nil {
		return -1, err
	}
	cur := ""
	for _, seg := range rel {
		cur += "/" + seg
		next, err := syscall.Openat(fd, seg, syscall.O_RDONLY|syscall.O_DIRECTORY|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0)
		if err == syscall.ENOENT && mkdir {
			if err := syscall.Mkdirat(fd, seg, 0o700); err != nil && err != syscall.EEXIST {
				syscall.Close(fd)
				return -1, err
			}
			next, err = syscall.Openat(fd, seg, syscall.O_RDONLY|syscall.O_DIRECTORY|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0)
		}
		syscall.Close(fd)
		if err != nil {
			switch err {
			case syscall.ELOOP, syscall.ENOTDIR:
				return -1, &Error{Rel: strings.TrimPrefix(cur, "/"), Why: "symlink"}
			case syscall.ENOENT:
				return -1, os.ErrNotExist
			}
			return -1, err
		}
		fd = next
		if err := checkDir(fd, r.uid, strings.TrimPrefix(cur, "/")); err != nil {
			syscall.Close(fd)
			return -1, err
		}
	}
	return fd, nil
}

func split(rel []string) ([]string, string, error) {
	if len(rel) == 0 {
		return nil, "", &Error{Why: "path"}
	}
	for _, s := range rel {
		if !ValidSegment(s) {
			return nil, "", &Error{Rel: strings.Join(rel, "/"), Why: "path"}
		}
	}
	return rel[:len(rel)-1], rel[len(rel)-1], nil
}

func randHex() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// WriteReplace writes data to rel through a temporary file and renameat:
// the target gets a new inode; a symlink at the target is replaced, never
// followed (03 §6.2).
func (r *Root) WriteReplace(rel []string, data []byte, mode uint32, mkdir bool) error {
	dirs, name, err := split(rel)
	if err != nil {
		return err
	}
	dfd, err := r.openDir(dirs, mkdir)
	if err != nil {
		return err
	}
	defer syscall.Close(dfd)
	tmp := "." + name + ".tmp-" + randHex()
	fd, err := syscall.Openat(dfd, tmp, syscall.O_WRONLY|syscall.O_CREAT|syscall.O_EXCL|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, mode)
	if err != nil {
		return err
	}
	ok := false
	defer func() {
		if !ok {
			_ = syscall.Unlinkat(dfd, tmp)
		}
	}()
	err = writeAll(fd, data)
	if err == nil {
		err = syscall.Fchmod(fd, mode)
	}
	if err == nil {
		err = syscall.Fsync(fd)
	}
	if cerr := syscall.Close(fd); err == nil {
		err = cerr
	}
	if err != nil {
		return err
	}
	if err := syscall.Renameat(dfd, tmp, dfd, name); err != nil {
		return err
	}
	ok = true
	return syscall.Fsync(dfd)
}

func writeAll(fd int, data []byte) error {
	for len(data) > 0 {
		n, err := syscall.Write(fd, data)
		if err == syscall.EINTR {
			continue
		}
		if err != nil {
			return err
		}
		data = data[n:]
	}
	return nil
}

func lstatAt(dfd int, name string) (*syscall.Stat_t, error) {
	fd, err := syscall.Openat(dfd, name, oPath|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0)
	if err != nil {
		if err == syscall.ENOENT {
			return nil, os.ErrNotExist
		}
		return nil, err
	}
	defer syscall.Close(fd)
	var st syscall.Stat_t
	if err := syscall.Fstat(fd, &st); err != nil {
		return nil, err
	}
	return &st, nil
}

func (r *Root) checkFile(st *syscall.Stat_t, rel string) error {
	switch {
	case st.Mode&syscall.S_IFMT == syscall.S_IFLNK:
		return &Error{Rel: rel, Why: "symlink"}
	case st.Mode&syscall.S_IFMT != syscall.S_IFREG:
		return &Error{Rel: rel, Why: "type"}
	case st.Nlink != 1:
		return &Error{Rel: rel, Why: "hardlink"}
	case st.Uid != r.uid:
		return &Error{Rel: rel, Why: "owner"}
	case st.Mode&0o022 != 0:
		return &Error{Rel: rel, Why: "mode"}
	}
	return nil
}

// RewriteInPlace keeps the inode (resolv.conf may be bind mounted into a
// running container): write first, then truncate (03 §6.2). A missing file
// is os.ErrNotExist; a link, hard link or special file is *Error.
func (r *Root) RewriteInPlace(rel []string, data []byte, mode uint32) error {
	dirs, name, err := split(rel)
	if err != nil {
		return err
	}
	dfd, err := r.openDir(dirs, false)
	if err != nil {
		return err
	}
	defer syscall.Close(dfd)
	relName := strings.Join(rel, "/")
	st, err := lstatAt(dfd, name)
	if err != nil {
		return err
	}
	if err := r.checkFile(st, relName); err != nil {
		return err
	}
	fd, err := syscall.Openat(dfd, name, syscall.O_WRONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK|syscall.O_CLOEXEC, 0)
	if err != nil {
		if err == syscall.ELOOP {
			return &Error{Rel: relName, Why: "symlink"}
		}
		if err == syscall.ENXIO {
			return &Error{Rel: relName, Why: "type"}
		}
		return err
	}
	defer syscall.Close(fd)
	var st2 syscall.Stat_t
	if err := syscall.Fstat(fd, &st2); err != nil {
		return err
	}
	if st2.Ino != st.Ino || st2.Dev != st.Dev {
		return &Error{Rel: relName, Why: "type"}
	}
	if err := r.checkFile(&st2, relName); err != nil {
		return err
	}
	for off := 0; off < len(data); {
		n, err := syscall.Pwrite(fd, data[off:], int64(off))
		if err == syscall.EINTR {
			continue
		}
		if err != nil {
			return err
		}
		off += n
	}
	if err := syscall.Ftruncate(fd, int64(len(data))); err != nil {
		return err
	}
	if err := syscall.Fchmod(fd, mode); err != nil {
		return err
	}
	return syscall.Fsync(fd)
}

// ReadFile reads a regular file (owner, nlink 1, no group/other write) of
// at most max bytes.
func (r *Root) ReadFile(rel []string, max int64) ([]byte, error) {
	dirs, name, err := split(rel)
	if err != nil {
		return nil, err
	}
	dfd, err := r.openDir(dirs, false)
	if err != nil {
		return nil, err
	}
	defer syscall.Close(dfd)
	st, err := lstatAt(dfd, name)
	if err != nil {
		return nil, err
	}
	relName := strings.Join(rel, "/")
	if err := r.checkFile(st, relName); err != nil {
		return nil, err
	}
	fd, err := syscall.Openat(dfd, name, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK|syscall.O_CLOEXEC, 0)
	if err != nil {
		return nil, err
	}
	f := os.NewFile(uintptr(fd), relName)
	defer f.Close()
	var st2 syscall.Stat_t
	if err := syscall.Fstat(fd, &st2); err != nil {
		return nil, err
	}
	if st2.Ino != st.Ino || st2.Dev != st.Dev {
		return nil, &Error{Rel: relName, Why: "type"}
	}
	b, err := io.ReadAll(io.LimitReader(f, max+1))
	if err != nil {
		return nil, err
	}
	if int64(len(b)) > max {
		return nil, ErrTooLarge
	}
	return b, nil
}

// Stat returns mode bits (permission part) of a checked regular file.
func (r *Root) Mode(rel []string) (uint32, error) {
	dirs, name, err := split(rel)
	if err != nil {
		return 0, err
	}
	dfd, err := r.openDir(dirs, false)
	if err != nil {
		return 0, err
	}
	defer syscall.Close(dfd)
	st, err := lstatAt(dfd, name)
	if err != nil {
		return 0, err
	}
	if err := r.checkFile(st, strings.Join(rel, "/")); err != nil {
		return 0, err
	}
	return st.Mode & 0o7777, nil
}

// Remove unlinks a file (missing is not an error).
func (r *Root) Remove(rel []string) error {
	dirs, name, err := split(rel)
	if err != nil {
		return err
	}
	dfd, err := r.openDir(dirs, false)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	defer syscall.Close(dfd)
	if err := syscall.Unlinkat(dfd, name); err != nil && err != syscall.ENOENT {
		return err
	}
	return nil
}

// List returns the entries of a directory (rel empty = the root).
func (r *Root) List(rel []string) ([]Entry, error) {
	for _, s := range rel {
		if !ValidSegment(s) {
			return nil, &Error{Rel: strings.Join(rel, "/"), Why: "path"}
		}
	}
	dfd, err := r.openDir(rel, false)
	if err != nil {
		return nil, err
	}
	defer syscall.Close(dfd)
	return r.list(dfd)
}

func (r *Root) list(dfd int) ([]Entry, error) {
	// A new open file description of the same directory: a dup would
	// share dfd's directory offset (and r.fd's, for the root itself), so a
	// second listing of the same Root would start at the end and see
	// nothing, and two concurrent listings would split the entries.
	own, err := syscall.Openat(dfd, ".", syscall.O_RDONLY|syscall.O_DIRECTORY|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0)
	if err != nil {
		return nil, err
	}
	f := os.NewFile(uintptr(own), "dir")
	defer f.Close()
	namesList, err := f.Readdirnames(-1)
	if err != nil {
		return nil, err
	}
	out := make([]Entry, 0, len(namesList))
	for _, n := range namesList {
		st, err := lstatAt(dfd, n)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue
			}
			return nil, err
		}
		e := Entry{Name: n, Nlink: uint64(st.Nlink), UID: st.Uid, Mode: st.Mode & 0o7777, Size: st.Size, Mtime: st.Mtim.Sec}
		switch st.Mode & syscall.S_IFMT {
		case syscall.S_IFREG:
			e.Type = "file"
		case syscall.S_IFDIR:
			e.Type = "dir"
		case syscall.S_IFLNK:
			e.Type = "symlink"
		default:
			e.Type = "special"
		}
		out = append(out, e)
	}
	return out, nil
}

// EnsureDir creates rel (0700) when missing and checks every level.
func (r *Root) EnsureDir(rel []string) error {
	for _, s := range rel {
		if !ValidSegment(s) {
			return &Error{Rel: strings.Join(rel, "/"), Why: "path"}
		}
	}
	fd, err := r.openDir(rel, true)
	if err != nil {
		return err
	}
	return syscall.Close(fd)
}

// CreateTemp creates a new 0600 file in dir rel; the caller removes it.
func (r *Root) CreateTemp(rel []string, prefix, suffix string) (*os.File, string, error) {
	dfd, err := r.openDir(rel, true)
	if err != nil {
		return nil, "", err
	}
	defer syscall.Close(dfd)
	name := prefix + randHex() + suffix
	if !ValidSegment(name) {
		return nil, "", &Error{Rel: name, Why: "path"}
	}
	fd, err := syscall.Openat(dfd, name, syscall.O_RDWR|syscall.O_CREAT|syscall.O_EXCL|syscall.O_NOFOLLOW|syscall.O_CLOEXEC, 0o600)
	if err != nil {
		return nil, "", err
	}
	return os.NewFile(uintptr(fd), name), name, nil
}

// FreeBytes is the space available to root in the root's filesystem.
func (r *Root) FreeBytes() (uint64, error) {
	var fs syscall.Statfs_t
	if err := syscall.Fstatfs(r.fd, &fs); err != nil {
		return 0, err
	}
	return fs.Bfree * uint64(fs.Bsize), nil
}

// relOf cuts abs (under the root) into checked segments.
func (r *Root) relOf(abs string) ([]string, error) {
	rest, ok := strings.CutPrefix(abs, r.path+"/")
	if !ok || rest == "" {
		return nil, &Error{Rel: abs, Why: "path"}
	}
	segs := strings.Split(rest, "/")
	for _, s := range segs {
		if !ValidSegment(s) {
			return nil, &Error{Rel: rest, Why: "path"}
		}
	}
	return segs, nil
}

// VerifyFile checks a bind mount source file (03 §6.3).
func (r *Root) VerifyFile(abs string) error {
	rel, err := r.relOf(abs)
	if err != nil {
		return err
	}
	dfd, err := r.openDir(rel[:len(rel)-1], false)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &Error{Rel: strings.Join(rel, "/"), Why: "missing"}
		}
		return err
	}
	defer syscall.Close(dfd)
	st, err := lstatAt(dfd, rel[len(rel)-1])
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &Error{Rel: strings.Join(rel, "/"), Why: "missing"}
		}
		return err
	}
	return r.checkFile(st, strings.Join(rel, "/"))
}

// VerifyDir checks a bind mounted directory: every entry is a regular
// root file with one link, and allow(name) accepts its name.
func (r *Root) VerifyDir(abs string, allow func(string) bool) error {
	rel, err := r.relOf(abs)
	if err != nil {
		return err
	}
	dfd, err := r.openDir(rel, false)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &Error{Rel: strings.Join(rel, "/"), Why: "missing"}
		}
		return err
	}
	defer syscall.Close(dfd)
	entries, err := r.list(dfd)
	if err != nil {
		return err
	}
	base := strings.Join(rel, "/")
	for _, e := range entries {
		erel := base + "/" + e.Name
		switch {
		case e.Type == "symlink":
			return &Error{Rel: erel, Why: "symlink"}
		case e.Type != "file":
			return &Error{Rel: erel, Why: "type"}
		case e.Nlink != 1:
			return &Error{Rel: erel, Why: "hardlink"}
		case e.UID != r.uid:
			return &Error{Rel: erel, Why: "owner"}
		case e.Mode&0o022 != 0:
			return &Error{Rel: erel, Why: "mode"}
		case allow != nil && !allow(e.Name):
			return &Error{Rel: erel, Why: "name"}
		}
	}
	return nil
}

// VerifySocketDir checks the session state socket directory before it is
// bind mounted (SESSION-MEMORY-TOOLS-USED-DESIGN.md §7.2): the directory
// itself is checked like every level (root owner, no group or other
// write), and it holds nothing, or exactly one root-owned socket named
// SocketName with one link. The socket's own mode is not checked:
// Valkey creates it 0666 on purpose (access control is the ACL password).
func (r *Root) VerifySocketDir(abs string) error {
	rel, err := r.relOf(abs)
	if err != nil {
		return err
	}
	dfd, err := r.openDir(rel, false)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return &Error{Rel: strings.Join(rel, "/"), Why: "missing"}
		}
		return err
	}
	defer syscall.Close(dfd)
	entries, err := r.list(dfd)
	if err != nil {
		return err
	}
	base := strings.Join(rel, "/")
	for _, e := range entries {
		erel := base + "/" + e.Name
		if e.Name != SocketName {
			return &Error{Rel: erel, Why: "name"}
		}
		st, err := lstatAt(dfd, e.Name)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				continue // Valkey is restarting: an empty directory is fine
			}
			return err
		}
		if err := checkSocket(st, r.uid, erel); err != nil {
			return err
		}
	}
	return nil
}

// checkSocket: a socket (not a link, regular file, FIFO or device) with
// one link, owned by uid.
func checkSocket(st *syscall.Stat_t, uid uint32, rel string) error {
	switch {
	case st.Mode&syscall.S_IFMT == syscall.S_IFLNK:
		return &Error{Rel: rel, Why: "symlink"}
	case st.Mode&syscall.S_IFMT != syscall.S_IFSOCK:
		return &Error{Rel: rel, Why: "type"}
	case st.Nlink != 1:
		return &Error{Rel: rel, Why: "hardlink"}
	case st.Uid != uid:
		return &Error{Rel: rel, Why: "owner"}
	}
	return nil
}
