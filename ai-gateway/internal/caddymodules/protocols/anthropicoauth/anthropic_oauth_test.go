package anthropicoauth

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func TestTransformerAppliesStrictClaudeCodeHeaderBoundary(t *testing.T) {
	request, err := http.NewRequest(http.MethodPost, "https://gateway.test/v1/messages", strings.NewReader(`{"model":"claude"}`))
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Authorization", "Bearer client-secret")
	request.Header.Set("Cookie", "session=client-secret")
	request.Header.Set("X-Forwarded-For", "203.0.113.10")
	request.Header.Set("Anthropic-Beta", "client-beta")
	request.Header.Set("User-Agent", "claude-cli/2.1.220 (external, cli)")
	request.Header.Set("X-Stainless-Lang", "js")

	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{
		"client_mode": "claude_code_passthrough",
	}}
	if err := (&Transformer{}).TransformRequest(request, plan, nil); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	for _, key := range []string{"Authorization", "Cookie", "X-Forwarded-For", "Anthropic-Beta"} {
		if got := request.Header.Get(key); got != "" {
			t.Fatalf("%s leaked: %q", key, got)
		}
	}
	if request.Header.Get("User-Agent") == "" || request.Header.Get("X-Stainless-Lang") != "js" {
		t.Fatalf("Claude Code headers were removed: %v", request.Header)
	}
	body, err := io.ReadAll(request.Body)
	if err != nil || string(body) != `{"model":"claude"}` {
		t.Fatalf("body changed: %q err=%v", body, err)
	}
}

func TestTransformerMimicsClaudeCodeWithoutReencodingLargeMultimodalValues(t *testing.T) {
	imageData := strings.Repeat("A", 2<<20)
	spoolDir := t.TempDir()
	t.Setenv("TMPDIR", spoolDir)
	body := `{"model":"claude-upstream","stream":true,"system":"Follow the project rules.","thinking":{"type":"enabled"},"messages":[{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":"image/png","data":"` + imageData + `"}},{"type":"text","text":"please inspect this image"}]}]}`
	request, _ := http.NewRequest(http.MethodPost, "https://gateway.test/v1/messages", strings.NewReader(body))
	request.Header.Set("Cookie", "secret=1")
	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{
		"client_mode": "mimic", "anthropic_beta": contextManagementBeta,
		"account_id": "42", "account_uuid": "account-uuid", "claude_user_id": strings.Repeat("b", 64),
	}}
	state := &requeststate.State{ClientIP: "203.0.113.5", Auth: &requeststate.AuthGrant{APIKeyID: 9}}
	if err := (&Transformer{}).TransformRequest(request, plan, state); err != nil {
		t.Fatalf("TransformRequest: %v", err)
	}
	if request.ContentLength != -1 || request.GetBody != nil {
		t.Fatalf("streaming body metadata length=%d getBody=%v", request.ContentLength, request.GetBody != nil)
	}
	rewritten, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatalf("read transformed body: %v", err)
	}
	if strings.Count(string(rewritten), imageData) != 1 {
		t.Fatal("large multimodal value was lost or duplicated")
	}
	var decoded struct {
		System []struct {
			Text string `json:"text"`
		} `json:"system"`
		Messages []json.RawMessage `json:"messages"`
		Metadata struct {
			UserID string `json:"user_id"`
		} `json:"metadata"`
		Tools             []json.RawMessage `json:"tools"`
		Temperature       float64           `json:"temperature"`
		MaxTokens         int               `json:"max_tokens"`
		ContextManagement json.RawMessage   `json:"context_management"`
	}
	if err := json.Unmarshal(rewritten, &decoded); err != nil {
		t.Fatalf("decode transformed body: %v", err)
	}
	if len(decoded.System) != 3 || !strings.HasPrefix(decoded.System[0].Text, "x-anthropic-billing-header") || decoded.System[1].Text != claudeCodeSystemPrompt {
		t.Fatalf("system blocks = %+v", decoded.System)
	}
	if len(decoded.Messages) != 3 || !strings.Contains(string(decoded.Messages[0]), "[System Instructions]") || !strings.Contains(string(decoded.Messages[2]), imageData) {
		t.Fatalf("messages were not injected/preserved: count=%d", len(decoded.Messages))
	}
	if len(decoded.Tools) != 0 || decoded.Temperature != 1 || decoded.MaxTokens != 128000 || len(decoded.ContextManagement) == 0 {
		t.Fatalf("defaults tools=%d temperature=%v max=%d context=%s", len(decoded.Tools), decoded.Temperature, decoded.MaxTokens, decoded.ContextManagement)
	}
	var metadataUserID map[string]string
	if err := json.Unmarshal([]byte(decoded.Metadata.UserID), &metadataUserID); err != nil {
		t.Fatalf("decode metadata.user_id: %v", err)
	}
	if metadataUserID["device_id"] != strings.Repeat("b", 64) || metadataUserID["account_uuid"] != "account-uuid" || metadataUserID["session_id"] == "" {
		t.Fatalf("metadata.user_id = %+v", metadataUserID)
	}
	if request.Header.Get("Cookie") != "" {
		t.Fatal("client cookie leaked")
	}
	entries, err := os.ReadDir(spoolDir)
	if err != nil || len(entries) != 0 {
		t.Fatalf("sensitive spool was not removed: entries=%v err=%v", entries, err)
	}
}

