package engine

import "testing"

func TestReviewHelperPositionsRejectUnanchoredLeadingSystem(t *testing.T) {
	for _, boundaries := range [][]int{{1}, {1, 2}} {
		messages := []any{
			Object{"role": "system", "content": "unanchored private catalogue"},
			Object{"role": "user", "content": "public user"},
			Object{"role": "system", "content": "public directive"},
		}
		if _, err := helperInterleavedSystems(messages, boundaries); err == nil {
			t.Fatal("leading private system silently omitted from positional custody")
		}
	}
}
