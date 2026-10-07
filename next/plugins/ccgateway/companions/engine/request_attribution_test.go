package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync"
	"testing"
)

func scopedFixture(scope *mainRequestScope) Object {
	return Object{"model": "fixture", "messages": []any{Object{"role": "user", "content": "question"}}, "system": []any{Object{"type": "text", "text": "client system\n\n" + scope.marker, "cache_control": Object{"type": "ephemeral", "ttl": "1h"}, "extension": "preserved"}}}
}

func TestMainRequestScopeStrictMarkerAndLease(t *testing.T) {
	s := newMainRequestScope()
	if s.verify() == nil {
		t.Fatal("unapplied scope passed verification")
	}
	if _, err := s.identify(scopedFixture(s), false); err == nil || strings.Contains(err.Error(), s.marker) {
		t.Fatal("unleased marker accepted or leaked", err)
	}
	if err := s.enter(); err != nil {
		t.Fatal(err)
	}
	if err := s.enter(); err == nil {
		t.Fatal("overlapping turn lease accepted")
	}
	for _, text := range []string{s.marker + "\n\nclient", "client" + s.marker, "client\n\n" + s.marker + "\n", s.marker + s.marker} {
		body := Object{"system": []any{Object{"type": "text", "text": text}}}
		before, _ := json.Marshal(body)
		if _, err := s.identify(body, false); err == nil || strings.Contains(err.Error(), s.marker) {
			t.Fatal("ambiguous marker accepted or leaked", err)
		}
		after, _ := json.Marshal(body)
		if !bytes.Equal(before, after) {
			t.Fatal("rejected prompt was partially rewritten")
		}
	}
	message := scopedFixture(s)
	if main, err := s.identify(message, false); err != nil || !main {
		t.Fatal(main, err)
	}
	block := message["system"].([]any)[0].(map[string]any)
	if block["text"] != "client system" || block["extension"] != "preserved" || !reflect.DeepEqual(block["cache_control"], Object{"type": "ephemeral", "ttl": "1h"}) {
		t.Fatal("system block metadata changed", block)
	}
	s.recordApplied()
	if err := s.verify(); err != nil {
		t.Fatal(err)
	}
	s.leave()
	if _, err := s.identify(scopedFixture(s), false); err == nil {
		t.Fatal("expired lease accepted")
	}
}

func TestMainRequestScopeCountAndAuxiliaryIsolation(t *testing.T) {
	s := newMainRequestScope()
	standalone := Object{"system": []any{Object{"type": "text", "text": "first", "cache_control": Object{"type": "ephemeral"}}, Object{"type": "text", "text": s.marker}}}
	if main, err := s.identify(standalone, true); err != nil || !main {
		t.Fatal(main, err)
	}
	if len(standalone["system"].([]any)) != 1 {
		t.Fatal("standalone marker not removed")
	}
	if s.verify() == nil {
		t.Fatal("token counting counted as feature application")
	}
	aux := Object{"system": []any{Object{"type": "text", "text": "classifier"}}}
	before, _ := json.Marshal(aux)
	if main, err := s.identify(aux, false); err != nil || main {
		t.Fatal(main, err)
	}
	after, _ := json.Marshal(aux)
	if !bytes.Equal(before, after) {
		t.Fatal("auxiliary prompt changed")
	}
	other := newMainRequestScope()
	if main, err := s.identify(scopedFixture(other), false); err != nil || main {
		t.Fatal("scope recognized another process's marker", err)
	}
}

func TestMainRequestScopeConcurrentRequests(t *testing.T) {
	s := newMainRequestScope()
	if err := s.enter(); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	errors := make(chan error, 32)
	for i := 0; i < 32; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := s.identify(scopedFixture(s), false); err != nil {
				errors <- err
				return
			}
			s.recordApplied()
		}()
	}
	wg.Wait()
	close(errors)
	for err := range errors {
		t.Fatal(err)
	}
	s.leave()
	if err := s.verify(); err != nil {
		t.Fatal(err)
	}
}

func TestRelayMainAttributionControlsOnlyMainGeneration(t *testing.T) {
	r := plannedRequest(t, Object{"temperature": 0.25, "stop_sequences": []any{"END"}})
	s := newMainRequestScope()
	if err := s.enter(); err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{scope: s, path: "/fixture"}
	var forwarded []byte
	handler := relay.handler(r, http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		forwarded, _ = io.ReadAll(request.Body)
		w.WriteHeader(200)
	}))
	for _, scenario := range []struct {
		name, path      string
		marked          bool
		wantTemperature bool
	}{
		{"main", "/messages", true, true},
		{"auxiliary", "/messages", false, false},
		{"token-count", "/messages/count_tokens", true, false},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			message := scopedFixture(s)
			if !scenario.marked {
				message["system"] = []any{Object{"type": "text", "text": "classifier system"}}
			}
			body, _ := json.Marshal(message)
			forwarded = nil
			request := httptest.NewRequest("POST", "http://local/fixture"+scenario.path, bytes.NewReader(body))
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			if response.Code != 200 {
				t.Fatal(response.Code, response.Body.String())
			}
			wire, err := decodeObject(forwarded)
			if err != nil {
				t.Fatal(err)
			}
			_, hasTemperature := wire["temperature"]
			_, hasStops := wire["stop_sequences"]
			if hasTemperature != scenario.wantTemperature || hasStops != scenario.wantTemperature {
				t.Fatal("controls applied to wrong request", scenario.name)
			}
			if bytes.Contains(forwarded, []byte(s.marker)) {
				t.Fatal("marker leaked upstream")
			}
			if !scenario.marked && !bytes.Equal(body, forwarded) {
				t.Fatal("auxiliary body was rewritten")
			}
		})
	}
	if err := s.verify(); err != nil {
		t.Fatal(err)
	}
}

