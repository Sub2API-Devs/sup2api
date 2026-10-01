package registry

import (
	"context"
	"fmt"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	pluginpkg "github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// ReadVersionAsset serves approved versioned assets for as long as the plugin
// remains enabled and its package is retained. Read from immutable package
// bytes rather than a local process cache: rollout cleanup may close that
// cache concurrently, and a joining node may never have run this version.
func (s *Packages) ReadVersionAsset(ctx context.Context, key, vh, name string) (core.PluginInfo, []byte, string, error) {
	var version, sum string
	var raw []byte
	err := s.db.Pool.QueryRow(ctx, `SELECT v.version,v.package_sha256,v.package FROM plugin_versions v JOIN plugins p ON p.key=v.plugin_key
		WHERE p.key=$1 AND v.version || '-' || left(v.package_sha256,8)=$2
		AND p.status IN ('enabled','enabling','upgrading') AND v.consent_status='approved' AND v.signature_status<>'revoked'
		AND NOT EXISTS(SELECT 1 FROM plugin_uninstalls u WHERE u.plugin_key=p.key)`, key, vh).Scan(&version, &sum, &raw)
	if store.IsNoRows(err) {
		return core.PluginInfo{}, nil, "", ErrAssetNotFound
	}
	if err != nil {
		return core.PluginInfo{}, nil, "", err
	}
	if !strings.EqualFold(pluginpkg.SHA256Hex(raw), sum) {
		return core.PluginInfo{}, nil, "", fmt.Errorf("package checksum mismatch")
	}
	if s.verifier != nil {
		if err := s.verifier(ctx, key, version, raw); err != nil {
			return core.PluginInfo{}, nil, "", err
		}
	}
	p, err := pluginpkg.Open(raw, pluginpkg.Limits{MaxPackageBytes: int64(len(raw)) + 1})
	if err != nil {
		return core.PluginInfo{}, nil, "", err
	}
	if p.Manifest.Key != key || p.Manifest.Version != version {
		return core.PluginInfo{}, nil, "", fmt.Errorf("package identity mismatch")
	}
	data, ok := p.Files[name]
	if !ok {
		return core.PluginInfo{}, nil, "", ErrAssetNotFound
	}
	return core.PluginInfo{Key: key, Version: version, Manifest: p.Manifest, AssetBase: "/plugin-ui/" + key + "/" + vh}, data, ContentType(name), nil
}
