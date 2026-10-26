package ccgateway

import (
	"context"
	"slices"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// PinnedCLIVersion is the Claude Code version the core asks for when the
// stored policy names none: the version the bundled runtime image packages.
// It is the only place the core spells a CLI version; everything else follows
// the stored cli_version and the Worker's declared capabilities.
const PinnedCLIVersion = "2.1.310"

// cliVersionChecks bounds the Worker reads of one cli_version check.
const cliVersionChecks = 8

// admitCLIVersion is the save-time check of a changed cli_version (audit B3).
// The cli_version is part of every runtime's revision, and the controller
// answers 409 cli_profile_unavailable for a running container whose CLI is
// not the new version (it only switches through the paired Worker+CLI update,
// POST /system/ccgateway/runtime/workers {components: [worker, cli]}); the
// request path refuses a Worker whose CLI differs from the policy too. So a
// changed version is accepted only when it is what the runtimes already run:
// every ready runtime's Worker reports it. The controller lists no packaged
// versions, so with no ready runtime only the pinned version is accepted.
// Runtimes that cannot answer (pending, blocked, an older Worker) are not
// counted either way.
func (s *Service) admitCLIVersion(ctx context.Context, cfg Config, version string) error {
	if !features.ValidCLIVersion(version) {
		return nil // validateRequestPolicy names the malformed value
	}
	confirmed, others, err := s.runtimeCLIVersions(ctx, cfg, version)
	if err != nil {
		return cliVersionUnavailable(version, "the account runtimes cannot be asked which Claude Code version they run", nil)
	}
	if len(others) > 0 {
		return cliVersionUnavailable(version, "these account runtimes run another Claude Code version; activate "+version+" on them first with the paired Worker and CLI update", others)
	}
	if confirmed == 0 && version != PinnedCLIVersion {
		return cliVersionUnavailable(version, "no ready account runtime runs it yet; activate it first with the paired Worker and CLI update", nil)
	}
	return nil
}

func cliVersionUnavailable(version, why string, keys []string) error {
	details := map[string]any{"reason": "cli_version_unavailable", "cli_version": version}
	if len(keys) > 0 {
		details["runtimes"] = keys
	}
	return core.ErrInvalidArgument.WithMessage("Claude Code " + version + " cannot be selected: " + why + ".").WithDetails(details)
}

// runtimeCLIVersions asks the Worker of every ready runtime which CLI it runs
// (the cli_version probe of admin/features): confirmed counts those running
// version, others names the runtimes running another one.
func (s *Service) runtimeCLIVersions(ctx context.Context, cfg Config, version string) (confirmed int, others []string, err error) {
	if !cfg.AccountRuntimes || cfg.Mode == "disabled" {
		return 0, nil, nil
	}
	keys, err := s.runtimeKeys(ctx)
	if err != nil {
		return 0, nil, err
	}
	var mu sync.Mutex
	var wg sync.WaitGroup
	slots := make(chan struct{}, cliVersionChecks)
	for _, key := range keys {
		wg.Add(1)
		slots <- struct{}{}
		go func() {
			defer func() { <-slots; wg.Done() }()
			d, e := s.desiredKey(ctx, key, false)
			if e != nil || d.unavailable() != "" {
				return
			}
			observed := s.observedCLIVersion(ctx, d)
			if observed == "" {
				return
			}
			mu.Lock()
			defer mu.Unlock()
			if observed == version {
				confirmed++
			} else {
				others = append(others, key)
			}
		}()
	}
	wg.Wait()
	slices.Sort(others)
	return confirmed, others, nil
}

// requestedCLIVersion is the cli_version a PUT remote-config body names, ""
// when it names none (omitted keeps the stored one, mergeConfig).
func requestedCLIVersion(in Config) string {
	if in.RequestPolicy == nil {
		return ""
	}
	return in.RequestPolicy.CLIVersion
}
