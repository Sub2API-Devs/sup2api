package service

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

const (
	workerProtocolVersion      = "aicodex.proxy-worker/v2"
	defaultHeartbeatInterval   = 15
	defaultHeartbeatTimeout    = 5
	heartbeatSchedulerInterval = time.Second
	heartbeatBatchSize         = 64
	heartbeatParallelism       = 8
)

var ErrWorkerNotFound = errors.New("worker not found")

type Worker struct {
	ID                       int64      `json:"id"`
	Name                     string     `json:"name"`
	BaseURL                  string     `json:"base_url"`
	RemoteWorkerID           string     `json:"remote_worker_id"`
	InstanceID               string     `json:"instance_id"`
	ProtocolVersion          string     `json:"protocol_version"`
	Version                  string     `json:"version"`
	Status                   string     `json:"status"`
	Enabled                  bool       `json:"enabled"`
	LogStreamKey             string     `json:"log_stream_key"`
	LastSeenAt               *time.Time `json:"last_seen_at,omitempty"`
	LastHeartbeatAt          *time.Time `json:"last_heartbeat_at,omitempty"`
	LastHeartbeatLatencyMS   int64      `json:"last_heartbeat_latency_ms"`
	ConsecutiveFailures      int        `json:"consecutive_failures"`
	HeartbeatIntervalSeconds int        `json:"heartbeat_interval_seconds"`
	HeartbeatTimeoutSeconds  int        `json:"heartbeat_timeout_seconds"`
	AccountCount             int64      `json:"account_count"`
	ProxyCount               int64      `json:"proxy_count"`
	LogCount                 int64      `json:"log_count"`
	LastError                *string    `json:"last_error,omitempty"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
	ManagementKeyCipher      string     `json:"-"`
}

type WorkerAccount struct {
	ID              int64          `json:"id"`
	WorkerID        int64          `json:"worker_id"`
	RemoteAccountID string         `json:"remote_account_id"`
	Name            string         `json:"name"`
	Kind            string         `json:"kind"`
	Status          string         `json:"status"`
	Metadata        map[string]any `json:"metadata"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
}

type WorkerProxy struct {
	ID            int64          `json:"id"`
	WorkerID      int64          `json:"worker_id"`
	RemoteProxyID string         `json:"remote_proxy_id"`
	Name          string         `json:"name"`
	Protocol      string         `json:"protocol"`
	Host          string         `json:"host"`
	Port          int            `json:"port"`
	Status        string         `json:"status"`
	Metadata      map[string]any `json:"metadata"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

type WorkerLog struct {
	ID              int64          `json:"id"`
	WorkerID        int64          `json:"worker_id"`
	EventID         string         `json:"event_id"`
	EventType       string         `json:"event_type"`
	InstanceID      string         `json:"instance_id"`
	RequestID       string         `json:"request_id"`
	ChannelID       int64          `json:"channel_id"`
	ModelName       string         `json:"model_name"`
	WorkerCreatedAt int64          `json:"worker_created_at"`
	Payload         map[string]any `json:"payload"`
	ConsumedAt      time.Time      `json:"consumed_at"`
}

type WorkerIdentity struct {
	ProtocolVersion string         `json:"protocol_version"`
	Kind            string         `json:"kind"`
	WorkerID        string         `json:"worker_id"`
	InstanceID      string         `json:"instance_id"`
	Generation      int64          `json:"generation"`
	ConfigRevision  int64          `json:"config_revision"`
	Version         string         `json:"version"`
	Capabilities    []string       `json:"capabilities"`
	Caddy           map[string]any `json:"caddy"`
}

type CreateWorkerInput struct {
	Name                     string `json:"name"`
	BaseURL                  string `json:"base_url"`
	PairingToken             string `json:"pairing_token,omitempty"`
	RemoteWorkerID           string `json:"worker_id,omitempty"`
	ManagementKey            string `json:"management_key,omitempty"`
	VaultKey                 string `json:"vault_key,omitempty"`
	ControlPlaneTarget       string `json:"control_plane_target,omitempty"`
	ControlPlaneInsecure     bool   `json:"control_plane_insecure"`
	NATSURL                  string `json:"nats_url,omitempty"`
	Enabled                  *bool  `json:"enabled,omitempty"`
	HeartbeatIntervalSeconds int    `json:"heartbeat_interval_seconds,omitempty"`
	HeartbeatTimeoutSeconds  int    `json:"heartbeat_timeout_seconds,omitempty"`
}

type UpdateWorkerInput struct {
	Name                     string `json:"name"`
	BaseURL                  string `json:"base_url"`
	ManagementKey            string `json:"management_key,omitempty"`
	VaultKey                 string `json:"vault_key,omitempty"`
	ControlPlaneTarget       string `json:"control_plane_target,omitempty"`
	ControlPlaneInsecure     *bool  `json:"control_plane_insecure,omitempty"`
	NATSURL                  string `json:"nats_url,omitempty"`
	Enabled                  *bool  `json:"enabled,omitempty"`
	HeartbeatIntervalSeconds int    `json:"heartbeat_interval_seconds"`
	HeartbeatTimeoutSeconds  int    `json:"heartbeat_timeout_seconds"`
}

type WorkerRuntimeConfig struct {
	WorkerID             string `json:"worker_id"`
	ControlPlaneTarget   string `json:"control_plane_target"`
	ControlPlaneInsecure bool   `json:"control_plane_insecure"`
	NATSURL              string `json:"nats_url"`
}

type workerConfigUpdate struct {
	ManagementKey        string `json:"management_key,omitempty"`
	VaultKey             string `json:"vault_key,omitempty"`
	ControlPlaneTarget   string `json:"control_plane_target,omitempty"`
	ControlPlaneInsecure *bool  `json:"control_plane_insecure,omitempty"`
	NATSURL              string `json:"nats_url,omitempty"`
}

type SetWorkerEnabledInput struct {
	Enabled bool `json:"enabled"`
}

type WorkerHeartbeatObservation struct {
	Identity  WorkerIdentity
	Status    string
	LastError *string
	Reachable bool
	LatencyMS int64
}

type WorkerAccountCreateInput struct {
	Name      string `json:"name"`
	Kind      string `json:"kind,omitempty"`
	APIKey    string `json:"api_key,omitempty"`
	BaseURL   string `json:"base_url,omitempty"`
	Models    string `json:"models,omitempty"`
	Group     string `json:"group,omitempty"`
	TestModel string `json:"test_model,omitempty"`
}

type WorkerProxyInput struct {
	Name     string `json:"name"`
	Protocol string `json:"protocol"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
}

