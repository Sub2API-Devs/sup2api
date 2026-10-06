package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestSystemMessageParsingAndPendingTurn(t *testing.T) {
	v := basic()
	v["messages"] = []any{
		Object{"role": "user", "content": "first"},
		Object{"role": "system", "content": "middle"},
		Object{"role": "assistant", "content": "answer"},
		Object{"role": "user", "content": "second"},
		Object{"role": "system", "content": []any{Object{"type": "text", "text": "late one", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}, Object{"type": "text", "text": "late two"}}},
		Object{"role": "system", "content": "late three"},
	}
	r := parsed(t, v)
	if len(r.Messages) != 6 || r.Messages[1].Role != "system" || r.pendingStart() != 3 {
		t.Fatalf("system positions lost: %#v", r.Messages)
	}
	if pending := r.pendingWireMessage(); pending.Role != "user" || len(pending.Content) != 1 || str(pending.Content[0], "text") != "second" {
		t.Fatalf("pending input changed: %#v", pending)
	}
	if got := strings.Join(r.pendingSystems(), "|"); got != "late one|late two|late three" {
		t.Fatalf("pending systems = %q", got)
	}
	if _, ok := r.Messages[4].Content[0]["cache_control"]; ok {
		t.Fatal("cache_control kept in the history fingerprint")
	}
	for _, invalid := range []Object{
		{"role": "system", "content": []any{Object{"type": "image"}}},
		{"role": "system", "content": []any{Object{"type": "text", "text": 42}}},
		{"role": "system", "content": []any{Object{"type": "text", "text": ""}}},
		{"role": "system", "content": []any{}},
		{"role": "system", "content": ""},
		{"role": "system", "content": "x", "output_config": Object{"effort": "high"}},
		{"role": "system", "content": "x", "clear_at": "next_user_message"},
	} {
		v["messages"] = []any{Object{"role": "user", "content": "q"}, invalid}
		b, _ := json.Marshal(v)
		if _, err := parseRequest(b); err == nil {
			t.Fatalf("accepted invalid system: %#v", invalid)
		}
	}
}

// Claude Code shortens long mod context; such input must be refused, not cut.
func TestPendingSystemLengthLimits(t *testing.T) {
	v := basic()
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": strings.Repeat("a", pendingSystemBlockLimit)}}
	parsed(t, v)
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": strings.Repeat("a", pendingSystemBlockLimit+1)}}
	b, _ := json.Marshal(v)
	if _, err := parseRequest(b); err == nil {
		t.Fatal("accepted an oversized pending system block")
	}
	// Characters outside the BMP count twice, as Claude Code counts them.
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": strings.Repeat("😀", pendingSystemBlockLimit/2+1)}}
	b, _ = json.Marshal(v)
	if _, err := parseRequest(b); err == nil {
		t.Fatal("counted UTF-16 length incorrectly")
	}
	half := strings.Repeat("b", pendingSystemBlockLimit)
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": half}, Object{"role": "system", "content": half}, Object{"role": "system", "content": "c"}}
	b, _ = json.Marshal(v)
	if _, err := parseRequest(b); err == nil {
		t.Fatal("accepted oversized pending system total")
	}
	// Committed history is written as a record and is not shortened.
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": half}, Object{"role": "system", "content": half}, Object{"role": "system", "content": "c"}, Object{"role": "assistant", "content": "a"}, Object{"role": "user", "content": "next"}}
	parsed(t, v)
}

