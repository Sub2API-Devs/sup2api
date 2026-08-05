package integration

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"hash/crc32"
	"io"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/bootstrap"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/config"
	"github.com/caddyserver/caddy/v2"
	"github.com/coder/websocket"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/admission"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/auth"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/gateway"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/lease"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/anthropicoauth"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/anthropicupstream"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/antigravity"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/bedrock"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/geminioauth"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/grok"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/openaicodex"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/passthrough"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/protocols/vertexanthropic"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/readiness"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/requestid"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/responsesws"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/runtimeapp"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/settlement"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/transports/fingerprint"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/transports/proxy"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/transports/standard"
	_ "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/workermanagement"
	_ "github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

type controlServer struct {
	controlv1.UnimplementedDataPlaneControlServer
	upstreamURL  string
	opened       chan *controlv1.OpenRequestRequest
	signed       chan *controlv1.SignBedrockRequestRequest
	settled      chan *controlv1.SettleRequestRequest
	renewed      chan *controlv1.RenewAuthGrantRequest
	leaseRenewed chan *controlv1.RenewLeaseRequest
	leaseRenewal *controlv1.RenewLeaseResponse
	plan         *controlv1.ExecutionPlan
	grantExpiry  int64
}

func (s *controlServer) RenewLease(_ context.Context, request *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error) {
	if s.leaseRenewed != nil {
		select {
		case s.leaseRenewed <- request:
		default:
		}
	}
	if s.leaseRenewal != nil {
		return s.leaseRenewal, nil
	}
	return &controlv1.RenewLeaseResponse{Renewed: true, ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli()}, nil
}

func (s *controlServer) ResolveAPIKey(_ context.Context, request *controlv1.ResolveAPIKeyRequest) (*controlv1.ResolveAPIKeyResponse, error) {
	digest := sha256.Sum256([]byte(request.GetApiKey()))
	expiresAt := s.grantExpiry
	if expiresAt == 0 {
		expiresAt = time.Now().Add(time.Minute).UnixMilli()
	}
	return &controlv1.ResolveAPIKeyResponse{
		Decision: controlv1.Decision_DECISION_ALLOW,
		Grant: &controlv1.AuthGrant{
			GrantToken:       "grant-e2e",
			CredentialDigest: hex.EncodeToString(digest[:]),
			ApiKeyId:         7,
			UserId:           8,
			GroupId:          9,
			ExpiresAtUnixMs:  expiresAt,
		},
	}, nil
}

func (s *controlServer) RenewAuthGrant(_ context.Context, request *controlv1.RenewAuthGrantRequest) (*controlv1.ResolveAPIKeyResponse, error) {
	if s.renewed != nil {
		s.renewed <- request
	}
	digest := sha256.Sum256([]byte("client-key"))
	return &controlv1.ResolveAPIKeyResponse{
		Decision: controlv1.Decision_DECISION_ALLOW,
		Grant: &controlv1.AuthGrant{
			GrantToken: request.GetGrantToken() + "-renewed", CredentialDigest: hex.EncodeToString(digest[:]),
			ApiKeyId: 7, UserId: 8, GroupId: 9, ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli(),
		},
	}, nil
}

func (s *controlServer) OpenRequest(_ context.Context, request *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error) {
	s.opened <- request
	plan := s.plan
	if plan == nil {
		plan = &controlv1.ExecutionPlan{
			UpstreamUrl: s.upstreamURL + "/responses",
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer upstream-secret",
			},
			MappedModel: "gpt-upstream",
		}
	}
	return &controlv1.OpenRequestResponse{
		Decision: controlv1.Decision_DECISION_ALLOW,
		Lease: &controlv1.RequestLease{
			LeaseId:         "lease-e2e",
			AccountId:       42,
			PricingVersion:  "pricing-v1",
			ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli(),
		},
		Plan: plan,
	}, nil
}

func (s *controlServer) SignBedrockRequest(_ context.Context, request *controlv1.SignBedrockRequestRequest) (*controlv1.SignBedrockRequestResponse, error) {
	if s.signed != nil {
		s.signed <- request
	}
	return &controlv1.SignBedrockRequestResponse{
		Decision: controlv1.Decision_DECISION_ALLOW,
		SignedHeaders: map[string]string{
			"Authorization":        "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20260801/eu-west-1/bedrock/aws4_request, SignedHeaders=accept;content-type;host;x-amz-date;x-amz-security-token, Signature=test",
			"X-Amz-Date":           "20260801T000000Z",
			"X-Amz-Security-Token": "session-example",
		},
	}, nil
}

func (s *controlServer) SettleRequest(_ context.Context, request *controlv1.SettleRequestRequest) (*controlv1.SettleRequestResponse, error) {
	s.settled <- request
	return &controlv1.SettleRequestResponse{Accepted: true}, nil
}

func (s *controlServer) WatchInvalidations(_ *controlv1.WatchInvalidationsRequest, stream grpc.ServerStreamingServer[controlv1.InvalidationEvent]) error {
	<-stream.Context().Done()
	return nil
}

func TestCaddyWorkerManagementAndSettlementIdentityEndToEnd(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/v1/models":
			if request.Header.Get("Authorization") != "Bearer sk-worker-local" {
				http.Error(w, "wrong Worker-local API key", http.StatusUnauthorized)
				return
			}
			_, _ = io.WriteString(w, `{"data":[]}`)
		case "/responses":
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = io.WriteString(w, "data: {\"type\":\"response.completed\",\"usage\":{\"input_tokens\":2,\"output_tokens\":3}}\n\n")
		default:
			http.NotFound(w, request)
		}
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{upstreamURL: upstream.URL, opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 2)}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	managementKey := strings.Repeat("management-", 4)
	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "data-plane-worker-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true, StartupRequired: true,
		DialTimeout: 3 * time.Second, RequestTimeout: 2 * time.Second, GracePeriod: time.Second,
		SettlementWALPath: filepath.Join(t.TempDir(), "settlements"), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 100,
		WorkerID: "worker-e2e", WorkerInstanceID: "instance-e2e", WorkerManagementKey: managementKey,
		WorkerVaultPath: filepath.Join(t.TempDir(), "worker-vault.db"),
		WorkerVaultKey:  base64.StdEncoding.EncodeToString(bytes.Repeat([]byte{7}, 32)),
		WorkerVersion:   "e2e",
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatalf("load Worker-enabled Caddy: %v", err)
	}
	defer func() { _ = caddy.Stop() }()

	requestJSON := func(method, path, body string, authorized bool) (*http.Response, []byte) {
		t.Helper()
		request, err := http.NewRequest(method, "http://"+gatewayAddress+path, strings.NewReader(body))
		if err != nil {
			t.Fatal(err)
		}
		request.Header.Set("Content-Type", "application/json")
		if authorized {
			request.Header.Set("Authorization", "Bearer "+managementKey)
		}
		response, err := http.DefaultClient.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(response.Body)
		_ = response.Body.Close()
		return response, raw
	}
	if response, _ := requestJSON(http.MethodGet, "/worker/v1/identity", "", false); response.StatusCode != http.StatusUnauthorized {
		t.Fatalf("management endpoint accepted a missing key: %d", response.StatusCode)
	}
	response, raw := requestJSON(http.MethodGet, "/worker/v1/identity", "", true)
	if response.StatusCode != http.StatusOK || !bytes.Contains(raw, []byte(`"worker_id":"worker-e2e"`)) {
		t.Fatalf("unexpected Worker identity: status=%d body=%s", response.StatusCode, raw)
	}
	createBody, _ := json.Marshal(map[string]any{"name": "local-key", "api_key": "sk-worker-local", "base_url": upstream.URL})
	response, raw = requestJSON(http.MethodPost, "/worker/v1/accounts/openai/api-key", string(createBody), true)
	if response.StatusCode != http.StatusCreated {
		t.Fatalf("create Worker account: status=%d body=%s", response.StatusCode, raw)
	}
	if bytes.Contains(raw, []byte("sk-worker-local")) {
		t.Fatalf("Worker management response exposed the API key: %s", raw)
	}
	var created struct {
		Account struct {
			ID string `json:"id"`
		} `json:"account"`
	}
	if err := json.Unmarshal(raw, &created); err != nil || created.Account.ID == "" {
		t.Fatalf("decode Worker account: %v body=%s", err, raw)
	}
	response, raw = requestJSON(http.MethodPost, "/worker/v1/accounts/"+created.Account.ID+"/test", `{}`, true)
	if response.StatusCode != http.StatusOK {
		t.Fatalf("test Worker account: status=%d body=%s", response.StatusCode, raw)
	}

	aiRequest, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/responses", strings.NewReader(`{"model":"gpt-client","stream":true,"input":"hello"}`))
	aiRequest.Header.Set("Authorization", "Bearer client-key")
	aiResponse, err := http.DefaultClient.Do(aiRequest)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.Copy(io.Discard, aiResponse.Body)
	_ = aiResponse.Body.Close()
	if aiResponse.StatusCode != http.StatusOK {
		t.Fatalf("AI request failed: %d", aiResponse.StatusCode)
	}

	select {
	case settled := <-control.settled:
		if settled.GetDataPlaneId() != "data-plane-worker-e2e" || settled.GetDataPlaneInstanceId() != "instance-e2e" {
			t.Fatalf("settlement lost Worker identity: %+v", settled)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("settlement RPC was not observed")
	}
}

