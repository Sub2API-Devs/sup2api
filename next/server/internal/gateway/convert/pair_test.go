package convert

import (
	"errors"
	"fmt"
	"strings"
	"testing"
)

// testPair is anthropic upstream serving a responses client whose custom
// tool apply_patch went upstream wrapped as a function.
func testPair(req requestFunc) *pairConverter {
	return newPair("openai.responses", "anthropic.messages", GradeFair, req)
}

func wrappedRequest(body []byte, opt Options, l *losses) ([]byte, respOpts, error) {
	if string(body) == "bad" {
		return nil, respOpts{}, &RequestError{Cause: errors.New("cannot")}
	}
	l.add(LossOther, "top_k")
	l.add(LossTool, "tools[1]")
	l.add(LossOther, "top_k")
	return []byte(`{"converted":true}`), respOpts{customTools: map[string]bool{"apply_patch": true}}, nil
}

const patchCall = `{"id":"msg_1","model":"claude","content":[` +
	`{"type":"thinking","thinking":"plan","signature":"sig"},` +
	`{"type":"tool_use","id":"toolu_1","name":"apply_patch","input":{"input":"*** Begin Patch"}}],` +
	`"stop_reason":"tool_use","usage":{"input_tokens":10,"output_tokens":5}}`

func TestPairPrepare(t *testing.T) {
	p := testPair(wrappedRequest)
	if _, err := p.Response([]byte(patchCall)); !errors.Is(err, errUnbound) {
		t.Fatalf("unbound Response: %v", err)
	}
	if _, err := p.NewStream().Event(Event{}); !errors.Is(err, errUnbound) {
		t.Fatalf("unbound stream: %v", err)
	}
	bound, out, err := p.Prepare([]byte(`{}`), Options{Model: "gpt-5"})
	if err != nil || string(out) != `{"converted":true}` {
		t.Fatalf("Prepare: %s %v", out, err)
	}
	if bound.From() != p.From() || bound.To() != p.To() || bound.Grade() != GradeFair {
		t.Fatal("bound converter changed its pair")
	}
	if got := fmt.Sprint(Losses(bound)); got != "[{tool tools[1] 0} {other top_k 0}]" {
		t.Errorf("request losses %s", got)
	}
	if bound.(*pairConverter).opts.model != "gpt-5" {
		t.Error("client model not bound")
	}
	var re *RequestError
	if _, _, err := p.Prepare([]byte("bad"), Options{}); !errors.As(err, &re) {
		t.Errorf("RequestError not kept: %v", err)
	}
	if _, _, err := newPair("openai.chat", "nowhere", GradeFair, wrappedRequest).Prepare(nil, Options{}); err == nil {
		t.Error("a pair without reader must not prepare")
	}
}

func TestPairResponseUnwrapsCustomTools(t *testing.T) {
	bound, _, err := testPair(wrappedRequest).Prepare([]byte(`{}`), Options{Model: "gpt-5"})
	if err != nil {
		t.Fatal(err)
	}
	out, err := bound.Response([]byte(patchCall))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`"type":"custom_tool_call"`, `"input":"*** Begin Patch"`, `"call_id":"toolu_1"`} {
		if !strings.Contains(string(out), want) {
			t.Errorf("reply lacks %s: %s", want, out)
		}
	}
	if strings.Contains(string(out), "encrypted_content") || strings.Contains(string(out), "sig") {
		t.Errorf("reasoning state crossed protocols: %s", out)
	}
	if got := fmt.Sprint(Losses(bound)); got != "[{reasoning response.content[0] 0} {tool tools[1] 0} {other top_k 0}]" {
		t.Errorf("losses %s", got)
	}
}

func TestPairStreamUnwrapsCustomTools(t *testing.T) {
	bound, _, err := testPair(wrappedRequest).Prepare([]byte(`{}`), Options{})
	if err != nil {
		t.Fatal(err)
	}
	stream := `event: message_start
data: {"type":"message_start","message":{"id":"msg_1","model":"claude","usage":{"input_tokens":10}}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_1","name":"apply_patch","input":{}}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"input\":\"*** Be"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"gin Patch\"}"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":5}}

`
	out, err := runStream(bound, parseSSE([]byte(stream)))
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{`"type":"custom_tool_call"`, `response.custom_tool_call_input.delta`, `"delta":"*** Begin Patch"`,
		`"input":"*** Begin Patch"`, `response.completed`} {
		if !strings.Contains(string(out), want) {
			t.Errorf("stream lacks %s:\n%s", want, out)
		}
	}
	if _, err := runStream(bound, parseSSE([]byte(stream[:strings.Index(stream, "event: message_delta")]))); !errors.Is(err, errNoFinish) {
		t.Errorf("truncated stream: %v", err)
	}
}

func TestReaderWriterTables(t *testing.T) {
	for _, p := range []string{"openai.chat", "openai.responses", "anthropic.messages", "gemini.generate", "gemini.stream_generate"} {
		if readerFor(p) == nil || writerFor(p) == nil {
			t.Errorf("%s: missing reader or writer", p)
		}
	}
	if readerFor("anthropic.count_tokens") != nil {
		t.Error("count_tokens has no reader")
	}
}
