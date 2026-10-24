package engine

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/big"
	"strconv"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// messagesBuildComponents writes the envelope of the CLI's request --build:
// the client's blocks in their positions and order (only tools[].input_schema
// renamed in place), the CLI's part of the wire policy (features.CLIPolicy)
// and the Worker's runtime context.
func messagesBuildComponents(raw []byte, policy *features.CLIPolicy, workingDirectory string) ([]byte, error) {
	if err := validateBuildNumbers(raw); err != nil {
		return nil, err
	}
	// The body is read once; each part is validated where it is taken.
	body, model, err := messagesObject(raw)
	if err != nil {
		return nil, err
	}
	messages, err := validateBuildContent(body)
	if err != nil {
		return nil, err
	}
	system, hasSystem, err := buildSystemComponent(body)
	if err != nil {
		return nil, err
	}
	tools, hasTools, err := buildToolComponents(body)
	if err != nil {
		return nil, err
	}
	stream, hasStream := body["stream"]
	for _, key := range []string{"model", "system", "messages", "tools", "stream"} {
		delete(body, key)
	}
	components := map[string]any{"model": model, "messages": messages, "attachments": []any{}, "parameters": body}
	// What the client did not send the envelope leaves out (audit C10): the
	// CLI reads an absent stream as false and an absent system as none
	// (cli-mods request-input.js), as the upstream does. An absent tool
	// catalog differs from an explicit empty one: the CLI sends tools only
	// when the client did.
	if hasSystem {
		components["systemPrompt"] = system
	}
	if hasStream {
		components["stream"] = stream
	}
	if hasTools {
		components["tools"] = tools
	}
	components["requestPolicy"] = policy
	components["runtimeContext"] = map[string]any{"workingDirectory": workingDirectory, "additionalWorkingDirectories": []string{}}
	return json.Marshal(components)
}

// messagesObject reads a Messages body as an object with its model: what the
// CLI's checkModelRequest requires of every request, in either mode.
func messagesObject(raw []byte) (map[string]json.RawMessage, string, error) {
	var body map[string]json.RawMessage
	if err := json.Unmarshal(raw, &body); err != nil || body == nil {
		return nil, "", errors.New("expected a Messages JSON object")
	}
	var model string
	if json.Unmarshal(body["model"], &model) != nil || strings.TrimSpace(model) == "" {
		return nil, "", errors.New("model must be a non-empty string")
	}
	return body, model, nil
}

// buildSystemComponent is the client's system as the CLI takes it: a string,
// or text blocks with their cache markers; has is false when it sent none.
func buildSystemComponent(body map[string]json.RawMessage) (system json.RawMessage, has bool, err error) {
	rawSystem, ok := body["system"]
	if !ok {
		return nil, false, nil
	}
	if bytes.Equal(bytes.TrimSpace(rawSystem), []byte("null")) {
		return nil, true, fmt.Errorf("system cannot be null")
	}
	var text string
	if json.Unmarshal(rawSystem, &text) == nil {
		return rawSystem, true, nil
	}
	var blocks []map[string]json.RawMessage
	if json.Unmarshal(rawSystem, &blocks) != nil {
		return nil, true, fmt.Errorf("build mode requires text system blocks")
	}
	for i, block := range blocks {
		if err := checkSystemBlock(block, i); err != nil {
			return nil, true, err
		}
	}
	return rawSystem, true, nil
}

// checkSystemBlock: a system block is a text block (with its cache marker),
// never one of the CLI's internal types.
func checkSystemBlock(block map[string]json.RawMessage, i int) error {
	var kind, text string
	if json.Unmarshal(block["type"], &kind) == nil && strings.HasPrefix(kind, "ccgateway_") {
		return fmt.Errorf("reserved internal block type at system[%d]", i)
	}
	if kind != "text" || !isJSONString(block["text"]) || json.Unmarshal(block["text"], &text) != nil {
		return fmt.Errorf("build mode requires text system blocks")
	}
	for key := range block {
		if key != "type" && key != "text" && key != "cache_control" {
			return fmt.Errorf("build mode cannot represent system block field %s", key)
		}
	}
	return nil
}

// buildToolComponents is the client's tool catalog: each tool with its keys
// in the client's order (only input_schema renamed in place), so the wire
// tools the CLI sends are the client's. has is false when the client sent none.
func buildToolComponents(body map[string]json.RawMessage) (wire []json.RawMessage, has bool, err error) {
	rawTools, has := body["tools"]
	if !has {
		return nil, false, nil
	}
	var tools []map[string]json.RawMessage
	wire = []json.RawMessage{}
	if json.Unmarshal(rawTools, &tools) != nil || tools == nil || json.Unmarshal(rawTools, &wire) != nil {
		return nil, true, fmt.Errorf("tools must be an array")
	}
	for index, tool := range tools {
		if wire[index], err = buildToolComponent(tool, wire[index]); err != nil {
			return nil, true, err
		}
	}
	return wire, true, nil
}