type WorkerOAuthCompleteInput struct {
	SessionID string `json:"session_id"`
	Input     string `json:"input"`
}

type WorkerAccountTestInput struct {
	Model        string `json:"model,omitempty"`
	EndpointType string `json:"endpoint_type,omitempty"`
	Stream       bool   `json:"stream,omitempty"`
}

type WorkerRepository interface {
	CreateWorker(context.Context, *Worker) error
	ListWorkers(context.Context) ([]Worker, error)
	GetWorker(context.Context, int64) (*Worker, error)
	GetWorkerByRemoteID(context.Context, string) (*Worker, error)
	DeleteWorker(context.Context, int64) error
	UpdateWorker(context.Context, *Worker, bool) error
	SetWorkerEnabled(context.Context, int64, bool) error
	ListWorkersDueHeartbeat(context.Context, time.Time, int) ([]Worker, error)
	UpdateWorkerHeartbeat(context.Context, int64, WorkerHeartbeatObservation) error
	UpsertWorkerAccount(context.Context, *WorkerAccount) error
	DeleteWorkerAccount(context.Context, int64, string) error
	DeleteWorkerAccountsExcept(context.Context, int64, []string) error
	ListWorkerAccounts(context.Context, int64) ([]WorkerAccount, error)
	UpsertWorkerProxy(context.Context, *WorkerProxy) error
	DeleteWorkerProxy(context.Context, int64, string) error
	DeleteWorkerProxiesExcept(context.Context, int64, []string) error
	ListWorkerProxies(context.Context, int64) ([]WorkerProxy, error)
	InsertWorkerLog(context.Context, *WorkerLog) error
	ListWorkerLogs(context.Context, int64, int, int64) ([]WorkerLog, error)
}

type WorkerService struct {
	repo            WorkerRepository
	encryptor       SecretEncryptor
	remote          *WorkerRemoteClient
	settings        SettingRepository
	natsIssuer      *WorkerNATSIssuer
	probeGroup      singleflight.Group
	heartbeatMu     sync.Mutex
	heartbeatCancel context.CancelFunc
	heartbeatWG     sync.WaitGroup
}

func NewWorkerService(repo WorkerRepository, encryptor SecretEncryptor, remote *WorkerRemoteClient) *WorkerService {
	return &WorkerService{repo: repo, encryptor: encryptor, remote: remote}
}

func (s *WorkerService) ConfigureNATSSecurity(settings SettingRepository, issuer *WorkerNATSIssuer) {
	if s == nil {
		return
	}
	s.settings = settings
	s.natsIssuer = issuer
}

