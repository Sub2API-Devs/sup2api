// Package protocol holds the go-plugin wiring shared by the host runtime and
// the plugin SDK, so both sides agree on the handshake and plugin name.
package protocol

import (
	"context"

	"github.com/hashicorp/go-plugin"
	"google.golang.org/grpc"
)

// ProtocolVersion is the plugin protocol understood by this SDK; it must
// equal GetInfoResponse.protocol_version.
const ProtocolVersion = 1

// HostAPIVersion is sent in InitHostRequest.host_api_version. Version 6 adds
// automatic account state changes and timed recovery; version 8 adds sticky
// binding clearing, notifications, environment variables (CONTRACTS §73) and
// user lookup (§74.3); the wire protocol stays at 1.
const HostAPIVersion = 8

const StickyClearHostAPIVersion = 8
const NotificationHostAPIVersion = 8
const EnvironmentHostAPIVersion = 8
const UsersHostAPIVersion = 8

const ModelAvailabilityHostAPIVersion = 7
const AccountAutomaticStateHostAPIVersion = 6
const ObservationHostAPIVersion = 5

// ExecutionHostAPIVersion is the first host with Execute/Monitor callbacks.
const ExecutionHostAPIVersion = 4

// ManagedTasksHostAPIVersion is the first host API that owns task submission,
// query snapshots and polling. Task plugins must reject older hosts at InitHost,
// including hosts loading an already-approved package from a shared database.
const ManagedTasksHostAPIVersion = 2

// PollHostAPIVersion is the first host API with invocation-bound ExecuteHTTP.
const PollHostAPIVersion = 3

// Handshake is the go-plugin handshake. A binary started without the magic
// cookie prints a hint and exits.
var Handshake = plugin.HandshakeConfig{
	ProtocolVersion:  ProtocolVersion,
	MagicCookieKey:   "SUB2API_PLUGIN",
	MagicCookieValue: "sub2api-next-plugin-v1",
}

// PluginName is the single dispensed plugin; all services are registered on
// the same gRPC server.
const PluginName = "sub2api"

// GRPCPlugin implements plugin.GRPCPlugin for both sides.
//   - Plugin side: set Register; it registers the implemented services.
//   - Host side: leave Register nil; Dispense returns *Client.
type GRPCPlugin struct {
	plugin.NetRPCUnsupportedPlugin
	Register func(s *grpc.Server, broker *plugin.GRPCBroker) error
}

func (p *GRPCPlugin) GRPCServer(broker *plugin.GRPCBroker, s *grpc.Server) error {
	return p.Register(s, broker)
}

func (p *GRPCPlugin) GRPCClient(_ context.Context, broker *plugin.GRPCBroker, c *grpc.ClientConn) (any, error) {
	return &Client{Conn: c, Broker: broker}, nil
}

// Client is what the host gets from Dispense(PluginName). Build typed
// service clients from Conn (pluginv1.NewPluginServiceClient(conn), ...).
type Client struct {
	Conn   *grpc.ClientConn
	Broker *plugin.GRPCBroker
}

// PluginMap returns the go-plugin map for ClientConfig/ServeConfig.
func PluginMap(p *GRPCPlugin) map[string]plugin.Plugin {
	return map[string]plugin.Plugin{PluginName: p}
}

// Environment variables the host sets for every plugin process.
const (
	EnvPluginKey     = "SUB2API_PLUGIN_KEY"
	EnvPluginVersion = "SUB2API_PLUGIN_VERSION"
	EnvStrictNetwork = "SUB2API_PLUGIN_STRICT_NETWORK" // "1" when direct sockets are blocked
	EnvDataDir       = "SUB2API_PLUGIN_DATA_DIR"       // writable scratch dir for the plugin
)
