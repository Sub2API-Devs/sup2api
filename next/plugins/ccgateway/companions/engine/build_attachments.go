package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// These facts describe this Worker, never the client's cwd or repository.
// On Unix, CC 2.1.302 renders node:os.type() + " " + node:os.release():
// uname -sr reports the same kernel facts without starting CC or a model.
var workerPlatform = func() string {
	if runtime.GOOS == "windows" {
		return "win32"
	}
	return runtime.GOOS
}()

var workerOSVersion = sync.OnceValues(func() (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	command, args := "uname", []string{"-sr"}
	if runtime.GOOS == "windows" {
		command, args = "cmd.exe", []string{"/d", "/c", "ver"}
	}
	out, err := exec.CommandContext(ctx, command, args...).Output()
	value := strings.TrimSpace(string(out))
	if err != nil || value == "" || len(value) > 512 || strings.ContainsAny(value, "\r\n\x00") {
		return "", fmt.Errorf("cannot read Worker OS version")
	}
	return value, nil
})

func buildAttachmentEnvironment(sources features.BuildAttachmentSources) (map[string]string, error) {
	facts := map[string]string{"platform_name": workerPlatform}
	if sources["os_version"] == "worker" {
		value, err := workerOSVersion()
		if err != nil {
			return nil, err
		}
		facts["os_version"] = value
	}
	return facts, nil
}

// Locate whole environment sections outside fences, either plain system text
// or the first content of a reminder. Scan once even for long client histories.
func buildEnvironmentSpans(text string) [][]int {
	candidates := environmentSection.FindAllStringIndex(text, -1)
	if len(candidates) == 0 {
		return nil
	}
	var result [][]int
	offset, index, depth := 0, 0, 0
	fence, content := "", false
	for _, line := range strings.SplitAfter(text, "\n") {
		if index < len(candidates) && candidates[index][0] == offset {
			if fence == "" && (depth == 0 || depth == 1 && !content) {
				result = append(result, candidates[index])
			}
			index++
		}
		value := strings.TrimSpace(line)
		if mark := codeFence(value); mark != "" {
			if fence == "" {
				fence = mark
			} else if mark[0] == fence[0] && len(mark) >= len(fence) && value == mark {
				fence = ""
			}
			content = true
		} else if fence == "" {
			switch value {
			case "<system-reminder>":
				depth++
				if depth > 1 {
					return nil
				}
				if depth == 1 {
					content = false
				}
			case "</system-reminder>":
				if depth == 0 {
					return nil
				}
				depth--
			default:
				if strings.Contains(value, "<system-reminder>") || strings.Contains(value, "</system-reminder>") {
					// Ambiguous inline/unbalanced markers: leave the rest alone.
					return nil
				}
				content = content || value != ""
			}
		}
		offset += len(line)
	}
	if depth != 0 || fence != "" {
		return nil
	}
	return result
}