func (s *WorkerService) Create(ctx context.Context, input CreateWorkerInput) (*Worker, error) {
	if s == nil || s.repo == nil || s.encryptor == nil || s.remote == nil {
		return nil, errors.New("worker management is not configured")
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("worker name is required")
	}
	baseURL, err := normalizeWorkerBaseURL(input.BaseURL)
	if err != nil {
		return nil, err
	}
	heartbeatInterval, heartbeatTimeout, err := normalizeWorkerHeartbeat(input.HeartbeatIntervalSeconds, input.HeartbeatTimeoutSeconds)
	if err != nil {
		return nil, err
	}
	enabled := true
	if input.Enabled != nil {
		enabled = *input.Enabled
	}
	var identity *WorkerIdentity
	var key string
	if pairingToken := strings.TrimSpace(input.PairingToken); pairingToken != "" {
		if len(pairingToken) < 48 {
			return nil, errors.New("pairing token must contain at least 48 characters")
		}
		remoteWorkerID := strings.TrimSpace(input.RemoteWorkerID)
		if remoteWorkerID == "" {
			return nil, errors.New("worker_id is required when claiming an unclaimed Worker")
		}
		if len(remoteWorkerID) > 128 {
			return nil, errors.New("worker_id exceeds the supported field size")
		}
		if strings.TrimSpace(input.ControlPlaneTarget) == "" {
			return nil, errors.New("control_plane_target is required when claiming an unclaimed Worker")
		}
		workerNATSURL, urlErr := validateWorkerNATSURL(input.NATSURL)
		if urlErr != nil {
			return nil, urlErr
		}
		// Reject before the one-time claim so a duplicate Worker ID cannot
		// burn the pairing token and leave the container claimed-but-unregistered.
		existing, existingErr := s.repo.GetWorkerByRemoteID(ctx, remoteWorkerID)
		if existingErr != nil {
			return nil, existingErr
		}
		if existing != nil {
			return nil, fmt.Errorf("worker_id %q is already registered", remoteWorkerID)
		}
		natsConfig, natsConfigErr := s.GetNATSSecurityConfig(ctx)
		if natsConfigErr != nil {
			return nil, fmt.Errorf("load Worker NATS security configuration: %w", natsConfigErr)
		}
		if !natsConfig.Ready {
			return nil, errors.New("Worker NATS NKey/JWT security configuration is incomplete")
		}
		natsCredentials, _, issueErr := s.natsIssuer.Issue(remoteWorkerID, natsConfig.Subject, natsConfig.CredentialTTLDays)
		if issueErr != nil {
			return nil, fmt.Errorf("issue Worker NATS credentials: %w", issueErr)
		}
		key = resolveControlPlaneManagementKey(input.ManagementKey)
		if len(key) < 32 {
			return nil, errors.New("AI_GATEWAY_MANAGEMENT_KEY must contain at least 32 characters in the control-plane environment")
		}
		identity, err = s.remote.Claim(ctx, baseURL, WorkerClaimInput{
			PairingToken: pairingToken, WorkerID: remoteWorkerID,
			ControlPlaneTarget: strings.TrimSpace(input.ControlPlaneTarget), ControlPlaneInsecure: input.ControlPlaneInsecure,
			NATSURL: workerNATSURL, NATSSubject: natsConfig.Subject, NATSCredentials: natsCredentials,
		})
	} else {
		key = resolveControlPlaneManagementKey(input.ManagementKey)
		if len(key) < 32 {
			return nil, errors.New("AI_GATEWAY_MANAGEMENT_KEY must contain at least 32 characters in the control-plane environment")
		}
		identity, err = s.remote.Identity(ctx, baseURL, key)
	}
	if err != nil {
		return nil, fmt.Errorf("claim or probe worker identity: %w", err)
	}
	if err := validateWorkerIdentity(identity, ""); err != nil {
		return nil, err
	}
	ciphertext, err := s.encryptor.Encrypt(key)
	if err != nil {
		return nil, fmt.Errorf("encrypt management key: %w", err)
	}
	now := time.Now().UTC()
	logStreamKey := workerLogStreamKey(identity.WorkerID)
	if len(logStreamKey) > 255 {
		return nil, errors.New("worker log stream key is too long")
	}
	worker := &Worker{
		Name: name, BaseURL: baseURL, ManagementKeyCipher: ciphertext,
		RemoteWorkerID: identity.WorkerID, InstanceID: identity.InstanceID,
		ProtocolVersion: identity.ProtocolVersion, Version: identity.Version,
		Status: "connected", Enabled: enabled, LogStreamKey: logStreamKey, LastSeenAt: &now,
		HeartbeatIntervalSeconds: heartbeatInterval, HeartbeatTimeoutSeconds: heartbeatTimeout,
	}
	if !enabled {
		worker.Status = "disabled"
	}
	if err := s.repo.CreateWorker(ctx, worker); err != nil {
		// Claim already succeeded on the Worker. Surface a precise uniqueness
		// error so operators can recover without re-running a burned pairing.
		if isUniqueViolation(err) {
			return nil, fmt.Errorf("worker_id %q is already registered after claim; re-register with the management key instead of pairing again: %w", identity.WorkerID, err)
		}
		return nil, fmt.Errorf("persist claimed Worker %q failed after remote claim succeeded; the Worker is claimed and must be recovered with its management key: %w", identity.WorkerID, err)
	}
	return worker, nil
}

type WorkerClaimInput struct {
	PairingToken         string `json:"pairing_token"`
	WorkerID             string `json:"worker_id"`
	ControlPlaneTarget   string `json:"control_plane_target"`
	ControlPlaneInsecure bool   `json:"control_plane_insecure"`
	NATSURL              string `json:"nats_url"`
	NATSSubject          string `json:"nats_subject"`
	NATSCredentials      string `json:"nats_credentials"`
}

func (s *WorkerService) List(ctx context.Context) ([]Worker, error) {
	return s.repo.ListWorkers(ctx)
}

func (s *WorkerService) Get(ctx context.Context, id int64) (*Worker, error) {
	return s.repo.GetWorker(ctx, id)
}

func (s *WorkerService) Delete(ctx context.Context, id int64) error {
	return s.repo.DeleteWorker(ctx, id)
}

func (s *WorkerService) GetRuntimeConfig(ctx context.Context, id int64) (*WorkerRuntimeConfig, error) {
	worker, key, err := s.workerCredential(ctx, id)
	if err != nil {
		return nil, err
	}
	var cfg WorkerRuntimeConfig
	if err := s.remote.Get(ctx, worker.BaseURL, key, "/worker/v1/config", &cfg); err != nil {
		return nil, err
	}
	if strings.TrimSpace(cfg.WorkerID) == "" {
		cfg.WorkerID = worker.RemoteWorkerID
	}
	return &cfg, nil
}

