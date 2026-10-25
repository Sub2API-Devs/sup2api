package ccgateway

import (
	"encoding/json"
	"strings"
	"testing"
)

// The health answer keeps the login email a Worker reports only when it is
// one address (CONTRACTS §59); anything else is dropped, not passed on.
func TestAuthStatusKeepsOnlyAnEmailAddress(t *testing.T) {
	base := `{"healthy":true,"logged_in":true,"auth_method":"claude.ai","status_source":"local_snapshot","online_verified":false,"selection_verified":false,"credential_present":true,"credential_sources":["stored_oauth"],"account_email":EMAIL}`
	for email, want := range map[string]string{
		`"ops@example.invalid"`:         "ops@example.invalid",
		`"two words@example.invalid"`:   "",
		`"no-at-sign"`:                  "",
		`"a@b@c"`:                       "",
		`"line\nbreak@example.invalid"`: "",
		`"` + strings.Repeat("x", 65) + `@example.invalid"`: "",
		`7`: "invalid",
	} {
		got, err := safeAuthStatus([]byte(strings.Replace(base, "EMAIL", email, 1)))
		if want == "invalid" {
			if err == nil {
				t.Errorf("accepted account_email %s", email)
			}
			continue
		}
		if err != nil {
			t.Fatalf("%s: %v", email, err)
		}
		raw, _ := json.Marshal(got)
		var result map[string]any
		_ = json.Unmarshal(raw, &result)
		if value, _ := result["account_email"].(string); value != want {
			t.Errorf("account_email %s answered %q", email, value)
		}
	}
	if normalizeEmail(strings.Repeat("a", 64)+"@"+strings.Repeat("b", 256)) != "" {
		t.Error("an over-long domain was kept")
	}
}
