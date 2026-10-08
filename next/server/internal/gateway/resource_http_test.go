package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type memoryResourceStore struct {
	core.ProviderResources
	mu           sync.Mutex
	rows         map[string]core.ProviderResource
	query        core.ResourceQuery
	reserveCount int
	dispatch     bool
}

func (s *memoryResourceStore) Reserve(_ context.Context, i core.ResourceIntent) (core.ResourceReservation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reserveCount++
	id := fmt.Sprintf("file_local_%d", s.reserveCount)
	r := core.ProviderResource{PublicID: id, PluginKey: i.PluginKey, Kind: i.Kind, Owner: i.Owner, Binding: i.Binding, Bytes: i.Bytes, Metadata: i.Metadata, State: "pending", OperationID: "operation", ExpiresAt: i.ExpiresAt}
	s.rows[id] = r
	return core.ResourceReservation{Resource: r, Dispatch: s.dispatch}, nil
}
func (s *memoryResourceStore) Finalize(_ context.Context, c core.ResourceCompletion) (core.ProviderResource, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r := s.rows[c.PublicID]
	r.RemoteID = c.RemoteID
	r.Metadata = c.Metadata
	r.State = "ready"
	if c.ExpiresAt != nil {
		r.ExpiresAt = *c.ExpiresAt
	}
	s.rows[c.PublicID] = r
	return r, nil
}
func (s *memoryResourceStore) MarkUncertain(_ context.Context, _ core.ResourceOwner, id, op string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	r := s.rows[id]
	r.State = "uncertain"
	s.rows[id] = r
	return nil
}
func (s *memoryResourceStore) FailCreate(_ context.Context, _ core.ResourceOwner, id, op, code string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	r := s.rows[id]
	r.State = "failed"
	s.rows[id] = r
	return nil
}
func (s *memoryResourceStore) Get(_ context.Context, o core.ResourceOwner, id string) (core.ProviderResource, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.rows[id]
	if !ok || r.Owner != o {
		return core.ProviderResource{}, core.ErrNotFound
	}
	return r, nil
}
func (s *memoryResourceStore) Query(_ context.Context, o core.ResourceOwner, q core.ResourceQuery) (core.ResourcePage, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.query = q
	page := core.ResourcePage{}
	for _, r := range s.rows {
		allowed := false
		for _, id := range q.AccountIDs {
			allowed = allowed || r.Binding.AccountID == id
		}
		if r.Owner == o && r.State == "ready" && allowed {
			page.Items = append(page.Items, r)
		}
	}
	return page, nil
}
func (s *memoryResourceStore) BeginDelete(_ context.Context, o core.ResourceOwner, id string, b core.ResourceBinding) (core.ResourceReservation, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r := s.rows[id]
	if r.Owner != o || r.Binding != b {
		return core.ResourceReservation{}, core.ErrNotFound
	}
	dispatch := r.State == "ready"
	if dispatch {
		r.State = "deleting"
		r.OperationID = "delete_operation"
		s.rows[id] = r
	}
	return core.ResourceReservation{Resource: r, Dispatch: dispatch}, nil
}
func (s *memoryResourceStore) FinishDelete(_ context.Context, _ core.ResourceOwner, id, op string, confirmed bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	r := s.rows[id]
	r.State = "delete_uncertain"
	if confirmed {
		r.State = "deleted"
	}
	s.rows[id] = r
	return nil
}

type fakeResourceTransport struct {
	mu         sync.Mutex
	calls      int
	generation string
	fn         func(*http.Request) (*http.Response, error)
}