func (s *WorkerService) Update(ctx context.Context, id int64, input UpdateWorkerInput) (*Worker, error) {
	if s == nil || s.repo == nil || s.encryptor == nil || s.remote == nil {
		return nil, errors.New("worker management is not configured")
	}
	worker, err := s.repo.GetWorker(ctx, id)
	if err != nil {
		return nil, err
	}
	if worker == nil {
		return nil, ErrWorkerNotFound
	}
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, errors.New("worker name is required")
	}
	baseURL, err := normalizeWorkerBaseURL(input.BaseURL)
	if err != nil {
		return nil, err
	}
	interval, timeout, err := normalizeWorkerHeartbeat(input.HeartbeatIntervalSeconds, input.HeartbeatTimeoutSeconds)
	if err != nil {
		return nil, err
	}
	currentKey, err := s.encryptor.Decrypt(worker.ManagementKeyCipher)
	if err != nil {
		return nil, fmt.Errorf("decrypt management key: %w", err)
	}
	managementKey := currentKey
	replacementKey := strings.TrimSpace(input.ManagementKey)
	if replacementKey != "" && len(replacementKey) < 32 {
		return nil, errors.New("management key must contain at least 32 characters")
	}
	push := workerConfigUpdate{
		VaultKey:             strings.TrimSpace(input.VaultKey),
		ControlPlaneTarget:   strings.TrimSpace(input.ControlPlaneTarget),
		ControlPlaneInsecure: input.ControlPlaneInsecure,
	}
	if strings.TrimSpace(input.NATSURL) != "" {
		workerNATSURL, urlErr := validateWorkerNATSURL(input.NATSURL)
		if urlErr != nil {
			return nil, urlErr
		}
		push.NATSURL = workerNATSURL
	}
	needsPush := push.VaultKey != "" || push.ControlPlaneTarget != "" || push.ControlPlaneInsecure != nil || push.NATSURL != ""
	if replacementKey != "" {
		if identity, probeErr := s.remote.Identity(ctx, baseURL, replacementKey); probeErr == nil && validateWorkerIdentity(identity, worker.RemoteWorkerID) == nil {
			managementKey = replacementKey
		} else {
			push.ManagementKey = replacementKey
			needsPush = true
			managementKey = replacementKey
		}
	}
	if needsPush {
		if err := s.remote.Put(ctx, baseURL, currentKey, "/worker/v1/config", push, nil); err != nil {
			return nil, fmt.Errorf("update worker configuration: %w", err)
		}
	}
	credentialsChanged := baseURL != worker.BaseURL || replacementKey != ""
	if credentialsChanged {
		identity, probeErr := s.remote.Identity(ctx, baseURL, managementKey)
		if probeErr != nil {
			return nil, fmt.Errorf("verify updated worker connection: %w", probeErr)
		}
		if err := validateWorkerIdentity(identity, worker.RemoteWorkerID); err != nil {
			return nil, err
		}
	}
	ciphertext := worker.ManagementKeyCipher
	if replacementKey != "" {
		ciphertext, err = s.encryptor.Encrypt(managementKey)
		if err != nil {
			return nil, fmt.Errorf("encrypt management key: %w", err)
		}
	}
	worker.Name = name
	worker.BaseURL = baseURL
	worker.ManagementKeyCipher = ciphertext
	worker.HeartbeatIntervalSeconds = interval
	worker.HeartbeatTimeoutSeconds = timeout
	if input.Enabled != nil {
		worker.Enabled = *input.Enabled
	}
	if worker.Enabled {
		if worker.Status == "disabled" {
			worker.Status = "unknown"
		}
	} else {
		worker.Status = "disabled"
	}
	if err := s.repo.UpdateWorker(ctx, worker, input.Enabled != nil); err != nil {
		return nil, err
	}
	return s.repo.GetWorker(ctx, id)
}

func (s *WorkerService) SetEnabled(ctx context.Context, id int64, enabled bool) (*Worker, error) {
	worker, err := s.repo.GetWorker(ctx, id)
	if err != nil {
		return nil, err
	}
	if worker == nil {
		return nil, ErrWorkerNotFound
	}
	if err := s.repo.SetWorkerEnabled(ctx, id, enabled); err != nil {
		return nil, err
	}
	return s.repo.GetWorker(ctx, id)
}

func (s *WorkerService) TestConnection(ctx context.Context, id int64) (*WorkerIdentity, map[string]any, error) {
	worker, key, err := s.workerCredential(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	return s.probeWorker(ctx, worker, key)
}

func (s *WorkerService) StartHeartbeat(parent context.Context) {
	if s == nil || s.repo == nil || s.remote == nil || s.encryptor == nil {
		return
	}
	s.heartbeatMu.Lock()
	defer s.heartbeatMu.Unlock()
	if s.heartbeatCancel != nil {
		return
	}
	ctx, cancel := context.WithCancel(parent)
	s.heartbeatCancel = cancel
	s.heartbeatWG.Add(1)
	go func() {
		defer s.heartbeatWG.Done()
		s.runHeartbeatBatch(ctx)
		ticker := time.NewTicker(heartbeatSchedulerInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.runHeartbeatBatch(ctx)
			}
		}
	}()
}

func (s *WorkerService) StopHeartbeat() {
	if s == nil {
		return
	}
	s.heartbeatMu.Lock()
	cancel := s.heartbeatCancel
	s.heartbeatCancel = nil
	s.heartbeatMu.Unlock()
	if cancel != nil {
		cancel()
		s.heartbeatWG.Wait()
	}
}

