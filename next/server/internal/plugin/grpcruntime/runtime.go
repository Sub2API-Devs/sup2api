// Package grpcruntime runs plugins as go-plugin gRPC processes. It is the only
// package that imports go-plugin; the rest of the server sees plugins through
// the core capability interfaces.
package grpcruntime

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"runtime"
	"sort"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// SchemaDSN hands out restricted plugin DSNs (implemented by dbschema.Manager).
type SchemaDSN interface {
	DSN(ctx context.Context, pluginKey string) (string, dbschema.Status, error)
}

// Options configures the runtime. DB, Redis, Cipher, Node and Launcher are
// required; the other dependencies are optional (the matching HostService
// calls fail with UNAVAILABLE when they are nil).
type Options struct {
	DB       *store.DB
	Redis    redis.UniversalClient
	Cipher   *secret.Cipher
	Node     core.Node
	Launcher core.PluginLauncher

	Egress     core.EgressProvider
	Authorizer core.Authorizer
	Ledger     core.Ledger
	Schemas    SchemaDSN
	// Bus carries plugin cluster broadcasts (HostService.Publish).
	Bus core.Bus

	HostVersion   string
	DataDir       string // plugin work directories live under DataDir/<key>/work
	StrictNetwork bool
	Seccomp       bool
	MaxMemoryMB   int // global cap on per-plugin memory (0 = none)

	// MaxConcurrency bounds concurrent calls per plugin instance (default 64).
	MaxConcurrency int
	Logger         *slog.Logger

	// Timing knobs; zero values use the production defaults.
	HealthInterval time.Duration // 10s
	StartTimeout   time.Duration // 30s
	RestartWindow  time.Duration // 10m
	MaxRestarts    int           // 5 per window
	BackoffBase    time.Duration // 1s
	BackoffMax     time.Duration // 60s
	DrainTimeout   time.Duration // 30s
}

// Runtime starts plugin instances.
type Runtime struct {
	o   Options
	log *slog.Logger
}

func New(o Options) (*Runtime, error) {
	if o.DB == nil || o.Redis == nil || o.Cipher == nil || o.Node == nil || o.Launcher == nil {
		return nil, errors.New("grpcruntime: DB, Redis, Cipher, Node and Launcher are required")
	}
	if o.MaxConcurrency <= 0 {
		o.MaxConcurrency = 64
	}
	if o.Logger == nil {
		o.Logger = slog.Default()
	}
	def := func(d *time.Duration, v time.Duration) {
		if *d <= 0 {
			*d = v
		}
	}
	def(&o.HealthInterval, 10*time.Second)
	def(&o.StartTimeout, 30*time.Second)
	def(&o.RestartWindow, 10*time.Minute)
	def(&o.BackoffBase, time.Second)
	def(&o.BackoffMax, 60*time.Second)
	def(&o.DrainTimeout, 30*time.Second)
	if o.MaxRestarts <= 0 {
		o.MaxRestarts = 5
	}
	return &Runtime{o: o, log: o.Logger.With("component", "plugin-runtime")}, nil
}

// Load extracts the binary of pkg, starts the plugin process, performs the
// handshake (GetInfo, InitHost, Configure, Health) and starts supervision.
// The returned instance serves calls until Drain or Stop.
func (r *Runtime) Load(ctx context.Context, pkg *registry.Package) (*Instance, error) {
	binPath, sum, err := pkg.ExtractBinary(runtime.GOOS, runtime.GOARCH)
	if err != nil {
		return nil, fmt.Errorf("plugin %s@%s: %w", pkg.Key, pkg.Version, err)
	}
	st, err := r.loadSettings(ctx, pkg.Key)
	if err != nil {
		return nil, fmt.Errorf("plugin %s@%s: load settings: %w", pkg.Key, pkg.Version, err)
	}
	inst := newInstance(r, pkg, binPath, sum, st)
	if err := inst.startFirst(ctx); err != nil {
		inst.Stop()
		return nil, err
	}
	go inst.supervise()
	return inst, nil
}

// settings is the host-side configuration of one plugin, re-read on refresh.
type settings struct {
	configJSON  string
	grants      registry.Grants
	egress      string
	limits      resourceLimits
	fingerprint string
}

type resourceLimits struct {
	MemoryMB     int     `json:"memory_mb"`
	CPU          float64 `json:"cpu"`
	MaxThreads   int     `json:"max_threads"`
	MaxOpenFiles int     `json:"max_open_files"`
}

// ConfigAAD is the AES-GCM associated data of plugins.config_enc.
func ConfigAAD(pluginKey string) []byte { return []byte("plugin-config:" + pluginKey) }

func (r *Runtime) loadSettings(ctx context.Context, key string) (*settings, error) {
	var (
		enc    []byte
		egress string
		limits []byte
	)
	err := r.o.DB.Pool.QueryRow(ctx,
		`SELECT config_enc, egress_policy, resource_limits FROM plugins WHERE key = $1`, key).
		Scan(&enc, &egress, &limits)
	if err != nil {
		return nil, err
	}
	st := &settings{configJSON: "{}", egress: egress, grants: registry.Grants{}}
	if len(enc) > 0 {
		plain, err := r.o.Cipher.Decrypt(enc, ConfigAAD(key))
		if err != nil {
			return nil, fmt.Errorf("decrypt plugin config: %w", err)
		}
		if len(plain) > 0 {
			st.configJSON = string(plain)
		}
	}
	if len(limits) > 0 {
		_ = json.Unmarshal(limits, &st.limits)
	}
	rows, err := r.o.DB.Pool.Query(ctx,
		`SELECT permission, scope FROM plugin_permission_grants WHERE plugin_key = $1 AND status = 'granted'`, key)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var perm string
		var scope []byte
		if err := rows.Scan(&perm, &scope); err != nil {
			return nil, err
		}
		if len(scope) == 0 {
			scope = []byte("{}")
		}
		st.grants[perm] = json.RawMessage(scope)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	h := sha256.New()
	fmt.Fprintf(h, "%s\x00%s\x00%s\x00", st.configJSON, st.egress, limits)
	perms := make([]string, 0, len(st.grants))
	for p := range st.grants {
		perms = append(perms, p)
	}
	sort.Strings(perms)
	for _, p := range perms {
		fmt.Fprintf(h, "%s=%s\x00", p, st.grants[p])
	}
	st.fingerprint = hex.EncodeToString(h.Sum(nil))
	return st, nil
}
