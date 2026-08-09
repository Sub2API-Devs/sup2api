package runtime

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/authcache"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/controlplane"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/settlementqueue"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/settlementwal"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/workermanagement"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
)

var (
	ErrNotReady              = errors.New("data-plane runtime is not ready")
	ErrBillingWALUnavailable = errors.New("billing settlement WAL is unavailable")
)

type Config struct {
	NodeID                string
	ControlPlaneTarget    string
	ControlPlaneInsecure  bool
	StartupRequired       bool
	DialTimeout           time.Duration
	RequestTimeout        time.Duration
	SettlementWALPath     string
	SettlementWALMaxBytes int64
	NATSURL               string
	NATSSubject           string
	AuthCacheTTL          time.Duration
	AuthCacheSize         int
	TLSCAFile             string
	TLSCertFile           string
	TLSKeyFile            string
	TLSServerName         string
	WorkerID              string
	WorkerInstanceID      string
	WorkerManagementKey   string
	WorkerVaultPath       string
	WorkerVaultKey        []byte
	WorkerVersion         string
}

// Runtime owns process-level data-plane resources shared by Caddy HTTP
// modules. Individual handlers must not create their own RPC connections or
// settlement workers.
type Runtime struct {
	cfg    Config
	logger *zap.Logger

	clientMu sync.RWMutex
	client   controlplane.Client
	ready    atomic.Bool
	auth     *authcache.Cache
	sequence atomic.Int64

	wal            *settlementwal.Store
	settlements    settlementqueue.Publisher
	billingHealthy atomic.Bool
	settlementWake chan struct{}
	stop           chan struct{}
	stopOnce       sync.Once
	cancel         context.CancelFunc
	wg             sync.WaitGroup
	worker         *workermanagement.Manager
}

func New(cfg Config, logger *zap.Logger) (*Runtime, error) {
	if cfg.NodeID == "" || cfg.ControlPlaneTarget == "" {
		return nil, fmt.Errorf("node ID and control-plane target are required")
	}
	if cfg.DialTimeout <= 0 || cfg.RequestTimeout <= 0 {
		return nil, fmt.Errorf("runtime timeouts must be positive")
	}
	if cfg.SettlementWALPath == "" {
		return nil, fmt.Errorf("settlement WAL path is required")
	}
	if cfg.SettlementWALMaxBytes <= 0 {
		return nil, fmt.Errorf("settlement WAL maximum bytes must be positive")
	}
	if cfg.AuthCacheTTL <= 0 {
		cfg.AuthCacheTTL = time.Minute
	}
	if cfg.AuthCacheSize <= 0 {
		cfg.AuthCacheSize = 65536
	}
	if logger == nil {
		logger = zap.NewNop()
	}
	wal, err := settlementwal.Open(cfg.SettlementWALPath, cfg.SettlementWALMaxBytes)
	if err != nil {
		return nil, err
	}
	runtime := &Runtime{
		cfg:            cfg,
		logger:         logger,
		auth:           authcache.New(cfg.AuthCacheSize, cfg.AuthCacheTTL),
		wal:            wal,
		settlementWake: make(chan struct{}, 1),
		stop:           make(chan struct{}),
	}
	if cfg.WorkerManagementKey != "" {
		logTransport := "control_plane_grpc"
		if strings.TrimSpace(cfg.NATSURL) != "" {
			logTransport = "nats_jetstream"
		}
		manager, managerErr := workermanagement.New(workermanagement.Config{
			WorkerID: cfg.WorkerID, InstanceID: cfg.WorkerInstanceID,
			ManagementKey: cfg.WorkerManagementKey, Version: cfg.WorkerVersion,
			LogTransport: logTransport,
			VaultPath:    cfg.WorkerVaultPath, VaultKey: cfg.WorkerVaultKey,
		})
		if managerErr != nil {
			_ = wal.Close()
			return nil, fmt.Errorf("create worker manager: %w", managerErr)
		}
		runtime.worker = manager
	}
	runtime.billingHealthy.Store(wal.Bytes() < wal.MaxBytes())
	return runtime, nil
}

