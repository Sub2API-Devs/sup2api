package ccgateway

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

// Runtime installation and upgrade (CONTRACTS §49.16): the core pulls the
// pinned GHCR images on the Docker host over the saved SSH connection and
// replaces the controller container, rolling back when the new controller
// does not become healthy.

const (
	runtimeRoot    = "/opt/ccgateway-runtime"
	runtimeEnvFile = "/opt/ccgateway-runtime.env"
	installLockKey = "ccgateway:runtime:install"
)

var (
	// reportedImage / reportedVersion bound what the host reports back.
	reportedImage   = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._/:@-]{0,299}$`)
	reportedVersion = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$`)
	resultLine      = regexp.MustCompile(`(?m)^CCG_RESULT=([a-z_]+)\s*$`)
	rollbackLine    = regexp.MustCompile(`(?m)^CCG_ROLLBACK=(restored|removed|restore_failed)\s*$`)

	installScriptLimit = 15 * time.Minute
	healthWait         = 60 * time.Second
	healthEvery        = 2 * time.Second
)

// scriptRunner is remotedocker.RunScript (replaced in tests).
type scriptRunner func(ctx context.Context, cfg remotedocker.Config, script string, stdin []byte, limit time.Duration) (remotedocker.ScriptResult, error)

// localScriptRunner is remotedocker.RunLocalScript (replaced in tests).
type localScriptRunner func(ctx context.Context, script string, stdin []byte, limit time.Duration) (remotedocker.ScriptResult, error)

const (
	// localInstallMode marks the in-memory configuration of a local
	// installation (§53.9): scripts run on this machine and the controller
	// is localControllerAddress. It is never saved (mergeConfig rejects it).
	localInstallMode       = "install-local"
	localControllerAddress = "127.0.0.1:8787"
)

// run executes a fixed script on the Docker host of cfg: this machine for a
// local installation, else over SSH with cfg's credentials.
func (s *Service) run(ctx context.Context, cfg Config, script string, stdin []byte, limit time.Duration) (remotedocker.ScriptResult, error) {
	if cfg.Mode == localInstallMode {
		if s.runLocalScript != nil {
			return s.runLocalScript(ctx, script, stdin, limit)
		}
		return remotedocker.RunLocalScript(ctx, script, stdin, limit)
	}
	if s.runScript != nil {
		return s.runScript(ctx, cfg.SSH(), script, stdin, limit)
	}
	return remotedocker.RunScript(ctx, cfg.SSH(), script, stdin, limit)
}

// runStream is run with stdin streamed from a reader (an image archive for
// docker load, §53.10). The test hooks receive the whole input as bytes.
func (s *Service) runStream(ctx context.Context, cfg Config, script string, stdin io.Reader, limit time.Duration) (remotedocker.ScriptResult, error) {
	hooked := s.runScript != nil
	if cfg.Mode == localInstallMode {
		hooked = s.runLocalScript != nil
	}
	if hooked {
		data, err := io.ReadAll(stdin)
		if err != nil {
			return remotedocker.ScriptResult{}, err
		}
		return s.run(ctx, cfg, script, data, limit)
	}
	if cfg.Mode == localInstallMode {
		return remotedocker.RunLocalScriptStream(ctx, script, stdin, limit)
	}
	return remotedocker.RunScriptStream(ctx, cfg.SSH(), script, stdin, limit)
}

func (s *Service) openControllerClient(ctx context.Context, cfg Config) (*http.Client, string, func() error, error) {
	if s.openController != nil {
		return s.openController(ctx, cfg)
	}
	return s.open(ctx, cfg)
}

// inspectScript prints the controller's image reference (JSON string) and
// only its CCG_APP_IMAGE / CCG_EGRESS_IMAGE environment lines: the
// controller key in the same environment never leaves the host.
const inspectScript = `if out=$(docker inspect --type container --format '{{json .Config.Image}}{{"\n"}}{{range .Config.Env}}{{println .}}{{end}}' ccg-controller 2>/dev/null); then
  printf '%s\n' "$out" | grep -E '^("|CCG_APP_IMAGE=|CCG_EGRESS_IMAGE=)'
  exit 0
fi
echo CCG_RESULT=not_installed
`