func TestSystemRowMatchesModRecord(t *testing.T) {
	raw, id := systemRow([]string{"one", "two"}, "parent-uuid", "session", "/work", "2.1.288")
	var row Object
	if err := json.Unmarshal(raw, &row); err != nil {
		t.Fatal(err)
	}
	attachment := row["attachment"].(Object)
	rendered := row["rendered"].([]any)[0].(Object)
	if str(row, "uuid") != id || str(row, "parentUuid") != "parent-uuid" || str(row, "type") != "attachment" || str(row, "renderedRole") != "system" ||
		str(attachment, "type") != "hook_additional_context" || str(attachment, "hookName") != "prompt.submit" || str(attachment, "hookEvent") != "UserPromptSubmit" ||
		str(rendered, "content") != "<system-reminder>\nprompt.submit hook additional context: one\ntwo\n</system-reminder>" {
		t.Fatalf("record shape: %s", raw)
	}
	before := []json.RawMessage{raw}
	if nativeSystemRecorded(before, before, []string{"one", "two"}) {
		t.Fatal("history record counted as the pending turn's")
	}
	other, _ := systemRow([]string{"one", "two"}, id, "session", "/work", "2.1.288")
	if !nativeSystemRecorded(before, append(before, other), []string{"one", "two"}) || nativeSystemRecorded(before, append(before, other), []string{"one"}) {
		t.Fatal("pending record not matched exactly")
	}
}

func TestOutboundRelayPreservesAuthAndSSE(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/messages" || r.URL.RawQuery != "beta=true" || r.Header.Get("Authorization") != "Bearer fixture" || r.Header.Get("Anthropic-Beta") != "fixture-beta" {
			t.Errorf("request metadata changed")
		}
		data, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(data)
		thinking, _ := body["thinking"].(Object)
		if str(thinking, "display") != "omitted" || str(thinking, "type") != "adaptive" || !strings.Contains(string(data), `"role":"system"`) {
			t.Errorf("relay body = %s", data)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("request-id", "fixture-id")
		_, _ = io.WriteString(w, "event: message_stop\ndata: {}\n\n")
	}))
	defer upstream.Close()
	r := &Request{Thinking: Object{"type": "adaptive", "display": "omitted"}}
	relay, err := startOutboundRelay(r, []string{"ANTHROPIC_BASE_URL=" + upstream.URL + "/api"})
	if err != nil {
		t.Fatal(err)
	}
	defer relay.Close()
	body := `{"messages":[{"role":"user","content":"q"},{"role":"system","content":"s"}],"thinking":{"type":"adaptive"}}`
	request, _ := http.NewRequest("POST", relay.URL+"/v1/messages?beta=true", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer fixture")
	request.Header.Set("Anthropic-Beta", "fixture-beta")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	data, _ := io.ReadAll(response.Body)
	if response.StatusCode != 200 || response.Header.Get("request-id") != "fixture-id" || string(data) != "event: message_stop\ndata: {}\n\n" {
		t.Fatal("SSE response changed")
	}
	unknown, err := http.Get(strings.Split(relay.URL, "/ccg-relay/")[0] + "/v1/messages")
	if err != nil {
		t.Fatal(err)
	}
	defer unknown.Body.Close()
	if unknown.StatusCode != 404 {
		t.Fatal("unguarded relay path")
	}
}

func TestRelayProxyUsesRequestEnvironment(t *testing.T) {
	target, _ := url.Parse("https://api.anthropic.com")
	fn, err := relayProxy([]string{"HTTPS_PROXY=http://proxy.invalid:8080"}, target)
	if err != nil || fn == nil {
		t.Fatal("proxy not selected")
	}
	selected, err := fn(&http.Request{URL: target})
	if err != nil || selected.Host != "proxy.invalid:8080" {
		t.Fatal("wrong proxy")
	}
	fn, err = relayProxy([]string{"HTTPS_PROXY=http://proxy.invalid:8080", "NO_PROXY=.anthropic.com"}, target)
	if err != nil || fn != nil {
		t.Fatal("NO_PROXY ignored")
	}
}

func TestOutboundRelaySharedRouteRejectsRemoteAndExpires(t *testing.T) {
	req := parsed(t, basic())
	relay, err := startOutboundRelay(req, nil, "http://127.0.0.1:8787")
	if err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest("POST", relay.URL+"/v1/messages", nil)
	r.RemoteAddr = "203.0.113.1:444"
	w := httptest.NewRecorder()
	if !serveOutboundRelay(w, r) || w.Code != http.StatusNotFound {
		t.Fatal("remote relay request allowed")
	}
	relay.Close()
	if serveOutboundRelay(httptest.NewRecorder(), r) {
		t.Fatal("expired relay remains reachable")
	}
}