// NewWithClient constructs a ready runtime for tests and embedded callers.
func NewWithClient(cfg Config, logger *zap.Logger, client controlplane.Client) (*Runtime, error) {
	runtime, err := New(cfg, logger)
	if err != nil {
		return nil, err
	}
	runtime.client = client
	if client != nil {
		runtime.ready.Store(true)
	}
	return runtime, nil
}

func (r *Runtime) Start(ctx context.Context) error {
	if r.cfg.NATSURL != "" {
		publisher, err := settlementqueue.New(r.cfg.NATSURL, r.cfg.NATSSubject, r.cfg.DialTimeout)
		if err != nil {
			return err
		}
		r.settlements = publisher
	}
	dialCtx, cancel := context.WithTimeout(ctx, r.cfg.DialTimeout)
	defer cancel()

	client, err := controlplane.Dial(dialCtx, controlplane.DialConfig{
		Target:       r.cfg.ControlPlaneTarget,
		Insecure:     r.cfg.ControlPlaneInsecure,
		DialTimeout:  r.cfg.DialTimeout,
		WaitForReady: r.cfg.StartupRequired,
		CAFile:       r.cfg.TLSCAFile,
		CertFile:     r.cfg.TLSCertFile,
		KeyFile:      r.cfg.TLSKeyFile,
		ServerName:   r.cfg.TLSServerName,
	})
	if err != nil {
		if r.settlements != nil {
			_ = r.settlements.Close()
			r.settlements = nil
		}
		return err
	}

	r.clientMu.Lock()
	r.client = client
	r.clientMu.Unlock()
	r.ready.Store(true)

	runtimeCtx, runtimeCancel := context.WithCancel(context.Background())
	r.cancel = runtimeCancel
	r.wg.Add(2)
	go r.runSettlementWorker()
	go r.runInvalidationWorker(runtimeCtx)
	return nil
}

func (r *Runtime) Stop() error {
	r.stopOnce.Do(func() {
		if r.cancel != nil {
			r.cancel()
		}
		close(r.stop)
	})
	r.wg.Wait()
	r.ready.Store(false)

	r.clientMu.Lock()
	defer r.clientMu.Unlock()
	var result error
	if r.client != nil {
		result = errors.Join(result, r.client.Close())
	}
	if r.worker != nil {
		result = errors.Join(result, r.worker.Close())
	}
	if r.settlements != nil {
		result = errors.Join(result, r.settlements.Close())
		r.settlements = nil
	}
	if r.wal != nil {
		result = errors.Join(result, r.wal.Close())
	}
	return result
}

func (r *Runtime) WorkerManager() *workermanagement.Manager {
	if r == nil {
		return nil
	}
	return r.worker
}

// ResolveAPIKey uses a bounded local AuthGrant cache and falls back to the
// authoritative control plane on misses. The bool result reports a cache hit.
func (r *Runtime) ResolveAPIKey(ctx context.Context, requestID, apiKey string) (*controlv1.ResolveAPIKeyResponse, bool, error) {
	digest := credentialDigest(apiKey)
	if grant, ok := r.auth.Get(digest, time.Now()); ok {
		return &controlv1.ResolveAPIKeyResponse{
			Decision: controlv1.Decision_DECISION_ALLOW,
			Grant:    grantToProto(grant),
		}, true, nil
	}

	client, err := r.activeClient()
	if err != nil {
		return nil, false, err
	}
	rpcCtx, cancel := context.WithTimeout(ctx, r.cfg.RequestTimeout)
	defer cancel()
	response, err := client.ResolveAPIKey(rpcCtx, &controlv1.ResolveAPIKeyRequest{
		RequestId:   requestID,
		DataPlaneId: r.cfg.NodeID,
		ApiKey:      apiKey,
	})
	if err != nil {
		return nil, false, err
	}
	if response.GetDecision() != controlv1.Decision_DECISION_ALLOW {
		return response, false, nil
	}
	grant, err := grantFromProto(response.GetGrant(), digest, time.Now())
	if err != nil {
		return nil, false, err
	}
	r.auth.Put(digest, grant, time.Now())
	response.Grant = grantToProto(grant)
	return response, false, nil
}

