// Package platforms holds the built-in platforms of the core (ARCHITECTURE
// 6.6): anthropic, openai and gemini, with their gateway endpoints, usage
// rules and default sticky rules. The definitions use the manifest format and
// are embedded as JSON. Plugins may add platforms but never these ids.
package platforms

import (
	"embed"
	"encoding/json"
	"fmt"
	"sort"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

//go:embed *.json
var files embed.FS

var builtin = mustLoad()

func mustLoad() []manifest.Platform {
	names, err := files.ReadDir(".")
	if err != nil {
		panic(err)
	}
	var out []manifest.Platform
	for _, n := range names {
		raw, err := files.ReadFile(n.Name())
		if err != nil {
			panic(err)
		}
		var p manifest.Platform
		if err := json.Unmarshal(raw, &p); err != nil {
			panic(fmt.Sprintf("builtin platform %s: %v", n.Name(), err))
		}
		out = append(out, p)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out
}

// Builtin returns copies of the built-in platforms, sorted by id.
func Builtin() []manifest.Platform {
	out := make([]manifest.Platform, len(builtin))
	copy(out, builtin)
	return out
}

// IsBuiltin reports whether id is a built-in platform id.
func IsBuiltin(id string) bool {
	for _, p := range builtin {
		if p.ID == id {
			return true
		}
	}
	return false
}
