package engine

import "testing"

func TestToolResultContextAlignmentView(t *testing.T) {
	context := "fixture trusted session context"
	suffix := "\n\n<system-reminder>\n" + context + "\n</system-reminder>"
	for _, mode := range []string{"trusted", "no-proof", "wrong-id", "changed-prefix", "unknown-suffix", "duplicate", "metadata"} {
		t.Run(mode, func(t *testing.T) {
			result := Object{"type": "tool_result", "tool_use_id": "tool_fixture", "content": "original result"}
			req := &Request{Messages: []Message{{Role: "user", Content: []Object{result}}}}
			control := &modControl{sessionContexts: map[string]bool{context: true}}
			actual := Object{"type": "tool_result", "tool_use_id": "tool_fixture", "content": "original result" + suffix}
			switch mode {
			case "no-proof":
				control = nil
			case "wrong-id":
				actual["tool_use_id"] = "other"
			case "changed-prefix":
				actual["content"] = "changed" + suffix
			case "unknown-suffix":
				actual["content"] = "original result" + suffix + "extra"
			case "metadata":
				actual["is_error"] = true
			}
			blocks := []any{actual}
			if mode == "duplicate" {
				blocks = append(blocks, actual)
			}
			body := Object{"messages": []any{Object{"role": "user", "content": blocks}}}
			original := digest(body)
			restore, err := normalizeToolResultContexts(req, body, control)
			if err == nil {
				_, err = alignClientHistory(req, body)
			}
			if mode != "trusted" {
				if err == nil {
					t.Fatal("unproven difference accepted")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if err = restore(body); err != nil {
				t.Fatal(err)
			}
			if digest(body) != original {
				t.Fatal("actual wire mutated")
			}
			if err = restore(body); err != nil || digest(body) != original {
				t.Fatal("restoration not idempotent", err)
			}
		})
	}
}