// installScript pulls the images that are not on the host yet (images built
// on the host itself are used as they are), writes the controller
// environment from stdin (0600) and replaces the controller. The controller
// image's guard-api label picks the path (CONTRACTS §76.2): without it the
// 0.1.226 docker run path, unchanged (the previous controller is kept as
// ccg-controller-prev until the new one is healthy); with it the compose
// path, which writes compose.yml and .env, starts the guard first and, on a
// host whose controller docker run started, moves the controller data over
// (the transition). It contains constants and image references that match
// validImage only (no quotes, spaces or shell characters), never other
// input.
func installScript(img RuntimeImages, workloadOptional bool) (string, error) {
	for _, ref := range []string{img.App, img.Egress, img.Controller, img.Guard} {
		if !validImage(ref) {
			return "", errors.New("invalid runtime image reference")
		}
	}
	// The control panel install (§53.3) only needs the controller: app and
	// egress images may be uploaded through the panel afterwards.
	workload := `for img in "$APP" "$EGRESS"; do
  docker image inspect "$img" >/dev/null 2>&1 || docker pull -q "$img" >/dev/null 2>&1 || { echo CCG_RESULT=image_pull_failed; exit 1; }
done`
	if workloadOptional {
		workload = `for img in "$APP" "$EGRESS"; do
  docker image inspect "$img" >/dev/null 2>&1 || docker pull -q "$img" >/dev/null 2>&1 || true
done`
	}
	return `set -u
umask 077
APP='` + img.App + `'
EGRESS='` + img.Egress + `'
CTL='` + img.Controller + `'
GUARD='` + img.Guard + `'
ROOT='` + runtimeRoot + `'
ENVF='` + runtimeEnvFile + `'
DIR='` + composeDir + `'
DATA='` + controllerData + `'
STATE='` + guardState + `'
` + workload + `
docker image inspect "$CTL" >/dev/null 2>&1 || docker pull -q "$CTL" >/dev/null 2>&1 || { echo CCG_RESULT=image_pull_failed; exit 1; }
` + installPathSelect + legacyInstallBody + `exit 0
fi
` + composeInstallBody(), nil
}

// finishScript drops the previous controller after a healthy switch, and
// the rollback marks of a compose install (none on a docker run host).
const finishScript = `DIR='` + composeDir + `'
docker rm -f ccg-controller-prev >/dev/null 2>&1
rm -f "$DIR/.env.prev" "$DIR/.transition"
echo CCG_RESULT=done
`

// rollbackScript undoes an install whose controller did not become healthy:
// on a compose host it restores .env.prev (or, for a transition, moves the
// data back and restarts the previous controller); otherwise it is the
// 0.1.226 rollback, which removes the new controller and restarts the
// previous one under its own name.
const rollbackScript = `set -u
ROOT='` + runtimeRoot + `'
DIR='` + composeDir + `'
DATA='` + controllerData + `'
` + composeCommon + composeRollbackBranch + legacyRollback

// controllerEnv is the environment file written from stdin.
func controllerEnv(key string, img RuntimeImages) []byte {
	return []byte("CCG_RUNTIME_ROOT=" + runtimeRoot + "\n" +
		"CCG_APP_IMAGE=" + img.App + "\n" +
		"CCG_EGRESS_IMAGE=" + img.Egress + "\n" +
		"CCG_CONTROLLER_IMAGE=" + img.Controller + "\n" +
		"CCG_CONTROLLER_KEY=" + key + "\n" +
		"CCG_CONTROLLER_PORT=8787\n")
}

func scriptResult(out string) string {
	m := resultLine.FindAllStringSubmatch(out, -1)
	if len(m) == 0 {
		return ""
	}
	return m[len(m)-1][1]
}

