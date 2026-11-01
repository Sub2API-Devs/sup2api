package files

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"testing"
)

// covers: 03§3.3 (image load body written through, 2026-11-01 guard OOM)
func TestCopyWriteThrough(t *testing.T) {
	for _, size := range []int{0, 1, writeThroughSizeForTest - 1, writeThroughSizeForTest, 3*writeThroughSizeForTest + 12345} {
		src := make([]byte, size)
		for i := range src {
			src[i] = byte(i*7 + i/4096)
		}
		f, err := os.Create(filepath.Join(t.TempDir(), "load.part"))
		if err != nil {
			t.Fatal(err)
		}
		n, err := CopyWriteThrough(f, io.LimitReader(bytes.NewReader(src), int64(size)+1))
		if err != nil || n != int64(size) {
			t.Fatalf("size %d: copied %d, %v", size, n, err)
		}
		DropCache(f)
		if _, err := f.Seek(0, io.SeekStart); err != nil {
			t.Fatal(err)
		}
		back, err := io.ReadAll(f)
		f.Close()
		if err != nil || !bytes.Equal(back, src) {
			t.Fatalf("size %d: read back %d bytes, %v", size, len(back), err)
		}
	}
}

// writeThroughSizeForTest is writeThroughStep (Linux only).
const writeThroughSizeForTest = 8 << 20
