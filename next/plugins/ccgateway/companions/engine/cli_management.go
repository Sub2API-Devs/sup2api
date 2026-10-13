package engine

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

const cliReleaseURL = "https://downloads.claude.ai/claude-code-releases/"

var cliReleaseVersion = regexp.MustCompile(`^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$`)

type cliUpdatePolicy struct {
	AutoUpdate bool   `json:"auto_update"`
	Channel    string `json:"channel"`
}

type cliManagement struct {
	mu       sync.Mutex
	policy   cliUpdatePolicy
	path     string
	latest   string
	checked  time.Time
	updating bool
	result   string
	failure  string
	install  *cliInstallLease
}

func newCLIManagement(root string) (*cliManagement, error) {
	m := &cliManagement{path: filepath.Join(root, "cli-update.json"), policy: cliUpdatePolicy{Channel: "stable"}, result: "idle"}
	raw, err := os.ReadFile(m.path)
	if os.IsNotExist(err) {
		return m, nil
	}
	if err != nil || len(raw) > 4096 || json.Unmarshal(raw, &m.policy) != nil || !m.policy.valid() {
		return nil, fmt.Errorf("invalid CLI update settings")
	}
	return m, nil
}

func (p cliUpdatePolicy) valid() bool { return p.Channel == "stable" || p.Channel == "latest" }

func (m *cliManagement) save(policy cliUpdatePolicy) error {
	if !policy.valid() {
		return fmt.Errorf("channel must be stable or latest")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.updating {
		return fmt.Errorf("CLI update in progress")
	}
	raw, _ := json.Marshal(policy)
	file, err := os.CreateTemp(filepath.Dir(m.path), ".cli-update-")
	if err != nil {
		return fmt.Errorf("cannot save CLI update settings")
	}
	defer os.Remove(file.Name())
	if _, err = file.Write(raw); err == nil {
		err = file.Sync()
	}
	closed := file.Close()
	if err == nil {
		err = closed
	}
	if err == nil {
		err = os.Rename(file.Name(), m.path)
	}
	if err != nil {
		return fmt.Errorf("cannot save CLI update settings")
	}
	if policy.Channel != m.policy.Channel {
		m.latest, m.checked = "", time.Time{}
	}
	m.policy = policy
	return nil
}

func (r *Runtime) cliView() Object {
	m := r.cliManagement
	m.mu.Lock()
	defer m.mu.Unlock()
	return Object{"catalog": r.catalog.status(), "auto_update": m.policy.AutoUpdate, "auto_update_mode": "managed", "channel": m.policy.Channel, "latest_version": m.latest, "release_checked_at": m.checked, "updating": m.updating, "update_state": m.result, "update_error": m.failure}
}

func (r *Runtime) serveCLI(w http.ResponseWriter, request *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json")
	if r.admin.key == "" || !strings.HasPrefix(request.Header.Get("Authorization"), "Bearer ") || subtle.ConstantTimeCompare([]byte(strings.TrimPrefix(request.Header.Get("Authorization"), "Bearer ")), []byte(r.admin.key)) != 1 {
		apiError(w, 401, "authentication_error", "Invalid management key")
		return
	}
	if request.URL.Path == "/admin/cli/catalog" {
		r.serveCLICatalog(w, request)
		return
	}
	if request.Method == "GET" {
		_ = json.NewEncoder(w).Encode(r.cliView())
		return
	}
	if request.Method != "POST" && request.Method != "PUT" {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, request.Body, 4096))
	var body Object
	if err == nil {
		body, err = decodeObject(raw)
	}
	if err != nil {
		apiError(w, 400, "invalid_request_error", "Invalid CLI management request")
		return
	}
	if request.Method == "PUT" {
		if keys(body, "auto_update", "channel") != nil {
			apiError(w, 400, "invalid_request_error", "Unknown CLI setting")
			return
		}
		auto, ok := body["auto_update"].(bool)
		policy := cliUpdatePolicy{AutoUpdate: auto, Channel: str(body, "channel")}
		if !ok || !policy.valid() {
			apiError(w, 400, "invalid_request_error", "Invalid CLI update policy")
			return
		}
		if err := r.cliManagement.save(policy); err != nil {
			apiError(w, 409, "api_error", err.Error())
			return
		}
		_ = json.NewEncoder(w).Encode(r.cliView())
		return
	}
	if str(body, "action") == "validate-install" {
		m := r.cliManagement
		m.mu.Lock()
		valid := m.install != nil && m.install.token == str(body, "lease") && time.Until(m.install.expires) > time.Minute && keys(body, "action", "lease") == nil
		if valid {
			m.install.expires = time.Now().Add(5 * time.Minute)
		}
		m.mu.Unlock()
		if !valid || keys(body, "action", "lease") != nil {
			apiError(w, 409, "api_error", "CLI installation lease expired")
			return
		}
		_ = json.NewEncoder(w).Encode(Object{"valid": true})
		return
	}
	if str(body, "action") == "finish-install" {
		installed, ok := body["installed"].(bool)
		if !ok || keys(body, "action", "lease", "installed") != nil {
			apiError(w, 400, "invalid_request_error", "Invalid CLI installation completion")
			return
		}
		if err := r.finishCLIInstall(str(body, "lease"), installed); err != nil {
			apiError(w, 409, "api_error", err.Error())
			return
		}
		_ = json.NewEncoder(w).Encode(r.cliView())
		return
	}
	if keys(body, "action") != nil {
		apiError(w, 400, "invalid_request_error", "Unknown CLI action field")
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), 30*time.Second)
	defer cancel()
	switch str(body, "action") {
	case "check":
		err = r.checkCLIRelease(ctx)
	case "sync":
		if !r.startCLISync() {
			apiError(w, 409, "api_error", "CLI maintenance is busy")
			return
		}
		w.WriteHeader(http.StatusAccepted)
	case "begin-install":
		lease, beginErr := r.beginCLIInstall(ctx)
		if beginErr != nil {
			apiError(w, 409, "api_error", beginErr.Error())
			return
		}
		_ = json.NewEncoder(w).Encode(lease)
		return
	default:
		apiError(w, 400, "invalid_request_error", "Unknown CLI action")
		return
	}
	if err != nil {
		apiError(w, 502, "api_error", err.Error())
		return
	}
	_ = json.NewEncoder(w).Encode(r.cliView())
}