func (t *fakeResourceTransport) Identity(_ context.Context, id int64) (core.ResourceBinding, error) {
	return core.ResourceBinding{AccountID: id, PrincipalID: "synthetic_issuer", Generation: t.generation}, nil
}
func (t *fakeResourceTransport) RoundTrip(id int64, b core.ResourceBinding, r *http.Request) (*http.Response, error) {
	t.mu.Lock()
	t.calls++
	t.mu.Unlock()
	if r.Header.Get("X-Api-Key") != "" || r.Header.Get("Authorization") != "" {
		return nil, fmt.Errorf("client credential leaked")
	}
	return t.fn(r)
}
func resourceTestResponse(status int, body string) *http.Response {
	return &http.Response{StatusCode: status, Header: http.Header{"Content-Type": []string{"application/json"}}, Body: io.NopCloser(strings.NewReader(body)), ContentLength: int64(len(body))}
}
func fileTestMetadata() string {
	return `{"id":"file_provider_secret","type":"file","filename":"test.txt","mime_type":"text/plain","size_bytes":3,"created_at":"2026-10-08T00:00:00Z","downloadable":true,"expires_at":null}`
}
func resourceTestEnv(t *testing.T) (*env, *memoryResourceStore, *fakeResourceTransport) {
	e := newEnv(t, func(e *env) {
		e.gen.accountTypes[0].Plugin.Key = "ccgateway"
		for _, a := range e.accounts.accounts {
			a.PluginKey = "ccgateway"
		}
	})
	s := &memoryResourceStore{rows: map[string]core.ProviderResource{}, dispatch: true}
	tr := &fakeResourceTransport{generation: "v1"}
	tr.fn = func(r *http.Request) (*http.Response, error) {
		if r.Method == "POST" {
			mr, err := r.MultipartReader()
			if err != nil {
				return nil, err
			}
			part, err := mr.NextPart()
			if err != nil {
				return nil, err
			}
			data, _ := io.ReadAll(part)
			if string(data) != "abc" {
				return nil, fmt.Errorf("file corrupted")
			}
			return resourceTestResponse(200, fileTestMetadata()), nil
		}
		if r.Method == "DELETE" {
			return resourceTestResponse(200, `{"id":"file_provider_secret","type":"file_deleted"}`), nil
		}
		if strings.HasSuffix(r.URL.Path, "/content") {
			resp := resourceTestResponse(200, "abc")
			resp.Header.Set("Content-Type", "text/plain")
			return resp, nil
		}
		return resourceTestResponse(200, fileTestMetadata()), nil
	}
	e.gw.d.Resources = s
	e.gw.d.ResourceTransport = tr
	return e, s, tr
}
func fileMultipart(t *testing.T, data string) ([]byte, string) {
	t.Helper()
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	p, err := w.CreateFormFile("file", "test.txt")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.WriteString(p, data)
	_ = w.Close()
	return b.Bytes(), w.FormDataContentType()
}
func fileRequest(t *testing.T, e *env, method, path, key, beta string, body []byte, contentType string) (int, []byte) {
	t.Helper()
	req, _ := http.NewRequest(method, e.srv.URL+path, bytes.NewReader(body))
	req.Header.Set("X-Api-Key", key)
	if beta != "" {
		req.Header.Set("Anthropic-Beta", beta)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	return resp.StatusCode, raw
}

func TestFilesHTTPRoundtripOwnershipAndBinding(t *testing.T) {
	e, s, tr := resourceTestEnv(t)
	multipart, ctype := fileMultipart(t, "abc")
	status, raw := fileRequest(t, e, "POST", "/v1/files", testKey, "", multipart, ctype)
	if status != 200 || bytes.Contains(raw, []byte("file_provider_secret")) {
		t.Fatalf("upload %d %s", status, raw)
	}
	var answer map[string]any
	_ = json.Unmarshal(raw, &answer)
	id := answer["id"].(string)
	for _, path := range []string{"/v1/files/" + id, "/v1/files/" + id + "/content", "/v1/files"} {
		status, raw = fileRequest(t, e, "GET", path, testKey, "", nil, "")
		if status != 200 || bytes.Contains(raw, []byte("file_provider_secret")) {
			t.Fatalf("read %s: %d %s", path, status, raw)
		}
	}
	e.auth.keys["rotated"] = &core.APIKeyPrincipal{KeyID: 99, UserID: testUser, UserMaxConcurrency: 3, Group: core.GroupInfo{ID: testGroup}}
	status, _ = fileRequest(t, e, "GET", "/v1/files/"+id, "rotated", "", nil, "")
	if status != 200 {
		t.Fatal("same-owner rotation lost resource", status)
	}
	e.auth.keys["other"] = &core.APIKeyPrincipal{KeyID: 100, UserID: testUser + 1, UserMaxConcurrency: 3, Group: core.GroupInfo{ID: testGroup}}
	before := tr.calls
	status, _ = fileRequest(t, e, "GET", "/v1/files/"+id, "other", "", nil, "")
	if status != 404 || tr.calls != before {
		t.Fatal("cross-owner dispatched", status, tr.calls, before)
	}
	tr.generation = "replacement"
	status, _ = fileRequest(t, e, "GET", "/v1/files/"+id, testKey, "", nil, "")
	if status != 409 || tr.calls != before {
		t.Fatal("issuer replacement used resource", status)
	}
	tr.generation = "v1"
	status, raw = fileRequest(t, e, "DELETE", "/v1/files/"+id, testKey, "", nil, "")
	if status != 200 || bytes.Contains(raw, []byte("file_provider_secret")) {
		t.Fatalf("delete %d %s", status, raw)
	}
	status, _ = fileRequest(t, e, "DELETE", "/v1/files/"+id, testKey, "", nil, "")
	if status != 404 || s.rows[id].State != "deleted" {
		t.Fatal("deleted resource redispatched", status)
	}
}

func TestFilesHTTPUnknownUploadNeverRetries(t *testing.T) {
	for _, mode := range []string{"transport", "5xx", "malformed", "wrong_size", "cancel", "confirmed_400", "unconfirmed_400"} {
		t.Run(mode, func(t *testing.T) {
			e, s, tr := resourceTestEnv(t)
			tr.fn = func(r *http.Request) (*http.Response, error) {
				switch mode {
				case "transport":
					return nil, fmt.Errorf("synthetic network failure")
				case "cancel":
					return nil, context.Canceled
				case "5xx":
					return resourceTestResponse(503, `{"error":{"type":"overloaded_error","message":"temporary"}}`), nil
				case "malformed":
					return resourceTestResponse(200, `{"id":"file_broken"}`), nil
				case "wrong_size":
					return resourceTestResponse(200, strings.Replace(fileTestMetadata(), `"size_bytes":3`, `"size_bytes":4`, 1)), nil
				case "confirmed_400":
					return resourceTestResponse(400, `{"error":{"type":"invalid_request_error","message":"bad file"}}`), nil
				default:
					return resourceTestResponse(400, `proxy error`), nil
				}
			}
			body, ctype := fileMultipart(t, "abc")
			status, _ := fileRequest(t, e, "POST", "/v1/files", testKey, "", body, ctype)
			if status < 400 || tr.calls != 1 || s.reserveCount != 1 {
				t.Fatalf("status=%d calls=%d reserves=%d", status, tr.calls, s.reserveCount)
			}
			want := "uncertain"
			if mode == "confirmed_400" {
				want = "failed"
			}
			if s.rows["file_local_1"].State != want {
				t.Fatalf("state=%s want=%s", s.rows["file_local_1"].State, want)
			}
		})
	}
}

func TestFilesHTTPListDialectAndSafeFilters(t *testing.T) {
	e, s, tr := resourceTestEnv(t)
	for _, q := range []string{"?after_id=file_a", "?before_id=file_a", "?scope_id=session", "?limit=0", "?limit=1001", "?page=bad", "?ids=file_a&limit=1"} {
		status, _ := fileRequest(t, e, "GET", "/v1/files"+q, testKey, "", nil, "")
		if status != 400 {
			t.Fatalf("query %s returned%d", q, status)
		}
	}
	status, raw := fileRequest(t, e, "GET", "/v1/files?limit=2", testKey, "", nil, "")
	if status != 200 || !bytes.Contains(raw, []byte(`"next_page":null`)) || s.query.Limit != 2 || !s.query.ReadyOnly || s.query.UnexpiredOnly || s.query.ExpiredWithin != 30*24*time.Hour || len(s.query.AccountIDs) != 3 {
		t.Fatalf("bad local query %+v %d %s", s.query, status, raw)
	}
	status, raw = fileRequest(t, e, "GET", "/v1/files?after_id=file_a", testKey, "files-api-2025-04-14", nil, "")
	if status != 200 || !bytes.Contains(raw, []byte(`"has_more":false`)) || s.query.AfterID != "file_a" {
		t.Fatalf("legacy query %d %s", status, raw)
	}
	if tr.calls != 0 {
		t.Fatal("list queried provider workspace")
	}
}

func TestFilesSpoolCancelClosesBlockedBody(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	reader, writer := io.Pipe()
	defer writer.Close()
	req, _ := http.NewRequestWithContext(ctx, "POST", "/v1/files", reader)
	req.Header.Set("Content-Type", "multipart/form-data; boundary=fixture")
	done := make(chan error, 1)
	go func() {
		u, err := spoolResourceUpload(req, 1024)
		if u != nil {
			u.close()
		}
		done <- err
	}()
	_, err := writer.Write([]byte("--fixture\r\nContent-Disposition: form-data; name=\"file\"; filename=\"test.txt\"\r\nContent-Type: text/plain\r\n\r\nabc"))
	if err != nil {
		t.Fatal(err)
	}
	cancel()
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("cancelled multipart succeeded")
		}
	case <-time.After(time.Second):
		t.Fatal("cancel did not close blocked upload body")
	}
}

