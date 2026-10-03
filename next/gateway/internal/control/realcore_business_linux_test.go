//go:build linux

package control

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"testing"
	"time"
)

// A minimal console/gateway client for the real-core tests. It speaks the
// same public API as the e2e suite and talks to the cluster through a shell's
// public listener; the cores reach the mock upstream themselves.

type apiClient struct {
	t        *testing.T
	base     string
	token    string
	password string
	http     *http.Client
}

type apiResponse struct {
	status int
	header http.Header
	body   []byte
}

func (r apiResponse) String() string {
	return fmt.Sprintf("HTTP %d %s", r.status, strings.TrimSpace(string(r.body)))
}

// json decodes the body and walks a dotted path ("data.id").
func (r apiResponse) get(path string) any {
	var v any
	if json.Unmarshal(r.body, &v) != nil {
		return nil
	}
	for _, part := range strings.Split(path, ".") {
		m, ok := v.(map[string]any)
		if !ok {
			return nil
		}
		v = m[part]
	}
	return v
}

func (r apiResponse) str(path string) string {
	switch v := r.get(path).(type) {
	case string:
		return v
	case float64:
		return fmt.Sprintf("%.0f", v)
	}
	return ""
}

func (r apiResponse) id(path string) int64 {
	v, _ := r.get(path).(float64)
	return int64(v)
}

func newAPIClient(t *testing.T, base string) *apiClient {
	return &apiClient{t: t, base: strings.TrimRight(base, "/"), http: &http.Client{Timeout: 30 * time.Second}}
}

