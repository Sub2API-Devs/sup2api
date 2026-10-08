package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type helperMemory struct {
	core.HelperHistory
	mu           sync.Mutex
	records      map[string]core.HelperHistoryRecord
	attempts     map[string]core.HelperHistoryReservation
	usage        []*core.UsageRecord
	commitErr    bool
	uncertainErr bool
	commits      int
}

func newHelperMemory() *helperMemory {
	return &helperMemory{records: map[string]core.HelperHistoryRecord{}, attempts: map[string]core.HelperHistoryReservation{}}
}
func (s *helperMemory) Lookup(_ context.Context, _ core.ResourceOwner, p []string) (core.HelperHistoryLookup, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := core.HelperHistoryLookup{State: core.HelperHistoryUnknown}
	for _, prefix := range p {
		if r, ok := s.records[prefix]; ok {
			out.Chain.Records = append(out.Chain.Records, r)
			out.Chain.Binding = r.Binding
			out.Namespace = r.Namespace
		}
	}
	if len(out.Chain.Records) > 0 {
		out.State = core.HelperHistoryKnownReady
		if len(out.Chain.Records) != len(p) {
			out.State = core.HelperHistoryKnownUnrestorable
		}
	}
	return out, nil
}
func (s *helperMemory) Reserve(_ context.Context, r core.HelperHistoryReservation) (core.HelperHistoryAttempt, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := fmt.Sprint(len(s.attempts) + 1)
	s.attempts[id] = r
	return core.HelperHistoryAttempt{ID: id, Binding: r.Binding}, nil
}
func (s *helperMemory) MarkDispatched(context.Context, core.ResourceOwner, string) error { return nil }
func (s *helperMemory) Abort(context.Context, core.ResourceOwner, string) error          { return nil }
func (s *helperMemory) Commit(_ context.Context, _ core.ResourceOwner, id string, c core.HelperHistoryCompletion) (core.HelperHistoryRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.commits++
	if s.commitErr {
		return core.HelperHistoryRecord{}, core.ErrConflict
	}
	r := s.attempts[id]
	saved := core.HelperHistoryRecord{Receipt: id, PublicPrefixDigest: c.PublicPrefixDigest, Namespace: r.Namespace, Binding: r.Binding, Payload: append([]byte(nil), c.Payload...)}
	s.records[c.PublicPrefixDigest] = saved
	copy := *c.Usage
	s.usage = append(s.usage, &copy)
	return saved, nil
}
func (s *helperMemory) PersistUncertainUsage(_ context.Context, _ core.ResourceOwner, _ string, r *core.UsageRecord) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.uncertainErr {
		return core.ErrUnavailable
	}
	copy := *r
	s.usage = append(s.usage, &copy)
	return nil
}

