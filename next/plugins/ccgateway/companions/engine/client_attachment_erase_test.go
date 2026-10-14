package engine

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Text as Claude Code 2.1.296 renders its attachments into an API request.
const (
	ccEnvironment = "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /home/u/project\n - Is a git repository: true\n - Platform: linux\n - Shell: bash\n"
	ccEnvUpdate   = "# Environment update\n - Primary working directory: /home/u/project/sub (was /home/u/project)"
	ccModel       = "You are powered by the model named Opus 5. The exact model ID is claude-opus-5. Assistant knowledge cutoff is May 2026."
	ccDate        = "Today's date is 2026-10-14."
	ccDateChanged = "The date has changed. Today's date is now 2026-10-15. No need to announce the new date — the user's own clock shows it."
	ccTokens      = "<total_tokens>15000000 tokens left</total_tokens>"
	ccSession     = "<system-reminder>\nAs you answer the user's questions, you can use the following context:\n# claudeMd\nAlways respond in Chinese.\n# userEmail\nuser@example.com\n\n      Claude Code attached this context automatically; it isn't part of the user's message. It describes the user's own account and workspace, so they don't need it reported back.\n</system-reminder>\n"
)

func eraseRequest() Object {
	return Object{"model": "claude-sonnet-4-6", "max_tokens": 128,
		"system": []any{Object{"type": "text", "text": "You are Claude Code.\n\n" + ccEnvironment}},
		"messages": []any{
			Object{"role": "user", "content": []any{Object{"type": "text", "text": ccSession}, Object{"type": "text", "text": "Earlier question"}}},
			Object{"role": "system", "content": strings.Join([]string{ccEnvironment, ccModel, ccDate}, "\n\n")},
			Object{"role": "assistant", "content": "Earlier answer"},
			Object{"role": "user", "content": []any{Object{"type": "text", "text": "Next question"}, Object{"type": "text", "text": ccTokens}}},
			Object{"role": "system", "content": ccEnvUpdate + "\n\n" + ccDateChanged + "\n\nKeep answers short."},
			Object{"role": "assistant", "content": "Next answer"},
			Object{"role": "user", "content": "Last question"},
		}}
}

func parseErased(t *testing.T, body Object, types ...string) *Request {
	t.Helper()
	p := defaultRequestPolicy()
	p.EraseClientAttachments = types
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, policyHeaders(p))
	require.NoError(t, err)
	return r
}

func requestTexts(r *Request) string {
	var all []string
	all = append(all, r.System...)
	for _, m := range r.Messages {
		for _, b := range m.Content {
			all = append(all, m.Role+": "+str(b, "text"))
		}
	}
	return strings.Join(all, "\n---\n")
}

func TestEraseClientAttachmentsDefaultKeepsEverything(t *testing.T) {
	r := parseErased(t, eraseRequest())
	texts := requestTexts(r)
	for _, want := range []string{"Primary working directory", ccModel, ccDate, ccTokens, "user@example.com", ccEnvUpdate, ccDateChanged} {
		assert.Contains(t, texts, want)
	}
	assert.Empty(t, r.AttachmentDecisions)
}

func TestEraseClientAttachmentsByType(t *testing.T) {
	r := parseErased(t, eraseRequest(), erasableClientAttachments...)
	texts := requestTexts(r)
	for _, gone := range []string{"Primary working directory", "# Environment", "powered by the model", "Today's date", "total_tokens", "user@example.com", "As you answer"} {
		assert.NotContains(t, texts, gone)
	}
	assert.Equal(t, []string{"You are Claude Code."}, r.System)
	roles := []string{}
	for _, m := range r.Messages {
		roles = append(roles, m.Role)
	}
	// The system message made only of attachments is gone; the one with the
	// client's own instruction keeps it.
	assert.Equal(t, []string{"user", "assistant", "user", "system", "assistant", "user"}, roles)
	assert.Equal(t, "Earlier question", str(r.Messages[0].Content[0], "text"))
	require.Len(t, r.Messages[2].Content, 1)
	assert.Equal(t, "Next question", str(r.Messages[2].Content[0], "text"))
	assert.Equal(t, "Keep answers short.", str(r.Messages[3].Content[0], "text"))
	// Fallback attempts and the forced catalog read the plan's raw request.
	assert.NotContains(t, string(r.Plan.RawRequest()), "user@example.com")
	assert.NotEmpty(t, r.AttachmentDecisions)
}

