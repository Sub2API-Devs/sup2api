package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net"
	"regexp"
	"strings"
	"sync"
	"unicode"
)

const ccgatewayRemoteSetting = "ccgateway_remote_config"
const ccgatewayRemotePurpose = "ccgateway-remote-config:v1:"
const ccgatewayRemoteEnvelope = "encrypted:v1:"

// CCGatewayRemoteConfig is internal connection configuration. Get returns
// decrypted credentials for the transport; HTTP callers must use Public().
type CCGatewayRemoteConfig struct {
	Mode               string `json:"mode"`
	Host               string `json:"host"`
	Port               int    `json:"port"`
	User               string `json:"user"`
	AuthMode           string `json:"auth_mode"`
	Password           string `json:"password,omitempty"`
	PrivateKey         string `json:"private_key,omitempty"`
	Passphrase         string `json:"passphrase,omitempty"`
	HostKeyFingerprint string `json:"host_key_fingerprint"`
	HasPassword        bool   `json:"has_password,omitempty"`
	HasPrivateKey      bool   `json:"has_private_key,omitempty"`
	HasPassphrase      bool   `json:"has_passphrase,omitempty"`
}

type CCGatewayRemoteConfigView struct {
	Mode               string `json:"mode"`
	Host               string `json:"host"`
	Port               int    `json:"port"`
	User               string `json:"user"`
	AuthMode           string `json:"auth_mode"`
	HostKeyFingerprint string `json:"host_key_fingerprint"`
	HasPassword        bool   `json:"has_password"`
	HasPrivateKey      bool   `json:"has_private_key"`
	HasPassphrase      bool   `json:"has_passphrase"`
}

func (c CCGatewayRemoteConfig) Public() CCGatewayRemoteConfigView {
	return CCGatewayRemoteConfigView{c.Mode, c.Host, c.Port, c.User, c.AuthMode, c.HostKeyFingerprint,
		c.Password != "" || c.HasPassword, c.PrivateKey != "" || c.HasPrivateKey, c.Passphrase != "" || c.HasPassphrase}
}

func (c CCGatewayRemoteConfig) redacted() CCGatewayRemoteConfig {
	c.HasPassword, c.HasPrivateKey, c.HasPassphrase = c.Password != "", c.PrivateKey != "", c.Passphrase != ""
	c.Password, c.PrivateKey, c.Passphrase = "", "", ""
	return c
}

type CCGatewayRemoteConfigStore struct {
	repo      SettingRepository
	encryptor SecretEncryptor
	mu        sync.Mutex
}

func NewCCGatewayRemoteConfig(repo SettingRepository, encryptor SecretEncryptor) *CCGatewayRemoteConfigStore {
	return &CCGatewayRemoteConfigStore{repo: repo, encryptor: encryptor}
}

func (s *CCGatewayRemoteConfigStore) Get(ctx context.Context) (CCGatewayRemoteConfig, error) {
	if s == nil || s.repo == nil {
		return CCGatewayRemoteConfig{}, errors.New("CCGateway configuration storage unavailable")
	}
	raw, err := s.repo.GetValue(ctx, ccgatewayRemoteSetting)
	if errors.Is(err, ErrSettingNotFound) || (err == nil && raw == "") {
		return CCGatewayRemoteConfig{Mode: "local"}, nil
	}
	if err != nil {
		return CCGatewayRemoteConfig{}, errors.New("cannot read CCGateway configuration")
	}
	if s.encryptor == nil || !strings.HasPrefix(raw, ccgatewayRemoteEnvelope) {
		return CCGatewayRemoteConfig{}, errors.New("invalid encrypted CCGateway configuration")
	}
	plain, err := s.encryptor.Decrypt(strings.TrimPrefix(raw, ccgatewayRemoteEnvelope))
	if err != nil || !strings.HasPrefix(plain, ccgatewayRemotePurpose) {
		return CCGatewayRemoteConfig{}, errors.New("cannot decrypt CCGateway configuration")
	}
	var c CCGatewayRemoteConfig
	if json.Unmarshal([]byte(strings.TrimPrefix(plain, ccgatewayRemotePurpose)), &c) != nil {
		return CCGatewayRemoteConfig{}, errors.New("invalid CCGateway configuration")
	}
	if err := normalizeCCGatewayRemote(&c); err != nil {
		return CCGatewayRemoteConfig{}, errors.New("invalid stored CCGateway configuration")
	}
	if err := requireCCGatewayCredential(c); err != nil {
		return CCGatewayRemoteConfig{}, errors.New("stored CCGateway credentials are incomplete")
	}
	return c, nil
}