func (s *WorkerService) runHeartbeatBatch(ctx context.Context) {
	workers, err := s.repo.ListWorkersDueHeartbeat(ctx, time.Now().UTC(), heartbeatBatchSize)
	if err != nil {
		slog.Warn("worker_heartbeat_list_failed", "error", err)
		return
	}
	if len(workers) == 0 {
		return
	}
	sem := make(chan struct{}, heartbeatParallelism)
	var wg sync.WaitGroup
	for index := range workers {
		worker := workers[index]
		wg.Add(1)
		go func() {
			defer wg.Done()
			select {
			case sem <- struct{}{}:
				defer func() { <-sem }()
			case <-ctx.Done():
				return
			}
			key, keyErr := s.encryptor.Decrypt(worker.ManagementKeyCipher)
			if keyErr != nil {
				message := fmt.Sprintf("decrypt management key: %v", keyErr)
				if persistErr := s.repo.UpdateWorkerHeartbeat(ctx, worker.ID, WorkerHeartbeatObservation{Status: "unreachable", LastError: &message}); persistErr != nil {
					slog.Warn("worker_heartbeat_persist_failed", "worker_id", worker.ID, "error", persistErr)
				}
				return
			}
			// Wait for the shared operation to finish after cancellation. Its HTTP
			// context is rooted in the heartbeat lifecycle, so StopHeartbeat both
			// cancels the request and waits for the probe goroutine to unwind.
			_, _, _ = s.probeWorkerWithParent(context.Background(), ctx, &worker, key)
		}()
	}
	wg.Wait()
}

func (s *WorkerService) probeWorker(ctx context.Context, worker *Worker, key string) (*WorkerIdentity, map[string]any, error) {
	if err := ctx.Err(); err != nil {
		return nil, nil, err
	}
	return s.probeWorkerWithParent(ctx, context.WithoutCancel(ctx), worker, key)
}

func (s *WorkerService) probeWorkerWithParent(waitCtx, probeParent context.Context, worker *Worker, key string) (*WorkerIdentity, map[string]any, error) {
	// Waiting and execution have separate parents: request callers can stop
	// waiting without canceling a shared probe, while the heartbeat lifecycle
	// can cancel its actual HTTP work during service shutdown.
	probeTimeout := time.Duration(worker.HeartbeatTimeoutSeconds) * time.Second
	if probeTimeout <= 0 {
		probeTimeout = defaultHeartbeatTimeout * time.Second
	}
	credentialHash := sha256.Sum256([]byte(key))
	probeKey := fmt.Sprintf("%d:%s:%x", worker.ID, worker.BaseURL, credentialHash)
	resultChannel := s.probeGroup.DoChan(probeKey, func() (any, error) {
		probeCtx, cancelProbe := context.WithTimeout(probeParent, probeTimeout)
		defer cancelProbe()
		started := time.Now()
		identity, identityErr := s.remote.Identity(probeCtx, worker.BaseURL, key)
		latency := time.Since(started).Milliseconds()
		if identityErr != nil {
			message := identityErr.Error()
			persistErr := s.repo.UpdateWorkerHeartbeat(probeCtx, worker.ID, WorkerHeartbeatObservation{Status: "unreachable", LastError: &message, LatencyMS: latency})
			if persistErr != nil {
				slog.Warn("worker_heartbeat_persist_failed", "worker_id", worker.ID, "error", persistErr)
				return nil, errors.Join(identityErr, fmt.Errorf("persist worker heartbeat: %w", persistErr))
			}
			return nil, identityErr
		}
		if validateErr := validateWorkerIdentity(identity, worker.RemoteWorkerID); validateErr != nil {
			message := validateErr.Error()
			persistErr := s.repo.UpdateWorkerHeartbeat(probeCtx, worker.ID, WorkerHeartbeatObservation{Identity: *identity, Status: "identity_mismatch", LastError: &message, Reachable: true, LatencyMS: latency})
			if persistErr != nil {
				slog.Warn("worker_heartbeat_persist_failed", "worker_id", worker.ID, "error", persistErr)
				return nil, errors.Join(validateErr, fmt.Errorf("persist worker heartbeat: %w", persistErr))
			}
			return nil, validateErr
		}
		ready, readyErr := s.remote.Ready(probeCtx, worker.BaseURL, key)
		latency = time.Since(started).Milliseconds()
		observation := WorkerHeartbeatObservation{Identity: *identity, Status: "ready", Reachable: true, LatencyMS: latency}
		if readyErr != nil {
			message := readyErr.Error()
			observation.Status = "unready"
			observation.LastError = &message
		}
		persistErr := s.repo.UpdateWorkerHeartbeat(probeCtx, worker.ID, observation)
		if persistErr != nil {
			slog.Warn("worker_heartbeat_persist_failed", "worker_id", worker.ID, "error", persistErr)
			persistErr = fmt.Errorf("persist worker heartbeat: %w", persistErr)
		}
		return &workerProbeResult{identity: identity, ready: ready, err: errors.Join(readyErr, persistErr)}, nil
	})
	var result singleflight.Result
	select {
	case <-waitCtx.Done():
		return nil, nil, waitCtx.Err()
	case result = <-resultChannel:
	}
	if result.Err != nil {
		return nil, nil, result.Err
	}
	probeResult, _ := result.Val.(*workerProbeResult)
	if probeResult == nil {
		return nil, nil, errors.New("worker heartbeat probe returned no result")
	}
	return probeResult.identity, probeResult.ready, probeResult.err
}

type workerProbeResult struct {
	identity *WorkerIdentity
	ready    map[string]any
	err      error
}

