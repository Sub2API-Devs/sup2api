package ccgateway

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"regexp"
	"strconv"
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

// Controller installation (CONTRACTS §53.3 / §53.9): an optional step before
// connecting. The §49.16 runtime install runs on the Docker host (over SSH
// with credentials used for this request only, or on this machine), then a
// Caddy gateway in front of the loopback-only controller, then a direct
// check from the core, then the switch to controller mode. SSH credentials
// are never saved.

const (
	gatewayDir             = "/opt/ccgateway-gateway"
	controllerInstallLimit = 20 * time.Minute

	// Automatic gateway ports: portRange ports from these (§53.9).
	httpsPortStart = 18443
	httpPortStart  = 18080
	portRange      = 100
)

var (
	gatewayWait  = 120 * time.Second
	gatewayEvery = 3 * time.Second

	portLine = regexp.MustCompile(`(?m)^CCG_PORT=([0-9]{1,5})\s*$`)
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

// portScript checks Docker and picks the gateway port (§53.9). stdin is
// "<wanted> <start> <acme>\n" (decimal; wanted 0: the first free port of
// start..start+99; acme 1: a domain with automatic certificates, which also
// needs port 80 or 443 for the ACME challenge). Listening ports come from
// /proc/net/tcp and tcp6 (state 0A, hexadecimal port); ports of the running
// ccg-gateway count as free since the install replaces it (its site ports,
// and 80 when it serves a domain). It prints CCG_PORT=<n>.
const portScript = `set -u
read -r WANT START ACME || { echo CCG_RESULT=install_failed; exit 1; }
case "$WANT" in ''|*[!0-9]*) echo CCG_RESULT=install_failed; exit 1 ;; esac
case "$START" in ''|*[!0-9]*) echo CCG_RESULT=install_failed; exit 1 ;; esac
case "$ACME" in 0|1) ;; *) echo CCG_RESULT=install_failed; exit 1 ;; esac
command -v docker >/dev/null 2>&1 || { echo CCG_RESULT=docker_not_installed; exit 1; }
docker info >/dev/null 2>&1 || { echo CCG_RESULT=docker_not_running; exit 1; }
[ -r /proc/net/tcp ] || { echo CCG_RESULT=install_failed; exit 1; }
USED=$(cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | awk '
function hex(s,  i, c, v) {
  v = 0
  s = toupper(s)
  for (i = 1; i <= length(s); i++) {
    c = index("0123456789ABCDEF", substr(s, i, 1))
    if (c == 0) return -1
    v = v * 16 + c - 1
  }
  return v
}
$4 == "0A" { n = split($2, a, ":"); print hex(a[n]) }')
OWN=
if [ "$(docker inspect --type container --format '{{.State.Running}}' ccg-gateway 2>/dev/null)" = "true" ]; then
  OWN=$(docker exec ccg-gateway cat /etc/caddy/Caddyfile 2>/dev/null | awk 'NF == 2 && $2 == "{" {
    n = split($1, a, ":"); print a[n]
    if ($1 !~ /^https?:\/\//) print 80
  }')
fi
in_use() {
  for o in $OWN; do [ "$o" = "$1" ] && return 1; done
  for u in $USED; do [ "$u" = "$1" ] && return 0; done
  return 1
}
PORT=
if [ "$WANT" -ne 0 ]; then
  if in_use "$WANT"; then echo CCG_RESULT=port_in_use; exit 1; fi
  PORT=$WANT
else
  p=$START
  while [ "$p" -lt $((START + 100)) ]; do
    if ! in_use "$p"; then PORT=$p; break; fi
    p=$((p + 1))
  done
  [ -n "$PORT" ] || { echo CCG_RESULT=no_free_port; exit 1; }
fi
if [ "$ACME" = 1 ] && [ "$PORT" != 443 ] && in_use 80 && in_use 443; then
  echo CCG_RESULT=acme_ports_unavailable; exit 1
fi
echo "CCG_PORT=$PORT"
echo CCG_RESULT=ok
`

// installRequest is the body of POST /system/ccgateway/controller/install.
type installRequest struct {
	// Method: "ssh", "local", or "" (the saved legacy SSH connection).
	Method string `json:"method"`
	// SSH is used for this request only: never saved, logged or audited.
	SSH    *installSSH `json:"ssh"`
	Scheme string      `json:"scheme"`
	Host   string      `json:"host"`
	Port   int         `json:"port"`
	Email  string      `json:"email"`
	// BasePath is not accepted: the installed gateway serves the controller
	// at the root.
	BasePath *string `json:"base_path"`
}

type installSSH struct {
	Host               string `json:"host"`
	Port               int    `json:"port"`
	User               string `json:"user"`
	AuthMode           string `json:"auth_mode"`
	Password           string `json:"password"`
	PrivateKey         string `json:"private_key"`
	Passphrase         string `json:"passphrase"`
	HostKeyFingerprint string `json:"host_key_fingerprint"`
}

// runFailure is the reason of a script that could not be run on target.
func runFailure(target Config) string {
	if target.Mode == localInstallMode {
		return "install_failed"
	}
	return "ssh_failed"
}

// newControllerKey is a fresh 32-byte management key (hex).
func newControllerKey() (string, error) {
	var b [32]byte
	if _, e := rand.Read(b[:]); e != nil {
		return "", e
	}
	return hex.EncodeToString(b[:]), nil
}

// failInstall answers an installation failure that is not the caller's fault
// (nothing reaches the controller / configuration could not be written).
func (s *Service) failInstall(c *gin.Context) {
	httpapi.Fail(c, reasonError(core.ErrUnavailable, "install_failed"))
}

// installPlan is one installation in progress: where its scripts run, the
// connection host, the configuration version it was read at, whether it is the
// legacy flow (the saved SSH connection, which keeps its management key), and
// the gateway plan computed before anything is replaced.
type installPlan struct {
	target  Config // where the scripts run; carries the management key in memory
	version []byte // configuration version the connection is saved at
	scheme  string
	host    string
	legacy  bool

	port        int    // gateway port
	domain      bool   // HTTPS with a host name: automatic certificates
	pinCA       bool   // HTTPS to an IP: pin the gateway's internal CA root
	caddyConfig string // Caddyfile written to the gateway
}

// installDestination resolves the install target and the endpoint the core
// will reach the controller at.
func installDestination(in installRequest, cfg Config) (installPlan, *core.Error) {
	plan := installPlan{legacy: in.Method == ""}
	target, host, failure := installTarget(in, cfg)
	if failure != nil {
		return plan, failure
	}
	plan.target = target
	plan.scheme, plan.host, failure = installEndpoint(in, host)
	return plan, failure
}

// installAdminKey keeps the saved key for the legacy flow (creating one when
// there is none) and always creates a new key for a request installation: a
// key never moves to another host.
func (s *Service) installAdminKey(ctx context.Context, cfg Config, plan installPlan, uid int64) (installPlan, *core.Error) {
	if plan.legacy {
		if cfg.AdminKey == "" {
			saved, version, failure := s.legacyControllerKey(ctx, cfg, uid)
			if failure != nil {
				return plan, failure
			}
			// The legacy flow replaces the whole saved configuration.
			plan.target, plan.version = saved, version
		}
		return plan, nil
	}
	key, e := newControllerKey()
	if e != nil {
		return plan, reasonError(core.ErrUnavailable, "install_failed")
	}
	plan.target.AdminKey = key
	return plan, nil
}

// installGatewayPlan fills the gateway port and Caddyfile. A domain over
// HTTPS gets automatic certificates (system roots, nothing pinned); HTTPS to
// an IP pins the root of the gateway's internal CA.
func (s *Service) installGatewayPlan(ctx context.Context, plan installPlan, in installRequest) (installPlan, *core.Error) {
	plan.domain = plan.scheme == "https" && net.ParseIP(plan.host) == nil
	plan.pinCA = plan.scheme == "https" && !plan.domain
	port, err := s.gatewayPort(ctx, plan.target, plan.scheme, in.Port, plan.domain)
	if err != nil {
		return plan, core.AsError(err)
	}
	plan.port = port
	caddy, failure := installCaddyfile(plan.scheme, plan.host, port, in.Email)
	if failure != nil {
		return plan, failure
	}
	plan.caddyConfig = caddy
	return plan, nil
}

// controllerInstall serves POST /system/ccgateway/controller/install. Like
// the runtime install it runs to its end when the caller disconnects.
func (s *Service) controllerInstall(c *gin.Context) {
	httpapi.NoStore(c)
	var in installRequest
	raw, e := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 192<<10))
	if e != nil || (len(strings.TrimSpace(string(raw))) > 0 && json.Unmarshal(raw, &in) != nil) || in.BasePath != nil {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	ctx, cancel := detached(c, controllerInstallLimit)
	defer cancel()
	cfg, version, e := s.loadVersioned(ctx)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "not_configured"))
		return
	}
	plan, failure := installDestination(in, cfg)
	if failure != nil {
		httpapi.Fail(c, failure)
		return
	}
	plan.version = version
	gateway, e := gatewayScript(cfg.EffectiveImages().Gateway)
	if e != nil {
		s.failInstall(c)
		return
	}
	ctx, release, ok := s.installLock(c, ctx)
	if !ok {
		return
	}
	defer release()
	uid, _ := core.UserID(ctx)

	// The management key: a new one for every installation through the
	// request (a key never moves to another host); the legacy flow keeps the
	// saved SSH configuration's key, saved first when there is none.
	if plan, failure = s.installAdminKey(ctx, cfg, plan, uid); failure != nil {
		httpapi.Fail(c, failure)
		return
	}

	// 0. Docker and the gateway port, before anything is replaced.
	if plan, failure = s.installGatewayPlan(ctx, plan, in); failure != nil {
		httpapi.Fail(c, failure)
		return
	}
	// 1. The controller.
	installed, err := s.installController(ctx, plan.target, uid, plan.legacy)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	plan.target = installed
	// 2. The gateway and 3. the root of its internal CA.
	ca, err := s.startGateway(ctx, plan.target, gateway, plan.caddyConfig, plan.pinCA)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	// 4. The core reaches the controller through the gateway itself.
	panel := Config{Mode: "controller", AccountRuntimes: true, Scheme: plan.scheme, Host: plan.host, Port: plan.port, ControllerCA: ca, AdminKey: plan.target.AdminKey}
	if stage, ok := s.waitGateway(ctx, panel); !ok {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "gateway_unreachable").WithDetails(map[string]any{"stage": stage}))
		return
	}
	var warnings []string
	if plan.domain && s.dnsMismatch(ctx, plan.host, plan.target) {
		warnings = append(warnings, "dns_mismatch")
	}
	// 5. Connect.
	saved, failure := s.connectInstalled(ctx, uid, plan.legacy, plan.version, panel)
	if failure != nil {
		httpapi.Fail(c, failure)
		return
	}
	s.record(c, "controller.install")
	view := saved.Public()
	if len(warnings) > 0 {
		view["warnings"] = warnings
	}
	httpapi.OK(c, view)
	s.kickAll(ctx)
}

