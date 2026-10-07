package engine

import (
	"strconv"
	"testing"
)

func TestToolSearchThresholdRange(t *testing.T) {
	for n := 0; n <= 100; n++ {
		p := defaultRequestPolicy()
		p.ToolSearch = "auto:" + strconv.Itoa(n)
		got, err := requestPolicy(policyHeaders(p))
		if err != nil || got.ToolSearch != p.ToolSearch {
			t.Fatalf("%s: got=%s err=%v", p.ToolSearch, got.ToolSearch, err)
		}
	}
	for _, mode := range []string{"auto:-1", "auto:101", "auto:1.5", "auto:+1", "auto:01", "auto: 1", "auto:", "auto:999999999999999999999"} {
		p := defaultRequestPolicy()
		p.ToolSearch = mode
		if _, err := requestPolicy(policyHeaders(p)); err == nil {
			t.Errorf("invalid threshold accepted: %s", mode)
		}
	}
}
