package engine

import (
	"strings"
	"testing"
)

func TestResourceCLIErrorRetainsCauseAndScopeFailure(t *testing.T) {
	scope := newMainRequestScope()
	_ = scope.enter()
	_ = scope.leave()
	session := &cliSession{cfg: &runConfig{scope: scope, control: &modControl{ready: true}}, acc: &Accumulator{}, relay: &outboundRelay{}}
	for _, frame := range []Object{
		{"is_error": true, "result": "fixture transport failure"},
		{"is_error": true, "errors": []any{"fixture transport failure"}},
	} {
		_, err := session.onResult(frame)
		if err == nil || !strings.Contains(err.Error(), "fixture transport failure") || !strings.Contains(err.Error(), "without applying") {
			t.Fatalf("first cause or attribution failure lost: %v", err)
		}
	}
}