func TestCaddyDataPlaneOpenProxyAndSettle(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if got := request.Header.Get("Authorization"); got != "Bearer upstream-secret" {
			t.Errorf("upstream credential = %q", got)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"type\":\"response.completed\"}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("control listen: %v", err)
	}
	control := &controlServer{
		upstreamURL: upstream.URL,
		opened:      make(chan *controlv1.OpenRequestRequest, 1),
		settled:     make(chan *controlv1.SettleRequestRequest, 1),
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress:         gatewayAddress,
		NodeID:                "data-plane-e2e",
		ControlPlaneTarget:    controlListener.Addr().String(),
		ControlPlaneInsecure:  true,
		StartupRequired:       true,
		DialTimeout:           3 * time.Second,
		RequestTimeout:        2 * time.Second,
		GracePeriod:           time.Second,
		SettlementWALPath:     t.TempDir(),
		SettlementWALMaxBytes: 1 << 20,
	})
	if err != nil {
		t.Fatalf("CaddyConfig: %v", err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatalf("load Caddy: %v", err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	requestBody := `{"model":"gpt-client","stream":true,"input":"hello"}`
	request, err := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/responses", strings.NewReader(requestBody))
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	request.Header.Set("Authorization", "Bearer client-key")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("data-plane request: %v", err)
	}
	responseBody, _ := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.StatusCode, responseBody)
	}

	select {
	case opened := <-control.opened:
		if opened.GetAuthGrantToken() != "grant-e2e" || opened.GetApiKeyId() != 7 || opened.GetRequestedModel() != "gpt-client" || !opened.GetStream() {
			t.Fatalf("open request = %+v", opened)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("OpenRequest RPC not observed")
	}

	select {
	case settled := <-control.settled:
		if settled.GetLeaseId() != "lease-e2e" || settled.GetUsage().GetResponseBytes() == 0 {
			t.Fatalf("settlement = %+v", settled)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("SettleRequest RPC not observed")
	}
}

func TestCaddyDataPlaneCancelsUpstreamWhenLeaseIsRevoked(t *testing.T) {
	upstreamStarted := make(chan struct{}, 1)
	upstreamCancelled := make(chan struct{}, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"type\":\"response.in_progress\",\"usage\":{\"input_tokens\":2,\"output_tokens\":1}}\n\n")
		if flusher, ok := w.(http.Flusher); ok {
			flusher.Flush()
		}
		upstreamStarted <- struct{}{}
		<-request.Context().Done()
		upstreamCancelled <- struct{}{}
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		leaseRenewed: make(chan *controlv1.RenewLeaseRequest, 1), leaseRenewal: &controlv1.RenewLeaseResponse{Renewed: false},
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/v1/responses", UpstreamMethod: http.MethodPost,
			MappedModel: "gpt-upstream", TransportProfile: "standard", ProtocolProfile: "passthrough", MaxAttempts: 1,
			UpstreamHeaders: map[string]string{"Content-Type": "application/json", "Accept": "text/event-stream"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "lease-revocation-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, LeaseRenewInterval: 5 * time.Millisecond,
		SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = caddy.Stop() }()

	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/responses", strings.NewReader(`{"model":"gpt-client","stream":true,"input":"hello"}`))
	request.Header.Set("Authorization", "Bearer client-key")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.ReadAll(response.Body)
	_ = response.Body.Close()
	select {
	case <-upstreamStarted:
	case <-time.After(3 * time.Second):
		t.Fatal("upstream did not start")
	}
	select {
	case renewed := <-control.leaseRenewed:
		if renewed.GetRequestId() == "" || renewed.GetLeaseId() != "lease-e2e" {
			t.Fatalf("lease renewal = %+v", renewed)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("lease renewal was not observed")
	}
	select {
	case <-upstreamCancelled:
	case <-time.After(3 * time.Second):
		t.Fatal("revoked lease did not cancel upstream")
	}
	select {
	case settled := <-control.settled:
		if settled.GetClientCancelled() || settled.GetUpstream().GetErrorCode() != "lease_renewal_rejected" || settled.GetUpstream().GetAttempts() != 1 || settled.GetUsage().GetInputTokens() != 2 || settled.GetUsage().GetOutputTokens() != 1 {
			t.Fatalf("revoked lease settlement = %+v", settled)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("revoked lease settlement was not observed")
	}
}

func TestCaddyDataPlaneConnectsToControlPlaneWithMutualTLS(t *testing.T) {
	certs := generateMTLSCertificates(t)
	serverCertificate, err := tls.LoadX509KeyPair(certs.serverCert, certs.serverKey)
	if err != nil {
		t.Fatalf("load server keypair: %v", err)
	}
	caPEM, err := os.ReadFile(certs.ca)
	if err != nil {
		t.Fatalf("read CA: %v", err)
	}
	clientCAs := x509.NewCertPool()
	if !clientCAs.AppendCertsFromPEM(caPEM) {
		t.Fatal("parse client CA")
	}

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("control listen: %v", err)
	}
	control := &controlServer{opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1)}
	grpcServer := grpc.NewServer(grpc.Creds(credentials.NewTLS(&tls.Config{
		MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{serverCertificate},
		ClientAuth: tls.RequireAndVerifyClientCert, ClientCAs: clientCAs,
	})))
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "data-plane-mtls",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: false,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 2 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
		TLSCAFile: certs.ca, TLSCertFile: certs.clientCert, TLSKeyFile: certs.clientKey,
		TLSServerName: "sup2api-control",
	})
	if err != nil {
		t.Fatalf("CaddyConfig: %v", err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatalf("load Caddy with mTLS control plane: %v", err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	response, err := http.Get("http://" + gatewayAddress + "/readyz")
	if err != nil {
		t.Fatalf("readiness request: %v", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(response.Body)
		t.Fatalf("readiness status=%d body=%s", response.StatusCode, body)
	}
}

func TestCaddyDataPlaneExecutesVertexAnthropicProtocolPlugin(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/v1/projects/project/locations/us-east5/publishers/anthropic/models/claude-upstream:streamRawPredict" {
			t.Errorf("upstream path = %q", request.URL.Path)
		}
		if request.Header.Get("Authorization") != "Bearer vertex-token" {
			t.Errorf("upstream authorization = %q", request.Header.Get("Authorization"))
		}
		if request.Header.Get("anthropic-beta") != "interleaved-thinking-2025-05-14" {
			t.Errorf("upstream beta = %q", request.Header.Get("anthropic-beta"))
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("anthropic-version") != "" {
			t.Errorf("forbidden upstream headers cookie=%q version=%q", request.Header.Get("Cookie"), request.Header.Get("anthropic-version"))
		}
		if request.Header.Get("X-Forwarded-For") != "" || request.Header.Get("X-Forwarded-Host") != "" {
			t.Errorf("client address metadata leaked upstream: %v", request.Header)
		}
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Errorf("read upstream body: %v", err)
		}
		if strings.Contains(string(body), `"model"`) || strings.Contains(string(body), `"context_management"`) {
			t.Errorf("untransformed Vertex body = %s", body)
		}
		if !strings.Contains(string(body), `"anthropic_version":"vertex-2023-10-16"`) {
			t.Errorf("missing Vertex version body = %s", body)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":3}}}\n\n")
		_, _ = io.WriteString(w, "data: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":2}}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("control listen: %v", err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl:    upstream.URL + "/v1/projects/project/locations/us-east5/publishers/anthropic/models/claude-upstream:streamRawPredict",
			UpstreamMethod: http.MethodPost, MappedModel: "claude-upstream",
			TransportProfile: "standard", ProtocolProfile: "vertex_anthropic",
			UpstreamHeaders: map[string]string{"Authorization": "Bearer vertex-token", "Content-Type": "application/json", "anthropic-beta": "interleaved-thinking-2025-05-14"},
			ProtocolOptions: map[string]string{"anthropic_version": "vertex-2023-10-16", "anthropic_beta": "interleaved-thinking-2025-05-14"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "vertex-anthropic-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 2 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatalf("CaddyConfig: %v", err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatalf("load Caddy: %v", err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	body := `{"model":"claude-client","stream":true,"context_management":{"edits":[]},"messages":[{"role":"user","content":"hello"}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/messages", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-key")
	request.Header.Set("Anthropic-Beta", "interleaved-thinking-2025-05-14,unsupported-beta")
	request.Header.Set("Cookie", "do-not-forward=1")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("data-plane request: %v", err)
	}
	_, _ = io.Copy(io.Discard, response.Body)
	_ = response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("response status = %d", response.StatusCode)
	}
	select {
	case settled := <-control.settled:
		if settled.GetUsage().GetInputTokens() != 3 || settled.GetUsage().GetOutputTokens() != 2 {
			t.Fatalf("settled usage = %+v", settled.GetUsage())
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Vertex Anthropic settlement was not observed")
	}
}

func TestCaddyDataPlaneExecutesAnthropicOAuthPassthroughPlugin(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/v1/messages" || request.URL.Query().Get("beta") != "true" {
			t.Errorf("upstream URL = %q", request.URL.String())
		}
		if got := request.Header.Get("Authorization"); got != "Bearer short-lived-oauth-token" {
			t.Errorf("upstream authorization = %q", got)
		}
		if got := request.Header.Get("anthropic-beta"); got != "claude-code-20250219,oauth-2025-04-20" {
			t.Errorf("upstream beta = %q", got)
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("X-Untrusted-Client-Header") != "" {
			t.Errorf("untrusted client headers leaked: %v", request.Header)
		}
		if request.Header.Get("X-Forwarded-For") != "" || request.Header.Get("X-Forwarded-Host") != "" {
			t.Errorf("client address metadata leaked upstream: %v", request.Header)
		}
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Errorf("read upstream body: %v", err)
		}
		if !strings.Contains(string(body), `"model":"claude-upstream"`) || !strings.Contains(string(body), `"metadata"`) {
			t.Errorf("OAuth passthrough body = %s", body)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":5}}}\n\n")
		_, _ = io.WriteString(w, "data: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":3}}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("control listen: %v", err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/v1/messages?beta=true", UpstreamMethod: http.MethodPost,
			MappedModel: "claude-upstream", TransportProfile: "standard", ProtocolProfile: "anthropic_oauth",
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer short-lived-oauth-token", "Content-Type": "application/json",
				"Accept": "application/json", "anthropic-version": "2023-06-01",
				"anthropic-beta": "claude-code-20250219,oauth-2025-04-20",
			},
			ProtocolOptions: map[string]string{"client_mode": "claude_code_passthrough"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "anthropic-oauth-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 2 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatalf("CaddyConfig: %v", err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatalf("load Caddy: %v", err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	metadataID := "user_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef_account__session_12345678-1234-1234-1234-123456789abc"
	body := `{"model":"claude-client","stream":true,"metadata":{"user_id":"` + metadataID + `"},"messages":[{"role":"user","content":"hello"}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/messages", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-api-key")
	request.Header.Set("User-Agent", "claude-cli/2.1.220 (external, cli)")
	request.Header.Set("X-Stainless-Lang", "js")
	request.Header.Set("Anthropic-Beta", "client-beta")
	request.Header.Set("Cookie", "do-not-forward=1")
	request.Header.Set("X-Untrusted-Client-Header", "do-not-forward")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("data-plane request: %v", err)
	}
	_, _ = io.Copy(io.Discard, response.Body)
	_ = response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("response status = %d", response.StatusCode)
	}

	select {
	case opened := <-control.opened:
		if opened.GetAnthropicMetadataUserId() != metadataID || opened.GetUserAgent() != "claude-cli/2.1.220 (external, cli)" {
			t.Fatalf("Anthropic OAuth admission metadata = %+v", opened)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Anthropic OAuth OpenRequest RPC was not observed")
	}
	select {
	case settled := <-control.settled:
		if settled.GetUsage().GetInputTokens() != 5 || settled.GetUsage().GetOutputTokens() != 3 {
			t.Fatalf("settled usage = %+v", settled.GetUsage())
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Anthropic OAuth settlement was not observed")
	}
}

func TestCaddyDataPlaneExecutesAnthropicOAuthMimicPlugin(t *testing.T) {
	aliasSeen := make(chan string, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Authorization") != "Bearer short-lived-mimic-token" {
			t.Errorf("authorization = %q", request.Header.Get("Authorization"))
		}
		if got := request.Header.Get("User-Agent"); got != "claude-cli/2.1.220 (external, cli)" {
			t.Errorf("mimic user agent = %q", got)
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("X-Forwarded-For") != "" || request.Header.Get("X-Untrusted") != "" {
			t.Errorf("client metadata leaked upstream: %v", request.Header)
		}
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Errorf("read body: %v", err)
		}
		var decoded struct {
			Model  string `json:"model"`
			System []struct {
				Text string `json:"text"`
			} `json:"system"`
			Metadata struct {
				UserID string `json:"user_id"`
			} `json:"metadata"`
			Tools []struct {
				Name string `json:"name"`
			} `json:"tools"`
			Temperature float64 `json:"temperature"`
			MaxTokens   int     `json:"max_tokens"`
		}
		if err := json.Unmarshal(body, &decoded); err != nil {
			t.Errorf("decode mimic body: %v body=%s", err, body)
		}
		if decoded.Model != "claude-upstream" || len(decoded.System) != 3 || !strings.HasPrefix(decoded.System[0].Text, "x-anthropic-billing-header") {
			t.Errorf("mimic body model=%q system=%+v", decoded.Model, decoded.System)
		}
		if decoded.Metadata.UserID == "" || decoded.Temperature != 1 || decoded.MaxTokens != 128000 || len(decoded.Tools) != 1 {
			t.Errorf("mimic defaults metadata=%q temperature=%v max=%d tools=%+v", decoded.Metadata.UserID, decoded.Temperature, decoded.MaxTokens, decoded.Tools)
		}
		aliasSeen <- decoded.Tools[0].Name
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":7}}}\n\n")
		_, _ = io.WriteString(w, "data: {\"type\":\"content_block_start\",\"content_block\":{\"type\":\"tool_use\",\"name\":\""+decoded.Tools[0].Name+"\"}}\n\n")
		_, _ = io.WriteString(w, "data: {\"type\":\"message_delta\",\"usage\":{\"output_tokens\":4}}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/v1/messages?beta=true", UpstreamMethod: http.MethodPost,
			MappedModel: "claude-upstream", TransportProfile: "standard", ProtocolProfile: "anthropic_oauth",
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer short-lived-mimic-token", "Content-Type": "application/json",
				"Accept": "application/json", "User-Agent": "claude-cli/2.1.220 (external, cli)",
				"anthropic-version": "2023-06-01", "anthropic-beta": "claude-code-20250219,oauth-2025-04-20",
			},
			ProtocolOptions: map[string]string{
				"client_mode": "mimic", "anthropic_beta": "claude-code-20250219,oauth-2025-04-20",
				"account_id": "42", "claude_user_id": strings.Repeat("c", 64), "normalize_dateline": "true",
			},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "anthropic-oauth-mimic-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 2 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	body := `{"model":"claude-client","stream":true,"system":"Project rules","tools":[{"name":"sessions_list","input_schema":{"type":"object"}}],"messages":[{"role":"user","content":"hello"}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/messages", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-key")
	request.Header.Set("User-Agent", "third-party-client/1.0")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("X-Untrusted", "secret")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	responseBody, err := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if err != nil || response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s err=%v", response.StatusCode, responseBody, err)
	}
	alias := <-aliasSeen
	if alias == "sessions_list" || !strings.Contains(string(responseBody), `"name":"sessions_list"`) || strings.Contains(string(responseBody), `"name":"`+alias+`"`) {
		t.Fatalf("tool alias=%q response=%s", alias, responseBody)
	}
	select {
	case settled := <-control.settled:
		if settled.GetUsage().GetInputTokens() != 7 || settled.GetUsage().GetOutputTokens() != 4 {
			t.Fatalf("settled usage = %+v", settled.GetUsage())
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Anthropic OAuth mimic settlement was not observed")
	}
}

func TestCaddyDataPlaneExecutesOpenAICodexOAuthPluginAndSettlesUsage(t *testing.T) {
	large := strings.Repeat("A", 2<<20)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/backend-api/codex/responses" {
			t.Errorf("upstream URL = %q", request.URL.String())
		}
		if request.Header.Get("Authorization") != "Bearer short-lived-openai-token" || request.Header.Get("Chatgpt-Account-Id") != "chatgpt-account" {
			t.Errorf("authority headers = %v", request.Header)
		}
		if request.Header.Get("Originator") != "codex_cli_rs" || !strings.HasPrefix(request.Header.Get("User-Agent"), "codex_cli_rs/") {
			t.Errorf("Codex identity headers = %v", request.Header)
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("X-Forwarded-For") != "" || request.Header.Get("X-Untrusted") != "" {
			t.Errorf("client secrets or address metadata leaked upstream: %v", request.Header)
		}
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Errorf("read upstream body: %v", err)
		}
		var decoded map[string]any
		if err := json.Unmarshal(body, &decoded); err != nil {
			t.Errorf("decode upstream body: %v", err)
		}
		if decoded["model"] != "gpt-5.4" || decoded["store"] != false || decoded["stream"] != true {
			t.Errorf("Codex body core fields = %+v", decoded)
		}
		if _, exists := decoded["metadata"]; exists {
			t.Errorf("unsupported metadata reached upstream")
		}
		input := decoded["input"].([]any)
		if input[0].(map[string]any)["image_url"] != "data:image/png;base64,"+large {
			t.Errorf("large multimodal value changed")
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"type\":\"response.completed\",\"response\":{\"usage\":{\"input_tokens\":11,\"output_tokens\":6,\"input_tokens_details\":{\"cached_tokens\":4},\"output_tokens_details\":{\"reasoning_tokens\":2}}}}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/backend-api/codex/responses", UpstreamMethod: http.MethodPost,
			MappedModel: "gpt-5.4", TransportProfile: "standard", ProtocolProfile: "openai_codex",
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer short-lived-openai-token", "Content-Type": "application/json",
				"Accept": "text/event-stream", "Chatgpt-Account-Id": "chatgpt-account",
				"OpenAI-Beta": "responses=experimental", "Originator": "codex_cli_rs",
				"User-Agent": "codex_cli_rs/0.144.1 (Ubuntu 22.4.0; x86_64) xterm-256color", "Version": "0.144.1",
			},
			ProtocolOptions: map[string]string{"compact": "false", "device_id": "device-e2e", "default_instructions": "default Codex instructions"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "openai-codex-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 5 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 8 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	body := `{"model":"gpt-client","stream":true,"metadata":{"private":"drop"},"input":[{"type":"input_image","image_url":"data:image/png;base64,` + large + `"}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/responses", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-api-key")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("X-Untrusted", "secret")
	request.Header.Set("User-Agent", "browser-client/1.0")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	responseBody, err := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if err != nil || response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s err=%v", response.StatusCode, responseBody, err)
	}

	select {
	case opened := <-control.opened:
		if opened.GetRequestedModel() != "gpt-client" || !opened.GetStream() || opened.GetRequestContentLength() <= 2<<20 {
			t.Fatalf("OpenAI Codex admission metadata = %+v", opened)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("OpenAI Codex OpenRequest RPC was not observed")
	}
	select {
	case settled := <-control.settled:
		usage := settled.GetUsage()
		if usage.GetInputTokens() != 11 || usage.GetOutputTokens() != 6 || usage.GetCacheReadTokens() != 4 || usage.GetReasoningTokens() != 2 {
			t.Fatalf("OpenAI Codex settled usage = %+v", usage)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("OpenAI Codex settlement was not observed")
	}
}

func TestCaddyDataPlaneExecutesGrokOAuthPluginAndRestoresClientToolStream(t *testing.T) {
	large := strings.Repeat("G", 2<<20)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/responses" || request.Method != http.MethodPost {
			t.Errorf("Grok upstream request = %s %s", request.Method, request.URL.String())
		}
		if request.Header.Get("Authorization") != "Bearer short-lived-grok-token" {
			t.Errorf("Grok bearer = %q", request.Header.Get("Authorization"))
		}
		if request.Header.Get("User-Agent") != "sub2api-grok/1.0" || request.Header.Get("X-Grok-Client-Version") != "0.2.93" || request.Header.Get("X-Grok-Client-Mode") != "interactive" {
			t.Errorf("Grok CLI identity = %v", request.Header)
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("X-Untrusted") != "" || request.Header.Get("X-Forwarded-For") != "" || request.Header.Get("X-Sup2API-Grok-Client-Tool-Cache") != "" || request.Header.Get("X-Sub2API-Grok-Client-Tool-Cache") != "" {
			t.Errorf("client headers leaked to Grok: %v", request.Header)
		}
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Errorf("read Grok request: %v", err)
		}
		var decoded map[string]any
		if err := json.Unmarshal(body, &decoded); err != nil {
			t.Errorf("decode Grok request: %v", err)
		}
		if decoded["model"] != "grok-4.5" || decoded["prompt_cache_key"] == "raw-client-session" || decoded["prompt_cache_key"] == "" {
			t.Errorf("Grok routing fields = %+v", decoded)
		}
		if decoded["input"] != large {
			t.Errorf("large Grok input changed: got %d bytes", len(fmt.Sprint(decoded["input"])))
		}
		if request.Header.Get("X-Grok-Conv-Id") != decoded["prompt_cache_key"] {
			t.Errorf("Grok cache header=%q body=%v", request.Header.Get("X-Grok-Conv-Id"), decoded["prompt_cache_key"])
		}
		tools, _ := decoded["tools"].([]any)
		if len(tools) < 3 {
			t.Errorf("Grok Free/client-tool cache route missing tools: %+v", tools)
		} else {
			custom, _ := tools[0].(map[string]any)
			if custom["type"] != "function" || custom["name"] != "exec" || custom["format"] != nil {
				t.Errorf("Grok custom tool not lowered: %+v", custom)
			}
		}

		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "event: response.output_item.added\ndata: {\"type\":\"response.output_item.added\",\"sequence_number\":0,\"output_index\":0,\"item\":{\"type\":\"function_call\",\"id\":\"item_1\",\"call_id\":\"call_1\",\"name\":\"exec\",\"arguments\":\"\"}}\n\n")
		_, _ = io.WriteString(w, "event: response.function_call_arguments.delta\ndata: {\"type\":\"response.function_call_arguments.delta\",\"sequence_number\":1,\"output_index\":0,\"item_id\":\"item_1\",\"delta\":\"{\\\"input\\\":\\\"echo hi\\\"}\"}\n\n")
		_, _ = io.WriteString(w, "event: response.function_call_arguments.done\ndata: {\"type\":\"response.function_call_arguments.done\",\"sequence_number\":2,\"output_index\":0,\"item_id\":\"item_1\",\"arguments\":\"{\\\"input\\\":\\\"echo hi\\\"}\"}\n\n")
		_, _ = io.WriteString(w, "event: response.output_item.done\ndata: {\"type\":\"response.output_item.done\",\"sequence_number\":3,\"output_index\":0,\"item\":{\"type\":\"function_call\",\"id\":\"item_1\",\"call_id\":\"call_1\",\"name\":\"exec\",\"arguments\":\"{\\\"input\\\":\\\"echo hi\\\"}\"}}\n\n")
		_, _ = io.WriteString(w, "event: response.completed\ndata: {\"type\":\"response.completed\",\"sequence_number\":4,\"response\":{\"id\":\"resp_grok\",\"output\":[{\"type\":\"function_call\",\"id\":\"item_1\",\"call_id\":\"call_1\",\"name\":\"exec\",\"arguments\":\"{\\\"input\\\":\\\"echo hi\\\"}\"}],\"usage\":{\"input_tokens\":17,\"output_tokens\":8,\"input_tokens_details\":{\"cached_tokens\":6},\"output_tokens_details\":{\"reasoning_tokens\":3}}}}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/responses", UpstreamMethod: http.MethodPost,
			MappedModel: "grok-4.5", TransportProfile: "standard", ProtocolProfile: "grok", MaxAttempts: 2,
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer short-lived-grok-token", "Content-Type": "application/json",
				"Accept": "application/json, text/event-stream", "User-Agent": "sub2api-grok/1.0",
				"X-Grok-Client-Version": "0.2.93", "X-Grok-Client-Mode": "interactive",
			},
			ProtocolOptions: map[string]string{"compact": "false", "known_free_account": "true", "allow_client_tool_cache": "true"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "grok-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	body := `{"model":"grok-client","stream":true,"prompt_cache_key":"raw-client-session","input":` + strconv.Quote(large) + `,"tools":[{"type":"custom","name":"exec","format":{"type":"grammar"}}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/responses", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-api-key")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("X-Untrusted", "secret")
	request.Header.Set("X-Sup2API-Grok-Client-Tool-Cache", "true")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	responseBody, err := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if err != nil || response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s err=%v", response.StatusCode, responseBody, err)
	}
	text := string(responseBody)
	if !strings.Contains(text, "response.custom_tool_call_input.done") || !strings.Contains(text, `"type":"custom_tool_call"`) || strings.Contains(text, "response.function_call_arguments") {
		t.Fatalf("Grok restored stream = %s", text)
	}
	select {
	case opened := <-control.opened:
		if opened.GetRequestedModel() != "grok-client" || !opened.GetStream() || opened.GetRequestContentLength() <= 2<<20 {
			t.Fatalf("Grok admission metadata = %+v", opened)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Grok OpenRequest RPC was not observed")
	}
	select {
	case settled := <-control.settled:
		usage := settled.GetUsage()
		if usage.GetInputTokens() != 17 || usage.GetOutputTokens() != 8 || usage.GetCacheReadTokens() != 6 || usage.GetReasoningTokens() != 3 {
			t.Fatalf("Grok settled usage = %+v", usage)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Grok settlement was not observed")
	}
}

func TestCaddyDataPlaneEmulatesGrokResponsesCompact(t *testing.T) {
	var attempts atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/responses" {
			t.Errorf("Grok compact was sent to %q", request.URL.Path)
		}
		payload, _ := io.ReadAll(request.Body)
		var decoded map[string]any
		if err := json.Unmarshal(payload, &decoded); err != nil {
			t.Errorf("decode Grok compact request: %v", err)
		}
		if decoded["stream"] != false || decoded["store"] != false || decoded["prompt_cache_key"] != nil {
			t.Errorf("Grok compact request flags = %+v", decoded)
		}
		input, _ := decoded["input"].([]any)
		if len(input) < 2 || !strings.Contains(fmt.Sprint(input[len(input)-1]), "Primary Request and Intent") {
			t.Errorf("Grok compact prompt missing: %+v", input)
		}
		attempt := attempts.Add(1)
		hasEncrypted := bytes.Contains(payload, []byte(`"encrypted_content":"foreign-encrypted"`))
		if attempt == 1 {
			if !hasEncrypted {
				t.Errorf("first Grok compact attempt did not contain prior encrypted reasoning: %s", payload)
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_, _ = io.WriteString(w, `{"code":"invalid-argument","error":"Could not decrypt the provided encrypted_content."}`)
			return
		}
		if hasEncrypted {
			t.Errorf("Grok compact retry retained rejected encrypted reasoning: %s", payload)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"id":"resp_compact","status":"completed","output_text":"remove","usage":{"input_tokens":5,"output_tokens":2},"output":[{"type":"reasoning","encrypted_content":"grok-encrypted"},{"type":"message","content":[{"type":"output_text","text":"compact summary"}]}]}`)
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/responses", UpstreamMethod: http.MethodPost,
			MappedModel: "grok-4.5", TransportProfile: "standard", ProtocolProfile: "grok", MaxAttempts: 2,
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer short-lived-grok-token", "Content-Type": "application/json",
				"Accept": "application/json", "User-Agent": "sub2api-grok/1.0",
				"X-Grok-Client-Version": "0.2.93", "X-Grok-Client-Mode": "interactive",
			},
			ProtocolOptions: map[string]string{"compact": "true", "known_free_account": "true", "allow_client_tool_cache": "true"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "grok-compact-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/responses/compact", strings.NewReader(`{"model":"grok-client","prompt_cache_key":"raw-secret","input":[{"type":"compaction","encrypted_content":"foreign-encrypted","summary":[{"type":"summary_text","text":"prior summary"}]},{"role":"user","content":"hello"}]}`))
	request.Header.Set("Authorization", "Bearer client-api-key")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	responseBody, err := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if err != nil || response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s err=%v", response.StatusCode, responseBody, err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(responseBody, &decoded); err != nil {
		t.Fatalf("decode compact response: %v: %s", err, responseBody)
	}
	output := decoded["output"].([]any)
	item := output[0].(map[string]any)
	if item["type"] != "compaction" || item["encrypted_content"] != "grok-encrypted" || decoded["output_text"] != nil {
		t.Fatalf("Grok compact response = %s", responseBody)
	}
	select {
	case settled := <-control.settled:
		if settled.GetUsage().GetInputTokens() != 5 || settled.GetUsage().GetOutputTokens() != 2 || settled.GetUpstream().GetAttempts() != 2 || attempts.Load() != 2 {
			t.Fatalf("Grok compact settlement = %+v", settled.GetUsage())
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Grok compact settlement was not observed")
	}
}

func TestCaddyDataPlaneExecutesGeminiCodeAssistOAuthAndAggregatesUsage(t *testing.T) {
	large := strings.Repeat("M", 2<<20)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/v1internal:streamGenerateContent" || request.URL.Query().Get("alt") != "sse" {
			t.Errorf("Code Assist URL = %q", request.URL.String())
		}
		if request.Header.Get("Authorization") != "Bearer short-lived-gemini-token" || request.Header.Get("User-Agent") != "GeminiCLI/0.1.5 (Windows; AMD64)" {
			t.Errorf("Code Assist authority headers = %v", request.Header)
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("X-Untrusted") != "" || request.Header.Get("X-Forwarded-For") != "" {
			t.Errorf("client headers leaked to Code Assist: %v", request.Header)
		}
		payload, err := io.ReadAll(request.Body)
		if err != nil {
			t.Errorf("read Code Assist body: %v", err)
		}
		var envelope map[string]any
		if err := json.Unmarshal(payload, &envelope); err != nil {
			t.Errorf("decode Code Assist body: %v", err)
		}
		if envelope["model"] != "gemini-3.1-pro-preview" || envelope["project"] != "project-e2e" {
			t.Errorf("Code Assist envelope = %+v", envelope)
		}
		inner, _ := envelope["request"].(map[string]any)
		contents, _ := inner["contents"].([]any)
		if len(contents) != 1 {
			t.Errorf("empty Gemini content was not filtered: %+v", contents)
		} else {
			parts := contents[0].(map[string]any)["parts"].([]any)
			if parts[0].(map[string]any)["text"] != large {
				t.Errorf("large Gemini text changed")
			}
			if parts[1].(map[string]any)["thoughtSignature"] != "skip_thought_signature_validator" {
				t.Errorf("Gemini functionCall signature missing: %+v", parts)
			}
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"response\":{\"candidates\":[{\"content\":{\"role\":\"model\",\"parts\":[{\"text\":\"hel\"}]}}]}}\n\n")
		_, _ = io.WriteString(w, "data: {\"response\":{\"candidates\":[{\"content\":{\"role\":\"model\",\"parts\":[{\"text\":\"lo\"}]}}]}}\n\n")
		_, _ = io.WriteString(w, "data: {\"response\":{\"usageMetadata\":{\"promptTokenCount\":12,\"candidatesTokenCount\":5,\"cachedContentTokenCount\":3,\"thoughtsTokenCount\":2}}}\n\n")
		_, _ = io.WriteString(w, "data: [DONE]\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/v1internal:streamGenerateContent?alt=sse", UpstreamMethod: http.MethodPost,
			MappedModel: "gemini-3.1-pro-preview", TransportProfile: "standard", ProtocolProfile: "gemini_oauth", MaxAttempts: 1,
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer short-lived-gemini-token", "Content-Type": "application/json",
				"Accept": "text/event-stream", "User-Agent": "GeminiCLI/0.1.5 (Windows; AMD64)",
			},
			ProtocolOptions: map[string]string{
				"mode": "code_assist", "project_id": "project-e2e", "action": "generateContent",
				"upstream_stream": "true", "aggregate_stream": "true", "count_tokens": "false",
			},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "gemini-code-assist-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	body := `{"contents":[{"role":"user","parts":[]},{"role":"model","parts":[{"text":` + strconv.Quote(large) + `},{"functionCall":{"name":"lookup","args":{}}}]}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1beta/models/gemini-3.1-pro-preview:generateContent", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-key")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("X-Untrusted", "secret")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	responseBody, err := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if err != nil || response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s err=%v", response.StatusCode, responseBody, err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(responseBody, &decoded); err != nil {
		t.Fatalf("decode Gemini response: %v body=%s", err, responseBody)
	}
	parts := decoded["candidates"].([]any)[0].(map[string]any)["content"].(map[string]any)["parts"].([]any)
	if parts[0].(map[string]any)["text"] != "hello" {
		t.Fatalf("aggregated Gemini response = %s", responseBody)
	}
	select {
	case opened := <-control.opened:
		if opened.GetRequestedModel() != "gemini-3.1-pro-preview" || opened.GetStream() || opened.GetRequestContentLength() <= 2<<20 {
			t.Fatalf("Gemini admission metadata = %+v", opened)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Gemini OpenRequest RPC was not observed")
	}
	select {
	case settled := <-control.settled:
		usage := settled.GetUsage()
		if usage.GetInputTokens() != 12 || usage.GetOutputTokens() != 5 || usage.GetCacheReadTokens() != 3 || usage.GetReasoningTokens() != 2 {
			t.Fatalf("Gemini settled usage = %+v", usage)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Gemini settlement was not observed")
	}
}

func TestCaddyDataPlaneExecutesAntigravityGeminiAndAggregatesUsage(t *testing.T) {
	large := strings.Repeat("A", 2<<20)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/v1internal:streamGenerateContent" || request.URL.Query().Get("alt") != "sse" {
			t.Errorf("Antigravity URL = %q", request.URL.String())
		}
		if request.Header.Get("Authorization") != "Bearer short-lived-antigravity-token" || request.Header.Get("User-Agent") != "antigravity/1.23.2 windows/amd64" {
			t.Errorf("Antigravity authority headers = %v", request.Header)
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("X-Untrusted") != "" || request.Header.Get("X-Forwarded-For") != "" || request.Header.Get("X-Goog-Api-Key") != "" {
			t.Errorf("client headers leaked to Antigravity: %v", request.Header)
		}
		payload, err := io.ReadAll(request.Body)
		if err != nil {
			t.Errorf("read Antigravity body: %v", err)
		}
		var envelope map[string]any
		if err := json.Unmarshal(payload, &envelope); err != nil {
			t.Errorf("decode Antigravity body: %v", err)
		}
		if envelope["model"] != "gemini-3.1-pro-high" || envelope["project"] != "antigravity-project" || envelope["userAgent"] != "antigravity" || envelope["requestType"] != "agent" {
			t.Errorf("Antigravity envelope = %+v", envelope)
		}
		inner, _ := envelope["request"].(map[string]any)
		contents, _ := inner["contents"].([]any)
		if len(contents) != 1 {
			t.Errorf("empty Antigravity content was not filtered: %+v", contents)
		} else if parts := contents[0].(map[string]any)["parts"].([]any); parts[0].(map[string]any)["text"] != large || parts[1].(map[string]any)["thoughtSignature"] != "skip_thought_signature_validator" {
			t.Errorf("Antigravity content changed: %+v", parts)
		}
		system, _ := inner["systemInstruction"].(map[string]any)
		if !strings.Contains(fmt.Sprint(system), "You are Antigravity") {
			t.Errorf("Antigravity identity patch missing: %+v", system)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"response\":{\"candidates\":[{\"content\":{\"role\":\"model\",\"parts\":[{\"text\":\"sup\"}]}}]}}\n\n")
		_, _ = io.WriteString(w, "data: {\"response\":{\"candidates\":[{\"content\":{\"role\":\"model\",\"parts\":[{\"text\":\"2api\"}]}}]}}\n\n")
		_, _ = io.WriteString(w, "data: {\"response\":{\"usageMetadata\":{\"promptTokenCount\":21,\"candidatesTokenCount\":8,\"cachedContentTokenCount\":4,\"thoughtsTokenCount\":3}}}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/v1internal:streamGenerateContent?alt=sse", UpstreamMethod: http.MethodPost,
			MappedModel: "gemini-3.1-pro-high", TransportProfile: "standard", ProtocolProfile: "antigravity", MaxAttempts: 1,
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer short-lived-antigravity-token", "Content-Type": "application/json",
				"Accept": "text/event-stream", "User-Agent": "antigravity/1.23.2 windows/amd64",
			},
			ProtocolOptions: map[string]string{
				"mode": "native_gemini", "project_id": "antigravity-project", "action": "generateContent",
				"upstream_stream": "true", "aggregate_stream": "true", "count_tokens": "false",
			},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "antigravity-gemini-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	body := `{"contents":[{"role":"user","parts":[]},{"role":"model","parts":[{"text":` + strconv.Quote(large) + `},{"functionCall":{"name":"lookup","args":{}}}]}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1beta/models/gemini-client:generateContent", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-key")
	request.Header.Set("X-Goog-Api-Key", "client-google-key")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("X-Untrusted", "secret")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	responseBody, err := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if err != nil || response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s err=%v", response.StatusCode, responseBody, err)
	}
	if !bytes.Contains(responseBody, []byte(`"text":"sup2api"`)) {
		t.Fatalf("aggregated Antigravity response = %s", responseBody)
	}
	select {
	case opened := <-control.opened:
		if opened.GetRequestedModel() != "gemini-client" || opened.GetStream() || opened.GetRequestContentLength() <= 2<<20 {
			t.Fatalf("Antigravity admission metadata = %+v", opened)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Antigravity OpenRequest RPC was not observed")
	}
	select {
	case settled := <-control.settled:
		usage := settled.GetUsage()
		if usage.GetInputTokens() != 21 || usage.GetOutputTokens() != 8 || usage.GetCacheReadTokens() != 4 || usage.GetReasoningTokens() != 3 {
			t.Fatalf("Antigravity settled usage = %+v", usage)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Antigravity settlement was not observed")
	}
}

func TestCaddyDataPlaneExecutesAntigravityClaudeStreamAndSettlesUsage(t *testing.T) {
	large := strings.Repeat("C", 2<<20)
	var attempts atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/v1internal:streamGenerateContent" || request.URL.Query().Get("alt") != "sse" {
			t.Errorf("Antigravity Claude URL = %q", request.URL.String())
		}
		if request.Header.Get("Authorization") != "Bearer short-lived-antigravity-claude-token" || request.Header.Get("User-Agent") != "antigravity/1.23.2 windows/amd64" {
			t.Errorf("Antigravity Claude authority headers = %v", request.Header)
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("X-Untrusted") != "" || request.Header.Get("X-Forwarded-For") != "" || request.Header.Get("X-Api-Key") != "" || request.Header.Get("Anthropic-Beta") != "" {
			t.Errorf("client headers leaked to Antigravity Claude: %v", request.Header)
		}
		payload, err := io.ReadAll(request.Body)
		if err != nil {
			t.Errorf("read Antigravity Claude body: %v", err)
		}
		if bytes.Contains(payload, []byte("private-client-session")) {
			t.Errorf("client metadata leaked to Antigravity Claude")
		}
		attempt := attempts.Add(1)
		if attempt == 1 {
			if !bytes.Contains(payload, []byte("thoughtSignature")) {
				t.Errorf("first Antigravity Claude attempt did not contain prior thinking signature")
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_, _ = io.WriteString(w, `{"error":{"message":"invalid thought_signature"}}`)
			return
		}
		if bytes.Contains(payload, []byte("thoughtSignature")) || bytes.Contains(payload, []byte(`"thought":true`)) {
			t.Errorf("Antigravity Claude signature retry retained sensitive thinking: %s", payload)
		}
		var envelope map[string]any
		if err := json.Unmarshal(payload, &envelope); err != nil {
			t.Errorf("decode Antigravity Claude body: %v", err)
		}
		if envelope["model"] != "claude-sonnet-4-5-thinking" || envelope["project"] != "antigravity-claude-project" || envelope["requestType"] != "agent" {
			t.Errorf("Antigravity Claude envelope = %+v", envelope)
		}
		inner, _ := envelope["request"].(map[string]any)
		if !strings.Contains(fmt.Sprint(inner["systemInstruction"]), "You are Antigravity") || !strings.Contains(fmt.Sprint(inner["contents"]), large[:1024]) {
			t.Errorf("Antigravity Claude request transform incomplete")
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"response\":{\"responseId\":\"claude-e2e\",\"candidates\":[{\"content\":{\"parts\":[{\"thought\":true,\"text\":\"considering\",\"thoughtSignature\":\"sig-e2e\"},{\"text\":\"hello\"}]}}]}}\n\n")
		_, _ = io.WriteString(w, "data: {\"response\":{\"candidates\":[{\"finishReason\":\"STOP\"}],\"usageMetadata\":{\"promptTokenCount\":13,\"cachedContentTokenCount\":3,\"candidatesTokenCount\":4,\"thoughtsTokenCount\":2}}}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/v1internal:streamGenerateContent?alt=sse", UpstreamMethod: http.MethodPost,
			MappedModel: "claude-sonnet-4-5", TransportProfile: "standard", ProtocolProfile: "antigravity", MaxAttempts: 2,
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer short-lived-antigravity-claude-token", "Content-Type": "application/json",
				"Accept": "text/event-stream", "User-Agent": "antigravity/1.23.2 windows/amd64",
			},
			ProtocolOptions: map[string]string{
				"mode": "claude", "project_id": "antigravity-claude-project", "action": "messages",
				"client_stream": "true", "upstream_stream": "true", "aggregate_stream": "false", "count_tokens": "false",
			},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "antigravity-claude-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	body := `{"model":"claude-client","stream":true,"max_tokens":1024,"thinking":{"type":"enabled","budget_tokens":512},"metadata":{"user_id":"private-client-session"},"messages":[{"role":"user","content":[{"type":"text","text":` + strconv.Quote(large) + `}]},{"role":"assistant","content":[{"type":"thinking","thinking":"prior reasoning","signature":"bad-signature"},{"type":"text","text":"continue"}]},{"role":"user","content":[{"type":"text","text":"finish"}]}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/messages", strings.NewReader(body))
	request.Header.Set("X-Api-Key", "client-api-key")
	request.Header.Set("Anthropic-Version", "2023-06-01")
	request.Header.Set("Anthropic-Beta", "private-beta")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("X-Untrusted", "secret")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	responseBody, err := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if err != nil || response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s err=%v", response.StatusCode, responseBody, err)
	}
	text := string(responseBody)
	for _, event := range []string{"event: message_start", "event: content_block_start", "event: content_block_delta", "event: message_delta", "event: message_stop"} {
		if !strings.Contains(text, event) {
			t.Fatalf("missing %q in Antigravity Claude response: %s", event, text)
		}
	}
	if !strings.Contains(text, "considering") || !strings.Contains(text, "hello") {
		t.Fatalf("Antigravity Claude response = %s", text)
	}
	select {
	case opened := <-control.opened:
		if opened.GetRequestedModel() != "claude-client" || !opened.GetStream() || opened.GetRequestContentLength() <= 2<<20 {
			t.Fatalf("Antigravity Claude admission metadata = %+v", opened)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Antigravity Claude OpenRequest RPC was not observed")
	}
	select {
	case settled := <-control.settled:
		usage := settled.GetUsage()
		if usage.GetInputTokens() != 10 || usage.GetOutputTokens() != 6 || usage.GetCacheReadTokens() != 3 || settled.GetUpstream().GetAttempts() != 2 || attempts.Load() != 2 {
			t.Fatalf("Antigravity Claude settled usage = %+v", usage)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Antigravity Claude settlement was not observed")
	}
}

func TestCaddyDataPlaneExecutesStrictAnthropicCustomUpstream(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/prefix/v1/messages" {
			t.Errorf("custom upstream URL = %q", request.URL.String())
		}
		if request.Header.Get("Authorization") != "Bearer relay-secret" || request.Header.Get("X-Api-Key") != "relay-secret" {
			t.Errorf("custom upstream credentials = %v", request.Header)
		}
		if request.Header.Get("Anthropic-Version") != "2023-06-01" || request.Header.Get("Anthropic-Beta") != "tool-beta" {
			t.Errorf("custom upstream policy headers = %v", request.Header)
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("X-Forwarded-For") != "" || request.Header.Get("X-Untrusted") != "" {
			t.Errorf("client headers leaked to custom upstream: %v", request.Header)
		}
		body, _ := io.ReadAll(request.Body)
		var decoded map[string]any
		if err := json.Unmarshal(body, &decoded); err != nil {
			t.Errorf("decode custom upstream body: %v", err)
		}
		if decoded["model"] != "claude-relay" || decoded["context_management"] != nil {
			t.Errorf("custom upstream body = %s", body)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg-relay\",\"type\":\"message\",\"role\":\"assistant\",\"model\":\"claude-relay\",\"content\":[],\"usage\":{\"input_tokens\":5,\"cache_read_input_tokens\":2,\"output_tokens\":0}}}\n\n")
		_, _ = io.WriteString(w, "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"ok\"}}\n\n")
		_, _ = io.WriteString(w, "event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":2}}\n\n")
		_, _ = io.WriteString(w, "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/prefix/v1/messages", UpstreamMethod: http.MethodPost,
			MappedModel: "claude-relay", TransportProfile: "standard", ProtocolProfile: "anthropic_upstream", MaxAttempts: 1,
			UpstreamHeaders: map[string]string{
				"Authorization": "Bearer relay-secret", "x-api-key": "relay-secret", "Content-Type": "application/json",
				"Accept": "application/json", "anthropic-version": "2023-06-01", "anthropic-beta": "tool-beta",
			},
			ProtocolOptions: map[string]string{"anthropic_beta": "tool-beta"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "anthropic-upstream-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = caddy.Stop() }()

	body := `{"model":"claude-client","stream":true,"context_management":{"edits":[]},"messages":[{"role":"user","content":"hello"}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/messages", strings.NewReader(body))
	request.Header.Set("X-Api-Key", "client-key")
	request.Header.Set("Anthropic-Beta", "client-beta")
	request.Header.Set("Cookie", "secret=1")
	request.Header.Set("X-Untrusted", "secret")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	responseBody, _ := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if response.StatusCode != http.StatusOK || !strings.Contains(string(responseBody), `"text":"ok"`) {
		t.Fatalf("status=%d body=%s", response.StatusCode, responseBody)
	}
	select {
	case settled := <-control.settled:
		usage := settled.GetUsage()
		if usage.GetInputTokens() != 5 || usage.GetOutputTokens() != 2 || usage.GetCacheReadTokens() != 2 {
			t.Fatalf("custom upstream settlement = %+v", usage)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("custom upstream settlement was not observed")
	}
}

func TestCaddyDataPlaneResponsesWebSocketSettlesEveryTurn(t *testing.T) {
	var upstreamCalls atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		call := upstreamCalls.Add(1)
		body, _ := io.ReadAll(request.Body)
		var decoded map[string]any
		if err := json.Unmarshal(body, &decoded); err != nil {
			t.Errorf("decode WS bridge body: %v", err)
		}
		if decoded["model"] != "gpt-upstream" || decoded["stream"] != true || decoded["type"] != nil {
			t.Errorf("WS bridge body = %s", body)
		}
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = fmt.Fprintf(w, "data: {\"type\":\"response.created\",\"response\":{\"id\":\"resp-%d\",\"model\":\"gpt-upstream\"}}\n\n", call)
		_, _ = fmt.Fprintf(w, "data: {\"type\":\"response.completed\",\"response\":{\"id\":\"resp-%d\",\"model\":\"gpt-upstream\",\"usage\":{\"input_tokens\":%d,\"output_tokens\":%d,\"input_tokens_details\":{\"cached_tokens\":1},\"output_tokens_details\":{\"reasoning_tokens\":2}}}}\n\n", call, 10+call, 3+call)
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 2), settled: make(chan *controlv1.SettleRequestRequest, 2),
		renewed: make(chan *controlv1.RenewAuthGrantRequest, 1), grantExpiry: time.Now().Add(1200 * time.Millisecond).UnixMilli(),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/v1/responses", UpstreamMethod: http.MethodPost,
			MappedModel: "gpt-upstream", TransportProfile: "standard", ProtocolProfile: "passthrough", MaxAttempts: 1,
			UpstreamHeaders: map[string]string{"Authorization": "Bearer upstream-secret", "Content-Type": "application/json", "Accept": "text/event-stream"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "responses-ws-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = caddy.Stop() }()

	headers := http.Header{"Authorization": []string{"Bearer client-key"}}
	connection, _, err := websocket.Dial(context.Background(), "ws://"+gatewayAddress+"/v1/responses", &websocket.DialOptions{HTTPHeader: headers})
	if err != nil {
		t.Fatal(err)
	}
	defer connection.CloseNow()
	for turn, frame := range []string{
		`{"type":"response.create","model":"gpt-client","stream":false,"input":"first"}`,
		`{"type":"response.create","stream":false,"previous_response_id":"resp-1","input":"second"}`,
	} {
		if err := connection.Write(context.Background(), websocket.MessageText, []byte(frame)); err != nil {
			t.Fatal(err)
		}
		for {
			_, message, err := connection.Read(context.Background())
			if err != nil {
				t.Fatal(err)
			}
			if bytes.Contains(message, []byte("gpt-upstream")) || !bytes.Contains(message, []byte("gpt-client")) {
				t.Fatalf("turn %d model restoration = %s", turn+1, message)
			}
			if bytes.Contains(message, []byte(`"type":"response.completed"`)) {
				break
			}
		}
		if turn == 0 {
			select {
			case renewal := <-control.renewed:
				if renewal.GetGrantToken() != "grant-e2e" || renewal.GetRequestId() == "" {
					t.Fatalf("WS grant renewal = %+v", renewal)
				}
			case <-time.After(3 * time.Second):
				t.Fatal("WS AuthGrant renewal was not observed")
			}
			// The server-side notification is emitted while the renewal RPC is
			// returning; allow the handler to atomically install the response.
			time.Sleep(50 * time.Millisecond)
		}
	}
	_ = connection.Close(websocket.StatusNormalClosure, "done")

	for turn := int64(1); turn <= 2; turn++ {
		select {
		case opened := <-control.opened:
			if opened.GetMethod() != http.MethodPost || opened.GetPath() != "/v1/responses" || opened.GetRequestedModel() != "gpt-client" || !opened.GetStream() {
				t.Fatalf("WS admission turn %d = %+v", turn, opened)
			}
			if turn == 2 && opened.GetAuthGrantToken() != "grant-e2e-renewed" {
				t.Fatalf("second WS turn did not use renewed grant: %+v", opened)
			}
		case <-time.After(3 * time.Second):
			t.Fatal("WS admission was not observed")
		}
		select {
		case settled := <-control.settled:
			if settled.GetRequestedModel() != "gpt-client" || settled.GetMappedModel() != "gpt-upstream" || settled.GetUsage().GetInputTokens() != 10+turn || settled.GetUsage().GetOutputTokens() != 3+turn || settled.GetUsage().GetCacheReadTokens() != 1 || settled.GetUsage().GetReasoningTokens() != 2 {
				t.Fatalf("WS settlement turn %d = %+v", turn, settled)
			}
		case <-time.After(3 * time.Second):
			t.Fatal("WS settlement was not observed")
		}
	}
	if upstreamCalls.Load() != 2 {
		t.Fatalf("upstream calls = %d", upstreamCalls.Load())
	}
}

func TestCaddyDataPlaneResponsesWebSocketCancelSettlesAndContinues(t *testing.T) {
	var upstreamCalls atomic.Int64
	upstreamCancelled := make(chan struct{}, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		call := upstreamCalls.Add(1)
		w.Header().Set("Content-Type", "text/event-stream")
		if call == 1 {
			_, _ = io.WriteString(w, "data: {\"type\":\"response.created\",\"response\":{\"id\":\"resp-cancel\",\"model\":\"gpt-upstream\"}}\n\n")
			_, _ = io.WriteString(w, "data: {\"type\":\"response.in_progress\",\"response\":{\"id\":\"resp-cancel\",\"usage\":{\"input_tokens\":7,\"output_tokens\":2}}}\n\n")
			if flusher, ok := w.(http.Flusher); ok {
				flusher.Flush()
			}
			<-request.Context().Done()
			upstreamCancelled <- struct{}{}
			return
		}
		_, _ = io.WriteString(w, "data: {\"type\":\"response.created\",\"response\":{\"id\":\"resp-next\",\"model\":\"gpt-upstream\"}}\n\n")
		_, _ = io.WriteString(w, "data: {\"type\":\"response.completed\",\"response\":{\"id\":\"resp-next\",\"model\":\"gpt-upstream\",\"usage\":{\"input_tokens\":9,\"output_tokens\":4}}}\n\n")
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 2), settled: make(chan *controlv1.SettleRequestRequest, 2),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/v1/responses", UpstreamMethod: http.MethodPost,
			MappedModel: "gpt-upstream", TransportProfile: "standard", ProtocolProfile: "passthrough", MaxAttempts: 1,
			UpstreamHeaders: map[string]string{"Authorization": "Bearer upstream-secret", "Content-Type": "application/json", "Accept": "text/event-stream"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "responses-ws-cancel-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = caddy.Stop() }()

	connection, _, err := websocket.Dial(context.Background(), "ws://"+gatewayAddress+"/v1/responses", &websocket.DialOptions{
		HTTPHeader: http.Header{"Authorization": []string{"Bearer client-key"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer connection.CloseNow()
	if err := connection.Write(context.Background(), websocket.MessageText, []byte(`{"type":"response.create","model":"gpt-client","input":"cancel me"}`)); err != nil {
		t.Fatal(err)
	}
	for {
		_, message, readErr := connection.Read(context.Background())
		if readErr != nil {
			t.Fatal(readErr)
		}
		if bytes.Contains(message, []byte(`"type":"response.in_progress"`)) {
			break
		}
	}
	if err := connection.Write(context.Background(), websocket.MessageText, []byte(`{"type":"response.cancel","response_id":"resp-wrong"}`)); err != nil {
		t.Fatal(err)
	}
	_, mismatchMessage, err := connection.Read(context.Background())
	if err != nil || !bytes.Contains(mismatchMessage, []byte(`"code":"invalid_request_error"`)) || !bytes.Contains(mismatchMessage, []byte("does not match")) {
		t.Fatalf("mismatched cancel response = %s, %v", mismatchMessage, err)
	}
	select {
	case <-upstreamCancelled:
		t.Fatal("mismatched response.cancel cancelled the upstream")
	default:
	}
	if err := connection.Write(context.Background(), websocket.MessageText, []byte(`{"type":"response.cancel","response_id":"resp-cancel"}`)); err != nil {
		t.Fatal(err)
	}
	for {
		_, message, readErr := connection.Read(context.Background())
		if readErr != nil {
			t.Fatal(readErr)
		}
		if bytes.Contains(message, []byte(`"type":"error"`)) {
			t.Fatalf("cancel returned an extra generic error: %s", message)
		}
		if bytes.Contains(message, []byte(`"type":"response.cancelled"`)) {
			if !bytes.Contains(message, []byte(`"id":"resp-cancel"`)) {
				t.Fatalf("cancelled response = %s", message)
			}
			break
		}
	}
	select {
	case <-upstreamCancelled:
	case <-time.After(3 * time.Second):
		t.Fatal("response.cancel did not cancel the upstream request context")
	}
	select {
	case settled := <-control.settled:
		if !settled.GetClientCancelled() || settled.GetUpstream().GetAttempts() != 1 || settled.GetUsage().GetInputTokens() != 7 || settled.GetUsage().GetOutputTokens() != 2 || settled.GetUsage().GetResponseBytes() == 0 {
			t.Fatalf("cancel settlement = %+v", settled)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("cancel settlement was not observed")
	}

	if err := connection.Write(context.Background(), websocket.MessageText, []byte(`{"type":"response.create","input":"continue"}`)); err != nil {
		t.Fatal(err)
	}
	for {
		_, message, readErr := connection.Read(context.Background())
		if readErr != nil {
			t.Fatal(readErr)
		}
		if bytes.Contains(message, []byte(`"type":"error"`)) {
			t.Fatalf("post-cancel turn failed: %s", message)
		}
		if bytes.Contains(message, []byte(`"type":"response.completed"`)) {
			break
		}
	}
	select {
	case settled := <-control.settled:
		if settled.GetClientCancelled() || settled.GetUsage().GetInputTokens() != 9 || settled.GetUsage().GetOutputTokens() != 4 {
			t.Fatalf("post-cancel settlement = %+v", settled)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("post-cancel settlement was not observed")
	}
	if upstreamCalls.Load() != 2 {
		t.Fatalf("upstream calls = %d", upstreamCalls.Load())
	}
}

func TestCaddyDataPlaneResponsesWebSocketRejectsOverlappingTurn(t *testing.T) {
	var upstreamCalls atomic.Int64
	releaseUpstream := make(chan struct{})
	upstreamCancelled := make(chan struct{}, 1)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		upstreamCalls.Add(1)
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"type\":\"response.created\",\"response\":{\"id\":\"resp-active\",\"model\":\"gpt-upstream\"}}\n\n")
		if flusher, ok := w.(http.Flusher); ok {
			flusher.Flush()
		}
		select {
		case <-releaseUpstream:
			_, _ = io.WriteString(w, "data: {\"type\":\"response.completed\",\"response\":{\"id\":\"resp-active\",\"model\":\"gpt-upstream\",\"usage\":{\"input_tokens\":3,\"output_tokens\":1}}}\n\n")
		case <-request.Context().Done():
			upstreamCancelled <- struct{}{}
		}
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 2), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: upstream.URL + "/v1/responses", UpstreamMethod: http.MethodPost,
			MappedModel: "gpt-upstream", TransportProfile: "standard", ProtocolProfile: "passthrough", MaxAttempts: 1,
			UpstreamHeaders: map[string]string{"Content-Type": "application/json", "Accept": "text/event-stream"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "responses-ws-overlap-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = caddy.Stop() }()

	connection, _, err := websocket.Dial(context.Background(), "ws://"+gatewayAddress+"/v1/responses", &websocket.DialOptions{
		HTTPHeader: http.Header{"Authorization": []string{"Bearer client-key"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer connection.CloseNow()
	if err := connection.Write(context.Background(), websocket.MessageText, []byte(`{"type":"response.create","model":"gpt-client","input":"first"}`)); err != nil {
		t.Fatal(err)
	}
	_, firstMessage, err := connection.Read(context.Background())
	if err != nil || !bytes.Contains(firstMessage, []byte(`"type":"response.created"`)) {
		t.Fatalf("first response event = %s, %v", firstMessage, err)
	}
	if err := connection.Write(context.Background(), websocket.MessageText, []byte(`{"type":"response.create","model":"gpt-client","input":"overlap"}`)); err != nil {
		t.Fatal(err)
	}
	_, overlapMessage, err := connection.Read(context.Background())
	if err != nil || !bytes.Contains(overlapMessage, []byte(`"type":"error"`)) || !bytes.Contains(overlapMessage, []byte(`"code":"invalid_request_error"`)) {
		t.Fatalf("overlap response = %s, %v", overlapMessage, err)
	}
	select {
	case <-upstreamCancelled:
		t.Fatal("overlapping response.create cancelled the active upstream")
	default:
	}
	close(releaseUpstream)
	for {
		_, message, readErr := connection.Read(context.Background())
		if readErr != nil {
			t.Fatal(readErr)
		}
		if bytes.Contains(message, []byte(`"type":"response.completed"`)) {
			break
		}
	}
	select {
	case settled := <-control.settled:
		if settled.GetClientCancelled() || settled.GetUsage().GetInputTokens() != 3 || settled.GetUsage().GetOutputTokens() != 1 {
			t.Fatalf("active turn settlement = %+v", settled)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("active turn settlement was not observed")
	}
	if upstreamCalls.Load() != 1 {
		t.Fatalf("overlap reached upstream: calls=%d", upstreamCalls.Load())
	}
	select {
	case opened := <-control.opened:
		_ = opened
	default:
		t.Fatal("first turn admission was not observed")
	}
	select {
	case opened := <-control.opened:
		t.Fatalf("overlap unexpectedly opened a second turn: %+v", opened)
	default:
	}
}

func TestCaddyDataPlaneResponsesWebSocketUsesNativeUpstreamPool(t *testing.T) {
	var upstreamConnections atomic.Int64
	var upstreamTurns atomic.Int64
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Authorization") != "Bearer upstream-secret" || request.Header.Get("X-Upstream-Snapshot") != "native-e2e" || request.Header.Get("X-Client-Only") != "" {
			t.Errorf("native upstream headers = %#v", request.Header)
		}
		connection, err := websocket.Accept(w, request, nil)
		if err != nil {
			t.Errorf("accept native upstream: %v", err)
			return
		}
		defer connection.CloseNow()
		upstreamConnections.Add(1)
		for {
			messageType, payload, readErr := connection.Read(request.Context())
			if readErr != nil {
				return
			}
			if messageType != websocket.MessageText {
				t.Errorf("native upstream message type = %v", messageType)
				return
			}
			turn := upstreamTurns.Add(1)
			var event map[string]any
			if json.Unmarshal(payload, &event) != nil || event["type"] != "response.create" || event["model"] != "gpt-upstream" {
				t.Errorf("native upstream turn %d = %s", turn, payload)
			}
			expectedPrevious := ""
			if turn > 1 {
				expectedPrevious = fmt.Sprintf("resp-%d", turn-1)
			}
			if previous, _ := event["previous_response_id"].(string); previous != expectedPrevious {
				t.Errorf("native upstream previous_response_id turn %d = %q, want %q", turn, previous, expectedPrevious)
			}
			created := fmt.Sprintf(`{"type":"response.created","response":{"id":"resp-%d","model":"gpt-upstream"}}`, turn)
			completed := fmt.Sprintf(`{"type":"response.completed","response":{"id":"resp-%d","model":"gpt-upstream","usage":{"input_tokens":%d,"output_tokens":%d,"input_tokens_details":{"cached_tokens":1},"output_tokens_details":{"reasoning_tokens":2}}}}`, turn, 20+turn, 5+turn)
			if err := connection.Write(request.Context(), websocket.MessageText, []byte(created)); err != nil {
				return
			}
			if err := connection.Write(request.Context(), websocket.MessageText, []byte(completed)); err != nil {
				return
			}
			if turn == 2 {
				_ = connection.Close(websocket.StatusNormalClosure, "rotate connection")
				return
			}
		}
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 3), settled: make(chan *controlv1.SettleRequestRequest, 3),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl: strings.Replace(upstream.URL, "http://", "ws://", 1) + "/v1/responses",
			MappedModel: "gpt-upstream", TransportProfile: "standard", ProtocolProfile: "openai_codex", MaxAttempts: 1,
			UpstreamHeaders: map[string]string{"Authorization": "Bearer upstream-secret", "X-Upstream-Snapshot": "native-e2e"},
			ProtocolOptions: map[string]string{"compact": "false", "default_instructions": "native defaults"},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "responses-native-ws-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() { _ = caddy.Stop() }()

	connection, _, err := websocket.Dial(context.Background(), "ws://"+gatewayAddress+"/v1/responses", &websocket.DialOptions{
		HTTPHeader: http.Header{"Authorization": []string{"Bearer client-key"}, "X-Client-Only": []string{"must-not-leak"}},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer connection.CloseNow()
	for turn := int64(1); turn <= 3; turn++ {
		frame := fmt.Sprintf(`{"type":"response.create","input":"turn-%d"`, turn)
		if turn == 1 {
			frame += `,"model":"gpt-client"`
		} else {
			frame += fmt.Sprintf(`,"previous_response_id":"resp-%d"`, turn-1)
		}
		frame += "}"
		if err := connection.Write(context.Background(), websocket.MessageText, []byte(frame)); err != nil {
			t.Fatal(err)
		}
		for {
			_, message, readErr := connection.Read(context.Background())
			if readErr != nil {
				t.Fatal(readErr)
			}
			if bytes.Contains(message, []byte("gpt-upstream")) || !bytes.Contains(message, []byte("gpt-client")) {
				t.Fatalf("native turn %d model restoration = %s", turn, message)
			}
			if bytes.Contains(message, []byte(`"type":"response.completed"`)) {
				break
			}
		}
		select {
		case settled := <-control.settled:
			if settled.GetClientCancelled() || settled.GetUpstream().GetAttempts() != 1 || settled.GetUsage().GetInputTokens() != 20+turn || settled.GetUsage().GetOutputTokens() != 5+turn || settled.GetUsage().GetCacheReadTokens() != 1 || settled.GetUsage().GetReasoningTokens() != 2 {
				t.Fatalf("native settlement turn %d = %+v", turn, settled)
			}
		case <-time.After(3 * time.Second):
			t.Fatalf("native settlement turn %d was not observed", turn)
		}
		if turn == 2 {
			time.Sleep(100 * time.Millisecond)
		}
	}
	if upstreamTurns.Load() != 3 || upstreamConnections.Load() != 2 {
		t.Fatalf("native pool connections=%d turns=%d", upstreamConnections.Load(), upstreamTurns.Load())
	}
}

func TestCaddyDataPlaneExecutesBedrockSigV4AndEventStreamPlugin(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/model/eu.anthropic.claude-opus-4-7-v1/invoke-with-response-stream" {
			t.Errorf("Bedrock upstream path = %q", request.URL.Path)
		}
		authorization := request.Header.Get("Authorization")
		if !strings.HasPrefix(authorization, "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/") || !strings.Contains(authorization, "/eu-west-1/bedrock/aws4_request") {
			t.Errorf("Bedrock SigV4 authorization = %q", authorization)
		}
		if request.Header.Get("X-Amz-Date") == "" || request.Header.Get("X-Amz-Security-Token") != "session-example" {
			t.Errorf("Bedrock SigV4 headers = %v", request.Header)
		}
		if request.Header.Get("Cookie") != "" || request.Header.Get("X-Forwarded-For") != "" || request.Header.Get("Anthropic-Beta") != "" {
			t.Errorf("client headers leaked to Bedrock: %v", request.Header)
		}
		body, err := io.ReadAll(request.Body)
		if err != nil {
			t.Errorf("read Bedrock body: %v", err)
		}
		var decoded map[string]any
		if err := json.Unmarshal(body, &decoded); err != nil {
			t.Errorf("decode Bedrock body: %v", err)
		}
		if _, exists := decoded["model"]; exists || decoded["anthropic_version"] != "bedrock-2023-05-31" {
			t.Errorf("Bedrock transformed body = %+v", decoded)
		}
		w.Header().Set("Content-Type", "application/vnd.amazon.eventstream")
		w.Header().Set("x-amzn-requestid", "aws-request-e2e")
		event := []byte(`{"type":"message_delta","delta":{"stop_reason":"end_turn"},"amazon-bedrock-invocationMetrics":{"inputTokenCount":13,"outputTokenCount":5}}`)
		payload, _ := json.Marshal(map[string]string{"bytes": base64.StdEncoding.EncodeToString(event)})
		_, _ = w.Write(buildAWSEventStreamFrame(map[string]string{":message-type": "event", ":event-type": "chunk", ":content-type": "application/json"}, payload))
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		opened: make(chan *controlv1.OpenRequestRequest, 1), signed: make(chan *controlv1.SignBedrockRequestRequest, 1), settled: make(chan *controlv1.SettleRequestRequest, 1),
		plan: &controlv1.ExecutionPlan{
			UpstreamUrl:    upstream.URL + "/model/eu.anthropic.claude-opus-4-7-v1/invoke-with-response-stream",
			UpstreamMethod: http.MethodPost, MappedModel: "eu.anthropic.claude-opus-4-7-v1",
			TransportProfile: "standard", ProtocolProfile: "bedrock",
			UpstreamHeaders: map[string]string{"Content-Type": "application/json", "Accept": "application/json"},
			ProtocolOptions: map[string]string{
				"auth_mode": "sigv4", "aws_region": "eu-west-1",
				"cc_compat": "false", "initial_beta_tokens": "context-1m-2025-08-07",
				"allowed_auto_betas": "computer-use-2025-11-24", "blocked_auto_betas": `{}`,
			},
		},
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	gatewayAddress := unusedTCPAddress(t)
	document, err := bootstrap.CaddyConfig(config.Config{
		ListenAddress: gatewayAddress, NodeID: "bedrock-e2e",
		ControlPlaneTarget: controlListener.Addr().String(), ControlPlaneInsecure: true,
		StartupRequired: true, DialTimeout: 3 * time.Second, RequestTimeout: 3 * time.Second,
		GracePeriod: time.Second, SettlementWALPath: t.TempDir(), SettlementWALMaxBytes: 1 << 20,
		AuthCacheTTL: time.Minute, AuthCacheSize: 8,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := caddy.Load(document, true); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if err := caddy.Stop(); err != nil {
			t.Errorf("stop Caddy: %v", err)
		}
	}()

	body := `{"model":"claude-client","stream":true,"max_tokens":128,"messages":[{"role":"user","content":"hello"}]}`
	request, _ := http.NewRequest(http.MethodPost, "http://"+gatewayAddress+"/v1/messages", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer client-api-key")
	request.Header.Set("Anthropic-Beta", "context-1m-2025-08-07")
	request.Header.Set("Cookie", "secret=1")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	responseBody, err := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if err != nil || response.StatusCode != http.StatusOK {
		t.Fatalf("status=%d body=%s err=%v", response.StatusCode, responseBody, err)
	}
	if response.Header.Get("Content-Type") != "text/event-stream" || !strings.Contains(strings.Join(response.Header.Values("x-request-id"), " "), "aws-request-e2e") || !strings.Contains(string(responseBody), `"usage":{"input_tokens":13,"output_tokens":5}`) {
		t.Fatalf("Bedrock response headers=%v body=%s", response.Header, responseBody)
	}
	select {
	case signed := <-control.signed:
		if signed.GetRequestId() == "" || signed.GetLeaseId() != "lease-e2e" || len(signed.GetPayloadSha256()) != 64 || signed.GetUpstreamUrl() != control.plan.GetUpstreamUrl() {
			t.Fatalf("Bedrock signing RPC = %+v", signed)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Bedrock signing RPC was not observed")
	}

	select {
	case settled := <-control.settled:
		if settled.GetUsage().GetInputTokens() != 13 || settled.GetUsage().GetOutputTokens() != 5 {
			t.Fatalf("Bedrock settled usage = %+v", settled.GetUsage())
		}
	case <-time.After(3 * time.Second):
		t.Fatal("Bedrock settlement was not observed")
	}
}

type mtlsCertificates struct {
	ca, serverCert, serverKey, clientCert, clientKey string
}

func generateMTLSCertificates(t *testing.T) mtlsCertificates {
	t.Helper()
	dir := t.TempDir()
	now := time.Now()
	caKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate CA key: %v", err)
	}
	caTemplate := &x509.Certificate{
		SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "Sup2API Test CA"},
		NotBefore: now.Add(-time.Minute), NotAfter: now.Add(time.Hour), IsCA: true,
		BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature,
	}
	caDER, err := x509.CreateCertificate(rand.Reader, caTemplate, caTemplate, &caKey.PublicKey, caKey)
	if err != nil {
		t.Fatalf("create CA: %v", err)
	}
	caPath := filepath.Join(dir, "ca.crt")
	writePEM(t, caPath, "CERTIFICATE", caDER)

	issue := func(name string, serial int64, usages []x509.ExtKeyUsage, dnsNames []string) (string, string) {
		key, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			t.Fatalf("generate %s key: %v", name, err)
		}
		template := &x509.Certificate{
			SerialNumber: big.NewInt(serial), Subject: pkix.Name{CommonName: name},
			NotBefore: now.Add(-time.Minute), NotAfter: now.Add(time.Hour),
			KeyUsage:    x509.KeyUsageDigitalSignature | x509.KeyUsageKeyEncipherment,
			ExtKeyUsage: usages, DNSNames: dnsNames,
		}
		der, err := x509.CreateCertificate(rand.Reader, template, caTemplate, &key.PublicKey, caKey)
		if err != nil {
			t.Fatalf("create %s certificate: %v", name, err)
		}
		certPath := filepath.Join(dir, name+".crt")
		keyPath := filepath.Join(dir, name+".key")
		writePEM(t, certPath, "CERTIFICATE", der)
		writePEM(t, keyPath, "RSA PRIVATE KEY", x509.MarshalPKCS1PrivateKey(key))
		return certPath, keyPath
	}
	serverCert, serverKey := issue("sup2api-control", 2, []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, []string{"sup2api-control"})
	clientCert, clientKey := issue("sup2api-gateway", 3, []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}, nil)
	return mtlsCertificates{ca: caPath, serverCert: serverCert, serverKey: serverKey, clientCert: clientCert, clientKey: clientKey}
}

func writePEM(t *testing.T, path, blockType string, der []byte) {
	t.Helper()
	encoded := pem.EncodeToMemory(&pem.Block{Type: blockType, Bytes: der})
	if err := os.WriteFile(path, encoded, 0o600); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func unusedTCPAddress(t *testing.T) string {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("reserve gateway address: %v", err)
	}
	address := listener.Addr().String()
	if err := listener.Close(); err != nil {
		t.Fatalf("release gateway address: %v", err)
	}
	if address == "" {
		t.Fatal(fmt.Errorf("empty gateway address"))
	}
	return address
}

func buildAWSEventStreamFrame(headers map[string]string, payload []byte) []byte {
	var encodedHeaders bytes.Buffer
	for _, name := range []string{":message-type", ":event-type", ":content-type", ":exception-type"} {
		value, exists := headers[name]
		if !exists {
			continue
		}
		encodedHeaders.WriteByte(byte(len(name)))
		encodedHeaders.WriteString(name)
		encodedHeaders.WriteByte(7)
		_ = binary.Write(&encodedHeaders, binary.BigEndian, uint16(len(value)))
		encodedHeaders.WriteString(value)
	}
	totalLength := 12 + encodedHeaders.Len() + len(payload) + 4
	prelude := make([]byte, 12)
	binary.BigEndian.PutUint32(prelude[:4], uint32(totalLength))
	binary.BigEndian.PutUint32(prelude[4:8], uint32(encodedHeaders.Len()))
	binary.BigEndian.PutUint32(prelude[8:12], crc32.ChecksumIEEE(prelude[:8]))
	frame := append(prelude, encodedHeaders.Bytes()...)
	frame = append(frame, payload...)
	checksum := crc32.ChecksumIEEE(frame)
	crc := make([]byte, 4)
	binary.BigEndian.PutUint32(crc, checksum)
	return append(frame, crc...)
}