func TestTransformerMimicStripsContextManagementWithoutBeta(t *testing.T) {
	body := `{"model":"claude","context_management":{"edits":[]},"messages":[{"role":"user","content":"hello"}]}`
	request, _ := http.NewRequest(http.MethodPost, "https://gateway.test/v1/messages", strings.NewReader(body))
	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{"client_mode": "mimic", "account_id": "1"}}
	if err := (&Transformer{}).TransformRequest(request, plan, nil); err != nil {
		t.Fatal(err)
	}
	rewritten, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]json.RawMessage
	if err := json.Unmarshal(rewritten, &decoded); err != nil {
		t.Fatal(err)
	}
	if _, exists := decoded["context_management"]; exists {
		t.Fatalf("context_management was not stripped: %s", rewritten)
	}
}

func TestTransformerMimicRewritesToolNamesAndRestoresStreamingResponse(t *testing.T) {
	body := `{"model":"claude","tools":[` +
		`{"name":"sessions_list","input_schema":{"type":"object"}},` +
		`{"name":"alpha","input_schema":{"type":"object"}},` +
		`{"name":"beta","input_schema":{"type":"object"}},` +
		`{"name":"gamma","input_schema":{"type":"object"}},` +
		`{"name":"delta","input_schema":{"type":"object"}},` +
		`{"name":"epsilon","input_schema":{"type":"object"}}],` +
		`"tool_choice":{"type":"tool","name":"sessions_list"},` +
		`"messages":[{"role":"assistant","content":[{"type":"tool_use","id":"tool-1","name":"sessions_list","input":{}}]},{"role":"user","content":"continue"}]}`
	request, _ := http.NewRequest(http.MethodPost, "https://gateway.test/v1/messages", strings.NewReader(body))
	state := &requeststate.State{}
	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{"client_mode": "mimic", "account_id": "1"}}
	if err := (&Transformer{}).TransformRequest(request, plan, state); err != nil {
		t.Fatal(err)
	}
	rewritten, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatal(err)
	}
	var decoded struct {
		Tools []struct {
			Name         string          `json:"name"`
			CacheControl json.RawMessage `json:"cache_control"`
		} `json:"tools"`
		ToolChoice struct {
			Name string `json:"name"`
		} `json:"tool_choice"`
		Messages []json.RawMessage `json:"messages"`
	}
	if err := json.Unmarshal(rewritten, &decoded); err != nil {
		t.Fatalf("decode request: %v\n%s", err, rewritten)
	}
	if len(decoded.Tools) != 6 || decoded.Tools[0].Name == "sessions_list" || decoded.ToolChoice.Name != decoded.Tools[0].Name {
		t.Fatalf("tool aliases tools=%+v choice=%+v", decoded.Tools, decoded.ToolChoice)
	}
	var historical struct {
		Content []struct {
			Name string `json:"name"`
		} `json:"content"`
	}
	if len(decoded.Messages) < 1 || json.Unmarshal(decoded.Messages[0], &historical) != nil || historical.Content[0].Name != decoded.Tools[0].Name {
		t.Fatalf("historical tool_use alias was not synchronized: %s", decoded.Messages[0])
	}
	if len(decoded.Tools[5].CacheControl) == 0 {
		t.Fatal("last tool cache breakpoint was not injected")
	}

	alias := decoded.Tools[0].Name
	response := &http.Response{Header: make(http.Header), Body: io.NopCloser(&oneByteReader{value: `data: {"type":"content_block_start","content_block":{"type":"tool_use","name":"` + alias + `"}}\n\n`})}
	if err := (&Transformer{}).TransformResponse(response, plan, state); err != nil {
		t.Fatal(err)
	}
	restored, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(restored), `"name":"sessions_list"`) || strings.Contains(string(restored), alias) {
		t.Fatalf("response alias was not restored: %s", restored)
	}
}

