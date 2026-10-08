package resources

import "testing"

func TestSkillVersionContentAndSDKQueryContract(t *testing.T) {
	for _, op := range []Operation{{Method: "GET", Path: "/v1/skills/skill_one/versions/skver_one/content", RawQuery: "beta=true"}, {Method: "POST", Path: "/v1/skills", RawQuery: "beta=true"}, {Method: "POST", Path: "/v1/skills/skill_one/versions", RawQuery: "beta=true"}, {Method: "GET", Path: "/v1/skills/skill_one/versions", RawQuery: "page=opaque&limit=20&beta=true"}} {
		if _, e := ValidateOperation(op); e != nil {
			t.Fatal(op, e)
		}
	}
	for _, op := range []Operation{{Method: "DELETE", Path: "/v1/skills/skill_one/versions/skver_one/content"}, {Method: "GET", Path: "/v1/skills", RawQuery: "beta=false"}, {Method: "GET", Path: "/v1/skills", RawQuery: "beta=true&beta=true"}, {Method: "GET", Path: "/v1/skills", RawQuery: "workspace_id=another"}, {Method: "GET", Path: "/v1/skills/skill_one/versions/skver_one/content/extra"}, {Method: "GET", Path: "/v1/files", RawQuery: "beta=true"}} {
		if _, e := ValidateOperation(op); e == nil {
			t.Fatal("invalid resource operation", op)
		}
	}
}
