package gateway

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
)

func (s *memorySkills) FindObservedVersion(_ context.Context, owner core.ResourceOwner, parent, selector string) (core.SkillVersion, error) {
	for _, version := range s.versions {
		if version.Parent.PublicID == parent && version.Parent.Owner == owner && version.Parent.State == "ready" && version.State == "ready" && (version.RemoteVersionID == selector || version.LegacyEpoch != "" && version.LegacyEpoch == selector) {
			return version, nil
		}
	}
	return core.SkillVersion{}, core.ErrNotFound
}

func TestSkillsModelFreezesLatestAndMapsResponseVersions(t *testing.T) {
	for _, legacy := range []bool{false, true} {
		t.Run(map[bool]string{false: "stable", true: "legacy"}[legacy], func(t *testing.T) {
			e, skills, _ := skillsTestEnv(t)
			p := e.auth.keys[testKey]
			parent := core.ProviderResource{PublicID: "skill_public", RemoteID: "skill_remote", Kind: resources.KindSkill, PluginKey: "ccgateway", State: "ready", Owner: core.ResourceOwner{UserID: p.UserID, GroupID: p.Group.ID}, Binding: core.ResourceBinding{AccountID: 1, PrincipalID: "synthetic_issuer", Generation: "v1"}}
			skills.resources.rows[parent.PublicID] = parent
			version := core.SkillVersion{Parent: parent, State: "ready", PublicVersionID: "version_public", RemoteVersionID: "version_remote", LegacyEpoch: "1791388800", CreatedAt: time.Now()}
			skills.versions[version.PublicVersionID] = version
			wireVersion, publicVersion := version.RemoteVersionID, version.PublicVersionID
			if legacy {
				wireVersion, publicVersion = version.LegacyEpoch, version.LegacyEpoch
			}
			var calls atomic.Int32
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				var raw json.RawMessage
				_ = json.NewDecoder(r.Body).Decode(&raw)
				if gjson.GetBytes(raw, "container.skills.0.skill_id").String() != parent.RemoteID || gjson.GetBytes(raw, "container.skills.0.version").String() != wireVersion {
					t.Errorf("skill/version not concretely mapped: %s", raw)
				}
				var grants []resources.AdmissionSkillVersion
				if err := json.Unmarshal([]byte(r.Header.Get(resources.ResourceSkillVersionsHeader)), &grants); err != nil || len(grants) != 1 || grants[0].SkillID != parent.RemoteID || grants[0].Version != wireVersion {
					t.Errorf("exact version capability missing: %+v %v", grants, err)
				}
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set(resources.PrincipalHeader, parent.Binding.PrincipalID)
				w.Header().Set(resources.GenerationHeader, parent.Binding.Generation)
				json.NewEncoder(w).Encode(map[string]any{"id": "msg_skill", "type": "message", "model": testModel, "role": "assistant", "content": []any{map[string]any{"type": "text", "text": "done"}}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 2, "output_tokens": 1}, "container": map[string]any{"id": "container_remote", "expires_at": time.Now().Add(time.Hour).UTC().Format(time.RFC3339), "skills": []any{map[string]any{"type": "custom", "skill_id": parent.RemoteID, "version": wireVersion}}}})
			}))
			defer up.Close()
			e.plat.base = up.URL
			request := body(testModel, false)
			request["container"] = map[string]any{"skills": []any{map[string]any{"type": "custom", "skill_id": parent.PublicID}}}
			encoded, _ := json.Marshal(request)
			beta := ""
			if legacy {
				beta = "skills-2025-10-02"
			}
			status, response := fileRequest(t, e, "POST", "/v1/messages", testKey, beta, encoded, "application/json")
			e.record()
			if status != 200 || calls.Load() != 1 || gjson.GetBytes(response, "container.skills.0.skill_id").String() != parent.PublicID || gjson.GetBytes(response, "container.skills.0.version").String() != publicVersion {
				t.Fatalf("response not mapped: %d %s", status, response)
			}
			if strings.Contains(string(response), parent.RemoteID) || strings.Contains(string(response), version.RemoteVersionID) {
				t.Fatal("response exposed provider IDs")
			}
		})
	}
}