// scriptRollback is the CCG_ROLLBACK line a failed compose install prints
// when it undid its own changes (restored, removed or restore_failed), ""
// without one.
func scriptRollback(out string) string {
	m := rollbackLine.FindAllStringSubmatch(out, -1)
	if len(m) == 0 {
		return ""
	}
	return m[len(m)-1][1]
}

// installFailure maps the result of a failed install script to the error
// the caller sees (§49.16, §76.7): the codes the console knows pass through,
// the rest (control_network_conflict, bridge_guard_active, ...) are only
// logged and answered as install_failed.
func installFailure(result string) (*core.Error, string) {
	switch result {
	case "image_pull_failed", "controller_unhealthy", "install_failed", "compose_unavailable", "guard_unavailable":
		return core.ErrUnavailable, result
	case "legacy_blocked":
		return core.ErrConflict, result
	}
	return core.ErrUnavailable, "install_failed"
}

type runtimeImages struct {
	App        string `json:"app"`
	Egress     string `json:"egress"`
	Controller string `json:"controller"`
}

type installedRuntime struct {
	ControllerImage string `json:"controller_image"`
	AppImage        string `json:"app_image"`
	EgressImage     string `json:"egress_image"`
	Version         string `json:"version"`
}

type runtimeView struct {
	Expected  runtimeImages     `json:"expected"`
	Installed *installedRuntime `json:"installed"`
	UpToDate  bool              `json:"up_to_date"`
	Reason    string            `json:"reason,omitempty"`
	// Bundled: the images of the active plugin package (§53.10), null
	// without.
	Bundled *bundledView `json:"bundled"`
}

type controllerHealth struct {
	Version         string   `json:"version"`
	AppImage        string   `json:"app_image"`
	EgressImage     string   `json:"egress_image"`
	ControllerImage string   `json:"controller_image"`
	Features        []string `json:"features"`
}

var featurePattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,31}$`)

func (h controllerHealth) has(feature string) bool {
	for _, f := range h.Features {
		if f == feature {
			return true
		}
	}
	return false
}

// describe is the remote-test output of a control panel (§53.4).
func (h controllerHealth) describe() string {
	features := []string{}
	for _, f := range h.Features {
		if featurePattern.MatchString(f) && len(features) < 32 {
			features = append(features, f)
		}
	}
	return "controller " + clean(h.Version, reportedVersion) + "\n" +
		"controller_image " + clean(h.ControllerImage, reportedImage) + "\n" +
		"app_image " + clean(h.AppImage, reportedImage) + "\n" +
		"egress_image " + clean(h.EgressImage, reportedImage) + "\n" +
		"features " + strings.Join(features, ", ") + "\n"
}

// health calls the controller's GET /health (through the SSH tunnel or the
// control panel).
func (s *Service) health(ctx context.Context, cfg Config) (controllerHealth, error) {
	return s.healthWithin(ctx, cfg, 15*time.Second)
}

func (s *Service) healthWithin(ctx context.Context, cfg Config, limit time.Duration) (controllerHealth, error) {
	var h controllerHealth
	if cfg.AdminKey == "" {
		return h, errors.New("no controller key")
	}
	ctx, cancel := context.WithTimeout(ctx, limit)
	defer cancel()
	client, base, close, e := s.openControllerClient(ctx, cfg)
	if e != nil {
		return h, e
	}
	defer close()
	req, e := http.NewRequestWithContext(ctx, "GET", base+"/health", nil)
	if e != nil {
		return h, e
	}
	req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	res, e := client.Do(req)
	if e != nil {
		return h, e
	}
	defer res.Body.Close()
	if res.StatusCode != 200 || json.NewDecoder(io.LimitReader(res.Body, 65536)).Decode(&h) != nil {
		return h, errors.New("controller health check failed")
	}
	return h, nil
}

func clean(v string, pattern *regexp.Regexp) string {
	if pattern.MatchString(v) {
		return v
	}
	if v == "" {
		return ""
	}
	return "unknown"
}

// runtimeState inspects the installed controller and checks its health.
func (s *Service) runtimeState(ctx context.Context, cfg Config) runtimeView {
	v, _ := s.runtimeStateHealth(ctx, cfg)
	return v
}

// runtimeStateHealth is runtimeState plus the health report it is based on
// (zero when the health check failed).
func (s *Service) runtimeStateHealth(ctx context.Context, cfg Config) (runtimeView, controllerHealth) {
	img := cfg.EffectiveImages()
	v := runtimeView{Expected: runtimeImages{App: img.App, Egress: img.Egress, Controller: img.Controller}, Bundled: s.bundle().view()}
	if cfg.Mode == "controller" {
		// Everything comes from the controller's own report (§53.6).
		h, e := s.health(ctx, cfg)
		if e != nil {
			v.Reason = "controller_unhealthy"
			return v, controllerHealth{}
		}
		in := &installedRuntime{ControllerImage: clean(h.ControllerImage, reportedImage), AppImage: clean(h.AppImage, reportedImage),
			EgressImage: clean(h.EgressImage, reportedImage), Version: clean(h.Version, reportedVersion)}
		v.Installed = in
		v.UpToDate = in.ControllerImage == img.Controller && in.AppImage == img.App && in.EgressImage == img.Egress
		return v, h
	}
	if cfg.Mode != "ssh" {
		v.Reason = "ssh_not_configured"
		return v, controllerHealth{}
	}
	res, e := s.run(ctx, cfg, inspectScript, nil, time.Minute)
	if e != nil || res.ExitStatus != 0 {
		v.Reason = "ssh_failed"
		return v, controllerHealth{}
	}
	if scriptResult(res.Output) == "not_installed" {
		// installed: null without a reason is "not installed" (the console
		// reads a reason with installed null as "state unknown").
		return v, controllerHealth{}
	}
	in := installedFromScript(res.Output)
	v.Installed = in
	h, e := s.health(ctx, cfg)
	if e != nil {
		v.Reason = "controller_unhealthy"
		return v, controllerHealth{}
	}
	applyHealthToInstalled(in, h)
	v.UpToDate = in.ControllerImage == img.Controller && in.AppImage == img.App && in.EgressImage == img.Egress
	return v, h
}

// installedFromScript reads the images an SSH inspect script printed:
// a bare quoted line is the controller image, the CCG_* lines the others.
func installedFromScript(output string) *installedRuntime {
	in := &installedRuntime{}
	sc := bufio.NewScanner(strings.NewReader(output))
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		switch {
		case strings.HasPrefix(line, `"`):
			var img string
			if json.Unmarshal([]byte(line), &img) == nil {
				in.ControllerImage = clean(img, reportedImage)
			}
		case strings.HasPrefix(line, "CCG_APP_IMAGE="):
			in.AppImage = clean(strings.TrimPrefix(line, "CCG_APP_IMAGE="), reportedImage)
		case strings.HasPrefix(line, "CCG_EGRESS_IMAGE="):
			in.EgressImage = clean(strings.TrimPrefix(line, "CCG_EGRESS_IMAGE="), reportedImage)
		}
	}
	return in
}

// applyHealthToInstalled overlays what the controller itself reports on the
// script's answer (the controller is authoritative for its own version and
// images).
func applyHealthToInstalled(in *installedRuntime, h controllerHealth) {
	in.Version = clean(h.Version, reportedVersion)
	if h.AppImage != "" {
		in.AppImage = clean(h.AppImage, reportedImage)
	}
	if h.EgressImage != "" {
		in.EgressImage = clean(h.EgressImage, reportedImage)
	}
}

// runtimeGet serves GET /system/ccgateway/runtime.
func (s *Service) runtimeGet(c *gin.Context) {
	httpapi.NoStore(c)
	ctx, cancel := context.WithTimeout(c.Request.Context(), 90*time.Second)
	defer cancel()
	cfg, e := s.Load(ctx)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "not_configured"))
		return
	}
	httpapi.OK(c, s.runtimeState(ctx, cfg))
}

