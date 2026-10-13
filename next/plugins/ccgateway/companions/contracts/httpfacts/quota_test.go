package httpfacts

import (
	"net/http"
	"testing"
)

func TestNativeQuotaTypesAreExact(t *testing.T) {
	for kind, key := range map[string]string{"five_hour": "5h", "seven_day": "7d", "seven_day_sonnet": "7d_sonnet", "seven_day_overage_included": "7d_fable", "seven_day_opus": "", "Fable": "", "weekly_scoped": "", "seven_day_overage_included ": "", "SEVEN_DAY": "", "": ""} {
		if got := NativeQuotaKey(kind); got != key {
			t.Errorf("%q: got %q, want %q", kind, got, key)
		}
	}
}

func TestProviderHeadersCannotRelayNativeQuotaMarkers(t *testing.T) {
	h := http.Header{}
	for name, value := range map[string]string{NativeQuotaTypeHeader: "seven_day_overage_included", NativeQuotaResetHeader: "1900000000", NativeObservedStatusHeader: "429", "x-ccgateway-error-source": "cli", "x-ccgateway-cli-error": "rate_limit", "x-ccgateway-error-scope": "request"} {
		h.Set(name, value)
	}
	h.Set("Request-Id", "req_fixture")
	got := Select(h)
	if len(got) != 1 || got.Get("Request-Id") != "req_fixture" {
		t.Fatalf("provider response leaked internal markers: %v", got)
	}
}