func TestFilesHTTPSpoolBudgetAndExpiredMetadata(t *testing.T) {
	e, s, tr := resourceTestEnv(t)
	body, ctype := fileMultipart(t, "abc")
	for i := 0; i < cap(e.gw.resourceSpools); i++ {
		e.gw.resourceSpools <- struct{}{}
	}
	status, _ := fileRequest(t, e, "POST", "/v1/files", testKey, "", body, ctype)
	if status != 429 || s.reserveCount != 0 || tr.calls != 0 {
		t.Fatal("spool budget bypassed", status)
	}
	for i := 0; i < cap(e.gw.resourceSpools); i++ {
		<-e.gw.resourceSpools
	}
	status, _ = fileRequest(t, e, "POST", "/v1/files", testKey, "", body, ctype)
	if status != 200 {
		t.Fatal(status)
	}
	r := s.rows["file_local_1"]
	r.ExpiresAt = time.Now().Add(-time.Hour)
	s.rows[r.PublicID] = r
	status, _ = fileRequest(t, e, "GET", "/v1/files/"+r.PublicID, testKey, "", nil, "")
	if status != 200 {
		t.Fatal("expired metadata inaccessible during retention", status)
	}
	before := tr.calls
	status, _ = fileRequest(t, e, "GET", "/v1/files/"+r.PublicID+"/content", testKey, "", nil, "")
	if status != 404 || tr.calls != before {
		t.Fatal("expired bytes dispatched", status)
	}
	status, _ = fileRequest(t, e, "DELETE", "/v1/files/"+r.PublicID, testKey, "", nil, "")
	if status != 200 {
		t.Fatal("expired file not deletable", status)
	}
}