// installController installs the controller of an installation. The legacy
// flow keeps a controller that is current and can tunnel already; a new key
// always needs a new controller.
func (s *Service) installController(ctx context.Context, target Config, uid int64, legacy bool) (Config, *core.Error) {
	if legacy {
		if v, h := s.runtimeStateHealth(ctx, target); v.UpToDate && h.has("tunnel") {
			return target, nil
		}
	}
	return s.installRuntime(ctx, target, uid, true)
}

// installCaddyfile is the gateway configuration of an installation.
func installCaddyfile(scheme, host string, port int, email string) (string, *core.Error) {
	var caddy string
	var e error
	if scheme == "http" {
		caddy, e = caddyfileHTTP(port)
	} else {
		caddy, e = caddyfile(host, port, email)
	}
	if e != nil {
		return "", reasonError(core.ErrInvalidArgument, "invalid_host")
	}
	return caddy, nil
}

// connectInstalled saves the installed control panel as the connection,
// unless the configuration was saved by anyone since it was read (version).
// The legacy flow keeps the saved management key.
func (s *Service) connectInstalled(ctx context.Context, uid int64, legacy bool, version []byte, panel Config) (Config, *core.Error) {
	fields := []string{"mode", "scheme", "host", "port", "controller_ca", "admin_key", "ssh"}
	if legacy {
		fields = []string{"mode", "scheme", "host", "port", "controller_ca", "ssh"}
	}
	saved, e := s.updateConfigAt(ctx, uid, fields, version, func(cur *Config) error {
		cur.Mode, cur.Scheme, cur.Host, cur.Port, cur.ControllerCA, cur.AdminKey = "controller", panel.Scheme, panel.Host, panel.Port, panel.ControllerCA, panel.AdminKey
		cur.BasePath = ""
		cur.AccountRuntimes = true
		cur.clearSSH()
		if cur.APIKey == cur.AdminKey {
			cur.APIKey = ""
		}
		return validateControllerConfig(*cur)
	})
	if errors.Is(e, errConfigChanged) {
		return saved, reasonError(core.ErrConflict, "config_changed")
	}
	if e != nil {
		return saved, reasonError(core.ErrUnavailable, "install_failed")
	}
	return saved, nil
}

