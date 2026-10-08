package strict

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"testing"
)

func mustPlan(t *testing.T, protocol, body string) *Plan {
	t.Helper()
	p, _, e := Prepare(protocol, []byte(body))
	if e != nil {
		t.Fatal(e)
	}
	return p
}
func obj(t *testing.T, b []byte) object {
	t.Helper()
	o, e := decodeObject(b, "test")
	if e != nil {
		t.Fatal(e)
	}
	return o
}
func TestStrictRequestPreservesParametersToolsAndLongHistory(t *testing.T) {
	messages := []any{object{"role": "system", "content": "  exact system\n"}}
	for i := 0; i < 40; i++ {
		messages = append(messages, object{"role": "user", "content": "user"}, object{"role": "assistant", "content": "assistant"})
	}
	messages = append(messages, object{"role": "user", "content": "next"})
	req := object{"model": "client-alias", "max_tokens": json.Number("12"), "temperature": json.Number("0.25"), "stop": []any{"END"}, "parallel_tool_calls": false, "tools": []any{object{"type": "function", "function": object{"name": "Read", "description": "exact ...\n", "parameters": object{"type": "object", "properties": object{"x": object{"type": "integer", "minimum": json.Number("9007199254740993")}}}}}}, "messages": messages}
	raw, _ := json.Marshal(req)
	_, wire, e := Prepare("openai.chat", raw)
	if e != nil {
		t.Fatal(e)
	}
	out := obj(t, wire)
	if out["max_tokens"] != json.Number("12") || out["model"] != "client-alias" {
		t.Fatal(string(wire))
	}
	if len(out["messages"].([]any)) != 81 {
		t.Fatal("history changed")
	}
	if out["system"].([]any)[0].(object)["text"] != "  exact system\n" {
		t.Fatal("system changed")
	}
	if !strings.Contains(string(wire), "9007199254740993") {
		t.Fatal("integer precision lost")
	}
	if out["tool_choice"].(object)["disable_parallel_tool_use"] != true {
		t.Fatal("parallel control lost")
	}
}
func TestStrictRejectsUnsupportedAndMalformedRequest(t *testing.T) {
	for _, extra := range []string{`,"unknown":null`, `,"seed":1`, `,"n":2`, `,"max_completion_tokens":13`, `,"stream_options":{"ignored":true}`, `,"temperature":1.5`} {
		_, _, e := Prepare("openai.chat", []byte(`{"model":"x","max_tokens":12,"messages":[{"role":"user","content":"hello"}]`+extra+`}`))
		if e == nil {
			t.Errorf("accepted %s", extra)
		}
	}
	for _, messages := range []string{`[{"role":"user","content":"a"},{"role":"system","content":"b"}]`, `[{"role":"developer","content":"b"}]`, `[{"role":"tool","tool_call_id":"missing","content":"result"}]`, `[{"role":"assistant","tool_calls":[{"type":"function","id":"id","function":{"name":"f","arguments":"{}"}}]}]`} {
		_, _, e := Prepare("openai.chat", []byte(`{"model":"x","max_tokens":12,"messages":`+messages+`}`))
		if e == nil {
			t.Errorf("accepted %s", messages)
		}
	}
}
func TestStrictToolRoundtripPairing(t *testing.T) {
	body := `{"model":"x","max_tokens":12,"messages":[{"role":"user","content":"call"},{"role":"assistant","content":null,"tool_calls":[{"type":"function","id":"id1","function":{"name":"f","arguments":"{\"big\":9007199254740993}"}},{"type":"function","id":"id2","function":{"name":"f","arguments":"{}"}}]},{"role":"tool","tool_call_id":"id1","content":"a"},{"role":"tool","tool_call_id":"id2","content":"b"}]}`
	_, wire, e := Prepare("openai.chat", []byte(body))
	if e != nil {
		t.Fatal(e)
	}
	out := obj(t, wire)
	ms := out["messages"].([]any)
	if len(ms) != 3 || len(ms[2].(object)["content"].([]any)) != 2 {
		t.Fatal(string(wire))
	}
}