func helperHTTPFixture(t *testing.T, modes ...string) (*env, *helperMemory, *atomic.Int32) {
	t.Helper()
	e, _, _ := resourceTestEnv(t)
	s := newHelperMemory()
	e.gw.d.HelperHistory = s
	e.gw.d.EnableHelperHistory = true
	e.gw.helperRequirement = func(context.Context, int64, *http.Request) (string, error) { return wire.RequirementNeedsCustody, nil }
	e.gw.helperRuntime = func(_ context.Context, id int64, _ string) (helperRuntimeInfo, error) {
		return helperRuntimeInfo{Namespace: "fixture-policy", Binding: core.ResourceBinding{AccountID: id, PrincipalID: "issuer", Generation: "epoch"}}, nil
	}
	calls := new(atomic.Int32)
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		raw, _ := io.ReadAll(r.Body)
		in, err := wire.DecodeRequest(raw)
		if err != nil || !wire.Enabled(r.Header) {
			t.Error("invalid internal envelope", err)
			w.WriteHeader(500)
			return
		}
		public := []byte(`{"id":"message","type":"message","role":"assistant","content":[{"type":"text","text":"answer"}],"model":"` + testModel + `","stop_reason":"end_turn","usage":{"input_tokens":11,"output_tokens":7}}`)
		out := wire.ResponseEnvelope{Version: 1, AttemptID: in.AttemptID, RequestDigest: in.RequestDigest, Namespace: in.Namespace, Identity: in.Identity, StatusCode: 200, ContentType: "application/json", Headers: http.Header{"Retry-After": []string{"7"}}, Body: public, Delta: json.RawMessage(`{"version":1,"segments":[]}`)}
		out.PayloadVersion = in.PayloadVersion
		if in.EffectivePayloadVersion() == 2 {
			out.Delta = json.RawMessage(`{"version":2,"segments":[]}`)
		}
		var requested struct {
			Stream bool `json:"stream"`
		}
		json.Unmarshal(in.Request, &requested)
		if requested.Stream {
			out.ContentType = "text/event-stream"
			out.Body = []byte("event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"message\",\"type\":\"message\",\"role\":\"assistant\",\"model\":\"" + testModel + "\",\"content\":[],\"usage\":{\"input_tokens\":11,\"output_tokens\":0}}}\n\nevent: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"answer\"}}\n\nevent: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":0}\n\nevent: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":7}}\n\nevent: message_stop\ndata: {\"type\":\"message_stop\"}\n\n")
		}
		if len(modes) > 0 {
			switch modes[0] {
			case "thinking_estimates", "thinking_unknown", "thinking_refusal":
				out.ContentType = "text/event-stream"
				out.Body = helperThinkingEstimateSSE()
				if modes[0] == "thinking_unknown" {
					out.Body = []byte(strings.ReplaceAll(string(out.Body), "estimated_tokens", "unknown_display_hint"))
				}
				if modes[0] == "thinking_refusal" {
					out.Body = []byte(strings.ReplaceAll(string(out.Body), "end_turn", "refusal"))
				}
			case "issuer":
				out.Identity.Generation = "changed"
			case "error":
				out.StatusCode = 400
				out.Body = []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"fixture rejection"}}`)
			case "partial":
				out.StatusCode = 502
				out.Body = []byte(`{"type":"error","error":{"type":"api_error","message":"fixture EOF"}}`)
				out.Accounting = &wire.AccountingEvidence{Source: wire.AccountingProviderCalls, Known: true, Complete: false, Calls: []wire.AccountingCall{{Complete: true, Frames: []json.RawMessage{json.RawMessage(`{"usage":{"input_tokens":20,"output_tokens":8}}`)}}, {Complete: false, Frames: []json.RawMessage{json.RawMessage(`{"usage":{"input_tokens":17,"output_tokens":0}}`)}}}}
			}
		}
		w.Header().Set("Content-Type", wire.ContentType)
		json.NewEncoder(w).Encode(out)
	}))
	t.Cleanup(up.Close)
	e.plat.base = up.URL
	return e, s, calls
}
func helperRequestBody() map[string]any {
	b := body(testModel, false)
	b["output_config"] = map[string]any{"task_budget": map[string]any{"type": "tokens", "total": 10000}}
	return b
}

func TestHelperCustodyHTTPEmptyOrdinaryReceiptsAndRollback(t *testing.T) {
	e, s, calls := helperHTTPFixture(t)
	first := helperRequestBody()
	reply := e.messages(first)
	if reply.status != 200 {
		t.Fatalf("first %d %s", reply.status, reply.body)
	}
	var answer struct {
		Content json.RawMessage `json:"content"`
	}
	json.Unmarshal(reply.body, &answer)
	raw, _ := json.Marshal(first)
	messages, _, _ := publicHelperPrefixes(raw)
	messages = append(messages, json.RawMessage(`{"role":"assistant","content":`+string(answer.Content)+`}`), json.RawMessage(`{"role":"user","content":"ordinary follow up"}`))
	ordinary := body(testModel, false)
	ordinary["messages"] = messages
	reply = e.messages(ordinary)
	if reply.status != 200 {
		t.Fatalf("ordinary %d %s", reply.status, reply.body)
	}
	// A rollback is another branch off the first immutable public boundary.
	messages[len(messages)-1] = json.RawMessage(`{"role":"user","content":"branch"}`)
	reply = e.messages(ordinary)
	if reply.status != 200 {
		t.Fatalf("branch %d %s", reply.status, reply.body)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if calls.Load() != 3 || s.commits != 3 || len(s.usage) != 3 {
		t.Fatalf("calls=%d commits=%d usage=%d", calls.Load(), s.commits, len(s.usage))
	}
	for _, u := range s.usage {
		if !u.Success || u.Tokens.Input != 11 || u.Tokens.Output != 7 {
			t.Fatalf("usage %+v", u)
		}
	}
	select {
	case <-e.settler.ch:
		t.Fatal("ordinary Submit duplicated durable usage")
	default:
	}
}
func TestHelperCustodyHTTPCommitFailureNeverLeaksSuccess(t *testing.T) {
	for _, allStorageFails := range []bool{false, true} {
		t.Run(fmt.Sprint(allStorageFails), func(t *testing.T) {
			e, s, calls := helperHTTPFixture(t)
			s.commitErr = true
			s.uncertainErr = allStorageFails
			r := e.messages(helperRequestBody())
			if r.status != 503 || strings.Contains(string(r.body), "answer") || calls.Load() != 1 {
				t.Fatalf("status %d calls %d body %s", r.status, calls.Load(), r.body)
			}
			s.mu.Lock()
			defer s.mu.Unlock()
			if !allStorageFails && (len(s.usage) != 1 || s.usage[0].Success || s.usage[0].StatusCode != 503 || s.usage[0].Tokens.Input != 11) {
				t.Fatal("failure usage lost")
			}
			select {
			case <-e.settler.ch:
				t.Fatal("fallback Submit creates receipt race")
			case <-time.After(10 * time.Millisecond):
			}
		})
	}
}
func TestHelperCustodyUnknownOldAssistantRejected(t *testing.T) {
	e, _, calls := helperHTTPFixture(t)
	b := helperRequestBody()
	b["messages"] = []any{map[string]any{"role": "user", "content": "old"}, map[string]any{"role": "assistant", "content": "old"}, map[string]any{"role": "user", "content": "new"}}
	r := e.messages(b)
	if r.status != 400 || calls.Load() != 0 {
		t.Fatalf("status %d calls%d", r.status, calls.Load())
	}
}

func TestHelperCustodySSEAndErrorIdentity(t *testing.T) {
	for _, mode := range []string{"sse", "error", "issuer", "partial"} {
		t.Run(mode, func(t *testing.T) {
			e, s, calls := helperHTTPFixture(t, mode)
			b := helperRequestBody()
			b["stream"] = mode == "sse"
			r := e.do("/v1/messages", b, map[string]string{wire.Header: "forged", wire.Header + "-Extra": "forged"})
			want := 200
			if mode == "error" {
				want = 400
			}
			if mode == "issuer" {
				want = 503
			}
			if mode == "partial" {
				want = 502
			}
			if r.status != want || calls.Load() != 1 {
				t.Fatalf("status%d want%d calls%d body%s", r.status, want, calls.Load(), r.body)
			}
			s.mu.Lock()
			defer s.mu.Unlock()
			if len(s.usage) != 1 {
				t.Fatal("missing frozen usage")
			}
			if mode == "sse" && (s.commits != 1 || s.usage[0].Tokens.Output != 7 || r.header.Get("Retry-After") != "7") {
				t.Fatal("SSE history/usage/facts lost")
			}
			if mode == "error" && (s.commits != 0 || !strings.Contains(string(r.body), "fixture rejection")) {
				t.Fatal("inner status was hidden")
			}
			if mode == "partial" {
				u := s.usage[0]
				if u.BillingError == "" || len(u.Replacement) != 2 || u.Replacement[0].Tokens.Input != 20 || u.Replacement[0].Tokens.Output != 8 || u.Replacement[1].Tokens.Input != 17 {
					t.Fatalf("partial facts %+v", u)
				}
			}
		})
	}
}

func TestHelperCustodyRuntimeAndPolicyGates(t *testing.T) {
	caps := features.RuntimeCapabilities{HelperHistorySchemaVersions: []int{1}, Probes: []features.RuntimeProbe{{Name: "cli_version", Status: "observed", Value: "2.1.292"}}}
	ns, err := helperRuntimeNamespace(caps, "actual-model", json.RawMessage(`{"schema_version":1}`))
	if err != nil || ns == "" {
		t.Fatal(err)
	}
	caps.HelperHistorySchemaVersions = nil
	if _, err = helperRuntimeNamespace(caps, "actual-model", json.RawMessage(`{}`)); err == nil {
		t.Fatal("old Worker admitted")
	}
	h := http.Header{wire.Header: []string{"1"}, "x-ccgateway-helper-history-extra": []string{"forged"}, "Authorization": []string{"Bearer fixture"}}
	stripHelperHistoryHeaders(h)
	if len(h) != 1 || h.Get("Authorization") == "" {
		t.Fatal("private header removal failed")
	}
}
func TestHelperCustodyBindingChangeRejectsBeforeProvider(t *testing.T) {
	e, s, calls := helperHTTPFixture(t)
	first := helperRequestBody()
	r := e.messages(first)
	if r.status != 200 {
		t.Fatal(r.status)
	}
	var m struct{ Content json.RawMessage }
	json.Unmarshal(r.body, &m)
	raw, _ := json.Marshal(first)
	messages, _, _ := publicHelperPrefixes(raw)
	messages = append(messages, json.RawMessage(`{"role":"assistant","content":`+string(m.Content)+`}`), json.RawMessage(`{"role":"user","content":"next"}`))
	b := body(testModel, false)
	b["messages"] = messages
	e.gw.helperRuntime = func(_ context.Context, id int64, _ string) (helperRuntimeInfo, error) {
		return helperRuntimeInfo{Namespace: "fixture-policy", Binding: core.ResourceBinding{AccountID: id, PrincipalID: "issuer", Generation: "new-epoch"}}, nil
	}
	r = e.messages(b)
	if r.status != 400 || calls.Load() != 1 {
		t.Fatalf("issuer changed status%d calls%d", r.status, calls.Load())
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.attempts) != 1 {
		t.Fatal("changed binding reserved")
	}
}
