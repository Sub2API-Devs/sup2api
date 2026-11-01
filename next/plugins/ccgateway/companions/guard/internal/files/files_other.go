//go:build !linux

package files

import (
	"errors"
	"os"
)

// Root is unsupported off Linux; the stubs only let `go vet` pass on
// developer machines (03 §6.5).
type Root struct{}

var errUnsupported = errors.ErrUnsupported

func OpenRoot(path string) (*Root, error)                                   { return nil, errUnsupported }
func (r *Root) Path() string                                                { return "" }
func (r *Root) Close() error                                                { return errUnsupported }
func (r *Root) WriteReplace(rel []string, d []byte, m uint32, b bool) error { return errUnsupported }
func (r *Root) RewriteInPlace(rel []string, d []byte, m uint32) error       { return errUnsupported }
func (r *Root) ReadFile(rel []string, max int64) ([]byte, error)            { return nil, errUnsupported }
func (r *Root) Mode(rel []string) (uint32, error)                           { return 0, errUnsupported }
func (r *Root) Remove(rel []string) error                                   { return errUnsupported }
func (r *Root) List(rel []string) ([]Entry, error)                          { return nil, errUnsupported }
func (r *Root) EnsureDir(rel []string) error                                { return errUnsupported }
func (r *Root) CreateTemp(rel []string, p, s string) (*os.File, string, error) {
	return nil, "", errUnsupported
}
func (r *Root) FreeBytes() (uint64, error)                          { return 0, errUnsupported }
func (r *Root) VerifyFile(abs string) error                         { return errUnsupported }
func (r *Root) VerifyDir(abs string, allow func(string) bool) error { return errUnsupported }