const plainResponse = `{"id":"msg1","type":"message","role":"assistant","model":"actual-model","content":[{"type":"text","text":"hi"}],"stop_reason":"end_turn","stop_sequence":null,"usage":{"input_tokens":2,"output_tokens":3,"cache_read_input_tokens":5,"cache_creation_input_tokens":7}}`

func TestStrictJSONAndOpaqueHistory(t *testing.T) {
	p := mustPlan(t, "openai.responses", `{"model":"alias","max_output_tokens":20,"input":"hello"}`)
	raw := strings.Replace(plainResponse, `[{"type":"text","text":"hi"}]`, `[{"type":"thinking","thinking":"secret","signature":"opaque-signature"},{"type":"text","text":"hi"}]`, 1)
	answer, e := p.JSON([]byte(raw))
	if e != nil {
		t.Fatal(e)
	}
	o := obj(t, answer)
	usage := o["usage"].(object)
	if usage["input_tokens"] != json.Number("14") || usage["total_tokens"] != json.Number("17") {
		t.Fatal(string(answer))
	}
	outputs := o["output"].([]any)
	if outputs[0].(object)["type"] != "reasoning" || outputs[1].(object)["type"] != "message" {
		t.Fatal("order changed")
	}
	req := object{"model": "different-client-alias", "max_output_tokens": 20, "input": append([]any{object{"role": "user", "content": "hello"}}, outputs...)}
	b, _ := json.Marshal(req)
	_, wire, e := Prepare("openai.responses", b)
	if e != nil {
		t.Fatal(e)
	}
	if !strings.Contains(string(wire), "opaque-signature") {
		t.Fatal("signature lost")
	}
	chat := mustPlan(t, "openai.chat", `{"model":"x","max_tokens":20,"messages":[{"role":"user","content":"hello"}]}`)
	if _, e = chat.JSON([]byte(raw)); e == nil {
		t.Fatal("Chat silently dropped signature")
	}
}
func streamEvents() []string {
	return []string{`{"type":"message_start","message":{"id":"msg1","type":"message","role":"assistant","model":"actual-model","content":[],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":2,"output_tokens":0}}}`, `{"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}`, `{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hello"}}`, `{"type":"content_block_stop","index":0}`, `{"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":3}}`, `{"type":"message_stop"}`}
}
func TestStrictSSETerminalAndIndependentStreams(t *testing.T) {
	p := mustPlan(t, "openai.chat", `{"model":"x","max_tokens":20,"stream":true,"stream_options":{"include_usage":true},"messages":[{"role":"user","content":"hello"}]}`)
	var wg sync.WaitGroup
	for i := 0; i < 32; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s := p.NewStream()
			out := []Event{}
			for _, v := range streamEvents() {
				events, e := s.Event(Event{Data: []byte(v)})
				if e != nil {
					t.Error(e)
					return
				}
				out = append(out, events...)
			}
			if _, e := s.Flush(); e != nil {
				t.Error(e)
			}
			if string(out[len(out)-1].Data) != "[DONE]" {
				t.Error("missing DONE")
			}
		}()
	}
	wg.Wait()
	s := p.NewStream()
	for _, v := range streamEvents()[:5] {
		if _, e := s.Event(Event{Data: []byte(v)}); e != nil {
			t.Fatal(e)
		}
	}
	if events, e := s.Flush(); e == nil || len(events) != 0 {
		t.Fatal("EOF fabricated terminal")
	}
}

