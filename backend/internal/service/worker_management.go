package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const workerProtocolVersion = "aicodex.proxy-worker/v1"

type Worker struct {
	ID                  int64      `json:"id"`
	Name                string     `json:"name"`
	BaseURL             string     `json:"base_url"`
	RemoteWorkerID      string     `json:"remote_worker_id"`
	InstanceID          string     `json:"instance_id"`
	ProtocolVersion     string     `json:"protocol_version"`
	Version             string     `json:"version"`
	Status              string     `json:"status"`
	LogStreamKey        string     `json:"log_stream_key"`
	LastSeenAt          *time.Time `json:"last_seen_at,omitempty"`
	LastError           *string    `json:"last_error,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
	ManagementKeyCipher string     `json:"-"`
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
	Name                 string `json:"name"`
	BaseURL              string `json:"base_url"`
	PairingToken         string `json:"pairing_token,omitempty"`
	RemoteWorkerID       string `json:"worker_id,omitempty"`
	ManagementKey        string `json:"management_key"`
	VaultKey             string `json:"vault_key,omitempty"`
	ControlPlaneTarget   string `json:"control_plane_target,omitempty"`
	ControlPlaneInsecure bool   `json:"control_plane_insecure"`
}

type WorkerAccountCreateInput struct {
	Name      string `json:"name"`
	APIKey    string `json:"api_key,omitempty"`
	BaseURL   string `json:"base_url,omitempty"`
	Models    string `json:"models,omitempty"`
	Group     string `json:"group,omitempty"`
	TestModel string `json:"test_model,omitempty"`
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
	UpdateWorkerObservation(context.Context, int64, WorkerIdentity, string, *string) error
	UpsertWorkerAccount(context.Context, *WorkerAccount) error
	DeleteWorkerAccount(context.Context, int64, string) error
	DeleteWorkerAccountsExcept(context.Context, int64, []string) error
	ListWorkerAccounts(context.Context, int64) ([]WorkerAccount, error)
	InsertWorkerLog(context.Context, *WorkerLog) error
	ListWorkerLogs(context.Context, int64, int, int64) ([]WorkerLog, error)
}

type WorkerService struct {
	repo      WorkerRepository
	encryptor SecretEncryptor
	remote    *WorkerRemoteClient
}

func NewWorkerService(repo WorkerRepository, encryptor SecretEncryptor, remote *WorkerRemoteClient) *WorkerService {
	return &WorkerService{repo: repo, encryptor: encryptor, remote: remote}
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
	key := strings.TrimSpace(input.ManagementKey)
	if len(key) < 32 {
		return nil, errors.New("management key must contain at least 32 characters")
	}
	var identity *WorkerIdentity
	if strings.TrimSpace(input.PairingToken) != "" {
		remoteWorkerID := strings.TrimSpace(input.RemoteWorkerID)
		if remoteWorkerID == "" {
			return nil, errors.New("worker_id is required when claiming an unclaimed Worker")
		}
		if len(remoteWorkerID) > 128 {
			return nil, errors.New("worker_id exceeds the supported field size")
		}
		if strings.TrimSpace(input.VaultKey) == "" {
			return nil, errors.New("vault_key is required when claiming an unclaimed Worker")
		}
		if strings.TrimSpace(input.ControlPlaneTarget) == "" {
			return nil, errors.New("control_plane_target is required when claiming an unclaimed Worker")
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
		identity, err = s.remote.Claim(ctx, baseURL, WorkerClaimInput{
			PairingToken: strings.TrimSpace(input.PairingToken), WorkerID: remoteWorkerID,
			ManagementKey: key, VaultKey: strings.TrimSpace(input.VaultKey),
			ControlPlaneTarget: strings.TrimSpace(input.ControlPlaneTarget), ControlPlaneInsecure: input.ControlPlaneInsecure,
		})
	} else {
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
		Status: "connected", LogStreamKey: logStreamKey, LastSeenAt: &now,
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
	ManagementKey        string `json:"management_key"`
	VaultKey             string `json:"vault_key"`
	ControlPlaneTarget   string `json:"control_plane_target"`
	ControlPlaneInsecure bool   `json:"control_plane_insecure"`
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

func (s *WorkerService) TestConnection(ctx context.Context, id int64) (*WorkerIdentity, map[string]any, error) {
	worker, key, err := s.workerCredential(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	identity, err := s.remote.Identity(ctx, worker.BaseURL, key)
	if err != nil {
		message := err.Error()
		_ = s.repo.UpdateWorkerObservation(ctx, id, WorkerIdentity{}, "unreachable", &message)
		return nil, nil, err
	}
	if err := validateWorkerIdentity(identity, worker.RemoteWorkerID); err != nil {
		message := err.Error()
		_ = s.repo.UpdateWorkerObservation(ctx, id, WorkerIdentity{}, "identity_mismatch", &message)
		return nil, nil, err
	}
	ready, readyErr := s.remote.Ready(ctx, worker.BaseURL, key)
	status := "ready"
	var lastError *string
	if readyErr != nil {
		status = "unready"
		message := readyErr.Error()
		lastError = &message
	}
	_ = s.repo.UpdateWorkerObservation(ctx, id, *identity, status, lastError)
	return identity, ready, readyErr
}

func (s *WorkerService) CreateAPIKeyAccount(ctx context.Context, workerID int64, input WorkerAccountCreateInput) (*WorkerAccount, error) {
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
		return nil, "", errors.New("worker not found")
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
		Name:   anyString(remote["name"]),
		Kind:   anyString(remote["kind"]),
		Status: anyString(remote["status"]), Metadata: remote,
	}
	if err := s.repo.UpsertWorkerAccount(ctx, account); err != nil {
		return nil, err
	}
	return account, nil
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
