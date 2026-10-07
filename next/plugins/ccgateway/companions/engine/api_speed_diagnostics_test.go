package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestAPISpeedExactPlanAndPolicy(t *testing.T) {
	for _, value := range []any{"fast", "standard", nil} {
		body := basic()
		body["speed"] = value
		raw, _ := json.Marshal(body)
		p := defaultRequestPolicy()
		p.AllowFast = true
		h := policyHeaders(p)
		h.Set("anthropic-beta", "fast-mode-2026-02-01")
		r, err := parsePolicyRequest(raw, h)
		if err != nil {
			t.Fatal(err)
		}
		wire := Object{"speed": "inner"}
		if err = r.ApplyMainRequestFeatures(wire); err != nil || digest(wire["speed"]) != digest(value) {
			t.Fatal("speed changed", wire, err)
		}
	}
	r := plannedRequest(t, Object{})
	wire := Object{"speed": "fast", "diagnostics": Object{"previous_message_id": "inner"}}
	if err := r.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	if _, ok := wire["speed"]; ok {
		t.Fatal("inner fast default leaked")
	}
	if _, ok := wire["diagnostics"]; ok {
		t.Fatal("inner diagnostics leaked")
	}
	body := basic()
	body["speed"] = "fast"
	raw, _ := json.Marshal(body)
	if _, err := parsePolicyRequest(raw, nil); err == nil || !strings.Contains(err.Error(), "disabled") {
		t.Fatal("policy silently downgraded", err)
	}
	p := defaultRequestPolicy()
	p.AllowFast = true
	if _, err := parsePolicyRequest(raw, policyHeaders(p)); err == nil || !strings.Contains(err.Error(), "fast-mode") {
		t.Fatal("missing beta admitted", err)
	}
}

func TestAPISpeedDiagnosticsRelayAttribution(t *testing.T) {
	r := plannedRequest(t, Object{"diagnostics": Object{"previous_message_id": "owned"}})
	r.Plan.fields["speed"] = json.RawMessage(`"fast"`)
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	relay := &outboundRelay{scope: scope, path: "/speed-diagnostics-fixture"}
	var actual Object
	handler := relay.handler(r, http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		raw, _ := io.ReadAll(req.Body)
		actual, _ = decodeObject(raw)
		if req.Header.Get("Authorization") != "Bearer inner-credential" {
			t.Error("account authorization changed")
		}
		w.WriteHeader(200)
	}))
	for _, main := range []bool{true, false} {
		body := scopedFixture(scope)
		body["speed"] = "standard"
		body["diagnostics"] = Object{"previous_message_id": "inner"}
		if !main {
			body["system"] = []any{Object{"type": "text", "text": "auxiliary classifier"}}
		}
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "http://local/speed-diagnostics-fixture/messages", bytes.NewReader(raw))
		req.Header.Set("Authorization", "Bearer inner-credential")
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != 200 {
			t.Fatal(res.Code, res.Body.String())
		}
		wantSpeed, wantID := "standard", "inner"
		if main {
			wantSpeed, wantID = "fast", "owned"
		}
		if actual["speed"] != wantSpeed || str(actual["diagnostics"].(Object), "previous_message_id") != wantID {
			t.Fatal("request attribution leaked controls")
		}
	}
}

