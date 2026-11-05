package features

import (
	"bytes"
	"encoding/json"
	"regexp"
)

// ToolsUsedHeader is Claude Code's list of the tools its session has used
// (2.1.318 sends it on every first-party Messages request; 2.1.316 has it
// behind a flag that is off by default). The plugin forwards the client's
// value, the Worker hands it to a CLI with ToolsUsedCapability, and the
// Worker remembers the session's set (SESSION-MEMORY-TOOLS-USED-DESIGN.md).
// It is not one of AgentContextHeaders: those go to the CLI as the agent
// context's client fields, which an older CLI refuses to extend.
const ToolsUsedHeader = "X-Claude-Code-Sandy-Plover"

// ToolsUsedCapability: the CLI takes the agent context's tools_used (the
// client's value, the Worker's memory of the session's set) and writes the
// header from it: the client's value as it came, else the native set built
// from the memory and the request's history, and not at all when the Worker
// gives neither or the request goes upstream as a client older than 2.1.318.
// It reports the set it used in its response metadata (tools_used). An older
// CLI refuses the unknown field, so the Worker sends it only to this one.
const ToolsUsedCapability = "request_tools_used_v1"

// MaxToolsUsedHeaderBytes bounds the header value: Claude Code's own cap is
// 7168 characters (2.1.318 Uf), and a value is ASCII.
const MaxToolsUsedHeaderBytes = 8192

// MaxToolsUsedItems is Claude Code's cap on the header's items (2.1.318 Df).
const MaxToolsUsedItems = 64

// ToolNamePattern is a tool name Claude Code keeps in its set (2.1.318 tGn);
// anything else it records as ToolsUsedUnreadable.
var ToolNamePattern = regexp.MustCompile(`^[A-Za-z0-9_.:-]{1,256}$`)

// ToolsUsedUnreadable is Claude Code's stand-in for a tool whose name it
// cannot keep, and the first item of a list it had to cut (2.1.318 UD).
const ToolsUsedUnreadable = "unreadable-tools-used-before-summary"

// ValidToolsUsed says whether value has the header's shape: a JSON array of
// at most MaxToolsUsedItems objects, each with a name of ToolNamePattern and
// only the connector fields Claude Code adds (url, directory_entry as
// strings, unresolved as true).
func ValidToolsUsed(value string) bool {
	if value == "" || len(value) > MaxToolsUsedHeaderBytes {
		return false
	}
	var items []map[string]json.RawMessage
	decoder := json.NewDecoder(bytes.NewReader([]byte(value)))
	if decoder.Decode(&items) != nil || decoder.More() || items == nil || len(items) > MaxToolsUsedItems {
		return false
	}
	for _, item := range items {
		var name string
		if json.Unmarshal(item["name"], &name) != nil || !ToolNamePattern.MatchString(name) {
			return false
		}
		for key, raw := range item {
			switch key {
			case "name":
			case "url", "directory_entry":
				var s string
				if json.Unmarshal(raw, &s) != nil {
					return false
				}
			case "unresolved":
				if string(raw) != "true" {
					return false
				}
			default:
				return false
			}
		}
	}
	return true
}

// ToolsUsedNames are the names of a valid header value in its order, without
// the stand-in Claude Code puts first in a list it cut.
func ToolsUsedNames(value string) []string {
	if !ValidToolsUsed(value) {
		return nil
	}
	var items []struct {
		Name string `json:"name"`
	}
	_ = json.Unmarshal([]byte(value), &items)
	out := make([]string, 0, len(items))
	for i, item := range items {
		if i == 0 && item.Name == ToolsUsedUnreadable && len(items) > 1 {
			continue
		}
		out = append(out, item.Name)
	}
	return out
}