func (s *WorkerService) CreateAPIKeyAccount(ctx context.Context, workerID int64, input WorkerAccountCreateInput) (*WorkerAccount, error) {
	input.Kind = "openai_api_key"
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response struct {
		Account map[string]any `json:"account"`
	}
	if err := s.remote.Post(ctx, worker.BaseURL, key, "/worker/v1/accounts/openai/api-key", input, &response); err != nil {
		return nil, err
	}
	return s.persistRemoteAccount(ctx, workerID, response.Account)
}

func (s *WorkerService) CreateAccount(ctx context.Context, workerID int64, input WorkerAccountCreateInput) (*WorkerAccount, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response struct {
		Account map[string]any `json:"account"`
	}
	path := "/worker/v1/accounts"
	if strings.TrimSpace(input.Kind) == "" || strings.TrimSpace(input.Kind) == "openai_api_key" {
		path = "/worker/v1/accounts/openai/api-key"
	}
	if err := s.remote.Post(ctx, worker.BaseURL, key, path, input, &response); err != nil {
		return nil, err
	}
	return s.persistRemoteAccount(ctx, workerID, response.Account)
}

func (s *WorkerService) StartOAuth(ctx context.Context, workerID int64, input WorkerAccountCreateInput) (map[string]any, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response struct {
		Data map[string]any `json:"data"`
	}
	if err := s.remote.Post(ctx, worker.BaseURL, key, "/worker/v1/accounts/openai/oauth/start", input, &response); err != nil {
		return nil, err
	}
	return response.Data, nil
}

func (s *WorkerService) CompleteOAuth(ctx context.Context, workerID int64, input WorkerOAuthCompleteInput) (*WorkerAccount, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response struct {
		Account map[string]any `json:"account"`
	}
	if err := s.remote.Post(ctx, worker.BaseURL, key, "/worker/v1/accounts/openai/oauth/complete", input, &response); err != nil {
		return nil, err
	}
	return s.persistRemoteAccount(ctx, workerID, response.Account)
}

func (s *WorkerService) RefreshAccount(ctx context.Context, workerID int64, remoteAccountID string) (map[string]any, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response map[string]any
	path := "/worker/v1/accounts/" + url.PathEscape(remoteAccountID) + "/refresh"
	if err := s.remote.Post(ctx, worker.BaseURL, key, path, map[string]any{}, &response); err != nil {
		return nil, err
	}
	if remote, ok := response["account"].(map[string]any); ok {
		if _, err := s.persistRemoteAccount(ctx, workerID, remote); err != nil {
			return nil, err
		}
	}
	return response, nil
}

func (s *WorkerService) TestAccount(ctx context.Context, workerID int64, remoteAccountID string, input WorkerAccountTestInput) (map[string]any, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response map[string]any
	path := "/worker/v1/accounts/" + url.PathEscape(remoteAccountID) + "/test"
	if err := s.remote.Post(ctx, worker.BaseURL, key, path, input, &response); err != nil {
		return nil, err
	}
	if remote, ok := response["account"].(map[string]any); ok {
		if _, err := s.persistRemoteAccount(ctx, workerID, remote); err != nil {
			return nil, err
		}
	}
	return response, nil
}

func (s *WorkerService) DeleteAccount(ctx context.Context, workerID int64, remoteAccountID string) error {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return err
	}
	path := "/worker/v1/accounts/" + url.PathEscape(remoteAccountID)
	if err := s.remote.Delete(ctx, worker.BaseURL, key, path, nil); err != nil {
		return err
	}
	return s.repo.DeleteWorkerAccount(ctx, workerID, remoteAccountID)
}

func (s *WorkerService) ListAccounts(ctx context.Context, workerID int64) ([]WorkerAccount, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response struct {
		Accounts []map[string]any `json:"accounts"`
	}
	if err := s.remote.Get(ctx, worker.BaseURL, key, "/worker/v1/accounts", &response); err != nil {
		return nil, err
	}
	seen := make([]string, 0, len(response.Accounts))
	for _, remote := range response.Accounts {
		account, err := s.persistRemoteAccount(ctx, workerID, remote)
		if err != nil {
			return nil, err
		}
		seen = append(seen, account.RemoteAccountID)
	}
	// Prune local index entries that no longer exist on the selected Worker so
	// deletes performed outside this process do not leave ghost accounts.
	if err := s.repo.DeleteWorkerAccountsExcept(ctx, workerID, seen); err != nil {
		return nil, err
	}
	return s.repo.ListWorkerAccounts(ctx, workerID)
}

func (s *WorkerService) ListProxies(ctx context.Context, workerID int64) ([]WorkerProxy, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response struct {
		Proxies []map[string]any `json:"proxies"`
	}
	if err := s.remote.Get(ctx, worker.BaseURL, key, "/worker/v1/proxies", &response); err != nil {
		return nil, err
	}
	seen := make([]string, 0, len(response.Proxies))
	for _, remote := range response.Proxies {
		proxy, err := s.persistRemoteProxy(ctx, workerID, remote)
		if err != nil {
			return nil, err
		}
		seen = append(seen, proxy.RemoteProxyID)
	}
	if err := s.repo.DeleteWorkerProxiesExcept(ctx, workerID, seen); err != nil {
		return nil, err
	}
	return s.repo.ListWorkerProxies(ctx, workerID)
}

func (s *WorkerService) CreateProxy(ctx context.Context, workerID int64, input WorkerProxyInput) (*WorkerProxy, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response struct {
		Proxy map[string]any `json:"proxy"`
	}
	if err := s.remote.Post(ctx, worker.BaseURL, key, "/worker/v1/proxies", input, &response); err != nil {
		return nil, err
	}
	return s.persistRemoteProxy(ctx, workerID, response.Proxy)
}

