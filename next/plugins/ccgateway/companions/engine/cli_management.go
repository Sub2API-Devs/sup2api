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

// cliManagement is the /admin/cli state: the release channel followed and the
// latest official release seen there. The CLI itself is the packaged one the
// container was created with and is never replaced in place: an official
// release has no request command (a newer packaged CLI is a new container).
type cliManagement struct {
	pinnedVersion string
	mu            sync.Mutex
	policy        cliUpdatePolicy
	path          string
	latest        string
	checked       time.Time
	result        string
	failure       string
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

// cliView is the /admin/cli answer; updating stays false (nothing installs).
func (r *Runtime) cliView() Object {
	m := r.cliManagement
	m.mu.Lock()
	defer m.mu.Unlock()
	return Object{"catalog": r.cli.status(), "auto_update": m.policy.AutoUpdate, "auto_update_mode": "managed", "pinned_version": m.pinnedVersion, "channel": m.policy.Channel, "latest_version": m.latest, "release_checked_at": m.checked, "updating": false, "update_state": m.result, "update_error": m.failure}
}

func (r *Runtime) serveCLI(w http.ResponseWriter, request *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json")
	if r.admin.key == "" || !strings.HasPrefix(request.Header.Get("Authorization"), "Bearer ") || subtle.ConstantTimeCompare([]byte(strings.TrimPrefix(request.Header.Get("Authorization"), "Bearer ")), []byte(r.admin.key)) != 1 {
		apiError(w, 401, "authentication_error", "Invalid management key")
		return
	}
	switch request.Method {
	case http.MethodGet:
		_ = json.NewEncoder(w).Encode(r.cliView())
	case http.MethodPut:
		r.putCLIPolicy(w, request)
	case http.MethodPost:
		r.postCLIAction(w, request)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func readCLIRequest(w http.ResponseWriter, request *http.Request) (Object, bool) {
	raw, err := io.ReadAll(http.MaxBytesReader(w, request.Body, 4096))
	var body Object
	if err == nil {
		body, err = decodeObject(raw)
	}
	if err != nil {
		apiError(w, 400, "invalid_request_error", "Invalid CLI management request")
		return nil, false
	}
	return body, true
}

func (r *Runtime) putCLIPolicy(w http.ResponseWriter, request *http.Request) {
	body, ok := readCLIRequest(w, request)
	if !ok {
		return
	}
	if keys(body, "auto_update", "channel") != nil {
		apiError(w, 400, "invalid_request_error", "Unknown CLI setting")
		return
	}
	auto, isBool := body["auto_update"].(bool)
	if auto && r.cliManagement.pinnedVersion != "" {
		apiError(w, 409, "configuration_error", "CLI version is pinned by ccgateway; automatic updates are disabled")
		return
	}
	policy := cliUpdatePolicy{AutoUpdate: auto, Channel: str(body, "channel")}
	if !isBool || !policy.valid() {
		apiError(w, 400, "invalid_request_error", "Invalid CLI update policy")
		return
	}
	if err := r.cliManagement.save(policy); err != nil {
		apiError(w, 409, "api_error", err.Error())
		return
	}
	_ = json.NewEncoder(w).Encode(r.cliView())
}

func (r *Runtime) postCLIAction(w http.ResponseWriter, request *http.Request) {
	body, ok := readCLIRequest(w, request)
	if !ok {
		return
	}
	action := str(body, "action")
	if action == "begin-install" || action == "validate-install" || action == "finish-install" {
		apiError(w, 409, "configuration_error", "CLI is pinned by ccgateway; use a packaged version")
		return
	}
	if keys(body, "action") != nil {
		apiError(w, 400, "invalid_request_error", "Unknown CLI action field")
		return
	}
	ctx, cancel := context.WithTimeout(request.Context(), 30*time.Second)
	defer cancel()
	switch action {
	case "check":
		if err := r.checkCLIRelease(ctx); err != nil {
			apiError(w, 502, "api_error", err.Error())
			return
		}
	case "sync":
		r.recordCLIAction(r.cli.recheck(ctx))
	default:
		apiError(w, 400, "invalid_request_error", "Unknown CLI action")
		return
	}
	_ = json.NewEncoder(w).Encode(r.cliView())
}

// recordCLIAction keeps the outcome of the last sync for the view.
func (r *Runtime) recordCLIAction(err error) {
	m := r.cliManagement
	m.mu.Lock()
	defer m.mu.Unlock()
	m.result, m.failure = "complete", ""
	if err != nil {
		m.result, m.failure = "failed", err.Error()
	}
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

// autoUpdateCLI keeps latest_version current for a Worker that follows its
// channel; nothing is installed.
func (r *Runtime) autoUpdateCLI(ctx context.Context) {
	m := r.cliManagement
	m.mu.Lock()
	check := m.policy.AutoUpdate && time.Since(m.checked) >= 6*time.Hour
	m.mu.Unlock()
	if !check {
		return
	}
	bounded, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	_ = r.checkCLIRelease(bounded)
}
