package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
)

func restoreFixture(t *testing.T, messages []any) *Request {
	t.Helper()
	return parsed(t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": messages})
}

func wireBody(t *testing.T, raw string) Object {
	t.Helper()
	body, err := decodeObject([]byte(raw))
	if err != nil {
		t.Fatal(err)
	}
	return body
}

func canonical(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	o, _ := decodeObject(append(append([]byte(`{"v":`), b...), '}'))
	var out strings.Builder
	encoder := json.NewEncoder(&out)
	encoder.SetEscapeHTML(false)
	_ = encoder.Encode(o["v"])
	return strings.TrimSuffix(out.String(), "\n")
}

// Shapes captured from Claude Code 2.1.288 with system turns: one record per
// client message joined by blank lines, the Mod's record joined by newlines,
// the CLI's own context around the final turn's group, its effort directive on
// the first system message and the cache breakpoint on the last block.
func TestRestoreSystemMessagesRebuiltHistory(t *testing.T) {
	r := restoreFixture(t, []any{
		Object{"role": "user", "content": "U1"},
		Object{"role": "system", "content": "  H_SYS_1 lead\n"},
		Object{"role": "system", "content": []any{Object{"type": "text", "text": "\tH_SYS_2a\n\npara"}, Object{"type": "text", "text": "H_SYS_2b\n\n"}}},
		Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_x", "name": "weather", "input": Object{}}}},
		Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_x", "content": "R1"}}},
		Object{"role": "system", "content": "H_SYS_3"},
		Object{"role": "system", "content": "H_SYS_4"},
		Object{"role": "assistant", "content": "A2"},
		Object{"role": "user", "content": "U3"},
		Object{"role": "system", "content": " P_SYS_1 "},
		Object{"role": "system", "content": []any{Object{"type": "text", "text": "P_SYS_2a"}, Object{"type": "text", "text": "P_SYS_2b"}}},
	})
	body := wireBody(t, `{"model":"claude-opus-5-5","messages":[
		{"role":"user","content":[{"type":"text","text":"U1"}]},
		{"role":"system","content":"  H_SYS_1 lead\n\n\n\tH_SYS_2a\n\npara\nH_SYS_2b\n\n","output_config":{"effort":"medium"}},
		{"role":"assistant","content":[{"type":"tool_use","id":"toolu_x","name":"mcp__ccgateway__weather","input":{}}]},
		{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_x","content":"R1"}]},
		{"role":"system","content":"H_SYS_3\n\nH_SYS_4"},
		{"role":"assistant","content":[{"type":"text","text":"A2"}]},
		{"role":"user","content":[{"type":"text","text":"U3"}]},
		{"role":"system","content":[{"type":"text","text":"# Environment\nfixture\n\n<total_tokens>1 tokens left</total_tokens>\n\n P_SYS_1 \nP_SYS_2a\nP_SYS_2b\n\nToday's date is 2026-10-06.","cache_control":{"type":"ephemeral"}}]}]}`)
	if err := restoreSystemMessages(body, r.systemGroups()); err != nil {
		t.Fatal(err)
	}
	want := `[{"content":[{"text":"U1","type":"text"}],"role":"user"},` +
		`{"content":[],"output_config":{"effort":"medium"},"role":"system"},` +
		`{"content":[{"text":"  H_SYS_1 lead\n","type":"text"}],"role":"system"},` +
		`{"content":[{"text":"\tH_SYS_2a\n\npara","type":"text"},{"text":"H_SYS_2b\n\n","type":"text"}],"role":"system"},` +
		`{"content":[{"id":"toolu_x","input":{},"name":"mcp__ccgateway__weather","type":"tool_use"}],"role":"assistant"},` +
		`{"content":[{"content":"R1","tool_use_id":"toolu_x","type":"tool_result"}],"role":"user"},` +
		`{"content":[{"text":"H_SYS_3","type":"text"}],"role":"system"},` +
		`{"content":[{"text":"H_SYS_4","type":"text"}],"role":"system"},` +
		`{"content":[{"text":"A2","type":"text"}],"role":"assistant"},` +
		`{"content":[{"text":"U3","type":"text"}],"role":"user"},` +
		`{"content":[{"text":"# Environment\nfixture\n\n<total_tokens>1 tokens left</total_tokens>\n\nToday's date is 2026-10-06.","type":"text"}],"role":"system"},` +
		`{"content":[{"text":" P_SYS_1 ","type":"text"}],"role":"system"},` +
		`{"content":[{"text":"P_SYS_2a","type":"text"},{"cache_control":{"type":"ephemeral"},"text":"P_SYS_2b","type":"text"}],"role":"system"}]`
	if got := canonical(t, body["messages"]); got != want {
		t.Fatalf("restored messages:\n%s\nwant:\n%s", got, want)
	}
}

// A resumed native session holds the Mod's single record for an earlier
// final turn, with the CLI's context of that turn; later CLI-only system
// messages stay as they are.
func TestRestoreSystemMessagesResumedModRecord(t *testing.T) {
	r := restoreFixture(t, []any{
		Object{"role": "user", "content": "U1"},
		Object{"role": "system", "content": "P1"},
		Object{"role": "system", "content": []any{Object{"type": "text", "text": "P2a"}, Object{"type": "text", "text": "P2b"}}},
		Object{"role": "assistant", "content": "ANS"},
		Object{"role": "user", "content": "U2"},
	})
	body := wireBody(t, `{"messages":[
		{"role":"user","content":[{"type":"text","text":"U1"}]},
		{"role":"system","content":"env\n\nP1\nP2a\nP2b\n\ndate"},
		{"role":"assistant","content":[{"type":"text","text":"ANS"}]},
		{"role":"user","content":[{"type":"text","text":"U2"}]},
		{"role":"system","content":[{"type":"text","text":"<total_tokens>1</total_tokens>","cache_control":{"type":"ephemeral"}}]}]}`)
	if err := restoreSystemMessages(body, r.systemGroups()); err != nil {
		t.Fatal(err)
	}
	want := `[{"content":[{"text":"U1","type":"text"}],"role":"user"},` +
		`{"content":"env\n\ndate","role":"system"},` +
		`{"content":[{"text":"P1","type":"text"}],"role":"system"},` +
		`{"content":[{"text":"P2a","type":"text"},{"text":"P2b","type":"text"}],"role":"system"},` +
		`{"content":[{"text":"ANS","type":"text"}],"role":"assistant"},` +
		`{"content":[{"text":"U2","type":"text"}],"role":"user"},` +
		`{"content":[{"cache_control":{"type":"ephemeral"},"text":"<total_tokens>1</total_tokens>","type":"text"}],"role":"system"}]`
	if got := canonical(t, body["messages"]); got != want {
		t.Fatalf("restored messages:\n%s\nwant:\n%s", got, want)
	}
}

// Internal ToolSearch rounds stay in native history and are not client turns;
// continuation rounds of the current request follow the final group.
func TestRestoreSystemMessagesAcrossInternalRounds(t *testing.T) {
	r := restoreFixture(t, []any{
		Object{"role": "user", "content": "U1"},
		Object{"role": "system", "content": "G0"},
		Object{"role": "assistant", "content": "final one"},
		Object{"role": "user", "content": "U2"},
		Object{"role": "system", "content": "G1"},
	})
	body := wireBody(t, `{"messages":[
		{"role":"user","content":"U1"},
		{"role":"system","content":"G0"},
		{"role":"assistant","content":[{"type":"tool_use","id":"toolu_s","name":"ToolSearch","input":{"query":"q"}}]},
		{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_s","content":"found"}]},
		{"role":"system","content":"G1"},
		{"role":"assistant","content":[{"type":"text","text":"final one"}]},
		{"role":"user","content":"U2"},
		{"role":"system","content":"env\n\nG1"},
		{"role":"assistant","content":[{"type":"tool_use","id":"toolu_t","name":"ToolSearch","input":{"query":"q"}}]},
		{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_t","content":"found"}]},
		{"role":"system","content":"<total_tokens>9</total_tokens>"},
		{"role":"system","content":"G1"},
		{"role":"assistant","content":[{"type":"text","text":"not JSON"}]},
		{"role":"user","content":"call the format tool"}]}`)
	if err := restoreSystemMessages(body, r.systemGroups()); err != nil {
		t.Fatal(err)
	}
	var roles []string
	for _, value := range body["messages"].([]any) {
		m := value.(Object)
		text := canonical(t, m["content"])
		roles = append(roles, str(m, "role")+":"+text)
	}
	got := strings.Join(roles, "|")
	// G1 inside the earlier internal round is CLI context of turn 0, not the
	// client's group of turn 1, and stays untouched like the one after the
	// current round.
	want := `user:"U1"|system:[{"text":"G0","type":"text"}]|assistant:[{"id":"toolu_s","input":{"query":"q"},"name":"ToolSearch","type":"tool_use"}]|user:[{"content":"found","tool_use_id":"toolu_s","type":"tool_result"}]|system:"G1"|assistant:[{"text":"final one","type":"text"}]|user:"U2"|system:"env"|system:[{"text":"G1","type":"text"}]|assistant:[{"id":"toolu_t","input":{"query":"q"},"name":"ToolSearch","type":"tool_use"}]|user:[{"content":"found","tool_use_id":"toolu_t","type":"tool_result"}]|system:"<total_tokens>9</total_tokens>"|system:"G1"|assistant:[{"text":"not JSON","type":"text"}]|user:"call the format tool"`
	if got != want {
		t.Fatalf("restored:\n%s\nwant:\n%s", got, want)
	}
}

// Anything but one exact, whole-attachment occurrence in the right turn fails.
func TestRestoreSystemMessagesRefusesMismatch(t *testing.T) {
	r := restoreFixture(t, []any{
		Object{"role": "user", "content": "U1"},
		Object{"role": "system", "content": "first\n\nhalf"},
		Object{"role": "assistant", "content": "A"},
		Object{"role": "user", "content": "U2"},
		Object{"role": "system", "content": "S"},
	})
	ok := `{"role":"user","content":"U1"},{"role":"system","content":"first\n\nhalf"},{"role":"assistant","content":"A"},{"role":"user","content":"U2"},`
	for name, wire := range map[string]string{
		"missing":          `{"messages":[` + ok + `{"role":"system","content":"env"}]}`,
		"duplicate":        `{"messages":[` + ok + `{"role":"system","content":"S\n\nenv\n\nS"}]}`,
		"duplicate across": `{"messages":[` + ok + `{"role":"system","content":"S"},{"role":"system","content":"S"}]}`,
		"partial text":     `{"messages":[` + ok + `{"role":"system","content":"env\n\nSS"}]}`,
		"cut at blank":     `{"messages":[{"role":"user","content":"U1"},{"role":"system","content":"first"},{"role":"system","content":"half"},{"role":"assistant","content":"A"},{"role":"user","content":"U2"},{"role":"system","content":"S"}]}`,
		"wrong turn":       `{"messages":[{"role":"user","content":"U1"},{"role":"assistant","content":"A"},{"role":"user","content":"U2"},{"role":"system","content":"first\n\nhalf\n\nS"}]}`,
		"user reminder":    `{"messages":[` + ok[:len(ok)-1] + `,{"role":"user","content":[{"type":"text","text":"<system-reminder>\nS\n</system-reminder>"}]}]}`,
		"turn missing":     `{"messages":[{"role":"user","content":"U1"},{"role":"system","content":"first\n\nhalf"}]}`,
		"no messages":      `{"model":"m"}`,
	} {
		body := wireBody(t, wire)
		before := canonical(t, body)
		err := restoreSystemMessages(body, r.systemGroups())
		if err == nil {
			t.Fatalf("%s: restored %s", name, canonical(t, body))
		}
		t.Logf("%s: %v", name, err)
		if canonical(t, body) != before {
			t.Fatalf("%s: body changed despite the failure", name)
		}
	}
}

func TestOutboundRelayRestoresOrRefuses(t *testing.T) {
	var received []string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		data, _ := io.ReadAll(r.Body)
		received = append(received, r.URL.Path+" "+string(data))
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "event: message_stop\ndata: {}\n\n")
	}))
	defer upstream.Close()
	req := restoreFixture(t, []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": "a<b>&c"}, Object{"role": "system", "content": "two"}})
	relay, err := startOutboundRelay(req, []string{"ANTHROPIC_BASE_URL=" + upstream.URL})
	if err != nil {
		t.Fatal(err)
	}
	defer relay.Close()
	post := func(path, body string) int {
		response, err := http.Post(relay.URL+path, "application/json", strings.NewReader(body))
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		_, _ = io.ReadAll(response.Body)
		return response.StatusCode
	}
	if status := post("/v1/messages/count_tokens", `{"messages":[{"role":"user","content":"q"}]}`); status != 400 || relay.Failure() != nil {
		t.Fatalf("token count: status %d failure %v", status, relay.Failure())
	}
	if status := post("/v1/messages?beta=true", `{"messages":[{"role":"user","content":"q"},{"role":"system","content":"date\n\na<b>&c\n\ntwo"}]}`); status != 200 || relay.Restored() != 1 {
		t.Fatalf("model request: status %d restored %d", status, relay.Restored())
	}
	if len(received) != 1 || received[0] != `/v1/messages {"messages":[{"content":"q","role":"user"},{"content":"date","role":"system"},{"content":[{"text":"a<b>&c","type":"text"}],"role":"system"},{"content":[{"text":"two","type":"text"}],"role":"system"}]}` {
		t.Fatalf("upstream received %q", received)
	}
	if status := post("/v1/messages", `{"messages":[{"role":"user","content":"q"},{"role":"user","content":"<system-reminder>\na<b>&c\n\ntwo\n</system-reminder>"}]}`); status != 400 || relay.Failure() == nil || len(received) != 1 {
		t.Fatalf("altered request forwarded: status %d failure %v", status, relay.Failure())
	}
}

