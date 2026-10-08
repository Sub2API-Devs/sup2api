package gateway

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"testing"
)

func TestSkillsHTTPDefaultCatalogPagesRemainScoped(t *testing.T) {
	e, _, tr := skillsTestEnv(t)
	body, ct := skillMultipart(t, "files", "SKILL.md", []byte("test"))
	status, raw := fileRequest(t, e, "POST", "/v1/skills", testKey, "", body, ct)
	if status != 200 {
		t.Fatalf("upload %d %s", status, raw)
	}
	tr.fn = func(r *http.Request) (*http.Response, error) {
		if r.URL.Path != "/v1/skills" || r.URL.Query().Get("source") != "anthropic" || r.URL.Query().Get("limit") != "1" {
			t.Fatal("catalog scope", r.URL.String())
		}
		return resourceTestResponse(200, `{"data":[{"id":"pptx","type":"skill","source":{"type":"anthropic"}}],"has_more":false,"next_page":null}`), nil
	}
	status, raw = fileRequest(t, e, "GET", "/v1/skills?limit=1", testKey, "", nil, "")
	if status != 200 {
		t.Fatalf("list %d %s", status, raw)
	}
	var page map[string]any
	_ = json.Unmarshal(raw, &page)
	if page["has_more"] != true || len(page["data"].([]any)) != 1 {
		t.Fatal(string(raw))
	}
	cursor := page["next_page"].(string)
	status, raw = fileRequest(t, e, "GET", "/v1/skills?limit=1&page="+url.QueryEscape(cursor), testKey, "", nil, "")
	if status != 200 || !bytes.Contains(raw, []byte(`"id":"pptx"`)) {
		t.Fatalf("catalog page %d %s", status, raw)
	}
	tr.generation = "replacement"
	before := tr.calls
	status, _ = fileRequest(t, e, "GET", "/v1/skills?limit=1&page="+url.QueryEscape(cursor), testKey, "", nil, "")
	if status != 409 || tr.calls != before {
		t.Fatal("catalog cursor moved issuer", status)
	}
}

func TestSkillsHTTPLegacyUsesVerifiedEpoch(t *testing.T) {
	e, _, tr := skillsTestEnv(t)
	const epoch = "1791417600000000"
	tr.fn = func(r *http.Request) (*http.Response, error) {
		if !legacySkills(r.Header) {
			t.Fatal("legacy header lost")
		}
		if strings.Contains(r.URL.Path, "/versions/") {
			if !strings.HasSuffix(r.URL.Path, "/"+epoch) {
				t.Fatal("invented version selector", r.URL.Path)
			}
			return resourceTestResponse(200, `{"id":"skill_version_remote","version":"`+epoch+`","type":"skill_version","skill_id":"skill_remote_secret","created_at":"2026-10-08T00:00:00Z","name":"test","description":"test","directory":"package"}`), nil
		}
		return resourceTestResponse(200, `{"id":"skill_remote_secret","type":"skill","source":"custom","display_title":"test","latest_version":"`+epoch+`","created_at":"2026-10-08T00:00:00Z","updated_at":"2026-10-08T00:00:00Z"}`), nil
	}
	body, ct := skillMultipart(t, "files", "SKILL.md", []byte("test"))
	status, raw := fileRequest(t, e, "POST", "/v1/skills", testKey, "skills-2025-10-02", body, ct)
	if status != 200 || bytes.Contains(raw, []byte("remote_secret")) {
		t.Fatalf("legacy create %d %s", status, raw)
	}
	var p map[string]any
	_ = json.Unmarshal(raw, &p)
	if p["latest_version"] != epoch {
		t.Fatal("epoch changed", string(raw))
	}
	id := p["id"].(string)
	status, raw = fileRequest(t, e, "GET", "/v1/skills/"+id+"/versions/"+epoch, testKey, "skills-2025-10-02", nil, "")
	if status != 200 || bytes.Contains(raw, []byte("skill_version_remote")) {
		t.Fatalf("legacy version %d %s", status, raw)
	}
	var v map[string]any
	_ = json.Unmarshal(raw, &v)
	if v["version"] != epoch || !strings.HasPrefix(v["id"].(string), "version_local_") {
		t.Fatal(string(raw))
	}
}

func TestSkillsHTTPRejectsMixedFieldsAndUnownedVersion(t *testing.T) {
	e, _, tr := skillsTestEnv(t)
	body, ct := skillMultipart(t, "files", "SKILL.md", []byte("test"))
	status, raw := fileRequest(t, e, "POST", "/v1/skills", testKey, "", body, ct)
	if status != 200 {
		t.Fatal(status)
	}
	var p map[string]any
	_ = json.Unmarshal(raw, &p)
	id := p["id"].(string)
	before := tr.calls
	for _, path := range []string{"/v1/skills/" + id + "/versions/skver_remote_secret", "/v1/skills/" + id + "/versions/not_registered", "/v1/skills/" + id + "?workspace_id=x", "/v1/skills?source=unknown", "/v1/skills?limit=0", "/v1/skills?beta=false"} {
		status, _ = fileRequest(t, e, "GET", path, testKey, "", nil, "")
		if status < 400 || tr.calls != before {
			t.Fatal("invalid request dispatched", path, status)
		}
	}
}

func TestSkillsHTTPInitialVersionIdentityMismatchAndShortDownload(t *testing.T) {
	for _, mode := range []string{"initial-id", "initial-parent", "short-download"} {
		t.Run(mode, func(t *testing.T) {
			e, s, tr := skillsTestEnv(t)
			original := tr.fn
			tr.fn = func(r *http.Request) (*http.Response, error) {
				response, err := original(r)
				if r.Method == "GET" && strings.Contains(r.URL.Path, "/versions/") && !strings.HasSuffix(r.URL.Path, "/content") {
					if mode == "initial-id" {
						response = resourceTestResponse(200, strings.ReplaceAll(skillTestVersion(), "skver_remote_secret", "skver_wrong"))
					}
					if mode == "initial-parent" {
						response = resourceTestResponse(200, strings.ReplaceAll(skillTestVersion(), "skill_remote_secret", "skill_other"))
					}
				}
				if strings.HasSuffix(r.URL.Path, "/content") {
					response.ContentLength += 10
				}
				return response, err
			}
			body, ct := skillMultipart(t, "files", "SKILL.md", []byte("test"))
			status, raw := fileRequest(t, e, "POST", "/v1/skills", testKey, "", body, ct)
			if mode != "short-download" {
				if status < 500 {
					t.Fatalf("unverified version registered %d %s", status, raw)
				}
				for _, v := range s.versions {
					if v.State != "uncertain" {
						t.Fatal("unverified version became ready")
					}
				}
				return
			}
			if status != 200 {
				t.Fatalf("create %d %s", status, raw)
			}
			var p map[string]any
			_ = json.Unmarshal(raw, &p)
			status, raw = fileRequest(t, e, "GET", "/v1/skills/"+p["id"].(string)+"/versions/"+p["latest_version_id"].(string)+"/content", testKey, "", nil, "")
			if status < 500 || bytes.Contains(raw, []byte("zip-bytes")) {
				t.Fatal("partial ZIP published as success", status)
			}
		})
	}
}

func TestSkillsStoredMetadataKeepsProviderNumberPrecision(t *testing.T) {
	body, err := skillObject([]byte(`{"id":"owned","extension_count":9007199254740993}`))
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(body)
	if err != nil || !bytes.Contains(raw, []byte("9007199254740993")) {
		t.Fatalf("provider metadata changed: %s %v", raw, err)
	}
}
