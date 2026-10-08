package engine

import (
	"os"
	"syscall"
	"unsafe"
)

var resourceLockFile = syscall.NewLazyDLL("kernel32.dll").NewProc("LockFileEx")

func lockResourceLease(file *os.File) error {
	var overlap syscall.Overlapped
	ok, _, err := resourceLockFile.Call(file.Fd(), 3, 0, 1, 0, uintptr(unsafe.Pointer(&overlap)))
	if ok == 0 {
		return err
	}
	return nil
}
