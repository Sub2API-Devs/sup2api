package engine

import (
	"encoding/json"
	"testing"
)

func TestReviewContinuationReminderPositionAndProvenance(t *testing.T) {
	const text = "<total_tokens>15000000 tokens left</total_tokens>"
	wrap := func() Object {
		return Object{"type": "text", "text": "<system-reminder>\n" + text + "\n</system-reminder>"}
	}
	for _, name := range []string{"not-ready", "missing-first", "changed-first", "wrong-role", "reversed-tail", "extra-block", "embedded", "unknown-metadata", "safety-attachment", "real-user"} {
		t.Run(name, func(t *testing.T) {
			r := &Request{continuation: "private-marker", Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}}
			first := Object{"role": "user", "content": []Object{wrap(), {"type": "text", "text": "public"}}}
			tail := Object{"role": "user", "content": []Object{wrap(), {"type": "text", "text": r.continuation}}}
			body := Object{"messages": []any{first, Object{"role": "assistant", "content": "pending"}, tail}}
			c := &modControl{ready: true, reminderMarker: r.continuation, nativeReminders: map[string]int{text: 0}, reminderAcks: map[string]int{text: 2}}
			switch name {
			case "not-ready":
				c.ready = false
			case "missing-first":
				first["content"] = r.Messages[0].Content
			case "changed-first":
				first["content"].([]Object)[0]["text"] = "different"
			case "wrong-role":
				tail["role"] = "assistant"
			case "reversed-tail":
				tail["content"] = []Object{{"type": "text", "text": r.continuation}, wrap()}
			case "extra-block":
				tail["content"] = append(tail["content"].([]Object), Object{"type": "text", "text": "extra"})
			case "embedded":
				tail["content"] = []Object{{"type": "text", "text": str(wrap(), "text") + r.continuation}}
			case "unknown-metadata":
				tail["content"].([]Object)[0]["unknown"] = true
			case "safety-attachment":
				tail["content"].([]Object)[0]["text"] = "<system-reminder>\nAuto Mode safety\n</system-reminder>"
			case "real-user":
				r.continuation = ""
				c.reminderMarker = ""
				tail["content"].([]Object)[1]["text"] = "actual next user"
			}
			before := digest(body)
			err := r.removeContinuation(body, c)
			if name != "real-user" && err == nil {
				t.Fatal("unproven transport accepted")
			}
			if name == "real-user" && err != nil {
				t.Fatal(err)
			}
			if digest(body) != before {
				t.Fatal("failed or actual-user request mutated")
			}
		})
	}
}

func TestReviewContinuationReminderCannotMoveBetweenUsers(t *testing.T) {
	const text = "native-status"
	for _, moved := range []bool{false, true} {
		r := &Request{continuation: "transport", Messages: []Message{
			{Role: "user", Content: []Object{{"type": "text", "text": "first"}}},
			{Role: "assistant", Content: []Object{{"type": "text", "text": "middle"}}},
			{Role: "user", Content: []Object{{"type": "text", "text": "second"}}},
		}}
		wrap := Object{"type": "text", "text": "<system-reminder>\n" + text + "\n</system-reminder>"}
		first := Object{"role": "user", "content": r.Messages[0].Content}
		second := Object{"role": "user", "content": r.Messages[2].Content}
		where := second
		if moved {
			where = first
		}
		where["content"] = append([]Object{wrap}, where["content"].([]Object)...)
		body := Object{"messages": []any{first, Object{"role": "assistant", "content": "middle"}, second, Object{"role": "assistant", "content": "pending"}, Object{"role": "user", "content": []Object{wrap, {"type": "text", "text": "transport"}}}}}
		c := &modControl{ready: true, reminderMarker: r.continuation, nativeReminders: map[string]int{text: 1}, reminderAcks: map[string]int{text: 2}}
		before := digest(body)
		err := r.removeContinuation(body, c)
		if moved {
			if err == nil || digest(body) != before {
				t.Fatal("native ordinal ignored or failed mutation")
			}
		} else if err != nil {
			t.Fatal(err)
		}
	}
}

func TestReviewNativeReminderAfterAssistantIsNotUserProof(t *testing.T) {
	r := &Request{continuation: "private", Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "real user"}}}}}
	row := func(o Object) json.RawMessage { b, _ := json.Marshal(o); return b }
	p := &Prepared{Rows: []json.RawMessage{
		row(Object{"type": "user", "message": Object{"content": r.cliWireMessage(r.Messages[0]).Content}}),
		row(Object{"type": "assistant", "message": Object{"content": []Object{{"type": "text", "text": "answer"}}}}),
		row(Object{"type": "attachment", "attachment": Object{"type": "total_tokens_reminder", "text": "not user scoped"}}),
	}}
	if len(nativeContinuationReminders(r, p)) != 0 {
		t.Fatal("attachment after assistant treated as preceding user proof")
	}
}
