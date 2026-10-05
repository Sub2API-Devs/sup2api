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
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
)

const settingKey = "ccgateway_remote"

var configAAD = []byte("system:ccgateway:v1")

type Config struct {
	AccountRuntimes    bool   `json:"account_runtimes"`
	Mode               string `json:"mode"`
	Host               string `json:"host"`
	Port               int    `json:"port"`
	User               string `json:"user"`
	AuthMode           string `json:"auth_mode"`
	Password           string `json:"password,omitempty"`
	PrivateKey         string `json:"private_key,omitempty"`
	Passphrase         string `json:"passphrase,omitempty"`
	HostKeyFingerprint string `json:"host_key_fingerprint"`
	AdminKey           string `json:"admin_key,omitempty"`
	APIKey             string `json:"api_key,omitempty"`
	// Images overrides the pinned runtime images (images.go) per role, e.g.
	// with tags built on the Docker host itself; empty fields use the
	// pinned references (CONTRACTS §49.16).
	Images        *RuntimeImages  `json:"images,omitempty"`
	Network       *RuntimeNetwork `json:"network,omitempty"`
	RequestPolicy *RequestPolicy  `json:"request_policy,omitempty"`
}

// RuntimeImages are image references of the per-account runtime.
type RuntimeImages struct {
	App        string `json:"app"`
	Egress     string `json:"egress"`
	Controller string `json:"controller"`
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

// EffectiveImages are the images installed: the configured ones, else the
// pinned references.
func (c Config) EffectiveImages() RuntimeImages {
	out := RuntimeImages{App: AppImage, Egress: EgressImage, Controller: ControllerImage}
	if c.Images != nil {
		if c.Images.App != "" {
			out.App = c.Images.App
		}
		if c.Images.Egress != "" {
			out.Egress = c.Images.Egress
		}
		if c.Images.Controller != "" {
			out.Controller = c.Images.Controller
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
func (c Config) Public() map[string]any {
	return map[string]any{"account_runtimes": c.AccountRuntimes, "mode": c.Mode, "host": c.Host, "port": c.Port, "user": c.User, "auth_mode": c.AuthMode, "host_key_fingerprint": c.HostKeyFingerprint, "has_password": c.Password != "", "has_private_key": c.PrivateKey != "", "has_passphrase": c.Passphrase != "", "has_admin_key": c.AdminKey != "", "has_api_key": c.APIKey != "", "images": c.publicImages(), "network": c.EffectiveNetwork(), "request_policy": c.EffectiveRequestPolicy()}
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
	// runScript / openController replace remotedocker.RunScript and the SSH
	// tunnel to the controller in tests (nil: the real ones).
	runScript      scriptRunner
	openController func(context.Context, Config) (*http.Client, string, func() error, error)
}

func New(db *store.DB, cipher *secret.Cipher) *Service {
	return &Service{DB: db, Cipher: cipher, kick: make(chan string, 64)}
}
func (s *Service) decode(raw []byte) (Config, error) {
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
	if s == nil || s.DB == nil || s.DB.Pool == nil {
		return Config{}, errors.New("configuration storage unavailable")
	}
	var raw []byte
	e := s.DB.Pool.QueryRow(ctx, "SELECT value FROM settings WHERE key=$1", settingKey).Scan(&raw)
	if store.IsNoRows(e) {
		e = nil
	}
	if e != nil {
		return Config{}, e
	}
	c, e := s.decode(raw)
	if c.Mode == "local" {
		if c.AdminKey == "" {
			c.AdminKey = os.Getenv("CCG_ADMIN_KEY")
		}
		if c.APIKey == "" {
			c.APIKey = os.Getenv("CCG_API_KEY")
		}
	}
	return c, e
}
func mergeConfig(c, old Config) (Config, error) {
	if c.Mode == "disabled" {
		return Config{Mode: "disabled", Port: 22}, nil
	}
	if c.Mode == "" {
		c.Mode = "local"
	}
	if c.Port == 0 {
		c.Port = 22
	}
	if c.Mode != "local" && c.Mode != "ssh" {
		return c, errors.New("invalid mode")
	}
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
	// Images are independent of the target: omitted keeps the saved ones,
	// {} (empty fields) returns to the pinned references.
	if c.Images == nil {
		c.Images = old.Images
	}
	if c.Images != nil {
		for _, ref := range []string{c.Images.App, c.Images.Egress, c.Images.Controller} {
			if ref != "" && !validImage(ref) {
				return c, errors.New("invalid runtime image reference")
			}
		}
		if *c.Images == (RuntimeImages{}) {
			c.Images = nil
		}
	}
	same := c.Mode == old.Mode && (c.Mode == "local" || (c.Host == old.Host && c.Port == old.Port && c.User == old.User && c.AuthMode == old.AuthMode && c.HostKeyFingerprint == old.HostKeyFingerprint))
	if same {
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
	}
	if len(c.AdminKey) > 8192 || len(c.APIKey) > 8192 || strings.ContainsAny(c.AdminKey+c.APIKey, "\r\n") {
		return c, errors.New("invalid sidecar keys")
	}
	if c.AdminKey != "" && c.AdminKey == c.APIKey {
		return c, errors.New("API and management keys must differ")
	}
	if c.Mode == "ssh" {
		if e := remotedocker.Validate(c.SSH()); e != nil {
			return c, e
		}
		if c.AuthMode == "password" {
			c.PrivateKey = ""
			c.Passphrase = ""
		} else {
			c.Password = ""
		}
	} else {
		c.Host = ""
		c.User = ""
		c.AuthMode = ""
		c.Password = ""
		c.PrivateKey = ""
		c.Passphrase = ""
		c.HostKeyFingerprint = ""
	}
	return c, nil
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
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("The configuration could not be saved: check the request policy, beta mappings, private IPv4 CIDR, IP allocation mode, SSH address, host key fingerprint and credentials."))
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
