package core

import (
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// An account type receives its own list for a platform, else the
// platform's, once per name.
func TestAccountTypePassHeaders(t *testing.T) {
	platforms := map[string]PlatformBinding{
		"a": {Platform: manifest.Platform{ID: "a", PassHeaders: []string{"anthropic-version", "anthropic-beta"}}},
		"b": {Platform: manifest.Platform{ID: "b", PassHeaders: []string{"x-b"}}},
	}
	lookup := func(id string) (PlatformBinding, bool) { pb, ok := platforms[id]; return pb, ok }
	b := AccountTypeBinding{Type: manifest.AccountType{Platforms: []manifest.AccountPlatform{
		{Platform: "a"}, {Platform: "b", PassHeaders: []string{"x-own", "anthropic-beta"}}, {Platform: "ghost"}}}}
	if got, want := b.PassHeaders(lookup), []string{"anthropic-version", "anthropic-beta", "x-own"}; !slices.Equal(got, want) {
		t.Fatalf("pass headers %v, want %v", got, want)
	}
	if got := (AccountTypeBinding{}).PassHeaders(lookup); got == nil || len(got) != 0 {
		t.Fatalf("no platform: %v", got)
	}
}