func TestTransformerMimicAppliesCustomBlocksDatelineAndOneHourTTL(t *testing.T) {
	body := `{"model":"claude","system":"Today’s date is 2026/08/01.",` +
		`"tools":[{"name":"read","cache_control":{"type":"ephemeral","ttl":"5m"}}],` +
		`"messages":[{"role":"user","content":[{"type":"text","text":"<system-reminder>Todayʼs date is 2026/08/01.</system-reminder>","cache_control":{"type":"ephemeral","ttl":"5m"}}]}]}`
	request, _ := http.NewRequest(http.MethodPost, "https://gateway.test/v1/messages", strings.NewReader(body))
	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{
		"client_mode": "mimic", "account_id": "1", "cache_ttl_1h": "true", "normalize_dateline": "true",
		"system_prompt_blocks": `[{"type":"text","text":"{billing_header} version={cc_version} fp={fp}","cache_control":true}]`,
	}}
	if err := (&Transformer{}).TransformRequest(request, plan, nil); err != nil {
		t.Fatal(err)
	}
	rewritten, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatal(err)
	}
	text := string(rewritten)
	for _, expected := range []string{
		`"ttl":"1h"`, "version=" + claudeCLIVersion, "Today's date is 2026-08-01.",
		`\u003csystem-reminder\u003eToday's date is 2026-08-01.\u003c/system-reminder\u003e`,
	} {
		if !strings.Contains(text, expected) {
			t.Fatalf("missing %q in transformed body: %s", expected, rewritten)
		}
	}
	if strings.Contains(text, `"ttl":"5m"`) || strings.Contains(text, "Today’s") || strings.Contains(text, "Todayʼs") {
		t.Fatalf("TTL/dateline normalization incomplete: %s", rewritten)
	}
}

func TestTransformerMimicRewritesMessageCacheBreakpoints(t *testing.T) {
	message := func(role, text string) string {
		return `{"role":"` + role + `","content":[{"type":"text","text":"` + text + `","cache_control":{"type":"ephemeral","ttl":"1h"}}]}`
	}
	body := `{"model":"claude","messages":[` + strings.Join([]string{
		message("user", "u1"), message("assistant", "a1"), message("user", "u2"), message("assistant", "a2"),
	}, ",") + `]}`
	request, _ := http.NewRequest(http.MethodPost, "https://gateway.test/v1/messages", strings.NewReader(body))
	plan := &controlv1.ExecutionPlan{ProtocolOptions: map[string]string{
		"client_mode": "mimic", "account_id": "1", "rewrite_message_cache": "true",
	}}
	if err := (&Transformer{}).TransformRequest(request, plan, nil); err != nil {
		t.Fatal(err)
	}
	rewritten, err := io.ReadAll(request.Body)
	if err != nil {
		t.Fatal(err)
	}
	var decoded struct {
		Messages []struct {
			Content []struct {
				CacheControl json.RawMessage `json:"cache_control"`
			} `json:"content"`
		} `json:"messages"`
	}
	if err := json.Unmarshal(rewritten, &decoded); err != nil {
		t.Fatalf("decode: %v body=%s", err, rewritten)
	}
	if len(decoded.Messages) != 4 {
		t.Fatalf("message count = %d", len(decoded.Messages))
	}
	for index, message := range decoded.Messages {
		hasCache := len(message.Content) > 0 && len(message.Content[0].CacheControl) > 0
		want := index == 0 || index == 3
		if hasCache != want {
			t.Fatalf("message %d cache=%v want=%v body=%s", index, hasCache, want, rewritten)
		}
	}
}

func TestTransformerLateDetectsClaudeCodeAfterAdmissionPrefix(t *testing.T) {
	metadataID := "user_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef_account__session_12345678-1234-1234-1234-123456789abc"
	body := `{"model":"claude","messages":[{"role":"user","content":"hello"}],"metadata":{"user_id":"` + metadataID + `"}}`
	request, _ := http.NewRequest(http.MethodPost, "https://gateway.test/v1/messages", strings.NewReader(body))
	request.Header.Set("User-Agent", "claude-cli/2.1.220 (external, cli)")
	plan := &controlv1.ExecutionPlan{
		UpstreamHeaders: map[string]string{
			"User-Agent": "claude-cli/2.1.220 (external, cli)", "x-client-request-id": "mimic-id",
			"anthropic-beta": "mimic-beta",
		},
		ProtocolOptions: map[string]string{
			"client_mode": "mimic", "original_user_agent": "claude-cli/2.1.220 (external, cli)",
			"passthrough_beta": "passthrough-beta",
		},
	}
	if err := (&Transformer{}).TransformRequest(request, plan, nil); err != nil {
		t.Fatal(err)
	}
	preserved, err := io.ReadAll(request.Body)
	_ = request.Body.Close()
	if err != nil || string(preserved) != body {
		t.Fatalf("late passthrough changed body: %s err=%v", preserved, err)
	}
	if plan.GetProtocolOptions()["client_mode"] != "claude_code_passthrough" || plan.GetUpstreamHeaders()["anthropic-beta"] != "passthrough-beta" {
		t.Fatalf("late passthrough plan = %+v", plan)
	}
	if plan.GetUpstreamHeaders()["x-client-request-id"] != "" || request.Header.Get("User-Agent") == "" {
		t.Fatalf("late passthrough headers plan=%v request=%v", plan.GetUpstreamHeaders(), request.Header)
	}
}
