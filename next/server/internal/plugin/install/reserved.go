package install

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
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

// ErrResourceConflict: a version declares a platform or gateway endpoint
// another approved plugin holds, a built-in platform id or a path the core
// reserves (details.fields, codes as check.Conflicts).
var ErrResourceConflict = core.NewError(http.StatusConflict, "plugin_resource_conflict",
	"another plugin or the core already holds a platform or endpoint this version declares")

// CheckResources checks that version of key can hold the exclusive resources
// it declares now: none held by another approved plugin, by the core's
// built-in platforms or by its reserved paths (audit 2026-10-09 P2-2). Not
// only at upload: approval, enable and upgrade call it, since another plugin
// may have been approved and the core upgraded since.
func (s *Service) CheckResources(ctx context.Context, key, version string) error {
	m, err := LoadManifest(ctx, s.d.DB.Pool, key, version)
	if err != nil {
		return err
	}
	return s.checkResources(ctx, s.d.DB.Pool, m)
}

func (s *Service) checkResources(ctx context.Context, q store.Querier, m *manifest.Manifest) error {
	others, endpoints, err := s.otherPlatforms(ctx, q, m.Key)
	if err != nil {
		return err
	}
	if conflicts := pkg.Conflicts(m, others, endpoints); len(conflicts) > 0 {
		return ErrResourceConflict.WithDetails(map[string]any{"fields": conflicts})
	}
	for i, p := range m.Platforms {
		if owner, ok := reservedPlatforms[p.ID]; ok && owner != m.Key {
			return ErrResourceConflict.WithDetails(map[string]any{"fields": []core.FieldError{{
				Field: fmt.Sprintf("platforms[%d].id", i), Code: "platform_reserved",
				Message: fmt.Sprintf("platform id %q is reserved for the first-party plugin %q", p.ID, owner)}}})
		}
	}
	return nil
}

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
