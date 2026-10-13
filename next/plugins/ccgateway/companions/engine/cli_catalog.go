package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

type nativeCatalogue map[string][]Tool

type cliToolProfile struct {
	Name           string            `json:"name"`
	PermissionMode string            `json:"permission_mode"`
	Env            map[string]string `json:"env"`
	Whitelist      []string          `json:"whitelist"`
}

type nativeProfile struct {
	config cliToolProfile
	tools  nativeCatalogue
}

func newCLIToolProfile(name, mode string) cliToolProfile {
	return cliToolProfile{Name: name, PermissionMode: mode, Env: map[string]string{
		"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "", "CLAUDE_CODE_USE_POWERSHELL_TOOL": "",
		"CLAUDE_CODE_SUBAGENT_MODEL_FORCE": "", "CLAUDE_CODE_SUBAGENT_MODEL": "",
	}}
}

func (p cliToolProfile) environment() map[string]string {
	env := map[string]string{}
	for key, value := range p.Env {
		if value != "" {
			env[key] = value
		}
	}
	return env
}

func (p cliToolProfile) cost() int {
	cost := 0
	if p.PermissionMode == "plan" {
		cost++
	}
	for _, value := range p.Env {
		if value != "0" && value != "" {
			cost++
		}
	}
	return cost
}

func (c nativeCatalogue) profiles() []nativeProfile {
	byID := map[string]*nativeProfile{}
	for name, variants := range c {
		for _, tool := range variants {
			profiles, _ := tool.Metadata["catalog_profiles"].([]cliToolProfile)
			for _, config := range profiles {
				if config.Name == "" {
					continue
				}
				id := digest(config)
				if byID[id] == nil {
					byID[id] = &nativeProfile{config: config, tools: nativeCatalogue{}}
				}
				byID[id].tools[name] = append(byID[id].tools[name], tool)
			}
		}
	}
	out := make([]nativeProfile, 0, len(byID))
	for _, profile := range byID {
		out = append(out, *profile)
	}
	sort.Slice(out, func(i, j int) bool {
		if a, b := out[i].config.cost(), out[j].config.cost(); a != b {
			return a < b
		}
		return out[i].config.Name < out[j].config.Name
	})
	return out
}

type cliSnapshot struct {
	version    string
	tools      nativeCatalogue
	validation cliValidationCache
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
	value, _, err := c.snapshotState()
	return value, err
}

func (c *cliCatalog) snapshotState() (*cliSnapshot, cliCatalogStatus, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	value := c.current.Load()
	if value == nil || c.state.State != "ready" || value.version != c.state.Version {
		return nil, c.state, fmt.Errorf("Claude Code tool catalog is not ready")
	}
	return value, c.state, nil
}

type cliToolDefinition struct {
	Description string `json:"description"`
	Schema      Object `json:"input_schema"`
}

type cliToolVariants struct {
	Name     string              `json:"name"`
	Variants []cliToolDefinition `json:"variants"`
}

type cliCatalogView struct {
	Catalog cliCatalogStatus  `json:"catalog"`
	Tools   []cliToolVariants `json:"tools"`
}

func (c *cliCatalog) definitions() (cliCatalogView, error) {
	snapshot, status, err := c.snapshotState()
	if err != nil {
		return cliCatalogView{}, err
	}
	out := cliCatalogView{Catalog: status, Tools: make([]cliToolVariants, 0, len(snapshot.tools))}
	for name, variants := range snapshot.tools {
		group := cliToolVariants{Name: name, Variants: make([]cliToolDefinition, 0, len(variants))}
		for _, tool := range variants {
			group.Variants = append(group.Variants, cliToolDefinition{Description: tool.Description, Schema: tool.Schema})
		}
		sort.Slice(group.Variants, func(i, j int) bool { return digest(group.Variants[i]) < digest(group.Variants[j]) })
		out.Tools = append(out.Tools, group)
	}
	sort.Slice(out.Tools, func(i, j int) bool { return out.Tools[i].Name < out.Tools[j].Name })
	return out, nil
}

func (r *Runtime) serveCLICatalog(w http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if !r.cliGate.TryRLock() {
		apiError(w, 503, "api_error", "Claude Code maintenance is in progress")
		return
	}
	view, err := r.catalog.definitions()
	r.cliGate.RUnlock()
	if err != nil {
		apiError(w, 503, "api_error", err.Error())
		return
	}
	raw, err := json.Marshal(view)
	if err != nil || len(raw) > 8<<20 {
		apiError(w, 503, "api_error", "Claude Code tool catalog exceeds response limits")
		return
	}
	_, _ = w.Write(raw)
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
