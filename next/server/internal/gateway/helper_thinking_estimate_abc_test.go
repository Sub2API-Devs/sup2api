package gateway

import (
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"testing"
)

func TestHelperHistoryABCThinkingEstimateRealDBCLI(t *testing.T) {
	runHelperHistoryABCRealDBCLI(t, false, abcHelperOptions{TailReminder: true, SessionContext: true, StrictToolReferences: true, ThinkingEstimates: true})
}

func verifyABCThinkingProgress(t *testing.T, frames [][]byte, expected int) {
	t.Helper()
	if err := abcThinkingProgress(frames, expected); err != nil {
		t.Fatal(err)
	}
}

func abcThinkingProgress(frames [][]byte, expected int) error {
	thinking, counts, nulls := 0, 0, 0
	for _, raw := range frames {
		var event struct {
			Type  string
			Block struct{ Type string } `json:"content_block"`
			Delta struct {
				Type     string
				Estimate json.RawMessage `json:"estimated_tokens"`
			}
		}
		if err := json.Unmarshal(raw, &event); err != nil {
			return err
		}
		if event.Type == "content_block_start" && event.Block.Type == "thinking" {
			thinking++
		}
		if event.Type != "content_block_delta" || event.Delta.Type != "thinking_delta" {
			continue
		}
		switch string(event.Delta.Estimate) {
		case "50":
			counts++
		case "null":
			nulls++
		default:
			return fmt.Errorf("raw CLI thinking progress missing or changed")
		}
	}
	if thinking != expected || counts != expected || nulls != expected {
		return fmt.Errorf("raw CLI progress lost: expected=%d blocks=%d count=%d null=%d", expected, thinking, counts, nulls)
	}
	return nil
}

func TestABCThinkingProgressEmitter(t *testing.T) {
	w := httptest.NewRecorder()
	emitABCResponse(w, "fixture", 1, []map[string]any{{"type": "thinking", "thinking": "", "signature": "fixture"}}, abcResponseOptions{ThinkingEstimates: true, Refusal: true})
	events, err := resourceResponseEvents(w.Body.Bytes(), true)
	if err != nil {
		t.Fatal(err)
	}
	var frames [][]byte
	for _, event := range events {
		frames = append(frames, event.data)
	}
	verifyABCThinkingProgress(t, frames, 1)
	if abcThinkingProgress(nil, 1) == nil {
		t.Fatal("removed thinking block accepted")
	}
	if abcThinkingProgress(frames, 0) == nil {
		t.Fatal("unexpected thinking block accepted")
	}
}
