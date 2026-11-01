package auth

import (
	"testing"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/pyreftest"
)

// covers: PV3 RB3 V5 V6 (authentication() and auth_fingerprint() byte for byte)
func TestMatchesPython(t *testing.T) {
	accepted := 0
	for _, c := range pyreftest.Cases(t, "fingerprint.json") {
		raw, err := pyjson.Decode([]byte(pyreftest.Str(c, "raw")))
		if err != nil {
			t.Fatal(err)
		}
		a, err := Parse(raw)
		if want := pyreftest.Str(c, "error"); want != "" {
			if !errs.Is(err, errs.BadRequest) {
				t.Errorf("%s: %s accepted (%v); Python raised %s", c["name"], c["raw"], a, want)
			}
			continue
		}
		if err != nil {
			t.Errorf("%s: %s: %v", c["name"], c["raw"], err)
			continue
		}
		accepted++
		if got := string(pyjson.MustMarshal(a)); got != pyreftest.Str(c, "normalized") {
			t.Errorf("%s: normalized %s, want %s", c["name"], got, c["normalized"])
		}
		for _, f := range c["fingerprints"].([]any) {
			fp := f.(map[string]any)
			if got := Fingerprint(fp["salt"].(string), a); got != fp["fingerprint"] {
				t.Errorf("%s salt %q: %s, want %s", c["name"], fp["salt"], got, fp["fingerprint"])
			}
		}
	}
	if accepted < 8 {
		t.Fatalf("only %d accepted authentications in the vectors", accepted)
	}
}

// covers: V6 (locale and timezone shapes)
func TestEnvironmentValue(t *testing.T) {
	for _, ok := range []string{"", "C", "POSIX", "ja_JP.UTF-8", "en_US@euro", "zh_Hans_CN"} {
		if _, err := EnvironmentValue("locale", ok); err != nil {
			t.Errorf("%q", ok)
		}
	}
	for _, ok := range []string{"", "UTC", "Asia/Tokyo", "Etc/GMT+5", "America/Argentina/Buenos_Aires"} {
		if _, err := EnvironmentValue("timezone", ok); err != nil {
			t.Errorf("%q", ok)
		}
	}
	for key, bad := range map[string]any{"locale": "Local", "timezone": "Local", "x": 5} {
		if _, err := EnvironmentValue(key, bad); err == nil {
			t.Errorf("%s=%v accepted", key, bad)
		}
	}
	if _, err := EnvironmentValue("timezone", nil); err == nil {
		t.Error("None is refused")
	}
}
