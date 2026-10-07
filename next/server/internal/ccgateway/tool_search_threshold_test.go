package ccgateway

import (
	"strconv"
	"testing"
)

func TestToolSearchThresholdRange(t *testing.T) {
	for n := 0; n <= 100; n++ {
		p := defaultRequestPolicy()
		p.ToolSearch = "auto:" + strconv.Itoa(n)
		if err := validateRequestPolicy(p); err != nil {
			t.Fatalf("%s: %v", p.ToolSearch, err)
		}
	}
	for _, mode := range []string{"auto:-1", "auto:101", "auto:1.5", "auto:+1", "auto:01", "auto: 1", "auto:", "auto:999999999999999999999"} {
		p := defaultRequestPolicy()
		p.ToolSearch = mode
		if err := validateRequestPolicy(p); err == nil {
			t.Errorf("invalid threshold accepted: %s", mode)
		}
	}
}
