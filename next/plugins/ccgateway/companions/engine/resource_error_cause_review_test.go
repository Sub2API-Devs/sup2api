package engine

import (
	"strings"
	"testing"
)

func TestReviewResourceErrorNeverAcceptsUnappliedScope(t *testing.T) {
	for _, done := range []bool{false, true} {
		scope := newMainRequestScope()
		_ = scope.enter()
		_ = scope.leave()
		s := &cliSession{cfg: &runConfig{scope: scope, control: &modControl{ready: true}}, acc: &Accumulator{Done: done, Message: Object{"stop_reason": "refusal"}}, relay: &outboundRelay{}}
		out, err := s.onResult(Object{"is_error": true, "result": "original API failure"})
		if err == nil || out != nil || !strings.Contains(err.Error(), "without applying") {
			t.Fatalf("Done=%v accepted missing attribution: %v", done, err)
		}
		if !done && !strings.HasPrefix(err.Error(), "Claude Code: original API failure") {
			t.Fatal("original failure not first")
		}
	}
}

func TestReviewResourceErrorPreservesCompletedRefusal(t *testing.T) {
	s := &cliSession{req: &Request{}, cfg: &runConfig{control: &modControl{ready: true}}, acc: &Accumulator{Done: true, Message: Object{"stop_reason": "refusal"}}, relay: &outboundRelay{}}
	out, err := s.onResult(Object{"is_error": true, "result": "CLI terminal status after complete response"})
	if err != nil || str(out, "stop_reason") != "refusal" {
		t.Fatalf("complete refusal changed: %v", err)
	}
}
