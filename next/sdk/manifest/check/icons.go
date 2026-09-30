package check

import (
	"bytes"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"slices"
	"sync"
)

// icons.json is generated from the console's icon set by "npm run icons:json"
// in next/web (see next/web/scripts/icons-json.ts). It exists because a
// manifest icon name is resolved in the browser, far from the machine that
// installed the plugin: an unknown name used to render a plain square with no
// error and no console output, so a typo looked deliberate rather than broken.
// With the names here, a wrong `ui.menus[].icon` is an install-time rejection.
//
// The file also records a sha256 of icons.ts. TestEmbeddedIconsMatchTheSource
// re-hashes the TypeScript and fails when the two disagree, which is what
// keeps this generated artifact from going stale silently - the failure mode
// this whole rule exists to remove.
//
//go:embed icons.json
var iconsFS embed.FS

type iconSet struct {
	Source       string   `json:"source"`
	SourceSHA256 string   `json:"source_sha256"`
	Names        []string `json:"names"`
}

// loadIcons parses the embedded set once. A malformed or empty icons.json is a
// panic rather than an empty vocabulary: an empty set would reject every icon
// name in every manifest, and a silently absent one would accept every name -
// both are worse than failing at startup on a build that cannot be right.
var loadIcons = sync.OnceValue(func() iconSet {
	b, err := iconsFS.ReadFile("icons.json")
	if err != nil {
		panic("check: embedded icons.json: " + err.Error())
	}
	var s iconSet
	if err := json.Unmarshal(b, &s); err != nil {
		panic("check: embedded icons.json: " + err.Error())
	}
	if len(s.Names) == 0 || s.SourceSHA256 == "" || s.Source == "" {
		panic("check: embedded icons.json is incomplete; run \"npm run icons:json\" in next/web")
	}
	return s
})

// IconNames are the icon names <SIcon> can render, sorted. Menu icons
// (manifest ui.menus[].icon, and the core sidebar's own items) must be one of
// these.
//
// This is NOT the vocabulary of the top-level manifest.icon, which is a plugin
// avatar: "text:<1-2 chars>", a path inside the package, an absolute URL or a
// data: URI. The two fields are spelled the same and mean different things;
// only the menu one is checked against this list.
func IconNames() []string { return slices.Clone(loadIcons().Names) }

// KnownIcon reports whether name is an icon <SIcon> can render.
func KnownIcon(name string) bool { return slices.Contains(loadIcons().Names, name) }

// IconSource is the repository-relative path of the TypeScript module
// icons.json was generated from.
func IconSource() string { return loadIcons().Source }

// IconSourceSHA256 is the recorded hash of that module, as produced by
// HashIconSource.
func IconSourceSHA256() string { return loadIcons().SourceSHA256 }

// HashIconSource hashes the icon source the way the generator does: a leading
// UTF-8 BOM is dropped and CRLF is normalised to LF, so a CRLF checkout (git
// core.autocrlf on Windows) and an LF one produce the same digest. Keep this
// identical to sourceHash() in next/web/scripts/icons-json.ts.
func HashIconSource(b []byte) string {
	b = bytes.TrimPrefix(b, []byte{0xEF, 0xBB, 0xBF})
	b = bytes.ReplaceAll(b, []byte("\r\n"), []byte("\n"))
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

// iconsStaleHint is appended to the error of an unknown icon name so the
// reader can tell "this name is wrong" from "this checkout's icon list is
// out of date". Built lazily: a package-level initialiser here would turn a
// broken icons.json into a panic before any test could report it.
func iconsStaleHint() string {
	return fmt.Sprintf("valid names come from %s (regenerate with \"npm run icons:json\" in next/web)", IconSource())
}
