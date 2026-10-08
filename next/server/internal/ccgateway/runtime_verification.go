package ccgateway

import (
	"context"
	"errors"
	"net/http"
	"regexp"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// RuntimeVerificationError contains only bounded diagnostic facts, never the
// response body, credential, profile identity or arbitrary upstream message.
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