func (s *WorkerService) UpdateProxy(ctx context.Context, workerID int64, remoteProxyID string, input WorkerProxyInput) (*WorkerProxy, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response struct {
		Proxy map[string]any `json:"proxy"`
	}
	path := "/worker/v1/proxies/" + url.PathEscape(remoteProxyID)
	if err := s.remote.Put(ctx, worker.BaseURL, key, path, input, &response); err != nil {
		return nil, err
	}
	return s.persistRemoteProxy(ctx, workerID, response.Proxy)
}

func (s *WorkerService) TestProxy(ctx context.Context, workerID int64, remoteProxyID string) (map[string]any, error) {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return nil, err
	}
	var response map[string]any
	path := "/worker/v1/proxies/" + url.PathEscape(remoteProxyID) + "/test"
	if err := s.remote.Post(ctx, worker.BaseURL, key, path, map[string]any{}, &response); err != nil {
		return nil, err
	}
	if remote, ok := response["proxy"].(map[string]any); ok {
		if _, err := s.persistRemoteProxy(ctx, workerID, remote); err != nil {
			return nil, err
		}
	}
	return response, nil
}

func (s *WorkerService) DeleteProxy(ctx context.Context, workerID int64, remoteProxyID string) error {
	worker, key, err := s.workerCredential(ctx, workerID)
	if err != nil {
		return err
	}
	path := "/worker/v1/proxies/" + url.PathEscape(remoteProxyID)
	if err := s.remote.Delete(ctx, worker.BaseURL, key, path, nil); err != nil {
		return err
	}
	return s.repo.DeleteWorkerProxy(ctx, workerID, remoteProxyID)
}

func (s *WorkerService) ListLogs(ctx context.Context, workerID int64, limit int, beforeID int64) ([]WorkerLog, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	return s.repo.ListWorkerLogs(ctx, workerID, limit, beforeID)
}

func (s *WorkerService) workerCredential(ctx context.Context, id int64) (*Worker, string, error) {
	worker, err := s.repo.GetWorker(ctx, id)
	if err != nil {
		return nil, "", err
	}
	if worker == nil {
		return nil, "", ErrWorkerNotFound
	}
	key, err := s.encryptor.Decrypt(worker.ManagementKeyCipher)
	if err != nil {
		return nil, "", fmt.Errorf("decrypt management key: %w", err)
	}
	return worker, key, nil
}

func (s *WorkerService) persistRemoteAccount(ctx context.Context, workerID int64, remote map[string]any) (*WorkerAccount, error) {
	id := anyString(remote["id"])
	if id == "" {
		return nil, errors.New("worker returned an invalid account id")
	}
	account := &WorkerAccount{
		WorkerID: workerID, RemoteAccountID: id,
		Name:     anyString(remote["name"]),
		Kind:     anyString(remote["kind"]),
		Status:   anyString(remote["status"]),
		Metadata: sanitizedWorkerMetadata(remote),
	}
	if err := s.repo.UpsertWorkerAccount(ctx, account); err != nil {
		return nil, err
	}
	return account, nil
}

func (s *WorkerService) persistRemoteProxy(ctx context.Context, workerID int64, remote map[string]any) (*WorkerProxy, error) {
	id := anyString(remote["id"])
	if id == "" {
		return nil, errors.New("worker returned an invalid proxy id")
	}
	proxy := &WorkerProxy{
		WorkerID: workerID, RemoteProxyID: id,
		Name:     anyString(remote["name"]),
		Protocol: anyString(remote["protocol"]),
		Host:     anyString(remote["host"]),
		Port:     int(int64FromAny(remote["port"])),
		Status:   anyString(remote["status"]),
		Metadata: sanitizedWorkerMetadata(remote),
	}
	if err := s.repo.UpsertWorkerProxy(ctx, proxy); err != nil {
		return nil, err
	}
	return proxy, nil
}

var workerSecretMetadataKeys = map[string]struct{}{
	"api_key": {}, "access_token": {}, "refresh_token": {}, "id_token": {},
	"password": {}, "client_secret": {}, "private_key": {}, "authorization": {},
	"secret": {}, "token": {}, "service_account_json": {},
}

func sanitizedWorkerMetadata(remote map[string]any) map[string]any {
	metadata, _ := sanitizeWorkerMetadataValue(remote).(map[string]any)
	return metadata
}

func sanitizeWorkerMetadataValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		result := make(map[string]any, len(typed))
		for key, nested := range typed {
			if _, secret := workerSecretMetadataKeys[strings.ToLower(strings.TrimSpace(key))]; secret {
				continue
			}
			result[key] = sanitizeWorkerMetadataValue(nested)
		}
		return result
	case []any:
		result := make([]any, len(typed))
		for index, nested := range typed {
			result[index] = sanitizeWorkerMetadataValue(nested)
		}
		return result
	default:
		return value
	}
}

type WorkerRemoteClient struct {
	http *http.Client
}

func NewWorkerRemoteClient() *WorkerRemoteClient {
	return &WorkerRemoteClient{http: &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}}
}