func TestEraseClientAttachmentsOnlySelectedTypes(t *testing.T) {
	r := parseErased(t, eraseRequest(), "session_context", "total_tokens_reminder")
	texts := requestTexts(r)
	assert.NotContains(t, texts, "user@example.com")
	assert.NotContains(t, texts, ccTokens)
	for _, kept := range []string{"Primary working directory", ccModel, ccDate, ccDateChanged} {
		assert.Contains(t, texts, kept)
	}
	for _, d := range r.AttachmentDecisions {
		assert.Contains(t, []string{"session_context", "total_tokens_reminder"}, d["type"])
	}
}

func TestEraseClientAttachmentsIsStableAcrossTurns(t *testing.T) {
	// The same history erases to the same text every turn, so the next
	// request's prefix still matches the cached one.
	first := parseErased(t, eraseRequest(), erasableClientAttachments...)
	next := eraseRequest()
	next["messages"] = append(next["messages"].([]any), Object{"role": "assistant", "content": "Answer"}, Object{"role": "user", "content": []any{Object{"type": "text", "text": "Another"}, Object{"type": "text", "text": ccTokens}}})
	second := parseErased(t, next, erasableClientAttachments...)
	assert.Equal(t, first.System, second.System)
	for i, m := range first.Messages[:len(first.Messages)-1] {
		assert.Equal(t, m.Content, second.Messages[i].Content)
	}
}

func TestEraseClientAttachmentsNeverEmptiesAUserMessage(t *testing.T) {
	body := basic()
	body["messages"] = []any{Object{"role": "user", "content": ccSession}}
	r := parseErased(t, body, "session_context")
	require.Len(t, r.Messages, 1)
	assert.Contains(t, str(r.Messages[0].Content[0], "text"), "user@example.com")
	require.NotEmpty(t, r.AttachmentDecisions)
	assert.Equal(t, "keep_whole_message", r.AttachmentDecisions[0]["decision"])
}

func TestEraseClientAttachmentsLeavesMentionsAlone(t *testing.T) {
	body := basic()
	mention := "Please note: Today's date is 2026-10-14. was in the log, and <total_tokens>5 tokens left</total_tokens> too."
	body["messages"] = []any{Object{"role": "user", "content": mention}}
	r := parseErased(t, body, erasableClientAttachments...)
	assert.Equal(t, mention, str(r.Messages[0].Content[0], "text"))
}

func TestEraseClientAttachmentsPolicyValidation(t *testing.T) {
	for _, types := range [][]string{{"claudeMd"}, {"date", "date"}, {""}} {
		p := defaultRequestPolicy()
		p.EraseClientAttachments = types
		raw, _ := json.Marshal(basic())
		_, err := parsePolicyRequest(raw, policyHeaders(p))
		assert.ErrorContains(t, err, "erase_client_attachments", "%v", types)
	}
}

func TestEraseClientAttachmentsVocabularyHasPatterns(t *testing.T) {
	for _, typ := range erasableClientAttachments {
		assert.NotEmpty(t, clientAttachmentPatterns[typ], typ)
	}
	assert.Len(t, clientAttachmentPatterns, len(erasableClientAttachments))
}

// With nothing to erase the request is admitted exactly as before the policy
// existed, whatever the legacy attachment source says: the raw body is byte
// for byte the client's and no erase decision is recorded.
func TestEraseClientAttachmentsOffLeavesRequestUnchanged(t *testing.T) {
	raw, err := json.Marshal(eraseRequest())
	require.NoError(t, err)
	base, err := parsePolicyRequest(raw, policyHeaders(defaultRequestPolicy()))
	require.NoError(t, err)
	for _, source := range []string{"client", "gateway", "both"} {
		for _, types := range [][]string{nil, {}} {
			p := defaultRequestPolicy()
			p.AttachmentSource = source
			p.AttachmentSources = map[string]string{"environment": source}
			p.EraseClientAttachments = types
			r, err := parsePolicyRequest(raw, policyHeaders(p))
			require.NoError(t, err, source)
			assert.Equal(t, raw, r.Plan.RawRequest(), source)
			assert.Empty(t, r.AttachmentDecisions, source)
			assert.Equal(t, base.System, r.System, source)
			assert.Equal(t, base.Messages, r.Messages, source)
			assert.Equal(t, "client", r.AttachmentSource, source)
		}
	}
	// Types selected but absent from the request: still byte for byte.
	plain := basic()
	plain["messages"] = []any{Object{"role": "user", "content": "Plain question"}}
	body, err := json.Marshal(plain)
	require.NoError(t, err)
	p := defaultRequestPolicy()
	p.EraseClientAttachments = erasableClientAttachments
	r, err := parsePolicyRequest(body, policyHeaders(p))
	require.NoError(t, err)
	assert.Equal(t, body, r.Plan.RawRequest())
	assert.Empty(t, r.AttachmentDecisions)
}
