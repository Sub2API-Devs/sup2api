package engine

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

const buildClientEnvironment = "# Environment\nYou have been invoked in the following environment: \n" +
	" - Primary working directory: D:\\项目\n - Is a git repository: true\n" +
	" - Additional working directories:\n   - D:\\second\n - Platform: win32\n" +
	" - Shell: PowerShell\n - OS Version: Windows fixture\n - Future fact: keep\n"

func TestBuildAttachmentSourcesPreserveClientWorkspaceAndOpaqueBlocks(t *testing.T) {
	sources := features.BuildAttachmentSources{"platform_name": "worker", "os_version": "worker"}
	facts := map[string]string{"platform_name": "linux", "os_version": "Linux fixture"}
	for _, eol := range []string{"\n", "\r\n"} {
		env := strings.ReplaceAll(buildClientEnvironment, "\n", eol)
		wrap := func(text string) string { return "<system-reminder>" + eol + text + "</system-reminder>" }
		reminder := wrap(env)
		body := Object{
			"model":  "fixture",
			"system": []any{Object{"type": "text", "text": env, "cache_control": Object{"type": "ephemeral"}}},
			"messages": []any{
				Object{"role": "user", "content": []any{
					Object{"type": "text", "text": reminder, "cache_control": Object{"type": "ephemeral"}},
					Object{"type": "text", "text": wrap("# gitStatus\nbranch: client\n# claudeMd\nclient instructions")},
					Object{"type": "image", "source": Object{"type": "base64", "data": "unchanged"}},
					Object{"type": "tool_result", "tool_use_id": "t", "content": reminder},
				}},
				Object{"role": "system", "content": []any{
					Object{"type": "text", "text": env},
					Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "ClientTool"}},
				}, "clear_at": "next_user_message"},
				Object{"role": "assistant", "content": []any{
					Object{"type": "text", "text": reminder},
					Object{"type": "tool_use", "id": "t", "name": "ClientTool", "input": Object{"quoted": reminder}},
					Object{"type": "thinking", "thinking": "opaque", "signature": "unchanged"},
				}},
			},
		}
		raw, _ := json.Marshal(body)
		got, decisions, err := transformBuildAttachments(raw, sources, facts)
		require.NoError(t, err)
		require.Len(t, decisions, 6)
		// Only these three environment text slots may change.
		expectedText := strings.ReplaceAll(strings.ReplaceAll(env, "Platform: win32", "Platform: linux"), "OS Version: Windows fixture", "OS Version: Linux fixture")
		body["system"].([]any)[0].(Object)["text"] = expectedText
		rows := body["messages"].([]any)
		rows[0].(Object)["content"].([]any)[0].(Object)["text"] = wrap(expectedText)
		rows[1].(Object)["content"].([]any)[0].(Object)["text"] = expectedText
		expected, _ := json.Marshal(body)
		require.JSONEq(t, string(expected), string(got))
		again, decisions, err := transformBuildAttachments(got, sources, facts)
		require.NoError(t, err)
		require.Empty(t, decisions)
		require.Equal(t, got, again)
		_, err = messagesBuildComponents(got)
		require.NoError(t, err)
	}
}