func (c *WorkerRemoteClient) Identity(ctx context.Context, baseURL, key string) (*WorkerIdentity, error) {
	var response WorkerIdentity
	if err := c.do(ctx, http.MethodGet, baseURL, key, "/worker/v1/identity", nil, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *WorkerRemoteClient) Claim(ctx context.Context, baseURL string, input WorkerClaimInput) (*WorkerIdentity, error) {
	var response WorkerIdentity
	if err := c.do(ctx, http.MethodPost, baseURL, "", "/worker/v1/claim", input, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *WorkerRemoteClient) Ready(ctx context.Context, baseURL, key string) (map[string]any, error) {
	var response map[string]any
	err := c.do(ctx, http.MethodGet, baseURL, key, "/worker/v1/ready", nil, &response)
	return response, err
}

func (c *WorkerRemoteClient) Get(ctx context.Context, baseURL, key, path string, out any) error {
	return c.do(ctx, http.MethodGet, baseURL, key, path, nil, out)
}

func (c *WorkerRemoteClient) Post(ctx context.Context, baseURL, key, path string, body any, out any) error {
	return c.do(ctx, http.MethodPost, baseURL, key, path, body, out)
}

func (c *WorkerRemoteClient) Put(ctx context.Context, baseURL, key, path string, body any, out any) error {
	return c.do(ctx, http.MethodPut, baseURL, key, path, body, out)
}

func (c *WorkerRemoteClient) Delete(ctx context.Context, baseURL, key, path string, out any) error {
	return c.do(ctx, http.MethodDelete, baseURL, key, path, nil, out)
}

func (c *WorkerRemoteClient) do(ctx context.Context, method, baseURL, key, path string, body any, out any) error {
	var reader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(data)
	}
	req, err := http.NewRequestWithContext(ctx, method, strings.TrimRight(baseURL, "/")+path, reader)
	if err != nil {
		return err
	}
	if strings.TrimSpace(key) != "" {
		req.Header.Set("Authorization", "Bearer "+key)
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var failure struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		}
		_ = json.Unmarshal(raw, &failure)
		if failure.Message == "" {
			failure.Message = strings.TrimSpace(string(raw))
		}
		return fmt.Errorf("worker HTTP %d (%s): %s", resp.StatusCode, failure.Code, failure.Message)
	}
	if out != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, out); err != nil {
			return fmt.Errorf("decode worker response: %w", err)
		}
	}
	return nil
}

func normalizeWorkerBaseURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	u, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("invalid worker URL: %w", err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", errors.New("worker URL must use http or https")
	}
	if u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return "", errors.New("worker URL must contain only scheme, host, optional port and path")
	}
	u.Path = strings.TrimRight(u.Path, "/")
	return strings.TrimRight(u.String(), "/"), nil
}

func normalizeWorkerHeartbeat(interval, timeout int) (int, int, error) {
	if interval == 0 {
		interval = defaultHeartbeatInterval
	}
	if timeout == 0 {
		timeout = defaultHeartbeatTimeout
	}
	if interval < 5 || interval > 3600 {
		return 0, 0, errors.New("heartbeat interval must be between 5 and 3600 seconds")
	}
	if timeout < 1 || timeout > 30 {
		return 0, 0, errors.New("heartbeat timeout must be between 1 and 30 seconds")
	}
	return interval, timeout, nil
}

func resolveControlPlaneManagementKey(explicit string) string {
	if key := strings.TrimSpace(explicit); key != "" {
		return key
	}
	return strings.TrimSpace(os.Getenv("AI_GATEWAY_MANAGEMENT_KEY"))
}

func workerLogStreamKey(workerID string) string {
	encoded := base64.RawURLEncoding.EncodeToString([]byte(strings.TrimSpace(workerID)))
	return "aicodex:worker:consume-logs:" + encoded
}

func validateWorkerIdentity(identity *WorkerIdentity, expectedWorkerID string) error {
	if identity == nil || strings.TrimSpace(identity.WorkerID) == "" || strings.TrimSpace(identity.InstanceID) == "" {
		return errors.New("worker returned an incomplete identity")
	}
	if identity.ProtocolVersion != workerProtocolVersion {
		return fmt.Errorf("unsupported worker protocol %q", identity.ProtocolVersion)
	}
	if len(identity.WorkerID) > 128 || len(identity.InstanceID) > 128 || len(identity.ProtocolVersion) > 64 || len(identity.Version) > 64 {
		return errors.New("worker identity exceeds the supported field size")
	}
	if expectedWorkerID != "" && identity.WorkerID != expectedWorkerID {
		return fmt.Errorf("worker identity mismatch: registered=%q observed=%q", expectedWorkerID, identity.WorkerID)
	}
	return nil
}

func int64FromAny(value any) int64 {
	parsed, _ := strconv.ParseInt(anyString(value), 10, 64)
	return parsed
}

func anyString(value any) string {
	if value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case fmt.Stringer:
		return strings.TrimSpace(typed.String())
	case float64:
		if typed == float64(int64(typed)) {
			return strconv.FormatInt(int64(typed), 10)
		}
		return strings.TrimSpace(strconv.FormatFloat(typed, 'f', -1, 64))
	case float32:
		if typed == float32(int64(typed)) {
			return strconv.FormatInt(int64(typed), 10)
		}
		return strings.TrimSpace(strconv.FormatFloat(float64(typed), 'f', -1, 32))
	case int:
		return strconv.Itoa(typed)
	case int64:
		return strconv.FormatInt(typed, 10)
	case json.Number:
		return strings.TrimSpace(typed.String())
	default:
		return strings.TrimSpace(fmt.Sprint(value))
	}
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	message := strings.ToLower(err.Error())
	return strings.Contains(message, "unique") || strings.Contains(message, "duplicate") || strings.Contains(message, "23505")
}
