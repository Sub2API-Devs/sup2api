package ccgateway

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestRuntimeVerificationFactsDoNotExposeCause(t *testing.T) {
	for _, tc := range []struct {
		stage string
		err   error
		class string
	}{
		{"identity", context.DeadlineExceeded, "timeout"},
		{"capabilities", context.Canceled, "canceled"},
		{"policy", errors.New("SECRET_PROFILE_TOKEN"), "verification_failure"},
		{"identity", core.ErrUnsupported, "unsupported"},
	} {
		err := VerificationStage(tc.stage, tc.err)
		var e *RuntimeVerificationError
		if !errors.As(err, &e) || e.Stage != tc.stage || e.Class != tc.class || strings.Contains(err.Error(), "SECRET") {
			t.Fatalf("unexpected safe classification: %+v", e)
		}
		if !errors.Is(err, tc.err) {
			t.Fatal("lost internal cause/eligibility")
		}
	}
}

func TestRuntimeVerificationResponseFacts(t *testing.T) {
	for _, tc := range []struct {
		status int
		ids    []string
		want   string
	}{
		{404, []string{"worker-123"}, "worker-123"},
		{401, nil, ""}, {503, []string{"first", "second"}, ""},
		{500, []string{"line\nsecret"}, ""}, {503, []string{strings.Repeat("a", 129)}, ""},
	} {
		resp := &http.Response{StatusCode: tc.status, Header: http.Header{"Request-Id": tc.ids}}
		e := verificationHTTPError("identity", resp, "", errors.New("SECRET_BODY")).(*RuntimeVerificationError)
		if e.RequestID != tc.want || e.Status != tc.status || strings.Contains(e.Error(), "SECRET") {
			t.Fatal("unsafe response facts")
		}
		copy := VerificationStage("capabilities", e).(*RuntimeVerificationError)
		if copy.Stage != "capabilities" || copy.Status != tc.status || e.Stage != "identity" {
			t.Fatal("stage mutation")
		}
	}
}

func TestRuntimeVerificationIssuerEligibilityStillExact(t *testing.T) {
	for _, tc := range []struct {
		status int
		raw    string
		want   bool
	}{
		{503, `{"type":"error","error":{"type":"resource_identity_unsupported","message":"SECRET"}}`, true},
		{400, `{"type":"error","error":{"type":"resource_identity_unsupported"}}`, false},
		{503, `{"type":"error","error":{"type":"api_error","message":"resource_identity_unsupported"}}`, false},
		{503, strings.Repeat(" ", 8193), false},
	} {
		resp := &http.Response{StatusCode: tc.status, Body: io.NopCloser(strings.NewReader(tc.raw))}
		if verifiedMissingResourceIssuer(resp) != tc.want {
			t.Fatal("issuer qualification changed")
		}
		if tc.want {
			e := verificationHTTPError("identity", resp, "issuer_unsupported", core.ErrUnsupported)
			var coreErr *core.Error
			if !errors.As(e, &coreErr) || coreErr.Code != core.ErrUnsupported.Code {
				t.Fatal("lost exact unsupported")
			}
		}
	}
}
