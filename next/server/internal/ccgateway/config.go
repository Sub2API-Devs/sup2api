package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
)

const settingKey = "ccgateway_remote"

// SensitiveEnv are the legacy local-mode keys. They are read once at program
// start, before main removes them from the process environment
// (procguard.ScrubEnv), so plugins and later child processes never see them.
var SensitiveEnv = []string{"CCG_ADMIN_KEY", "CCG_API_KEY"}

var localAdminKey, localAPIKey = os.Getenv("CCG_ADMIN_KEY"), os.Getenv("CCG_API_KEY")

var configAAD = []byte("system:ccgateway:v1")

type Config struct {
	AccountRuntimes bool `json:"account_runtimes"`
	// Mode: "controller" or "disabled"; "local" / "ssh" are legacy values
	// that still decode and run but are never saved again (§53.9).
	Mode string `json:"mode"`
	Host string `json:"host"`
	Port int    `json:"port"`
	// Scheme of the controller endpoint (controller mode): "https" (also
	// "") or "http" (§53.9).
	Scheme string `json:"scheme,omitempty"`
	// BasePath is the path prefix of the controller behind a reverse proxy
	// that strips it ("" or /seg[/seg...], no trailing slash).
	BasePath           string `json:"base_path,omitempty"`
	User               string `json:"user"`
	AuthMode           string `json:"auth_mode"`
	Password           string `json:"password,omitempty"`
	PrivateKey         string `json:"private_key,omitempty"`
	Passphrase         string `json:"passphrase,omitempty"`
	HostKeyFingerprint string `json:"host_key_fingerprint"`
	AdminKey           string `json:"admin_key,omitempty"`
	APIKey             string `json:"api_key,omitempty"`
	// ControllerCA (controller mode) holds the only root certificates the
	// control panel's HTTPS certificate may chain to; empty: system roots
	// (CONTRACTS §53.2).
	ControllerCA string `json:"controller_ca,omitempty"`
	// Images overrides the pinned runtime images (images.go) per role, e.g.
	// with tags built on the Docker host itself; empty fields use the
	// pinned references (CONTRACTS §49.16).
	Images        *RuntimeImages  `json:"images,omitempty"`
	Network       *RuntimeNetwork `json:"network,omitempty"`
	RequestPolicy *RequestPolicy  `json:"request_policy,omitempty"`

	// bundled holds the image references of the active plugin package
	// (§53.10), set when the configuration is loaded; never saved.
	bundled *RuntimeImages
}

// RuntimeImages are image references of the per-account runtime.
type RuntimeImages struct {
	App        string `json:"app"`
	Egress     string `json:"egress"`
	Controller string `json:"controller"`
	// Gateway is the Caddy image of the control panel (§53.3).
	Gateway string `json:"gateway"`
}

