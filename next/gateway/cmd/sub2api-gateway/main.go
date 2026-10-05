// sub2api-gateway owns the public listener and one replaceable core process.
package main

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/control"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/cpuload"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/peer"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/proxy"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/release"
	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/supervisor"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type config struct {
	Root             string            `json:"root"`
	ClusterID        string            `json:"cluster_id"`
	NodeID           string            `json:"node_id"`
	PrimaryNode      string            `json:"primary_node"`
	BaselineDigest   string            `json:"baseline_digest"`
	DatabaseURL      string            `json:"database_url"`
	RedisURL         string            `json:"redis_url"`
	PublicAddr       string            `json:"public_addr"`
	PeerAddr         string            `json:"peer_addr"`
	PeerURL          string            `json:"peer_url"`
	CertFile         string            `json:"cert_file"`
	KeyFile          string            `json:"key_file"`
	CAFile           string            `json:"ca_file"`
	PeerAuthKey      string            `json:"peer_auth_key"`
	TrustedProxies   []string          `json:"trusted_proxies"`
	TrustedKeys      map[string]string `json:"trusted_keys"`
	ReleaseOrigin    string            `json:"release_origin"`
	CoreURL          string            `json:"core_url"`
	CoreArgs         []string          `json:"core_args"`
	CoreEnv          []string          `json:"core_env"`
	RuntimeABI       string            `json:"runtime_abi"`
	ManagementSocket string            `json:"management_socket"`
	CoreSocket       string            `json:"core_socket"`
	// PluginMaxBytes bounds stored plugin packages (default 256 MiB).
	PluginMaxBytes int64 `json:"plugin_max_bytes"`
}

