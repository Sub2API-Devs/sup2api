package engine

import (
	"encoding/json"
	"testing"
)

func TestExactToolHistoryOnlyRestoresKnownNumericProjection(t *testing.T) {
	for _, number := range []string{"9007199254740993", "-9007199254740993", "0.100000000000000000001", "1e309", "-0"} {
		t.Run(number, func(t *testing.T) {
			call := Object{"type": "tool_use", "id": "call", "name": "lookup", "input": Object{"nested": []any{json.Number(number), "9007199254740993"}}}
			req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "original text"}}}, {Role: "assistant", Content: []Object{call}}, {Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "call", "content": "done"}}}}}
			body := Object{"messages": []any{}}
			for _, m := range req.Messages {
				wire := req.wireMessage(m)
				body["messages"] = append(body["messages"].([]any), Object{"role": wire.Role, "content": wire.Content})
			}
			copy, err := jsonCopyObject(body)
			if err != nil {
				t.Fatal(err)
			}
			actual := copy["messages"].([]any)[1].(Object)["content"].([]any)[0].(Object)
			actual["input"] = jsNumberView(actual["input"])
			// Simulate JSON.stringify rather than passing float64-only test values.
			copy, err = jsonCopyObject(copy)
			if err != nil {
				t.Fatal(err)
			}
			changed, err := req.restoreExactToolHistoryInputs(copy)
			if err != nil || !changed {
				t.Fatalf("repair: %v %v", changed, err)
			}
			if _, err = alignClientHistory(req, copy); err != nil {
				t.Fatal(err)
			}
			if digest(copy) != digest(body) {
				t.Fatal("original input or text was not restored exactly")
			}
			copy["messages"].([]any)[0].(Object)["content"] = []any{Object{"type": "text", "text": "different text"}}
			if _, err = alignClientHistory(req, copy); err == nil {
				t.Fatal("numeric repair relaxed surrounding history identity")
			}
		})
	}
}

func TestExactToolSourceBindsMessageIndexNameAndID(t *testing.T) {
	source := Object{"type": "tool_use", "id": "call", "name": "lookup", "input": Object{"value": json.Number("9007199254740993")}}
	for _, tamper := range []string{"", "id", "name", "input"} {
		t.Run(tamper, func(t *testing.T) {
			relay := &outboundRelay{}
			observer := &apiTerminalObserver{relay: relay}
			observer.observeExactToolInput(Object{"type": "message_start", "message": Object{"id": "message"}})
			observer.observeExactToolInput(Object{"type": "content_block_start", "index": json.Number("0"), "content_block": source})
			actual, _ := jsonCopyObject(source)
			actual["input"] = Object{"value": json.Number("9007199254740992")}
			if tamper == "input" {
				actual["input"] = Object{"value": json.Number("7")}
			} else if tamper != "" {
				actual[tamper] = "different"
			}
			session := &cliSession{relay: relay, p: &Prepared{}, acc: &Accumulator{Message: Object{"id": "message"}}}
			err := session.restoreExactToolStart(Object{"type": "content_block_start", "index": json.Number("0"), "content_block": actual})
			if tamper != "" {
				if err == nil {
					t.Fatal("different tool accepted")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if digest(actual) != digest(source) {
				t.Fatal("source exact input lost")
			}
			if !session.p.APIResponseComplete {
				t.Fatal("native initial input must be checked before reuse")
			}
		})
	}
}

func TestExactToolHistoryFingerprintsDoNotCollapseJSNumbers(t *testing.T) {
	a := []Message{{Role: "assistant", Content: []Object{{"type": "tool_use", "id": "same", "name": "lookup", "input": Object{"x": json.Number("9007199254740992")}}}}}
	b := []Message{{Role: "assistant", Content: []Object{{"type": "tool_use", "id": "same", "name": "lookup", "input": Object{"x": json.Number("9007199254740993")}}}}}
	if digest(jsNumberView(a[0].Content[0]["input"])) != digest(jsNumberView(b[0].Content[0]["input"])) {
		t.Fatal("fixture is not a JS collision")
	}
	if fingerprints(a)[0] == fingerprints(b)[0] {
		t.Fatal("cache fingerprint collapsed authoritative inputs")
	}
}
