// Package peer authenticates trusted cluster nodes with Redis-authoritative,
// reusable per-node keys. It does not replay business requests or consume keys.
package peer

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

const Protocol = 1
const NodeHeader = "X-Sub2api-Peer-Node"
const BootHeader = "X-Sub2api-Peer-Boot"
const KeyHeader = "X-Sub2api-Peer-Key"
const ErrorHeader = "X-Sub2api-Peer-Error"

var ErrUnauthorized = errors.New("node authentication failed")
var ErrForbidden = errors.New("node operation forbidden")
var ErrUnavailable = errors.New("node authentication unavailable")
var ErrConflict = errors.New("another node instance owns the registration")

type Identity struct{ Cluster, NodeID, BootID string }
type Config struct {
	Redis                                  redis.UniversalClient
	Cluster, NodeID, BootID, ConfiguredKey string
	TTL                                    time.Duration
	Validate                               func(context.Context, Identity) error
	Register                               func(context.Context) error
	WithRegistration                       func(context.Context, func(context.Context) error) error
}
type record struct {
	Cluster  string `json:"cluster_id"`
	Node     string `json:"node_id"`
	Boot     string `json:"shell_boot_id"`
	Protocol int    `json:"peer_protocol"`
	Key      string `json:"auth_key"`
	Enabled  bool   `json:"enabled"`
}
type Manager struct {
	config Config
	mu     sync.RWMutex
	key    string
}

func ValidID(s string) bool {
	if len(s) == 0 || len(s) > 128 {
		return false
	}
	for _, c := range s {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-' || c == '_' || c == '.') {
			return false
		}
	}
	return true
}
func ValidateKey(s string) error {
	if len(s) < 32 || len(s) > 512 {
		return errors.New("peer_auth_key must contain 32 to 512 printable ASCII bytes")
	}
	for i := range s {
		if s[i] < 33 || s[i] > 126 {
			return errors.New("peer_auth_key contains invalid characters")
		}
	}
	return nil
}
func New(c Config) (*Manager, error) {
	if c.Redis == nil || !ValidID(c.Cluster) || !ValidID(c.NodeID) || !ValidID(c.BootID) || c.Validate == nil || c.Register == nil || c.WithRegistration == nil {
		return nil, errors.New("incomplete peer authentication configuration")
	}
	if c.ConfiguredKey != "" {
		if err := ValidateKey(c.ConfiguredKey); err != nil {
			return nil, err
		}
	}
	if c.TTL == 0 {
		c.TTL = 30 * time.Second
	}
	if c.TTL < time.Second || c.TTL > time.Minute {
		return nil, errors.New("invalid peer registration TTL")
	}
	return &Manager{config: c, key: c.ConfiguredKey}, nil
}
func (m *Manager) Identity() Identity {
	return Identity{m.config.Cluster, m.config.NodeID, m.config.BootID}
}

// Run keeps registration alive during initial core preparation as well as long
// upgrades. Failures leave Redis authoritative; subsequent ticks retry recovery.
func (m *Manager) Run(ctx context.Context) {
	tick := time.NewTicker(m.config.TTL / 3)
	defer tick.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			attempt, cancel := context.WithTimeout(ctx, m.config.TTL/3)
			_ = m.Maintain(attempt)
			cancel()
		}
	}
}
func (m *Manager) redisKey(node string) string {
	return "s2a:peer:{" + m.config.Cluster + "}:node:" + node
}
func (m *Manager) local(key string) record {
	return record{m.config.Cluster, m.config.NodeID, m.config.BootID, Protocol, key, true}
}
func randomKey() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

const renewScript = `local v=redis.call('GET',KEYS[1]); if not v then return 0 end; if v~=ARGV[1] then return -1 end; redis.call('PEXPIRE',KEYS[1],ARGV[2]); return 1`
const unregisterScript = `local v=redis.call('GET',KEYS[1]); if not v then return 0 end; if v~=ARGV[1] then return -1 end; return redis.call('DEL',KEYS[1])`