func main() {
	if err := run(); err != nil {
		slog.Error("gateway stopped", "error", err)
		os.Exit(1)
	}
}
func run() error {
	if len(os.Args) < 2 {
		return errors.New("usage: sub2api-gateway init|import|serve|status|pause|resume|cancel|rollback|enable-node|disable-node|set-primary|remove-node")
	}
	command := os.Args[1]
	fs := flag.NewFlagSet(command, flag.ContinueOnError)
	cfgPath := fs.String("config", "/etc/sub2api/shell.json", "gateway configuration")
	manifestURL := fs.String("manifest", "", "signed manifest URL at the configured release origin")
	socket := fs.String("socket", "", "local management socket")
	id := fs.String("id", "", "upgrade ID")
	node := fs.String("node", "", "node ID for set-primary or remove-node")
	bootstrap := fs.Bool("bootstrap", false, "explicitly initialize the first core database on the primary")
	if err := fs.Parse(os.Args[2:]); err != nil {
		return err
	}
	if command == "status" || command == "pause" || command == "resume" || command == "cancel" || command == "rollback" || command == "enable-node" || command == "disable-node" {
		if *socket == "" {
			c, err := readConfig(*cfgPath)
			if err != nil {
				return err
			}
			*socket = c.ManagementSocket
		}
		return localCommand(command, *socket, *id)
	}
	if command == "set-primary" || command == "remove-node" {
		if *node == "" {
			return fmt.Errorf("%s requires -node", command)
		}
		c, err := readConfig(*cfgPath)
		if err != nil {
			return err
		}
		return clusterCommand(command, c, *node)
	}
	c, err := readConfig(*cfgPath)
	if err != nil {
		return err
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	dbcfg, err := pgxpool.ParseConfig(c.DatabaseURL)
	if err != nil {
		return err
	}
	// Allow environment override for tuning; default to 4-8 per gateway.
	if maxConns := os.Getenv("SUB2API_GATEWAY_POOL_MAX_CONNS"); maxConns != "" {
		var n int32
		if _, err := fmt.Sscanf(maxConns, "%d", &n); err == nil && n > 0 {
			dbcfg.MaxConns = n
		}
	}
	if dbcfg.MaxConns == 0 {
		dbcfg.MaxConns = 8
	}
	db, err := pgxpool.NewWithConfig(ctx, dbcfg)
	if err != nil {
		return err
	}
	defer db.Close()
	slog.Info("gateway database pool", "max_conns", dbcfg.MaxConns)
	store := &control.Store{DB: db, Cluster: c.ClusterID}
	keys := map[string]ed25519.PublicKey{}
	for id, b64 := range c.TrustedKeys {
		b, err := base64.StdEncoding.DecodeString(b64)
		if err != nil || len(b) != ed25519.PublicKeySize {
			return fmt.Errorf("invalid trusted public key %q", id)
		}
		keys[id] = ed25519.PublicKey(b)
	}
	releases := &release.Manager{Root: c.Root, TrustedKeys: keys, OS: runtime.GOOS, Arch: runtime.GOARCH, RuntimeABI: c.RuntimeABI}
	store.Updates = control.NewUpdateService(releases)
	// The publisher is usually served with a public certificate, but may use
	// the cluster CA; signatures, not the transport, authorize its content.
	// init/import and serve share this client. It never carries node keys.
	if releases.Client, err = publisherClient(c.CAFile); err != nil {
		return err
	}
	// A newer gateway adds its columns before serving; the schema is additive and
	// idempotent, so older gateways still running are unaffected.
	if command == "init" || command == "serve" {
		if err = store.EnsureSchema(ctx); err != nil {
			return err
		}
	}
	if command == "init" || command == "import" {
		if *manifestURL != "" {
			r, err := importRelease(ctx, c, releases, *manifestURL)
			if err != nil {
				return err
			}
			if err = store.PutRelease(ctx, r); err != nil {
				return err
			}
			if c.BaselineDigest == "" {
				c.BaselineDigest = r.Digest
			}
			fmt.Println(r.Digest)
		}
		if command == "import" {
			if *manifestURL == "" {
				return errors.New("import requires -manifest")
			}
			return nil
		}
		if !release.ValidDigest(c.BaselineDigest) {
			return errors.New("init requires baseline_digest or a signed -manifest")
		}
		if _, err = store.Release(ctx, c.BaselineDigest); err != nil {
			return err
		}
		return store.InitCluster(ctx, c.PrimaryNode, c.BaselineDigest)
	}
	if command != "serve" {
		return errors.New("unknown command")
	}
	supervisor, err := supervisor.New(filepath.Join(c.Root, "runtime"))
	if err != nil {
		return err
	}
	defer supervisor.Close()
	cert, err := tls.LoadX509KeyPair(c.CertFile, c.KeyFile)
	if err != nil {
		return err
	}
	pem, err := os.ReadFile(c.CAFile)
	if err != nil {
		return err
	}
	ca := x509.NewCertPool()
	if !ca.AppendCertsFromPEM(pem) {
		return errors.New("invalid cluster CA")
	}
	clientTLS := &tls.Config{MinVersion: tls.VersionTLS13, RootCAs: ca}
	opt, err := parseRedisURL(c.RedisURL)
	if err != nil {
		return err
	}
	redisClient := redis.NewClient(opt)
	defer redisClient.Close()
	boot := make([]byte, 16)
	if _, err = rand.Read(boot); err != nil {
		return err
	}
	ownNode := control.Node{ID: c.NodeID, PeerURL: c.PeerURL, ShellBootID: hex.EncodeToString(boot), OS: runtime.GOOS, Arch: runtime.GOARCH, RuntimeABI: c.RuntimeABI, PeerProtocol: peer.Protocol, Strategy: control.PrimaryFirst}
	// Configure structured logging with cluster context
	handler := slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo})
	logger := slog.New(handler).With(
		"cluster_id", c.ClusterID,
		"node_id", c.NodeID,
		"shell_boot_id", ownNode.ShellBootID,
	)
	slog.SetDefault(logger)
	locks := control.NewRedisLocks(redisClient)
	store.Locks = locks
	store.Redis = redisClient
	peerManager, err := peer.New(peer.Config{Redis: redisClient, Cluster: c.ClusterID, NodeID: c.NodeID, BootID: ownNode.ShellBootID, ConfiguredKey: c.PeerAuthKey, Validate: func(ctx context.Context, id peer.Identity) error {
		return store.ValidateNode(ctx, id.NodeID, id.BootID)
	}, Register: func(ctx context.Context) error { return store.RegisterLocked(ctx, ownNode) }, WithRegistration: func(ctx context.Context, fn func(context.Context) error) error {
		return store.WithRegistration(ctx, c.NodeID, fn)
	}})
	if err != nil {
		return err
	}
	store.RevokePeer = peerManager.Revoke
	// A disabled, conflicting or Redis-less boot stays up in maintenance with its
	// management socket; Run and the engine heartbeat keep retrying registration,
	// and every engine pass refuses work until it succeeds.
	if err = peerManager.Maintain(ctx); err != nil {
		slog.Error("node registration pending", "error", err)
	}
	go peerManager.Run(ctx)
	defer func() {
		cleanup, done := context.WithTimeout(context.Background(), 3*time.Second)
		defer done()
		_ = peerManager.Unregister(cleanup)
	}()
	// The node key goes to the primary, or to a serving node while this node
	// offloads its new requests because of CPU load.
	var router *proxy.Router
	authorizeTarget := func(ctx context.Context, u *url.URL) error {
		return store.AuthorizeTarget(ctx, c.NodeID, u, router != nil && router.Offloading())
	}
	peerTransport := peerManager.WrapTransport(proxy.PeerTransport(clientTLS), authorizeTarget)
	trustedProxies := make([]*net.IPNet, 0, len(c.TrustedProxies))
	for _, cidr := range c.TrustedProxies {
		_, network, parseErr := net.ParseCIDR(cidr)
		if parseErr != nil {
			return fmt.Errorf("invalid trusted_proxies CIDR %q: %w", cidr, parseErr)
		}
		trustedProxies = append(trustedProxies, network)
	}
	var peerCache atomic.Value
	peerCache.Store([]control.Node{})
	go func() {
		tick := time.NewTicker(3 * time.Second)
		defer tick.Stop()
		for {
			lookup, cancel := context.WithTimeout(ctx, 2*time.Second)
			nodes, err := store.Nodes(lookup)
			cancel()
			if err == nil {
				peerCache.Store(nodes)
			}
			select {
			case <-ctx.Done():
				return
			case <-tick.C:
			}
		}
	}()
	var rt *control.LocalRuntime
	router = proxy.New(proxy.Config{NodeID: c.NodeID, PeerTLS: clientTLS, PeerTransport: peerTransport, TrustedProxies: trustedProxies, PeerReady: func(route proxy.Route) bool {
		for _, n := range peerCache.Load().([]control.Node) {
			if n.Enabled && n.PeerURL == route.PeerURL && n.CoreBootID == route.CoreBootID && n.RouteRevision == route.PeerRevision && n.Ready && n.Mode == "local" && time.Since(n.LastSeen) < 20*time.Second {
				return true
			}
		}
		return false
	}, LocalReady: func() bool {
		if rt == nil {
			return false
		}
		statusCtx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		st, _, err := rt.Status(statusCtx)
		return err == nil && st.Ready
	}})
	rt = &control.LocalRuntime{Releases: releases, Supervisor: supervisor, Router: router, NodeID: c.NodeID, PrimaryNode: c.PrimaryNode, CoreSocket: c.CoreSocket, ManagementSocket: c.ManagementSocket, CoreURL: c.CoreURL, Root: c.Root, Args: c.CoreArgs, Env: c.coreEnvironment()}
	rt.OnStopped = func(ctx context.Context, coreBoot string) error {
		return store.ConfirmStoppedCore(ctx, c.NodeID, ownNode.ShellBootID, coreBoot)
	}
	rt.Peer = peerManager
	rt.PeerArtifactClient = peer.NewClient(peerTransport, 10*time.Minute)
	pluginBlobs := control.PluginBlobs(store, c.NodeID, c.Root, rt.PeerArtifactClient, c.PluginMaxBytes)
	rt.PluginBlobs = pluginBlobs.Peer()
	go control.CollectPluginBlobs(ctx, store, pluginBlobs, 10*time.Minute)
	rt.AuthorizePeer = func(ctx context.Context, id peer.Identity, scope, digest string) error {
		return store.AuthorizePeer(ctx, id.NodeID, id.BootID, c.NodeID, scope, digest)
	}
	cpu := &cpuload.Sampler{Counters: cpuload.Counters(), Window: 10}
	go cpu.Run(ctx, time.Second)
	engine := &control.Engine{Store: store, Locks: locks, Runtime: rt, Node: ownNode, PeerMaintain: peerManager.Maintain, PeerCheck: peerManager.Check, CPU: cpu.Percent}
	if err = os.MkdirAll(filepath.Dir(c.ManagementSocket), 0700); err != nil {
		return err
	}
	if info, err := os.Lstat(c.ManagementSocket); err == nil {
		if info.Mode()&os.ModeSocket == 0 {
			return errors.New("management socket path is occupied by a non-socket")
		}
		if err = os.Remove(c.ManagementSocket); err != nil {
			return err
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}
	listener, err := net.Listen("unix", c.ManagementSocket)
	if err != nil {
		return err
	}
	defer listener.Close()
	if err = os.Chmod(c.ManagementSocket, 0600); err != nil {
		return err
	}
	local := &http.Server{Handler: control.ManagementHandler(store, pluginBlobs), ReadHeaderTimeout: 5 * time.Second}
	public := &http.Server{Addr: c.PublicAddr, Handler: router.Public(), ReadHeaderTimeout: 15 * time.Second}
	private := &http.Server{Addr: c.PeerAddr, Handler: rt.PrivateHandler(), TLSConfig: proxy.ServerTLS(cert, ca), ReadHeaderTimeout: 15 * time.Second}
	errs := make(chan error, 3)
	go func() { errs <- local.Serve(listener) }()
	go func() { errs <- public.ListenAndServe() }()
	go func() { errs <- private.ListenAndServeTLS("", "") }()
	// Management and artifact listeners remain available even if a candidate
	// fails startup, so operators can inspect/recover without a public admin port.
	recoveryCtx, recoveryCancel := context.WithTimeout(ctx, 10*time.Minute)
	_, err = engine.Locks.WithLock(recoveryCtx, "system:upgrade-node:"+c.ClusterID+":"+c.NodeID, 10*time.Minute, func(ctx context.Context) error { return engine.Recover(ctx, *bootstrap) })
	recoveryCancel()
	if err != nil {
		slog.Error("startup reconciliation paused", "error", err)
	}
	go func() { _ = engine.Run(ctx) }()
	select {
	case <-ctx.Done():
	case err = <-errs:
		cancel()
	}
	stopCtx, stopCancel := context.WithTimeout(context.Background(), 150*time.Second)
	defer stopCancel()
	_ = router.SetRoute(proxy.Route{Mode: "maintenance", Revision: time.Now().UnixNano()})
	stopErr := supervisor.Terminate(stopCtx)
	_ = public.Shutdown(stopCtx)
	_ = private.Shutdown(stopCtx)
	_ = local.Shutdown(stopCtx)
	if stopErr != nil {
		return stopErr
	}
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

// publisherClient trusts system roots plus the cluster CA when configured.
func publisherClient(caFile string) (*http.Client, error) {
	roots, err := x509.SystemCertPool()
	if err != nil || roots == nil {
		roots = x509.NewCertPool()
	}
	if caFile != "" {
		pem, err := os.ReadFile(caFile)
		if err != nil {
			return nil, err
		}
		if !roots.AppendCertsFromPEM(pem) {
			return nil, errors.New("invalid cluster CA")
		}
	}
	return &http.Client{Transport: &http.Transport{Proxy: http.ProxyFromEnvironment, TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS12, RootCAs: roots}}, Timeout: 10 * time.Minute}, nil
}
func readConfig(path string) (config, error) {
	var c config
	b, err := os.ReadFile(path)
	if err != nil {
		return c, err
	}
	if err = json.Unmarshal(b, &c); err != nil {
		return c, err
	}
	// Compose passes an unset per-node variable as an empty string; only a
	// non-empty value overrides the file, and it must then be valid.
	if value := os.Getenv("SUB2API_PEER_AUTH_KEY"); value != "" {
		if err := peer.ValidateKey(value); err != nil {
			return c, err
		}
		c.PeerAuthKey = value
	}
	if c.PeerAuthKey != "" {
		if err := peer.ValidateKey(c.PeerAuthKey); err != nil {
			return c, err
		}
	}
	if v := os.Getenv("DATABASE_URL"); v != "" {
		c.DatabaseURL = v
	}
	if v := os.Getenv("REDIS_URL"); v != "" {
		c.RedisURL = v
	}
	if c.Root == "" {
		c.Root = "/var/lib/sub2api"
	}
	if c.PublicAddr == "" {
		c.PublicAddr = ":8080"
	}
	if c.PeerAddr == "" {
		c.PeerAddr = ":7443"
	}
	if c.CoreURL == "" {
		c.CoreURL = "http://127.0.0.1:18080"
	}
	if c.ManagementSocket == "" {
		c.ManagementSocket = filepath.Join(c.Root, "runtime", "shell.sock")
	}
	if c.CoreSocket == "" {
		c.CoreSocket = filepath.Join(c.Root, "runtime", "core.sock")
	}
	if c.ClusterID == "" || c.NodeID == "" || c.PrimaryNode == "" || c.RuntimeABI == "" || c.DatabaseURL == "" || c.RedisURL == "" {
		return c, errors.New("cluster_id, node_id, primary_node, runtime_abi, DATABASE_URL and REDIS_URL are required")
	}
	if !filepath.IsAbs(c.Root) || !filepath.IsAbs(c.CoreSocket) || !filepath.IsAbs(c.ManagementSocket) {
		return c, errors.New("root and socket paths must be absolute")
	}
	u, err := url.Parse(c.PeerURL)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.Path != "" || u.User != nil {
		return c, errors.New("peer_url must be an HTTPS origin")
	}
	return c, nil
}

