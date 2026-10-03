package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"unicode"
)

const proxyDomain = "ccgateway/proxy-config/v1"

type proxyConfig struct {
	Mode     string `json:"mode"`
	URL      string `json:"url,omitempty"`
	Revision uint64 `json:"revision"`
}

type ProxyConfigStore struct {
	mu     sync.RWMutex
	path   string
	aead   cipher.AEAD
	config proxyConfig
}

func NewProxyConfigStore(dir, adminKey string) (*ProxyConfigStore, error) {
	if adminKey == "" {
		return nil, nil
	}
	mac := hmac.New(sha256.New, []byte(adminKey))
	_, _ = mac.Write([]byte(proxyDomain))
	block, _ := aes.NewCipher(mac.Sum(nil))
	aead, _ := cipher.NewGCM(block)
	s := &ProxyConfigStore{path: filepath.Join(dir, "proxy.enc"), aead: aead, config: proxyConfig{Mode: "inherit"}}
	f, err := os.Open(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return nil, errors.New("cannot read encrypted proxy configuration")
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, 16385))
	if err != nil || len(data) > 16384 || len(data) < aead.NonceSize() {
		return nil, errors.New("invalid encrypted proxy configuration")
	}
	plain, err := aead.Open(nil, data[:aead.NonceSize()], data[aead.NonceSize():], []byte(proxyDomain))
	if err != nil {
		return nil, errors.New("cannot decrypt proxy configuration; management key may have changed")
	}
	if json.Unmarshal(plain, &s.config) != nil {
		return nil, errors.New("invalid encrypted proxy configuration")
	}
	if err := validateProxy(s.config.Mode, s.config.URL); err != nil {
		return nil, errors.New("invalid encrypted proxy configuration")
	}
	return s, nil
}

func validateProxy(mode, raw string) error {
	switch mode {
	case "inherit", "direct":
		if raw != "" {
			return errors.New("URL is only allowed in proxy mode")
		}
		return nil
	case "proxy":
	default:
		return errors.New("proxy mode must be inherit, direct, or proxy")
	}
	if len(raw) > 4096 || raw == "" || strings.Contains(raw, "#") || strings.IndexFunc(raw, func(r rune) bool { return unicode.IsSpace(r) || unicode.IsControl(r) }) >= 0 {
		return errors.New("invalid HTTP(S) proxy URL")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return errors.New("invalid HTTP(S) proxy URL")
	}
	if strings.HasPrefix(strings.ToLower(u.Scheme), "socks") {
		return errors.New("SOCKS proxies are not supported by Claude Code; use HTTP or HTTPS")
	}
	if (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.Opaque != "" || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		return errors.New("invalid HTTP(S) proxy URL")
	}
	host := u.Hostname()
	if host == "" {
		return errors.New("invalid HTTP(S) proxy host")
	}
	if net.ParseIP(host) == nil {
		for _, label := range strings.Split(host, ".") {
			if label == "" || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
				return errors.New("invalid HTTP(S) proxy host")
			}
			for _, c := range label {
				if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-') {
					return errors.New("invalid HTTP(S) proxy host")
				}
			}
		}
	}
	if strings.HasSuffix(u.Host, ":") {
		return errors.New("invalid HTTP(S) proxy port")
	}
	if p := u.Port(); p != "" {
		n, e := strconv.Atoi(p)
		if e != nil || n < 1 || n > 65535 {
			return errors.New("invalid HTTP(S) proxy port")
		}
	}
	if u.User != nil {
		pass, _ := u.User.Password()
		if u.User.Username() == "" || strings.IndexFunc(u.User.Username()+pass, func(r rune) bool { return r < 32 || r == 127 }) >= 0 {
			return errors.New("invalid proxy credentials")
		}
	}
	return nil
}