var (
	imageRefPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?$`)
	imageIDPattern  = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)
)

// validImage reports whether ref may be put into the install script: a
// repository[:tag][@digest] or a local image id.
func validImage(ref string) bool {
	return imageRefPattern.MatchString(ref) || imageIDPattern.MatchString(ref)
}

// EffectiveImages are the images installed, per role: the configured
// override, else the reference bundled in the active plugin package
// (§53.10), else the pinned references.
func (c Config) EffectiveImages() RuntimeImages {
	out := RuntimeImages{App: AppImage, Egress: EgressImage, Controller: ControllerImage, Gateway: GatewayImage}
	for _, img := range []*RuntimeImages{c.bundled, c.Images} {
		if img == nil {
			continue
		}
		if img.App != "" {
			out.App = img.App
		}
		if img.Egress != "" {
			out.Egress = img.Egress
		}
		if img.Controller != "" {
			out.Controller = img.Controller
		}
		if img.Gateway != "" {
			out.Gateway = img.Gateway
		}
	}
	return out
}

func (c Config) publicImages() RuntimeImages {
	if c.Images == nil {
		return RuntimeImages{}
	}
	return *c.Images
}

func (c Config) SSH() remotedocker.Config {
	return remotedocker.Config{Host: c.Host, Port: c.Port, User: c.User, AuthMode: c.AuthMode, Password: c.Password, PrivateKey: c.PrivateKey, Passphrase: c.Passphrase, HostKeyFingerprint: c.HostKeyFingerprint}
}

// panelScheme is the controller endpoint's scheme: "http" or "https".
func (c Config) panelScheme() string {
	if c.Scheme == "http" {
		return "http"
	}
	return "https"
}

func (c Config) Public() map[string]any {
	_, caFingerprint, _ := parseControllerCA(c.ControllerCA)
	return map[string]any{
		"account_runtimes":          c.AccountRuntimes,
		"mode":                      c.Mode,
		"scheme":                    c.panelScheme(),
		"base_path":                 c.BasePath,
		"host":                      c.Host,
		"port":                      c.Port,
		"user":                      c.User,
		"auth_mode":                 c.AuthMode,
		"host_key_fingerprint":      c.HostKeyFingerprint,
		"has_password":              c.Password != "",
		"has_private_key":           c.PrivateKey != "",
		"has_passphrase":            c.Passphrase != "",
		"has_admin_key":             c.AdminKey != "",
		"has_api_key":               c.APIKey != "",
		"has_controller_ca":         c.ControllerCA != "",
		"controller_ca_fingerprint": caFingerprint,
		"images":                    c.publicImages(),
		"effective_images":          c.EffectiveImages(),
		"network":                   c.EffectiveNetwork(),
		"request_policy":            c.EffectiveRequestPolicy(),
	}
}

type Service struct {
	DB     *store.DB
	Cipher *secret.Cipher
	// Authorizer answers the proxy visibility questions of the draft
	// endpoints (CONTRACTS §21.4); nil: callers without account:create see
	// no proxy.
	Authorizer core.Authorizer
	// Locker lets one node at a time sweep abandoned drafts (§49.13); nil:
	// this node only (single-node tests).
	Locker core.Locker
	// CanWork admits the draft sweep (managed cores sweep only once
	// admitted); nil always allows.
	CanWork func() bool
	// kick feeds Kick; nil (zero Service in tests) disables it.
	kick chan string
	// installMu serializes runtime installs without a Locker.
	installMu sync.Mutex
	// runScript / runLocalScript / openController replace
	// remotedocker.RunScript, remotedocker.RunLocalScript and the tunnel to
	// the controller in tests (nil: the real ones).
	runScript      scriptRunner
	runLocalScript localScriptRunner
	openController func(context.Context, Config) (*http.Client, string, func() error, error)
	openAccount    func(context.Context, Config, string) (*http.Client, func() error, error)
	// lookupIP replaces net.DefaultResolver.LookupIPAddr in tests.
	lookupIP func(context.Context, string) ([]net.IPAddr, error)
	// Bundle locates the active ccgateway plugin package of this node, whose
	// images/ carry the runtime images (CONTRACTS §53.10); nil: none.
	Bundle  func() (BundlePackage, bool)
	bundles bundleCache
}

func New(db *store.DB, cipher *secret.Cipher) *Service {
	return &Service{DB: db, Cipher: cipher, kick: make(chan string, 64)}
}
func (s *Service) decode(raw []byte) (Config, error) {
	c, err := s.decodeStored(raw)
	c.bundled = s.bundledImages()
	return c, err
}

// bundledImages are the references bundled in the active plugin package,
// nil without one.
func (s *Service) bundledImages() *RuntimeImages {
	b := s.bundle()
	if b == nil {
		return nil
	}
	refs := b.refs()
	return &refs
}

func (s *Service) decodeStored(raw []byte) (Config, error) {
	c := Config{Mode: "disabled", Port: 22}
	var envelope struct {
		Cipher []byte `json:"cipher"`
	}
	if len(raw) == 0 {
		return c, nil
	}
	if json.Unmarshal(raw, &envelope) != nil {
		return c, errors.New("invalid configuration")
	}
	if len(envelope.Cipher) == 0 {
		return c, nil
	}
	if s.Cipher == nil {
		return c, errors.New("encryption unavailable")
	}
	plain, e := s.Cipher.Decrypt(envelope.Cipher, configAAD)
	if e != nil {
		return c, errors.New("cannot decrypt configuration")
	}
	e = json.Unmarshal(plain, &c)
	return c, e
}
func (s *Service) Load(ctx context.Context) (Config, error) {
	c, _, e := s.loadVersioned(ctx)
	return c, e
}

// loadVersioned is Load plus the stored value as read: every write changes
// it (fresh ciphertext), so comparing it later under the row lock tells
// whether anyone saved meanwhile (§53.9 config_changed).
func (s *Service) loadVersioned(ctx context.Context) (Config, []byte, error) {
	if s == nil || s.DB == nil || s.DB.Pool == nil {
		return Config{}, nil, errors.New("configuration storage unavailable")
	}
	var raw []byte
	e := s.DB.Pool.QueryRow(ctx, "SELECT value FROM settings WHERE key=$1", settingKey).Scan(&raw)
	if store.IsNoRows(e) {
		// The row a later update creates holds {}.
		raw, e = []byte("{}"), nil
	}
	if e != nil {
		return Config{}, nil, e
	}
	c, e := s.decode(raw)
	if c.Mode == "local" {
		if c.AdminKey == "" {
			c.AdminKey = localAdminKey
		}
		if c.APIKey == "" {
			c.APIKey = localAPIKey
		}
	}
	return c, raw, e
}

// mergeConfig applies a PUT remote-config body to the saved configuration
// (§53.2 / §53.9). Per-account runtimes are the only mode: account_runtimes
// is always saved as true, and the mode is "controller" (connected) or
// "disabled" (not configured). A saved legacy "local" / "ssh" configuration
// keeps working and its other settings can still be saved while mode and
// target stay the same, but nothing can switch to a legacy mode; installing
// a controller migrates it.
func mergeConfig(c, old Config) (Config, error) {
	c.AccountRuntimes = true
	if c.Mode == "ssh" && c.Port == 0 {
		c.Port = 22
	}
	legacy := (c.Mode == "ssh" || c.Mode == "local") && c.Mode == old.Mode &&
		(c.Mode == "local" || (c.Host == old.Host && c.Port == old.Port && c.User == old.User && c.AuthMode == old.AuthMode && c.HostKeyFingerprint == old.HostKeyFingerprint))
	if c.Mode != "disabled" && c.Mode != "controller" && !legacy {
		// Switching to a legacy mode (or to another legacy target).
		return c, errors.New("invalid mode")
	}
	// Network, request policy and images are independent of the target and
	// kept when disconnected too (the install uses the saved images).
	if c.Network == nil {
		c.Network = old.Network
	}
	network, err := validateNetwork(c.EffectiveNetwork())
	if err != nil {
		return c, err
	}
	c.Network = &network
	if c.RequestPolicy == nil {
		c.RequestPolicy = old.RequestPolicy
	}
	policy := c.EffectiveRequestPolicy()
	if err := validateRequestPolicy(policy); err != nil {
		return c, err
	}
	c.RequestPolicy = &policy
	// Images: omitted keeps the saved ones, {} (empty fields) returns to the
	// pinned references.
	if c.Images == nil {
		c.Images = old.Images
	}
	if c.Images != nil {
		for _, ref := range []string{c.Images.App, c.Images.Egress, c.Images.Controller, c.Images.Gateway} {
			if ref != "" && !validImage(ref) {
				return c, errors.New("invalid runtime image reference")
			}
		}
		if *c.Images == (RuntimeImages{}) {
			c.Images = nil
		}
	}
	if c.Mode == "disabled" {
		// Not configured: no target, no keys.
		return Config{Mode: "disabled", AccountRuntimes: true, Network: c.Network, RequestPolicy: c.RequestPolicy, Images: c.Images}, nil
	}
	if legacy {
		return mergeLegacy(c, old)
	}
	// The controller is reached over HTTP(S) only: no SSH credentials.
	c.clearSSH()
	c.Host = normalizeControllerHost(c.Host)
	switch c.Scheme {
	case "", "https":
		c.Scheme = "https"
	case "http":
	default:
		return c, errors.New("invalid control panel scheme")
	}
	if c.Port == 0 {
		c.Port = 443
		if c.Scheme == "http" {
			c.Port = 80
		}
	}
	basePath, ok := normalizeBasePath(c.BasePath)
	if !ok {
		return c, errors.New("invalid control panel base path")
	}
	c.BasePath = basePath
	// The key is kept only for the same saved endpoint (scheme, address,
	// port, base path) and trust: the panel is public and the key reaches
	// the accounts, so pointing the core elsewhere (or leaving a legacy
	// mode) needs it typed again; the install endpoint sets it itself.
	same := old.Mode == "controller" && c.Host == old.Host && c.Port == old.Port && c.Scheme == old.panelScheme() && c.BasePath == old.BasePath
	typedKey := c.AdminKey != ""
	if same {
		if c.AdminKey == "" {
			c.AdminKey = old.AdminKey
		}
		if c.APIKey == "" {
			c.APIKey = old.APIKey
		}
		if c.ControllerCA == "" {
			c.ControllerCA = old.ControllerCA
		}
	}
	if c.Scheme == "http" {
		c.ControllerCA = "" // no TLS, nothing to pin
	}
	if len(c.AdminKey) > 8192 || len(c.APIKey) > 8192 || strings.ContainsAny(c.AdminKey+c.APIKey, "\r\n") {
		return c, errors.New("invalid sidecar keys")
	}
	if c.AdminKey != "" && c.AdminKey == c.APIKey {
		return c, errors.New("API and management keys must differ")
	}
	if c.ControllerCA != "" {
		normalized, _, e := parseControllerCA(c.ControllerCA)
		if e != nil {
			return c, e
		}
		c.ControllerCA = normalized
	}
	if !typedKey && c.ControllerCA != old.ControllerCA {
		c.AdminKey = "" // new trust anchor: the key must be typed again
	}
	if e := validateControllerConfig(c); e != nil {
		return c, e
	}
	return c, nil
}

// mergeLegacy saves the other settings of a configuration still on a legacy
// "ssh" / "local" target (same mode and target as saved, §53.9): typed
// credentials and keys replace the saved ones, omitted ones are kept.
func mergeLegacy(c, old Config) (Config, error) {
	c.Scheme, c.BasePath, c.ControllerCA = "", "", ""
	if c.Password == "" {
		c.Password = old.Password
	}
	if c.PrivateKey == "" {
		c.PrivateKey = old.PrivateKey
		if c.Passphrase == "" {
			c.Passphrase = old.Passphrase
		}
	}
	if c.AdminKey == "" {
		c.AdminKey = old.AdminKey
	}
	if c.APIKey == "" {
		c.APIKey = old.APIKey
	}
	if len(c.AdminKey) > 8192 || len(c.APIKey) > 8192 || strings.ContainsAny(c.AdminKey+c.APIKey, "\r\n") {
		return c, errors.New("invalid sidecar keys")
	}
	if c.AdminKey != "" && c.AdminKey == c.APIKey {
		return c, errors.New("API and management keys must differ")
	}
	if c.Mode == "local" {
		c.Host, c.Port = "", old.Port
		c.clearSSH()
		return c, nil
	}
	if e := remotedocker.Validate(c.SSH()); e != nil {
		return c, e
	}
	if c.AuthMode == "password" {
		c.PrivateKey, c.Passphrase = "", ""
	} else {
		c.Password = ""
	}
	return c, nil
}

func (c *Config) clearSSH() {
	c.User = ""
	c.AuthMode = ""
	c.Password = ""
	c.PrivateKey = ""
	c.Passphrase = ""
	c.HostKeyFingerprint = ""
}
func (s *Service) save(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	var in Config
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 192<<10)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	ctx := audit.Context(c)
	uid, _ := core.UserID(ctx)
	var updatedBy *int64
	if uid > 0 {
		updatedBy = &uid
	}
	var saved Config
	e := s.DB.Tx(ctx, func(tx pgx.Tx) error {
		_, e := store.UpdateSettingJSONTx(ctx, tx, settingKey, updatedBy, func(raw json.RawMessage) (json.RawMessage, error) {
			old, e := s.decode(raw)
			if e != nil {
				return nil, e
			}
			saved, e = mergeConfig(in, old)
			if e != nil {
				return nil, e
			}
			saved.bundled = old.bundled
			plain, _ := json.Marshal(saved)
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
		return audit.Audit(ctx, tx, uid, "ccgateway.config.update", "system", "ccgateway", nil)
	})
	if e != nil {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("The configuration could not be saved: check the request policy, beta mappings, private IPv4 CIDR, IP allocation mode, the connection mode (controller or disabled), or the control panel scheme, address, management key and root certificate."))
		return
	}
	if saved.AccountRuntimes {
		if keys, err := s.runtimeKeys(ctx); err == nil {
			for _, key := range keys {
				s.Kick(key)
			}
		}
	}
	httpapi.OK(c, saved.Public())
}