// ensureControllerKey returns the management key the controller is started
// with: the configured one, else a new random key saved (encrypted) into the
// configuration first. Another node saving one meanwhile wins.
func (s *Service) ensureControllerKey(ctx context.Context, cfg Config, uid int64) (string, error) {
	if cfg.AdminKey != "" {
		if strings.ContainsAny(cfg.AdminKey, "\r\n\x00") {
			return "", errors.New("invalid controller key")
		}
		return cfg.AdminKey, nil
	}
	key, e := newControllerKey()
	if e != nil {
		return "", e
	}
	var updatedBy *int64
	if uid > 0 {
		updatedBy = &uid
	}
	e = s.DB.Tx(ctx, func(tx pgx.Tx) error {
		_, e := store.UpdateSettingJSONTx(ctx, tx, settingKey, updatedBy, func(raw json.RawMessage) (json.RawMessage, error) {
			cur, e := s.decode(raw)
			if e != nil {
				return nil, e
			}
			if cur.AdminKey != "" {
				key = cur.AdminKey
				return raw, nil
			}
			cur.AdminKey = key
			plain, _ := json.Marshal(cur)
			if s.Cipher == nil {
				return nil, errors.New("encryption unavailable")
			}
			enc, e := s.Cipher.Encrypt(plain, configAAD)
			if e != nil {
				return nil, e
			}
			return json.Marshal(map[string]any{"cipher": enc})
		})
		if e != nil {
			return e
		}
		return audit.Audit(ctx, tx, uid, "ccgateway.config.update", "system", "ccgateway", map[string]any{"fields": []string{"admin_key"}})
	})
	if e == nil {
		s.configChanged(ctx)
	}
	return key, e
}

// lockInstall lets one installation run at a time (cluster-wide with a
// Locker).
func (s *Service) lockInstall(ctx context.Context) (context.Context, func(), bool, error) {
	if s.Locker != nil {
		lk, ok, e := s.Locker.TryLock(ctx, installLockKey, 2*time.Minute)
		if e != nil || !ok {
			return ctx, nil, false, e
		}
		kctx, cancel := core.KeepLock(ctx, lk)
		return kctx, func() { cancel(); lk.Release() }, true, nil
	}
	if !s.installMu.TryLock() {
		return ctx, nil, false, nil
	}
	return ctx, s.installMu.Unlock, true, nil
}

// installLock acquires the install lock for a handler. ok=false means the
// response was already written: install_failed when the lock could not be
// taken, install_in_progress when another operation holds it.
func (s *Service) installLock(c *gin.Context, ctx context.Context) (context.Context, func(), bool) {
	lctx, release, ok, e := s.lockInstall(ctx)
	if e != nil {
		s.failInstall(c)
		return ctx, nil, false
	}
	if !ok {
		httpapi.Fail(c, reasonError(core.ErrConflict, "install_in_progress"))
		return ctx, nil, false
	}
	return lctx, release, true
}

// runtimeInstall serves POST /system/ccgateway/runtime/install. The
// installation runs to its end even when the caller disconnects (an aborted
// switch would leave the host without a controller).
func (s *Service) runtimeInstall(c *gin.Context) {
	httpapi.NoStore(c)
	ctx, cancel := detached(c, installScriptLimit+3*time.Minute)
	defer cancel()
	cfg, e := s.Load(ctx)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "not_configured"))
		return
	}
	if cfg.Mode != "ssh" && cfg.Mode != "controller" {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "ssh_not_configured"))
		return
	}
	ctx, release, ok := s.installLock(c, ctx)
	if !ok {
		return
	}
	defer release()
	if cfg.Mode == "controller" {
		if err := s.panelUpgrade(ctx, cfg); err != nil {
			httpapi.Fail(c, err)
			return
		}
	} else {
		uid, _ := core.UserID(ctx)
		var err *core.Error
		if cfg, err = s.installRuntime(ctx, cfg, uid, false); err != nil {
			httpapi.Fail(c, err)
			return
		}
	}
	s.record(c, "runtime.install")
	s.kickAll(ctx)
	httpapi.OK(c, s.runtimeState(ctx, cfg))
}

