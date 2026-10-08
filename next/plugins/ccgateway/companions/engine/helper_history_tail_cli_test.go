package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestRealCLIHelperHistoryTrailingBudgetSystem(t *testing.T) {
	runHelperHistoryScenario(t, true, false, true)
}

func writeHelperFinalMultiDeltaFixture(w http.ResponseWriter, model string, blocks []Object) {
	rec := httptest.NewRecorder()
	writeInternalCacheFixture(rec, model, blocks)
	w.Header().Set("Content-Type", "text/event-stream")
	for _, line := range strings.Split(rec.Body.String(), "\n") {
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		e, _ := decodeObject([]byte(strings.TrimSpace(line[5:])))
		if str(e, "type") == "message_delta" {
			fmt.Fprint(w, "event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{},\"usage\":{\"output_tokens\":1}}\n\n")
		}
		raw, _ := json.Marshal(e)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(e, "type"), raw)
	}
}

// These are the real failing response's numerical facts, with synthetic content
// and identities. They deliberately cause CLI's own runtime budget update.
func writeHelperTailUsageFixture(w http.ResponseWriter, model string, blocks []Object) {
	rec := httptest.NewRecorder()
	writeHelperHistoryFixture(rec, model, blocks)
	w.Header().Set("Content-Type", "text/event-stream")
	for _, line := range strings.Split(rec.Body.String(), "\n") {
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		e, _ := decodeObject([]byte(strings.TrimSpace(line[5:])))
		usage := Object{"input_tokens": 24, "cache_creation_input_tokens": 1647, "cache_read_input_tokens": 0, "output_tokens": 91, "cache_creation": Object{"ephemeral_5m_input_tokens": 0, "ephemeral_1h_input_tokens": 1647}}
		if str(e, "type") == "message_start" {
			e["message"].(Object)["usage"] = usage
		}
		if str(e, "type") == "message_delta" {
			e["usage"] = usage
		}
		raw, _ := json.Marshal(e)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(e, "type"), raw)
	}
}
