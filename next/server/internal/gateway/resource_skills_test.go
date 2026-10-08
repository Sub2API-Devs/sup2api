package gateway

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type memorySkills struct {
	core.SkillResources
	resources *memoryResourceStore
	versions  map[string]core.SkillVersion
	seq       int
}

func (s *memorySkills) ReserveSkillUpload(_ context.Context, in core.SkillUploadIntent) (core.SkillUploadReservation, error) {
	s.seq++
	id := in.ParentID
	p := s.resources.rows[id]
	if id == "" {
		id = fmt.Sprintf("skill_local_%d", s.seq)
		p = core.ProviderResource{PublicID: id, PluginKey: "ccgateway", Kind: "skill", Owner: in.Owner, Binding: in.Binding, State: "pending"}
		s.resources.rows[id] = p
	}
	v := core.SkillVersion{PublicVersionID: fmt.Sprintf("version_local_%d", s.seq), Parent: p, State: "pending", OperationID: "operation", Bytes: in.Bytes}
	s.versions[v.PublicVersionID] = v
	return core.SkillUploadReservation{Parent: p, Version: v, Dispatch: true}, nil
}
func (s *memorySkills) CompleteSkillUpload(_ context.Context, c core.SkillUploadCompletion) (core.SkillUploadReservation, error) {
	p := s.resources.rows[c.ParentID]
	p.RemoteID = c.RemoteSkillID
	p.State = "ready"
	if len(c.ParentMetadata) > 0 {
		p.Metadata = c.ParentMetadata
	}
	s.resources.rows[p.PublicID] = p
	v := s.versions[c.PublicVersionID]
	v.Parent = p
	v.RemoteVersionID = c.RemoteVersionID
	v.LegacyEpoch = c.LegacyEpoch
	v.State = "ready"
	v.Metadata = c.VersionMetadata
	v.CreatedAt = c.CreatedAt
	s.versions[v.PublicVersionID] = v
	return core.SkillUploadReservation{Parent: p, Version: v}, nil
}
func (s *memorySkills) MarkSkillUpload(_ context.Context, f core.SkillUploadFailure) error {
	v := s.versions[f.PublicVersionID]
	v.State = "uncertain"
	if f.Outcome == "rejected" {
		v.State = "failed"
	}
	s.versions[v.PublicVersionID] = v
	return nil
}
func (s *memorySkills) FindVersion(_ context.Context, o core.ResourceOwner, parent, selector string) (core.SkillVersion, error) {
	var found core.SkillVersion
	for _, v := range s.versions {
		p := s.resources.rows[parent]
		if v.Parent.PublicID != parent || p.Owner != o || p.State != "ready" || v.State != "ready" {
			continue
		}
		if selector == v.PublicVersionID || selector == v.LegacyEpoch {
			return v, nil
		}
		if selector == "latest" && (found.PublicVersionID == "" || v.CreatedAt.After(found.CreatedAt)) {
			found = v
		}
	}
	if found.PublicVersionID == "" {
		return found, core.ErrNotFound
	}
	return found, nil
}
func (s *memorySkills) ListSkills(ctx context.Context, o core.ResourceOwner, accounts []int64, after string, limit int) (core.ResourcePage, error) {
	page, e := s.resources.Query(ctx, o, core.ResourceQuery{AccountIDs: accounts, AfterID: after, Limit: limit, Kind: "skill"})
	if e != nil {
		return page, e
	}
	sort.Slice(page.Items, func(i, j int) bool { return page.Items[i].PublicID > page.Items[j].PublicID })
	if after != "" {
		filtered := page.Items[:0]
		for _, p := range page.Items {
			if p.PublicID < after {
				filtered = append(filtered, p)
			}
		}
		page.Items = filtered
	}
	page.HasMore = len(page.Items) > limit
	if page.HasMore {
		page.Items = page.Items[:limit]
	}
	return page, nil
}
func (s *memorySkills) ListSkillVersions(_ context.Context, o core.ResourceOwner, p, after string, limit int) (core.SkillVersionPage, error) {
	out := core.SkillVersionPage{}
	for _, v := range s.versions {
		if v.Parent.PublicID == p && v.Parent.Owner == o && v.State == "ready" {
			out.Items = append(out.Items, v)
		}
	}
	sort.Slice(out.Items, func(i, j int) bool { return out.Items[i].CreatedAt.After(out.Items[j].CreatedAt) })
	return out, nil
}
func (s *memorySkills) BeginSkillDelete(_ context.Context, o core.ResourceOwner, p, v string) (core.SkillDeleteIntent, error) {
	parent := s.resources.rows[p]
	out := core.SkillDeleteIntent{Parent: parent, OperationID: "delete", Dispatch: true}
	if v != "" {
		row := s.versions[v]
		out.Version = &row
	} else {
		parent.State = "deleting"
		s.resources.rows[p] = parent
	}
	return out, nil
}
func (s *memorySkills) FinishSkillDelete(_ context.Context, c core.SkillDeleteCompletion) error {
	state := "delete_uncertain"
	if c.Outcome == "deleted" {
		state = "deleted"
	}
	if c.Outcome == "rejected" {
		state = "ready"
	}
	if c.PublicVersionID != "" {
		v := s.versions[c.PublicVersionID]
		v.State = state
		s.versions[c.PublicVersionID] = v
	} else {
		p := s.resources.rows[c.ParentID]
		p.State = state
		s.resources.rows[c.ParentID] = p
	}
	return nil
}
func skillMultipart(t *testing.T, field, name string, data []byte) ([]byte, string) {
	t.Helper()
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	p, e := w.CreateFormFile(field, name)
	if e != nil {
		t.Fatal(e)
	}
	_, _ = p.Write(data)
	_ = w.Close()
	return b.Bytes(), w.FormDataContentType()
}
func skillTestParent() string {
	return `{"id":"skill_remote_secret","type":"skill","source":{"type":"custom"},"display_name":"test","latest_version_id":"skver_remote_secret","created_at":"2026-10-08T00:00:00Z","updated_at":"2026-10-08T00:00:00Z"}`
}
func skillTestVersion() string {
	return `{"id":"skver_remote_secret","type":"skill_version","skill_id":"skill_remote_secret","name":"test","description":"test","created_at":"2026-10-08T00:00:00Z"}`
}
func skillsTestEnv(t *testing.T) (*env, *memorySkills, *fakeResourceTransport) {
	e, resources, tr := resourceTestEnv(t)
	s := &memorySkills{resources: resources, versions: map[string]core.SkillVersion{}}
	e.gw.d.Skills = s
	tr.fn = func(r *http.Request) (*http.Response, error) {
		if strings.HasSuffix(r.URL.Path, "/content") {
			return resourceTestResponse(200, "zip-bytes"), nil
		}
		if r.Method == "DELETE" {
			if strings.Contains(r.URL.Path, "/versions/") {
				return resourceTestResponse(200, `{"id":"skver_remote_secret","type":"skill_version_deleted"}`), nil
			}
			return resourceTestResponse(200, `{"id":"skill_remote_secret","type":"skill_deleted"}`), nil
		}
		if strings.Contains(r.URL.Path, "/versions") {
			return resourceTestResponse(200, skillTestVersion()), nil
		}
		return resourceTestResponse(200, skillTestParent()), nil
	}
	return e, s, tr
}