// installRuntime is the §49.16 installation over SSH: controller key, fixed
// install script, health check with rollback, removal of the previous
// controller. It returns cfg with the controller key. workloadOptional: app
// and egress images missing on the host are not an error (§53.3).
func (s *Service) installRuntime(ctx context.Context, cfg Config, uid int64, workloadOptional bool) (Config, *core.Error) {
	key, e := s.ensureControllerKey(ctx, cfg, uid)
	if e != nil {
		return cfg, reasonError(core.ErrUnavailable, "install_failed")
	}
	cfg.AdminKey = key
	img := cfg.EffectiveImages()
	script, e := installScript(img, workloadOptional)
	if e != nil {
		return cfg, reasonError(core.ErrInvalidArgument, "install_failed")
	}
	// Bundled images first (§53.10), each streamed on its own run; the
	// controller's is required, app / egress only when the workload is.
	required := map[string]bool{"controller": true, "app": !workloadOptional, "egress": !workloadOptional}
	if err := s.loadBundledImages(ctx, cfg, []string{"app", "egress", "controller"}, required); err != nil {
		return cfg, err
	}
	res, e := s.run(ctx, cfg, script, controllerEnv(key, img), installScriptLimit)
	if e != nil {
		return cfg, reasonError(core.ErrUnavailable, runFailure(cfg))
	}
	if res.ExitStatus != 0 || scriptResult(res.Output) != "started" {
		raw := scriptResult(res.Output)
		kind, reason := installFailure(raw)
		rollback := scriptRollback(res.Output)
		slog.WarnContext(ctx, "CCGateway runtime install failed", "reason", reason, "result", raw, "rollback", rollback, "exit", res.ExitStatus)
		err := reasonError(kind, reason)
		if rollback != "" {
			err = err.WithDetails(map[string]any{"rollback": rollback})
		}
		return cfg, err
	}
	if !s.waitHealthy(ctx, cfg, img) {
		restored := "rollback_failed"
		if r, e := s.run(ctx, cfg, rollbackScript, nil, 2*time.Minute); e == nil && r.ExitStatus == 0 {
			restored = scriptResult(r.Output) // restored | removed
		}
		slog.WarnContext(ctx, "CCGateway controller unhealthy after install, rolled back", "rollback", restored)
		return cfg, reasonError(core.ErrUnavailable, "controller_unhealthy").WithDetails(map[string]any{"rollback": restored})
	}
	if r, e := s.run(ctx, cfg, finishScript, nil, time.Minute); e != nil || r.ExitStatus != 0 {
		slog.WarnContext(ctx, "CCGateway: removing the previous controller failed")
	}
	return cfg, nil
}

// kickAll reconciles every runtime now (a resync after an install or image
// change). It never recreates account containers for a new image: the
// controller recreates an app container only when its credential
// fingerprint or network policy changed, so existing containers keep their
// image; workers are replaced in place instead (§53.7).
func (s *Service) kickAll(ctx context.Context) {
	if keys, e := s.runtimeKeys(ctx); e == nil {
		for _, k := range keys {
			s.Kick(k)
		}
	}
}

// waitHealthy polls GET /health until the new controller answers with the
// installed images, at most healthWait.
func (s *Service) waitHealthy(ctx context.Context, cfg Config, img RuntimeImages) bool {
	deadline := time.Now().Add(healthWait)
	for {
		if h, e := s.health(ctx, cfg); e == nil && h.AppImage == img.App && h.EgressImage == img.Egress {
			return true
		}
		if !time.Now().Add(healthEvery).Before(deadline) {
			return false
		}
		select {
		case <-ctx.Done():
			return false
		case <-time.After(healthEvery):
		}
	}
}
