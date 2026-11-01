// Package errs holds the controller's named failures and how each endpoint
// group answers them (Python common.ERRORS, common.error_answer and the
// *_ERRORS subsets of http_api.py; behaviour H9, H10, H11, H12).
//
// A failure is named when it is (or wraps) an *Error whose Kind is in the
// endpoint group's Set. Everything else, including guard 404/502 answers,
// transport errors and plain Go errors, is answered 503 runtime_unavailable
// and logged with its full chain.
//
// FROZEN: Kind values, the Sets, Answer and the constructors are shared by
// every business package. Change them only through the coordinator.
package errs

import (
	"errors"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"
)

// Kind is one named failure class (one Python exception class).
type Kind uint8

const (
	BadRequest Kind = iota + 1
	InvalidImage
	RuntimeNotFound
	NotDraft
	InvalidCLIProfile
	UnsupportedContainer
	UpgradeInProgress
	ResourceInUse
	OwnershipMismatch
	ImagePullFailed
	DiskQuotaUnavailable
	ContainerChanged
	RuntimeBusy
	ActivationFailed
	kindCount
)

// row is one line of the answer table, in the order of common.ERRORS.
type row struct {
	kind   Kind
	status int
	code   string // empty: the error carries its own code (ActivationFailed)
	name   string // the Python class name, for the failure log line (H11)
}

var table = []row{
	{BadRequest, 400, "invalid_request", "BadRequest"},
	{InvalidImage, 400, "invalid_image", "InvalidImage"},
	{RuntimeNotFound, 404, "not_found", "RuntimeNotFound"},
	{NotDraft, 405, "method_not_allowed", "NotDraft"},
	{InvalidCLIProfile, 409, "cli_profile_unavailable", "InvalidCLIProfile"},
	{UnsupportedContainer, 409, "unsupported_container", "UnsupportedContainer"},
	{UpgradeInProgress, 409, "upgrade_in_progress", "UpgradeInProgress"},
	{ResourceInUse, 409, "resource_in_use", "ResourceInUse"},
	{OwnershipMismatch, 409, "resource_in_use", "OwnershipMismatch"},
	{ImagePullFailed, 503, "image_pull_failed", "ImagePullFailed"},
	{DiskQuotaUnavailable, 503, "disk_quota_unavailable", "DiskQuotaUnavailable"},
	{ContainerChanged, 503, "container_changed", "ContainerChanged"},
	{RuntimeBusy, 503, "runtime_unavailable", "RuntimeBusy"},
	{ActivationFailed, 503, "", "ActivationFailed"},
}

// Unnamed is the answer of every failure outside an endpoint group's set.
const (
	UnnamedStatus = 503
	UnnamedCode   = "runtime_unavailable"
)

// Activation codes (ActivationFailed carries one of them).
const (
	CodeEgressNotReady   = "egress_not_ready"
	CodeProxyCheckFailed = "proxy_check_failed"
)

// Error is a named controller failure.
type Error struct {
	Kind  Kind
	Code  string   // only ActivationFailed: egress_not_ready | proxy_check_failed
	Msg   string   // log text; never sent to the caller
	Names []string // ResourceInUse / OwnershipMismatch: the resource names involved
	Err   error    // cause (may be a *guardapi.Error)
}

func (e *Error) Error() string {
	if e.Msg != "" {
		return e.Msg
	}
	if e.Err != nil {
		return e.Err.Error()
	}
	return e.Kind.String()
}

func (e *Error) Unwrap() error { return e.Err }

// String is the Python exception class name of k.
func (k Kind) String() string {
	for _, r := range table {
		if r.kind == k {
			return r.name
		}
	}
	return "Kind(" + strconv.Itoa(int(k)) + ")"
}

// New is a named failure with a log message.
func New(k Kind, msg string) *Error { return &Error{Kind: k, Msg: msg} }

// Wrap is a named failure caused by err (Python `raise X(msg) from err`).
func Wrap(k Kind, msg string, err error) *Error { return &Error{Kind: k, Msg: msg, Err: err} }

// Activation is ActivationFailed with its own answer code.
func Activation(code, msg string) *Error {
	return &Error{Kind: ActivationFailed, Code: code, Msg: msg}
}

// InUse is ResourceInUse naming the foreign users (sorted, as Python does).
func InUse(names []string) *Error {
	sorted := append([]string(nil), names...)
	sort.Strings(sorted)
	return &Error{Kind: ResourceInUse, Names: sorted, Msg: "runtime resources in use by " + strings.Join(sorted, ", ")}
}

// Mismatch is OwnershipMismatch for the resource called name.
func Mismatch(name string) *Error {
	return &Error{Kind: OwnershipMismatch, Names: []string{name}, Msg: name + ": ownership mismatch (not this runtime's)"}
}

// Set is a set of kinds an endpoint group answers by name.
type Set uint32

// SetOf builds a Set.
func SetOf(kinds ...Kind) Set {
	var s Set
	for _, k := range kinds {
		s |= 1 << k
	}
	return s
}

// Has reports whether k is in s.
func (s Set) Has(k Kind) bool { return s&(1<<k) != 0 }

// All is every kind (error_answer without `named`).
var All = SetOf(BadRequest, InvalidImage, RuntimeNotFound, NotDraft, InvalidCLIProfile, UnsupportedContainer,
	UpgradeInProgress, ResourceInUse, OwnershipMismatch, ImagePullFailed, DiskQuotaUnavailable, ContainerChanged,
	RuntimeBusy, ActivationFailed)

// The endpoint groups of http_api.py (H10).
var (
	Request    = SetOf(BadRequest, NotDraft, ImagePullFailed, InvalidCLIProfile, DiskQuotaUnavailable, ActivationFailed, ResourceInUse, RuntimeBusy)
	Delete     = Request | SetOf(OwnershipMismatch)
	Management = SetOf(BadRequest, InvalidImage, ImagePullFailed, UpgradeInProgress, RuntimeBusy)
	Worker     = SetOf(BadRequest, InvalidImage, RuntimeNotFound, UnsupportedContainer, ImagePullFailed, ContainerChanged, RuntimeBusy)
	Tunnel     = SetOf(BadRequest, RuntimeBusy)
)

// Answer is (status, code, named) for err in an endpoint group: named is
// false for a failure without a table entry in the group (worth the whole
// error chain in the log). The outermost *Error in the chain decides, like
// Python's isinstance on the raised exception.
func Answer(err error, named Set) (status int, code string, known bool) {
	var e *Error
	if errors.As(err, &e) && named.Has(e.Kind) {
		for _, r := range table {
			if r.kind == e.Kind {
				code = r.code
				if code == "" {
					code = e.Code
				}
				return r.status, code, true
			}
		}
	}
	return UnnamedStatus, UnnamedCode, false
}

// KindOf is the kind of the outermost *Error in err's chain, 0 when none.
func KindOf(err error) Kind {
	var e *Error
	if errors.As(err, &e) {
		return e.Kind
	}
	return 0
}

// Is reports whether err is (or wraps) a named failure of kind k.
func Is(err error, k Kind) bool { return k != 0 && KindOf(err) == k }

// FailureText is the tail of a failure log line: the error's type name and
// its message cut to 300 characters (Python common.failure_text).
func FailureText(err error) string {
	if err == nil {
		return ""
	}
	name := "error"
	var e *Error
	if errors.As(err, &e) {
		name = e.Kind.String()
	}
	return name + ": " + truncate(err.Error(), 300)
}

func truncate(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	i := 0
	for pos := range s {
		if i == n {
			return s[:pos]
		}
		i++
	}
	return s
}
