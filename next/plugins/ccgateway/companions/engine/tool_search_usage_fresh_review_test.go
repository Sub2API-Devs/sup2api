package engine

import (
	"encoding/json"
	"math"
	"testing"
)

func TestFreshReviewSearchThinkingPartialDelta(t *testing.T) {
	total := Object{}
	if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "output_tokens_details": Object{"thinking_tokens": 7}}}); err != nil {
		t.Fatal(err)
	}
	current := Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "output_tokens_details": Object{"thinking_tokens": 11}}}
	event := Object{"usage": Object{"output_tokens_details": Object{"future_detail": "keep"}}}
	if err := mergeSearchUsage(event, total, current); err != nil {
		t.Fatal(err)
	}
	got := event["usage"].(Object)["output_tokens_details"].(Object)
	if tokenCount(got["thinking_tokens"]) != 18 || got["future_detail"] != "keep" {
		t.Fatalf("partial nested delta lost facts: %#v", got)
	}
}

func TestFreshReviewSearchHiddenNestedPartialDelta(t *testing.T) {
	// Partial nested updates are an extension robustness case, not a claim
	// that the official SDK guarantees this exact wire shape.
	s := freshReviewHiddenSession(Object{"input_tokens": 24, "output_tokens": 0, "cache_creation": Object{"ephemeral_1h_input_tokens": 1647}})
	e := Object{"type": "message_delta", "delta": Object{"stop_reason": "tool_use"}, "usage": Object{"output_tokens": 91, "cache_creation": Object{"ephemeral_5m_input_tokens": 0}}}
	if err := s.onStreamEvent(Object{"event": e}); err != nil {
		t.Fatal(err)
	}
	if err := s.endSearchRound(); err != nil {
		t.Fatal(err)
	}
	cache, _ := s.searchUsage["cache_creation"].(Object)
	if tokenCount(cache["ephemeral_1h_input_tokens"]) != 1647 {
		t.Fatalf("hidden nested partial delta lost initial 1h: %#v", s.searchUsage)
	}
}

func freshReviewHiddenSession(usage any) *cliSession {
	req := &Request{ToolSearch: "auto"}
	blocks := []Object{{"type": "tool_use", "name": "ToolSearch", "id": "hidden", "input": Object{}}}
	a := &Accumulator{Message: Object{"usage": usage, "content": blocks}, Blocks: blocks, Closed: map[int]bool{0: true}}
	return &cliSession{initialized: true, cfg: &runConfig{control: &modControl{ready: true}}, req: req, responseReq: req, p: &Prepared{}, acc: a, searchUsage: Object{}}
}

func TestFreshReviewSearchHiddenMalformedStartRoute(t *testing.T) {
	for _, bad := range []any{nil, "invalid", []any{1}} {
		s := freshReviewHiddenSession(bad)
		e := Object{"type": "message_delta", "delta": Object{"stop_reason": "tool_use"}, "usage": Object{"output_tokens": 91}}
		if err := s.onStreamEvent(Object{"event": e}); err == nil {
			t.Errorf("hidden malformed start overwritten: %#v", bad)
		}
	}
}

func TestFreshReviewSearchMalformedUsage(t *testing.T) {
	for _, bad := range []any{nil, "invalid", []any{1}} {
		if err := addSearchUsage(Object{}, Object{"usage": bad}); err == nil {
			t.Errorf("hidden malformed usage accepted: %#v", bad)
		}
		total := Object{}
		if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 1, "output_tokens": 0}}); err != nil {
			t.Fatal(err)
		}
		if err := mergeSearchUsage(Object{"usage": bad}, total, Object{"usage": Object{"input_tokens": 2, "output_tokens": 0}}); err == nil {
			t.Errorf("public malformed usage accepted: %#v", bad)
		}
	}
}

func TestFreshReviewSearchInvalidCounterAndCategory(t *testing.T) {
	for _, bad := range []any{nil, -1, 1.5, math.NaN(), math.Inf(1), json.Number("2147483648"), json.Number("1.5"), "7", Object{}, []any{}} {
		if err := addSearchUsage(Object{}, Object{"usage": Object{"input_tokens": bad, "output_tokens": 0}}); err == nil {
			t.Errorf("invalid counter accepted: %#v", bad)
		}
	}
	for _, bad := range []any{Object{}, []any{}, ""} {
		if err := addSearchUsage(Object{}, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "service_tier": bad}}); err == nil {
			t.Errorf("invalid category accepted: %#v", bad)
		}
	}
}

func TestFreshReviewSearchNestedDeltasAndPrivateState(t *testing.T) {
	total := Object{}
	if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 24, "output_tokens": 0, "cache_creation": Object{"ephemeral_1h_input_tokens": 1647}, "server_tool_use": Object{"web_search_requests": 2}}}); err != nil {
		t.Fatal(err)
	}
	a := &Accumulator{Message: Object{"usage": Object{"input_tokens": 10, "cache_creation": Object{"ephemeral_5m_input_tokens": 3}, "server_tool_use": Object{"web_fetch_requests": 4}}}}
	for _, delta := range []Object{{"output_tokens": 1, "cache_creation": Object{"ephemeral_1h_input_tokens": 5}}, {"output_tokens": 2, "cache_creation": Object{"ephemeral_5m_input_tokens": 8}, "server_tool_use": Object{"web_search_requests": 3}}} {
		e := Object{"usage": delta, "delta": Object{}}
		if err := mergeSearchUsage(e, total, a.Message); err != nil {
			t.Fatal(err)
		}
		if err := a.messageDelta(e); err != nil {
			t.Fatal(err)
		}
	}
	u := a.Message["usage"].(Object)
	cache := u["cache_creation"].(Object)
	server := u["server_tool_use"].(Object)
	if tokenCount(u["input_tokens"]) != 34 || tokenCount(cache["ephemeral_1h_input_tokens"]) != 1652 || tokenCount(cache["ephemeral_5m_input_tokens"]) != 8 || tokenCount(server["web_search_requests"]) != 5 || tokenCount(server["web_fetch_requests"]) != 4 {
		t.Fatalf("bad aggregate: %#v", u)
	}
	for _, key := range []string{"_public_usage", "_missing_service_tier", "_missing_inference_geo"} {
		if _, exists := u[key]; exists {
			t.Errorf("private field leaked: %s", key)
		}
	}
}

