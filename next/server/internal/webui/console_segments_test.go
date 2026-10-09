package webui

import (
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Plugin gateway endpoints are dispatched before the console (app.go:
// engine.NoRoute(gw.Middleware(), ui.Serve)), so manifest.ConsoleSegments
// must cover every first path segment the console serves: its page roots
// (web/src/router), its public files and the build's assets/ (audit
// 2026-10-09 P1-6). A new console page or public file fails here until it
// is reserved.
func TestConsoleSegmentsCoverConsole(t *testing.T) {
	web := filepath.Join("..", "..", "..", "web")
	router, err := os.ReadFile(filepath.Join(web, "src", "router", "index.ts"))
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]bool{"assets": true, "index.html": true}
	for _, m := range regexp.MustCompile(`path:\s*'([^']*)'`).FindAllStringSubmatch(string(router), -1) {
		first := strings.SplitN(strings.TrimPrefix(m[1], "/"), "/", 2)[0]
		// "" is the root, ":pathMatch(.*)*" the not-found catch-all.
		if first != "" && !strings.HasPrefix(first, ":") {
			want[first] = true
		}
	}
	public, err := os.ReadDir(filepath.Join(web, "public"))
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range public {
		want[e.Name()] = true
	}
	if len(want) < 10 {
		t.Fatalf("parsed only %d console segments; is the router file layout unchanged?", len(want))
	}
	for s := range want {
		if !slices.Contains(manifest.ConsoleSegments, s) {
			t.Errorf("console path /%s is not in manifest.ConsoleSegments", s)
		}
	}
}
