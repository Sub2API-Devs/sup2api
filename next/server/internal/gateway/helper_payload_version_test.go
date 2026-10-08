package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"testing"
)

func TestHelperPayloadCapabilityIntersection(t *testing.T) {
	for _, tc := range []struct {
		versions []int
		want     int
		fail     bool
	}{{nil, 1, false}, {[]int{1}, 1, false}, {[]int{1, 2, 999}, 2, false}, {[]int{999}, 0, true}, {[]int{2}, 2, false}} {
		v, err := (helperRuntimeInfo{PayloadVersions: tc.versions}).payloadVersion()
		if (err != nil) != tc.fail || v != tc.want {
			t.Fatalf("versions%v =>%d %v", tc.versions, v, err)
		}
	}
}

func TestHelperKnownVersionTwoRejectsLegacyBeforeReserve(t *testing.T) {
	e, s, calls := helperHTTPFixture(t)
	legacyRuntime := e.gw.helperRuntime
	e.gw.helperRuntime = func(ctx context.Context, id int64, model string) (helperRuntimeInfo, error) {
		info, err := legacyRuntime(ctx, id, model)
		info.PayloadVersions = []int{1, 2}
		return info, err
	}
	body := helperRequestBody()
	first := e.messages(body)
	if first.status != 200 {
		t.Fatal(first.status)
	}
	var message struct{ Content json.RawMessage }
	_ = json.Unmarshal(first.body, &message)
	raw, _ := json.Marshal(body)
	messages, _, _ := publicHelperPrefixes(raw)
	body["messages"] = append(messages, json.RawMessage(`{"role":"assistant","content":`+string(message.Content)+`}`), json.RawMessage(`{"role":"user","content":"next"}`))
	e.gw.helperRuntime = legacyRuntime
	result := e.messages(body)
	if result.status != 400 || calls.Load() != 1 || len(s.attempts) != 1 {
		t.Fatalf("downgraded known v2: HTTP%d calls%d reserve%d", result.status, calls.Load(), len(s.attempts))
	}
}

func TestHelperLegacyReceiptCanAppendVersionTwoWithoutRewrite(t *testing.T) {
	e, s, calls := helperHTTPFixture(t)
	body := helperRequestBody()
	first := e.messages(body)
	if first.status != 200 {
		t.Fatal(first.status)
	}
	old := map[string][]byte{}
	for prefix, r := range s.records {
		old[prefix] = append([]byte(nil), r.Payload...)
	}
	legacyRuntime := e.gw.helperRuntime
	e.gw.helperRuntime = func(ctx context.Context, id int64, model string) (helperRuntimeInfo, error) {
		info, err := legacyRuntime(ctx, id, model)
		info.PayloadVersions = []int{1, 2}
		return info, err
	}
	var message struct{ Content json.RawMessage }
	_ = json.Unmarshal(first.body, &message)
	raw, _ := json.Marshal(body)
	messages, _, _ := publicHelperPrefixes(raw)
	body["messages"] = append(messages, json.RawMessage(`{"role":"assistant","content":`+string(message.Content)+`}`), json.RawMessage(`{"role":"user","content":"next"}`))
	result := e.messages(body)
	if result.status != 200 || calls.Load() != 2 || len(s.records) != 2 {
		t.Fatalf("legacy append failed HTTP%d records%d", result.status, len(s.records))
	}
	for prefix, raw := range old {
		if !bytes.Equal(raw, s.records[prefix].Payload) {
			t.Fatal("old immutable receipt changed")
		}
	}
	versions := map[int]bool{}
	for _, r := range s.records {
		var p struct{ Version int }
		_ = json.Unmarshal(r.Payload, &p)
		versions[p.Version] = true
		if r.Binding.AccountID == 0 || r.Namespace != "fixture-policy" {
			t.Fatal("binding/namespace changed")
		}
	}
	if !versions[1] || !versions[2] {
		t.Fatal("missing mixed version chain")
	}
}
