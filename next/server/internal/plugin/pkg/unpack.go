// Package pkg opens, validates and verifies .s2plugin packages: safe zip
// extraction, full manifest validation (including the capability/permission
// consistency checks), package signatures and publisher trust.
package pkg

import (
	"archive/zip"
	"bytes"
	"fmt"
	"io"
	"io/fs"
	"path"
	"strings"
	"unicode"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Limits bounds what an uploaded archive may expand to.
type Limits struct {
	MaxPackageBytes  int64 // compressed archive size
	MaxUnpackedBytes int64 // sum of uncompressed file sizes
	MaxFiles         int   // number of regular files
}

// Default limits used when a field is zero.
const (
	DefaultMaxPackageBytes  = 200 << 20
	DefaultMaxUnpackedBytes = 1 << 30
	DefaultMaxFiles         = 2000
)

func (l Limits) withDefaults() Limits {
	if l.MaxPackageBytes <= 0 {
		l.MaxPackageBytes = DefaultMaxPackageBytes
	}
	if l.MaxUnpackedBytes <= 0 {
		l.MaxUnpackedBytes = DefaultMaxUnpackedBytes
	}
	if l.MaxFiles <= 0 {
		l.MaxFiles = DefaultMaxFiles
	}
	return l
}

func invalidPackage(msg string) error {
	return core.ErrInvalidArgument.WithMessage("invalid plugin package: " + msg)
}

// Unpack reads a zip archive entirely in memory and returns path -> content.
// It rejects oversize archives, zip bombs, path traversal, absolute paths,
// symlinks and other non-regular entries, encrypted entries and duplicate
// (including case-insensitive duplicate) paths.
func Unpack(data []byte, lim Limits) (map[string][]byte, error) {
	lim = lim.withDefaults()
	if int64(len(data)) > lim.MaxPackageBytes {
		return nil, invalidPackage(fmt.Sprintf("package exceeds %d bytes", lim.MaxPackageBytes))
	}
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, invalidPackage("not a zip archive")
	}
	files := make(map[string][]byte)
	folded := make(map[string]string)
	var total int64
	for _, f := range zr.File {
		mode := f.Mode()
		if mode&fs.ModeSymlink != 0 {
			return nil, invalidPackage(fmt.Sprintf("symlink not allowed: %q", f.Name))
		}
		if f.Flags&0x1 != 0 {
			return nil, invalidPackage(fmt.Sprintf("encrypted entry not allowed: %q", f.Name))
		}
		isDir := mode.IsDir() || strings.HasSuffix(f.Name, "/")
		name, err := cleanPath(strings.TrimSuffix(f.Name, "/"))
		if err != nil {
			return nil, err
		}
		if isDir {
			continue
		}
		if !mode.IsRegular() {
			return nil, invalidPackage(fmt.Sprintf("unsupported entry type: %q", f.Name))
		}
		if _, dup := files[name]; dup {
			return nil, invalidPackage(fmt.Sprintf("duplicate entry: %q", name))
		}
		lower := strings.ToLower(name)
		if prev, dup := folded[lower]; dup {
			return nil, invalidPackage(fmt.Sprintf("entries differ only in case: %q, %q", prev, name))
		}
		folded[lower] = name
		if len(files) >= lim.MaxFiles {
			return nil, invalidPackage(fmt.Sprintf("more than %d files", lim.MaxFiles))
		}
		// Never trust the declared size: read through a limit.
		remaining := lim.MaxUnpackedBytes - total
		rc, err := f.Open()
		if err != nil {
			return nil, invalidPackage(fmt.Sprintf("cannot read %q: %v", name, err))
		}
		b, err := io.ReadAll(io.LimitReader(rc, remaining+1))
		rc.Close()
		if err != nil {
			return nil, invalidPackage(fmt.Sprintf("cannot read %q: %v", name, err))
		}
		total += int64(len(b))
		if total > lim.MaxUnpackedBytes {
			return nil, invalidPackage(fmt.Sprintf("unpacked size exceeds %d bytes", lim.MaxUnpackedBytes))
		}
		files[name] = b
	}
	if len(files) == 0 {
		return nil, invalidPackage("empty archive")
	}
	return files, nil
}

// cleanPath validates a slash-separated relative archive path.
func cleanPath(name string) (string, error) {
	if name == "" {
		return "", invalidPackage("empty entry name")
	}
	if strings.Contains(name, "\\") {
		return "", invalidPackage(fmt.Sprintf("backslash in path: %q", name))
	}
	if strings.HasPrefix(name, "/") || (len(name) >= 2 && name[1] == ':') {
		return "", invalidPackage(fmt.Sprintf("absolute path: %q", name))
	}
	for _, r := range name {
		if unicode.IsControl(r) || r == ':' {
			return "", invalidPackage(fmt.Sprintf("invalid character in path: %q", name))
		}
	}
	for _, seg := range strings.Split(name, "/") {
		if seg == "" || seg == "." || seg == ".." {
			return "", invalidPackage(fmt.Sprintf("invalid path: %q", name))
		}
	}
	if path.Clean(name) != name {
		return "", invalidPackage(fmt.Sprintf("non-canonical path: %q", name))
	}
	return name, nil
}