// A resumed native session resends every earlier turn's own context with the
// client text in the middle (environment, model, total_tokens, client, date),
// mostly as strings; the effort directive sits on the turn's first system
// message; the new turn adds only an increment. Every turn is separated, and
// the same input always yields the same bytes.
func TestRestoreSystemMessagesEveryResumedTurn(t *testing.T) {
	r := restoreFixture(t, []any{
		Object{"role": "user", "content": "U1"},
		Object{"role": "system", "content": "S1"},
		Object{"role": "assistant", "content": "A1"},
		Object{"role": "user", "content": "U2"},
		Object{"role": "system", "content": []any{Object{"type": "text", "text": "S2a"}, Object{"type": "text", "text": "S2b"}}},
		Object{"role": "system", "content": "S3"},
		Object{"role": "assistant", "content": "A2"},
		Object{"role": "user", "content": "U3"},
		Object{"role": "system", "content": "S4"},
	})
	raw := `{"model":"claude-opus-5","messages":[
		{"role":"user","content":[{"type":"text","text":"U1"}]},
		{"role":"system","content":"# Environment\nE\n\nmodel M\n\n<total_tokens>1</total_tokens>\n\nS1\n\nToday's date is D.","output_config":{"effort":"high","timing":"t"}},
		{"role":"assistant","content":[{"type":"text","text":"A1"}]},
		{"role":"user","content":[{"type":"text","text":"U2"}]},
		{"role":"system","content":"<total_tokens>2</total_tokens>\n\nS2a\nS2b\n\nS3"},
		{"role":"assistant","content":[{"type":"text","text":"A2"}]},
		{"role":"user","content":[{"type":"text","text":"U3"}]},
		{"role":"system","content":[{"type":"text","text":"# Environment update\nX\n\nS4","cache_control":{"type":"ephemeral"}},{"type":"text","text":"suffix","cache_control":{"type":"ephemeral","ttl":"1h"}},{"type":"tool_addition","tool":{"name":"t"}}]}]}`
	relay := &outboundRelay{}
	first, err := relay.adapt(r, r.systemGroups(), []byte(raw), false)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 5; i++ {
		again, err := relay.adapt(r, r.systemGroups(), []byte(raw), false)
		if err != nil || !bytes.Equal(again, first) {
			t.Fatal("restoration is not deterministic")
		}
	}
	body := wireBody(t, string(first))
	want := `[{"content":[{"text":"U1","type":"text"}],"role":"user"},` +
		`{"content":"# Environment\nE\n\nmodel M\n\n<total_tokens>1</total_tokens>\n\nToday's date is D.","output_config":{"effort":"high","timing":"t"},"role":"system"},` +
		`{"content":[{"text":"S1","type":"text"}],"role":"system"},` +
		`{"content":[{"text":"A1","type":"text"}],"role":"assistant"},` +
		`{"content":[{"text":"U2","type":"text"}],"role":"user"},` +
		`{"content":"<total_tokens>2</total_tokens>","role":"system"},` +
		`{"content":[{"text":"S2a","type":"text"},{"text":"S2b","type":"text"}],"role":"system"},` +
		`{"content":[{"text":"S3","type":"text"}],"role":"system"},` +
		`{"content":[{"text":"A2","type":"text"}],"role":"assistant"},` +
		`{"content":[{"text":"U3","type":"text"}],"role":"user"},` +
		`{"content":[{"cache_control":{"type":"ephemeral"},"text":"# Environment update\nX","type":"text"},{"cache_control":{"ttl":"1h","type":"ephemeral"},"text":"suffix","type":"text"},{"tool":{"name":"t"},"type":"tool_addition"}],"role":"system"},` +
		`{"content":[{"text":"S4","type":"text"}],"role":"system"}]`
	if got := canonical(t, body["messages"]); got != want {
		t.Fatalf("restored:\n%s\nwant:\n%s", got, want)
	}
	if str(body, "model") != "claude-opus-5" {
		t.Fatal("model changed by the relay")
	}
}