// installTarget is where an installation's scripts run (method ssh, local, or
// the saved legacy SSH connection) and the default connection host.
func installTarget(in installRequest, cfg Config) (target Config, host string, failure *core.Error) {
	host = in.Host
	switch in.Method {
	case "":
		// Compatibility: the saved (legacy) SSH connection. account_runtimes
		// is not checked: per-account runtimes are the only mode (§53.9) and
		// the switch saves it as true.
		if cfg.Mode != "ssh" {
			return target, host, reasonError(core.ErrInvalidArgument, "ssh_not_configured")
		}
		target = cfg
	case "ssh":
		if in.SSH == nil {
			return target, host, reasonError(core.ErrInvalidArgument, "invalid_ssh")
		}
		target = Config{Mode: "ssh", AccountRuntimes: true, Images: cfg.Images, Host: in.SSH.Host, Port: in.SSH.Port, User: in.SSH.User,
			AuthMode: in.SSH.AuthMode, Password: in.SSH.Password, PrivateKey: in.SSH.PrivateKey, Passphrase: in.SSH.Passphrase,
			HostKeyFingerprint: in.SSH.HostKeyFingerprint, bundled: cfg.bundled}
		if target.Port == 0 {
			target.Port = 22
		}
		if remotedocker.Validate(target.SSH()) != nil {
			return target, host, reasonError(core.ErrInvalidArgument, "invalid_ssh")
		}
	case "local":
		target = Config{Mode: localInstallMode, AccountRuntimes: true, Images: cfg.Images, bundled: cfg.bundled}
		if host == "" {
			host = "127.0.0.1"
		}
	default:
		return target, host, core.ErrInvalidArgument.WithMessage("The install method must be ssh or local.")
	}
	if host == "" {
		host = target.Host
	}
	return target, host, nil
}

