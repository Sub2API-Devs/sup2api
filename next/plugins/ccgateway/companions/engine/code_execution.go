package engine

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
)

func codeExecutionVersion(kind string) bool {
	switch kind {
	case "code_execution_20250522", "code_execution_20250825", "code_execution_20260120", "code_execution_20260521":
		return true
	}
	return false
}

func implicitCodeExecution(tool Object) bool {
	switch str(tool, "type") {
	case "web_search_20260209", "web_search_20260318", "web_fetch_20260209", "web_fetch_20260309", "web_fetch_20260318":
		value, exists := tool["allowed_callers"]
		if !exists {
			return true
		}
		callers, _ := value.([]any)
		for _, caller := range callers {
			if caller != "direct" {
				return true
			}
		}
	}
	return false
}

// Implicit filtering permits only the documented Python parent, not arbitrary
// shell/editor operations without an explicit modern execution declaration.
func providerExecutionCallDeclared(tools []Object, name string) bool {
	for _, tool := range tools {
		kind := str(tool, "type")
		if codeExecutionVersion(kind) {
			return name == "code_execution" || kind != "code_execution_20250522" && (name == "bash_code_execution" || name == "text_editor_code_execution")
		}
	}
	if name == "code_execution" {
		for _, tool := range tools {
			if implicitCodeExecution(tool) {
				return true
			}
		}
	}
	return false
}
func codeExecutionCall(name string) bool {
	return name == "code_execution" || name == "bash_code_execution" || name == "text_editor_code_execution"
}
func codeExecutionResult(kind string) bool {
	return kind == "code_execution_tool_result" || kind == "bash_code_execution_tool_result" || kind == "text_editor_code_execution_tool_result"
}
func checkCodeExecutionTool(tool Object) error {
	if err := keys(tool, "type", "name", "allowed_callers", "cache_control", "defer_loading", "strict"); err != nil {
		return err
	}
	if !codeExecutionVersion(str(tool, "type")) || str(tool, "name") != "code_execution" {
		return fmt.Errorf("invalid provider code execution tool")
	}
	return nil
}

func checkProviderCaller(value any) error {
	caller, ok := value.(Object)
	if !ok {
		return fmt.Errorf("tool caller must be an object")
	}
	if str(caller, "type") == "direct" {
		return keys(caller, "type")
	}
	switch str(caller, "type") {
	case "code_execution_20250825", "code_execution_20260120":
	default:
		return fmt.Errorf("unsupported provider tool caller")
	}
	if err := keys(caller, "type", "tool_id"); err != nil {
		return err
	}
	if str(caller, "tool_id") == "" {
		return fmt.Errorf("programmatic caller requires its parent server tool ID")
	}
	return nil
}

func protocolInt(value any) bool {
	switch number := value.(type) {
	case json.Number:
		_, err := number.Int64()
		return err == nil
	case int:
		return true
	case int64:
		return true
	case float64:
		return !math.IsNaN(number) && !math.IsInf(number, 0) && math.Trunc(number) == number
	}
	return false
}
func codeString(o Object, name string) error {
	if _, ok := o[name].(string); !ok {
		return fmt.Errorf("code execution %s must be a string", name)
	}
	return nil
}
func codeOptionalInt(o Object, names ...string) error {
	for _, name := range names {
		if value := o[name]; value != nil && !protocolInt(value) {
			return fmt.Errorf("code execution %s must be an integer or null", name)
		}
	}
	return nil
}

// Provider output is a distinct typed union. It is never fed into local Bash,
// Read, Edit, or the SDK client-tool executor.
func checkCodeExecutionResult(block Object) error {
	if err := keys(block, "type", "tool_use_id", "content", "cache_control"); err != nil {
		return err
	}
	if !codeExecutionResult(str(block, "type")) || str(block, "tool_use_id") == "" {
		return fmt.Errorf("invalid code execution result identity")
	}
	content, ok := block["content"].(Object)
	if !ok {
		return fmt.Errorf("code execution result content must be an object")
	}
	kind := str(content, "type")
	outer := str(block, "type")
	if strings.HasSuffix(kind, "_tool_result_error") {
		if kind != strings.TrimSuffix(outer, "_result")+"_result_error" {
			return fmt.Errorf("code execution error type does not match its tool")
		}
		fields := []string{"type", "error_code"}
		if outer == "text_editor_code_execution_tool_result" {
			fields = append(fields, "error_message")
		}
		if err := keys(content, fields...); err != nil {
			return err
		}
		if str(content, "error_code") == "" {
			return fmt.Errorf("code execution result error requires error_code")
		}
		if value, exists := content["error_message"]; exists && value != nil {
			if _, ok := value.(string); !ok {
				return fmt.Errorf("invalid editor error_message")
			}
		}
		return nil
	}
	switch outer {
	case "code_execution_tool_result", "bash_code_execution_tool_result":
		want := "code_execution_result"
		fileKind := "code_execution_output"
		stdout := "stdout"
		if outer == "bash_code_execution_tool_result" {
			want = "bash_code_execution_result"
			fileKind = "bash_code_execution_output"
		}
		if kind == "encrypted_code_execution_result" && outer == "code_execution_tool_result" {
			stdout = "encrypted_stdout"
		} else if kind != want {
			return fmt.Errorf("execution result type does not match its tool")
		}
		if err := keys(content, "type", stdout, "stderr", "return_code", "content"); err != nil {
			return err
		}
		if err := codeString(content, stdout); err != nil {
			return err
		}
		if err := codeString(content, "stderr"); err != nil {
			return err
		}
		if !protocolInt(content["return_code"]) {
			return fmt.Errorf("code execution return_code must be an integer")
		}
		files, ok := content["content"].([]any)
		if !ok {
			return fmt.Errorf("code execution output files must be an array")
		}
		for _, value := range files {
			file, ok := value.(Object)
			if !ok || str(file, "type") != fileKind || str(file, "file_id") == "" {
				return fmt.Errorf("invalid code execution output file")
			}
			if err := keys(file, "type", "file_id"); err != nil {
				return err
			}
		}
	case "text_editor_code_execution_tool_result":
		switch kind {
		case "text_editor_code_execution_view_result":
			if err := keys(content, "type", "content", "file_type", "num_lines", "start_line", "total_lines"); err != nil {
				return err
			}
			if err := codeString(content, "content"); err != nil {
				return err
			}
			switch str(content, "file_type") {
			case "text", "image", "pdf":
			default:
				return fmt.Errorf("invalid editor view file_type")
			}
			return codeOptionalInt(content, "num_lines", "start_line", "total_lines")
		case "text_editor_code_execution_create_result":
			if err := keys(content, "type", "is_file_update"); err != nil {
				return err
			}
			if _, ok := content["is_file_update"].(bool); !ok {
				return fmt.Errorf("invalid editor is_file_update")
			}
		case "text_editor_code_execution_str_replace_result":
			if err := keys(content, "type", "lines", "new_lines", "new_start", "old_lines", "old_start"); err != nil {
				return err
			}
			if lines := content["lines"]; lines != nil {
				items, ok := lines.([]any)
				if !ok {
					return fmt.Errorf("editor lines must be an array or null")
				}
				for _, item := range items {
					if _, ok := item.(string); !ok {
						return fmt.Errorf("editor lines must contain strings")
					}
				}
			}
			return codeOptionalInt(content, "new_lines", "new_start", "old_lines", "old_start")
		default:
			return fmt.Errorf("unsupported editor execution result")
		}
	}
	return nil
}
