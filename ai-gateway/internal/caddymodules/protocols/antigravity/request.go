package antigravity

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	protocol "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/antigravityprotocol"
)

const dummyThoughtSignature = "skip_thought_signature_validator"

const identityPatch = `<identity>
You are Antigravity, a powerful agentic AI coding assistant designed by the Google Deepmind team working on Advanced Agentic Coding.
You are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question.
The USER will send you requests, which you must always prioritize addressing. Along with each USER request, we will attach additional metadata about their current state, such as what files they have open and where their cursor is.
This information may or may not be relevant to the coding task, it is up for you to decide.
</identity>
<communication_style>
- **Proactiveness**. As an agent, you are allowed to be proactive, but only in the course of completing the user's task. For example, if the user asks you to add a new component, you can edit the code, verify build and test statuses, and take any other obvious follow-up actions, such as performing additional research. However, avoid surprising the user. For example, if the user asks HOW to approach something, you should answer their question and instead of jumping into editing a file.</communication_style>`

func decodeObject(payload []byte) (map[string]any, error) {
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	var root map[string]any
	if err := decoder.Decode(&root); err != nil || root == nil {
		return nil, fmt.Errorf("Gemini request body must be a JSON object")
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		return nil, fmt.Errorf("Gemini request body contains trailing JSON data")
	}
	return root, nil
}

func marshalJSON(value any) ([]byte, error) {
	var output bytes.Buffer
	encoder := json.NewEncoder(&output)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(value); err != nil {
		return nil, err
	}
	return bytes.TrimSuffix(output.Bytes(), []byte{'\n'}), nil
}

func filterEmptyContents(root map[string]any) {
	contents, ok := root["contents"].([]any)
	if !ok {
		return
	}
	filtered := make([]any, 0, len(contents))
	for _, raw := range contents {
		content, ok := raw.(map[string]any)
		if !ok {
			filtered = append(filtered, raw)
			continue
		}
		parts, exists := content["parts"]
		if list, ok := parts.([]any); exists && ok && len(list) == 0 {
			continue
		}
		filtered = append(filtered, raw)
	}
	root["contents"] = filtered
}

func stripClientRoutingFields(root map[string]any) {
	for _, key := range []string{"metadata", "sessionId", "requestId", "project", "userAgent", "requestType", "model"} {
		delete(root, key)
	}
}

func injectIdentity(root map[string]any) {
	part := map[string]any{"text": identityPatch}
	if system, ok := root["systemInstruction"].(map[string]any); ok {
		parts, _ := system["parts"].([]any)
		for _, raw := range parts {
			candidate, _ := raw.(map[string]any)
			if strings.Contains(stringValue(candidate["text"]), "You are Antigravity") {
				return
			}
		}
		system["parts"] = append([]any{part}, parts...)
		return
	}
	root["systemInstruction"] = map[string]any{"parts": []any{part}}
}

func ensureFunctionCallThoughtSignatures(root map[string]any) {
	contents, _ := root["contents"].([]any)
	for _, rawContent := range contents {
		content, _ := rawContent.(map[string]any)
		parts, _ := content["parts"].([]any)
		for _, rawPart := range parts {
			part, _ := rawPart.(map[string]any)
			if call, ok := part["functionCall"].(map[string]any); !ok || call == nil {
				continue
			}
			if strings.TrimSpace(stringValue(part["thoughtSignature"])) == "" {
				part["thoughtSignature"] = dummyThoughtSignature
			}
		}
	}
}

func cleanToolSchemas(root map[string]any) error {
	tools, _ := root["tools"].([]any)
	for _, rawTool := range tools {
		tool, _ := rawTool.(map[string]any)
		declarations, _ := tool["functionDeclarations"].([]any)
		if declarations == nil {
			declarations, _ = tool["function_declarations"].([]any)
		}
		for _, rawDeclaration := range declarations {
			declaration, _ := rawDeclaration.(map[string]any)
			parameters, ok := declaration["parameters"].(map[string]any)
			if !ok {
				continue
			}
			protocol.DeepCleanUndefined(parameters)
			cleaned := protocol.CleanJSONSchema(parameters)
			if cleaned == nil {
				return fmt.Errorf("unsupported empty tool schema")
			}
			declaration["parameters"] = cleaned
		}
	}
	return nil
}

func stringValue(value any) string {
	text, _ := value.(string)
	return text
}
