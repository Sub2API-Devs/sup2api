// Package platforms holds the built-in platforms of the core (ARCHITECTURE
// 6.6): anthropic, openai and gemini, with their gateway endpoints, usage
// rules and default sticky rules. The definitions use the manifest format and
// are embedded as JSON. Plugins may add platforms but never these ids.
//
// The definitions live in the SDK because their protocol ids
// ("anthropic.messages", "openai.chat", ...) are the contract a plugin writes
// its accountTypes[].platforms against, and because manifest/check needs them
// to report endpoint conflicts wherever it runs: in the host, in the
// packaging CLI and in a plugin's own tests (CONTRACTS §13).
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

// raw holds the embedded definitions ordered by platform id; builtin is the
// decoded form, used for the read-only lookups in this package.
var raw = mustLoadRaw()

var builtin = decodeAll(raw)

func mustLoadRaw() [][]byte {
	names, err := files.ReadDir(".")
	if err != nil {
		panic(err)
	}
	out := make([][]byte, 0, len(names))
	for _, n := range names {
		b, err := files.ReadFile(n.Name())
		if err != nil {
			panic(err)
		}
		out = append(out, b)
	}
	sort.Slice(out, func(i, j int) bool { return decode(out[i]).ID < decode(out[j]).ID })
	return out
}

func decodeAll(raws [][]byte) []manifest.Platform {
	out := make([]manifest.Platform, 0, len(raws))
	for _, b := range raws {
		out = append(out, decode(b))
	}
	return out
}

func decode(b []byte) manifest.Platform {
	var p manifest.Platform
	if err := json.Unmarshal(b, &p); err != nil {
		panic(fmt.Sprintf("builtin platform: %v", err))
	}
	return p
}

// Builtin returns the built-in platforms, sorted by id.
//
// Each call decodes the embedded JSON again, so the result is an independent
// deep copy: a caller may edit an endpoint, a usage map or a sticky rule of
// what it gets back without changing what the next caller sees. A shallow
// copy would be worse than it sounds - manifest.Platform is mostly slices and
// maps, so one caller editing a single endpoint in place would rewrite the
// core's own definition for the rest of the process.
func Builtin() []manifest.Platform { return decodeAll(raw) }

// IsBuiltin reports whether id is a built-in platform id.
func IsBuiltin(id string) bool {
	for _, p := range builtin {
		if p.ID == id {
			return true
		}
	}
	return false
}