func TestRelayAttributionFailureNeverForwardsOrLeaksNonce(t *testing.T) {
	r := plannedRequest(t, Object{"temperature": 0.25})
	s := newMainRequestScope()
	relay := &outboundRelay{scope: s, path: "/fixture"}
	forwarded := false
	handler := relay.handler(r, http.HandlerFunc(func(http.ResponseWriter, *http.Request) { forwarded = true }))
	body, _ := json.Marshal(scopedFixture(s))
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest("POST", "http://local/fixture/messages", bytes.NewReader(body)))
	if forwarded || response.Code != 400 || strings.Contains(response.Body.String(), s.marker) {
		t.Fatal("unleased main request was forwarded or marker leaked")
	}
	if relay.failure == nil || strings.Contains(relay.failure.Error(), s.marker) {
		t.Fatal("missing cause or nonce in error")
	}
}

func TestMainAttributionDisablesSnapshotCLIFlag(t *testing.T) {
	r := plannedRequest(t, Object{"temperature": 0.25})
	cfg := newRunConfig(r, &Prepared{SnapshotEnabled: true}, "plugin", "dir")
	if cfg.scope == nil {
		t.Fatal("missing scoped marker")
	}
	for i, arg := range cfg.args {
		if arg == "--system-prompt-snapshot" && cfg.args[i+1] != "off" {
			t.Fatal("snapshot can reuse a stale marker")
		}
	}
	// The matching initialize control flag is covered by the real CLI resume
	// probe; source review verifies it also checks cfg.scope == nil.
}

func TestMainRequestScopeEveryLeaseMustApply(t *testing.T) {
	s := newMainRequestScope()
	if err := s.enter(); err != nil {
		t.Fatal(err)
	}
	s.recordApplied()
	s.recordApplied() // A retry in one turn is legitimate.
	if err := s.leave(); err != nil {
		t.Fatal(err)
	}
	if err := s.verify(); err != nil {
		t.Fatal(err)
	}
	if err := s.enter(); err != nil {
		t.Fatal(err)
	}
	if err := s.verify(); err == nil {
		t.Fatal("previous turn hid current missing attribution")
	}
	if err := s.leave(); err == nil {
		t.Fatal("unattributed turn completed successfully")
	}
	s.recordApplied() // A late completion must not clear the sticky failure.
	if s.verify() == nil || s.enter() == nil {
		t.Fatal("missing turn failure was cleared")
	}
}

func TestMainRequestScopeHiddenMarkerNeverLeaks(t *testing.T) {
	for _, marked := range []bool{true, false} {
		for _, location := range []string{"messages", "metadata", "system-extension", "key"} {
			s := newMainRequestScope()
			if err := s.enter(); err != nil {
				t.Fatal(err)
			}
			message := scopedFixture(s)
			if !marked {
				message["system"] = []any{Object{"type": "text", "text": "auxiliary"}}
			}
			switch location {
			case "messages":
				message["messages"] = []any{Object{"role": "user", "content": s.marker}}
			case "metadata":
				message["metadata"] = Object{"trace": s.marker}
			case "system-extension":
				message["system"].([]any)[0].(map[string]any)["extension"] = s.marker
			case "key":
				message[s.marker] = "hidden key"
			}
			before, _ := json.Marshal(message)
			if _, err := s.identify(message, false); err == nil || strings.Contains(err.Error(), s.marker) {
				t.Fatal("hidden marker accepted or error leaked nonce", location, marked, err)
			}
			after, _ := json.Marshal(message)
			if !bytes.Equal(before, after) {
				t.Fatal("rejected hidden marker partially rewrote input")
			}
		}
	}
}

func TestModControlReportsMissingMainLeaseApplication(t *testing.T) {
	s := newMainRequestScope()
	c := &modControl{scope: s, path: "/mod-fixture", token: "fixture-token", ready: true}
	ack := func(event string) int {
		request := httptest.NewRequest("POST", "http://local/mod-fixture", strings.NewReader(`{"event":"`+event+`"}`))
		request.RemoteAddr = "127.0.0.1:12345"
		request.Header.Set("Authorization", "Bearer fixture-token")
		response := httptest.NewRecorder()
		c.ServeHTTP(response, request)
		if strings.Contains(response.Body.String(), s.marker) {
			t.Fatal("control error leaked scope marker")
		}
		return response.Code
	}
	if ack("main_request_begin") != 200 {
		t.Fatal("begin rejected")
	}
	s.recordApplied()
	if ack("main_request_end") != 200 {
		t.Fatal("completed turn rejected")
	}
	if ack("main_request_begin") != 200 {
		t.Fatal("second begin rejected")
	}
	if ack("main_request_end") != 409 || s.verify() == nil {
		t.Fatal("missing main request was acknowledged")
	}
}
