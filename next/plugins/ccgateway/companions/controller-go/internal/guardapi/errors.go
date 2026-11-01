package guardapi

import (
	"errors"
	"fmt"
	"strings"

	"ccgateway/controller/internal/errs"
)

// Error is a guard error answer {"error", "reason"?, "message", "names"?}
// (03 §3.3), with the HTTP status and the endpoint (route template) it
// came from. errors.Is matches on Status and Code, and on Reason when the
// target sets one.
type Error struct {
	Status   int
	Code     string
	Reason   string
	Message  string
	Names    []string
	Endpoint string
}

func (e *Error) Error() string {
	var b strings.Builder
	fmt.Fprintf(&b, "guard %s: %d %s", e.Endpoint, e.Status, e.Code)
	if e.Reason != "" {
		b.WriteString("/" + e.Reason)
	}
	if e.Message != "" {
		b.WriteString(": " + e.Message)
	}
	return b.String()
}

// Is matches another *Error on Status and Code (and Reason when set). A
// 503 unavailable answer (the guard is starting) also matches
// ErrUnavailable: the guard could not handle the call yet.
func (e *Error) Is(target error) bool {
	if target == ErrUnavailable {
		return e.Status == 503 && e.Code == CodeUnavailable
	}
	t, ok := target.(*Error)
	if !ok {
		return false
	}
	return e.Status == t.Status && e.Code == t.Code && (t.Reason == "" || e.Reason == t.Reason)
}

// Error codes and reasons of 03 §3.3.
const (
	CodeInvalidRequest   = "invalid_request"
	CodeUnauthorized     = "unauthorized"
	CodeForbidden        = "forbidden"
	CodeNotFound         = "not_found"
	CodeMethodNotAllowed = "method_not_allowed"
	CodeConflict         = "conflict"
	CodeTooLarge         = "too_large"
	CodeUnprocessable    = "unprocessable"
	CodeDockerError      = "docker_error"
	CodeBusy             = "busy"
	CodeDiskQuota        = "disk_quota_unavailable"
	CodeUnavailable      = "unavailable"
	CodeTimeout          = "timeout"

	ReasonControllerUnguarded = "controller_unguarded"
	ReasonImageNotAllowed     = "image_not_allowed"
	ReasonLoadForbidden       = "load_forbidden"
	ReasonImageNotGuarded     = "image_not_guarded"
	ReasonImageNotGateway     = "image_not_gateway"
	ReasonMountSourceRejected = "mount_source_rejected"
	ReasonPolicy              = "policy"

	ReasonContainer = "container"
	ReasonNetwork   = "network"
	ReasonVolume    = "volume"
	ReasonImage     = "image"
	ReasonPath      = "path"
	ReasonGateway   = "gateway"

	ReasonOwnershipMismatch   = "ownership_mismatch"
	ReasonResourceInUse       = "resource_in_use"
	ReasonExists              = "exists"
	ReasonNotRunning          = "not_running"
	ReasonUpgradeInProgress   = "upgrade_in_progress"
	ReasonGatewayNotCompose   = "gateway_not_compose"
	ReasonUplinkMissing       = "uplink_missing"
	ReasonSubnetOverlap       = "subnet_overlap"
	ReasonMountSourceReplaced = "mount_source_replaced"

	ReasonNotRegularFile = "not_regular_file"
	ReasonTooLarge       = "too_large"

	ReasonPullFailed     = "pull_failed"
	ReasonLoadFailed     = "load_failed"
	ReasonHelperFailed   = "helper_failed"
	ReasonJobFailed      = "job_failed"
	ReasonOutputTooLarge = "output_too_large"
	ReasonComposeFailed  = "compose_failed"

	ReasonLockTimeout = "lock_timeout"
	ReasonStarting    = "starting"

	ReasonExecTimeout = "exec_timeout"
	ReasonJobTimeout  = "job_timeout"
)