func (r *Runtime) checkCLIRelease(ctx context.Context) error {
	m := r.cliManagement
	m.mu.Lock()
	channel := m.policy.Channel
	m.mu.Unlock()
	client, transport := managementHTTPClient(r.gateway.Runner.baseEnv())
	defer transport.CloseIdleConnections()
	client.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	request, err := http.NewRequestWithContext(ctx, "GET", cliReleaseURL+channel, nil)
	if err != nil {
		return fmt.Errorf("cannot check Claude Code release")
	}
	response, err := client.Do(request)
	if err != nil {
		return fmt.Errorf("Claude Code release service unavailable")
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 129))
	version := strings.TrimSpace(string(raw))
	if err != nil || response.StatusCode != 200 || !cliReleaseVersion.MatchString(version) {
		return fmt.Errorf("invalid Claude Code release metadata")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.policy.Channel == channel {
		m.latest, m.checked = version, time.Now().UTC()
	}
	return nil
}

func (r *Runtime) startCLISync() bool {
	m := r.cliManagement
	m.mu.Lock()
	if m.updating {
		m.mu.Unlock()
		return false
	}
	m.updating, m.result, m.failure = true, "running", ""
	m.mu.Unlock()
	r.mu.Lock()
	if r.closed {
		r.mu.Unlock()
		m.mu.Lock()
		m.updating, m.result = false, "stopped"
		m.mu.Unlock()
		return false
	}
	r.active.Add(1)
	r.mu.Unlock()
	go func() {
		defer r.active.Done()
		ctx, cancel := context.WithTimeout(r.life, 5*time.Minute)
		defer cancel()
		err := r.catalog.sync(ctx)
		m.mu.Lock()
		defer m.mu.Unlock()
		m.updating, m.result = false, "complete"
		if err != nil {
			m.result, m.failure = "failed", err.Error()
		}
	}()
	return true
}

func (r *Runtime) autoUpdateCLI(ctx context.Context) {
	m := r.cliManagement
	m.mu.Lock()
	check := m.policy.AutoUpdate && !m.updating && time.Since(m.checked) >= 6*time.Hour
	m.mu.Unlock()
	if !check {
		return
	}
	bounded, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	_ = r.checkCLIRelease(bounded)
}

func newerCLIVersion(candidate, installed string) bool {
	if !cliReleaseVersion.MatchString(candidate) || !cliReleaseVersion.MatchString(installed) {
		return false
	}
	var next, old [3]int
	_, _ = fmt.Sscanf(candidate, "%d.%d.%d", &next[0], &next[1], &next[2])
	_, _ = fmt.Sscanf(installed, "%d.%d.%d", &old[0], &old[1], &old[2])
	for i := range next {
		if next[i] != old[i] {
			return next[i] > old[i]
		}
	}
	return false
}
