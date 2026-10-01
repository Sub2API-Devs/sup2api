package install

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/Masterminds/semver/v3"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
)

// BuiltinRequirement is immutable image metadata, read once at startup.
type BuiltinRequirement struct {
	Version     *semver.Version
	InstallOnly bool
}

func (s *Service) BuiltinRequirements(dir string) (map[string]BuiltinRequirement, error) {
	out := map[string]BuiltinRequirement{}
	if dir == "" {
		return out, nil
	}
	only, err := readInstallOnly(dir)
	if err != nil {
		return nil, err
	}
	paths, err := filepath.Glob(filepath.Join(dir, "*.s2plugin"))
	if err != nil {
		return nil, err
	}
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		p, err := pkg.Open(data, s.Limits())
		if err != nil {
			return nil, err
		}
		v, err := semver.NewVersion(p.Manifest.Version)
		if err != nil {
			return nil, err
		}
		old, ok := out[p.Manifest.Key]
		if !ok || old.Version.LessThan(v) {
			out[p.Manifest.Key] = BuiltinRequirement{v, only[p.Manifest.Key]}
		}
	}
	return out, nil
}

// BuiltinsReady checks the image's minimum usable version, not instantaneous
// equality with the rollout target. A rolling upgrade continues serving its
// approved old generation until the local atomic switch. Explicitly disabled
// and install-only plugins remain optional.
func (s *Service) BuiltinsReady(ctx context.Context, want map[string]BuiltinRequirement, gen core.Generation) (bool, error) {
	for key, need := range want {
		var local core.PluginInfo
		var hasLocal bool
		if gen != nil {
			local, hasLocal = gen.Plugin(key)
		}
		var status string
		var active *string
		var approved, activeApproved, localApproved bool
		err := s.d.DB.Pool.QueryRow(ctx, `SELECT status,active_version,EXISTS(SELECT 1 FROM plugin_versions v
			WHERE v.plugin_key=plugins.key AND v.version=$2 AND consent_status='approved'),
			EXISTS(SELECT 1 FROM plugin_versions v WHERE v.plugin_key=plugins.key AND v.version=plugins.active_version AND consent_status='approved'),
			EXISTS(SELECT 1 FROM plugin_versions v WHERE v.plugin_key=plugins.key AND v.version=$3 AND consent_status='approved')
			FROM plugins WHERE key=$1 AND builtin`, key, need.Version.Original(), local.Version).Scan(&status, &active, &approved, &activeApproved, &localApproved)
		if err != nil {
			return false, err
		}
		if !approved {
			return false, nil
		}
		if status == StatusDisabled || (status == StatusInstalled && need.InstallOnly) {
			continue
		}
		if (status != StatusEnabled && status != StatusUpgrading) || active == nil || !activeApproved || !hasLocal || !localApproved {
			return false, nil
		}
		v, err := semver.NewVersion(*active)
		if err != nil {
			return false, fmt.Errorf("builtin %s active version: %w", key, err)
		}
		if v.LessThan(need.Version) {
			return false, nil
		}
		localVersion, err := semver.NewVersion(local.Version)
		if err != nil {
			return false, fmt.Errorf("builtin %s local version: %w", key, err)
		}
		if localVersion.LessThan(need.Version) {
			return false, nil
		}
	}
	return true, nil
}
