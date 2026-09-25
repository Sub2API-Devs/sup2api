// Command testplugin is a minimal plugin used by the runtime tests. It talks
// to the host with the protocol package and generated services only.
//
// Behaviour switches:
//   - ValidateCredentials with credentials_json containing "crash" exits.
//   - BuildTestRequest with model "sleep:<ms>" sleeps before answering.
//   - Configure rejects {"reject": true}.
//   - HTTP POST /publish publishes the body as broadcast topic "t.ping";
//     OnBroadcast stores "<topic>:<payload>:<source node>" in KV t/broadcast.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/hashicorp/go-plugin"
	"google.golang.org/grpc"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

type server struct {
	pluginv1.UnimplementedPluginServiceServer
	pluginv1.UnimplementedPlatformServiceServer
	pluginv1.UnimplementedHTTPServiceServer
	pluginv1.UnimplementedHookServiceServer
	pluginv1.UnimplementedMigrationServiceServer
	pluginv1.UnimplementedAppServiceServer

	broker *plugin.GRPCBroker
	mu     sync.Mutex
	host   pluginv1.HostServiceClient
	config map[string]any
	grants []string
}

func (s *server) hostClient() pluginv1.HostServiceClient {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.host
}

func (s *server) GetInfo(context.Context, *pluginv1.GetInfoRequest) (*pluginv1.GetInfoResponse, error) {
	return &pluginv1.GetInfoResponse{
		PluginKey:       os.Getenv(protocol.EnvPluginKey),
		Version:         os.Getenv(protocol.EnvPluginVersion),
		SdkVersion:      "test",
		ProtocolVersion: protocol.ProtocolVersion,
		Capabilities:    []string{"platform.adapter.v1", "http.routes.v1", "gateway.hook.v1", "migration.data.v1", "app.broadcast.v1"},
	}, nil
}

func (s *server) InitHost(_ context.Context, in *pluginv1.InitHostRequest) (*pluginv1.InitHostResponse, error) {
	conn, err := s.broker.Dial(in.GetHostBrokerId())
	if err != nil {
		return &pluginv1.InitHostResponse{Ready: false, Message: err.Error()}, nil
	}
	s.mu.Lock()
	s.host = pluginv1.NewHostServiceClient(conn)
	s.mu.Unlock()
	return &pluginv1.InitHostResponse{Ready: true}, nil
}

func (s *server) Configure(_ context.Context, in *pluginv1.ConfigureRequest) (*pluginv1.ConfigureResponse, error) {
	cfg := map[string]any{}
	_ = json.Unmarshal([]byte(in.GetConfigJson()), &cfg)
	if cfg["reject"] == true {
		return &pluginv1.ConfigureResponse{Errors: []*pluginv1.FieldError{{Field: "reject", Code: "invalid", Message: "rejected"}}}, nil
	}
	var grants []string
	for _, g := range in.GetGrants() {
		grants = append(grants, g.GetPermission())
	}
	s.mu.Lock()
	s.config, s.grants = cfg, grants
	s.mu.Unlock()
	return &pluginv1.ConfigureResponse{}, nil
}

func (s *server) Health(context.Context, *pluginv1.HealthRequest) (*pluginv1.HealthResponse, error) {
	return &pluginv1.HealthResponse{Healthy: true}, nil
}

func (s *server) Shutdown(context.Context, *pluginv1.ShutdownRequest) (*pluginv1.ShutdownResponse, error) {
	return &pluginv1.ShutdownResponse{}, nil
}

func (s *server) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	if strings.Contains(in.GetCredentialsJson(), "crash") {
		os.Exit(3)
	}
	return &pluginv1.ValidateCredentialsResponse{}, nil
}

// BuildUpstreamRequest exercises HostService: it increments a KV counter and
// echoes the configured greeting.
func (s *server) BuildUpstreamRequest(ctx context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	h := s.hostClient()
	n := 0
	got, err := h.KVGet(ctx, &pluginv1.KVGetRequest{Namespace: "t", Key: "calls"})
	if err != nil {
		return nil, err
	}
	if got.GetFound() {
		n, _ = strconv.Atoi(string(got.GetValue()))
	}
	n++
	if _, err := h.KVSet(ctx, &pluginv1.KVSetRequest{Namespace: "t", Key: "calls", Value: []byte(strconv.Itoa(n))}); err != nil {
		return nil, err
	}
	_, _ = h.Log(ctx, &pluginv1.LogRequest{Level: pluginv1.LogRequest_LEVEL_INFO, Message: "build", Attrs: map[string]string{"n": strconv.Itoa(n)}})
	s.mu.Lock()
	greeting := fmt.Sprint(s.config["greeting"])
	s.mu.Unlock()
	return &pluginv1.BuildUpstreamRequestResponse{
		Method:  "POST",
		Url:     "https://upstream.example.com/v1/messages",
		Headers: map[string]string{"x-calls": strconv.Itoa(n), "x-greeting": greeting, "x-pid": strconv.Itoa(os.Getpid())},
	}, nil
}