// Maintain renews without changing keys. Missing records are recreated under the
// shared registration lock, after checking live Redis ownership and PG state.
func (m *Manager) Maintain(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.key != "" {
		if err := m.config.Validate(ctx, m.Identity()); err == nil {
			v, _ := json.Marshal(m.local(m.key))
			n, err := m.config.Redis.Eval(ctx, renewScript, []string{m.redisKey(m.config.NodeID)}, string(v), m.config.TTL.Milliseconds()).Int()
			if err != nil {
				return ErrUnavailable
			}
			if n == 1 {
				return nil
			}
			if n < 0 {
				return ErrConflict
			}
		}
	}
	return m.config.WithRegistration(ctx, func(ctx context.Context) error {
		value, err := m.config.Redis.Get(ctx, m.redisKey(m.config.NodeID)).Bytes()
		if err != nil && !errors.Is(err, redis.Nil) {
			return ErrUnavailable
		}
		if err == nil {
			var old record
			if json.Unmarshal(value, &old) != nil || old.Cluster != m.config.Cluster || old.Node != m.config.NodeID || old.Boot != m.config.BootID || old.Protocol != Protocol || !old.Enabled {
				return ErrConflict
			}
			if m.key == "" || subtle.ConstantTimeCompare([]byte(old.Key), []byte(m.key)) != 1 {
				return ErrConflict
			}
			if err = m.config.Validate(ctx, m.Identity()); err != nil {
				return err
			}
			n, err := m.config.Redis.Eval(ctx, renewScript, []string{m.redisKey(m.config.NodeID)}, string(value), m.config.TTL.Milliseconds()).Int()
			if err != nil {
				return ErrUnavailable
			}
			if n != 1 {
				return ErrConflict
			}
			return nil
		}
		if err = m.config.Register(ctx); err != nil {
			return err
		}
		if err = m.config.Validate(ctx, m.Identity()); err != nil {
			return err
		}
		if m.config.ConfiguredKey == "" {
			key, err := randomKey()
			if err != nil {
				return ErrUnavailable
			}
			m.key = key
		} else {
			m.key = m.config.ConfiguredKey
		}
		// Retain the candidate locally even if SET's response is lost: a later
		// Maintain can recognize the successfully written record and renew it.
		value, _ = json.Marshal(m.local(m.key))
		ok, err := m.config.Redis.SetNX(ctx, m.redisKey(m.config.NodeID), string(value), m.config.TTL).Result()
		if err != nil {
			return ErrUnavailable
		}
		if !ok {
			return ErrConflict
		}
		return nil
	})
}
func (m *Manager) read(ctx context.Context, node string) (record, error) {
	var r record
	b, err := m.config.Redis.Get(ctx, m.redisKey(node)).Bytes()
	if errors.Is(err, redis.Nil) {
		return r, ErrUnauthorized
	}
	if err != nil {
		return r, ErrUnavailable
	}
	if json.Unmarshal(b, &r) != nil || r.Cluster != m.config.Cluster || r.Node != node || r.Protocol != Protocol || !r.Enabled || !ValidID(r.Boot) || ValidateKey(r.Key) != nil {
		return r, ErrUnauthorized
	}
	return r, nil
}
func (m *Manager) credentials(ctx context.Context) (Identity, string, error) {
	m.mu.RLock()
	key := m.key
	m.mu.RUnlock()
	if key == "" {
		return Identity{}, "", ErrUnauthorized
	}
	r, err := m.read(ctx, m.config.NodeID)
	if err != nil {
		return Identity{}, "", err
	}
	if r.Boot != m.config.BootID || subtle.ConstantTimeCompare([]byte(r.Key), []byte(key)) != 1 {
		return Identity{}, "", ErrUnauthorized
	}
	id := m.Identity()
	if err = m.config.Validate(ctx, id); err != nil {
		return Identity{}, "", err
	}
	return id, key, nil
}
func (m *Manager) Check(ctx context.Context) error { _, _, err := m.credentials(ctx); return err }
func (m *Manager) Unregister(ctx context.Context) error {
	m.mu.RLock()
	key := m.key
	m.mu.RUnlock()
	v, _ := json.Marshal(m.local(key))
	_, err := m.config.Redis.Eval(ctx, unregisterScript, []string{m.redisKey(m.config.NodeID)}, string(v)).Result()
	if err != nil {
		return ErrUnavailable
	}
	return nil
}

