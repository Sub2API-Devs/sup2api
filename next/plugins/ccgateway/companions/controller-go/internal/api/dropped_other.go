//go:build !windows

package api

// isPlatformReset: syscall.EPIPE and ECONNRESET already cover Unix.
func isPlatformReset(error) bool { return false }