// installEndpoint checks the control panel endpoint of an installation.
func installEndpoint(in installRequest, host string) (scheme, normalized string, failure *core.Error) {
	switch in.Scheme {
	case "", "https":
		scheme = "https"
	case "http":
		scheme = "http"
	default:
		return "", host, core.ErrInvalidArgument.WithMessage("The control panel scheme must be https or http.")
	}
	if !validControllerHost(host) {
		return scheme, host, reasonError(core.ErrInvalidArgument, "invalid_host")
	}
	if in.Port < 0 || in.Port > 65535 {
		return scheme, host, core.ErrInvalidArgument.WithMessage("The control panel port must be 0 (automatic) or between 1 and 65535.")
	}
	if in.Email != "" && !validACMEEmail(in.Email) {
		return scheme, host, reasonError(core.ErrInvalidArgument, "invalid_email")
	}
	return scheme, normalizeControllerHost(host), nil
}

// legacyControllerKey saves a management key into the legacy SSH
// configuration that has none, and reads it back with its stored version.
func (s *Service) legacyControllerKey(ctx context.Context, cfg Config, uid int64) (Config, []byte, *core.Error) {
	key, e := s.ensureControllerKey(ctx, cfg, uid)
	if e != nil {
		return cfg, nil, reasonError(core.ErrUnavailable, "install_failed")
	}
	// Re-read so that this own write is not taken for someone else's.
	cur, v, e := s.loadVersioned(ctx)
	if e != nil || cur.Mode != "ssh" || cur.AdminKey != key {
		return cfg, nil, reasonError(core.ErrConflict, "config_changed")
	}
	return cur, v, nil
}

// startGateway loads the bundled Caddy image (§53.10), starts the gateway
// with caddy and, when pinCA (HTTPS to an IP), reads the root of its
// internal CA.
func (s *Service) startGateway(ctx context.Context, target Config, gateway, caddy string, pinCA bool) (string, *core.Error) {
	if err := s.loadBundledImages(ctx, target, []string{"gateway"}, map[string]bool{"gateway": true}); err != nil {
		return "", err
	}
	res, e := s.run(ctx, target, gateway, []byte(caddy), installScriptLimit)
	if e != nil {
		return "", reasonError(core.ErrUnavailable, runFailure(target))
	}
	if result := scriptResult(res.Output); res.ExitStatus != 0 || result != "started" {
		if result != "image_pull_failed" {
			result = "gateway_failed"
		}
		return "", reasonError(core.ErrUnavailable, result)
	}
	if !pinCA {
		return "", nil
	}
	res, e = s.run(ctx, target, gatewayCAScript, nil, 2*time.Minute)
	if e != nil {
		return "", reasonError(core.ErrUnavailable, runFailure(target))
	}
	if res.ExitStatus != 0 || scriptResult(res.Output) != "ok" {
		return "", reasonError(core.ErrUnavailable, "ca_unavailable")
	}
	ca, _, e := parseControllerCA(res.Output)
	if e != nil {
		return "", reasonError(core.ErrUnavailable, "ca_unavailable")
	}
	return ca, nil
}

