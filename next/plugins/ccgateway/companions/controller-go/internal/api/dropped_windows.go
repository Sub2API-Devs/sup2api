//go:build windows

package api

import (
	"errors"
	"syscall"
)

// isPlatformReset: Winsock's WSAECONNABORTED, WSAECONNRESET and
// ERROR_NETNAME_DELETED (the development machine only).
func isPlatformReset(err error) bool {
	var errno syscall.Errno
	if !errors.As(err, &errno) {
		return false
	}
	switch errno {
	case 10053, 10054, 64:
		return true
	}
	return false
}
