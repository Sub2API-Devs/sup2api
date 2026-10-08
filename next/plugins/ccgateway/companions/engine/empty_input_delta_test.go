package engine

import (
	"encoding/json"
	"testing"
)

func TestEmptyInputDeltaRetainsInitialObject(t *testing.T) {
	for _, initial := range []Object{{}, {"kept": json.Number("9007199254740993")}} {
		for _, part := range []any{"", " ", "{", "[]", "null", 42} {
			a := &Accumulator{Blocks: []Object{{"type": "tool_use", "input": initial}}, Inputs: map[int]string{}, Closed: map[int]bool{}, Structured: map[int]bool{}}
			err := a.blockDelta(Object{"index": 0, "delta": Object{"type": "input_json_delta", "partial_json": part}})
			if err == nil {
				err = a.blockStop(Object{"index": 0})
			}
			if part == "" {
				if err != nil || digest(a.Blocks[0]["input"]) != digest(initial) {
					t.Errorf("empty delta changed initial input: %v", err)
				}
			} else if err == nil {
				t.Errorf("invalid nonempty/type delta accepted %v", part)
			}
		}
	}
}
