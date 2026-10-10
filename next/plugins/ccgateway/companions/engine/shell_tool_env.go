package engine

import (
	"encoding/json"
	"regexp"
)

// Bash and PowerShell carry the client's timeout settings in their
// definitions (CC 2.1.292): BASH_DEFAULT_TIMEOUT_MS and BASH_MAX_TIMEOUT_MS
// in the descriptions and schema, and a background default that is
// max(600000, default) in a single-shot -p session but max(1800000, default)
// otherwise. A client with these settings (the user's desktop settings,
// 2026-10-10) or a -p client offers a definition the inner CLI does not, so
// its Bash fell back to the gateway's MCP name, which client safeguards
// refuse. The catalogue matches these tools with the numbers as parameters
// and the outbound request carries the client's own definition when the
// inner CLI's differs only in them; no tool runs in the worker, so the
// numbers do not change what it does. PowerShell
// (CLAUDE_CODE_USE_POWERSHELL_TOOL) is offered by the Linux CLI as well.

var timeoutDigits = regexp.MustCompile(`[0-9]+`)

func shellTool(name string) bool { return name == "Bash" || name == "PowerShell" }

// timeoutNeutral is a schema's digest with the numbers of the timeout and
// run_in_background descriptions replaced.
func timeoutNeutral(schema Object) string {
	raw, _ := json.Marshal(schema)
	var copy map[string]any
	if json.Unmarshal(raw, &copy) != nil {
		return ""
	}
	properties, _ := copy["properties"].(map[string]any)
	for _, name := range []string{"timeout", "run_in_background"} {
		if property, ok := properties[name].(map[string]any); ok {
			if text, ok := property["description"].(string); ok {
				property["description"] = timeoutDigits.ReplaceAllString(text, "N")
			}
		}
	}
	return digest(copy)
}

// catalogueMatch reports whether a client definition is a verified variant.
func catalogueMatch(known, tool Tool) bool {
	if sameToolDefinition(known, tool) {
		return true
	}
	return shellTool(tool.Name) && known.Name == tool.Name && timeoutNeutral(known.Schema) == timeoutNeutral(tool.Schema)
}

// shellToolEnv makes the inner CLI offer the client's native PowerShell.
func (r *Request) shellToolEnv() map[string]string {
	env := map[string]string{}
	if !r.NoTools && r.Native["PowerShell"] {
		env["CLAUDE_CODE_USE_POWERSHELL_TOOL"] = "1"
	}
	return env
}

// restoreShellTool puts the client's Bash or PowerShell definition into an
// outbound tool whose definition differs only in the timeout numbers.
func restoreShellTool(want Tool, obj Object) bool {
	schema, _ := obj["input_schema"].(map[string]any)
	if !shellTool(want.Name) || timeoutNeutral(schema) != timeoutNeutral(want.Schema) {
		return false
	}
	raw, _ := json.Marshal(want.Schema)
	var restored map[string]any
	if json.Unmarshal(raw, &restored) != nil {
		return false
	}
	obj["input_schema"] = restored
	obj["description"] = want.Description
	return true
}
