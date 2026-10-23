package httpfacts

import (
	"net/http"
	"testing"
)

func TestProviderFactsExcludeSecretsAndHopHeaders(t *testing.T) {
	source := http.Header{"Request-Id": []string{"provider"}, "Retry-After": []string{"4"}, "Anthropic-Ratelimit-Tokens-Remaining": []string{"18"}, "Authorization": []string{"secret"}, "Set-Cookie": []string{"secret"}, "X-Internal-Route": []string{"private"}, "Anthropic-Fast-Input-Tokens-Limit": []string{"100"}, "Connection": []string{"Retry-After"}, "X-Should-Retry": []string{"bad\r\nvalue"}}
	out := Select(source)
	if out.Get("Request-Id") != "provider" || out.Get("Anthropic-Ratelimit-Tokens-Remaining") != "18" || out.Get("Anthropic-Fast-Input-Tokens-Limit") != "100" || len(out) != 3 {
		t.Fatal("unsafe or incomplete provider headers", out)
	}
	source["Request-Id"][0] = "changed"
	if out.Get("Request-Id") != "provider" {
		t.Fatal("aliased source")
	}
}

// A provider cannot relay the gateway's own markers (the native-era CLI quota
// markers and the error source among them).
func TestProviderHeadersCannotRelayNativeQuotaMarkers(t *testing.T) {
	h := http.Header{}
	for name, value := range map[string]string{"x-ccgateway-cli-quota-type": "seven_day_overage_included", "x-ccgateway-cli-quota-reset": "1900000000", "x-ccgateway-cli-status": "429", "x-ccgateway-error-source": "cli", "x-ccgateway-cli-error": "rate_limit", "x-ccgateway-error-scope": "request"} {
		h.Set(name, value)
	}
	h.Set("Request-Id", "req_fixture")
	got := Select(h)
	if len(got) != 1 || got.Get("Request-Id") != "req_fixture" {
		t.Fatalf("provider response leaked internal markers: %v", got)
	}
}