// Sentinels for errors.Is.
var (
	// ErrNotFound is any 404: the object does not exist (docker.errors.NotFound).
	// It is never turned into errs.RuntimeNotFound automatically: leaked to
	// the HTTP layer it is an unnamed 503, as in Python.
	ErrNotFound = &Error{Status: 404, Code: CodeNotFound}
	// ErrNotRunning is 409 not_running (exec, top, firewall on a stopped container).
	ErrNotRunning = &Error{Status: 409, Code: CodeConflict, Reason: ReasonNotRunning}
	// ErrExists is 409 exists (network, app, gateway attachment).
	ErrExists = &Error{Status: 409, Code: CodeConflict, Reason: ReasonExists}
	// ErrSubnetOverlap is 409 subnet_overlap: re-read the subnets, allocate again.
	ErrSubnetOverlap = &Error{Status: 409, Code: CodeConflict, Reason: ReasonSubnetOverlap}
	// ErrUplinkMissing is 409 uplink_missing: ensure again with an uplink.
	ErrUplinkMissing = &Error{Status: 409, Code: CodeConflict, Reason: ReasonUplinkMissing}
	// ErrUnauthorized is 401: wrong source address or token.
	ErrUnauthorized = &Error{Status: 401, Code: CodeUnauthorized}
	// ErrUnguarded is 403 controller_unguarded: the network layer was bypassed.
	ErrUnguarded = &Error{Status: 403, Code: CodeForbidden, Reason: ReasonControllerUnguarded}
	// ErrLoadForbidden is 403 load_forbidden (uploads answers 400 load_forbidden).
	ErrLoadForbidden = &Error{Status: 403, Code: CodeForbidden, Reason: ReasonLoadForbidden}
	// ErrNotRegularFile and ErrFileTooLarge are the 422 answers of images/file.
	ErrNotRegularFile = &Error{Status: 422, Code: CodeUnprocessable, Reason: ReasonNotRegularFile}
	ErrFileTooLarge   = &Error{Status: 422, Code: CodeUnprocessable, Reason: ReasonTooLarge}
	// ErrStarting is 503 unavailable/starting: the guard is still starting
	// (it also matches ErrUnavailable).
	ErrStarting = &Error{Status: 503, Code: CodeUnavailable, Reason: ReasonStarting}
	// ErrMountRejected is 403 mount_source_rejected (resolv.conf or
	// shared-egress/ is not a plain file or directory the guard wrote, or
	// the container's mounts are not the expected ones).
	ErrMountRejected = &Error{Status: 403, Code: CodeForbidden, Reason: ReasonMountSourceRejected}
	// ErrMountReplaced is 409 mount_source_replaced of PUT resolv: the file
	// was rewritten as a new inode; the running container must be recreated.
	ErrMountReplaced = &Error{Status: 409, Code: CodeConflict, Reason: ReasonMountSourceReplaced}
)

// ErrUnavailable matches every transport failure (connection refused,
// timeout, malformed answer): the guard could not be asked.
var ErrUnavailable = errors.New("guard unavailable")

// TransportError is a failed exchange with the guard.
type TransportError struct {
	Endpoint string
	Err      error
}

func (e *TransportError) Error() string { return "guard " + e.Endpoint + ": " + e.Err.Error() }
func (e *TransportError) Unwrap() error { return e.Err }
func (e *TransportError) Is(target error) bool {
	return target == ErrUnavailable
}

// IsNotFound reports a guard 404.
func IsNotFound(err error) bool { return errors.Is(err, ErrNotFound) }

// ReasonOf is the guard error reason in err's chain ("" when none).
func ReasonOf(err error) string {
	var e *Error
	if errors.As(err, &e) {
		return e.Reason
	}
	return ""
}

// AsError is the *Error in err's chain, if any.
func AsError(err error) (*Error, bool) {
	var e *Error
	ok := errors.As(err, &e)
	return e, ok
}

// classify maps a guard error answer to the controller's named failures
// (02 §5.3). Unmapped answers stay *Error (unnamed: 503 runtime_unavailable).
func classify(e *Error) error {
	switch {
	case e.Status == 409 && e.Reason == ReasonOwnershipMismatch:
		name := ""
		if len(e.Names) > 0 {
			name = e.Names[0]
		}
		m := errs.Mismatch(name)
		m.Names = append([]string(nil), e.Names...)
		m.Err = e
		return m
	case e.Status == 409 && e.Reason == ReasonResourceInUse:
		u := errs.InUse(e.Names)
		u.Err = e
		return u
	case e.Status == 409 && e.Reason == ReasonUpgradeInProgress:
		return errs.Wrap(errs.UpgradeInProgress, "controller upgrade or gateway recreation in progress", e)
	case e.Status == 503 && e.Code == CodeDiskQuota:
		return errs.Wrap(errs.DiskQuotaUnavailable, "Docker data volumes do not support disk quotas", e)
	case e.Status == 503 && e.Code == CodeBusy:
		return errs.Wrap(errs.RuntimeBusy, "guard is busy", e)
	}
	return e
}