func TestMessageOwnershipPersistenceIsolationAndBounds(t *testing.T) {
	path := filepath.Join(t.TempDir(), "message-ownership-v1.json")
	s := openMessageOwnership(path)
	now := time.Now().UTC()
	if err := s.remember("msg_private", "scope-A", now); err != nil {
		t.Fatal(err)
	}
	s = openMessageOwnership(path)
	if !s.owns("msg_private", "scope-A", now) || s.owns("msg_private", "scope-B", now) || s.owns("msg_unknown", "scope-A", now) {
		t.Fatal("ownership boundary failed")
	}
	if s.owns("msg_private", "scope-A", now.Add(messageOwnershipTTL)) {
		t.Fatal("expired entry accepted")
	}
	if err := s.remember("msg_private", "scope-B", now); err == nil {
		t.Fatal("owner overwritten")
	}
	raw, _ := os.ReadFile(path)
	if bytes.Contains(raw, []byte("msg_private")) {
		t.Fatal("raw message ID persisted")
	}
	for i := 0; i < messageOwnershipLimit; i++ {
		s.entries[digest(i)] = ownedMessage{Scope: "scope-A", Created: now.Add(-time.Minute)}
	}
	// Existing entry plus the seeded full index must shrink to the fixed quota.
	delete(s.entries, digest("msg_private"))
	if err := s.remember("new", "scope-A", now); err != nil || len(s.entries) != messageOwnershipLimit {
		t.Fatal("index unbounded", len(s.entries), err)
	}
	if openMessageOwnership(filepath.Join(t.TempDir(), "other-account.json")).owns("msg_private", "scope-A", now) {
		t.Fatal("cross Worker ownership accepted")
	}
}

func TestAdvisorOnlyPlaceholderBoundary(t *testing.T) {
	expected := advisorFixture("advisor_redacted_result")[:2]
	actual := []Object{{"type": "text", "text": "[Advisor response]", "citations": []any{}}}
	if out, err := restoreOmittedBlocks(expected, actual, advisorHistoryBlock); err != nil || digest(out) != digest(expected) {
		t.Fatal(out, err)
	}
	for _, invalid := range [][]Object{expected[:1], append(append([]Object{}, expected...), Object{"type": "text", "text": "extra"}), {expected[1], expected[0]}, {expected[0], expected[0], expected[1]}} {
		if _, err := restoreOmittedBlocks(invalid, actual, advisorHistoryBlock); err == nil {
			t.Fatal("unsafe advisor placeholder restored")
		}
	}
	actual[0]["citations"] = []any{Object{"type": "web_search_result_location"}}
	if _, err := restoreOmittedBlocks(expected, actual, advisorHistoryBlock); err == nil {
		t.Fatal("placeholder citation silently lost")
	}
	actual = []Object{{"type": "text", "text": "(no content)", "citations": []any{}}}
	omitted := func(block Object) bool { return advisorHistoryBlock(block) || str(block, "type") == "fallback" }
	combined := append(append([]Object{}, expected...), fallbackFixture())
	if out, err := restoreOmittedBlocks(combined, actual, omitted); err != nil || digest(out) != digest(combined) {
		t.Fatal("observed mixed placeholder not restored", err)
	}
	for _, invalid := range [][]Object{expected, {expected[0], fallbackFixture()}, {fallbackFixture()}, append(combined, Object{"type": "text", "text": "ordinary"})} {
		if _, err := restoreOmittedBlocks(invalid, actual, omitted); err == nil {
			t.Fatal("generic no-content placeholder widened restoration")
		}
	}
}

func fastDiagnosticsFixture(w http.ResponseWriter, model, id string) {
	rec := httptest.NewRecorder()
	generationFixtureEvents(rec, model, "end_turn", "DIAGNOSTICS", false)
	w.Header().Set("Content-Type", "text/event-stream")
	for _, line := range strings.Split(rec.Body.String(), "\n") {
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		event, _ := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
		if str(event, "type") == "message_start" {
			message := event["message"].(map[string]any)
			message["id"] = id
			message["usage"].(map[string]any)["speed"] = "fast"
			message["diagnostics"] = Object{"cache_miss_reason": nil}
		}
		raw, _ := json.Marshal(event)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), raw)
	}
}

