package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// Control panel installation (CONTRACTS §53.3): the §49.16 runtime install,
// then a Caddy gateway in front of the loopback-only controller, then a
// direct HTTPS check from the core, then the switch to controller mode
// (which drops the SSH credentials).

const (
	gatewayDir             = "/opt/ccgateway-gateway"
	controllerInstallLimit = 20 * time.Minute
)

var (
	gatewayWait  = 120 * time.Second
	gatewayEvery = 3 * time.Second
)

// gatewayScript writes the Caddyfile from stdin and (re)starts ccg-gateway.
// It contains constants and an image reference that matches validImage
// only, never other input.
func gatewayScript(image string) (string, error) {
	if !validImage(image) {
		return "", errors.New("invalid gateway image reference")
	}
	return `set -u
umask 077
GW='` + image + `'
DIR='` + gatewayDir + `'
docker image inspect "$GW" >/dev/null 2>&1 || docker pull -q "$GW" >/dev/null 2>&1 || { echo CCG_RESULT=image_pull_failed; exit 1; }
mkdir -p "$DIR" && chmod 700 "$DIR" || { echo CCG_RESULT=gateway_failed; exit 1; }
if ! { cat > "$DIR/Caddyfile.tmp" && chmod 644 "$DIR/Caddyfile.tmp" && mv -f "$DIR/Caddyfile.tmp" "$DIR/Caddyfile"; }; then
  rm -f "$DIR/Caddyfile.tmp"; echo CCG_RESULT=gateway_failed; exit 1
fi
docker rm -f ccg-gateway >/dev/null 2>&1
if ! docker run -d --name ccg-gateway --restart unless-stopped --network host \
  -v "$DIR/Caddyfile:/etc/caddy/Caddyfile:ro" -v ccg-gateway-data:/data -v ccg-gateway-config:/config \
  --log-opt max-size=20m --log-opt max-file=3 "$GW" >/dev/null 2>&1; then
  docker rm -f ccg-gateway >/dev/null 2>&1; echo CCG_RESULT=gateway_failed; exit 1
fi
# A configuration Caddy rejects (or a port in use) stops it at once.
sleep 3
if [ "$(docker inspect --type container --format '{{.State.Running}} {{.RestartCount}}' ccg-gateway 2>/dev/null)" != "true 0" ]; then
  echo CCG_RESULT=gateway_failed; exit 1
fi
echo CCG_RESULT=started
`, nil
}

// gatewayCAScript prints the root certificate of Caddy's internal CA (IP
// mode), retrying for about 30 seconds while Caddy creates it.
const gatewayCAScript = `i=0
while :; do
  if out=$(docker exec ccg-gateway cat /data/caddy/pki/authorities/local/root.crt 2>/dev/null) && [ -n "$out" ]; then
    printf '%s\n' "$out"
    echo CCG_RESULT=ok
    exit 0
  fi
  i=$((i+1))
  [ "$i" -ge 15 ] && break
  sleep 2
done
echo CCG_RESULT=ca_unavailable
exit 1
`