func TestFreshReviewSearchStructuredNewMessageResetsSnapshot(t *testing.T) {
	total := Object{}
	if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 24, "output_tokens": 0}}); err != nil {
		t.Fatal(err)
	}
	total["_public_usage"] = Object{"input_tokens": 100}
	req := &Request{JSONSchema: Object{"type": "object"}}
	s := &cliSession{initialized: true, cfg: &runConfig{control: &modControl{ready: true}}, req: req, responseReq: req, p: &Prepared{}, acc: &Accumulator{Done: true}, searchUsage: total, searchRounds: 1}
	start := Object{"type": "message_start", "message": Object{"id": "next", "role": "assistant", "usage": Object{"input_tokens": 10}}}
	if err := s.onStreamEvent(Object{"event": start}); err != nil {
		t.Fatal(err)
	}
	if _, ok := total["_public_usage"]; ok {
		t.Fatal("prior snapshot survived new message")
	}
	delta := Object{"type": "message_delta", "delta": Object{}, "usage": Object{"output_tokens": 2}}
	if err := s.onStreamEvent(Object{"event": delta}); err != nil {
		t.Fatal(err)
	}
	if got := tokenCount(s.acc.Message["usage"].(Object)["input_tokens"]); got != 34 {
		t.Fatalf("prior public message contaminated next: %d", got)
	}
}

func TestFreshReviewSearchNullCategoryAndUnknownFields(t *testing.T) {
	total := Object{}
	if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "service_tier": nil}}); err != nil {
		t.Fatal(err)
	}
	event := Object{"usage": Object{"output_tokens": 2, "service_tier": nil, "public_extension": Object{"keep": true}}}
	if err := mergeSearchUsage(event, total, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0}}); err != nil {
		t.Fatal(err)
	}
	u := event["usage"].(Object)
	if v, present := u["service_tier"]; !present || v != nil {
		t.Fatal("public null category lost")
	}
	if u["public_extension"].(Object)["keep"] != true {
		t.Fatal("public extension lost")
	}
	mixed := Object{}
	if err := addSearchUsage(mixed, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0, "service_tier": nil}}); err != nil {
		t.Fatal(err)
	}
	if err := mergeSearchUsage(Object{"usage": Object{"service_tier": "standard"}}, mixed, Object{"usage": Object{"input_tokens": 0, "output_tokens": 0}}); err == nil {
		t.Fatal("mixed unknown/known category accepted")
	}
	for _, unknown := range []Object{{"private_extension": 7}, {"cache_creation": Object{"future_bucket": 9}}, {"server_tool_use": Object{"future_tool": 1}}, {"output_tokens_details": Object{"future_detail": 2}}} {
		unknown["input_tokens"], unknown["output_tokens"] = 0, 0
		if err := addSearchUsage(Object{}, Object{"usage": unknown}); err == nil {
			t.Errorf("hidden unknown silently accepted: %#v", unknown)
		}
	}
}

func TestFreshReviewSearchMissingRequiredInputRoute(t *testing.T) {
	s := freshReviewHiddenSession(nil)
	delete(s.acc.Message, "usage")
	e := Object{"type": "message_delta", "delta": Object{"stop_reason": "tool_use"}, "usage": Object{"output_tokens": 91}}
	err := s.onStreamEvent(Object{"event": e})
	if err == nil {
		err = s.endSearchRound()
	}
	if err == nil {
		t.Fatalf("hidden missing input became zero: %#v", s.searchUsage)
	}
}

func TestFreshReviewSearchNullableCacheAndLargeSum(t *testing.T) {
	for _, key := range []string{"cache_creation_input_tokens", "cache_read_input_tokens"} {
		for _, numeric := range []int{0, 1} {
			total := Object{}
			if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 1, "output_tokens": 1, key: nil}}); err != nil {
				t.Fatal(err)
			}
			e := Object{"usage": Object{"output_tokens": 2}}
			err := mergeSearchUsage(e, total, Object{"usage": Object{"input_tokens": 2, "output_tokens": 0, key: numeric}})
			if numeric > 0 {
				if err == nil {
					t.Errorf("unknown plus nonzero %s accepted", key)
				}
				continue
			}
			if err != nil {
				t.Fatal(err)
			}
			u := e["usage"].(Object)
			if v, ok := u[key]; !ok || v != nil {
				t.Errorf("unknown plus zero %s became %v", key, v)
			}
			if _, ok := u["_null_"+key]; ok {
				t.Fatal("private null state leaked")
			}
		}
	}
	total := Object{}
	for i := 0; i < 3; i++ {
		if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": json.Number("2147483647"), "output_tokens": 0}}); err != nil {
			t.Fatal(err)
		}
	}
	e := Object{"usage": Object{"output_tokens": 0}}
	if err := mergeSearchUsage(e, total, Object{"usage": Object{"input_tokens": json.Number("2147483647"), "output_tokens": 0}}); err != nil {
		t.Fatal(err)
	}
	if got := int64(tokenCount(e["usage"].(Object)["input_tokens"])); got != 8589934588 {
		t.Fatalf("aggregate overflow: %d", got)
	}
}
