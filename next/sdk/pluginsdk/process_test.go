package pluginsdk_test

import (
	"context"
	"os"
	"os/exec"
	"testing"
	"time"

	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"
	"google.golang.org/grpc"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

const envServe = "PLUGINSDK_TEST_SERVE"

// TestMain doubles as the plugin binary: the go-plugin test below re-executes
// the test binary with envServe=1.
func TestMain(m *testing.M) {
	if os.Getenv(envServe) == "1" {
		pluginsdk.Serve(newDemo(), pluginsdk.WithManifest([]byte(testManifest)))
		return
	}
	os.Exit(m.Run())
}

func TestServeOverGoPlugin(t *testing.T) {
	if testing.Short() {
		t.Skip("spawns a process")
	}
	exe, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	cmd := exec.Command(exe, "-test.run=^$")
	cmd.Env = append(os.Environ(), envServe+"=1")
	client := plugin.NewClient(&plugin.ClientConfig{
		HandshakeConfig:  protocol.Handshake,
		Plugins:          protocol.PluginMap(&protocol.GRPCPlugin{}),
		Cmd:              cmd,
		AllowedProtocols: []plugin.Protocol{plugin.ProtocolGRPC},
		Logger:           hclog.NewNullLogger(),
		StartTimeout:     30 * time.Second,
	})
	defer client.Kill()
	rpc, err := client.Client()
	if err != nil {
		t.Fatalf("client: %v", err)
	}
	raw, err := rpc.Dispense(protocol.PluginName)
	if err != nil {
		t.Fatalf("dispense: %v", err)
	}
	pc := raw.(*protocol.Client)

	fh := pluginsdktest.NewFakeHost()
	id := pc.Broker.NextId()
	go pc.Broker.AcceptAndServe(id, func(opts []grpc.ServerOption) *grpc.Server {
		s := grpc.NewServer(opts...)
		pluginv1.RegisterHostServiceServer(s, fh)
		pluginv1.RegisterEgressServiceServer(s, fh)
		return s
	})

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	svc := pluginv1.NewPluginServiceClient(pc.Conn)
	info, err := svc.GetInfo(ctx, &pluginv1.GetInfoRequest{})
	if err != nil || info.GetPluginKey() != "demo" || info.GetProtocolVersion() != protocol.ProtocolVersion {
		t.Fatalf("GetInfo = %v %v", info, err)
	}
	init, err := svc.InitHost(ctx, &pluginv1.InitHostRequest{HostBrokerId: id, HostApiVersion: protocol.HostAPIVersion})
	if err != nil || !init.GetReady() {
		t.Fatalf("InitHost = %v %v", init, err)
	}
	if _, err := svc.Configure(ctx, &pluginv1.ConfigureRequest{ConfigJson: `{"name":"proc"}`}); err != nil {
		t.Fatal(err)
	}
	resp, err := pluginv1.NewHTTPServiceClient(pc.Conn).HandleHTTP(ctx, &pluginv1.HTTPRequest{Method: "GET", RoutePath: "/hello", Caller: &pluginv1.Caller{UserId: 5}})
	if err != nil || string(resp.GetBody()) != `{"data":{"hello":"proc","q":""}}` {
		t.Fatalf("hello = %v %v", resp, err)
	}
	logs := fh.Logs()
	if len(logs) != 1 || logs[0].Attrs["user"] != "5" {
		t.Fatalf("host logs = %+v", logs)
	}
	if _, err := svc.Shutdown(ctx, &pluginv1.ShutdownRequest{}); err != nil {
		t.Fatal(err)
	}
}
