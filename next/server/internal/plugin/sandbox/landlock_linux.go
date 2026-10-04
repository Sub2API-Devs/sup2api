//go:build linux

package sandbox

import (
	"fmt"
	"os"

	"golang.org/x/sys/unix"
)

// applyLandlock restricts file system access using Landlock LSM (PL-P0-4).
// It allows read-only access to the plugin binary and its directory tree,
// and read-write access to the plugin's data directory.
// If Landlock is not available (old kernel), this is a no-op.
func applyLandlock(o *execOptions) error {
	// Check if Landlock is available (Linux 5.13+).
	abi, err := landlockABI()
	if err != nil || abi == 0 {
		// Landlock not available or too old; skip silently.
		return nil
	}

	// Create a ruleset that denies everything by default.
	ruleset, err := unix.LandlockCreateRuleset(
		&unix.LandlockRulesetAttr{
			HandledAccessFs: unix.LANDLOCK_ACCESS_FS_READ_FILE |
				unix.LANDLOCK_ACCESS_FS_READ_DIR |
				unix.LANDLOCK_ACCESS_FS_EXECUTE |
				unix.LANDLOCK_ACCESS_FS_WRITE_FILE |
				unix.LANDLOCK_ACCESS_FS_MAKE_REG |
				unix.LANDLOCK_ACCESS_FS_MAKE_DIR |
				unix.LANDLOCK_ACCESS_FS_REMOVE_FILE |
				unix.LANDLOCK_ACCESS_FS_REMOVE_DIR,
		},
		0,
	)
	if err != nil {
		return fmt.Errorf("landlock_create_ruleset: %w", err)
	}
	defer unix.Close(ruleset)

	// Allow read-only access to the plugin binary and its directory tree.
	if o.Binary != "" {
		if err := landlockAllowPath(ruleset, o.Binary, unix.LANDLOCK_ACCESS_FS_READ_FILE|unix.LANDLOCK_ACCESS_FS_EXECUTE); err != nil {
			return err
		}
	}
	if o.WorkDir != "" {
		if err := landlockAllowPath(ruleset, o.WorkDir, unix.LANDLOCK_ACCESS_FS_READ_FILE|unix.LANDLOCK_ACCESS_FS_READ_DIR); err != nil {
			return err
		}
	}

	// Allow read-write access to the plugin's data directory.
	if o.DataDir != "" {
		if err := landlockAllowPath(ruleset, o.DataDir, unix.LANDLOCK_ACCESS_FS_READ_FILE|
			unix.LANDLOCK_ACCESS_FS_READ_DIR|
			unix.LANDLOCK_ACCESS_FS_WRITE_FILE|
			unix.LANDLOCK_ACCESS_FS_MAKE_REG|
			unix.LANDLOCK_ACCESS_FS_MAKE_DIR|
			unix.LANDLOCK_ACCESS_FS_REMOVE_FILE|
			unix.LANDLOCK_ACCESS_FS_REMOVE_DIR); err != nil {
			return err
		}
	}

	// Restrict the calling thread to the ruleset.
	if err := unix.LandlockRestrictSelf(ruleset, 0); err != nil {
		return fmt.Errorf("landlock_restrict_self: %w", err)
	}

	return nil
}

// landlockABI returns the Landlock ABI version, or 0 if not available.
func landlockABI() (int, error) {
	abi, err := unix.LandlockCreateRuleset(nil, 0, unix.LANDLOCK_CREATE_RULESET_VERSION)
	if err != nil {
		return 0, err
	}
	return abi, nil
}

// landlockAllowPath adds a rule to allow access to the given path.
func landlockAllowPath(ruleset int, path string, access uint64) error {
	fd, err := unix.Open(path, unix.O_PATH|unix.O_CLOEXEC, 0)
	if err != nil {
		// If the path doesn't exist, skip it (e.g., data dir not yet created).
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("open %s: %w", path, err)
	}
	defer unix.Close(fd)

	return unix.LandlockAddRule(ruleset, unix.LANDLOCK_RULE_PATH_BENEATH, &unix.LandlockPathBeneathAttr{
		AllowedAccess: access,
		ParentFd:      fd,
	}, 0)
}
