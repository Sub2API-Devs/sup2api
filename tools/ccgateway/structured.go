package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/santhosh-tekuri/jsonschema/v6"
)

// Schemas are request data, never a source of files or network requests.
type denySchemaLoader struct{}

func (denySchemaLoader) Load(string) (any, error) {
	return nil, fmt.Errorf("external JSON Schema references are not supported")
}
func compileOutputSchema(schema Object) (*jsonschema.Schema, error) {
	encoded, err := json.Marshal(schema)
	if err != nil {
		return nil, err
	}
	resource, err := jsonschema.UnmarshalJSON(bytes.NewReader(encoded))
	if err != nil {
		return nil, err
	}
	c := jsonschema.NewCompiler()
	c.UseLoader(denySchemaLoader{})
	if err := c.AddResource("https://ccgateway.invalid/output.json", resource); err != nil {
		return nil, err
	}
	return c.Compile("https://ccgateway.invalid/output.json")
}
func validateStructuredText(schema Object, blocks []Object) error {
	var text strings.Builder
	for _, b := range blocks {
		if str(b, "type") == "text" {
			text.WriteString(str(b, "text"))
		}
	}
	v, err := jsonschema.UnmarshalJSON(strings.NewReader(text.String()))
	if err != nil {
		return fmt.Errorf("Claude Code did not return valid structured JSON")
	}
	compiled, err := compileOutputSchema(schema)
	if err != nil {
		return fmt.Errorf("invalid output JSON Schema")
	}
	if err = compiled.Validate(v); err != nil {
		return fmt.Errorf("Claude Code output does not match the requested JSON Schema")
	}
	return nil
}

// The CLI's synthetic StructuredOutput tool is returned as API JSON text.
// The CLI tool never executes on the user's behalf, and never escapes as tool_use.
func structuredBlock(name string, req *Request) bool {
	return name == "StructuredOutput" && req.structuredOutput()
}
func structuredInputText(input any) string { data, _ := json.Marshal(input); return string(data) }

// The CLI consumes its own formatting tool and omits the ordinary stream ending.
// Complete that ending only after its result confirms validated structured data.
func (a *Accumulator) finishStructured(result Object, req *Request) error {
	value, exists := result["structured_output"]
	if str(result, "subtype") != "success" || !exists || value == nil {
		return fmt.Errorf("Claude Code failed to produce validated structured output")
	}
	text := structuredInputText(value)
	if err := validateStructuredText(req.JSONSchema, []Object{{"type": "text", "text": text}}); err != nil {
		return err
	}
	if a.Message == nil || a.HasClientTool {
		return fmt.Errorf("incomplete structured-output stream")
	}
	blocks := []Object{}
	for _, b := range a.Blocks {
		if str(b, "type") == "thinking" || str(b, "type") == "redacted_thinking" {
			blocks = append(blocks, b)
		}
	}
	a.Blocks = append(blocks, Object{"type": "text", "text": text})
	usage, _ := a.Message["usage"].(map[string]any)
	if usage == nil {
		usage = Object{}
	}
	if models, ok := result["modelUsage"].(map[string]any); ok {
		counts := map[string]int{}
		for _, value := range models {
			model, _ := value.(map[string]any)
			for api, cli := range map[string]string{"input_tokens": "inputTokens", "output_tokens": "outputTokens", "cache_read_input_tokens": "cacheReadInputTokens", "cache_creation_input_tokens": "cacheCreationInputTokens"} {
				counts[api] += positive(model[cli])
			}
		}
		for k, v := range counts {
			usage[k] = v
		}
	}
	a.Message["usage"] = usage
	a.Message["content"] = a.Blocks
	a.Message["stop_reason"] = "end_turn"
	a.Message["stop_sequence"] = nil
	a.Stopped, a.Done = true, true
	return nil
}

// JSON is validated before either ordinary or streaming clients receive it.
// The API still uses SSE; the first text arrives after schema validation.
func emitStructuredMessage(message Object, emit func(Object) error) error {
	start := Object{}
	for k, v := range message {
		start[k] = v
	}
	start["content"], start["stop_reason"] = []Object{}, nil
	if err := emit(Object{"type": "message_start", "message": start}); err != nil {
		return err
	}
	blocks, _ := message["content"].([]Object)
	for index, b := range blocks {
		initial := Object{"type": str(b, "type")}
		deltas := []Object{}
		switch str(b, "type") {
		case "text":
			initial["text"] = ""
			deltas = append(deltas, Object{"type": "text_delta", "text": str(b, "text")})
		case "thinking":
			initial["thinking"], initial["signature"] = "", ""
			deltas = append(deltas, Object{"type": "thinking_delta", "thinking": str(b, "thinking")}, Object{"type": "signature_delta", "signature": str(b, "signature")})
		case "redacted_thinking":
			initial["data"] = b["data"]
		}
		if err := emit(Object{"type": "content_block_start", "index": index, "content_block": initial}); err != nil {
			return err
		}
		for _, delta := range deltas {
			if err := emit(Object{"type": "content_block_delta", "index": index, "delta": delta}); err != nil {
				return err
			}
		}
		if err := emit(Object{"type": "content_block_stop", "index": index}); err != nil {
			return err
		}
	}
	return emit(Object{"type": "message_delta", "delta": Object{"stop_reason": "end_turn", "stop_sequence": nil}, "usage": message["usage"]})
}