func TestStrictSchemaAndToolResponsesKeepIDs(t *testing.T) {
	p, wire, e := Prepare("openai.responses", []byte(`{"model":"alias","max_output_tokens":20,"input":"hello","text":{"format":{"type":"json_schema","name":"result","strict":true,"schema":{"type":"object","properties":{"a":{"type":"string"}},"required":["a"],"additionalProperties":false}}}}`))
	if e != nil {
		t.Fatal(e)
	}
	o := obj(t, wire)
	if o["output_config"].(object)["format"].(object)["type"] != "json_schema" {
		t.Fatal(string(wire))
	}
	raw := strings.Replace(plainResponse, `[{"type":"text","text":"hi"}]`, `[{"type":"tool_use","id":"toolu__exact-ID","name":"mcp__own__Read","input":{"n":9007199254740993}}]`, 1)
	raw = strings.Replace(raw, `"end_turn"`, `"tool_use"`, 1)
	answer, e := p.JSON([]byte(raw))
	if e != nil {
		t.Fatal(e)
	}
	item := obj(t, answer)["output"].([]any)[0].(object)
	if item["call_id"] != "toolu__exact-ID" || !strings.Contains(item["arguments"].(string), "9007199254740993") {
		t.Fatal(string(answer))
	}
}
func TestStrictSSEToolsThinkingAndErrors(t *testing.T) {
	p := mustPlan(t, "openai.responses", `{"model":"alias","max_output_tokens":20,"input":"hello"}`)
	events := []string{streamEvents()[0], `{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"","signature":""}}`, `{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"thought"}}`, `{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"opaque"}}`, `{"type":"content_block_stop","index":0}`, `{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu-exact","name":"Read","input":{}}}`, `{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"x\":"}}`, `{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"9007199254740993}"}}`, `{"type":"content_block_stop","index":1}`, `{"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":3}}`, `{"type":"message_stop"}`}
	s := p.NewStream()
	out := []Event{}
	for _, ev := range events {
		x, e := s.Event(Event{Data: []byte(ev)})
		if e != nil {
			t.Fatal(e)
		}
		out = append(out, x...)
	}
	final := obj(t, out[len(out)-1].Data)["response"].(object)
	items := final["output"].([]any)
	if items[1].(object)["call_id"] != "toolu-exact" {
		t.Fatal(final)
	}
	if !strings.Contains(items[0].(object)["encrypted_content"].(string), opaquePrefix) {
		t.Fatal("missing opaque")
	}
	for i, ev := range out {
		if obj(t, ev.Data)["sequence_number"] != json.Number(fmt.Sprint(i)) {
			t.Fatal("sequence mismatch")
		}
	}
	broken := p.NewStream()
	if _, e := broken.Event(Event{Data: []byte(`{"type":"error","error":{"type":"overloaded_error","message":"busy"}}`)}); e != nil {
		t.Fatal(e)
	}
	if x, e := broken.Flush(); e == nil || len(x) > 0 {
		t.Fatal("upstream error became success")
	}
}
func TestStrictRejectsDuplicateJSONAndOpaqueTampering(t *testing.T) {
	for _, raw := range []string{`{"model":"a","model":"b","max_tokens":1,"messages":[]}`, `{"model":"a","max_tokens":1,"messages":[{"role":"user","content":"a","content":"b"}]}`} {
		if _, _, e := Prepare("openai.chat", []byte(raw)); e == nil {
			t.Fatal("duplicate accepted")
		}
	}
	p := mustPlan(t, "openai.responses", `{"model":"x","max_output_tokens":20,"input":"hello"}`)
	b := object{"type": "thinking", "thinking": "original", "signature": "sig"}
	opaque, e := encodeThinking("provider-model", b)
	if e != nil {
		t.Fatal(e)
	}
	in := object{"model": "alias", "max_output_tokens": 20, "input": []any{object{"role": "user", "content": "hello"}, object{"type": "reasoning", "encrypted_content": opaque, "summary": []any{object{"type": "summary_text", "text": "changed"}}}}}
	raw, _ := json.Marshal(in)
	if _, _, e = Prepare("openai.responses", raw); e == nil {
		t.Fatal("summary rewrote signed thinking")
	}
	if _, e = p.JSON([]byte(strings.Replace(plainResponse, `"end_turn"`, `"pause_turn"`, 1))); e == nil {
		t.Fatal("pause treated as completed")
	}
}

