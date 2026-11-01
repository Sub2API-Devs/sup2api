// Package apierr is the guard's error model (03 §3.3): a status code, an
// error code, an optional reason and a fixed English message. Messages
// never carry Docker's text, paths, environment values or command output.
package apierr

import (
	"errors"
	"fmt"
	"net/http"
)

// Error codes.
const (
	CodeInvalid      = "invalid_request"
	CodeUnauthorized = "unauthorized"
	CodeForbidden    = "forbidden"
	CodeNotFound     = "not_found"
	CodeMethod       = "method_not_allowed"
	CodeConflict     = "conflict"
	CodeTooLarge     = "too_large"
	CodeUnprocess    = "unprocessable"
	CodeDocker       = "docker_error"
	CodeBusy         = "busy"
	CodeQuota        = "disk_quota_unavailable"
	CodeUnavailable  = "unavailable"
	CodeTimeout      = "timeout"
)

// Error is an API error.
type Error struct {
	Status  int
	Code    string
	Reason  string
	Message string
	Names   []string
}

func (e *Error) Error() string {
	if e.Reason != "" {
		return fmt.Sprintf("%d %s/%s: %s", e.Status, e.Code, e.Reason, e.Message)
	}
	return fmt.Sprintf("%d %s: %s", e.Status, e.Code, e.Message)
}

// With returns a copy carrying resource names.
func (e *Error) With(names ...string) *Error {
	c := *e
	c.Names = append([]string(nil), names...)
	return &c
}

// As extracts an *Error.
func As(err error) (*Error, bool) {
	var e *Error
	ok := errors.As(err, &e)
	return e, ok
}

func Invalid(msg string) *Error { return &Error{Status: 400, Code: CodeInvalid, Message: msg} }
func Forbidden(reason, msg string) *Error {
	return &Error{Status: 403, Code: CodeForbidden, Reason: reason, Message: msg}
}
func NotFound(reason, msg string) *Error {
	return &Error{Status: 404, Code: CodeNotFound, Reason: reason, Message: msg}
}
func Conflict(reason, msg string) *Error {
	return &Error{Status: 409, Code: CodeConflict, Reason: reason, Message: msg}
}
func Docker(reason, msg string) *Error {
	return &Error{Status: 502, Code: CodeDocker, Reason: reason, Message: msg}
}
func Timeout(reason, msg string) *Error {
	return &Error{Status: 504, Code: CodeTimeout, Reason: reason, Message: msg}
}
func Busy(reason, msg string) *Error {
	return &Error{Status: 503, Code: CodeBusy, Reason: reason, Message: msg}
}
func TooLarge(msg string) *Error {
	return &Error{Status: http.StatusRequestEntityTooLarge, Code: CodeTooLarge, Message: msg}
}
func Unprocessable(reason, msg string) *Error {
	return &Error{Status: 422, Code: CodeUnprocess, Reason: reason, Message: msg}
}

var (
	ErrUnauthorized = &Error{Status: 401, Code: CodeUnauthorized, Message: "unauthorized"}
	ErrUnguarded    = Forbidden("controller_unguarded", "the control network endpoint is not the compose controller")
	ErrMethod       = &Error{Status: 405, Code: CodeMethod, Message: "method not allowed"}
	ErrStarting     = &Error{Status: 503, Code: CodeUnavailable, Reason: "starting", Message: "guard is starting"}
	ErrLockTimeout  = Busy("lock_timeout", "resource is busy")
	ErrBusy         = &Error{Status: 503, Code: CodeBusy, Message: "guard is busy"}
	ErrQuota        = &Error{Status: 503, Code: CodeQuota, Message: "storage does not support volume quotas"}
	ErrDocker       = &Error{Status: 502, Code: CodeDocker, Message: "docker request failed"}
	ErrInternal     = &Error{Status: 502, Code: CodeDocker, Message: "internal error"}
)
