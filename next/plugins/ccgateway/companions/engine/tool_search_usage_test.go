package engine

import "testing"

func TestSearchUsageSpeedClassification(t *testing.T) {
	for _, tc := range []struct {
		name            string
		hidden, current any
		wantError       bool
	}{
		{"standard", "standard", "standard", false},
		{"fast", "fast", "fast", false},
		{"nullable", nil, nil, false},
		{"conflict", "standard", "fast", true},
		{"incomplete", nil, "fast", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			total := Object{}
			if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 1, "output_tokens": 2, "speed": tc.hidden}}); err != nil {
				t.Fatal(err)
			}
			current := Object{"usage": Object{"input_tokens": 3, "output_tokens": 0, "speed": tc.current}}
			event := Object{"usage": Object{"output_tokens": 4}}
			err := mergeSearchUsage(event, total, current)
			if (err != nil) != tc.wantError {
				t.Fatalf("error %v; expected rejection %v", err, tc.wantError)
			}
			if !tc.wantError && current["usage"].(Object)["speed"] != tc.current {
				t.Fatal("classification mutated")
			}
		})
	}
	// A second hidden call cannot silently replace the first call's speed.
	total := Object{}
	for i, speed := range []string{"standard", "fast"} {
		err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 1, "output_tokens": 1, "speed": speed}})
		if (err != nil) != (i == 1) {
			t.Fatalf("hidden speed conflict: %v", err)
		}
	}
}

func TestSearchUsageKnownExtensionAggregation(t *testing.T) {
	total := Object{}
	for _, n := range []int{2, 3} {
		u := Object{"input_tokens": 1, "output_tokens": 2, "server_tool_use": Object{"web_search_requests": n}, "output_tokens_details": Object{"thinking_tokens": n}, "iterations": []any{Object{"type": "message", "input_tokens": n}}}
		if err := addSearchUsage(total, Object{"usage": u}); err != nil {
			t.Fatal(err)
		}
	}
	current := Object{"usage": Object{"input_tokens": 4, "output_tokens": 0, "server_tool_use": Object{"web_search_requests": 7}, "output_tokens_details": Object{"thinking_tokens": 11}, "iterations": []any{Object{"type": "message", "input_tokens": 4}}}}
	for _, n := range []int{1, 2} {
		event := Object{"usage": Object{"output_tokens": n, "output_tokens_details": Object{}}}
		if err := mergeSearchUsage(event, total, current); err != nil {
			t.Fatal(err)
		}
		u := event["usage"].(Object)
		if tokenCount(u["server_tool_use"].(Object)["web_search_requests"]) != 12 || tokenCount(u["output_tokens_details"].(Object)["thinking_tokens"]) != 16 || len(u["iterations"].([]any)) != 3 {
			t.Fatalf("known facts lost or counted twice: %v", u)
		}
		current["usage"] = u
	}
}

func TestSearchUsageNullableCounters(t *testing.T) {
	for _, mixed := range []bool{false, true} {
		total := Object{}
		if err := addSearchUsage(total, Object{"usage": Object{"input_tokens": 1, "output_tokens": 1, "cache_creation_input_tokens": nil}}); err != nil {
			t.Fatal(err)
		}
		var value any
		if mixed {
			value = 3
		}
		event := Object{"usage": Object{"output_tokens": 2}}
		err := mergeSearchUsage(event, total, Object{"usage": Object{"input_tokens": 2, "output_tokens": 0, "cache_creation_input_tokens": value}})
		if mixed {
			if err == nil {
				t.Fatal("unknown mixed with nonzero became complete count")
			}
			continue
		}
		if err != nil {
			t.Fatal(err)
		}
		if event["usage"].(Object)["cache_creation_input_tokens"] != nil {
			t.Fatal("null became zero")
		}
	}
}

func TestSearchUsagePreservesReportedCacheLifetimes(t *testing.T) {
	for _, tc := range []struct {
		name           string
		hidden         []Object
		initial, delta Object
		want           Object
	}{
		{"both rounds", []Object{{"ephemeral_5m_input_tokens": 5}, {"ephemeral_1h_input_tokens": 7}}, Object{"ephemeral_5m_input_tokens": 11, "ephemeral_1h_input_tokens": 13}, nil, Object{"ephemeral_5m_input_tokens": 16, "ephemeral_1h_input_tokens": 20}},
		{"delta replaces current", []Object{{"ephemeral_1h_input_tokens": 7}}, Object{"ephemeral_1h_input_tokens": 13}, Object{"ephemeral_1h_input_tokens": 17}, Object{"ephemeral_1h_input_tokens": 24}},
		{"reported zero", []Object{{"ephemeral_1h_input_tokens": 0}}, nil, nil, Object{"ephemeral_1h_input_tokens": 0}},
		{"missing is not inferred", []Object{nil}, nil, nil, nil},
		{"preserve public extension", []Object{{"ephemeral_1h_input_tokens": 7}}, Object{"provider_extension": "value"}, nil, Object{"ephemeral_1h_input_tokens": 7, "provider_extension": "value"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			total := Object{}
			for _, cache := range tc.hidden {
				u := Object{"input_tokens": 0, "output_tokens": 0, "cache_creation_input_tokens": 100}
				if cache != nil {
					u["cache_creation"] = cache
				}
				if err := addSearchUsage(total, Object{"usage": u}); err != nil {
					t.Fatal(err)
				}
			}
			initial, delta := Object{"input_tokens": 0, "output_tokens": 0}, Object{}
			if tc.initial != nil {
				initial["cache_creation"] = tc.initial
			}
			if tc.delta != nil {
				delta["cache_creation"] = tc.delta
			}
			before := digest(initial)
			event := Object{"usage": delta}
			if err := mergeSearchUsage(event, total, Object{"usage": initial}); err != nil {
				t.Fatal(err)
			}
			got, _ := event["usage"].(Object)["cache_creation"].(Object)
			if digest(got) != digest(tc.want) {
				t.Fatalf("got %v want %v", got, tc.want)
			}
			if digest(initial) != before {
				t.Fatal("current public usage was mutated")
			}
		})
	}
}
