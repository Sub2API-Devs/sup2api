package main

import (
	"strings"
	"testing"
)

func TestSanitize(t *testing.T) {
	in := "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"signature_delta\",\"signature\":\"EqQBCgIY\"}}\n\n" +
		"data: {\"id\":\"msg_013Zva2CMHLNnXjNJJKqJ2EF\",\"content\":[{\"type\":\"tool_use\",\"id\":\"toolu_01T1x1\"}],\"usage\":{\"input_tokens\":3}}\n\n"
	out := string(sanitizeSSE([]byte(in)))
	for _, secret := range []string{"EqQBCgIY", "013Zva2CMHLNnXjNJJKqJ2EF", "01T1x1"} {
		if strings.Contains(out, secret) {
			t.Errorf("%s left in %s", secret, out)
		}
	}
	for _, kept := range []string{"event: content_block_delta", `"signature":"` + fakeSecret, `"id":"msg_`, `"id":"toolu_`, `"input_tokens":3`} {
		if !strings.Contains(out, kept) {
			t.Errorf("%s missing in %s", kept, out)
		}
	}
	if fakeID("call_x") != fakeID("call_x") || fakeID("call_x") == fakeID("call_y") {
		t.Error("fake ids must be stable and distinct")
	}
}

func TestWithStream(t *testing.T) {
	body := []byte(`{"model":"m","stream":true,"stream_options":{"include_usage":true}}`)
	if got := string(withStream("openai.chat", body, false)); got != `{"model":"m","stream":false}` {
		t.Errorf("chat json %s", got)
	}
	if got := string(withStream("anthropic.messages", body, true)); got != `{"model":"m","stream":true}` {
		t.Errorf("anthropic stream %s", got)
	}
	if got := string(withStream("gemini.generate", body, true)); got != string(body) {
		t.Errorf("gemini %s", got)
	}
}
