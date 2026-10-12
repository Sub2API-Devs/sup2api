package engine

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"
)

type nativeCatalogue map[string][]Tool

type cliSnapshot struct {
	version string
	tools   nativeCatalogue
}

type cliSnapshotKey struct{}

type cliCatalogStatus struct {
	Version        string    `json:"installed_version"`
	CatalogVersion string    `json:"catalog_version"`
	State          string    `json:"state"`
	ToolCount      int       `json:"tool_count"`
	VariantCount   int       `json:"variant_count"`
	CheckedAt      time.Time `json:"checked_at"`
	SyncedAt       time.Time `json:"synced_at"`
	Error          string    `json:"error,omitempty"`
}

type cliCatalog struct {
	lock    chan struct{}
	mu      sync.RWMutex
	state   cliCatalogStatus
	current atomic.Pointer[cliSnapshot]
	check   func(context.Context) (string, error)
	capture func(context.Context, string) (nativeCatalogue, error)
}

func newCLICatalog(check func(context.Context) (string, error), capture func(context.Context, string) (nativeCatalogue, error)) *cliCatalog {
	return &cliCatalog{lock: make(chan struct{}, 1), state: cliCatalogStatus{State: "starting"}, check: check, capture: capture}
}

func (c *cliCatalog) status() cliCatalogStatus {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.state
}

func (c *cliCatalog) snapshot() (*cliSnapshot, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	value := c.current.Load()
	if value == nil || c.state.State != "ready" || value.version != c.state.Version {
		return nil, fmt.Errorf("Claude Code tool catalog is not ready")
	}
	return value, nil
}

func (c *cliCatalog) sync(ctx context.Context) error {
	select {
	case c.lock <- struct{}{}:
		defer func() { <-c.lock }()
	case <-ctx.Done():
		return ctx.Err()
	}
	return c.refresh(ctx)
}

func (c *cliCatalog) refresh(ctx context.Context) (err error) {
	defer func() {
		if err != nil {
			c.mu.Lock()
			c.state.State, c.state.Error = "failed", err.Error()
			c.mu.Unlock()
		}
	}()
	version, err := c.check(ctx)
	c.mu.Lock()
	c.state.CheckedAt = time.Now().UTC()
	c.mu.Unlock()
	if err != nil {
		return err
	}
	c.mu.Lock()
	c.state.Version = version
	old := c.current.Load()
	if old != nil && old.version == version {
		c.state.State, c.state.Error = "ready", ""
		c.mu.Unlock()
		return nil
	}
	c.state.State, c.state.Error = "syncing", ""
	c.mu.Unlock()
	tools, err := c.capture(ctx, version)
	if err != nil {
		return err
	}
	if len(tools) == 0 {
		return fmt.Errorf("Claude Code returned an empty tool catalog")
	}
	after, err := c.check(ctx)
	if err != nil {
		return err
	}
	if after != version {
		c.mu.Lock()
		c.state.Version = after
		c.mu.Unlock()
		return fmt.Errorf("Claude Code changed during tool synchronization")
	}
	count := 0
	for _, variants := range tools {
		count += len(variants)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.current.Store(&cliSnapshot{version: version, tools: tools})
	c.state.CatalogVersion, c.state.State, c.state.Error = version, "ready", ""
	c.state.ToolCount, c.state.VariantCount, c.state.SyncedAt = len(tools), count, time.Now().UTC()
	return nil
}

func (r *Runner) forContext(ctx context.Context) *Runner {
	value, _ := ctx.Value(cliSnapshotKey{}).(*cliSnapshot)
	if value == nil {
		return r
	}
	copy := *r
	copy.Version = value.version
	return &copy
}

func (g *Gateway) runner(ctx context.Context) *Runner { return g.Runner.forContext(ctx) }

func (r *Request) nativeCatalogue(version string) nativeCatalogue {
	if r.cliSnapshot != nil {
		return r.cliSnapshot.tools
	}
	return verifiedNativeToolCatalogues[version]
}
