// Package pluginsdktest runs a plugin in-process for unit tests: the plugin
// services and a FakeHost are served over bufconn, and the harness performs
// the host handshake (GetInfo -> InitHost -> Configure).
package pluginsdktest

import (
	"context"
	"encoding/json"
	"net"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// HostBrokerID is the broker id the harness announces in InitHost.
const HostBrokerID = 1

// Options configures Start.
type Options struct {
	// Host is the fake host; a new one is created when nil.
	Host *FakeHost
	// Config is the plugin settings (any JSON-marshalable value or a
	// json.RawMessage/string holding JSON). nil = "{}".
	Config any
	// Grants passed to Configure.
	Grants []*pluginv1.Grant
	// SDK options passed to pluginsdk.Register, after a default
	// WithStrictNetwork(StrictNever). Pass WithManifest or WithInfo.
	SDK []pluginsdk.Option
	// SkipHandshake leaves InitHost/Configure to the test.
	SkipHandshake bool
}

// Harness is a running in-process plugin.
type Harness struct {
	T    testing.TB
	Host *FakeHost
	Conn *grpc.ClientConn
	Info *pluginv1.GetInfoResponse

	Plugin    pluginv1.PluginServiceClient
	Platform  pluginv1.PlatformServiceClient
	Hook      pluginv1.HookServiceClient
	App       pluginv1.AppServiceClient
	HTTP      pluginv1.HTTPServiceClient
	Scheduler pluginv1.SchedulerServiceClient
	Migration pluginv1.MigrationServiceClient
}

// Start serves p and completes the host handshake. Everything is torn down
// with t.Cleanup (Shutdown is called first).
func Start(t testing.TB, p any, opts Options) *Harness {
	t.Helper()
	fh := opts.Host
	if fh == nil {
		fh = NewFakeHost()
	}

	// Fake host server.
	hostLis := bufconn.Listen(1 << 20)
	hostSrv := grpc.NewServer()
	pluginv1.RegisterHostServiceServer(hostSrv, fh)
	pluginv1.RegisterEgressServiceServer(hostSrv, fh)
	go func() { _ = hostSrv.Serve(hostLis) }()

	dialHost := func(id uint32) (*grpc.ClientConn, error) {
		return dialBuf(hostLis)
	}

	// Plugin server.
	sdkOpts := append([]pluginsdk.Option{pluginsdk.WithStrictNetwork(pluginsdk.StrictNever)}, opts.SDK...)
	plugLis := bufconn.Listen(1 << 20)
	plugSrv := pluginsdk.NewGRPCServer(nil)
	if err := pluginsdk.Register(plugSrv, p, dialHost, sdkOpts...); err != nil {
		t.Fatalf("pluginsdktest: register: %v", err)
	}
	go func() { _ = plugSrv.Serve(plugLis) }()

	conn, err := dialBuf(plugLis)
	if err != nil {
		t.Fatalf("pluginsdktest: dial plugin: %v", err)
	}
	h := &Harness{
		T: t, Host: fh, Conn: conn,
		Plugin:    pluginv1.NewPluginServiceClient(conn),
		Platform:  pluginv1.NewPlatformServiceClient(conn),
		Hook:      pluginv1.NewHookServiceClient(conn),
		App:       pluginv1.NewAppServiceClient(conn),
		HTTP:      pluginv1.NewHTTPServiceClient(conn),
		Scheduler: pluginv1.NewSchedulerServiceClient(conn),
		Migration: pluginv1.NewMigrationServiceClient(conn),
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, _ = h.Plugin.Shutdown(ctx, &pluginv1.ShutdownRequest{GraceSeconds: 1})
		_ = conn.Close()
		plugSrv.Stop()
		hostSrv.Stop()
	})

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	info, err := h.Plugin.GetInfo(ctx, &pluginv1.GetInfoRequest{})
	if err != nil {
		t.Fatalf("pluginsdktest: GetInfo: %v", err)
	}
	h.Info = info
	if opts.SkipHandshake {
		return h
	}
	init, err := h.Plugin.InitHost(ctx, &pluginv1.InitHostRequest{
		HostBrokerId: HostBrokerID, HostApiVersion: 1, NodeId: "test-node", BootId: "test-boot", HostVersion: "0.1.0-test",
	})
	if err != nil {
		t.Fatalf("pluginsdktest: InitHost: %v", err)
	}
	if !init.GetReady() {
		t.Fatalf("pluginsdktest: InitHost not ready: %s", init.GetMessage())
	}
	if errs := h.Configure(opts.Config, opts.Grants); len(errs) > 0 {
		t.Fatalf("pluginsdktest: Configure rejected: %v", errs)
	}
	return h
}

// Configure sends a Configure call and returns the field errors.
func (h *Harness) Configure(config any, grants []*pluginv1.Grant) []*pluginv1.FieldError {
	h.T.Helper()
	raw := "{}"
	switch v := config.(type) {
	case nil:
	case string:
		raw = v
	case json.RawMessage:
		raw = string(v)
	case []byte:
		raw = string(v)
	default:
		b, err := json.Marshal(v)
		if err != nil {
			h.T.Fatalf("pluginsdktest: marshal config: %v", err)
		}
		raw = string(b)
	}
	resp, err := h.Plugin.Configure(context.Background(), &pluginv1.ConfigureRequest{ConfigJson: raw, Grants: grants})
	if err != nil {
		h.T.Fatalf("pluginsdktest: Configure: %v", err)
	}
	return resp.GetErrors()
}

// Do sends an HTTPService request. body may be nil, []byte, string or any
// JSON-marshalable value.
func (h *Harness) Do(method, routePath string, query map[string]string, body any) *pluginv1.HTTPResponse {
	h.T.Helper()
	req := &pluginv1.HTTPRequest{
		Caller: &pluginv1.Caller{UserId: 1, RequestId: "test", Locale: "en"},
		Method: method, Path: routePath, RoutePath: routePath,
		Query: map[string]*pluginv1.HeaderValues{},
	}
	for k, v := range query {
		req.Query[k] = &pluginv1.HeaderValues{Values: []string{v}}
	}
	switch b := body.(type) {
	case nil:
	case []byte:
		req.Body = b
	case string:
		req.Body = []byte(b)
	default:
		raw, err := json.Marshal(b)
		if err != nil {
			h.T.Fatalf("pluginsdktest: marshal body: %v", err)
		}
		req.Body = raw
	}
	resp, err := h.HTTP.HandleHTTP(context.Background(), req)
	if err != nil {
		h.T.Fatalf("pluginsdktest: HandleHTTP %s %s: %v", method, routePath, err)
	}
	return resp
}

func dialBuf(l *bufconn.Listener) (*grpc.ClientConn, error) {
	return grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return l.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
}
