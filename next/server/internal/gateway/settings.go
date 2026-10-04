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

	// maxHookTimeout caps any hook call, including a manifest timeoutMs
	// (CONTRACTS §20.1). The admin default for hooks without timeoutMs has
	// its own, lower ceiling (maxDefaultHookTimeoutMs).
	maxHookTimeout      = 30 * time.Second
	defaultMaxBodyBytes = 32 << 20
)

// GatewaySettings is the "gateway" row of the settings table (CONTRACTS §8).
type GatewaySettings struct {
	MaxAttempts           int `json:"max_attempts"`
	PlatformCallTimeoutMs int `json:"platform_call_timeout_ms"`
	DefaultHookTimeoutMs  int `json:"default_hook_timeout_ms"`
	// PlatformHotpathTimeoutMs bounds the PlatformService calls that are part
	// of serving one gateway request rather than of a hook:
	// ResolveModel (before scheduling) and ExtractUsage (after forwarding).
	//
	// It used to be default_hook_timeout_ms, which was wrong in both
	// directions: an administrator widening the hook default for one slow
	// hook also widened a hot-path RPC that has nothing to do with it, and
	// tightening the hook default tightened that RPC too. The two have no
	// reason to move together.
	PlatformHotpathTimeoutMs int `json:"platform_hotpath_timeout_ms"`
}

// StickySettings is the "sticky" row of the settings table.
type StickySettings struct {
	Enabled               bool `json:"enabled"`
	DefaultTTLSeconds     int  `json:"default_ttl_seconds"`
	KeepOnAccountDisabled bool `json:"keep_on_account_disabled"`
}

func defaultGatewaySettings() GatewaySettings {
	return GatewaySettings{MaxAttempts: 3, PlatformCallTimeoutMs: 2000, DefaultHookTimeoutMs: 300,
		PlatformHotpathTimeoutMs: 300}
}

// Accepted ranges of the gateway settings (CONTRACTS §14.4).
const (
	minMaxAttempts           = 1
	maxMaxAttempts           = 10
	minPlatformCallTimeoutMs = 100
	maxPlatformCallTimeoutMs = 30000
	minDefaultHookTimeoutMs  = 50
	maxDefaultHookTimeoutMs  = 2000
	// The hot-path RPCs share the hook default's range: one of them delays
	// every request to its endpoint, the other holds a usage record open, and
	// neither is a place to wait seconds.
	minPlatformHotpathTimeoutMs = 50
	maxPlatformHotpathTimeoutMs = 2000
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
	s.PlatformHotpathTimeoutMs = clamp(s.PlatformHotpathTimeoutMs, d.PlatformHotpathTimeoutMs,
		minPlatformHotpathTimeoutMs, maxPlatformHotpathTimeoutMs)
	return s
}

func (s GatewaySettings) platformTimeout() time.Duration {
	return time.Duration(s.PlatformCallTimeoutMs) * time.Millisecond
}

// hotpathTimeout bounds one PlatformService.ResolveModel or
// PlatformService.ExtractUsage call: the two RPCs that belong to serving one
// gateway request but are not hooks. A zero or unnormalised setting falls back
// to the default instead of "no deadline".
func (s GatewaySettings) hotpathTimeout() time.Duration {
	ms := s.PlatformHotpathTimeoutMs
	if ms <= 0 {
		ms = defaultGatewaySettings().PlatformHotpathTimeoutMs
	}
	return time.Duration(ms) * time.Millisecond
}

type settingsSnapshot struct {
	at          time.Time
	gateway     GatewaySettings
	sticky      StickySettings
	autoDisable AutoDisableSettings
}

// settingsCache reads the gateway, sticky and auto-disable rows with a short
// TTL; the config:changed broadcast invalidates it immediately.
type settingsCache struct {
	db    *store.DB
	mu    sync.Mutex
	snap  *settingsSnapshot
	epoch uint64
	// override replaces the DB in tests.
	override *settingsSnapshot
}

func newSettingsCache(db *store.DB) *settingsCache { return &settingsCache{db: db} }

func (c *settingsCache) invalidate() {
	c.mu.Lock()
	c.epoch++
	c.snap = nil
	c.mu.Unlock()
}

func (c *settingsCache) get(ctx context.Context) settingsSnapshot {
	c.mu.Lock()
	if c.override != nil {
		o := *c.override
		c.mu.Unlock()
		o.gateway = o.gateway.normalized()
		return o
	}
	snap := c.snap
	epoch := c.epoch
	c.mu.Unlock()
	if snap != nil && time.Since(snap.at) < settingsTTL {
		return *snap
	}
	s := c.load(ctx)
	c.mu.Lock()
	if c.epoch == epoch && s.at != (time.Time{}) {
		c.snap = &s
	}
	c.mu.Unlock()
	return s
}

// load reads the three rows. On read errors it keeps the defaults of the rows
// not read and leaves at zero so the result is not cached.
func (c *settingsCache) load(ctx context.Context) settingsSnapshot {
	s := settingsSnapshot{gateway: defaultGatewaySettings(), sticky: defaultStickySettings(),
		autoDisable: defaultAutoDisableSettings()}
	if c.db == nil {
		s.at = time.Now()
		return s
	}
	gw, err := loadGatewaySettings(ctx, c.db.Pool)
	if err != nil {
		return s
	}
	s.gateway = gw.normalized()
	st, err := loadStickySettings(ctx, c.db.Pool)
	if err != nil {
		return s
	}
	s.sticky = st
	ad, err := loadAutoDisableSettings(ctx, c.db.Pool)
	if err != nil {
		return s
	}
	s.autoDisable, s.at = ad, time.Now()
	return s
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
