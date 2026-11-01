//go:build !(linux && (amd64 || arm64))

package files

import (
	"io"
	"os"
)

// CopyWriteThrough is io.Copy off Linux (writethrough_linux.go).
func CopyWriteThrough(dst *os.File, src io.Reader) (int64, error) { return io.Copy(dst, src) }

// DropCache does nothing off Linux.
func DropCache(f *os.File) {}