func (r *Runtime) RenewAuthGrant(ctx context.Context, requestID string, grant *requeststate.AuthGrant) (*requeststate.AuthGrant, error) {
	if grant == nil || requestID == "" || grant.GrantToken == "" {
		return nil, fmt.Errorf("invalid AuthGrant renewal")
	}
	client, err := r.activeClient()
	if err != nil {
		return nil, err
	}
	rpcCtx, cancel := context.WithTimeout(ctx, r.cfg.RequestTimeout)
	defer cancel()
	response, err := client.RenewAuthGrant(rpcCtx, &controlv1.RenewAuthGrantRequest{RequestId: requestID, DataPlaneId: r.cfg.NodeID, GrantToken: grant.GrantToken})
	if err != nil {
		return nil, err
	}
	if response.GetDecision() != controlv1.Decision_DECISION_ALLOW || response.GetGrant() == nil {
		return nil, fmt.Errorf("AuthGrant renewal denied")
	}
	renewed := authGrantFromProto(response.GetGrant())
	if renewed.CredentialDigest != grant.CredentialDigest || renewed.APIKeyID != grant.APIKeyID || renewed.UserID != grant.UserID || renewed.GroupID != grant.GroupID {
		return nil, fmt.Errorf("renewed AuthGrant identity mismatch")
	}
	return renewed, nil
}

func authGrantFromProto(grant *controlv1.AuthGrant) *requeststate.AuthGrant {
	if grant == nil {
		return nil
	}
	return &requeststate.AuthGrant{
		GrantToken: grant.GetGrantToken(), CredentialDigest: grant.GetCredentialDigest(),
		APIKeyID: grant.GetApiKeyId(), UserID: grant.GetUserId(), GroupID: grant.GetGroupId(),
		ExpiresAtUnixMilli: grant.GetExpiresAtUnixMs(), APIKeyExpiresUnixMilli: grant.GetApiKeyExpiresAtUnixMs(),
		IPWhitelist: append([]string(nil), grant.GetIpWhitelist()...), IPBlacklist: append([]string(nil), grant.GetIpBlacklist()...),
		PolicyVersion: grant.GetPolicyVersion(),
	}
}

func (r *Runtime) Ready() bool {
	if r == nil || !r.ready.Load() || !r.billingHealthy.Load() {
		return false
	}
	r.clientMu.RLock()
	defer r.clientMu.RUnlock()
	return r.client != nil && r.client.Ready()
}

func (r *Runtime) OpenRequest(ctx context.Context, req *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error) {
	if r == nil || !r.billingHealthy.Load() {
		return nil, ErrBillingWALUnavailable
	}
	client, err := r.activeClient()
	if err != nil {
		return nil, err
	}
	req.DataPlaneId = r.cfg.NodeID
	rpcCtx, cancel := context.WithTimeout(ctx, r.cfg.RequestTimeout)
	defer cancel()
	return client.OpenRequest(rpcCtx, req)
}

func (r *Runtime) SignBedrockRequest(ctx context.Context, req *controlv1.SignBedrockRequestRequest) (*controlv1.SignBedrockRequestResponse, error) {
	client, err := r.activeClient()
	if err != nil {
		return nil, err
	}
	req.DataPlaneId = r.cfg.NodeID
	rpcCtx, cancel := context.WithTimeout(ctx, r.cfg.RequestTimeout)
	defer cancel()
	return client.SignBedrockRequest(rpcCtx, req)
}

