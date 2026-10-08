package engine

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestIndependentHelperReminderACKAuthority(t *testing.T) {
	r := &Request{helperHistory: &helperHistoryExecution{payloadVersion: 2}, internalCache: &internalCacheRounds{rounds: []Object{{}}}}
	c, err := startModControl(&runConfig{helperRequest: r, scope: newMainRequestScope()}, "http://127.0.0.1:8787")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	call := func(body, token, remote string) int {
		req := httptest.NewRequest("POST", c.URL, strings.NewReader(body))
		req.RemoteAddr = remote
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		if !serveModControl(w, req) {
			t.Fatal("missing test control")
		}
		return w.Code
	}
	const ack = `{"event":"helper_reminder","detail":{"text":"same text"}}`
	for _, setup := range []struct {
		body string
		want int
	}{
		{ack, 400},
		{`{"event":"ready","version":"ccgateway-v2"}`, 200},
		{ack, 400},
		{`{"event":"main_request_begin"}`, 200},
	} {
		if got := call(setup.body, c.token, "127.0.0.1:1234"); got != setup.want {
			t.Fatalf("setup got %d want %d", got, setup.want)
		}
	}
	for _, bad := range []struct {
		body, token, remote string
		want                int
	}{
		{ack, "wrong", "127.0.0.1:1234", 404},
		{ack, c.token, "192.0.2.1:1234", 404},
		{`{"event":"helper_reminder","detail":{"text":"same text","round":1}}`, c.token, "127.0.0.1:1234", 400},
		{`{"event":"helper_reminder","unexpected":1,"detail":{"text":"same text"}}`, c.token, "127.0.0.1:1234", 400},
	} {
		if got := call(bad.body, bad.token, bad.remote); got != bad.want {
			t.Fatalf("bad ACK accepted: %d", got)
		}
	}
	if len(r.helperHistory.reminders) != 0 {
		t.Fatal("rejected ACK mutated evidence")
	}
	if call(ack, c.token, "127.0.0.1:1234") != 200 || r.helperHistory.reminders[1] != "same text" {
		t.Fatal("ACK not bound to observed round")
	}
	if call(`{"event":"helper_reminder","detail":{"text":"changed"}}`, c.token, "127.0.0.1:1234") != 400 {
		t.Fatal("round evidence overwritten")
	}
	c.scope.recordApplied()
	if err := c.scope.leave(); err != nil {
		t.Fatal(err)
	}
	if call(ack, c.token, "127.0.0.1:1234") != 400 {
		t.Fatal("ended lease accepted ACK")
	}
}

func TestIndependentHelperTailValidationViewRetainsPositionsAndObjects(t *testing.T) {
	system := Object{"role": "system", "content": []any{Object{"type": "text", "text": "same text", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}}}
	pair := []any{Object{"role": "assistant", "content": "fixture"}, Object{"role": "user", "content": "fixture"}}
	messages := append([]any{system}, pair...)
	messages = append(messages, system)
	before, _ := json.Marshal(messages)
	r := &Request{helperHistory: &helperHistoryExecution{payloadVersion: 2, reminders: map[int]string{1: "same text"}}}
	flat, tails, err := r.helperTailSystemView(messages)
	if err != nil || len(flat) != 3 || len(tails[1]) != 1 {
		t.Fatal("position lost", err)
	}
	after, _ := json.Marshal(messages)
	if string(before) != string(after) || digest(flat[0]) != digest(system) || digest(tails[1][0]) != digest(system) {
		t.Fatal("validation rewrote original objects")
	}
	r.helperHistory.tailSystems = tails
	if _, _, err := r.helperTailSystemView(messages[:3]); err == nil {
		t.Fatal("previous tail silently disappeared")
	}
	r.helperHistory.payloadVersion = 1
	if _, _, err := r.helperTailSystemView(messages); err == nil {
		t.Fatal("v1 tail gate relaxed")
	}
	r.helperHistory.payloadVersion = 2
	for _, field := range []string{"extra", "signature", "tool_use_id"} {
		bad := Object{"role": "system", "content": []any{Object{"type": "text", "text": "same text", field: "unproven"}}}
		r.helperHistory.tailSystems = nil
		if _, _, err := r.helperTailSystemView(append(append([]any{}, pair...), bad)); err == nil {
			t.Fatalf("unknown field %s admitted", field)
		}
	}
}