func TestSkillsHTTPUploadVersionsACLAndIssuer(t *testing.T) {
	e, s, tr := skillsTestEnv(t)
	body, ct := skillMultipart(t, "files", "package/SKILL.md", []byte("---\nname: test\n---\ntest"))
	original := tr.fn
	tr.fn = func(r *http.Request) (*http.Response, error) {
		if r.Method == "POST" {
			got, _ := io.ReadAll(r.Body)
			if !bytes.Equal(got, body) {
				t.Error("multipart body changed")
			}
		}
		return original(r)
	}
	status, raw := fileRequest(t, e, "POST", "/v1/skills?beta=true", testKey, "", body, ct)
	if status != 200 || bytes.Contains(raw, []byte("remote_secret")) {
		t.Fatalf("create=%d %s", status, raw)
	}
	var m map[string]any
	_ = json.Unmarshal(raw, &m)
	id := m["id"].(string)
	version := m["latest_version_id"].(string)
	if tr.calls != 2 || len(s.versions) != 1 {
		t.Fatal("initial version not verified", tr.calls)
	}
	for _, path := range []string{"/v1/skills/" + id, "/v1/skills/" + id + "/versions/" + version, "/v1/skills/" + id + "/versions/latest", "/v1/skills/" + id + "/versions", "/v1/skills?source=custom"} {
		status, raw = fileRequest(t, e, "GET", path, testKey, "", nil, "")
		if status != 200 || bytes.Contains(raw, []byte("remote_secret")) {
			t.Fatalf("read %s=%d %s", path, status, raw)
		}
	}
	e.auth.keys["other"] = &core.APIKeyPrincipal{UserID: testUser + 1, Group: core.GroupInfo{ID: testGroup}, UserMaxConcurrency: 3}
	before := tr.calls
	for _, path := range []string{"/v1/skills/" + id, "/v1/skills/" + id + "/versions/" + version, "/v1/skills/skill_remote_secret"} {
		status, _ = fileRequest(t, e, "GET", path, "other", "", nil, "")
		if status != 404 || tr.calls != before {
			t.Fatal("cross-owner dispatch", status)
		}
	}
	tr.generation = "new-issuer"
	status, _ = fileRequest(t, e, "GET", "/v1/skills/"+id, testKey, "", nil, "")
	if status != 409 || tr.calls != before {
		t.Fatal("issuer mutation bypass", status)
	}
	tr.generation = "v1"
	status, raw = fileRequest(t, e, "GET", "/v1/skills/"+id+"/versions/"+version+"/content", testKey, "", nil, "")
	if status != 200 || string(raw) != "zip-bytes" {
		t.Fatal("binary download", status, string(raw))
	}
	status, raw = fileRequest(t, e, "DELETE", "/v1/skills/"+id, testKey, "", nil, "")
	if status != 200 || s.resources.rows[id].State != "deleted" {
		t.Fatalf("delete %d %s", status, raw)
	}
}
func TestSkillsHTTPUnknownUploadIsNotRetried(t *testing.T) {
	for _, mode := range []string{"timeout", "invalid", "initial_version_failure"} {
		t.Run(mode, func(t *testing.T) {
			e, s, tr := skillsTestEnv(t)
			original := tr.fn
			tr.fn = func(r *http.Request) (*http.Response, error) {
				if mode == "timeout" {
					return nil, fmt.Errorf("lost connection")
				}
				if mode == "invalid" {
					return resourceTestResponse(200, `{"id":"unexpected"}`), nil
				}
				if r.Method == "GET" {
					return resourceTestResponse(503, `{"type":"error","error":{"type":"api_error","message":"unavailable"}}`), nil
				}
				return original(r)
			}
			body, ct := skillMultipart(t, "files", "SKILL.md", []byte("test"))
			status, _ := fileRequest(t, e, "POST", "/v1/skills", testKey, "", body, ct)
			if status < 500 {
				t.Fatal("unknown mutation became success", status)
			}
			for _, v := range s.versions {
				if v.State != "uncertain" {
					t.Fatal("unknown outcome discarded")
				}
			}
			expected := 1
			if mode == "initial_version_failure" {
				expected = 2
			}
			if tr.calls != expected {
				t.Fatal("unsafe retry", tr.calls)
			}
		})
	}
}
func TestSkillsSpoolArchiveBoundAndExactBody(t *testing.T) {
	var compressed bytes.Buffer
	zw := zip.NewWriter(&compressed)
	entry, _ := zw.Create("package/SKILL.md")
	_, _ = entry.Write(bytes.Repeat([]byte("x"), int(skillPackageLimit)+1))
	_ = zw.Close()
	body, ct := skillMultipart(t, "files", "package.zip", compressed.Bytes())
	r := httptest.NewRequest("POST", "/v1/skills", bytes.NewReader(body))
	r.Header.Set("Content-Type", ct)
	if u, e := spoolSkillUpload(r, false); e == nil {
		u.close()
		t.Fatal("compressed oversized skill admitted")
	}
	for _, test := range []struct {
		field, name string
		data        []byte
		valid       bool
	}{{"files", "SKILL.md", []byte("test"), true}, {"files[]", "nested/SKILL.md", []byte("test"), true}, {"file", "SKILL.md", []byte("test"), false}, {"files", "broken.zip", []byte("badzip"), false}} {
		body, ct := skillMultipart(t, test.field, test.name, test.data)
		r := httptest.NewRequest("POST", "/v1/skills", bytes.NewReader(body))
		r.Header.Set("Content-Type", ct)
		u, e := spoolSkillUpload(r, false)
		if (e == nil) != test.valid {
			t.Fatal(test, e)
		}
		if e == nil {
			got, _ := io.ReadAll(u.file)
			u.close()
			if !bytes.Equal(got, body) {
				t.Fatal("multipart spool changed data")
			}
		}
	}
}
func TestSkillsCatalogCannotLeakWorkspaceCustomSkills(t *testing.T) {
	e, _, tr := skillsTestEnv(t)
	tr.fn = func(r *http.Request) (*http.Response, error) {
		if r.URL.Query().Get("source") != "anthropic" {
			t.Fatal("unscoped catalog request")
		}
		return resourceTestResponse(200, `{"data":[`+skillTestParent()+`],"has_more":false,"next_page":null}`), nil
	}
	status, raw := fileRequest(t, e, "GET", "/v1/skills?source=anthropic", testKey, "", nil, "")
	if status != 503 || bytes.Contains(raw, []byte("remote_secret")) {
		t.Fatalf("workspace data leak %d %s", status, raw)
	}
}