// Claude Code's 400 classifiers (CLI 2.1.288) retry with an altered request:
// system turns off (and locked off for the session), thinking or effort
// removed, cache_control moved and more. Text the relay gives the CLI must not
// resemble any of them.
func TestRelayTextAvoidsCLIRecoveryWording(t *testing.T) {
	cliPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)role .{0,2}system.{0,2} must (?:precede an|follow a)|use the top-level .{0,2}system.{0,2} parameter`),
		regexp.MustCompile(`(?i)text-only role .{0,2}system.{0,2} messages require`),
		regexp.MustCompile(`(?i)system messages?\b|role .{0,2}system`),
		regexp.MustCompile(`(?i)unexpected role|input message role|not supported|unsupported|cache_control|anthropic[-_]beta|mid.conversation`),
		regexp.MustCompile(`(?i)thinking|signature|effort|structured|prompt is too long|too long|max_tokens|image|document|unknown|unrecognized|additional propert|credit|fallback|tool`),
	}
	for _, text := range []string{relayRefusedMessage, relayUpstreamMessage} {
		for _, p := range cliPatterns {
			if p.MatchString(text) {
				t.Fatalf("%q matches %s", text, p)
			}
		}
	}
	// The detailed refusal reason stays in the gateway.
	if strings.Contains(relayRefusedMessage, "system") {
		t.Fatal("refusal detail reached the CLI")
	}
}

func TestOutboundRelayKeepsUpstreamErrorForClient(t *testing.T) {
	official := `{"type":"error","error":{"type":"invalid_request_error","message":"messages.3: role 'system' must precede an 'assistant' message or end the array; the directive-only form (content: [] with output_config) is accepted at any position"},"request_id":"req_fixture"}`
	limited := `{"type":"error","error":{"type":"rate_limit_error","message":"Number of request tokens has exceeded your per-minute rate limit"}}`
	forwarded := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		forwarded++
		switch r.URL.Query().Get("status") {
		case "ok":
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = io.WriteString(w, "event: message_stop\ndata: {}\n\n")
		case "429":
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(429)
			_, _ = io.WriteString(w, limited)
		default:
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Request-Id", "req_fixture")
			w.WriteHeader(400)
			_, _ = io.WriteString(w, official)
		}
	}))
	defer upstream.Close()
	req := restoreFixture(t, []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": "s"}})
	// Without an abort hook the relay answers the CLI at once; with one it
	// stops the CLI (here: cancels the client request) and answers nothing.
	var cancelClient context.CancelFunc
	start := func(hook bool) (*outboundRelay, *int) {
		relay, err := startOutboundRelay(req, []string{"ANTHROPIC_BASE_URL=" + upstream.URL})
		if err != nil {
			t.Fatal(err)
		}
		aborted := 0
		if hook {
			relay.setAbort(func() { aborted++; cancelClient() })
		}
		return relay, &aborted
	}
	post := func(relay *outboundRelay, path, body string) (int, string, http.Header) {
		var ctx context.Context
		ctx, cancelClient = context.WithCancel(context.Background())
		defer cancelClient()
		request, _ := http.NewRequestWithContext(ctx, "POST", relay.URL+path, strings.NewReader(body))
		request.Header.Set("Accept-Encoding", "gzip, br")
		response, err := http.DefaultClient.Do(request)
		if err != nil {
			return 0, err.Error(), nil
		}
		defer response.Body.Close()
		data, _ := io.ReadAll(response.Body)
		return response.StatusCode, string(data), response.Header
	}
	restorable := `{"messages":[{"role":"user","content":"q"},{"role":"system","content":"env\n\ns"}]}`

	// A rejected restored request: the original is kept for the client and
	// the CLI's text is neutral.
	relay, _ := start(false)
	status, cliBody, headers := post(relay, "/v1/messages", restorable)
	if status != 400 || strings.Contains(cliBody, "system") || !strings.Contains(cliBody, relayUpstreamMessage) || !strings.Contains(cliBody, `"invalid_request_error"`) || headers.Get("Request-Id") != "req_fixture" {
		t.Fatalf("CLI received %d %s", status, cliBody)
	}
	kept := relay.UpstreamError()
	if kept == nil || kept.Status != 400 || string(kept.Body) != official || kept.ContentType != "application/json" || relay.Failure() != nil {
		t.Fatalf("upstream error not kept as sent: %+v", kept)
	}
	// Nothing more is forwarded for this run, not even a valid request.
	before := forwarded
	if status, body, _ := post(relay, "/v1/messages?status=ok", restorable); status != 400 || !strings.Contains(body, relayRefusedMessage) || forwarded != before {
		t.Fatalf("stopped relay forwarded: %d %s", status, body)
	}
	relay.Close()
	// With the Runner's hook the CLI is stopped before it reads any answer.
	relay, aborted := start(true)
	if status, _, _ := post(relay, "/v1/messages", restorable); status != 0 || *aborted != 1 || relay.UpstreamError() == nil {
		t.Fatalf("rejected request: status %d aborted %d", status, *aborted)
	}
	relay.Close()

	// A restoration refusal: detail stays in the gateway.
	relay, _ = start(false)
	status, cliBody, _ = post(relay, "/v1/messages", `{"messages":[{"role":"user","content":"q"}]}`)
	if status != 400 || !strings.Contains(cliBody, relayRefusedMessage) || strings.Contains(cliBody, "system") || relay.Failure() == nil {
		t.Fatalf("refusal: %d %s", status, cliBody)
	}
	relay.Close()
	relay, aborted = start(true)
	if status, _, _ := post(relay, "/v1/messages", `{"messages":[{"role":"user","content":"q"}]}`); status != 0 || *aborted != 1 || relay.Failure() == nil {
		t.Fatalf("refusal: status %d aborted %d", status, *aborted)
	}
	relay.Close()

	// Rate limits pass through for the CLI's own backoff; the error is kept in
	// case the run fails, and a success passes through untouched.
	relay, aborted = start(true)
	defer relay.Close()
	status, cliBody, headers = post(relay, "/v1/messages?status=429", restorable)
	if status != 429 || cliBody != limited || headers.Get("Retry-After") != "1" || *aborted != 0 || relay.UpstreamError() == nil || relay.UpstreamError().Status != 429 {
		t.Fatalf("429: %d %s", status, cliBody)
	}
	if status, body, _ := post(relay, "/v1/messages?status=ok", restorable); status != 200 || body != "event: message_stop\ndata: {}\n\n" {
		t.Fatalf("success changed: %d %s", status, body)
	}
}
