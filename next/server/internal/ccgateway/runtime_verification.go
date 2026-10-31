package ccgateway

import (
	"context"
	"errors"
	"net/http"
	"regexp"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// RuntimeVerificationError contains only bounded diagnostic facts, never the
// response body, credential, profile identity or arbitrary upstream message.
// (An AccountRefusalError cause carries the refusal the gateway answers with;
// it is not logged.)
type RuntimeVerificationError struct {
	Stage     string
	Class     string
	Status    int
	RequestID string
	cause     error
}

func (e *RuntimeVerificationError) Error() string { return "Worker runtime verification failed" }
func (e *RuntimeVerificationError) Unwrap() error { return e.cause }

func VerificationStage(stage string, err error) error {
	if err == nil {
		return nil
	}
	switch stage {
	case "requirement", "capabilities", "policy", "identity":
	default:
		stage = "unknown"
	}
	var existing *RuntimeVerificationError
	if errors.As(err, &existing) {
		copy := *existing
		copy.Stage = stage
		return &copy
	}
	class := "verification_failure"
	var typed *core.Error
	switch {
	case errors.Is(err, context.DeadlineExceeded):
		class = "timeout"
	case errors.Is(err, context.Canceled):
		class = "canceled"
	case errors.As(err, &typed) && typed.Code == core.ErrUnsupported.Code:
		class = "unsupported"
	}
	return &RuntimeVerificationError{Stage: stage, Class: class, cause: err}
}

// AccountRefusalError is the Worker relaying the account's own verdict on its
// login while it verifies a resource identity: CC cleared the stored login,
// or the provider refused the token (a 401/403 with a CLI or HTTP source, not
// the Worker's own refusal). The gateway answers it like an upstream error
// response, so the account fails over and the auto-disable rules apply, and
// the body reaches the client as the Worker wrote it (2026-11-01).
type AccountRefusalError struct {
	Status int
	Header http.Header
	Body   []byte
}

func (e *AccountRefusalError) Error() string {
	return "account login refused (" + strconv.Itoa(e.Status) + ")"
}

// accountRefusal reads resp as an AccountRefusalError, or nil when it is not
// one. The body is bounded like an upstream error body.
func accountRefusal(resp *http.Response) *AccountRefusalError {
	if resp.StatusCode != http.StatusUnauthorized && resp.StatusCode != http.StatusForbidden {
		return nil
	}
	source := requestfailure.Source(resp.Header)
	if source == "" || requestfailure.Local(source) {
		return nil
	}
	raw, err := readBounded(resp.Body, 64<<10)
	if err != nil {
		return nil
	}
	return &AccountRefusalError{Status: resp.StatusCode, Header: resp.Header.Clone(), Body: raw}
}

var verificationRequestID = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`)

func verificationHTTPError(stage string, resp *http.Response, class string, cause error) error {
	rid := ""
	values := resp.Header.Values("request-id")
	if len(values) == 1 && verificationRequestID.MatchString(values[0]) {
		rid = values[0]
	}
	if class == "" {
		switch resp.StatusCode {
		case http.StatusUnauthorized, http.StatusForbidden:
			class = "authentication"
		case http.StatusNotFound:
			class = "missing_route"
		default:
			class = "worker_failure"
		}
	}
	return &RuntimeVerificationError{Stage: stage, Class: class, Status: resp.StatusCode, RequestID: rid, cause: cause}
}
