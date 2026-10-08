package engine

import (
	"fmt"
	"strings"
	"testing"
)

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

func TestToolResultContextRestoresASCIITail(t *testing.T) {
	for _, tail := range []string{"\t", "\r\n", "  ", "\t\r\n ", ""} {
		t.Run(fmt.Sprintf("%q", tail), func(t *testing.T) {
			original := "public fixture" + tail
			context := "trusted context"
			suffix := "\n\n<system-reminder>\n" + context + "\n</system-reminder>"
			req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "one", "content": original}}}}}
			body := Object{"messages": []any{Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "one", "content": strings.TrimRight(original, " \t\r\n") + suffix}}}}}
			restore, err := normalizeToolResultContexts(req, body, &modControl{sessionContexts: map[string]bool{context: true}})
			if err != nil {
				t.Fatal(err)
			}
			if _, err = alignClientHistory(req, body); err != nil {
				t.Fatal(err)
			}
			if err = restore(body); err != nil {
				t.Fatal(err)
			}
			blocks, _ := historyContent(body["messages"].([]any)[0].(Object)["content"])
			actual := blocks[0]["content"]
			if actual != original+suffix {
				t.Fatal("client trailing characters lost")
			}
		})
	}
}

func TestToolResultContextJSTrimEndSet(t *testing.T) {
	suffix := "\n\n<system-reminder>\ntrusted\n</system-reminder>"
	// Explicit specification list, independently enumerated from the helper.
	positive := []rune{0x9, 0xa, 0xb, 0xc, 0xd, 0x20, 0xa0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff}
	for _, r := range positive {
		original := "public" + string(r)
		if got, ok := toolResultContextSuffix(original, "public"+suffix, map[string]bool{suffix: true}); !ok || got != suffix {
			t.Errorf("JS trim missed U+%04X", r)
		}
	}
	for _, r := range []rune{0x85, 0x180e, 0x200b, 0x0, 0x8, 0x1c, 0x1f, 0x200c} {
		original := "public" + string(r)
		if _, ok := toolResultContextSuffix(original, "public"+suffix, map[string]bool{suffix: true}); ok {
			t.Errorf("non-JS trim accepted U+%04X", r)
		}
		if _, ok := toolResultContextSuffix(original, original+suffix, map[string]bool{suffix: true}); !ok {
			t.Errorf("exact prefix lost U+%04X", r)
		}
	}
}