func (r *Runtime) AbortRequest(ctx context.Context, req *controlv1.AbortRequestRequest) error {
	client, err := r.activeClient()
	if err != nil {
		return err
	}
	req.DataPlaneId = r.cfg.NodeID
	rpcCtx, cancel := context.WithTimeout(ctx, r.cfg.RequestTimeout)
	defer cancel()
	_, err = client.AbortRequest(rpcCtx, req)
	return err
}

func (r *Runtime) RenewLease(ctx context.Context, req *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error) {
	client, err := r.activeClient()
	if err != nil {
		return nil, err
	}
	req.DataPlaneId = r.cfg.NodeID
	rpcCtx, cancel := context.WithTimeout(ctx, r.cfg.RequestTimeout)
	defer cancel()
	return client.RenewLease(rpcCtx, req)
}

// SubmitSettlement durably persists raw usage facts before returning. The
// control-plane RPC happens asynchronously and the record remains on disk
// until it is acknowledged as accepted or duplicate.
func (r *Runtime) SubmitSettlement(req *controlv1.SettleRequestRequest) error {
	if req == nil {
		return nil
	}
	request, ok := proto.Clone(req).(*controlv1.SettleRequestRequest)
	if !ok {
		return fmt.Errorf("clone settlement request")
	}
	request.DataPlaneId = r.cfg.NodeID
	request.DataPlaneInstanceId = r.cfg.WorkerInstanceID
	if err := r.wal.Put(request); err != nil {
		r.billingHealthy.Store(false)
		return fmt.Errorf("%w: %v", ErrBillingWALUnavailable, err)
	}
	r.billingHealthy.Store(r.wal.Bytes() < r.wal.MaxBytes())
	select {
	case r.settlementWake <- struct{}{}:
	default:
	}
	return nil
}

func (r *Runtime) activeClient() (controlplane.Client, error) {
	if r == nil || !r.ready.Load() {
		return nil, ErrNotReady
	}
	r.clientMu.RLock()
	defer r.clientMu.RUnlock()
	if r.client == nil {
		return nil, ErrNotReady
	}
	return r.client, nil
}

func (r *Runtime) runSettlementWorker() {
	defer r.wg.Done()
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	for {
		r.drainSettlements()
		select {
		case <-r.settlementWake:
			continue
		case <-ticker.C:
			continue
		case <-r.stop:
			return
		}
	}
}

func (r *Runtime) drainSettlements() {
	records, err := r.wal.List()
	if err != nil {
		r.billingHealthy.Store(false)
		r.logger.Error("settlement WAL scan failed", zap.Error(err))
		return
	}
	deleted := false
	for _, record := range records {
		ctx, cancel := context.WithTimeout(context.Background(), r.cfg.RequestTimeout)
		settleErr := r.deliverSettlement(ctx, record.Request)
		cancel()
		if settleErr != nil {
			r.logger.Error("settlement delivery failed; WAL record retained", zap.String("request_id", record.Request.GetRequestId()), zap.Error(settleErr))
			continue
		}
		if deleteErr := r.wal.Delete(record); deleteErr != nil {
			r.billingHealthy.Store(false)
			r.logger.Error("acknowledged settlement WAL delete failed", zap.String("request_id", record.Request.GetRequestId()), zap.Error(deleteErr))
			return
		}
		deleted = true
	}
	if deleted {
		r.billingHealthy.Store(r.wal.Bytes() < r.wal.MaxBytes())
	}
}

func (r *Runtime) deliverSettlement(ctx context.Context, request *controlv1.SettleRequestRequest) error {
	if r.settlements != nil {
		return r.settlements.Publish(ctx, request)
	}
	client, err := r.activeClient()
	if err != nil {
		return err
	}
	response, err := client.SettleRequest(ctx, request)
	if err != nil {
		return err
	}
	if response == nil || (!response.GetAccepted() && !response.GetDuplicate()) {
		return fmt.Errorf("settlement was not acknowledged")
	}
	return nil
}

