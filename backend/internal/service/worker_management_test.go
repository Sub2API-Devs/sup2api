package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

type workerTestEncryptor struct{}

func (workerTestEncryptor) Encrypt(value string) (string, error) { return "cipher:" + value, nil }
func (workerTestEncryptor) Decrypt(value string) (string, error) {
	return strings.TrimPrefix(value, "cipher:"), nil
}

type countingWorkerEncryptor struct {
	mu      sync.Mutex
	encrypt int
}

func (e *countingWorkerEncryptor) Encrypt(value string) (string, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.encrypt++
	return "cipher:" + value, nil
}

func (*countingWorkerEncryptor) Decrypt(value string) (string, error) {
	return strings.TrimPrefix(value, "cipher:"), nil
}

type workerTestRepository struct {
	mu           sync.Mutex
	nextID       int64
	workers      map[int64]*Worker
	accounts     []WorkerAccount
	logs         []WorkerLog
	heartbeatErr error
}

func newWorkerTestRepository() *workerTestRepository {
	return &workerTestRepository{nextID: 1, workers: make(map[int64]*Worker)}
}

func (r *workerTestRepository) CreateWorker(_ context.Context, worker *Worker) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	worker.ID = r.nextID
	r.nextID++
	clone := *worker
	r.workers[worker.ID] = &clone
	return nil
}
func (r *workerTestRepository) ListWorkers(context.Context) ([]Worker, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	items := make([]Worker, 0, len(r.workers))
	for _, worker := range r.workers {
		items = append(items, *worker)
	}
	return items, nil
}
func (r *workerTestRepository) GetWorker(_ context.Context, id int64) (*Worker, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	worker := r.workers[id]
	if worker == nil {
		return nil, nil
	}
	clone := *worker
	return &clone, nil
}
func (r *workerTestRepository) GetWorkerByRemoteID(_ context.Context, remoteID string) (*Worker, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, worker := range r.workers {
		if worker.RemoteWorkerID == remoteID {
			clone := *worker
			return &clone, nil
		}
	}
	return nil, nil
}
func (r *workerTestRepository) DeleteWorker(_ context.Context, id int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.workers, id)
	return nil
}
func (r *workerTestRepository) UpdateWorker(_ context.Context, worker *Worker, updateEnabled bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	clone := *worker
	if current := r.workers[worker.ID]; current != nil && !updateEnabled {
		clone.Enabled = current.Enabled
		clone.Status = current.Status
	}
	r.workers[worker.ID] = &clone
	return nil
}
func (r *workerTestRepository) SetWorkerEnabled(_ context.Context, id int64, enabled bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	worker := r.workers[id]
	if worker == nil {
		return ErrWorkerNotFound
	}
	worker.Enabled = enabled
	if enabled {
		if worker.Status == "disabled" {
			worker.Status = "unknown"
		}
	} else {
		worker.Status = "disabled"
	}
	return nil
}
func (r *workerTestRepository) ListWorkersDueHeartbeat(_ context.Context, now time.Time, limit int) ([]Worker, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	items := make([]Worker, 0)
	for _, worker := range r.workers {
		if !worker.Enabled {
			continue
		}
		if worker.LastHeartbeatAt != nil && worker.LastHeartbeatAt.Add(time.Duration(worker.HeartbeatIntervalSeconds)*time.Second).After(now) {
			continue
		}
		items = append(items, *worker)
		if len(items) == limit {
			break
		}
	}
	return items, nil
}
func (r *workerTestRepository) UpdateWorkerHeartbeat(_ context.Context, id int64, observation WorkerHeartbeatObservation) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.heartbeatErr != nil {
		return r.heartbeatErr
	}
	worker := r.workers[id]
	if worker == nil {
		return errors.New("worker not found")
	}
	now := time.Now().UTC()
	worker.LastHeartbeatAt = &now
	worker.LastHeartbeatLatencyMS = observation.LatencyMS
	worker.LastError = observation.LastError
	if observation.Reachable {
		worker.ConsecutiveFailures = 0
		worker.LastSeenAt = &now
	} else {
		worker.ConsecutiveFailures++
	}
	if worker.Enabled {
		worker.Status = observation.Status
	} else {
		worker.Status = "disabled"
	}
	if observation.Identity.InstanceID != "" {
		worker.InstanceID = observation.Identity.InstanceID
		worker.ProtocolVersion = observation.Identity.ProtocolVersion
		worker.Version = observation.Identity.Version
	}
	return nil
}
func (r *workerTestRepository) UpsertWorkerAccount(_ context.Context, account *WorkerAccount) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	for i := range r.accounts {
		if r.accounts[i].WorkerID == account.WorkerID && r.accounts[i].RemoteAccountID == account.RemoteAccountID {
			account.ID = r.accounts[i].ID
			r.accounts[i] = *account
			return nil
		}
	}
	account.ID = int64(len(r.accounts) + 1)
	r.accounts = append(r.accounts, *account)
	return nil
}