func TestRealCLISpeedDiagnosticsOwnership(t *testing.T) {
	var calls atomic.Int32
	wires := make(chan Object, 8)
	url, cache := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		wires <- body
		fastDiagnosticsFixture(w, str(body, "model"), fmt.Sprintf("msg_diagnostics_%d", calls.Add(1)))
	})
	p := defaultRequestPolicy()
	p.AllowFast = true
	post := func(scope string, diag any, speed any, stream bool, wantStatus int) []byte {
		t.Helper()
		body := basic()
		body["diagnostics"] = diag
		body["stream"] = stream
		if speed != "absent" {
			body["speed"] = speed
		}
		raw, _ := json.Marshal(body)
		req, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
		req.Header = policyHeaders(p)
		req.Header.Set("anthropic-beta", "fast-mode-2026-02-01")
		req.Header.Set("X-CCGateway-Session-Scope", scope)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		out, _ := io.ReadAll(res.Body)
		if res.StatusCode != wantStatus || wantStatus == 200 && bytes.Contains(out, []byte(`"type":"error"`)) {
			t.Fatalf("HTTP%d %s", res.StatusCode, out)
		}
		return out
	}
	out := post("A", Object{}, "fast", false, 200)
	if !bytes.Contains(out, []byte(`"speed":"fast"`)) || !bytes.Contains(out, []byte(`"diagnostics":{"cache_miss_reason":null}`)) {
		t.Fatalf("response lost extensions %s", out)
	}
	wire := <-wires
	if wire["speed"] != "fast" || digest(wire["diagnostics"]) != digest(Object{}) {
		t.Fatal("first wire changed")
	}
	post("B", Object{"previous_message_id": "msg_diagnostics_1"}, "standard", false, 400)
	post("A", Object{"previous_message_id": "msg_unknown"}, "standard", false, 400)
	post("A", Object{"previous_message_id": "msg_diagnostics_1"}, "standard", true, 200)
	wire = <-wires
	if wire["speed"] != "standard" || digest(wire["diagnostics"]) != digest(Object{"previous_message_id": "msg_diagnostics_1"}) {
		t.Fatal("previous ID changed")
	}
	post("A", Object{"previous_message_id": "msg_diagnostics_2"}, "absent", false, 200)
	wire = <-wires
	if _, ok := wire["speed"]; ok {
		t.Fatal("implicit speed sent")
	}
	post("A", nil, nil, false, 200)
	wire = <-wires
	if value, ok := wire["speed"]; !ok || value != nil {
		t.Fatal("explicit null changed")
	}
	if calls.Load() != 4 {
		t.Fatal("invalid requests reached model", calls.Load())
	}
	reloaded := openMessageOwnership(filepath.Join(cache.dir, "message-ownership-v1.json"))
	if !reloaded.owns("msg_diagnostics_1", digest([]string{"worker-message-v1", reloaded.issuerGeneration(), "", "A"}), time.Now()) {
		t.Fatal("response ID did not survive index reload")
	}
}

func TestOwnershipAuthorizationRotationDoesNotReviveOldExchange(t *testing.T) {
	cache, err := newCache(t.TempDir(), 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	g := &Gateway{Cache: cache, Key: "worker-key"}
	old := &exchange{g: g, r: httptest.NewRequest("POST", "/v1/messages", nil)}
	oldScope := old.ownershipScope()
	store := g.ownershipIndex()
	now := time.Now()
	if err := store.remember("old", oldScope, now); err != nil {
		t.Fatal(err)
	}
	if err := store.rotateAuthorization(); err != nil {
		t.Fatal(err)
	}
	current := &exchange{g: g, r: httptest.NewRequest("POST", "/v1/messages", nil)}
	currentScope := current.ownershipScope()
	if currentScope == oldScope || old.ownershipScope() != oldScope {
		t.Fatal("exchange issuer generation was not stable")
	}
	// A request admitted before rotation can finish afterwards; it remains
	// under the old captured issuer domain, including after a Worker restart.
	if err := store.remember("late-old-response", old.ownershipScope(), now); err != nil {
		t.Fatal(err)
	}
	reloaded := openMessageOwnership(store.path)
	if reloaded.owns("old", currentScope, now) || reloaded.owns("late-old-response", currentScope, now) {
		t.Fatal("old issuer revived")
	}
	if err := store.remember("new", currentScope, now); err != nil || !store.owns("new", currentScope, now) {
		t.Fatal("new issuer unusable", err)
	}
}
