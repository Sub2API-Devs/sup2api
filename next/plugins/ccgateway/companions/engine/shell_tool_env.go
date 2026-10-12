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
// refuse. Native matching requires the complete name, description and
// schema to match exactly, including timeout numbers and whitespace.
// A changed definition remains an MCP client tool; it is never relaxed
// to fit the native catalogue. PowerShell
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
	return sameToolDefinition(known, tool)
}

// shellToolEnv makes the inner CLI offer the client's native PowerShell.
func (r *Request) shellToolEnv() map[string]string {
	env := map[string]string{}
	if !r.NoTools && r.Native["PowerShell"] {
		env["CLAUDE_CODE_USE_POWERSHELL_TOOL"] = "1"
	}
	return env
}

// restoreShellTool accepts only an already identical shell definition;
// it cannot restore a changed description or timeout schema.
func restoreShellTool(want Tool, obj Object) bool {
	schema, _ := obj["input_schema"].(map[string]any)
	return shellTool(want.Name) && sameToolDefinition(want, Tool{Name: str(obj, "name"), Description: str(obj, "description"), Schema: schema})
}
