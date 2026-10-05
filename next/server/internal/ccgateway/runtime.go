package ccgateway

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
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

	installScriptLimit = 15 * time.Minute
	healthWait         = 60 * time.Second
	healthEvery        = 2 * time.Second
)

// scriptRunner is remotedocker.RunScript (replaced in tests).
type scriptRunner func(ctx context.Context, cfg remotedocker.Config, script string, stdin []byte, limit time.Duration) (remotedocker.ScriptResult, error)

func (s *Service) run(ctx context.Context, cfg Config, script string, stdin []byte, limit time.Duration) (remotedocker.ScriptResult, error) {
	if s.runScript != nil {
		return s.runScript(ctx, cfg.SSH(), script, stdin, limit)
	}
	return remotedocker.RunScript(ctx, cfg.SSH(), script, stdin, limit)
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
// environment from stdin (0600) and replaces the controller (the previous
// one is kept as ccg-controller-prev until the new one is healthy). It
// contains constants and image references that match validImage only (no
// quotes, spaces or shell characters), never other input.
func installScript(img RuntimeImages) (string, error) {
	for _, ref := range []string{img.App, img.Egress, img.Controller} {
		if !validImage(ref) {
			return "", errors.New("invalid runtime image reference")
		}
	}
	return `set -u
umask 077
APP='` + img.App + `'
EGRESS='` + img.Egress + `'
CTL='` + img.Controller + `'
ROOT='` + runtimeRoot + `'
ENVF='` + runtimeEnvFile + `'
for img in "$APP" "$EGRESS" "$CTL"; do
  docker image inspect "$img" >/dev/null 2>&1 || docker pull -q "$img" >/dev/null 2>&1 || { echo CCG_RESULT=image_pull_failed; exit 1; }
done
mkdir -p "$ROOT" && chmod 700 "$ROOT" || { echo CCG_RESULT=install_failed; exit 1; }
if ! { cat > "$ENVF.tmp" && chmod 600 "$ENVF.tmp" && mv -f "$ENVF.tmp" "$ENVF"; }; then
  rm -f "$ENVF.tmp"; echo CCG_RESULT=install_failed; exit 1
fi
# An install interrupted after the rename left only the previous controller.
if ! docker inspect --type container ccg-controller >/dev/null 2>&1 && docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
  docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1
fi
docker rm -f ccg-controller-prev >/dev/null 2>&1
if docker inspect --type container ccg-controller >/dev/null 2>&1; then
  docker rename ccg-controller ccg-controller-prev >/dev/null 2>&1 || { echo CCG_RESULT=install_failed; exit 1; }
  docker stop ccg-controller-prev >/dev/null 2>&1
fi
if ! docker run -d --name ccg-controller --restart unless-stopped --network host \
  --env-file "$ENVF" -v /var/run/docker.sock:/var/run/docker.sock -v "$ROOT:$ROOT" \
  --log-opt max-size=20m --log-opt max-file=3 "$CTL" >/dev/null 2>&1; then
  docker rm -f ccg-controller >/dev/null 2>&1
  if docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
    docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1
  fi
  echo CCG_RESULT=controller_unhealthy; exit 1
fi
echo CCG_RESULT=started
`, nil
}

// finishScript drops the previous controller after a healthy switch.
const finishScript = `docker rm -f ccg-controller-prev >/dev/null 2>&1
echo CCG_RESULT=done
`

// rollbackScript removes an unhealthy new controller and restarts the
// previous one under its own name.
const rollbackScript = `docker rm -f ccg-controller >/dev/null 2>&1
if docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
  if docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1; then
    echo CCG_RESULT=restored; exit 0
  fi
  echo CCG_RESULT=restore_failed; exit 1
fi
echo CCG_RESULT=removed
`

// controllerEnv is the environment file written from stdin.
func controllerEnv(key string, img RuntimeImages) []byte {
	return []byte("CCG_RUNTIME_ROOT=" + runtimeRoot + "\n" +
		"CCG_APP_IMAGE=" + img.App + "\n" +
		"CCG_EGRESS_IMAGE=" + img.Egress + "\n" +
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
}

type controllerHealth struct {
	Version     string `json:"version"`
	AppImage    string `json:"app_image"`
	EgressImage string `json:"egress_image"`
}

// health calls the controller's GET /health through the SSH tunnel.
func (s *Service) health(ctx context.Context, cfg Config) (controllerHealth, error) {
	var h controllerHealth
	if cfg.AdminKey == "" {
		return h, errors.New("no controller key")
	}
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
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
	img := cfg.EffectiveImages()
	v := runtimeView{Expected: runtimeImages{App: img.App, Egress: img.Egress, Controller: img.Controller}}
	if cfg.Mode != "ssh" {
		v.Reason = "ssh_not_configured"
		return v
	}
	res, e := s.run(ctx, cfg, inspectScript, nil, time.Minute)
	if e != nil || res.ExitStatus != 0 {
		v.Reason = "ssh_failed"
		return v
	}
	if scriptResult(res.Output) == "not_installed" {
		// installed: null without a reason is "not installed" (the console
		// reads a reason with installed null as "state unknown").
		return v
	}
	in := &installedRuntime{}
	sc := bufio.NewScanner(strings.NewReader(res.Output))
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
	v.Installed = in
	h, e := s.health(ctx, cfg)
	if e != nil {
		v.Reason = "controller_unhealthy"
		return v
	}
	in.Version = clean(h.Version, reportedVersion)
	if h.AppImage != "" {
		in.AppImage = clean(h.AppImage, reportedImage)
	}
	if h.EgressImage != "" {
		in.EgressImage = clean(h.EgressImage, reportedImage)
	}
	v.UpToDate = in.ControllerImage == img.Controller && in.AppImage == img.App && in.EgressImage == img.Egress
	return v
}

// runtimeGet serves GET /system/ccgateway/runtime.
func (s *Service) runtimeGet(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
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
	var b [32]byte
	if _, e := rand.Read(b[:]); e != nil {
		return "", e
	}
	key := hex.EncodeToString(b[:])
	var updatedBy *int64
	if uid > 0 {
		updatedBy = &uid
	}
	e := s.DB.Tx(ctx, func(tx pgx.Tx) error {
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

// runtimeInstall serves POST /system/ccgateway/runtime/install. The
// installation runs to its end even when the caller disconnects (an aborted
// switch would leave the host without a controller).
func (s *Service) runtimeInstall(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	ctx, cancel := context.WithTimeout(context.WithoutCancel(audit.Context(c)), installScriptLimit+3*time.Minute)
	defer cancel()
	cfg, e := s.Load(ctx)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "not_configured"))
		return
	}
	if cfg.Mode != "ssh" {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "ssh_not_configured"))
		return
	}
	ctx, release, ok, e := s.lockInstall(ctx)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "install_failed"))
		return
	}
	if !ok {
		httpapi.Fail(c, reasonError(core.ErrConflict, "install_in_progress"))
		return
	}
	defer release()
	uid, _ := core.UserID(ctx)
	key, e := s.ensureControllerKey(ctx, cfg, uid)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "install_failed"))
		return
	}
	cfg.AdminKey = key
	img := cfg.EffectiveImages()
	script, e := installScript(img)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "install_failed"))
		return
	}
	res, e := s.run(ctx, cfg, script, controllerEnv(key, img), installScriptLimit)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "ssh_failed"))
		return
	}
	if res.ExitStatus != 0 || scriptResult(res.Output) != "started" {
		reason := scriptResult(res.Output)
		switch reason {
		case "image_pull_failed", "controller_unhealthy", "install_failed":
		default:
			reason = "install_failed"
		}
		slog.WarnContext(ctx, "CCGateway runtime install failed", "reason", reason, "exit", res.ExitStatus)
		httpapi.Fail(c, reasonError(core.ErrUnavailable, reason))
		return
	}
	if !s.waitHealthy(ctx, cfg, img) {
		restored := "rollback_failed"
		if r, e := s.run(ctx, cfg, rollbackScript, nil, 2*time.Minute); e == nil && r.ExitStatus == 0 {
			restored = scriptResult(r.Output) // restored | removed
		}
		slog.WarnContext(ctx, "CCGateway controller unhealthy after install, rolled back", "rollback", restored)
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "controller_unhealthy").WithDetails(map[string]any{"rollback": restored}))
		return
	}
	if r, e := s.run(ctx, cfg, finishScript, nil, time.Minute); e != nil || r.ExitStatus != 0 {
		slog.WarnContext(ctx, "CCGateway: removing the previous controller failed")
	}
	s.record(c, "runtime.install")
	// The controller recreates app containers whose image changed on the
	// next reconcile; do it now instead of waiting for the sweep.
	if keys, e := s.runtimeKeys(ctx); e == nil {
		for _, k := range keys {
			s.Kick(k)
		}
	}
	httpapi.OK(c, s.runtimeState(ctx, cfg))
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