func buildToolComponent(tool map[string]json.RawMessage, wire json.RawMessage) (json.RawMessage, error) {
	var name string
	if tool == nil || json.Unmarshal(tool["name"], &name) != nil || strings.TrimSpace(name) == "" {
		return nil, fmt.Errorf("tool definition requires a name")
	}
	var kind string
	if rawType, ok := tool["type"]; ok && json.Unmarshal(rawType, &kind) != nil {
		return nil, fmt.Errorf("tool type must be a string")
	}
	if kind != "" && kind != "custom" {
		return wire, nil
	}
	if _, collision := tool["inputSchema"]; collision {
		return nil, fmt.Errorf("HTTP tools must use input_schema")
	}
	var schema map[string]json.RawMessage
	if json.Unmarshal(tool["input_schema"], &schema) != nil || schema == nil {
		return nil, fmt.Errorf("custom tool requires input_schema object")
	}
	renamed, err := renameJSONKey(wire, "input_schema", "inputSchema")
	if err != nil {
		return nil, fmt.Errorf("tool definition must be a JSON object")
	}
	return renamed, nil
}

// renameJSONKey renames one key of a JSON object in place: every other key,
// the order and each value's bytes stay as they were.
func renameJSONKey(raw json.RawMessage, from, to string) (json.RawMessage, error) {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	if token, err := decoder.Token(); err != nil || token != json.Delim('{') {
		return nil, errors.New("expected a JSON object")
	}
	var out bytes.Buffer
	out.WriteByte('{')
	for first := true; decoder.More(); first = false {
		token, err := decoder.Token()
		if err != nil {
			return nil, err
		}
		key, _ := token.(string)
		var value json.RawMessage
		if err = decoder.Decode(&value); err != nil {
			return nil, err
		}
		if key == from {
			key = to
		}
		encoded, _ := json.Marshal(key)
		if !first {
			out.WriteByte(',')
		}
		out.Write(encoded)
		out.WriteByte(':')
		out.Write(value)
	}
	if _, err := decoder.Token(); err != nil {
		return nil, err
	}
	out.WriteByte('}')
	return out.Bytes(), nil
}

func isJSONString(raw json.RawMessage) bool {
	raw = bytes.TrimSpace(raw)
	return len(raw) >= 2 && raw[0] == '"'
}

// validateBuildContent checks the body's protocol locations and returns its
// messages as sent (the system is checked where it is taken,
// buildSystemComponent). Arbitrary tool input/schema properties named text
// or requestPolicy are ordinary user data, not envelope controls.
func validateBuildContent(body map[string]json.RawMessage) ([]json.RawMessage, error) {
	for _, key := range []string{"requestPolicy", "runtimeContext", "attachments", "systemPrompt", "ccgatewaySystemBlocks", "ccgatewayBuildOnly"} {
		if _, ok := body[key]; ok {
			return nil, fmt.Errorf("reserved internal request field %s", key)
		}
	}
	if err := validateBuildGenerationParameters(body); err != nil {
		return nil, err
	}
	var messages []json.RawMessage
	if json.Unmarshal(body["messages"], &messages) != nil || len(messages) == 0 {
		return nil, fmt.Errorf("messages must be a non-empty array")
	}
	for i, raw := range messages {
		var message map[string]json.RawMessage
		if json.Unmarshal(raw, &message) != nil {
			return nil, fmt.Errorf("messages must be a non-empty array")
		}
		if err := validateBuildMessage(message, i); err != nil {
			return nil, err
		}
	}
	return messages, nil
}

func validateBuildMessage(message map[string]json.RawMessage, i int) error {
	var role string
	if json.Unmarshal(message["role"], &role) != nil || (role != "user" && role != "assistant" && role != "system") {
		return fmt.Errorf("invalid role at messages[%d]", i)
	}
	for _, key := range []string{"attachment", "ccgatewayBuildOnly", "ccgatewaySystemBlocks"} {
		if _, ok := message[key]; ok {
			return fmt.Errorf("reserved internal message field %s", key)
		}
	}
	return validateBuildBlocks(message["content"], fmt.Sprintf("messages[%d].content", i))
}

