//go:build linux

package pluginsandbox

import (
	"errors"
	"fmt"
	"os"
	"unsafe"

	"golang.org/x/sys/unix"
)

const (
	landlockRead  = unix.LANDLOCK_ACCESS_FS_READ_FILE | unix.LANDLOCK_ACCESS_FS_READ_DIR
	landlockWrite = unix.LANDLOCK_ACCESS_FS_WRITE_FILE | unix.LANDLOCK_ACCESS_FS_MAKE_REG |
		unix.LANDLOCK_ACCESS_FS_MAKE_DIR | unix.LANDLOCK_ACCESS_FS_REMOVE_FILE | unix.LANDLOCK_ACCESS_FS_REMOVE_DIR
	landlockHandledV1  = landlockRead | landlockWrite | unix.LANDLOCK_ACCESS_FS_EXECUTE
	landlockFileRights = unix.LANDLOCK_ACCESS_FS_READ_FILE | unix.LANDLOCK_ACCESS_FS_WRITE_FILE |
		unix.LANDLOCK_ACCESS_FS_EXECUTE | unix.LANDLOCK_ACCESS_FS_TRUNCATE
)

type landlockRule struct {
	path   string
	access uint64
}

var systemReadOnlyRules = []landlockRule{
	{path: "/lib", access: landlockRead | unix.LANDLOCK_ACCESS_FS_EXECUTE},
	{path: "/usr/lib", access: landlockRead | unix.LANDLOCK_ACCESS_FS_EXECUTE},
	{path: "/usr/local/lib", access: landlockRead | unix.LANDLOCK_ACCESS_FS_EXECUTE},
	{path: "/etc/ssl", access: landlockRead},
	{path: "/etc/pki", access: landlockRead},
	{path: "/etc/ca-certificates", access: landlockRead},
	{path: "/usr/share/ca-certificates", access: landlockRead},
	{path: "/usr/share/zoneinfo", access: landlockRead},
	{path: "/etc/localtime", access: unix.LANDLOCK_ACCESS_FS_READ_FILE},
	{path: "/etc/resolv.conf", access: unix.LANDLOCK_ACCESS_FS_READ_FILE},
	{path: "/etc/hosts", access: unix.LANDLOCK_ACCESS_FS_READ_FILE},
	{path: "/etc/nsswitch.conf", access: unix.LANDLOCK_ACCESS_FS_READ_FILE},
	{path: "/etc/services", access: unix.LANDLOCK_ACCESS_FS_READ_FILE},
	{path: "/dev/null", access: unix.LANDLOCK_ACCESS_FS_READ_FILE | unix.LANDLOCK_ACCESS_FS_WRITE_FILE},
	{path: "/dev/urandom", access: unix.LANDLOCK_ACCESS_FS_READ_FILE},
	{path: "/dev/random", access: unix.LANDLOCK_ACCESS_FS_READ_FILE},
}

func applyLandlock(opts *execOptions) error {
	if !opts.Landlock {
		return nil
	}
	abi, err := landlockABI()
	if err != nil || abi < 1 {
		if opts.RequireLandlock {
			if err == nil {
				err = errors.New("kernel does not support Landlock ABI 1")
			}
			return err
		}
		fmt.Fprintln(os.Stderr, "plugin-exec: warning: Landlock unavailable; filesystem policy not enforced")
		return nil
	}
	handledAccess := uint64(landlockHandledV1)
	writeAccess := uint64(landlockWrite)
	if abi >= 2 {
		handledAccess |= unix.LANDLOCK_ACCESS_FS_REFER
		writeAccess |= unix.LANDLOCK_ACCESS_FS_REFER
	}
	if abi >= 3 {
		handledAccess |= unix.LANDLOCK_ACCESS_FS_TRUNCATE
		writeAccess |= unix.LANDLOCK_ACCESS_FS_TRUNCATE
	}
	attr := unix.LandlockRulesetAttr{Access_fs: handledAccess}
	fd, _, errno := unix.Syscall(unix.SYS_LANDLOCK_CREATE_RULESET, uintptr(unsafe.Pointer(&attr)), unsafe.Sizeof(attr), 0)
	if errno != 0 {
		return fmt.Errorf("create ruleset: %w", errno)
	}
	ruleset := int(fd)
	defer unix.Close(ruleset)
	rules := []landlockRule{
		{path: opts.Binary, access: unix.LANDLOCK_ACCESS_FS_READ_FILE | unix.LANDLOCK_ACCESS_FS_EXECUTE},
		{path: opts.WorkDir, access: landlockRead | unix.LANDLOCK_ACCESS_FS_EXECUTE},
		{path: opts.RunDir, access: landlockRead | writeAccess},
	}
	rules = append(rules, systemReadOnlyRules...)
	for _, rule := range rules {
		if err := allowLandlockPath(ruleset, rule); err != nil {
			return err
		}
	}
	if _, _, errno := unix.Syscall(unix.SYS_LANDLOCK_RESTRICT_SELF, uintptr(ruleset), 0, 0); errno != 0 {
		return fmt.Errorf("restrict process: %w", errno)
	}
	return nil
}

func landlockABI() (int, error) {
	version, _, errno := unix.Syscall(unix.SYS_LANDLOCK_CREATE_RULESET, 0, 0, unix.LANDLOCK_CREATE_RULESET_VERSION)
	if errno != 0 {
		return 0, errno
	}
	return int(version), nil
}

func allowLandlockPath(ruleset int, rule landlockRule) error {
	if rule.path == "" {
		return nil
	}
	info, err := os.Stat(rule.path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("stat %s: %w", rule.path, err)
	}
	access := rule.access
	if !info.IsDir() {
		access &= landlockFileRights
	}
	fd, err := unix.Open(rule.path, unix.O_PATH|unix.O_CLOEXEC, 0)
	if err != nil {
		return fmt.Errorf("open %s: %w", rule.path, err)
	}
	defer unix.Close(fd)
	attr := unix.LandlockPathBeneathAttr{Allowed_access: access, Parent_fd: int32(fd)}
	if _, _, errno := unix.Syscall6(unix.SYS_LANDLOCK_ADD_RULE, uintptr(ruleset), unix.LANDLOCK_RULE_PATH_BENEATH,
		uintptr(unsafe.Pointer(&attr)), 0, 0, 0); errno != 0 {
		return fmt.Errorf("allow %s: %w", rule.path, errno)
	}
	return nil
}
