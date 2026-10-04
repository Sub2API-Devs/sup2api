package manifest

import (
	"encoding/json"
	"testing"
	"time"
)

func TestRefreshExpiresAt(t *testing.T) {
	var r *AccountRefresh // nil uses the defaults
	if r.Field() != "expires_at" || r.Before() != 30*time.Minute {
		t.Fatalf("defaults: %s %s", r.Field(), r.Before())
	}
	want := time.Unix(1791147940, 0).UTC()
	for _, v := range []any{float64(1791147940), "1791147940", " 1791147940 ", float64(1791147940123), json.Number("1791147940")} {
		got, ok := r.ExpiresAt(map[string]any{"expires_at": v})
		if !ok || !got.Equal(want) {
			t.Errorf("%#v: %v %v", v, got, ok)
		}
	}
	for _, v := range []any{nil, "", "soon", float64(0), float64(-5), true} {
		if _, ok := r.ExpiresAt(map[string]any{"expires_at": v}); ok {
			t.Errorf("%#v accepted", v)
		}
	}
	custom := &AccountRefresh{ExpiresAtField: "expiry", BeforeExpirySec: 120}
	if _, ok := custom.ExpiresAt(map[string]any{"expires_at": "1791147940"}); ok || custom.Before() != 2*time.Minute {
		t.Fatal("custom field ignored")
	}
}