func (s *server) ClassifyError(context.Context, *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	return &pluginv1.ClassifyErrorResponse{Action: pluginv1.ClassifyErrorResponse_ACTION_FAILOVER}, nil
}

func (s *server) BuildModelsRequest(context.Context, *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	return nil, status.Error(codes.Unimplemented, "test plugin lists no models")
}

func (s *server) BuildTestRequest(ctx context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	if ms, ok := strings.CutPrefix(in.GetModel(), "sleep:"); ok {
		d, _ := strconv.Atoi(ms)
		select {
		case <-time.After(time.Duration(d) * time.Millisecond):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	return &pluginv1.BuildTestRequestResponse{Method: "POST", Url: "https://upstream.example.com/test", BodyJson: "{}"}, nil
}

func (s *server) OnGatewayRequest(_ context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	if strings.Contains(in.GetFields()["prompt_text"], "bad") {
		return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_DENY, DenyStatus: 403, DenyCode: "blocked"}, nil
	}
	return &pluginv1.GatewayRequestHookResponse{Decision: pluginv1.GatewayRequestHookResponse_DECISION_ALLOW}, nil
}

func (s *server) HandleHTTP(ctx context.Context, in *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	out := map[string]any{
		"path":    in.GetPath(),
		"route":   in.GetRoutePath(),
		"params":  in.GetPathParams(),
		"user_id": in.GetCaller().GetUserId(),
		"body":    string(in.GetBody()),
		"version": os.Getenv(protocol.EnvPluginVersion),
	}
	_, hasAuth := in.GetHeaders()["authorization"]
	out["saw_authorization"] = hasAuth
	if in.GetCaller().GetUserId() > 0 {
		r, err := s.hostClient().AuthzCheck(ctx, &pluginv1.AuthzCheckRequest{UserId: in.GetCaller().GetUserId(), Permission: "rules:read"})
		if err != nil {
			return nil, err
		}
		out["allowed"] = r.GetAllowed()
	}
	if in.GetPath() == "/dsn" {
		r, err := s.hostClient().GetDSN(ctx, &pluginv1.GetDSNRequest{})
		if err != nil {
			return nil, err
		}
		out["dsn"], out["schema"], out["role_isolated"] = r.GetDsn(), r.GetSchema(), r.GetRoleIsolated()
	}
	if in.GetPath() == "/publish" {
		if _, err := s.hostClient().Publish(ctx, &pluginv1.PublishRequest{Topic: "t.ping", Payload: in.GetBody()}); err != nil {
			return nil, err
		}
		out["published"] = true
	}
	if in.GetPath() == "/credit" {
		r, err := s.hostClient().LedgerCredit(ctx, &pluginv1.LedgerChangeRequest{UserId: 1, Amount: string(in.GetBody()), IdempotencyKey: in.GetQuery()["idem"].GetValues()[0]})
		if err != nil {
			return nil, err
		}
		out["ledger_id"], out["balance_after"], out["duplicate"] = r.GetLedgerId(), r.GetBalanceAfter(), r.GetDuplicate()
	}
	b, _ := json.Marshal(out)
	return &pluginv1.HTTPResponse{
		Status:  200,
		Headers: map[string]*pluginv1.HeaderValues{"Content-Type": {Values: []string{"application/json"}}, "Set-Cookie": {Values: []string{"x=1"}}},
		Body:    b,
	}, nil
}

func (s *server) MigrateData(ctx context.Context, in *pluginv1.MigrateDataRequest) (*pluginv1.MigrateDataResponse, error) {
	_, err := s.hostClient().KVSet(ctx, &pluginv1.KVSetRequest{Namespace: "t", Key: "migrated", Value: []byte(in.GetFromVersion() + "->" + in.GetToVersion())})
	return &pluginv1.MigrateDataResponse{}, err
}

func (s *server) OnBroadcast(ctx context.Context, in *pluginv1.OnBroadcastRequest) (*pluginv1.OnBroadcastResponse, error) {
	v := in.GetTopic() + ":" + string(in.GetPayload()) + ":" + in.GetSourceNodeId()
	_, err := s.hostClient().KVSet(ctx, &pluginv1.KVSetRequest{Namespace: "t", Key: "broadcast", Value: []byte(v)})
	return &pluginv1.OnBroadcastResponse{}, err
}

func main() {
	s := &server{}
	plugin.Serve(&plugin.ServeConfig{
		HandshakeConfig: protocol.Handshake,
		Plugins: protocol.PluginMap(&protocol.GRPCPlugin{Register: func(g *grpc.Server, broker *plugin.GRPCBroker) error {
			s.broker = broker
			pluginv1.RegisterPluginServiceServer(g, s)
			pluginv1.RegisterPlatformServiceServer(g, s)
			pluginv1.RegisterHTTPServiceServer(g, s)
			pluginv1.RegisterHookServiceServer(g, s)
			pluginv1.RegisterMigrationServiceServer(g, s)
			pluginv1.RegisterAppServiceServer(g, s)
			return nil
		}}),
		GRPCServer: plugin.DefaultGRPCServer,
	})
}
