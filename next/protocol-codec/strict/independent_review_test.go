package strict

import (
	"bytes"
	"testing"
)

func TestReviewOutputFunctionArgumentsKeepIntegers(t *testing.T) {
	for _, protocol := range []string{"openai.chat", "openai.responses"} {
		t.Run(protocol, func(t *testing.T) {
			p := &Plan{protocol: protocol, model: "fixture"}
			raw := []byte(`{"id":"msg-review","type":"message","role":"assistant","model":"fixture","content":[{"type":"tool_use","id":"tool-review","name":"calculate","input":{"value":9007199254740993}}],"stop_reason":"tool_use","usage":{"input_tokens":1,"output_tokens":1}}`)
			out, err := p.JSON(raw)
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.Contains(out, []byte("9007199254740993")) {
				t.Fatalf("tool argument integer changed: %s", out)
			}
		})
	}
}

func TestReviewStreamRejectsStopPayloadIdentityRewrite(t *testing.T) {
	p := &Plan{protocol: "openai.responses", model: "fixture"}
	s := p.NewStream()
	for _, raw := range streamEvents()[:5] {
		if _, err := s.Event(Event{Data: []byte(raw)}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := s.Event(Event{Data: []byte(`{"type":"message_stop","id":"rewritten-message"}`)}); err == nil {
		t.Fatal("message_stop rewrote identity after response.created")
	}
}

func TestReviewStreamRejectsMalformedErrorEnvelope(t *testing.T) {
	for _, payload := range []string{`false`, `"failure"`, `[]`, `{"type":"overloaded_error"}`} {
		s := (&Plan{protocol: "openai.responses"}).NewStream()
		if _, err := s.Event(Event{Data: []byte(`{"type":"error","error":` + payload + `}`)}); err == nil {
			t.Errorf("malformed error accepted: %s", payload)
		}
	}
}

func TestReviewNoneChoiceDoesNotEmitInvalidAnthropicParallelField(t *testing.T) {
	_, wire, err := Prepare("openai.chat", []byte(`{"model":"fixture","max_tokens":12,"messages":[{"role":"user","content":"hello"}],"tool_choice":"none","parallel_tool_calls":false}`))
	if err != nil {
		t.Fatal(err)
	}
	o, err := decodeObject(wire, "test")
	if err != nil {
		t.Fatal(err)
	}
	choice := o["tool_choice"].(object)
	if choice["type"] != "none" {
		t.Fatal("none changed")
	}
	if _, exists := choice["disable_parallel_tool_use"]; exists {
		t.Fatal("none choice carries a field unsupported by Anthropic")
	}
}

func TestReviewStreamToolArgumentsKeepIntegersInFinalItems(t *testing.T) {
	s := (&Plan{protocol: "openai.responses", model: "fixture"}).NewStream()
	rawEvents := []string{
		`{"type":"message_start","message":{"id":"review","type":"message","role":"assistant","model":"fixture","content":[],"stop_reason":null,"usage":{"input_tokens":1,"output_tokens":0}}}`,
		`{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"call-review","name":"calculate","input":{}}}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"value\":9007199254740993}"}}`,
		`{"type":"content_block_stop","index":0}`,
		`{"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":1}}`,
		`{"type":"message_stop"}`,
	}
	var events []Event
	for _, raw := range rawEvents {
		out, err := s.Event(Event{Data: []byte(raw)})
		if err != nil {
			t.Fatal(err)
		}
		events = append(events, out...)
	}
	checked := 0
	for _, ev := range events {
		if ev.Name == "response.output_item.done" || ev.Name == "response.completed" {
			checked++
			if !bytes.Contains(ev.Data, []byte("9007199254740993")) {
				t.Fatalf("final arguments changed: %s", ev.Data)
			}
		}
	}
	if checked != 2 {
		t.Fatalf("missing complete items %d", checked)
	}
	if _, err := s.Flush(); err != nil {
		t.Fatal(err)
	}
}

func TestReviewStrictNestedFieldsAndToolPairing(t *testing.T) {
	for _, body := range []string{
		`{"model":"x","max_tokens":8,"messages":[{"role":"user","content":[{"type":"text","text":"ok","cache_control":{"type":"ephemeral"}}]}]}`,
		`{"model":"x","max_tokens":8,"messages":[{"role":"assistant","tool_calls":[{"type":"function","id":"a","function":{"name":"f","arguments":"{}"}},{"type":"function","id":"a","function":{"name":"f","arguments":"{}"}}]},{"role":"tool","tool_call_id":"a","content":"done"}]}`,
		`{"model":"x","max_tokens":8,"messages":[{"role":"assistant","tool_calls":[{"type":"function","id":"a","function":{"name":"f","arguments":"{}"}}]},{"role":"tool","tool_call_id":"a","content":"done"},{"role":"tool","tool_call_id":"a","content":"duplicate"}]}`,
		`{"model":"x","max_tokens":8,"messages":[{"role":"user","content":"ok"}],"response_format":{"type":"json_schema","json_schema":{"name":"x","strict":true,"description":"Answer with English field values","schema":{"type":"object"}}}}`,
	} {
		if _, _, err := Prepare("openai.chat", []byte(body)); err == nil {
			t.Fatalf("ambiguous or lossy input accepted: %s", body)
		}
	}
}