func (r *workerTestRepository) DeleteWorkerAccountsExcept(_ context.Context, workerID int64, keepRemoteIDs []string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	keep := make(map[string]struct{}, len(keepRemoteIDs))
	for _, id := range keepRemoteIDs {
		keep[id] = struct{}{}
	}
	filtered := r.accounts[:0]
	for _, account := range r.accounts {
		if account.WorkerID != workerID {
			filtered = append(filtered, account)
			continue
		}
		if _, ok := keep[account.RemoteAccountID]; ok {
			filtered = append(filtered, account)
		}
	}
	r.accounts = filtered
	return nil
}
func (r *workerTestRepository) ListWorkerAccounts(_ context.Context, workerID int64) ([]WorkerAccount, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	items := make([]WorkerAccount, 0)
	for _, account := range r.accounts {
		if account.WorkerID == workerID {
			items = append(items, account)
		}
	}
	return items, nil
}
func (r *workerTestRepository) DeleteWorkerAccount(_ context.Context, workerID int64, remoteAccountID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	filtered := r.accounts[:0]
	for _, account := range r.accounts {
		if account.WorkerID != workerID || account.RemoteAccountID != remoteAccountID {
			filtered = append(filtered, account)
		}
	}
	r.accounts = filtered
	return nil
}
func (r *workerTestRepository) InsertWorkerLog(_ context.Context, entry *WorkerLog) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.logs = append(r.logs, *entry)
	return nil
}
func (r *workerTestRepository) ListWorkerLogs(_ context.Context, workerID int64, limit int, beforeID int64) ([]WorkerLog, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	items := make([]WorkerLog, 0)
	for _, entry := range r.logs {
		if entry.WorkerID == workerID && (beforeID == 0 || entry.ID < beforeID) {
			items = append(items, entry)
			if len(items) == limit {
				break
			}
		}
	}
	return items, nil
}

