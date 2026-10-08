package gateway

import (
	"bytes"
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	"testing"
)

type reviewObservedSkills struct {
	core.SkillResources
	version core.SkillVersion
}

func (s reviewObservedSkills) FindObservedVersion(context.Context, core.ResourceOwner, string, string) (core.SkillVersion, error) {
	return s.version, nil
}
func TestReviewSkillOutputCannotChangeFrozenVersion(t *testing.T) {
	e, _, _ := resourceTestEnv(t)
	p := e.auth.keys[testKey]
	binding := core.ResourceBinding{AccountID: 1, PrincipalID: "issuer", Generation: "v1"}
	parent := core.ProviderResource{PublicID: "skill_public", RemoteID: "skill_remote", Kind: "skill", PluginKey: "ccgateway", State: "ready", Owner: core.ResourceOwner{UserID: p.UserID, GroupID: p.Group.ID}, Binding: binding}
	first := core.SkillVersion{Parent: parent, State: "ready", PublicVersionID: "version_public_a", RemoteVersionID: "version_remote_a", LegacyEpoch: "111"}
	second := first
	second.PublicVersionID = "version_public_b"
	second.RemoteVersionID = "version_remote_b"
	second.LegacyEpoch = "222"
	e.gw.d.Skills = reviewObservedSkills{version: second}
	gc, _ := gin.CreateTestContext(httptest.NewRecorder())
	gc.Request = httptest.NewRequest("POST", "/v1/messages", nil)
	c := &call{g: e.gw, c: gc, principal: p, resourceAccess: &modelResourceAccess{binding: binding, outputs: true}, resourceVersions: []approvedSkillVersion{{version: first, wireVersion: first.RemoteVersionID}}}
	raw := []byte(`{"type":"message","container":{"id":"container_public","skills":[{"type":"custom","skill_id":"skill_public","version":"version_remote_b"}]},"content":[]}`)
	if _, err := c.rewriteResourceSkillVersions(context.Background(), raw); err == nil {
		t.Fatal("provider replaced explicitly frozen skill A with another registered skill version B")
	}
}

type reviewUploadEvidenceStore struct {
	*memorySkills
	observed *core.SkillUploadEvidence
}

func (s *reviewUploadEvidenceStore) MarkSkillUpload(ctx context.Context, in core.SkillUploadFailure) error {
	s.observed = in.Evidence
	return s.memorySkills.MarkSkillUpload(ctx, in)
}
func TestReviewSkillsUploadMetadataFailureRetainsObservedIDs(t *testing.T) {
	e, s, tr := skillsTestEnv(t)
	record := &reviewUploadEvidenceStore{memorySkills: s}
	e.gw.d.Skills = record
	tr.fn = func(r *http.Request) (*http.Response, error) {
		if r.Method == "POST" {
			return resourceTestResponse(200, skillTestParent()), nil
		}
		return resourceTestResponse(503, `{"type":"error","error":{"type":"overloaded_error"}}`), nil
	}
	raw, ct := skillMultipart(t, "files", "package/SKILL.md", []byte("fixture"))
	status, reply := fileRequest(t, e, "POST", "/v1/skills", testKey, "", raw, ct)
	if status != 503 || bytes.Contains(reply, []byte("remote_secret")) {
		t.Fatalf("HTTP%d %s", status, reply)
	}
	if record.observed == nil || record.observed.RemoteSkillID != "skill_remote_secret" || record.observed.RemoteVersionID != "skver_remote_secret" || record.observed.SourceRequestID == "" {
		t.Fatalf("observed facts lost: %+v", record.observed)
	}
	for _, version := range s.versions {
		if version.State != "uncertain" {
			t.Fatal("provider POST was retried or granted ready")
		}
	}
	if tr.calls != 2 {
		t.Fatal("upload retried", tr.calls)
	}
}
