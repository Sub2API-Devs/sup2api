package ccgateway

import (
	"context"
	"errors"
	"log/slog"
	"regexp"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Loading the bundled runtime images on the Docker host during an
// installation over SSH or on this machine (CONTRACTS §53.10): one fixed
// script reports which images the host lacks, then each missing archive is
// streamed into its own fixed `docker load` script (stdin is the archive, so
// it cannot share a run with the scripts that read an environment file or a
// Caddyfile from stdin). Without bundled images the scripts pull as before.

// bundleLoadLimit bounds one docker load (archives of about 300 MB).
var bundleLoadLimit = 20 * time.Minute

var missingLine = regexp.MustCompile(`(?m)^CCG_MISSING=([a-z]+)\s*$`)

// missingScript prints CCG_MISSING=<role> for every image the host does not
// have. It contains constants and references that match validImage only.
func missingScript(roles []string, refs map[string]string) (string, error) {
	script := "set -u\ncommand -v docker >/dev/null 2>&1 || { echo CCG_RESULT=docker_not_installed; exit 1; }\n"
	for _, role := range roles {
		ref := refs[role]
		if !validImage(ref) || !bundleRolePattern.MatchString(role) {
			return "", errors.New("invalid runtime image reference")
		}
		script += "docker image inspect '" + ref + "' >/dev/null 2>&1 || echo CCG_MISSING=" + role + "\n"
	}
	return script + "echo CCG_RESULT=ok\n", nil
}

var bundleRolePattern = regexp.MustCompile(`^(app|egress|controller|gateway)$`)

// loadScript loads the archive on stdin (docker save, optionally gzip) and
// checks that ref exists afterwards.
func loadScript(ref string) (string, error) {
	if !validImage(ref) {
		return "", errors.New("invalid runtime image reference")
	}
	return `set -u
REF='` + ref + `'
docker load -q >/dev/null 2>&1 || { echo CCG_RESULT=image_load_failed; exit 1; }
docker image inspect "$REF" >/dev/null 2>&1 || { echo CCG_RESULT=image_load_failed; exit 1; }
echo CCG_RESULT=loaded
`, nil
}

// loadBundledImages makes sure the bundled images of roles exist on
// target's Docker host. Only roles whose effective image is the bundled one
// count (an override is pulled by the install scripts as before). A role in
// required that cannot be loaded fails with image_load_failed; the others
// are only logged (the install scripts then try to pull them).
func (s *Service) loadBundledImages(ctx context.Context, target Config, roles []string, required map[string]bool) *core.Error {
	b := s.bundle()
	if b == nil {
		return nil
	}
	eff := target.EffectiveImages()
	effective := map[string]string{"app": eff.App, "egress": eff.Egress, "controller": eff.Controller, "gateway": eff.Gateway}
	var wanted []string
	refs := map[string]string{}
	for _, role := range roles {
		if ref := b.ref(role); ref != "" && ref == effective[role] {
			wanted = append(wanted, role)
			refs[role] = ref
		}
	}
	if len(wanted) == 0 {
		return nil
	}
	script, err := missingScript(wanted, refs)
	if err != nil {
		return reasonError(core.ErrUnavailable, "install_failed")
	}
	res, err := s.run(ctx, target, script, nil, 2*time.Minute)
	if err != nil {
		return reasonError(core.ErrUnavailable, runFailure(target))
	}
	if result := scriptResult(res.Output); res.ExitStatus != 0 || result != "ok" {
		if result == "docker_not_installed" {
			return reasonError(core.ErrInvalidArgument, result)
		}
		return reasonError(core.ErrUnavailable, "install_failed")
	}
	for _, m := range missingLine.FindAllStringSubmatch(res.Output, -1) {
		role := m[1]
		ref, ok := refs[role]
		if !ok {
			continue
		}
		if e := s.loadBundledImage(ctx, target, b, role, ref); e != nil {
			slog.WarnContext(ctx, "CCGateway: loading a bundled runtime image failed", "role", role, "ref", ref, "err", e)
			if required[role] {
				return reasonError(core.ErrUnavailable, "image_load_failed")
			}
		}
	}
	return nil
}

// loadBundledImage streams the archive of role into docker load on target.
func (s *Service) loadBundledImage(ctx context.Context, target Config, b *bundle, role, ref string) error {
	script, err := loadScript(ref)
	if err != nil {
		return err
	}
	rc, _, err := b.open(role)
	if err != nil {
		return err
	}
	defer rc.Close()
	res, err := s.runStream(ctx, target, script, rc, bundleLoadLimit)
	if err != nil {
		return err
	}
	if res.ExitStatus != 0 || scriptResult(res.Output) != "loaded" {
		return errors.New("docker load failed")
	}
	return nil
}
