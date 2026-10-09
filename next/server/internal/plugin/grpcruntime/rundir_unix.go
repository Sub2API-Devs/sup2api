//go:build !windows

package grpcruntime

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"syscall"
)

// fallbackRunRoot returns /tmp/sub2api-<euid>, created 0700 when missing. An
// existing entry is only used when it is a real directory of this user with
// mode 0700: in the shared /tmp anyone may have created it first.
func fallbackRunRoot() (string, error) {
	root := filepath.Join("/tmp", "sub2api-"+strconv.Itoa(os.Geteuid()))
	if err := os.Mkdir(root, 0o700); err != nil && !os.IsExist(err) {
		return "", err
	}
	st, err := os.Lstat(root)
	if err != nil {
		return "", err
	}
	sys, ok := st.Sys().(*syscall.Stat_t)
	if !st.IsDir() || !ok || int(sys.Uid) != os.Geteuid() || st.Mode().Perm() != 0o700 {
		return "", fmt.Errorf("%s is not a private directory of this user", root)
	}
	return root, nil
}
