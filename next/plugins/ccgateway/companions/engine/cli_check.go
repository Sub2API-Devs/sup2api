package engine

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

// cliCheck is the state of the pinned CLI a Worker runs: the version read at
// startup, whose request capabilities the Worker holds, and the outcome of
// the last recheck (the /admin/cli sync action).
type cliCheck struct {
	mu      sync.Mutex
	version string
	check   func(context.Context) (string, error)
	state   cliCheckStatus
}

// cliCheckStatus keeps the field names of the retired native tool catalog
// status, which the core (cliCatalogState) and the console read; the counts
// stay zero.
type cliCheckStatus struct {
	Version        string    `json:"installed_version"`
	CatalogVersion string    `json:"catalog_version"`
	State          string    `json:"state"`
	ToolCount      int       `json:"tool_count"`
	VariantCount   int       `json:"variant_count"`
	CheckedAt      time.Time `json:"checked_at"`
	SyncedAt       time.Time `json:"synced_at"`
	Error          string    `json:"error,omitempty"`
}

func newCLICheck(version string, check func(context.Context) (string, error)) *cliCheck {
	now := time.Now().UTC()
	return &cliCheck{version: version, check: check, state: cliCheckStatus{Version: version, CatalogVersion: version, State: "ready", CheckedAt: now, SyncedAt: now}}
}

func (c *cliCheck) status() cliCheckStatus {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.state
}

// ready fails once a recheck found another CLI than the one read at startup,
// or none.
func (c *cliCheck) ready() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.state.State != "ready" {
		return errors.New(c.state.Error)
	}
	return nil
}

// recheck reads the CLI's version again.
func (c *cliCheck) recheck(ctx context.Context) error {
	version, err := c.check(ctx)
	now := time.Now().UTC()
	c.mu.Lock()
	defer c.mu.Unlock()
	c.state.CheckedAt = now
	if err == nil && version != c.version {
		err = fmt.Errorf("Claude Code changed from %s to %s; reconcile the runtime", c.version, version)
		c.state.Version = version
	}
	if err != nil {
		c.state.State, c.state.Error = "failed", err.Error()
		return err
	}
	c.state.Version, c.state.State, c.state.Error, c.state.SyncedAt = version, "ready", "", now
	return nil
}