// validateBuildBlocks checks a content carrier: a string, or blocks whose
// types are not the CLI's internal ones and whose texts are strings, down
// into tool results.
func validateBuildBlocks(raw json.RawMessage, path string) error {
	if isJSONString(raw) {
		return nil
	}
	var blocks []map[string]json.RawMessage
	if json.Unmarshal(raw, &blocks) != nil || blocks == nil {
		return fmt.Errorf("%s must be a string or block array", path)
	}
	for i, block := range blocks {
		if err := validateBuildBlock(block, fmt.Sprintf("%s[%d]", path, i)); err != nil {
			return err
		}
	}
	return nil
}

func validateBuildBlock(block map[string]json.RawMessage, at string) error {
	if block == nil {
		return fmt.Errorf("invalid block at %s", at)
	}
	var kind string
	if json.Unmarshal(block["type"], &kind) != nil || kind == "" {
		return fmt.Errorf("invalid block type at %s", at)
	}
	if strings.HasPrefix(kind, "ccgateway_") {
		return fmt.Errorf("reserved internal block type at %s", at)
	}
	if kind == "text" && !isJSONString(block["text"]) {
		return fmt.Errorf("text must be a non-null string at %s", at)
	}
	if nested, ok := block["content"]; ok && kind == "tool_result" {
		return validateBuildBlocks(nested, at+".content")
	}
	return nil
}

// Validate explicit generation controls before starting the CLI. Omitted
// controls still use native defaults; model-specific budget adjustment remains
// the CLI's responsibility. This validator is never used by direct mode.
func validateBuildGenerationParameters(body map[string]json.RawMessage) error {
	if value, exists := body["max_tokens"]; exists {
		if err := positiveSafeInteger(value, "max_tokens"); err != nil {
			return err
		}
	}
	if value, exists := body["stream"]; exists {
		value = bytes.TrimSpace(value)
		if !bytes.Equal(value, []byte("true")) && !bytes.Equal(value, []byte("false")) {
			return fmt.Errorf("stream must be a boolean")
		}
	}
	if value, exists := body["thinking"]; exists {
		return validateBuildThinking(value)
	}
	return nil
}

func validateBuildThinking(value json.RawMessage) error {
	var thinking map[string]json.RawMessage
	if json.Unmarshal(value, &thinking) != nil || thinking == nil {
		return fmt.Errorf("thinking must be an object")
	}
	var kind string
	if json.Unmarshal(thinking["type"], &kind) != nil || (kind != "enabled" && kind != "disabled" && kind != "adaptive") {
		return fmt.Errorf("thinking.type must be enabled, disabled or adaptive")
	}
	budget, hasBudget := thinking["budget_tokens"]
	switch {
	case kind == "enabled" && !hasBudget:
		return fmt.Errorf("thinking.budget_tokens is required when thinking.type is enabled")
	case kind == "enabled":
		return positiveSafeInteger(budget, "thinking.budget_tokens")
	case hasBudget:
		return fmt.Errorf("thinking.budget_tokens requires thinking.type enabled")
	}
	return nil
}

// maxSafeInteger is the largest integer a float64 (the CLI's JavaScript
// number) holds exactly.
const maxSafeInteger = 1<<53 - 1

func positiveSafeInteger(raw json.RawMessage, field string) error {
	// The exact JSON number: a float64 conversion could round a fractional
	// boundary value into an apparently valid integer. (math/big refuses an
	// exponent beyond about a million digits, so this stays cheap.)
	value, ok := new(big.Rat).SetString(string(bytes.TrimSpace(raw)))
	if !ok || !value.IsInt() || value.Sign() <= 0 || value.Num().Cmp(big.NewInt(maxSafeInteger)) > 0 {
		return fmt.Errorf("%s must be a positive safe integer", field)
	}
	return nil
}

func validateBuildNumbers(raw []byte) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var root any
	if err := decoder.Decode(&root); err != nil {
		return err
	}
	return visitBuildNumbers(root)
}

func visitBuildNumbers(value any) error {
	switch v := value.(type) {
	case json.Number:
		n, err := strconv.ParseFloat(string(v), 64)
		if err != nil || math.IsNaN(n) || math.IsInf(n, 0) || math.Trunc(n) == n && math.Abs(n) > maxSafeInteger {
			return fmt.Errorf("build cannot represent an unsafe JSON number; use direct mode")
		}
	case map[string]any:
		for _, item := range v {
			if err := visitBuildNumbers(item); err != nil {
				return err
			}
		}
	case []any:
		for _, item := range v {
			if err := visitBuildNumbers(item); err != nil {
				return err
			}
		}
	}
	return nil
}
