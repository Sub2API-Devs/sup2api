//go:build linux

package sandbox

import (
	"fmt"
	"os"
	"unsafe"

	"golang.org/x/sys/unix"
)

// Landlock (Linux 5.13+) restricts the file system view of the plugin
// process (PL-P0-4). It is off unless plugin-exec gets --landlock
// (SUB2API_PLUGIN_LANDLOCK=true): it has not been run against the real
// plugins yet, and a missing path in the allow list stops every plugin from
// starting (CONTRACTS §43.8).
//
// x/sys has the types and constants but no wrappers for the three system
// calls, so they are called directly.

// Rights restricted by the ruleset (Landlock ABI 1). What is not listed here
// (sockets, fifos, symlinks, devices) stays unrestricted.
const (
	llRead  = unix.LANDLOCK_ACCESS_FS_READ_FILE | unix.LANDLOCK_ACCESS_FS_READ_DIR
	llWrite = unix.LANDLOCK_ACCESS_FS_WRITE_FILE | unix.LANDLOCK_ACCESS_FS_MAKE_REG |
		unix.LANDLOCK_ACCESS_FS_MAKE_DIR | unix.LANDLOCK_ACCESS_FS_REMOVE_FILE | unix.LANDLOCK_ACCESS_FS_REMOVE_DIR
	llHandled = llRead | llWrite | unix.LANDLOCK_ACCESS_FS_EXECUTE
	// Rights that apply to a regular file; the others are refused on one.
	llFileRights = unix.LANDLOCK_ACCESS_FS_READ_FILE | unix.LANDLOCK_ACCESS_FS_WRITE_FILE | unix.LANDLOCK_ACCESS_FS_EXECUTE
)

// systemReadOnly are read where they exist: CA certificates, time zones and
// name resolution, which a statically linked Go plugin still reads.
var systemReadOnly = []string{
	"/etc/ssl", "/etc/pki", "/etc/ca-certificates", "/usr/share/ca-certificates",
	"/usr/share/zoneinfo", "/etc/localtime",
	"/etc/resolv.conf", "/etc/hosts", "/etc/nsswitch.conf", "/etc/services",
	"/dev/urandom", "/dev/random",
}

func applyLandlock(o *execOptions) error {
	if !o.Landlock {
		return nil
	}
	if abi, err := landlockABI(); err != nil || abi < 1 {
		return nil // kernel without Landlock: nothing to apply
	}
	attr := unix.LandlockRulesetAttr{Access_fs: llHandled}
	fd, _, errno := unix.Syscall(unix.SYS_LANDLOCK_CREATE_RULESET, uintptr(unsafe.Pointer(&attr)), unsafe.Sizeof(attr), 0)
	if errno != 0 {
		return fmt.Errorf("landlock_create_ruleset: %w", errno)
	}
	ruleset := int(fd)
	defer unix.Close(ruleset)

	type rule struct {
		path   string
		access uint64
	}
	rules := []rule{
		{o.Binary, unix.LANDLOCK_ACCESS_FS_READ_FILE | unix.LANDLOCK_ACCESS_FS_EXECUTE},
		{o.WorkDir, llRead | llWrite},
		{o.DataDir, llRead | llWrite},
		// go-plugin creates its unix socket under the temporary directory.
		{os.TempDir(), llRead | llWrite},
		{"/dev/null", unix.LANDLOCK_ACCESS_FS_READ_FILE | unix.LANDLOCK_ACCESS_FS_WRITE_FILE},
	}
	for _, p := range systemReadOnly {
		rules = append(rules, rule{p, llRead})
	}
	for _, r := range rules {
		if r.path == "" {
			continue
		}
		if err := landlockAllowPath(ruleset, r.path, r.access); err != nil {
			return err
		}
	}
	// no_new_privs is already set (applyLimits), as Landlock requires.
	if _, _, errno := unix.Syscall(unix.SYS_LANDLOCK_RESTRICT_SELF, uintptr(ruleset), 0, 0); errno != 0 {
		return fmt.Errorf("landlock_restrict_self: %w", errno)
	}
	return nil
}

// landlockABI returns the Landlock ABI version of the kernel.
func landlockABI() (int, error) {
	v, _, errno := unix.Syscall(unix.SYS_LANDLOCK_CREATE_RULESET, 0, 0, unix.LANDLOCK_CREATE_RULESET_VERSION)
	if errno != 0 {
		return 0, errno
	}
	return int(v), nil
}

// landlockAllowPath grants access below path. A path that does not exist is
// skipped; on a regular file only the file rights are granted.
func landlockAllowPath(ruleset int, path string, access uint64) error {
	st, err := os.Stat(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("landlock: stat %s: %w", path, err)
	}
	if !st.IsDir() {
		access &= llFileRights
	}
	fd, err := unix.Open(path, unix.O_PATH|unix.O_CLOEXEC, 0)
	if err != nil {
		return fmt.Errorf("landlock: open %s: %w", path, err)
	}
	defer unix.Close(fd)
	attr := unix.LandlockPathBeneathAttr{Allowed_access: access, Parent_fd: int32(fd)}
	if _, _, errno := unix.Syscall6(unix.SYS_LANDLOCK_ADD_RULE, uintptr(ruleset), unix.LANDLOCK_RULE_PATH_BENEATH,
		uintptr(unsafe.Pointer(&attr)), 0, 0, 0); errno != 0 {
		return fmt.Errorf("landlock_add_rule %s: %w", path, errno)
	}
	return nil
}