func TestWorkerServiceRegistersAndOperatesOnSelectedRemoteWorker(t *testing.T) {
	var authorization []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		authorization = append(authorization, request.Header.Get("Authorization"))
		w.Header().Set("Content-Type", "application/json")
		switch request.URL.Path {
		case "/worker/v1/identity":
			_, _ = w.Write([]byte(`{"success":true,"protocol_version":"aicodex.proxy-worker/v1","kind":"ai-gateway-caddy","worker_id":"worker-a","instance_id":"instance-a","version":"1.2.3"}`))
		case "/worker/v1/ready":
			_, _ = w.Write([]byte(`{"success":true,"ready":true}`))
		case "/worker/v1/accounts/openai/api-key":
			_, _ = w.Write([]byte(`{"success":true,"account":{"id":42,"name":"remote-key","kind":"openai_api_key","status":1}}`))
		case "/worker/v1/accounts":
			_, _ = w.Write([]byte(`{"success":true,"accounts":[{"id":42,"name":"remote-key","kind":"openai_api_key","status":1},{"id":84,"name":"existing-oauth","kind":"openai_oauth","status":1,"models":"gpt-5.4"}]}`))
		case "/worker/v1/accounts/42/refresh":
			_, _ = w.Write([]byte(`{"success":true,"data":{"refreshed":true}}`))
		case "/worker/v1/accounts/42", "/worker/v1/accounts/84":
			if request.Method != http.MethodDelete {
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}
			_, _ = w.Write([]byte(`{"success":true,"deleted":true}`))
		default:
			http.NotFound(w, request)
		}
	}))
	defer server.Close()

	repo := newWorkerTestRepository()
	manager := NewWorkerService(repo, workerTestEncryptor{}, NewWorkerRemoteClient())
	managementKey := strings.Repeat("m", 32)
	worker, err := manager.Create(context.Background(), CreateWorkerInput{
		Name: "Primary Worker", BaseURL: server.URL, ManagementKey: managementKey,
	})
	if err != nil {
		t.Fatal(err)
	}
	if worker.RemoteWorkerID != "worker-a" || worker.ManagementKeyCipher != "cipher:"+managementKey {
		t.Fatalf("unexpected worker: %+v", worker)
	}
	if _, _, err := manager.TestConnection(context.Background(), worker.ID); err != nil {
		t.Fatal(err)
	}
	account, err := manager.CreateAPIKeyAccount(context.Background(), worker.ID, WorkerAccountCreateInput{
		Name: "remote-key", APIKey: "sk-secret",
	})
	if err != nil {
		t.Fatal(err)
	}
	if account.RemoteAccountID != "42" || account.WorkerID != worker.ID {
		t.Fatalf("unexpected account: %+v", account)
	}
	// Remote list is authoritative: accounts missing from the Worker response
	// (including stale local rows) must disappear from the control-plane index.
	if err := manager.repo.UpsertWorkerAccount(context.Background(), &WorkerAccount{
		WorkerID: worker.ID, RemoteAccountID: "stale", Name: "stale", Kind: "openai_api_key", Status: "active",
	}); err != nil {
		t.Fatal(err)
	}
	accounts, err := manager.ListAccounts(context.Background(), worker.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(accounts) != 2 {
		t.Fatalf("remote account sync failed: %+v", accounts)
	}
	seen := map[string]bool{}
	for _, account := range accounts {
		seen[account.RemoteAccountID] = true
	}
	if !seen["42"] || !seen["84"] || seen["stale"] {
		t.Fatalf("remote account sync/prune failed: %+v", accounts)
	}
	if err := manager.DeleteAccount(context.Background(), worker.ID, "42"); err != nil {
		t.Fatal(err)
	}
	if len(repo.accounts) != 1 || repo.accounts[0].RemoteAccountID != "84" {
		t.Fatalf("local account index delete failed: %+v", repo.accounts)
	}
	for _, value := range authorization {
		if value != "Bearer "+managementKey {
			t.Fatalf("management key was not forwarded as Bearer: %q", value)
		}
	}
}

func TestWorkerServiceUpdatesLifecycleAndMaintainsHeartbeat(t *testing.T) {
	managementKey := strings.Repeat("h", 32)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Authorization") != "Bearer "+managementKey {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		switch request.URL.Path {
		case "/worker/v1/identity":
			_, _ = w.Write([]byte(`{"protocol_version":"aicodex.proxy-worker/v1","worker_id":"worker-heartbeat","instance_id":"instance-heartbeat","version":"2.0.0"}`))
		case "/worker/v1/ready":
			_, _ = w.Write([]byte(`{"ready":true}`))
		default:
			http.NotFound(w, request)
		}
	}))
	defer server.Close()

	repo := newWorkerTestRepository()
	manager := NewWorkerService(repo, workerTestEncryptor{}, NewWorkerRemoteClient())
	worker, err := manager.Create(context.Background(), CreateWorkerInput{Name: "Heartbeat", BaseURL: server.URL, ManagementKey: managementKey})
	if err != nil {
		t.Fatal(err)
	}
	updated, err := manager.Update(context.Background(), worker.ID, UpdateWorkerInput{
		Name: "Heartbeat Updated", BaseURL: server.URL,
		HeartbeatIntervalSeconds: 30, HeartbeatTimeoutSeconds: 3,
	})
	if err != nil || updated.Name != "Heartbeat Updated" || updated.HeartbeatIntervalSeconds != 30 || updated.HeartbeatTimeoutSeconds != 3 {
		t.Fatalf("updated Worker=%+v err=%v", updated, err)
	}
	if _, err := manager.Update(context.Background(), worker.ID, UpdateWorkerInput{
		Name: "Must Not Persist", BaseURL: server.URL, ManagementKey: strings.Repeat("x", 32),
		HeartbeatIntervalSeconds: 30, HeartbeatTimeoutSeconds: 3,
	}); err == nil {
		t.Fatal("invalid replacement credential must be rejected")
	}
	unchanged, _ := repo.GetWorker(context.Background(), worker.ID)
	if unchanged.Name != "Heartbeat Updated" {
		t.Fatalf("failed credential validation mutated Worker: %+v", unchanged)
	}
	disabled, err := manager.SetEnabled(context.Background(), worker.ID, false)
	if err != nil || disabled.Enabled || disabled.Status != "disabled" {
		t.Fatalf("disabled Worker=%+v err=%v", disabled, err)
	}
	due, err := repo.ListWorkersDueHeartbeat(context.Background(), time.Now().Add(time.Hour), 10)
	if err != nil || len(due) != 0 {
		t.Fatalf("disabled Worker entered heartbeat queue: %+v err=%v", due, err)
	}
	if _, err := manager.SetEnabled(context.Background(), worker.ID, true); err != nil {
		t.Fatal(err)
	}
	if _, _, err := manager.TestConnection(context.Background(), worker.ID); err != nil {
		t.Fatal(err)
	}
	heartbeat, _ := repo.GetWorker(context.Background(), worker.ID)
	if heartbeat.Status != "ready" || heartbeat.LastHeartbeatAt == nil || heartbeat.LastSeenAt == nil || heartbeat.ConsecutiveFailures != 0 {
		t.Fatalf("heartbeat observation was not maintained: %+v", heartbeat)
	}
}

