//go:build !windows

package engine

import (
	"os"
	"syscall"
)

func lockResourceLease(file *os.File) error {
	return syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
}