func TestFilesSpoolRejectsFilenameRewrite(t *testing.T) {
	for _, filename := range []string{"a/b.txt", `a\b.txt`, "bad?.txt"} {
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		part, _ := writer.CreateFormFile("file", filename)
		_, _ = part.Write([]byte("abc"))
		_ = writer.Close()
		req, _ := http.NewRequest("POST", "/v1/files", bytes.NewReader(body.Bytes()))
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req.Header.Set("Anthropic-Beta", "files-api-2025-04-14")
		if u, err := spoolResourceUpload(req, 10); err == nil {
			u.close()
			t.Fatalf("silently renamed %q", filename)
		}
	}
}

func TestFilesHTTPDeleteFailureKeepsProviderFacts(t *testing.T) {
	for _, status := range []int{400, 403, 404, 429, 503} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			e, s, tr := resourceTestEnv(t)
			body, ctype := fileMultipart(t, "abc")
			code, _ := fileRequest(t, e, "POST", "/v1/files", testKey, "", body, ctype)
			if code != 200 {
				t.Fatal(code)
			}
			kind := "permission_error"
			if status == 404 {
				kind = "not_found_error"
			}
			tr.fn = func(*http.Request) (*http.Response, error) {
				response := resourceTestResponse(status, fmt.Sprintf(`{"type":"error","error":{"type":%q,"message":"file_provider_secret is not available","details":{"exact":9007199254740993}}}`, kind))
				response.Header.Set("Retry-After", "7")
				response.Header.Set("Request-Id", "provider_request_fixture")
				return response, nil
			}
			req, _ := http.NewRequest("DELETE", e.srv.URL+"/v1/files/file_local_1", nil)
			req.Header.Set("X-Api-Key", testKey)
			response, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			raw, _ := io.ReadAll(response.Body)
			if response.StatusCode != status || !bytes.Contains(raw, []byte("file_local_1 is not available")) || bytes.Contains(raw, []byte("file_provider_secret")) || !bytes.Contains(raw, []byte("9007199254740993")) || response.Header.Get("Retry-After") != "7" || response.Header.Get("Request-Id") != "provider_request_fixture" {
				t.Fatalf("failure facts changed %d %s", response.StatusCode, raw)
			}
			want := "delete_uncertain"
			if status == 404 {
				want = "deleted"
			}
			if s.rows["file_local_1"].State != want {
				t.Fatal("delete certainty", s.rows["file_local_1"].State)
			}
			before := tr.calls
			code, _ = fileRequest(t, e, "DELETE", "/v1/files/file_local_1", testKey, "", nil, "")
			if code != 404 || tr.calls != before {
				t.Fatal("delete implicitly retried")
			}
		})
	}
}

type resourceDenyLimiter struct{ core.AccountLimiter }

