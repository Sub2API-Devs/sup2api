package engine

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRealCLIResourceTypedAdmissionUsesAuthenticatedIssuer(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		t.Error("identity-only API key admission attempted provider IO")
		w.WriteHeader(500)
	})
	b := resourceManagedTestBroker(t, runner)
	ctx, cancel := context.WithTimeout(t.Context(), time.Minute)
	defer cancel()
	id, err := b.identity(withResourceAuthorization(ctx))
	require.NoError(t, err)
	body := []byte(`{"model":"claude-opus-5-5","max_tokens":128,"messages":[{"role":"user","content":[{"type":"image","source":{"type":"file","file_id":"file_image"}},{"type":"document","source":{"type":"file","file_id":"file_document"}}]}]}`)
	h := http.Header{}
	h.Set(resources.PrincipalHeader, id.PrincipalID)
	h.Set(resources.GenerationHeader, id.Generation)
	h.Set(resources.ResourceRefsHeader, `[{"kind":"file","id":"file_image"},{"kind":"file","id":"file_document"}]`)
	grant, err := b.g.admitResourceReferences(ctx, body, h)
	require.NoError(t, err)
	require.NotNil(t, grant)
	defer grant.close()
	assert.Equal(t, id, grant.identity)
	assert.False(t, grant.outputs)
	require.Len(t, grant.references, 2)
	// Parse with the authenticated grant before history/native preparation;
	// forged grants or an unprepared Request would conceal image/file failures.
	req, err := parsePolicyRequestWithResources(body, h, grant)
	require.NoError(t, err)
	require.NotNil(t, req)
	assert.NoError(t, req.requireResourceKind(resources.KindFile, "file_image"))
	assert.NoError(t, req.requireResourceKind(resources.KindFile, "file_document"))
	assert.Error(t, req.requireResourceKind(resources.KindSkill, "file_document"))
	assert.Error(t, req.checkResourceContext("srvtool_parent", "container_fixture"))
	grant.close()

	for _, kind := range []string{"skill", "container"} {
		t.Run("wrong_kind_"+kind, func(t *testing.T) {
			wrong := h.Clone()
			refs, err := json.Marshal([]resources.AdmissionReference{{Kind: kind, ID: "file_image"}, {Kind: kind, ID: "file_document"}})
			require.NoError(t, err)
			wrong.Set(resources.ResourceRefsHeader, string(refs))
			bad, err := b.g.admitResourceReferences(ctx, body, wrong)
			if bad != nil {
				bad.close()
			}
			require.ErrorContains(t, err, "not in the verified ID allowlist")
			assert.Nil(t, bad)
		})
	}

	// Ownership is necessary but cannot enable removed model execution APIs.
	// Keep these denials behind real issuer verification, not a fake grant.
	for _, tc := range []struct {
		name, field string
		value       any
		want        string
	}{
		{"container_skills", "container", Object{"id": "container_fixture", "skills": []any{Object{"type": "custom", "skill_id": "skill_fixture", "version": "123"}}}, "container is not supported"},
		{"code_execution", "tools", []any{Object{"type": "code_execution_20260120", "name": "code_execution"}}, `server tool "code_execution_20260120" is not supported`},
		{"typed_toolsets", "tools", []any{Object{"type": "browser_toolset_20260801"}}, `tool type "browser_toolset_20260801" is not supported`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			input, err := decodeObject(body)
			require.NoError(t, err)
			input[tc.field] = tc.value
			raw, err := json.Marshal(input)
			require.NoError(t, err)
			owned := h.Clone()
			owned.Set(resources.ResourceOutputsHeader, "1")
			owned.Set(resources.ResourceRefsHeader, `[{"kind":"file","id":"file_image"},{"kind":"file","id":"file_document"},{"kind":"container","id":"container_fixture"},{"kind":"skill","id":"skill_fixture"}]`)
			if tc.name == "container_skills" {
				wrong := owned.Clone()
				wrong.Set(resources.ResourceRefsHeader, `[{"kind":"file","id":"file_image"},{"kind":"file","id":"file_document"},{"kind":"file","id":"container_fixture"},{"kind":"file","id":"skill_fixture"}]`)
				bad, err := b.g.admitResourceReferences(ctx, raw, wrong)
				if bad != nil {
					bad.close()
				}
				require.ErrorContains(t, err, "not in the verified ID allowlist", "file grants must not authorize containers or skills")
				assert.Nil(t, bad)
			}
			admitted, err := b.g.admitResourceReferences(ctx, raw, owned)
			require.NoError(t, err)
			require.NotNil(t, admitted)
			defer admitted.close()
			assert.Equal(t, id, admitted.identity)
			rejected, err := parsePolicyRequestWithResources(raw, owned, admitted)
			require.ErrorContains(t, err, tc.want)
			assert.Nil(t, rejected)
		})
	}
	require.True(t, b.authority.mu.TryLock(), "admission retained issuer lock")
	b.authority.mu.Unlock()
	assert.Empty(t, b.g.Slots)
	assertResourceSpoolReleased(t, b.dir, b.budget)
}