func (r *Runtime) runInvalidationWorker(ctx context.Context) {
	defer r.wg.Done()
	backoff := 100 * time.Millisecond
	for ctx.Err() == nil {
		client, err := r.activeClient()
		if err != nil {
			if !waitForRetry(ctx, backoff) {
				return
			}
			continue
		}
		stream, err := client.WatchInvalidations(ctx, &controlv1.WatchInvalidationsRequest{
			DataPlaneId:   r.cfg.NodeID,
			AfterSequence: r.sequence.Load(),
		})
		if err != nil {
			r.logger.Warn("auth invalidation stream unavailable", zap.Error(err))
			if !waitForRetry(ctx, backoff) {
				return
			}
			backoff = min(backoff*2, 5*time.Second)
			continue
		}
		backoff = 100 * time.Millisecond
		for ctx.Err() == nil {
			event, recvErr := stream.Recv()
			if recvErr != nil {
				if !errors.Is(recvErr, io.EOF) && ctx.Err() == nil {
					r.logger.Warn("auth invalidation stream interrupted", zap.Error(recvErr))
				}
				break
			}
			if event.GetSequence() > 0 && event.GetSequence() <= r.sequence.Load() {
				continue
			}
			r.auth.Invalidate(event)
			if event.GetSequence() > 0 {
				r.sequence.Store(event.GetSequence())
			}
		}
	}
}

func waitForRetry(ctx context.Context, delay time.Duration) bool {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-timer.C:
		return true
	case <-ctx.Done():
		return false
	}
}

func credentialDigest(apiKey string) string {
	digest := sha256.Sum256([]byte(apiKey))
	return hex.EncodeToString(digest[:])
}

func grantFromProto(grant *controlv1.AuthGrant, digest string, now time.Time) (*requeststate.AuthGrant, error) {
	if grant == nil || grant.GetGrantToken() == "" || grant.GetApiKeyId() <= 0 || grant.GetUserId() <= 0 {
		return nil, fmt.Errorf("control plane returned an incomplete AuthGrant")
	}
	if grant.GetCredentialDigest() != digest {
		return nil, fmt.Errorf("control plane returned a mismatched credential digest")
	}
	if grant.GetExpiresAtUnixMs() <= now.UnixMilli() {
		return nil, fmt.Errorf("control plane returned an expired AuthGrant")
	}
	return &requeststate.AuthGrant{
		GrantToken:             grant.GetGrantToken(),
		CredentialDigest:       grant.GetCredentialDigest(),
		APIKeyID:               grant.GetApiKeyId(),
		UserID:                 grant.GetUserId(),
		GroupID:                grant.GetGroupId(),
		ExpiresAtUnixMilli:     grant.GetExpiresAtUnixMs(),
		APIKeyExpiresUnixMilli: grant.GetApiKeyExpiresAtUnixMs(),
		IPWhitelist:            append([]string(nil), grant.GetIpWhitelist()...),
		IPBlacklist:            append([]string(nil), grant.GetIpBlacklist()...),
		PolicyVersion:          grant.GetPolicyVersion(),
	}, nil
}

func grantToProto(grant *requeststate.AuthGrant) *controlv1.AuthGrant {
	if grant == nil {
		return nil
	}
	return &controlv1.AuthGrant{
		GrantToken:            grant.GrantToken,
		CredentialDigest:      grant.CredentialDigest,
		ApiKeyId:              grant.APIKeyID,
		UserId:                grant.UserID,
		GroupId:               grant.GroupID,
		ExpiresAtUnixMs:       grant.ExpiresAtUnixMilli,
		ApiKeyExpiresAtUnixMs: grant.APIKeyExpiresUnixMilli,
		IpWhitelist:           append([]string(nil), grant.IPWhitelist...),
		IpBlacklist:           append([]string(nil), grant.IPBlacklist...),
		PolicyVersion:         grant.PolicyVersion,
	}
}
