// Package upstream holds the core's upstream presets (docs/UPSTREAM-
// DECLARATIVE.md §2): the openai, anthropic and gemini upstream declarations
// an account type names in accountTypes[].upstream.preset and overrides.
// Each reproduces what the corresponding built-in plugin did before the core
// built upstream requests itself, so a type that only names the preset sends
// exactly what that plugin sent. They are embedded JSON in the manifest
// format, like the built-in platforms (sdk/platforms), and live in the SDK
// for the same reason: manifest/check, the packaging CLI and plugin tests
// resolve declarations against the presets the core uses.
package upstream

import (
	"embed"
	"encoding/json"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

//go:embed *.json
var files embed.FS

// Preset returns the preset named name. Each call decodes the embedded JSON
// again, so the result (maps and slices included) is the caller's to modify.
func Preset(name string) (manifest.Upstream, bool) {
	var u manifest.Upstream
	b, err := files.ReadFile(name + ".json")
	if err != nil {
		return u, false
	}
	if err := json.Unmarshal(b, &u); err != nil {
		panic("upstream preset " + name + ": " + err.Error())
	}
	return u, true
}