func TestBuildAttachmentRecognitionIsConservative(t *testing.T) {
	wrap := func(text string) string { return "<system-reminder>\n" + text + "</system-reminder>" }
	env := buildClientEnvironment
	for _, tc := range []struct{ role, text string }{
		{"user", env},
		{"user", "Please quote:\n" + wrap(env)},
		{"user", wrap(wrap(env))},
		{"user", "<system-reminder>\n" + env},
		{"system", "<system-reminder>\n" + env},
		{"system", wrap(wrap(env))},
		{"system", "```text\n" + env + "```\n"},
		{"system", wrap("Contents of CLAUDE.md:\n\n" + env)},
		{"system", "# Environment\n - Product information, not runtime facts\n"},
		{"system", env + " - Platform: darwin\n"},
	} {
		raw, _ := json.Marshal(Object{"model": "fixture", "messages": []any{Object{"role": tc.role, "content": tc.text}}})
		got, decisions, err := transformBuildAttachments(raw, features.BuildAttachmentSources{"platform_name": "worker"}, map[string]string{"platform_name": "linux"})
		require.NoError(t, err)
		require.Equal(t, string(raw), string(got), tc.text)
		require.Empty(t, decisions)
	}
	raw := []byte(`{"model":"fixture","messages":[{"role":"user","content":"ordinary"}],"metadata":{"number":9007199254740993}}`)
	got, _, err := transformBuildAttachments(raw, nil, nil)
	require.NoError(t, err)
	require.Equal(t, raw, got, "default policy is a byte-preserving no-op")
	for _, sources := range []features.BuildAttachmentSources{{"cwd": "worker"}, {"platform_name": "erase"}} {
		_, _, err := transformBuildAttachments(raw, sources, nil)
		require.Error(t, err)
	}
	_, _, err = transformBuildAttachments(raw, features.BuildAttachmentSources{"os_version": "worker"}, nil)
	require.ErrorContains(t, err, "unavailable")
}
func TestSystemComponentExtractionRestoresExactContent(t *testing.T) {
	raw := `[{"role":"user","content":[{"type":"text","text":"前文\n<system-reminder>ONE</system-reminder> 后文 <system-reminder>TWO</system-reminder>","cache_control":{"type":"ephemeral"}},{"type":"image","source":{"type":"base64","data":"opaque"}},{"type":"tool_result","tool_use_id":"t","content":[{"type":"text","text":"<system-reminder>TOOL</system-reminder>"}]}]},{"role":"system","content":[{"type":"text","text":"A","cache_control":{"type":"ephemeral"}},{"type":"text","text":"B"}],"clear_at":"next_user_message","output_config":{"effort":"low"}},{"role":"assistant","content":"<system-reminder>assistant quote</system-reminder>"},{"role":"user","content":"<system-reminder>unclosed"}]`
	var messages []json.RawMessage
	if err := json.Unmarshal([]byte(raw), &messages); err != nil {
		t.Fatal(err)
	}
	rows, attachments, err := extractSystemComponents(messages)
	if err != nil {
		t.Fatal(err)
	}
	if len(attachments) != 4 || len(rows) != 4 {
		t.Fatalf("rows %d attachments %d", len(rows), len(attachments))
	}
	lookup := map[string]map[string]any{}
	for _, item := range attachments {
		lookup[item["id"].(string)] = item
	}
	var restore func(any) any
	restore = func(v any) any {
		switch node := v.(type) {
		case map[string]any:
			if id, ok := node["attachment"].(string); ok {
				var message any
				_ = json.Unmarshal(lookup[id]["message"].(json.RawMessage), &message)
				return message
			}
			if node["type"] == "ccgateway_text" {
				text := ""
				for _, part := range node["parts"].([]any) {
					p := part.(map[string]any)
					if literal, ok := p["text"].(string); ok {
						text += literal
					} else {
						var block map[string]string
						_ = json.Unmarshal(lookup[p["attachment"].(string)]["block"].(json.RawMessage), &block)
						text += block["text"]
					}
				}
				block := node["block"].(map[string]any)
				block["text"] = text
				return block
			}
			for key, value := range node {
				node[key] = restore(value)
			}
			return node
		case []any:
			for i, value := range node {
				node[i] = restore(value)
			}
			return node
		default:
			return node
		}
	}
	var original, actual any
	_ = json.Unmarshal([]byte(raw), &original)
	encoded, _ := json.Marshal(rows)
	_ = json.Unmarshal(encoded, &actual)
	if !reflect.DeepEqual(original, restore(actual)) {
		t.Fatalf("content or system lifecycle changed: %s", encoded)
	}
	if strings.Contains(string(rows[0]), "ONE") || strings.Contains(string(rows[1]), `"role":"system"`) {
		t.Fatal("extracted content duplicated at original slot")
	}
}

func TestReminderSpanBoundaries(t *testing.T) {
	for _, c := range []struct {
		text  string
		count int
	}{
		{"plain", 0}, {"<system-reminder>unclosed", 0}, {"</system-reminder>unopened", 0},
		{"<system-reminder>a</system-reminder>mid<system-reminder>b</system-reminder>", 2},
		{"<system-reminder>outer<system-reminder>inner</system-reminder>end</system-reminder>", 1},
	} {
		if got := len(reminderSpans(c.text)); got != c.count {
			t.Fatalf("%q: %d", c.text, got)
		}
	}
}

func TestBuildRejectsReservedReferencesAndUnsafeNumbers(t *testing.T) {
	for _, raw := range []string{
		`{"model":"m","messages":[{"role":"user","content":[{"type":"ccgateway_attachment","id":"x"}]}]}`,
		`{"model":"m","messages":[{"role":"user","content":null}]}`,
		`{"model":"m","messages":[{"role":"user","content":"x"}],"max_tokens":9007199254740993}`,
	} {
		if _, err := messagesBuildComponents([]byte(raw)); err == nil {
			t.Fatal("accepted", raw)
		}
	}
}
