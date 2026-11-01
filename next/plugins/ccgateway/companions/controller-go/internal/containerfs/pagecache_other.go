//go:build !(linux && (amd64 || arm64))

package containerfs

import "os"

// writeThrough and dropCache only act on Linux (pagecache_linux.go); the
// controller runs there, other platforms build it for tests.
func writeThrough(f *os.File, off, n int64) error { return nil }

func dropCache(f *os.File, off, n int64) {}
