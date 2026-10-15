package engine

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAttachmentChildPolicies(t *testing.T) {
	client := strings.Replace(ccEnvironment, " - Platform:", " - Additional working directories:\n   - /one\n   - /two\n - Platform:", 1)
	for _, eol := range []string{"\n", "\r\n"} {
		body := basic()
		body["system"] = strings.ReplaceAll(client, "\n", eol)
		r := parseReplaced(t, body, []string{"git_repository", "additional_directories"}, []string{"shell"}, map[string]string{"environment": gwEnvironment})
		text := requestTexts(r)
		assert.Contains(t, text, "Primary working directory: /home/u/project")
		assert.Contains(t, text, "Platform: linux")
		assert.Contains(t, text, "Shell: unknown"+eol)
		assert.NotContains(t, text, "git repository:")
		assert.NotContains(t, text, "/one")
		assert.NotContains(t, text, "/two")
	}
	// Unrecognized environment fields survive even when all known fields go.
	x := clientAttachmentEraser{types: []string{"working_directory", "platform"}}
	unknown := strings.Replace(ccEnvironment, " - Primary", " - Future fact: keep\n - Primary", 1)
	assert.Contains(t, x.erase(unknown, "system"), "Future fact: keep")
}

func TestModelChildrenKeepIndependentSentences(t *testing.T) {
	body := basic()
	body["system"] = gwModel
	r := parseReplaced(t, body, []string{"knowledge_cutoff"}, []string{"model_id"}, map[string]string{"model": ccModel})
	text := requestTexts(r)
	assert.Contains(t, text, "You are powered by the model named Sonnet 4.6.")
	assert.Contains(t, text, "The exact model ID is claude-opus-5.")
	assert.NotContains(t, text, "knowledge cutoff")
	assert.Equal(t, "claude-sonnet-4-6", r.Model) // Only explanatory text changes.
	assert.Contains(t, text, "Sonnet 4.6")
}

func TestSessionChildrenRespectMarkdownAndFences(t *testing.T) {
	context := sessionIntro + "# claudeMd\n# Project notes\nKeep this.\n```md\n# userEmail\nexample inside code\n```\n# gitStatus\nM secret.go\n# userEmail\nclient@example.com\n\n" + sessionFooter + "</system-reminder>"
	body := basic()
	body["system"] = context
	server := sessionIntro + "# userEmail\nworker@example.com\n</system-reminder>"
	r := parseReplaced(t, body, []string{"git_status"}, []string{"user_email"}, map[string]string{"session_context": server})
	text := requestTexts(r)
	assert.Contains(t, text, "# Project notes\nKeep this.")
	assert.Contains(t, text, "# userEmail\nexample inside code\n```")
	assert.Contains(t, text, "# userEmail\nworker@example.com\n")
	assert.NotContains(t, text, "M secret.go")
	assert.NotContains(t, text, "client@example.com")
	assert.Equal(t, 1, strings.Count(text, sessionFooter))
	removed := parseReplaced(t, body, []string{"claude_md", "git_status", "user_email", "session_other"}, nil, nil)
	assert.Empty(t, strings.Join(removed.System, ""))
	assert.NotContains(t, string(removed.Plan.RawRequest()), "system-reminder")
}

func TestDateChildrenAndCacheKey(t *testing.T) {
	body := basic()
	body["system"] = ccDate + "\n\n" + ccDateChanged
	for _, tc := range []struct{ erase, kept, gone string }{{"current_date", ccDateChanged, ccDate}, {"date_change", ccDate, ccDateChanged}} {
		r := parseReplaced(t, body, []string{tc.erase}, nil, nil)
		assert.Contains(t, requestTexts(r), tc.kept)
		assert.NotContains(t, requestTexts(r), tc.gone)
	}
	h := http.Header{}
	h.Set(policyHeader, `{"replace_client_attachments":["current_date"],"relay_mode":"native"}`)
	key, _, err := gatewayAttachmentRequest([]byte(`{"model":"claude-sonnet-4-6"}`), h)
	require.NoError(t, err)
	assert.Equal(t, time.Now().Format("2006-01-02"), key.Date)
}

func TestMissingChildRenderingKeepsClient(t *testing.T) {
	body := basic()
	body["system"] = ccEnvironment + "\n" + ccModel + "\n" + ccSession
	r := parseReplaced(t, body, nil, []string{"shell", "model_id", "user_email"}, nil)
	assert.Empty(t, r.AttachmentDecisions)
	assert.Contains(t, requestTexts(r), body["system"])
}