func (s *CCGatewayRemoteConfigStore) Save(ctx context.Context, c CCGatewayRemoteConfig) (CCGatewayRemoteConfig, error) {
	if s == nil || s.repo == nil || s.encryptor == nil {
		return CCGatewayRemoteConfig{}, errors.New("CCGateway encrypted configuration storage unavailable")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := normalizeCCGatewayRemote(&c); err != nil {
		return CCGatewayRemoteConfig{}, err
	}
	old, err := s.Get(ctx)
	if err != nil {
		return CCGatewayRemoteConfig{}, err
	}
	if c.Mode == "ssh" && old.Mode == "ssh" && c.Host == old.Host && c.Port == old.Port && c.User == old.User && c.AuthMode == old.AuthMode && c.HostKeyFingerprint == old.HostKeyFingerprint {
		if c.AuthMode == "password" && c.Password == "" {
			c.Password = old.Password
		}
		if c.AuthMode == "private_key" && c.PrivateKey == "" {
			c.PrivateKey = old.PrivateKey
			if c.Passphrase == "" {
				c.Passphrase = old.Passphrase
			}
		}
	}
	if err := requireCCGatewayCredential(c); err != nil {
		return CCGatewayRemoteConfig{}, err
	}
	c.HasPassword, c.HasPrivateKey, c.HasPassphrase = false, false, false
	data, err := json.Marshal(c)
	if err != nil {
		return CCGatewayRemoteConfig{}, errors.New("cannot encode CCGateway configuration")
	}
	cipher, err := s.encryptor.Encrypt(ccgatewayRemotePurpose + string(data))
	if err != nil || cipher == "" {
		return CCGatewayRemoteConfig{}, errors.New("cannot encrypt CCGateway configuration")
	}
	if err = s.repo.Set(ctx, ccgatewayRemoteSetting, ccgatewayRemoteEnvelope+cipher); err != nil {
		return CCGatewayRemoteConfig{}, errors.New("cannot save CCGateway configuration")
	}
	return c.redacted(), nil
}

var ccgatewayHostLabel = regexp.MustCompile(`^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$`)

func normalizeCCGatewayRemote(c *CCGatewayRemoteConfig) error {
	c.Mode = strings.ToLower(strings.TrimSpace(c.Mode))
	if c.Mode == "" {
		c.Mode = "local"
	}
	if c.Mode == "local" {
		*c = CCGatewayRemoteConfig{Mode: "local"}
		return nil
	}
	if c.Mode != "ssh" {
		return errors.New("mode must be local or ssh")
	}
	c.Host = strings.ToLower(strings.TrimSpace(c.Host))
	c.User = strings.TrimSpace(c.User)
	c.AuthMode = strings.ToLower(strings.TrimSpace(c.AuthMode))
	c.HostKeyFingerprint = strings.TrimSpace(c.HostKeyFingerprint)
	if c.Port == 0 {
		c.Port = 22
	}
	if c.Port < 1 || c.Port > 65535 {
		return errors.New("SSH port must be between 1 and 65535")
	}
	if len(c.Host) == 0 || len(c.Host) > 253 {
		return errors.New("invalid SSH host")
	}
	if net.ParseIP(c.Host) == nil {
		for _, label := range strings.Split(c.Host, ".") {
			if len(label) > 63 || !ccgatewayHostLabel.MatchString(label) {
				return errors.New("SSH host must be an IP address or hostname without a URL or port")
			}
		}
	}
	if c.User == "" || len(c.User) > 128 || strings.HasPrefix(c.User, "-") {
		return errors.New("invalid SSH user")
	}
	for _, r := range c.User {
		if unicode.IsSpace(r) || unicode.IsControl(r) {
			return errors.New("invalid SSH user")
		}
	}
	fingerprint, err := base64.RawStdEncoding.DecodeString(strings.TrimRight(strings.TrimPrefix(c.HostKeyFingerprint, "SHA256:"), "="))
	if !strings.HasPrefix(c.HostKeyFingerprint, "SHA256:") || err != nil || len(fingerprint) != 32 {
		return errors.New("SSH host key fingerprint must be SHA256:<base64 digest>")
	}
	c.HostKeyFingerprint = "SHA256:" + base64.RawStdEncoding.EncodeToString(fingerprint)
	if len(c.Password) > 8192 || len(c.PrivateKey) > 128<<10 || len(c.Passphrase) > 8192 {
		return errors.New("SSH credential exceeds size limit")
	}
	switch c.AuthMode {
	case "password":
		c.PrivateKey, c.Passphrase = "", ""
	case "private_key":
		c.Password = ""
	default:
		return errors.New("SSH auth_mode must be password or private_key")
	}
	return nil
}

func requireCCGatewayCredential(c CCGatewayRemoteConfig) error {
	if c.Mode == "ssh" && c.AuthMode == "password" && c.Password == "" {
		return errors.New("SSH password is required for this connection target")
	}
	if c.Mode == "ssh" && c.AuthMode == "private_key" && strings.TrimSpace(c.PrivateKey) == "" {
		return errors.New("SSH private key is required for this connection target")
	}
	return nil
}