func TestWorkerServiceUpdatePreservesUnchangedManagementKeyCiphertext(t *testing.T) {
	managementKey := strings.Repeat("k", 32)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"protocol_version":"aicodex.proxy-worker/v1","worker_id":"worker-key","instance_id":"instance-key","version":"1"}`))
	}))
	defer server.Close()

	repo := newWorkerTestRepository()
	encryptor := &countingWorkerEncryptor{}
	manager := NewWorkerService(repo, encryptor, NewWorkerRemoteClient())
	worker, err := manager.Create(context.Background(), CreateWorkerInput{Name: "Key", BaseURL: server.URL, ManagementKey: managementKey})
	if err != nil {
		t.Fatal(err)
	}
	originalCiphertext := worker.ManagementKeyCipher
	updated, err := manager.Update(context.Background(), worker.ID, UpdateWorkerInput{
		Name: "Renamed", BaseURL: server.URL, HeartbeatIntervalSeconds: 20, HeartbeatTimeoutSeconds: 4,
	})
	if err != nil {
		t.Fatal(err)
	}
	if updated.ManagementKeyCipher != originalCiphertext {
		t.Fatalf("unchanged management key ciphertext changed: before=%q after=%q", originalCiphertext, updated.ManagementKeyCipher)
	}
	encryptor.mu.Lock()
	encryptCalls := encryptor.encrypt
	encryptor.mu.Unlock()
	if encryptCalls != 1 {
		t.Fatalf("unchanged management key was re-encrypted %d times", encryptCalls)
	}
}

func TestWorkerServiceProbeReportsHeartbeatPersistenceFailure(t *testing.T) {
	managementKey := strings.Repeat("p", 32)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch request.URL.Path {
		case "/worker/v1/identity":
			_, _ = w.Write([]byte(`{"protocol_version":"aicodex.proxy-worker/v1","worker_id":"worker-persist","instance_id":"instance-persist","version":"1"}`))
		case "/worker/v1/ready":
			_, _ = w.Write([]byte(`{"ready":true}`))
		default:
			http.NotFound(w, request)
		}
	}))
	defer server.Close()

	repo := newWorkerTestRepository()
	repo.workers[1] = &Worker{ID: 1, BaseURL: server.URL, RemoteWorkerID: "worker-persist", ManagementKeyCipher: "cipher:" + managementKey, Enabled: true, HeartbeatTimeoutSeconds: 2}
	repo.heartbeatErr = errors.New("database unavailable")
	manager := NewWorkerService(repo, workerTestEncryptor{}, NewWorkerRemoteClient())
	identity, ready, err := manager.TestConnection(context.Background(), 1)
	if identity == nil || ready["ready"] != true {
		t.Fatalf("remote probe result should remain available: identity=%+v ready=%v", identity, ready)
	}
	if err == nil || !strings.Contains(err.Error(), "persist worker heartbeat") {
		t.Fatalf("heartbeat persistence failure was hidden: %v", err)
	}
}

func TestWorkerServiceSharedProbeOutlivesCanceledCaller(t *testing.T) {
	managementKey := strings.Repeat("s", 32)
	identityStarted := make(chan struct{})
	releaseIdentity := make(chan struct{})
	var identityCalls int
	var callsMu sync.Mutex
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch request.URL.Path {
		case "/worker/v1/identity":
			callsMu.Lock()
			identityCalls++
			if identityCalls == 1 {
				close(identityStarted)
			}
			callsMu.Unlock()
			<-releaseIdentity
			_, _ = w.Write([]byte(`{"protocol_version":"aicodex.proxy-worker/v1","worker_id":"worker-shared","instance_id":"instance-shared","version":"1"}`))
		case "/worker/v1/ready":
			_, _ = w.Write([]byte(`{"ready":true}`))
		default:
			http.NotFound(w, request)
		}
	}))
	defer server.Close()

	repo := newWorkerTestRepository()
	repo.workers[1] = &Worker{ID: 1, BaseURL: server.URL, RemoteWorkerID: "worker-shared", ManagementKeyCipher: "cipher:" + managementKey, Enabled: true, HeartbeatTimeoutSeconds: 2}
	manager := NewWorkerService(repo, workerTestEncryptor{}, NewWorkerRemoteClient())
	firstCtx, cancelFirst := context.WithCancel(context.Background())
	firstDone := make(chan error, 1)
	go func() {
		_, _, err := manager.TestConnection(firstCtx, 1)
		firstDone <- err
	}()
	<-identityStarted
	secondDone := make(chan error, 1)
	go func() {
		_, _, err := manager.TestConnection(context.Background(), 1)
		secondDone <- err
	}()
	time.Sleep(20 * time.Millisecond)
	cancelFirst()
	if err := <-firstDone; !errors.Is(err, context.Canceled) {
		t.Fatalf("canceled caller returned %v", err)
	}
	close(releaseIdentity)
	if err := <-secondDone; err != nil {
		t.Fatalf("shared probe was canceled with its first caller: %v", err)
	}
	callsMu.Lock()
	gotIdentityCalls := identityCalls
	callsMu.Unlock()
	if gotIdentityCalls != 1 {
		t.Fatalf("concurrent callers started %d identity probes, want 1", gotIdentityCalls)
	}
}

func TestWorkerServiceStopHeartbeatCancelsAndWaitsForInflightProbe(t *testing.T) {
	requestStarted := make(chan struct{})
	requestCanceled := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, request *http.Request) {
		close(requestStarted)
		<-request.Context().Done()
		close(requestCanceled)
	}))
	defer server.Close()

	repo := newWorkerTestRepository()
	repo.workers[1] = &Worker{
		ID: 1, BaseURL: server.URL, RemoteWorkerID: "worker-stop", ManagementKeyCipher: "cipher:" + strings.Repeat("z", 32),
		Enabled: true, HeartbeatIntervalSeconds: 15, HeartbeatTimeoutSeconds: 30,
	}
	manager := NewWorkerService(repo, workerTestEncryptor{}, NewWorkerRemoteClient())
	manager.StartHeartbeat(context.Background())
	select {
	case <-requestStarted:
	case <-time.After(2 * time.Second):
		t.Fatal("heartbeat probe did not start")
	}

	stopped := make(chan struct{})
	go func() {
		manager.StopHeartbeat()
		close(stopped)
	}()
	select {
	case <-requestCanceled:
	case <-time.After(2 * time.Second):
		t.Fatal("StopHeartbeat did not cancel the in-flight HTTP probe")
	}
	select {
	case <-stopped:
	case <-time.After(2 * time.Second):
		t.Fatal("StopHeartbeat returned before the in-flight probe unwound")
	}
}

func TestWorkerServiceAlwaysRoutesAccountOperationsToSelectedWorker(t *testing.T) {
	type callLog struct {
		mu    sync.Mutex
		paths []string
	}
	newRemote := func(workerID string, calls *callLog) *httptest.Server {
		expectedKey := strings.Repeat(strings.TrimPrefix(workerID, "worker-"), 32)
		return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
			calls.mu.Lock()
			calls.paths = append(calls.paths, request.Method+" "+request.URL.Path)
			calls.mu.Unlock()
			if request.Header.Get("Authorization") != "Bearer "+expectedKey {
				http.Error(w, "bad management key", http.StatusUnauthorized)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			switch request.URL.Path {
			case "/worker/v1/identity":
				_, _ = w.Write([]byte(`{"protocol_version":"aicodex.proxy-worker/v1","worker_id":"` + workerID + `","instance_id":"instance-` + workerID + `","version":"test"}`))
			case "/worker/v1/ready":
				_, _ = w.Write([]byte(`{"ready":true,"checks":{"caddy_runtime":"ok","database":"ok","consume_log_mq":"ok"}}`))
			case "/worker/v1/accounts/openai/api-key":
				_, _ = w.Write([]byte(`{"account":{"id":21,"name":"api-key","kind":"openai_api_key","status":1}}`))
			case "/worker/v1/accounts/openai/oauth/start":
				_, _ = w.Write([]byte(`{"data":{"session_id":"session-b","authorize_url":"https://auth.example","expires_in":600}}`))
			case "/worker/v1/accounts/openai/oauth/complete":
				_, _ = w.Write([]byte(`{"account":{"id":22,"name":"oauth","kind":"openai_oauth","status":1}}`))
			case "/worker/v1/accounts/22/refresh", "/worker/v1/accounts/22/test":
				_, _ = w.Write([]byte(`{"success":true}`))
			default:
				http.NotFound(w, request)
			}
		}))
	}

	var callsA, callsB callLog
	remoteA, remoteB := newRemote("worker-a", &callsA), newRemote("worker-b", &callsB)
	defer remoteA.Close()
	defer remoteB.Close()
	repo := newWorkerTestRepository()
	manager := NewWorkerService(repo, workerTestEncryptor{}, NewWorkerRemoteClient())
	workerA, err := manager.Create(context.Background(), CreateWorkerInput{Name: "A", BaseURL: remoteA.URL, ManagementKey: strings.Repeat("a", 32)})
	if err != nil {
		t.Fatal(err)
	}
	workerB, err := manager.Create(context.Background(), CreateWorkerInput{Name: "B", BaseURL: remoteB.URL, ManagementKey: strings.Repeat("b", 32)})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := manager.CreateAPIKeyAccount(context.Background(), workerB.ID, WorkerAccountCreateInput{Name: "key", APIKey: "sk-test"}); err != nil {
		t.Fatal(err)
	}
	started, err := manager.StartOAuth(context.Background(), workerB.ID, WorkerAccountCreateInput{Name: "oauth"})
	if err != nil || started["session_id"] != "session-b" {
		t.Fatalf("start oauth result=%v err=%v", started, err)
	}
	if _, err := manager.CompleteOAuth(context.Background(), workerB.ID, WorkerOAuthCompleteInput{SessionID: "session-b", Input: "callback"}); err != nil {
		t.Fatal(err)
	}
	if _, err := manager.RefreshAccount(context.Background(), workerB.ID, "22"); err != nil {
		t.Fatal(err)
	}
	if _, err := manager.TestAccount(context.Background(), workerB.ID, "22", WorkerAccountTestInput{Model: "gpt-5.4"}); err != nil {
		t.Fatal(err)
	}
	if workerA.ID == workerB.ID {
		t.Fatal("workers must have distinct local IDs")
	}
	if _, ready, err := manager.TestConnection(context.Background(), workerB.ID); err != nil || ready["ready"] != true {
		t.Fatalf("selected worker connection test ready=%v err=%v", ready, err)
	}
	callsA.mu.Lock()
	pathsA := append([]string(nil), callsA.paths...)
	callsA.mu.Unlock()
	callsB.mu.Lock()
	pathsB := append([]string(nil), callsB.paths...)
	callsB.mu.Unlock()
	if len(pathsA) != 1 || pathsA[0] != "GET /worker/v1/identity" {
		t.Fatalf("worker A received operations intended for B: %v", pathsA)
	}
	for _, expected := range []string{
		"POST /worker/v1/accounts/openai/api-key",
		"POST /worker/v1/accounts/openai/oauth/start",
		"POST /worker/v1/accounts/openai/oauth/complete",
		"POST /worker/v1/accounts/22/refresh",
		"POST /worker/v1/accounts/22/test",
		"GET /worker/v1/ready",
	} {
		found := false
		for _, call := range pathsB {
			if call == expected {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("selected worker B did not receive %q; calls=%v", expected, pathsB)
		}
	}
}

func TestWorkerRemoteClientRejectsRedirectsAndUnsafeURLShapes(t *testing.T) {
	redirected := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Redirect(w, nil, "https://example.com", http.StatusFound)
	}))
	defer redirected.Close()
	if _, err := NewWorkerRemoteClient().Identity(context.Background(), redirected.URL, "key"); err == nil {
		t.Fatal("redirecting worker must be rejected")
	}
	for _, raw := range []string{"file:///tmp/worker", "https://user:pass@example.com", "https://example.com?key=x"} {
		if _, err := normalizeWorkerBaseURL(raw); err == nil {
			t.Fatalf("unsafe worker URL should fail: %s", raw)
		}
	}
}

func TestWorkerLogConsumerPersistsWorkerScopedRedisMessage(t *testing.T) {
	repo := newWorkerTestRepository()
	consumer := &WorkerLogConsumer{repo: repo}
	payload, _ := json.Marshal(map[string]any{"model_name": "gpt-5.4", "total_tokens": 12})
	err := consumer.consume(context.Background(), Worker{ID: 9, RemoteWorkerID: "worker-a"}, redis.XMessage{
		ID: "1-0",
		Values: map[string]any{
			"event_id": "event-1", "event_type": "consume", "worker_id": "worker-a", "instance_id": "instance-a",
			"request_id": "req-1", "channel_id": "42", "model_name": "gpt-5.4",
			"created_at": "123", "payload_json": string(payload),
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(repo.logs) != 1 || repo.logs[0].WorkerID != 9 || repo.logs[0].EventID != "event-1" || repo.logs[0].RequestID != "req-1" {
		t.Fatalf("worker log isolation failed: %+v", repo.logs)
	}
}

func TestWorkerLogConsumerKeepsStreamsAndQueriesIsolatedPerWorker(t *testing.T) {
	mini := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: mini.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	repo := newWorkerTestRepository()
	repo.workers[1] = &Worker{ID: 1, Name: "A", RemoteWorkerID: "worker-a", LogStreamKey: "aicodex:worker:consume-logs:worker-a"}
	repo.workers[2] = &Worker{ID: 2, Name: "B", RemoteWorkerID: "worker-b", LogStreamKey: "aicodex:worker:consume-logs:worker-b"}
	consumer := NewWorkerLogConsumer(repo, client)
	t.Cleanup(func() { consumer.Close(time.Second) })

	for _, item := range []struct {
		stream, workerID, requestID, model string
	}{
		{"aicodex:worker:consume-logs:worker-a", "worker-a", "request-a", "gpt-a"},
		{"aicodex:worker:consume-logs:worker-b", "worker-b", "request-b", "gpt-b"},
	} {
		if err := client.XAdd(context.Background(), &redis.XAddArgs{Stream: item.stream, Values: map[string]any{
			"event_id": "same-event-id", "event_type": "consume", "worker_id": item.workerID, "request_id": item.requestID,
			"channel_id": "7", "model_name": item.model, "created_at": "123", "payload_json": `{"total_tokens":3}`,
		}}).Err(); err != nil {
			t.Fatal(err)
		}
	}

	deadline := time.Now().Add(2 * time.Second)
	for {
		repo.mu.Lock()
		count := len(repo.logs)
		repo.mu.Unlock()
		if count == 2 || time.Now().After(deadline) {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	logsA, err := (&WorkerService{repo: repo}).ListLogs(context.Background(), 1, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	logsB, err := (&WorkerService{repo: repo}).ListLogs(context.Background(), 2, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(logsA) != 1 || logsA[0].RequestID != "request-a" || logsA[0].ModelName != "gpt-a" {
		t.Fatalf("worker A log isolation failed: %+v", logsA)
	}
	if len(logsB) != 1 || logsB[0].RequestID != "request-b" || logsB[0].ModelName != "gpt-b" {
		t.Fatalf("worker B log isolation failed: %+v", logsB)
	}
}

func TestWorkerLogConsumerRejectsMismatchedWorkerIdentity(t *testing.T) {
	repo := newWorkerTestRepository()
	consumer := &WorkerLogConsumer{repo: repo}
	err := consumer.consume(context.Background(), Worker{ID: 1, RemoteWorkerID: "worker-a"}, redis.XMessage{
		ID: "1-0", Values: map[string]any{
			"worker_id": "worker-b", "event_id": "event-b", "payload_json": `{}`,
		},
	})
	if !errors.Is(err, errWorkerLogIdentityMismatch) || len(repo.logs) != 0 {
		t.Fatalf("mismatched Worker log must not be persisted: err=%v logs=%+v", err, repo.logs)
	}
}