// The supervised core must use this gateway's approved cluster stores. Append
// these last so neither inherited process variables nor core_env can silently
// point the child at a different database or lock namespace.
func (c config) coreEnvironment() []string {
	env := append([]string(nil), c.CoreEnv...)
	return append(env, "DATABASE_URL="+c.DatabaseURL, "REDIS_URL="+c.RedisURL)
}
func importRelease(ctx context.Context, c config, m *release.Manager, raw string) (control.Release, error) {
	var out control.Release
	u, err := url.Parse(raw)
	if err != nil {
		return out, err
	}
	origin, err := url.Parse(c.ReleaseOrigin)
	if err != nil || origin.Scheme != "https" || origin.Host == "" {
		return out, errors.New("release_origin must be configured as HTTPS")
	}
	if u.Scheme != origin.Scheme || u.Host != origin.Host || u.User != nil || !strings.HasPrefix(u.Path, strings.TrimRight(origin.Path, "/")+"/") {
		return out, errors.New("manifest must come from the configured release origin")
	}
	signed, err := m.FetchManifest(ctx, raw)
	if err != nil {
		return out, err
	}
	manifest, digest, err := release.Verify(signed, m.TrustedKeys)
	if err != nil {
		return out, err
	}
	return control.Release{Digest: digest, Manifest: manifest, Signed: signed, BundleBase: strings.TrimRight(c.ReleaseOrigin, "/")}, nil
}
func localCommand(command, socket, id string) error {
	method, path := "GET", "/system/upgrades"
	if command != "status" {
		if id == "" {
			return errors.New("-id is required")
		}
		method = "POST"
		if command == "enable-node" || command == "disable-node" {
			path = "/system/nodes/" + url.PathEscape(id) + "/" + strings.TrimSuffix(command, "-node")
		} else {
			path += "/" + url.PathEscape(id) + "/" + command
		}
	}
	client := &http.Client{Timeout: 15 * time.Second, Transport: &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", socket)
	}}}
	req, _ := http.NewRequest(method, "http://shell"+path, nil)
	req.Header.Set("X-Updater-Actor", "local-operator")
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	_, err = io.Copy(os.Stdout, io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return err
	}
	if res.StatusCode >= 400 {
		return fmt.Errorf("gateway returned HTTP %d", res.StatusCode)
	}
	return nil
}

