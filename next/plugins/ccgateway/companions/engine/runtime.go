package engine

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Options configures one account's gateway without changing process-wide env.
type Options struct {
	InternalBaseURL                string
	CLI, Plugin, DataDir, CacheDir string
	Key, AdminKey, NativeTools     string
	Timeout                        time.Duration
	CacheLimit                     int64
	Env                            []string
}

// Runtime shares the original runner, history and management APIs between
// the gateway command and account workers.
type Runtime struct {
	http.Handler
	Version string
	gateway *Gateway
	admin   *authManager
	work    string
	stop    context.CancelFunc
	done    chan struct{}
	life    context.Context
	mu      sync.Mutex
	closed  bool
	active  sync.WaitGroup
	once    sync.Once
	err     error
}

func NewRuntime(o Options) (*Runtime, error) {
	if o.Key == "" {
		return nil, fmt.Errorf("CCG_API_KEY is required for an account worker")
	}
	if o.AdminKey != "" && o.AdminKey == o.Key {
		return nil, fmt.Errorf("CCG_ADMIN_KEY must differ from CCG_API_KEY")
	}
	if o.DataDir == "" {
		return nil, fmt.Errorf("worker data directory is required")
	}
	cli, err := resolveCLI(o.CLI)
	if err != nil {
		return nil, err
	}
	version, err := checkVersion(cli)
	if err != nil {
		return nil, err
	}
	root, err := filepath.Abs(o.DataDir)
	if err != nil {
		return nil, err
	}
	if err = os.MkdirAll(root, 0700); err != nil {
		return nil, err
	}
	work, err := os.MkdirTemp(root, "worker-")
	if err != nil {
		return nil, err
	}
	success := false
	defer func() {
		if !success {
			_ = os.RemoveAll(work)
		}
	}()
	plugin := o.Plugin
	if plugin == "" {
		plugin, err = extractMod(work)
		if err != nil {
			return nil, err
		}
	} else if _, err = os.Stat(filepath.Join(plugin, "hooks", "hooks.json")); err != nil {
		return nil, fmt.Errorf("invalid worker Mod directory: %w", err)
	}
	cacheDir := o.CacheDir
	if cacheDir == "" {
		cacheDir = filepath.Join(root, "cache")
	}
	limit := o.CacheLimit
	if limit <= 0 {
		limit = 128 << 20
	}
	cache, err := newCache(cacheDir, limit)
	if err != nil {
		return nil, err
	}
	timeout := o.Timeout
	if timeout <= 0 {
		timeout = time.Hour
	}
	native, err := nativeAllowlist(o.NativeTools)
	if err != nil {
		return nil, err
	}
	proxy, err := NewProxyConfigStore(root, o.AdminKey)
	if err != nil {
		return nil, err
	}
	logDir, err := configureRequestLogs(root)
	if err != nil {
		return nil, err
	}
	g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: work, Proxy: proxy, Env: o.Env, InternalBaseURL: o.InternalBaseURL}, Cache: cache, Key: o.Key, Timeout: timeout, Slots: make(chan struct{}, 4), NativeAllowed: native, RequestLogDir: logDir}
	g.RequestLogs = &requestLogStore{root: filepath.Join(root, "request-logs"), enabled: logDir != "", active: map[*requestDiagnostic]bool{}}
	admin := &authManager{cli: cli, key: o.AdminKey, proxy: proxy, version: version, requestLogs: g.RequestLogs, env: o.Env}
	mux := http.NewServeMux()
	mux.Handle("/", g)
	mux.Handle("/admin/", admin)
	ctx, stop := context.WithCancel(context.Background())
	r := &Runtime{Handler: mux, Version: version, gateway: g, admin: admin, work: work, stop: stop, life: ctx, done: make(chan struct{})}
	go func() {
		defer close(r.done)
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				cache.prune()
				if logDir != "" {
					pruneRequestLogs(logDir)
				}
			}
		}
	}()
	success = true
	return r, nil
}

func (r *Runtime) ServeHTTP(w http.ResponseWriter, request *http.Request) {
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		apiError(w, 503, "api_error", "Worker is shutting down")
		return
	}
	r.active.Add(1)
	r.mu.Unlock()
	defer r.active.Done()
	ctx, cancel := context.WithCancel(request.Context())
	stop := context.AfterFunc(r.life, cancel)
	defer stop()
	defer cancel()
	r.Handler.ServeHTTP(w, request.WithContext(ctx))
}

func (r *Runtime) Close() error {
	r.once.Do(func() {
		r.mu.Lock()
		r.closed = true
		r.mu.Unlock()
		r.stop()
		r.active.Wait()
		<-r.done
		r.admin.mu.Lock()
		r.admin.end()
		r.admin.mu.Unlock()
		r.err = os.RemoveAll(r.work)
	})
	return r.err
}
