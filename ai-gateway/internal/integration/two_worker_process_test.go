package integration

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"google.golang.org/grpc"
)

type workerProcess struct {
	workerID   string
	instanceID string
	management string
	vaultKey   string
	address    string
	configPath string
	cmd        *exec.Cmd
	logs       *lockedBuffer
	wait       chan error
}

type lockedBuffer struct {
	mu sync.Mutex
	b  bytes.Buffer
}

func (b *lockedBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.b.Write(p)
}

func (b *lockedBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.b.String()
}

func TestTwoUIClaimedWorkerProcessesKeepAccountsAndSettlementIdentityIsolated(t *testing.T) {
	moduleRoot, err := filepath.Abs(filepath.Join("..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	binary := filepath.Join(t.TempDir(), "ai-gateway")
	build := exec.Command("go", "build", "-o", binary, "./cmd/ai-gateway")
	build.Dir = moduleRoot
	if output, err := build.CombinedOutput(); err != nil {
		t.Fatalf("build ai-gateway process: %v\n%s", err, output)
	}

	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/models":
			if !strings.HasPrefix(r.Header.Get("Authorization"), "Bearer sk-worker-") {
				http.Error(w, "missing Worker-local API key", http.StatusUnauthorized)
				return
			}
			_, _ = io.WriteString(w, `{"data":[]}`)
		case "/responses":
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = io.WriteString(w, "data: {\"type\":\"response.completed\",\"usage\":{\"input_tokens\":1,\"output_tokens\":2}}\n\n")
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()

	controlListener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	control := &controlServer{
		upstreamURL: upstream.URL,
		opened:      make(chan *controlv1.OpenRequestRequest, 4),
		settled:     make(chan *controlv1.SettleRequestRequest, 4),
	}
	grpcServer := grpc.NewServer()
	controlv1.RegisterDataPlaneControlServer(grpcServer, control)
	go func() { _ = grpcServer.Serve(controlListener) }()
	defer grpcServer.Stop()

	workers := []*workerProcess{
		startUnclaimedWorkerProcess(t, binary, "worker-a", strings.Repeat("a", 32)),
		startUnclaimedWorkerProcess(t, binary, "worker-b", strings.Repeat("b", 32)),
	}
	defer func() {
		for _, worker := range workers {
			stopWorkerProcess(t, worker)
		}
	}()

	for _, worker := range workers {
		claimWorkerFromUI(t, worker, controlListener.Addr().String())
		waitForWorkerIdentity(t, worker)
		persisted, err := os.ReadFile(worker.configPath)
		if err != nil {
			t.Fatal(err)
		}
		if bytes.Contains(bytes.ToLower(persisted), []byte("redis")) {
			t.Fatalf("%s received Redis configuration: %s", worker.workerID, persisted)
		}
		createBody, _ := json.Marshal(map[string]any{
			"name": "account-" + worker.workerID, "api_key": "sk-" + worker.workerID, "base_url": upstream.URL,
		})
		response, raw := workerRequest(t, worker, http.MethodPost, "/worker/v1/accounts/openai/api-key", string(createBody))
		if response.StatusCode != http.StatusCreated {
			t.Fatalf("create account on %s: status=%d body=%s", worker.workerID, response.StatusCode, raw)
		}
		if bytes.Contains(raw, []byte("sk-"+worker.workerID)) {
			t.Fatalf("%s exposed its API key in the management response: %s", worker.workerID, raw)
		}
	}

	for index, worker := range workers {
		response, raw := workerRequest(t, worker, http.MethodGet, "/worker/v1/accounts", "")
		if response.StatusCode != http.StatusOK || !bytes.Contains(raw, []byte("account-"+worker.workerID)) {
			t.Fatalf("account missing from %s: status=%d body=%s", worker.workerID, response.StatusCode, raw)
		}
		other := workers[1-index]
		if bytes.Contains(raw, []byte("account-"+other.workerID)) {
			t.Fatalf("%s exposed %s account: %s", worker.workerID, other.workerID, raw)
		}
	}

	for _, worker := range workers {
		request, _ := http.NewRequest(http.MethodPost, "http://"+worker.address+"/v1/responses", strings.NewReader(`{"model":"gpt-process","stream":true,"input":"hello"}`))
		request.Header.Set("Authorization", "Bearer client-key")
		response, err := http.DefaultClient.Do(request)
		if err != nil {
			t.Fatalf("AI request through %s: %v", worker.workerID, err)
		}
		_, _ = io.Copy(io.Discard, response.Body)
		_ = response.Body.Close()
		if response.StatusCode != http.StatusOK {
			t.Fatalf("AI request through %s returned %d", worker.workerID, response.StatusCode)
		}
	}

	observed := make(map[string]string, len(workers))
	deadline := time.After(5 * time.Second)
	for len(observed) < len(workers) {
		select {
		case settlement := <-control.settled:
			observed[settlement.GetDataPlaneId()] = settlement.GetDataPlaneInstanceId()
		case <-deadline:
			t.Fatalf("missing per-Worker settlements: %+v", observed)
		}
	}
	for _, worker := range workers {
		if observed[worker.workerID] != worker.instanceID {
			t.Fatalf("settlement identity crossed Workers: worker=%s want_instance=%s got=%s", worker.workerID, worker.instanceID, observed[worker.workerID])
		}
	}
}

func startUnclaimedWorkerProcess(t *testing.T, binary, workerID, managementKey string) *workerProcess {
	t.Helper()
	address := unusedTCPAddress(t)
	dataDir := t.TempDir()
	configPath := filepath.Join(dataDir, "worker-config.json")
	logs := new(lockedBuffer)
	cmd := exec.Command(binary)
	cmd.Stdout, cmd.Stderr = logs, logs
	cmd.Env = append(os.Environ(),
		"AI_GATEWAY_LISTEN="+address,
		"AI_GATEWAY_WORKER_CONFIG_PATH="+configPath,
		"AI_GATEWAY_SETTLEMENT_WAL_PATH="+filepath.Join(dataDir, "settlements"),
		"AI_GATEWAY_WORKER_VAULT_PATH="+filepath.Join(dataDir, "worker-vault.db"),
		"XDG_DATA_HOME="+filepath.Join(dataDir, "caddy"),
		"XDG_CONFIG_HOME="+filepath.Join(dataDir, "config"),
	)
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	wait := make(chan error, 1)
	go func() { wait <- cmd.Wait() }()
	return &workerProcess{
		workerID: workerID, management: managementKey,
		vaultKey: base64.StdEncoding.EncodeToString(bytes.Repeat([]byte(workerID)[0:1], 32)),
		address:  address, configPath: configPath, cmd: cmd, logs: logs, wait: wait,
	}
}

func claimWorkerFromUI(t *testing.T, worker *workerProcess, controlAddress string) {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for {
		response, err := http.Get("http://" + worker.address + "/worker/v1/bootstrap")
		if err == nil {
			_, _ = io.Copy(io.Discard, response.Body)
			_ = response.Body.Close()
			if response.StatusCode == http.StatusOK {
				break
			}
		}
		if time.Now().After(deadline) {
			t.Fatalf("%s pairing endpoint did not start: %s", worker.workerID, worker.logs.String())
		}
		time.Sleep(25 * time.Millisecond)
	}
	pairingToken, err := os.ReadFile(worker.configPath + ".pairing")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := json.Marshal(map[string]any{
		"pairing_token": strings.TrimSpace(string(pairingToken)), "worker_id": worker.workerID,
		"management_key": worker.management, "vault_key": worker.vaultKey,
		"control_plane_target": controlAddress, "control_plane_insecure": true,
	})
	request, _ := http.NewRequest(http.MethodPost, "http://"+worker.address+"/worker/v1/claim", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(response.Body)
	_ = response.Body.Close()
	if response.StatusCode != http.StatusCreated {
		t.Fatalf("claim %s: status=%d body=%s logs=%s", worker.workerID, response.StatusCode, raw, worker.logs.String())
	}
	var identity struct {
		InstanceID string `json:"instance_id"`
	}
	if err := json.Unmarshal(raw, &identity); err != nil || identity.InstanceID == "" {
		t.Fatalf("claim identity %s: %v body=%s", worker.workerID, err, raw)
	}
	worker.instanceID = identity.InstanceID
}

func waitForWorkerIdentity(t *testing.T, worker *workerProcess) {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for {
		select {
		case err := <-worker.wait:
			t.Fatalf("%s exited before becoming ready: %v\n%s", worker.workerID, err, worker.logs.String())
		default:
		}
		response, err := http.DefaultClient.Do(newWorkerRequest(t, worker, http.MethodGet, "/worker/v1/identity", ""))
		if err == nil {
			raw, _ := io.ReadAll(response.Body)
			_ = response.Body.Close()
			if response.StatusCode == http.StatusOK && bytes.Contains(raw, []byte(fmt.Sprintf(`"worker_id":"%s"`, worker.workerID))) {
				return
			}
		}
		if time.Now().After(deadline) {
			t.Fatalf("%s did not become ready: %s", worker.workerID, worker.logs.String())
		}
		time.Sleep(25 * time.Millisecond)
	}
}

func workerRequest(t *testing.T, worker *workerProcess, method, path, body string) (*http.Response, []byte) {
	t.Helper()
	response, err := http.DefaultClient.Do(newWorkerRequest(t, worker, method, path, body))
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(response.Body)
	_ = response.Body.Close()
	return response, raw
}

func newWorkerRequest(t *testing.T, worker *workerProcess, method, path, body string) *http.Request {
	t.Helper()
	request, err := http.NewRequest(method, "http://"+worker.address+path, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Authorization", "Bearer "+worker.management)
	request.Header.Set("Content-Type", "application/json")
	return request
}

func stopWorkerProcess(t *testing.T, worker *workerProcess) {
	t.Helper()
	if worker == nil || worker.cmd == nil || worker.cmd.Process == nil {
		return
	}
	_ = worker.cmd.Process.Signal(syscall.SIGTERM)
	select {
	case err := <-worker.wait:
		if err != nil {
			t.Errorf("%s stopped with error: %v\n%s", worker.workerID, err, worker.logs.String())
		}
	case <-time.After(5 * time.Second):
		_ = worker.cmd.Process.Kill()
		t.Errorf("%s did not stop cleanly", worker.workerID)
	}
}
