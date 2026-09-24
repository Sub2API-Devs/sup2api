package gateway

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const (
	settingsKeyGateway = "gateway"
	settingsKeySticky  = "sticky"

	settingsTTL = 10 * time.Second

	maxHookTimeout      = 2 * time.Second
	defaultMaxBodyBytes = 32 << 20
)

// GatewaySettings is the "gateway" row of the settings table (CONTRACTS §8).
type GatewaySettings struct {
	MaxAttempts           int `json:"max_attempts"`
	PlatformCallTimeoutMs int `json:"platform_call_timeout_ms"`
	DefaultHookTimeoutMs  int `json:"default_hook_timeout_ms"`
}

// StickySettings is the "sticky" row of the settings table.
type StickySettings struct {
	Enabled               bool `json:"enabled"`
	DefaultTTLSeconds     int  `json:"default_ttl_seconds"`
	KeepOnAccountDisabled bool `json:"keep_on_account_disabled"`
}

func defaultGatewaySettings() GatewaySettings {
	return GatewaySettings{MaxAttempts: 3, PlatformCallTimeoutMs: 2000, DefaultHookTimeoutMs: 300}
}

// Accepted ranges of the gateway settings (CONTRACTS §14.4).
const (
	minMaxAttempts           = 1
	maxMaxAttempts           = 10
	minPlatformCallTimeoutMs = 100
	maxPlatformCallTimeoutMs = 30000
	minDefaultHookTimeoutMs  = 50
	maxDefaultHookTimeoutMs  = int(maxHookTimeout / time.Millisecond)
)

func defaultStickySettings() StickySettings {
	return StickySettings{Enabled: true, DefaultTTLSeconds: 3600}
}

// normalized fills unset (<= 0) fields with the defaults and clamps the
// others into the accepted ranges, so a stored row written before the
// validation existed still yields usable values.
func (s GatewaySettings) normalized() GatewaySettings {
	d := defaultGatewaySettings()
	clamp := func(v, def, lo, hi int) int {
		switch {
		case v <= 0:
			return def
		case v < lo:
			return lo
		case v > hi:
			return hi
		}
		return v
	}
	s.MaxAttempts = clamp(s.MaxAttempts, d.MaxAttempts, minMaxAttempts, maxMaxAttempts)
	s.PlatformCallTimeoutMs = clamp(s.PlatformCallTimeoutMs, d.PlatformCallTimeoutMs, minPlatformCallTimeoutMs, maxPlatformCallTimeoutMs)
	s.DefaultHookTimeoutMs = clamp(s.DefaultHookTimeoutMs, d.DefaultHookTimeoutMs, minDefaultHookTimeoutMs, maxDefaultHookTimeoutMs)
	return s
}

func (s GatewaySettings) platformTimeout() time.Duration {
	return time.Duration(s.PlatformCallTimeoutMs) * time.Millisecond
}

type settingsSnapshot struct {
	at      time.Time
	gateway GatewaySettings
	sticky  StickySettings
}

// settingsCache reads the gateway and sticky rows with a short TTL; the
// config:changed broadcast invalidates it immediately.
type settingsCache struct {
	db   *store.DB
	mu   sync.Mutex
	snap *settingsSnapshot
	// override replaces the DB in tests.
	override *settingsSnapshot
}

func newSettingsCache(db *store.DB) *settingsCache { return &settingsCache{db: db} }

func (c *settingsCache) invalidate() {
	c.mu.Lock()
	c.snap = nil
	c.mu.Unlock()
}

func (c *settingsCache) get(ctx context.Context) (GatewaySettings, StickySettings) {
	c.mu.Lock()
	if c.override != nil {
		o := *c.override
		c.mu.Unlock()
		return o.gateway.normalized(), o.sticky
	}
	snap := c.snap
	c.mu.Unlock()
	if snap != nil && time.Since(snap.at) < settingsTTL {
		return snap.gateway, snap.sticky
	}
	gw, st := defaultGatewaySettings(), defaultStickySettings()
	if c.db != nil {
		// On read errors keep the defaults (and do not cache them).
		var err error
		if gw, err = loadGatewaySettings(ctx, c.db.Pool); err != nil {
			return defaultGatewaySettings(), defaultStickySettings()
		}
		if st, err = loadStickySettings(ctx, c.db.Pool); err != nil {
			return gw.normalized(), defaultStickySettings()
		}
	}
	gw = gw.normalized()
	c.mu.Lock()
	c.snap = &settingsSnapshot{at: time.Now(), gateway: gw, sticky: st}
	c.mu.Unlock()
	return gw, st
}

func loadSettingsRow(ctx context.Context, q store.Querier, key string, into any) error {
	var raw []byte
	err := q.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, key).Scan(&raw)
	if store.IsNoRows(err) {
		return nil
	}
	if err != nil {
		return err
	}
	// Fields absent from the stored document keep the defaults in into.
	return json.Unmarshal(raw, into)
}

func loadGatewaySettings(ctx context.Context, q store.Querier) (GatewaySettings, error) {
	v := defaultGatewaySettings()
	err := loadSettingsRow(ctx, q, settingsKeyGateway, &v)
	return v, err
}

func loadStickySettings(ctx context.Context, q store.Querier) (StickySettings, error) {
	v := defaultStickySettings()
	err := loadSettingsRow(ctx, q, settingsKeySticky, &v)
	if v.DefaultTTLSeconds <= 0 {
		v.DefaultTTLSeconds = defaultStickySettings().DefaultTTLSeconds
	}
	return v, err
}
