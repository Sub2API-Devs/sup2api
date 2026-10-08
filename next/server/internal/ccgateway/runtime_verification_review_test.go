package ccgateway

import (
	"errors"
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type forbiddenVerificationBody struct{ t *testing.T }

func (r forbiddenVerificationBody) Read([]byte) (int, error) {
	r.t.Fatal("diagnostic wrapper reread provider body")
	return 0, nil
}
func (r forbiddenVerificationBody) Close() error { return nil }

func TestReviewVerificationWrappingDoesNotReadOrReclassifyBody(t *testing.T) {
	for _, status := range []int{400, 401, 404, 503} {
		response := &http.Response{StatusCode: status, Header: http.Header{"Request-Id": []string{"one", "two"}}, Body: forbiddenVerificationBody{t}}
		cause := core.ErrUnavailable.WithMessage("SECRET_BODY resource_identity_unsupported")
		err := verificationHTTPError("identity", response, "", cause)
		var original *core.Error
		if !errors.As(err, &original) || original.Code != core.ErrUnavailable.Code {
			t.Fatal("message text granted unsupported eligibility")
		}
		wrapped := VerificationStage("SECRET_INVALID_STAGE", err).(*RuntimeVerificationError)
		if wrapped.Stage != "unknown" || wrapped.RequestID != "" || wrapped.Status != status || wrapped.Error() != "Worker runtime verification failed" {
			t.Fatal("unsafe or lost diagnostic facts")
		}
	}
}
