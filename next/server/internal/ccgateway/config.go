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
	"github.com/redis/go-redis/v9"
	"net/http"
	"os"
	"strings"
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
}

func (c Config) SSH() remotedocker.Config {
	return remotedocker.Config{Host: c.Host, Port: c.Port, User: c.User, AuthMode: c.AuthMode, Password: c.Password, PrivateKey: c.PrivateKey, Passphrase: c.Passphrase, HostKeyFingerprint: c.HostKeyFingerprint}
}
func (c Config) Public() map[string]any {
	return map[string]any{"account_runtimes": c.AccountRuntimes, "mode": c.Mode, "host": c.Host, "port": c.Port, "user": c.User, "auth_mode": c.AuthMode, "host_key_fingerprint": c.HostKeyFingerprint, "has_password": c.Password != "", "has_private_key": c.PrivateKey != "", "has_passphrase": c.Passphrase != "", "has_admin_key": c.AdminKey != "", "has_api_key": c.APIKey != ""}
}

type Service struct {
	DB     *store.DB
	Cipher *secret.Cipher
	// Redis keeps the pending OAuth session of each account runtime
	// (session.go); nil disables resuming a session.
	Redis redis.UniversalClient
	// kick feeds Kick; nil (zero Service in tests) disables it.
	kick chan int64
}

func New(db *store.DB, cipher *secret.Cipher) *Service {
	return &Service{DB: db, Cipher: cipher, kick: make(chan int64, 64)}
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
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("无法保存配置，请检查 SSH 地址、主机指纹及凭据；切换目标后请重新输入凭据"))
		return
	}
	httpapi.OK(c, saved.Public())
}
