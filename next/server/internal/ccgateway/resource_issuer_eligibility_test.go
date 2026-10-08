package ccgateway

import (
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestResourceIssuerEligibilityRequiresExactAuthenticatedContract(t *testing.T) {
	for _, tc := range []struct {
		status int
		body   string
		want   bool
	}{
		{503, `{"type":"error","error":{"type":"resource_identity_unsupported"}}`, true},
		{503, `{"type":"error","error":{"type":"api_error","message":"API key resources require managed issuer ID and generation"}}`, false},
		{500, `{"type":"error","error":{"type":"resource_identity_unsupported"}}`, false},
		{503, `{"type":"error","error":{"type":"timeout"}}`, false},
		{503, `invalid`, false},
	} {
		r := &http.Response{StatusCode: tc.status, Body: io.NopCloser(strings.NewReader(tc.body))}
		if got := verifiedMissingResourceIssuer(r); got != tc.want {
			t.Fatalf("status%d contract admitted=%v", tc.status, got)
		}
	}
}
