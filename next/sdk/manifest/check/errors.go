// Package check holds the static validation of manifest.json: the rules the
// host applies before it installs a plugin package. It is the single
// implementation of those rules, shared by three callers:
//
//   - the host (server/internal/plugin/pkg wraps it and renders the field
//     errors as an invalid_argument core error),
//   - the packaging CLI (sub2api-plugin pack),
//   - a plugin's own unit tests, which can assert that their manifest.json
//     still passes before the manifest reaches a server.
//
// The package depends on the manifest types and the built-in platform
// definitions only, so any module may import it.
package check

import (
	"errors"
	"strings"
)

// FieldError is one validation problem: the manifest field path, a stable
// machine code and a human message. The host renders these verbatim under
// details.fields of an invalid_argument error (CONTRACTS §4), so neither the
// codes nor the field paths may change.
type FieldError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ValidationError collects every problem of one manifest. Validate reports
// all of them together instead of stopping at the first.
type ValidationError struct {
	Fields []FieldError
}

func (e *ValidationError) Error() string {
	parts := make([]string, len(e.Fields))
	for i, f := range e.Fields {
		parts[i] = f.Field + ": " + f.Message
	}
	return "manifest validation failed: " + strings.Join(parts, "; ")
}

// Fields returns the problems of err when it is a *ValidationError.
func Fields(err error) ([]FieldError, bool) {
	var ve *ValidationError
	if errors.As(err, &ve) {
		return ve.Fields, true
	}
	return nil, false
}
