package engine

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestContinuationReminderProofAndAtomicity(t *testing.T) {
	const text = "<total_tokens>15000000 tokens left</total_tokens>"
	wrap := func(s string) Object {
		return Object{"type": "text", "text": "<system-reminder>\n" + s + "\n</system-reminder>"}
	}
	fixture := func() (*Request, Object, *modControl) {
		r := &Request{continuation: "private-marker", Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public fixture"}}}}}
		body := Object{"messages": []any{Object{"role": "user", "content": []Object{wrap(text), {"type": "text", "text": "public fixture"}}}, Object{"role": "assistant", "content": []Object{{"type": "text", "text": "pending"}}}, Object{"role": "user", "content": []Object{wrap(text), {"type": "text", "text": r.continuation}}}}}
		c := &modControl{ready: true, reminderMarker: r.continuation, nativeReminders: map[string]int{text: 0}, reminderAcks: map[string]int{text: 2}}
		return r, body, c
	}
	for _, name := range []string{"valid", "single-LF", "no-native", "no-ack", "one-ack", "wrong-request", "changed-value", "unknown-suffix", "extra-LF", "client-lookalike", "marker-leak", "unknown-marker-field"} {
		t.Run(name, func(t *testing.T) {
			r, b, c := fixture()
			msgs := b["messages"].([]any)
			tail := msgs[2].(Object)["content"].([]Object)
			switch name {
			case "single-LF":
				tail[0]["text"] = str(tail[0], "text") + "\n"
			case "no-native":
				c.nativeReminders = nil
			case "no-ack":
				c.reminderAcks = nil
			case "one-ack":
				c.reminderAcks[text] = 1
			case "wrong-request":
				c.reminderMarker = "other"
			case "changed-value":
				tail[0] = wrap("<total_tokens>1 tokens left</total_tokens>")
			case "unknown-suffix":
				tail[0]["text"] = str(tail[0], "text") + "unsafe"
			case "extra-LF":
				tail[0]["text"] = str(tail[0], "text") + "\n\n"
			case "client-lookalike":
				r.Messages[0].Content = append(r.Messages[0].Content, wrap(text))
			case "marker-leak":
				b["system"] = r.continuation
			case "unknown-marker-field":
				tail[1]["unknown"] = true
			}
			before := digest(b)
			err := r.removeContinuation(b, c)
			if name == "valid" || name == "single-LF" {
				if err != nil {
					t.Fatal(err)
				}
				if len(b["messages"].([]any)) != 2 {
					t.Fatal("carrier retained")
				}
				if digest(msgs[0]) != digest(b["messages"].([]any)[0]) {
					t.Fatal("real first user changed")
				}
				return
			}
			if err == nil || digest(b) != before {
				t.Fatal("unproven change accepted or failure mutated body")
			}
		})
	}
}

func TestContinuationReminderAuthenticatedWithoutLogging(t *testing.T) {
	c, err := startModControl(&runConfig{env: map[string]string{}, reminderMarker: "request-marker"}, "http://127.0.0.1:8787")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	call := func(token, body string) int {
		r := httptest.NewRequest("POST", c.URL, strings.NewReader(body))
		r.RemoteAddr = "127.0.0.1:1234"
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		c.ServeHTTP(w, r)
		return w.Code
	}
	const ack = `{"event":"continuation_reminder","detail":{"text":"native"}}`
	if call("wrong", ack) == 200 || call(c.token, ack) == 200 {
		t.Fatal("unauthenticated or pre-ready accepted")
	}
	if call(c.token, `{"event":"ready","version":"ccgateway-v2"}`) != 200 {
		t.Fatal("ready failed")
	}
	if call(c.token, ack) != 200 || call(c.token, ack) != 200 || c.reminderAcks["native"] != 2 {
		t.Fatal("authenticated ack requires logging")
	}
	if call(c.token, `{"event":"continuation_reminder","detail":{"text":"native","unknown":true}}`) == 200 {
		t.Fatal("unknown detail accepted")
	}
	if call(c.token, `{"event":"continuation_reminder","detail":{"text":"`+strings.Repeat("x", 4097)+`"}}`) == 200 {
		t.Fatal("oversize accepted")
	}
}

func TestNativeContinuationReminderRequiresNativeFirstUser(t *testing.T) {
	r := &Request{continuation: "marker", Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "fixture"}}}}}
	row := func(o Object) json.RawMessage { b, _ := json.Marshal(o); return b }
	p := &Prepared{Rows: []json.RawMessage{row(Object{"type": "user", "message": Object{"content": r.cliWireMessage(r.Messages[0]).Content}}), row(Object{"type": "attachment", "attachment": Object{"type": "total_tokens_reminder", "text": "native"}})}}
	if ordinal, ok := nativeContinuationReminders(r, p)["native"]; !ok || ordinal != 0 {
		t.Fatal("native proof missing")
	}
	p.Rows[0] = row(Object{"type": "user", "message": Object{"content": "different"}})
	if len(nativeContinuationReminders(r, p)) != 0 {
		t.Fatal("different native prefix accepted")
	}
}