// gatewayPort runs portScript on target: the wanted port when it is free
// (or the current gateway's), else the first free automatic port; acme also
// requires port 80 or 443 for the certificate challenge.
func (s *Service) gatewayPort(ctx context.Context, target Config, scheme string, want int, acme bool) (int, *core.Error) {
	start := httpsPortStart
	if scheme == "http" {
		start = httpPortStart
	}
	flag := "0"
	if acme {
		flag = "1"
	}
	res, e := s.run(ctx, target, portScript, []byte(strconv.Itoa(want)+" "+strconv.Itoa(start)+" "+flag+"\n"), 2*time.Minute)
	if e != nil {
		return 0, reasonError(core.ErrUnavailable, runFailure(target))
	}
	switch result := scriptResult(res.Output); result {
	case "ok":
		m := portLine.FindAllStringSubmatch(res.Output, -1)
		if res.ExitStatus != 0 || len(m) != 1 {
			break
		}
		port, _ := strconv.Atoi(m[0][1])
		if (want != 0 && port != want) || (want == 0 && (port < start || port >= start+portRange)) {
			break
		}
		return port, nil
	case "port_in_use", "no_free_port", "acme_ports_unavailable":
		return 0, reasonError(core.ErrConflict, result)
	case "docker_not_installed":
		return 0, reasonError(core.ErrInvalidArgument, result)
	case "docker_not_running":
		return 0, reasonError(core.ErrUnavailable, result)
	}
	return 0, reasonError(core.ErrUnavailable, "install_failed")
}

// dnsLookupLimit bounds each name resolution of the DNS check.
const dnsLookupLimit = 5 * time.Second

// interfaceAddrs lists this machine's addresses (replaced in tests).
var interfaceAddrs = net.InterfaceAddrs

func (s *Service) resolve(ctx context.Context, host string) ([]net.IP, error) {
	if ip := net.ParseIP(host); ip != nil {
		return []net.IP{ip}, nil
	}
	ctx, cancel := context.WithTimeout(ctx, dnsLookupLimit)
	defer cancel()
	lookup := net.DefaultResolver.LookupIPAddr
	if s.lookupIP != nil {
		lookup = s.lookupIP
	}
	addrs, err := lookup(ctx, host)
	ips := make([]net.IP, 0, len(addrs))
	for _, a := range addrs {
		ips = append(ips, a.IP)
	}
	return ips, err
}

// dnsMismatch reports whether none of domain's A/AAAA records is the Docker
// host the gateway is installed on (the SSH host, or this machine's own
// addresses for a local install). It never rejects the install (CDN / NAT):
// it only becomes a warning. A Docker host whose address cannot be told
// gives no warning; a domain that does not resolve does.
func (s *Service) dnsMismatch(ctx context.Context, domain string, target Config) bool {
	var hostIPs []net.IP
	if target.Mode == localInstallMode {
		addrs, err := interfaceAddrs()
		if err != nil {
			return false
		}
		for _, a := range addrs {
			if n, ok := a.(*net.IPNet); ok {
				hostIPs = append(hostIPs, n.IP)
			}
		}
	} else {
		ips, err := s.resolve(ctx, target.Host)
		if err != nil {
			return false
		}
		hostIPs = ips
	}
	if len(hostIPs) == 0 {
		return false
	}
	domainIPs, err := s.resolve(ctx, domain)
	if err != nil || len(domainIPs) == 0 {
		return true
	}
	for _, d := range domainIPs {
		for _, h := range hostIPs {
			if d.Equal(h) {
				return false
			}
		}
	}
	return true
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

// updateConfigAt is updateConfig that fails with errConfigChanged when the
// stored value is no longer version (as loadVersioned read it).
func (s *Service) updateConfigAt(ctx context.Context, uid int64, fields []string, version []byte, change func(*Config) error) (Config, error) {
	var updatedBy *int64
	if uid > 0 {
		updatedBy = &uid
	}
	var saved Config
	e := s.DB.Tx(ctx, func(tx pgx.Tx) error {
		_, e := store.UpdateSettingJSONTx(ctx, tx, settingKey, updatedBy, func(raw json.RawMessage) (json.RawMessage, error) {
			if version != nil && !bytes.Equal(raw, version) {
				return nil, errConfigChanged
			}
			cur, e := s.decode(raw)
			if e != nil {
				return nil, e
			}
			if e = change(&cur); e != nil {
				return nil, e
			}
			saved = cur
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
		return audit.Audit(ctx, tx, uid, "ccgateway.config.update", "system", "ccgateway", map[string]any{"fields": fields})
	})
	if e == nil {
		s.configChanged(ctx)
	}
	return saved, e
}
