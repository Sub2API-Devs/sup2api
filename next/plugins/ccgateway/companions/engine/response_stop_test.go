package engine

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func TestNativeResultRequiresModAndCompleteMessage(t *testing.T) {
	for _, tc := range []struct {
		name    string
		control *modControl
		want    string
	}{
		{"missing control", nil, "Mod control is unavailable"},
		{"not ready", &modControl{}, "did not acknowledge loading"},
		{"missing systems", &modControl{ready: true, systems: 1}, "did not attach the system messages"},
		{"missing message", &modControl{ready: true}, "without a complete model message"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			session := newCLISession(context.Background(), &Request{}, &Prepared{}, &runConfig{native: &nativeRunState{}, control: tc.control}, nil, nil)
			_, err := session.onResult(Object{"subtype": "success", "structured_output": Object{}})
			require.ErrorContains(t, err, tc.want)
		})
	}
}

func TestNativeToolHandoffRequiresCompleteTerminal(t *testing.T) {
	for _, tc := range []struct {
		name               string
		complete, observed bool
	}{
		{"complete handoff", true, false},
		{"partial handoff", false, false},
		{"provider failure", true, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := &Request{Tools: []Tool{{Name: "lookup", Schema: Object{"type": "object"}}}}
			state := &nativeRunState{}
			session := newCLISession(context.Background(), req, &Prepared{}, &runConfig{native: state, control: &modControl{ready: true}}, nil, func(Object) error { return nil })
			session.initialized = true
			for _, event := range []Object{
				{"type": "message_start", "message": Object{"id": "msg_handoff", "type": "message", "role": "assistant", "content": []any{}, "usage": Object{"input_tokens": 1, "output_tokens": 0}}},
				{"type": "content_block_start", "index": 0, "content_block": Object{"type": "tool_use", "id": "toolu_handoff", "name": "mcp__ccgateway__lookup", "input": Object{}}},
				{"type": "content_block_stop", "index": 0},
				{"type": "message_delta", "delta": Object{"stop_reason": "tool_use"}, "usage": Object{"output_tokens": 1}},
			} {
				require.NoError(t, session.onStreamEvent(Object{"event": event}))
			}
			if tc.complete {
				require.NoError(t, session.onStreamEvent(Object{"event": Object{"type": "message_stop"}}))
			}
			frame := Object{"type": "result", "subtype": "error_max_turns", "is_error": true}
			if tc.observed {
				frame["api_error_status"] = 429
			}
			state.observe(frame)
			if tc.complete && !tc.observed {
				cli, err := lifecycleTestExecutable()
				require.NoError(t, err)
				ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
				defer cancel()
				proc, err := startCLI(ctx, cli, []string{"-test.run=^$"}, t.TempDir(), os.Environ(), nil)
				require.NoError(t, err)
				defer proc.stdin.Close()
				defer proc.stdout.Close()
				session.proc = proc
				message, err := session.onResult(frame)
				require.NoError(t, err)
				assert.Equal(t, "tool_use", str(message, "stop_reason"))
				require.Len(t, session.acc.Blocks, 1)
				assert.Equal(t, "lookup", str(session.acc.Blocks[0], "name"))
				assert.Equal(t, "toolu_handoff", str(session.acc.Blocks[0], "id"))
				return
			}
			_, err := session.onResult(frame)
			var failure *nativeError
			require.ErrorAs(t, err, &failure)
			assert.Equal(t, tc.observed, failure.ObservedStatus)
		})
	}
}
