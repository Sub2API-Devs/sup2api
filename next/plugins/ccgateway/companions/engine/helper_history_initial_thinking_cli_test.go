package engine

import "testing"

// Reuses the full custody fixture; this integration test belongs to helper
// history, while the independent stream bridge tests need no custody runtime.
func TestRealCLIInitialThinkingCarrier(t *testing.T) {
	t.Setenv("CCG_PROBE_INITIAL_THINKING", "1")
	TestRealCLIHelperHistoryCarrier(t)
}