func (resourceDenyLimiter) TryHit(context.Context, core.AccountRef, string) (bool, error) {
	return false, nil
}
func TestFilesHTTPAccountAdmission(t *testing.T) {
	for _, mode := range []string{"busy_first", "busy_all", "rate_limited", "user_busy"} {
		t.Run(mode, func(t *testing.T) {
			e, s, tr := resourceTestEnv(t)
			switch mode {
			case "busy_first":
				e.slots.inUse["account:1"] = 5
			case "busy_all":
				for _, id := range []string{"1", "2", "3"} {
					e.slots.inUse["account:"+id] = 5
				}
			case "rate_limited":
				e.gw.d.Limiter = resourceDenyLimiter{}
			case "user_busy":
				e.slots.inUse["user:"+itoa(testUser)] = 3
			}
			body, ctype := fileMultipart(t, "abc")
			status, _ := fileRequest(t, e, "POST", "/v1/files", testKey, "", body, ctype)
			if mode == "busy_first" {
				if status != 200 || s.rows["file_local_1"].Binding.AccountID != 2 {
					t.Fatal("pre-dispatch slot selection failed", status)
				}
			} else if status != 429 || s.reserveCount != 0 || tr.calls != 0 {
				t.Fatal("admission bypass", status, s.reserveCount, tr.calls)
			}
		})
	}
}

func TestFilesHTTPProviderExpiryAndLegacyRestriction(t *testing.T) {
	e, s, tr := resourceTestEnv(t)
	expiry := "2027-01-02T03:04:05Z"
	tr.fn = func(r *http.Request) (*http.Response, error) {
		mr, err := r.MultipartReader()
		if err != nil {
			return nil, err
		}
		fields := map[string]string{}
		for {
			part, err := mr.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				return nil, err
			}
			data, _ := io.ReadAll(part)
			fields[part.FormName()] = string(data)
		}
		if fields["expires_in_seconds"] != "3600" || fields["file"] != "abc" {
			return nil, fmt.Errorf("multipart fields changed")
		}
		return resourceTestResponse(200, strings.Replace(fileTestMetadata(), `"expires_at":null`, `"expires_at":"`+expiry+`"`, 1)), nil
	}
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("expires_in_seconds", "3600")
	part, _ := writer.CreateFormFile("file", "test.txt")
	_, _ = part.Write([]byte("abc"))
	_ = writer.Close()
	status, _ := fileRequest(t, e, "POST", "/v1/files", testKey, "files-api-2025-04-14", body.Bytes(), writer.FormDataContentType())
	if status != 400 || tr.calls != 0 || s.reserveCount != 0 {
		t.Fatal("unverifiable legacy expiry dispatched", status)
	}
	status, raw := fileRequest(t, e, "POST", "/v1/files", testKey, "", body.Bytes(), writer.FormDataContentType())
	if status != 200 || !bytes.Contains(raw, []byte(expiry)) || s.rows["file_local_1"].ExpiresAt.Format(time.RFC3339) != expiry {
		t.Fatalf("provider expiry changed %d %s %+v", status, raw, s.rows)
	}
}

func TestFilesHTTPAdmissionAndNoDispatchReplay(t *testing.T) {
	e, s, tr := resourceTestEnv(t)
	body, ctype := fileMultipart(t, "abc")
	status, _ := fileRequest(t, e, "POST", "/v1/files", "", "", body, ctype)
	if status != 401 || s.reserveCount != 0 {
		t.Fatal("unauthenticated upload consumed state", status)
	}
	s.dispatch = false
	status, _ = fileRequest(t, e, "POST", "/v1/files", testKey, "", body, ctype)
	if status != 409 || tr.calls != 0 {
		t.Fatal("reservation retransmitted", status, tr.calls)
	}
	e.gw.table.Store(buildRouteTable(e.gen.withoutPlugin("ccgateway")))
	status, _ = fileRequest(t, e, "POST", "/v1/files", testKey, "", body, ctype)
	if status != 404 || tr.calls != 0 {
		t.Fatal("disabled plugin used", status)
	}
}

func TestFilesSpoolBoundAndInvalidMultipart(t *testing.T) {
	for _, data := range []string{"abc", "abcd"} {
		body, ctype := fileMultipart(t, data)
		r, _ := http.NewRequest("POST", "/v1/files", bytes.NewReader(body))
		r.Header.Set("Content-Type", ctype)
		u, err := spoolResourceUpload(r, 3)
		if data == "abcd" {
			if err == nil {
				u.close()
				t.Fatal("oversize accepted")
			}
			continue
		}
		if err != nil {
			t.Fatal(err)
		}
		if u.size != 3 || len(u.digest) != 64 {
			t.Fatal("file not measured/hashed")
		}
		u.close()
	}
	r, _ := http.NewRequest("POST", "/v1/files", strings.NewReader("bad"))
	r.Header.Set("Content-Type", "multipart/form-data; boundary=invalid")
	if u, err := spoolResourceUpload(r, 3); err == nil {
		u.close()
		t.Fatal("malformed multipart accepted")
	}
}
