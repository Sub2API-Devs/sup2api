package engine

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIndependentEnvironmentPolicies(t *testing.T) {
	client := strings.Replace(ccEnvironment, " - Platform:", " - Additional working directories:\n   - /extra/one\n   - /extra/two\n - Platform:", 1)
	client = strings.Replace(client, "Platform: linux", "Platform: darwin", 1)
	for _, eol := range []string{"\n", "\r\n"} {
		t.Run(map[string]string{"\n": "LF", "\r\n": "CRLF"}[eol], func(t *testing.T) {
			body := basic()
			body["system"] = strings.ReplaceAll("Keep.\n\n"+client+"\n"+ccEnvUpdate+"\n\nTail.", "\n", eol)
			r := parseReplaced(t, body, []string{"platform"}, []string{"working_directory"}, map[string]string{"environment": gwEnvironment})
			text := requestTexts(r)
			assert.Contains(t, text, "Primary working directory: /work/data/cache/workspace"+eol)
			assert.Contains(t, text, "Is a git repository: false")
			for _, gone := range []string{"/extra/", "Platform:", "Shell:", "OS Version:", "git repository: true"} {
				assert.NotContains(t, text, gone)
			}
			// Updates are an independent choice, even when directory is replaced.
			assert.Contains(t, text, strings.ReplaceAll(ccEnvUpdate, "\n", eol))
			assert.Contains(t, text, "Tail.")
		})
	}
}

func TestEnvironmentUpdatesAndPlatformIndependent(t *testing.T) {
	body := basic()
	body["system"] = ccEnvironment + "\n" + ccEnvUpdate
	r := parseReplaced(t, body, []string{"environment_update"}, []string{"platform"}, map[string]string{"environment": gwEnvironment})
	text := requestTexts(r)
	assert.Contains(t, text, "Primary working directory: /home/u/project")
	assert.Contains(t, text, "Shell: unknown")
	assert.Contains(t, text, "OS Version: Linux")
	assert.NotContains(t, text, "# Environment update")
	assert.NotContains(t, text, "/work/data/cache/workspace")
}

func TestGranularEnvironmentMissingAndEmptyRendering(t *testing.T) {
	for _, typ := range []string{"working_directory", "platform", "environment_update"} {
		body := basic()
		body["system"] = ccEnvironment + "\n" + ccEnvUpdate
		kept := parseReplaced(t, body, nil, []string{typ}, nil)
		assert.Contains(t, requestTexts(kept), body["system"])
		assert.Empty(t, kept.AttachmentDecisions)
		removed := parseReplaced(t, body, nil, []string{typ}, map[string]string{typ: ""})
		assert.NotEmpty(t, removed.AttachmentDecisions)
	}
}

func TestGranularEnvironmentRecognitionBoundaries(t *testing.T) {
	outside := " - Primary working directory: /outside\n - Platform: darwin\n"
	unknown := " - Future environment fact: keep\n"
	x := clientAttachmentEraser{types: []string{"working_directory", "platform"}}
	assert.Equal(t, outside, x.erase(outside, "system"))
	assert.Equal(t, "", x.erase(ccEnvironment, "system"))
	got := x.erase(ccEnvironment+unknown, "system")
	assert.Contains(t, got, unknown)
	assert.NotContains(t, got, "Primary working directory:")
	assert.NotContains(t, got, "Platform:")
}