func TestStrictRefusalJSONSSEAndHistoryAgree(t *testing.T) {
	for _, protocol := range []string{"openai.chat", "openai.responses"} {
		body := `{"model":"alias","max_output_tokens":20,"input":"hello"}`
		if protocol == "openai.chat" {
			body = `{"model":"alias","max_tokens":20,"stream_options":{"include_usage":true},"messages":[{"role":"user","content":"hello"}]}`
		}
		p := mustPlan(t, protocol, body)
		raw := strings.Replace(plainResponse, `"end_turn"`, `"refusal"`, 1)
		jsonAnswer, e := p.JSON([]byte(raw))
		if e != nil {
			t.Fatal(e)
		}
		s := p.NewStream()
		events := streamEvents()
		events[2] = strings.Replace(events[2], "hello", "hi", 1)
		events[4] = strings.Replace(events[4], "end_turn", "refusal", 1)
		var result []Event
		for i, ev := range events {
			out, e := s.Event(Event{Data: []byte(ev)})
			if e != nil {
				t.Fatal(e)
			}
			if i < len(events)-1 && len(out) != 0 {
				t.Fatal("text leaked before refusal classification")
			}
			result = append(result, out...)
		}
		if _, e = s.Flush(); e != nil {
			t.Fatal(e)
		}
		for _, ev := range result {
			if strings.Contains(string(ev.Data), `"type":"response.output_text.delta"`) {
				t.Fatal("refusal emitted as normal text")
			}
		}
		if protocol == "openai.chat" {
			if !strings.Contains(string(jsonAnswer), `"refusal":"hi"`) {
				t.Fatal(string(jsonAnswer))
			}
			all := ""
			for _, ev := range result {
				all += string(ev.Data)
			}
			if !strings.Contains(all, `"refusal":"hi"`) {
				t.Fatal(all)
			}
		} else {
			last := obj(t, result[len(result)-1].Data)["response"].(object)
			if last["output"].([]any)[0].(object)["content"].([]any)[0].(object)["type"] != "refusal" {
				t.Fatal(last)
			}
		}
	}
}
func TestStrictResponseMetadataPreservedAndBufferBounded(t *testing.T) {
	p := mustPlan(t, "openai.responses", `{"model":"alias","max_output_tokens":20,"input":"hello"}`)
	m := obj(t, []byte(plainResponse))
	m["container"] = object{"id": "container"}
	m["future_fact"] = object{"opaque": true}
	m["usage"].(object)["service_tier"] = "standard"
	m["usage"].(object)["inference_geo"] = "us"
	m["usage"].(object)["server_tool_use"] = object{"web_search_requests": json.Number("0")}
	raw, _ := json.Marshal(m)
	answer, e := p.JSON(raw)
	if e != nil {
		t.Fatal(e)
	}
	out := obj(t, answer)
	details := out["provider_details"].(object)["anthropic"].(object)
	if details["future_fact"].(object)["opaque"] != true || details["usage"].(object)["inference_geo"] != "us" {
		t.Fatal(string(answer))
	}
	s := p.NewStream()
	s.buffered = MaxStreamBufferBytes
	events, e := s.Event(Event{Data: []byte(streamEvents()[0])})
	if e == nil || len(events) != 0 {
		t.Fatal("buffer cap ignored")
	}
	if _, e = s.Flush(); e == nil {
		t.Fatal("buffer failure fabricated success")
	}
}
func TestStrictOutputSchemaNoSilentDescriptionOrStrengthening(t *testing.T) {
	for _, format := range []string{`{"type":"json_schema","name":"x","schema":{"type":"object"}}`, `{"type":"json_schema","name":"x","strict":true,"description":"instructions","schema":{"type":"object"}}`, `{"type":"json_schema","name":"x","strict":false,"schema":{"type":"object"}}`} {
		_, _, e := Prepare("openai.responses", []byte(`{"model":"alias","max_output_tokens":20,"input":"hello","text":{"format":`+format+`}}`))
		if e == nil {
			t.Fatal("schema semantic loss accepted")
		}
	}
}
