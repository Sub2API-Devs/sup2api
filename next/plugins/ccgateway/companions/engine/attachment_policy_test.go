package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAttachmentPolicyPreservesNativeClientAttachments(t *testing.T) {
	policy := defaultRequestPolicy()
	policy.AttachmentSource = "gateway"
	policy.AttachmentSources = map[string]string{"date": "client"}
	policy.UnknownClientAttachment = "ignore"
	policy.UnknownGatewayAttachment = "pass"
	texts := []string{
		"ordinary permissions and cwd instructions",
		`<ccgateway-attachment type="environment">client cwd</ccgateway-attachment>`,
		`<ccgateway-attachment type="date">client date</ccgateway-attachment>`,
		`<ccgateway-attachment type="future_type">unknown</ccgateway-attachment>`,
		`<ccgateway-attachment type="hook_additional_context">permissions</ccgateway-attachment>`,
	}
	blocks := make([]any, len(texts))
	for i, text := range texts {
		blocks[i] = Object{"type": "text", "text": text}
	}
	v := basic()
	v["system"] = blocks
	v["messages"] = []any{Object{"role": "user", "content": "question"}, Object{"role": "system", "content": blocks}}
	body, err := json.Marshal(v)
	require.NoError(t, err)
	r, err := parsePolicyRequest(body, policyHeaders(policy))
	require.NoError(t, err)
	assert.Equal(t, texts, r.System)
	require.Len(t, r.Messages, 2)
	assert.Equal(t, texts, systemTexts(r.Messages[1]))
	assert.Empty(t, r.AttachmentDecisions, "native must not classify or rewrite client attachments")
	cfg := newRunConfig(r, &Prepared{}, "plugin", t.TempDir())
	assert.Equal(t, "client", cfg.attachments["default_source"])
	assert.Equal(t, "pass", cfg.attachments["unknown_client"])
	assert.Equal(t, "ignore", cfg.attachments["unknown_gateway"])
	assert.Empty(t, cfg.attachments["sources"], "legacy overrides must not add gateway attachments")
	assert.Equal(t, "client", cfg.env["CCGATEWAY_ATTACHMENT_SOURCE"])

	// Ineffective legacy attachment policies do not fork native history, but
	// a real custom-tool namespace change must still isolate permissions.
	baseline, err := parsePolicyRequest(body, policyHeaders(defaultRequestPolicy()))
	require.NoError(t, err)
	assert.Equal(t, baseline.toolHistoryNamespace(), r.toolHistoryNamespace())
	policy.CustomToolPrefix = "other_client"
	other, err := parsePolicyRequest(body, policyHeaders(policy))
	require.NoError(t, err)
	assert.NotEqual(t, r.toolHistoryNamespace(), other.toolHistoryNamespace())
	for _, bad := range []RequestPolicy{{AttachmentSources: map[string]string{"bogus": "client"}}, {UnknownClientAttachment: "delete"}, {AttachmentSources: map[string]string{"date": "invalid"}}} {
		assert.Error(t, validateAttachmentPolicy(bad), "invalid policy accepted")
	}
}