func (c *apiClient) do(method, path string, body any, headers map[string]string) apiResponse {
	c.t.Helper()
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			c.t.Fatal(err)
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequest(method, c.base+path, reader)
	if err != nil {
		c.t.Fatal(err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	res, err := c.http.Do(req)
	if err != nil {
		c.t.Fatalf("%s %s: %v", method, path, err)
	}
	defer res.Body.Close()
	raw, err := io.ReadAll(res.Body)
	if err != nil {
		c.t.Fatalf("%s %s: %v", method, path, err)
	}
	return apiResponse{status: res.StatusCode, header: res.Header, body: raw}
}

// ok performs a console request under /api/v1 and requires 2xx.
func (c *apiClient) ok(method, path string, body any, headers ...map[string]string) apiResponse {
	c.t.Helper()
	var h map[string]string
	if len(headers) > 0 {
		h = headers[0]
	}
	r := c.do(method, "/api/v1"+path, body, h)
	if r.status < 200 || r.status > 299 {
		c.t.Fatalf("%s %s: %s", method, path, r)
	}
	return r
}

func (c *apiClient) login(email, password string) *apiClient {
	c.t.Helper()
	s := newAPIClient(c.t, c.base)
	r := s.ok(http.MethodPost, "/auth/login", map[string]any{"email": email, "password": password})
	s.token, s.password = r.str("data.access_token"), password
	if s.token == "" {
		c.t.Fatalf("login %s: %s", email, r)
	}
	return s
}

func (c *apiClient) stepUp() map[string]string {
	c.t.Helper()
	r := c.ok(http.MethodPost, "/auth/step-up", map[string]any{"password": c.password})
	return map[string]string{"X-Step-Up-Token": r.str("data.step_up_token")}
}

// videoTenant is a restricted group with one relay video account on the
// mock, a funded user and that user's API key.
type videoTenant struct {
	model      string
	accountID  int64
	accountKey string
	userID     int64
	user       *apiClient
	apiKey     string
}

func newVideoTenant(t *testing.T, admin *apiClient, mockURL, suffix string) videoTenant {
	t.Helper()
	tn := videoTenant{model: "doubao-seedance-2-0-mini-real-" + suffix, accountKey: "video-real-" + suffix}
	admin.ok(http.MethodPost, "/prices", map[string]any{"model": tn.model, "mode": "per_token", "note": "real-core run price",
		"config": map[string]float64{"p": 3, "c": 15, "cr": 0.3, "cc": 3.75, "cc1h": 6}})
	group := admin.ok(http.MethodPost, "/groups", map[string]any{"name": "video-" + suffix, "description": "real-core", "visibility": "restricted", "rate_multiplier": "1", "model_allowlist": []string{}}).id("data.id")
	tn.accountID = admin.ok(http.MethodPost, "/accounts", map[string]any{
		"name": "video-" + suffix, "plugin_key": "volcengine", "type": "relay", "group_ids": []int64{group}, "proxy_id": nil,
		"priority": 10, "max_concurrency": 4, "schedulable": true,
		"credentials": map[string]any{"api_key": tn.accountKey, "base_url": mockURL, "video_api_prefix": "/api/v3"},
	}).id("data.id")
	email, password := "video-"+suffix+"@real.test", "Real-"+suffix+"-pass!"
	tn.userID = admin.ok(http.MethodPost, "/users", map[string]any{"email": email, "display_name": email, "password": password, "role_keys": []string{"user"}, "max_concurrency": 10}).id("data.id")
	admin.ok(http.MethodPut, fmt.Sprintf("/users/%d/groups", tn.userID), map[string]any{"group_ids": []int64{group}})
	admin.ok(http.MethodPost, fmt.Sprintf("/users/%d/balance/adjust", tn.userID), map[string]any{"amount": "20", "credit": true, "note": "real-core credit"}, admin.stepUp())
	tn.user = admin.login(email, password)
	tn.apiKey = tn.user.ok(http.MethodPost, "/me/api-keys", map[string]any{"name": "video-" + suffix, "group_id": group}).str("data.key")
	if !strings.HasPrefix(tn.apiKey, "sk-s2a-") || tn.accountID == 0 || tn.userID == 0 {
		t.Fatalf("video tenant incomplete: %+v", tn)
	}
	return tn
}

// streamTenant is the same shape for an anthropic API-key account whose
// responses the mock streams slowly.
type streamTenant struct {
	model      string
	accountKey string
	apiKey     string
}

func newStreamTenant(t *testing.T, admin *apiClient, mockURL, suffix string) streamTenant {
	t.Helper()
	tn := streamTenant{model: "claude-real-" + suffix, accountKey: "sk-ant-mock-stream-" + suffix}
	admin.ok(http.MethodPost, "/prices", map[string]any{"model": tn.model, "mode": "per_token", "note": "real-core run price",
		"config": map[string]float64{"p": 3, "c": 15, "cr": 0.3, "cc": 3.75, "cc1h": 6}})
	group := admin.ok(http.MethodPost, "/groups", map[string]any{"name": "stream-" + suffix, "description": "real-core", "visibility": "restricted", "rate_multiplier": "1", "model_allowlist": []string{}}).id("data.id")
	admin.ok(http.MethodPost, "/accounts", map[string]any{
		"name": "stream-" + suffix, "plugin_key": "anthropic", "type": "apikey", "group_ids": []int64{group}, "proxy_id": nil,
		"priority": 10, "max_concurrency": 4, "schedulable": true,
		"credentials": map[string]any{"api_key": tn.accountKey, "base_url": mockURL},
	})
	email, password := "stream-"+suffix+"@real.test", "Real-"+suffix+"-pass!"
	user := admin.ok(http.MethodPost, "/users", map[string]any{"email": email, "display_name": email, "password": password, "role_keys": []string{"user"}, "max_concurrency": 10}).id("data.id")
	admin.ok(http.MethodPut, fmt.Sprintf("/users/%d/groups", user), map[string]any{"group_ids": []int64{group}})
	admin.ok(http.MethodPost, fmt.Sprintf("/users/%d/balance/adjust", user), map[string]any{"amount": "20", "credit": true, "note": "real-core credit"}, admin.stepUp())
	tn.apiKey = admin.login(email, password).ok(http.MethodPost, "/me/api-keys", map[string]any{"name": "stream-" + suffix, "group_id": group}).str("data.key")
	return tn
}

// mockClient controls the mock upstream started next to the test.
type mockClient struct{ *apiClient }

func (m mockClient) video(key, state string, block bool) {
	m.t.Helper()
	if r := m.do(http.MethodPost, "/__video/control", map[string]any{"api_key": key, "state": state, "block": block, "output_tokens": 17, "delay_ms": 25}, nil); r.status != 200 {
		m.t.Fatalf("video control: %s", r)
	}
}

type mockVideoTask struct {
	ID        string `json:"id"`
	APIKey    string `json:"api_key"`
	Active    int    `json:"active"`
	MaxActive int    `json:"max_active"`
	Queries   []struct {
		APIKey   string `json:"api_key"`
		Source   string `json:"source"`
		Active   bool   `json:"active"`
		Canceled bool   `json:"canceled"`
		Status   int    `json:"status"`
	} `json:"queries"`
}

func (m mockClient) videoTasks(key string) []mockVideoTask {
	m.t.Helper()
	r := m.do(http.MethodGet, "/__video/stats?api_key="+key, nil, nil)
	var out struct {
		Tasks []mockVideoTask `json:"tasks"`
	}
	if r.status != 200 || json.Unmarshal(r.body, &out) != nil {
		m.t.Fatalf("video stats: %s", r)
	}
	return out.Tasks
}

func (m mockClient) rule(rule map[string]any) {
	m.t.Helper()
	if r := m.do(http.MethodPost, "/__control", rule, nil); r.status != 200 {
		m.t.Fatalf("mock rule: %s", r)
	}
}

// upload posts one file as multipart form field "file" under /api/v1.
func (c *apiClient) upload(path, filename string, data []byte, headers map[string]string) apiResponse {
	c.t.Helper()
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", filename)
	if err != nil {
		c.t.Fatal(err)
	}
	_, _ = fw.Write(data)
	_ = mw.Close()
	req, err := http.NewRequest(http.MethodPost, c.base+"/api/v1"+path, &buf)
	if err != nil {
		c.t.Fatal(err)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+c.token)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	res, err := c.http.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	return apiResponse{status: res.StatusCode, header: res.Header, body: raw}
}

// consentAll approves every host permission a review requests.
func (c *apiClient) consentAll(review apiResponse) (key, version string) {
	c.t.Helper()
	var body struct {
		Data struct {
			Review *struct {
				Key     string `json:"plugin_key"`
				Version string `json:"version"`
				Perms   []struct {
					ID    string `json:"id"`
					Scope any    `json:"scope"`
				} `json:"host_permissions"`
			} `json:"review"`
			Key     string `json:"plugin_key"`
			Version string `json:"version"`
			Perms   []struct {
				ID    string `json:"id"`
				Scope any    `json:"scope"`
			} `json:"host_permissions"`
		} `json:"data"`
	}
	if err := json.Unmarshal(review.body, &body); err != nil {
		c.t.Fatal(err)
	}
	key, version, perms := body.Data.Key, body.Data.Version, body.Data.Perms
	if r := body.Data.Review; r != nil {
		key, version, perms = r.Key, r.Version, r.Perms
	}
	grants := []map[string]any{}
	for _, p := range perms {
		g := map[string]any{"permission": p.ID}
		if p.Scope != nil {
			g["scope"] = p.Scope
		}
		grants = append(grants, g)
	}
	c.ok(http.MethodPost, fmt.Sprintf("/plugins/%s/versions/%s/consent", key, version),
		map[string]any{"grants": grants, "denied": []string{}, "role_keys_for_new_permissions": []string{}}, c.stepUp())
	return key, version
}
