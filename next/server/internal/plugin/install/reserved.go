package install

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
)

// First-party plugins (next/plugins) are shipped in the image or in the
// official market. Their keys and the platform ids they declare are reserved
// (audit 2026-10-09 P1-5): a package uploaded by hand may use them only with
// an official signature, so nobody can take a key or platform a later image
// ships as built-in (the built-in install would fail on every node). Built-in
// installs and configured market sources are trusted channels. A platform id
// is reserved for its own plugin whatever the source. TestReservedCoverRepo
// keeps the lists in step with next/plugins.
var (
	reservedKeys = map[string]bool{
		"anthropic": true, "ccgateway": true, "claude_oauth": true, "gemini": true, "growth": true,
		"guard": true, "moderation": true, "openai": true, "payment": true, "relay": true, "volcengine": true,
	}
	// reservedPlatforms maps a platform id to the plugin it belongs to.
	reservedPlatforms = map[string]string{"volcengine": "volcengine"}
)

// ErrReservedKey: a hand upload without an official signature uses the key
// or a platform id of a first-party plugin.
var ErrReservedKey = core.NewError(http.StatusForbidden, "plugin_key_reserved", "the plugin key or platform id is reserved")

// ErrResourceConflict: approving a version whose platform or gateway endpoint
// another plugin got approved for in the meantime (details.fields).
var ErrResourceConflict = core.NewError(http.StatusConflict, "plugin_resource_conflict",
	"another plugin already holds a platform or endpoint this version declares")

// checkReserved applies the reservations to a package from source with the
// given trust level. claim is true when the key is not installed yet: only a
// new claim of a reserved key needs a trusted channel (an installed plugin
// keeps its publisher check).
func checkReserved(m *manifest.Manifest, source, trust string, claim bool) error {
	for _, p := range m.Platforms {
		if owner, ok := reservedPlatforms[p.ID]; ok && owner != m.Key {
			return ErrReservedKey.WithMessage(fmt.Sprintf("platform id %q is reserved for the first-party plugin %q", p.ID, owner))
		}
	}
	if !claim || !reservedKeys[m.Key] || trust == pkg.TrustOfficial || source == "builtin" || isMarketSource(source) {
		return nil
	}
	return ErrReservedKey.WithMessage(fmt.Sprintf("plugin key %q is reserved for a first-party plugin; upload an officially signed package or install it from the market", m.Key))
}

func isMarketSource(source string) bool { return strings.HasPrefix(source, "market:") }