func (s *ProxyConfigStore) viewLocked() Object {
	redacted := ""
	if s.config.URL != "" {
		u, _ := url.Parse(s.config.URL)
		u.User = nil
		redacted = u.String()
	}
	return Object{"mode": s.config.Mode, "configured": s.config.Mode == "proxy" && s.config.URL != "", "url_redacted": redacted, "revision": s.config.Revision}
}

func (s *ProxyConfigStore) View() Object { s.mu.RLock(); defer s.mu.RUnlock(); return s.viewLocked() }

func (s *ProxyConfigStore) Update(mode, raw string) (Object, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if mode == "proxy" && raw == "" && s.config.Mode == "proxy" {
		raw = s.config.URL
	}
	if err := validateProxy(mode, raw); err != nil {
		return nil, err
	}
	next := proxyConfig{Mode: mode, URL: raw, Revision: s.config.Revision + 1}
	plain, _ := json.Marshal(next)
	nonce := make([]byte, s.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, errors.New("cannot encrypt proxy configuration")
	}
	data := s.aead.Seal(nonce, nonce, plain, []byte(proxyDomain))
	f, err := os.CreateTemp(filepath.Dir(s.path), ".proxy-*")
	if err != nil {
		return nil, errors.New("cannot save proxy configuration")
	}
	temp := f.Name()
	defer os.Remove(temp)
	if err = f.Chmod(0600); err == nil {
		_, err = f.Write(data)
	}
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err == nil {
		err = closeErr
	}
	if err == nil {
		err = os.Rename(temp, s.path)
	}
	if err != nil {
		return nil, errors.New("cannot save proxy configuration")
	}
	s.config = next
	return s.viewLocked(), nil
}

// Environment snapshots configuration once per new process. NO_PROXY remains
// inherited in proxy mode; direct mode removes all proxy and bypass variables.
func (s *ProxyConfigStore) Environment(base []string) []string {
	if os.Getenv("CCG_EXTERNAL_EGRESS") == "1" {
		out := make([]string, 0, len(base))
		for _, item := range base {
			key, _, _ := strings.Cut(item, "=")
			switch strings.ToUpper(key) {
			case "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY", "CCG_EXTERNAL_EGRESS", "CCG_API_KEY", "CCG_ADMIN_KEY":
				continue
			}
			out = append(out, item)
		}
		return out
	}
	if s == nil {
		return append([]string(nil), base...)
	}
	s.mu.RLock()
	cfg := s.config
	s.mu.RUnlock()
	if cfg.Mode == "inherit" {
		return append([]string(nil), base...)
	}
	result := make([]string, 0, len(base)+4)
	for _, item := range base {
		k, _, _ := strings.Cut(item, "=")
		switch strings.ToUpper(k) {
		case "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY":
			continue
		case "NO_PROXY":
			if cfg.Mode == "direct" {
				continue
			}
		}
		result = append(result, item)
	}
	if cfg.Mode == "proxy" {
		for _, key := range []string{"HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"} {
			result = append(result, key+"="+cfg.URL)
		}
	}
	return result
}

func (s *ProxyConfigStore) serve(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("CCG_EXTERNAL_EGRESS") == "1" {
		apiError(w, 409, "invalid_request_error", "Proxy is managed by the account egress controller")
		return
	}
	if s == nil {
		apiError(w, 503, "api_error", "Dynamic proxy configuration is disabled")
		return
	}
	var result Object
	if r.Method == http.MethodGet {
		result = s.View()
	} else if r.Method == http.MethodPut {
		var body struct {
			Mode string `json:"mode"`
			URL  string `json:"url"`
		}
		d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192))
		d.DisallowUnknownFields()
		if d.Decode(&body) != nil || d.Decode(new(any)) != io.EOF {
			apiError(w, 400, "invalid_request_error", "Invalid proxy configuration")
			return
		}
		var err error
		result, err = s.Update(body.Mode, body.URL)
		if err != nil {
			apiError(w, 400, "invalid_request_error", err.Error())
			return
		}
	} else {
		apiError(w, 405, "invalid_request_error", "Method not allowed")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}
