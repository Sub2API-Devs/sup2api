package engine

import (
	"encoding/json"
	"testing"
)

func TestFinalStopSnapshotDoesNotMoveOrAliasExtensions(t *testing.T) {
	p := &Prepared{}
	event := Object{"type": "message_stop", "safeguard_results": []any{Object{"tool_use_id": "toolu_fixture", "decision": "deny"}}}
	p.recordFinalResponseStop(event)
	event["safeguard_results"].([]any)[0].(map[string]any)["decision"] = "changed"
	stop := p.finalResponseStop()
	if str(stop, "type") != "message_stop" || stop["safeguard_results"].([]any)[0].(map[string]any)["decision"] != "deny" {
		t.Fatal("stop metadata aliased or changed")
	}
	stop["safeguard_results"] = nil
	if p.finalResponseStop()["safeguard_results"] == nil {
		t.Fatal("reader mutated final stop")
	}
}

func TestStructuredEnvelopeKeepsOriginalEventLocations(t *testing.T) {
	message := Object{"id": "msg_fixture", "role": "assistant", "content": []Object{{"type": "text", "text": `{"ok":true}`}}, "stop_reason": "end_turn", "usage": Object{"output_tokens": 3}}
	for key, value := range responseHTTPFixtureExtensions() {
		message[key] = value
	}
	source := []Object{
		{"type": "message_start", "message": Object{"id": "msg_fixture", "container": Object{"id": "original-start"}}},
		{"type": "message_delta", "delta": Object{"stop_reason": "tool_use", "stop_details": Object{"type": "fixture"}}, "input_transformations": []any{}},
		{"type": "message_delta", "delta": Object{}, "safeguard_results": []any{}},
	}
	var events []Object
	if err := emitStructuredMessage(message, func(e Object) error { events = append(events, e); return nil }, source); err != nil {
		t.Fatal(err)
	}
	start := events[0]["message"].(map[string]any)
	if _, present := start["safeguard_results"]; present {
		t.Fatal("late verdict moved into message_start")
	}
	if start["container"] == nil {
		t.Fatal("start binding removed")
	}
	terminal, late := false, false
	for _, event := range events {
		if str(event, "type") != "message_delta" {
			continue
		}
		delta := event["delta"].(map[string]any)
		if str(delta, "stop_reason") == "end_turn" {
			terminal = true
			if delta["stop_details"] == nil || event["input_transformations"] == nil {
				t.Fatal("terminal metadata moved")
			}
		}
		if event["safeguard_results"] != nil {
			if !terminal || str(delta, "stop_reason") != "" {
				t.Fatal("late verdict order changed")
			}
			late = true
		}
	}
	if !terminal || !late {
		t.Fatal("missing terminal or late metadata")
	}
	encoded, _ := json.Marshal(events)
	if !json.Valid(encoded) {
		t.Fatal("raw metadata emitted invalid JSON")
	}
}

func TestResultWithoutStreamCannotSkipMainAttribution(t *testing.T) {
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	session := &cliSession{cfg: &runConfig{scope: scope, control: &modControl{ready: true}}, acc: &Accumulator{}, relay: &outboundRelay{}}
	if _, err := session.onResult(Object{"subtype": "success", "structured_output": Object{}}); err == nil {
		t.Fatal("result bypassed missing scope application")
	}
}
