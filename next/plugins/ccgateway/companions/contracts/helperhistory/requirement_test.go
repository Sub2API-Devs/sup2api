package helperhistory

import "testing"

func TestRequirementDecision(t *testing.T) {
	for _, d := range []string{RequirementOrdinary, RequirementNeedsCustody, RequirementDeferToOrdinary} {
		if _, err := DecodeRequirement([]byte(`{"version":1,"decision":"` + d + `"}`)); err != nil {
			t.Fatal(err)
		}
	}
	for _, raw := range []string{`null`, `{}`, `{"version":2,"decision":"ordinary"}`, `{"version":1,"decision":"yes"}`, `{"version":1,"decision":"ordinary","other":true}`, `{"version":1,"version":1,"decision":"ordinary"}`, `{"version":1,"decision":"ordinary"} {}`} {
		if _, err := DecodeRequirement([]byte(raw)); err == nil {
			t.Fatalf("accepted %s", raw)
		}
	}
}