// transformBuildAttachments edits only known environment text carriers. It
// preserves opaque RawMessages, including numbers, signed thinking, tool
// arguments, tool results, media and system lifecycle/inline-tool fields.
func transformBuildAttachments(raw []byte, sources features.BuildAttachmentSources, facts map[string]string) ([]byte, []Object, error) {
	if err := validateBuildContent(raw); err != nil {
		return nil, nil, err
	}
	if err := sources.Validate(); err != nil {
		return nil, nil, err
	}
	if sources.RequiresV2() {
		return nil, nil, fmt.Errorf("extended environment policy requires CLI v2 content adapter")
	}
	if !sources.UsesWorker() {
		return raw, nil, nil
	}
	for field, source := range sources {
		if source == "worker" && (facts[field] == "" || len(facts[field]) > 512 || strings.ContainsAny(facts[field], "\r\n\x00")) {
			return nil, nil, fmt.Errorf("Worker environment field %s is unavailable", field)
		}
	}
	var body map[string]json.RawMessage
	if json.Unmarshal(raw, &body) != nil || body == nil {
		return nil, nil, fmt.Errorf("expected a Messages JSON object")
	}
	var decisions []Object
	rewrite := func(text, where string, system bool) string {
		// User text is eligible only as a complete CC environment reminder.
		// Mixed user prose, quoted reminders and nested wrappers are opaque.
		if !system {
			trimmed := strings.TrimSpace(text)
			if !strings.HasPrefix(trimmed, "<system-reminder>") || !strings.HasSuffix(trimmed, "</system-reminder>") ||
				strings.Count(trimmed, "<system-reminder>") != 1 || strings.Count(trimmed, "</system-reminder>") != 1 {
				return text
			}
			content := strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(trimmed, "<system-reminder>"), "</system-reminder>"))
			if !strings.HasPrefix(content, "# Environment\n") && !strings.HasPrefix(content, "# Environment\r\n") {
				return text
			}
		}
		spans := buildEnvironmentSpans(text)
		if len(spans) == 0 {
			return text
		}
		var output strings.Builder
		previous := 0
		for _, span := range spans {
			start, end := span[0], span[1]
			section := text[start:end]
			lines := strings.SplitAfter(section, "\n")
			kinds := environmentLineKinds(lines)
			counts := map[string]int{}
			for _, kind := range kinds {
				if kind != "" {
					counts[kind]++
				}
			}
			// Missing cwd is legal in CC. Duplicate fields are ambiguous.
			valid := counts["platform_name"] == 1
			for kind, count := range counts {
				if kind != "additional_directories" && count > 1 {
					valid = false
				}
			}
			if !valid {
				continue
			}
			for index, kind := range kinds {
				if sources[kind] != "worker" {
					continue
				}
				line := lines[index]
				colon := strings.Index(line, ":")
				if colon < 0 {
					continue
				}
				eol := ""
				if strings.HasSuffix(line, "\r\n") {
					eol = "\r\n"
				} else if strings.HasSuffix(line, "\n") {
					eol = "\n"
				}
				next := line[:colon+1] + " " + facts[kind] + eol
				if next != line {
					lines[index] = next
					decisions = append(decisions, Object{"type": kind, "where": where, "source": "worker",
						"recognition": "cc_environment_v1", "before_digest": digest(line), "after_digest": digest(next)})
				}
			}
			output.WriteString(text[previous:start])
			output.WriteString(strings.Join(lines, ""))
			previous = end
		}
		output.WriteString(text[previous:])
		return output.String()
	}
	content := func(raw json.RawMessage, where string, system bool) json.RawMessage {
		var text string
		if json.Unmarshal(raw, &text) == nil {
			if next := rewrite(text, where, system); next != text {
				out, _ := json.Marshal(next)
				return out
			}
			return raw
		}
		var blocks []map[string]json.RawMessage
		if json.Unmarshal(raw, &blocks) != nil {
			return raw // The normal build validator reports invalid input.
		}
		changed := false
		for i, block := range blocks {
			var text string
			var kind string
			if json.Unmarshal(block["type"], &kind) != nil || kind != "text" || !isJSONString(block["text"]) || json.Unmarshal(block["text"], &text) != nil {
				continue
			}
			if next := rewrite(text, fmt.Sprintf("%s[%d]", where, i), system); next != text {
				block["text"], _ = json.Marshal(next)
				changed = true
			}
		}
		if !changed {
			return raw
		}
		out, _ := json.Marshal(blocks)
		return out
	}
	if value, ok := body["system"]; ok {
		body["system"] = content(value, "system", true)
	}
	var messages []map[string]json.RawMessage
	if json.Unmarshal(body["messages"], &messages) != nil {
		return nil, nil, fmt.Errorf("messages must be an array")
	}
	for i, message := range messages {
		var role string
		_ = json.Unmarshal(message["role"], &role)
		if role == "user" || role == "system" {
			message["content"] = content(message["content"], fmt.Sprintf("messages[%d].content", i), role == "system")
		}
	}
	if len(decisions) == 0 {
		return raw, decisions, nil
	}
	body["messages"], _ = json.Marshal(messages)
	out, err := json.Marshal(body)
	return out, decisions, err
}
