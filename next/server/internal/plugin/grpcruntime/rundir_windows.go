//go:build windows

package grpcruntime

import "errors"

// fallbackRunRoot is never needed on Windows: go-plugin uses loopback TCP
// there (authenticated by AutoMTLS), not unix sockets.
func fallbackRunRoot() (string, error) {
	return "", errors.New("no fallback run directory on windows")
}