// controllerInstall serves POST /system/ccgateway/controller/install. Like
// the runtime install it runs to its end when the caller disconnects.
func (s *Service) controllerInstall(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	var in struct {
		Host  string `json:"host"`
		Port  int    `json:"port"`
		Email string `json:"email"`
	}
	raw, e := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 4096))
	if e != nil || (len(strings.TrimSpace(string(raw))) > 0 && json.Unmarshal(raw, &in) != nil) {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(audit.Context(c)), controllerInstallLimit)
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
	if !cfg.AccountRuntimes {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "runtimes_disabled"))
		return
	}
	host := in.Host
	if host == "" {
		host = cfg.Host
	}
	if !validControllerHost(host) {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_host"))
		return
	}
	host = normalizeControllerHost(host)
	port := in.Port
	if port == 0 {
		port = 443
	}
	if port < 1 || port > 65535 {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("The control panel port must be between 1 and 65535."))
		return
	}
	if in.Email != "" && !validACMEEmail(in.Email) {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_email"))
		return
	}
	caddy, e := caddyfile(host, port, in.Email)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "invalid_host"))
		return
	}
	gateway, e := gatewayScript(cfg.EffectiveImages().Gateway)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "install_failed"))
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

	// 1. The controller, unless it is current and can tunnel already.
	if v, h := s.runtimeStateHealth(ctx, cfg); !v.UpToDate || !h.has("tunnel") {
		var err *core.Error
		if cfg, err = s.installRuntime(ctx, cfg, uid, true); err != nil {
			httpapi.Fail(c, err)
			return
		}
	}
	// 2. The gateway.
	res, e := s.run(ctx, cfg, gateway, []byte(caddy), installScriptLimit)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "ssh_failed"))
		return
	}
	if result := scriptResult(res.Output); res.ExitStatus != 0 || result != "started" {
		if result != "image_pull_failed" {
			result = "gateway_failed"
		}
		httpapi.Fail(c, reasonError(core.ErrUnavailable, result))
		return
	}
	// 3. IP mode: pin the root of Caddy's internal CA.
	var ca string
	if net.ParseIP(host) != nil {
		res, e = s.run(ctx, cfg, gatewayCAScript, nil, 2*time.Minute)
		if e != nil {
			httpapi.Fail(c, reasonError(core.ErrUnavailable, "ssh_failed"))
			return
		}
		if res.ExitStatus != 0 || scriptResult(res.Output) != "ok" {
			httpapi.Fail(c, reasonError(core.ErrUnavailable, "ca_unavailable"))
			return
		}
		if ca, _, e = parseControllerCA(res.Output); e != nil {
			httpapi.Fail(c, reasonError(core.ErrUnavailable, "ca_unavailable"))
			return
		}
	}
	// 4. The core reaches the controller through the gateway itself.
	panel := cfg
	panel.Mode, panel.Host, panel.Port, panel.ControllerCA = "controller", host, port, ca
	panel.clearSSH()
	if stage, ok := s.waitGateway(ctx, panel); !ok {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "gateway_unreachable").WithDetails(map[string]any{"stage": stage}))
		return
	}
	// 5. Switch to controller mode, unless the configuration changed meanwhile.
	saved, e := s.updateConfig(ctx, uid, []string{"mode", "host", "port", "controller_ca", "ssh"}, func(cur *Config) error {
		if cur.Mode != "ssh" || !cur.AccountRuntimes || cur.Host != cfg.Host || cur.Port != cfg.Port || cur.User != cfg.User || cur.AdminKey != cfg.AdminKey {
			return errConfigChanged
		}
		cur.Mode, cur.Host, cur.Port, cur.ControllerCA = "controller", host, port, ca
		cur.clearSSH()
		return validateControllerConfig(*cur)
	})
	if errors.Is(e, errConfigChanged) {
		httpapi.Fail(c, reasonError(core.ErrConflict, "config_changed"))
		return
	}
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "install_failed"))
		return
	}
	s.record(c, "controller.install")
	httpapi.OK(c, saved.Public())
	s.kickAll(ctx)
}

// waitGateway polls GET /health through the gateway until the controller
// answers with the tunnel feature; on failure it returns the stage of the
// last attempt (connect, tls or http).
func (s *Service) waitGateway(ctx context.Context, panel Config) (string, bool) {
	deadline := time.Now().Add(gatewayWait)
	for {
		h, e := s.healthWithin(ctx, panel, 25*time.Second)
		if e == nil && h.has("tunnel") {
			return "", true
		}
		stage := "http"
		var se *stageError
		if errors.As(e, &se) {
			stage = se.stage
		}
		if !time.Now().Add(gatewayEvery).Before(deadline) {
			return stage, false
		}
		select {
		case <-ctx.Done():
			return stage, false
		case <-time.After(gatewayEvery):
		}
	}
}
