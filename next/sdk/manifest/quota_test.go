package manifest

import (
	"net/http"
	"testing"
	"time"
)

// Anthropic's unified rate-limit headers, as sub2api samples them
// (backend/internal/service/ratelimit_service.go samplePassiveUsageFromHeaders):
// utilization is a 0-1 ratio, reset is Unix seconds.
func TestReadQuotaHeadersAnthropic(t *testing.T) {
	now := time.Unix(1_790_000_000, 0)
	decls := []QuotaHeader{
		{Key: "5h", Utilization: "anthropic-ratelimit-unified-5h-utilization",
			Reset: "anthropic-ratelimit-unified-5h-reset", Status: "anthropic-ratelimit-unified-5h-status"},
		{Key: "7d", Utilization: "anthropic-ratelimit-unified-7d-utilization",
			Reset: "anthropic-ratelimit-unified-7d-reset", Status: "anthropic-ratelimit-unified-7d-status"},
		{Key: "7d_fable", Utilization: "anthropic-ratelimit-unified-7d_oi-utilization",
			Reset: "anthropic-ratelimit-unified-7d_oi-reset", Status: "anthropic-ratelimit-unified-7d_oi-status"},
	}
	h := http.Header{}
	h.Set("Anthropic-Ratelimit-Unified-5h-Utilization", "0.42")
	h.Set("anthropic-ratelimit-unified-5h-reset", "1790003600")
	h.Set("anthropic-ratelimit-unified-5h-status", "Allowed_Warning")
	// Milliseconds are detected.
	h.Set("anthropic-ratelimit-unified-7d-reset", "1790500000000")
	h.Set("anthropic-ratelimit-unified-7d-status", "rejected")
	got := ReadQuotaHeaders(decls, h.Get, now)
	if len(got) != 2 {
		t.Fatalf("got %d windows, want 2 (7d_fable has no headers): %+v", len(got), got)
	}
	w := got[0]
	if w.Key != "5h" || w.Utilization < 41.99 || w.Utilization > 42.01 || w.Status != QuotaAllowedWarning ||
		w.ResetsAt == nil || w.ResetsAt.Unix() != 1790003600 {
		t.Fatalf("5h = %+v", w)
	}
	w = got[1]
	if w.Key != "7d" || w.Utilization != 0 || w.Status != QuotaRejected || w.ResetsAt == nil || w.ResetsAt.Unix() != 1790500000 {
		t.Fatalf("7d = %+v", w)
	}
}

func TestReadQuotaHeadersFormats(t *testing.T) {
	now := time.Date(2026, 10, 5, 12, 0, 0, 0, time.UTC)
	decls := []QuotaHeader{
		{Key: "day", Utilization: "x-used", UtilizationUnit: QuotaUnitPercent, Reset: "x-reset", ResetFormat: QuotaResetRFC3339},
		{Key: "min", Reset: "x-retry", ResetFormat: QuotaResetDelta, Status: "x-state"},
		{Key: "bad", Utilization: "x-bad", Reset: "x-bad-reset"},
	}
	h := http.Header{}
	h.Set("x-used", "87.5%")
	h.Set("x-reset", "2026-10-06T00:00:00Z")
	h.Set("x-retry", "30")
	h.Set("x-state", "throttled")
	h.Set("x-bad", "-1")
	h.Set("x-bad-reset", "soon")
	got := ReadQuotaHeaders(decls, h.Get, now)
	if len(got) != 2 {
		t.Fatalf("got %+v", got)
	}
	if got[0].Utilization != 87.5 || !got[0].ResetsAt.Equal(time.Date(2026, 10, 6, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("day = %+v", got[0])
	}
	// An unknown status value is recorded as unknown, but still counts as
	// the window being present.
	if got[1].Status != "" || !got[1].ResetsAt.Equal(now.Add(30*time.Second)) {
		t.Fatalf("min = %+v", got[1])
	}
}