func clusterCommand(command string, c config, node string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	dbcfg, err := pgxpool.ParseConfig(c.DatabaseURL)
	if err != nil {
		return err
	}
	if maxConns := os.Getenv("SUB2API_GATEWAY_POOL_MAX_CONNS"); maxConns != "" {
		var n int32
		if _, err := fmt.Sscanf(maxConns, "%d", &n); err == nil && n > 0 {
			dbcfg.MaxConns = n
		}
	}
	if dbcfg.MaxConns == 0 {
		dbcfg.MaxConns = 8
	}
	db, err := pgxpool.NewWithConfig(ctx, dbcfg)
	if err != nil {
		return err
	}
	defer db.Close()
	opt, err := parseRedisURL(c.RedisURL)
	if err != nil {
		return err
	}
	redisClient := redis.NewClient(opt)
	defer redisClient.Close()
	store := &control.Store{
		DB:      db,
		Cluster: c.ClusterID,
		Locks:   control.NewRedisLocks(redisClient),
		Redis:   redisClient,
	}
	if command == "set-primary" {
		return store.SetPrimary(ctx, node)
	}
	if command == "remove-node" {
		return store.RemoveNode(ctx, node)
	}
	return errors.New("unknown cluster command")
}

// parseRedisURL parses the cache server URL: any Redis-protocol server,
// Valkey by default. Besides go-redis's redis://, rediss:// and unix:// it
// accepts valkey:// and valkeys:// (TLS), which mean redis:// and rediss://.
// The URL is handed to the core unchanged, which accepts the same schemes
// (server/internal/cluster.ParseRedisURL).
func parseRedisURL(raw string) (*redis.Options, error) {
	raw = strings.TrimSpace(raw)
	if scheme, rest, ok := strings.Cut(raw, "://"); ok {
		switch strings.ToLower(scheme) {
		case "valkey":
			raw = "redis://" + rest
		case "valkeys":
			raw = "rediss://" + rest
		}
	}
	return redis.ParseURL(raw)
}