// Revoke must be called under the shared registration lock after PG disable.
func (m *Manager) Revoke(ctx context.Context, node string) error {
	if !ValidID(node) {
		return ErrForbidden
	}
	if err := m.config.Redis.Del(ctx, m.redisKey(node)).Err(); err != nil {
		return ErrUnavailable
	}
	return nil
}

type identityContextKey struct{}

func FromContext(ctx context.Context) (Identity, bool) {
	v, ok := ctx.Value(identityContextKey{}).(Identity)
	return v, ok
}
func single(h http.Header, name string, max int) (string, bool) {
	v := h.Values(name)
	if len(v) != 1 || v[0] == "" || len(v[0]) > max {
		return "", false
	}
	return v[0], true
}
func Strip(h http.Header) { h.Del(NodeHeader); h.Del(BootHeader); h.Del(KeyHeader) }
func Failure(w http.ResponseWriter, status int) {
	w.Header().Set(ErrorHeader, "1")
	if status == 503 {
		w.Header().Set("Retry-After", "1")
	}
	http.Error(w, "node request unavailable", status)
}
func ErrorStatus(err error) int {
	if errors.Is(err, ErrUnauthorized) {
		return 401
	}
	if errors.Is(err, ErrForbidden) || errors.Is(err, ErrConflict) {
		return 403
	}
	return 503
}
func (m *Manager) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, q *http.Request) {
		node, ok := single(q.Header, NodeHeader, 128)
		boot, bok := single(q.Header, BootHeader, 128)
		key, kok := single(q.Header, KeyHeader, 512)
		if !ok || !bok || !kok || !ValidID(node) || !ValidID(boot) || ValidateKey(key) != nil {
			Failure(w, 401)
			return
		}
		r, err := m.read(q.Context(), node)
		if err != nil {
			Failure(w, ErrorStatus(err))
			return
		}
		if r.Boot != boot || subtle.ConstantTimeCompare([]byte(r.Key), []byte(key)) != 1 {
			Failure(w, 401)
			return
		}
		id := Identity{m.config.Cluster, node, boot}
		if err = m.config.Validate(q.Context(), id); err != nil {
			Failure(w, ErrorStatus(err))
			return
		}
		if err = m.Check(q.Context()); err != nil {
			Failure(w, ErrorStatus(err))
			return
		}
		q = q.Clone(context.WithValue(q.Context(), identityContextKey{}, id))
		Strip(q.Header)
		next.ServeHTTP(w, q)
	})
}

type transport struct {
	manager *Manager
	base    http.RoundTripper
	target  func(context.Context, *url.URL) error
}

// WrapTransport is for registered HTTPS peers only. Use a separate, unwrapped
// client for publisher URLs. There is no retry or redirect logic in this layer.
func (m *Manager) WrapTransport(base http.RoundTripper, authorizeTarget func(context.Context, *url.URL) error) http.RoundTripper {
	if base == nil {
		base = http.DefaultTransport
	}
	return &transport{m, base, authorizeTarget}
}
func (t *transport) RoundTrip(q *http.Request) (*http.Response, error) {
	if q.URL.Scheme != "https" || q.URL.User != nil || t.target == nil {
		return nil, ErrForbidden
	}
	if err := t.target(q.Context(), q.URL); err != nil {
		return nil, err
	}
	id, key, err := t.manager.credentials(q.Context())
	if err != nil {
		return nil, err
	}
	out := q.Clone(q.Context())
	Strip(out.Header)
	out.Header.Set(NodeHeader, id.NodeID)
	out.Header.Set(BootHeader, id.BootID)
	out.Header.Set(KeyHeader, key)
	out.GetBody = nil
	return t.base.RoundTrip(out)
}
func NewClient(transport http.RoundTripper, timeout time.Duration) *http.Client {
	return &http.Client{Transport: transport, Timeout: timeout, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
}

// ScrubResponse removes reserved node metadata even from a malicious core.
func ScrubResponse(h http.Header) {
	for k := range h {
		if strings.HasPrefix(strings.ToLower(k), "x-sub2api-peer-") {
			h.Del(k)
		}
	}
}
