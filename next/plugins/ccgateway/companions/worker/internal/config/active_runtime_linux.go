//go:build linux

package config

import (
	"fmt"
	"os"
	"syscall"
)

func verifyRuntimeOwner(info os.FileInfo) error {
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok || stat.Uid != 0 || info.Mode().Perm()&0022 != 0 {
		return fmt.Errorf("active runtime must be root-owned and not group/world-writable")
	}
	return nil
}
