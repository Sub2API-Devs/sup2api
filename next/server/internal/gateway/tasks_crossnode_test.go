package gateway

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
)

type taskDraftPlatform struct {
	*fakePlatform
	parseCalls atomic.Int64
	parseError error
}

func (p *taskDraftPlatform) ParseTaskSubmission(_ context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.TaskSubmission, error) {
	p.parseCalls.Add(1)
	if p.parseError != nil {
		return nil, p.parseError
	}
	return &pluginv1.TaskSubmission{UpstreamRefId: "raw-video-id",
		SnapshotJson:      `{"id":"raw-video-id","data":{"id":"raw-video-id"},"status":"queued","opaque_number":9007199254740993}`,
		NextCheckAfterSec: 20, DeadlineSec: 3600}, nil
}

func taskDraftEnv(t *testing.T, tasks core.AsyncTasks, noAccounts bool) (*env, *taskDraftPlatform) {
	t.Helper()
	pp := &taskDraftPlatform{fakePlatform: &fakePlatform{}}
	e := newEnv(t, func(e *env) {
		pp.base = e.up.srv.URL
		submit := manifest.Endpoint{ID: "submit", Method: "POST", Path: "/task-draft/videos", Protocol: "task-draft.submit", Kind: "proxy",
			Auth: manifest.EndpointAuth{Headers: []string{"x-api-key"}}, Request: manifest.EndpointRequest{ModelPath: "model"},
			Response: manifest.EndpointResp{NonStream: "json"}, Billing: "free", ErrorFormat: "plain",
			Task: &manifest.AsyncTaskEndpoint{Action: manifest.TaskActionSubmit, Kind: "video", IDPaths: []string{"id", "data.id"}}}
		query := manifest.Endpoint{ID: "query", Method: "GET", Path: "/task-draft/videos/:task_id", Protocol: "task-draft.query", Kind: "proxy",
			Auth: manifest.EndpointAuth{Headers: []string{"x-api-key"}}, Response: manifest.EndpointResp{NonStream: "json"}, Billing: "free", ErrorFormat: "plain",
			Task: &manifest.AsyncTaskEndpoint{Action: manifest.TaskActionQuery, Kind: "video", IDParam: "task_id", IDPaths: []string{"id", "data.id"}}}
		pf := manifest.Platform{ID: "task-draft", Endpoints: []manifest.Endpoint{submit, query}}
		info := e.addAccountType("task-draft", "apikey", pp, manifest.AccountPlatform{Platform: "task-draft"})
		e.gen.addPlatform(info, pf, pp)
		e.accounts.addTyped(testGroup, 9, 0, "task-account-9", "task-draft", "apikey")
		e.accounts.addTyped(testGroup, 10, 1, "task-account-10", "task-draft", "apikey")
		e.accounts.groups[testGroup] = []int64{9, 10}
		if noAccounts {
			e.accounts.groups[testGroup] = nil
		}
		for key, change := range map[string]func(*core.APIKeyPrincipal){
			"same-owner-other-key": func(p *core.APIKeyPrincipal) { p.KeyID++ },
			"other-user":           func(p *core.APIKeyPrincipal) { p.UserID++ },
			"other-group":          func(p *core.APIKeyPrincipal) { p.Group.ID++ },
			"model-denied":         func(p *core.APIKeyPrincipal) { p.Group.ModelAllowlist = []string{"unrelated-model"} },
		} {
			principal := *e.auth.keys[testKey]
			change(&principal)
			e.auth.keys[key] = &principal
		}
	})
	e.gw.d.Tasks = tasks
	e.up.set("task-account-9", &upstreamRule{status: 200, body: `{"id":"raw-video-id","data":{"id":"raw-video-id"}}`})
	e.up.set("task-account-10", &upstreamRule{status: 200, body: `{"id":"raw-video-id","data":{"id":"raw-video-id"}}`})
	return e, pp
}

func taskDraftGet(t *testing.T, e *env, id, key string) result {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, e.srv.URL+"/task-draft/videos/"+id, nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("x-api-key", key)
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatal(err)
	}
	return result{status: resp.StatusCode, header: resp.Header, body: body}
}

// The two gateways and services share only durable PG task state. The querying
// node deliberately has no eligible upstream account, ruling out hidden dispatch.
func TestTaskGatewayCrossNodeSnapshotAndAuthorization(t *testing.T) {
	db := testutil.DB(t)
	nodeA := usage.New(db, billing.New(db, nil, nil, nil, nil), nil, usage.Options{})
	nodeB := usage.New(db, billing.New(db, nil, nil, nil, nil), nil, usage.Options{})
	a, pa := taskDraftEnv(t, nodeA, false)
	b, pb := taskDraftEnv(t, nodeB, true)
	res := a.do("/task-draft/videos", map[string]any{"model": testModel}, nil)
	public := res.json().Get("id").String()
	if res.status != 200 || !strings.HasPrefix(public, "s2task_") || res.json().Get("data.id").String() != public ||
		strings.Contains(string(res.body), "raw-video-id") {
		t.Fatalf("submit did not return only public IDs: %d %s", res.status, res.body)
	}
	a.noRecord() // successful registration already persisted usage synchronously
	for _, key := range []string{testKey, "same-owner-other-key"} {
		got := taskDraftGet(t, b, public, key)
		if got.status != 200 || got.json().Get("id").String() != public || got.json().Get("data.id").String() != public ||
			got.json().Get("status").String() != "queued" || strings.Contains(string(got.body), "raw-video-id") ||
			!strings.Contains(string(got.body), "9007199254740993") {
			t.Fatalf("immediate query key=%s: %d %s", key, got.status, got.body)
		}
	}
	for _, key := range []string{"other-user", "other-group"} {
		if got := taskDraftGet(t, b, public, key); got.status != 404 {
			t.Fatalf("unauthorized query key=%s: %d %s", key, got.status, got.body)
		}
	}
	if got := taskDraftGet(t, b, public, "model-denied"); got.status != 403 {
		t.Fatalf("model allowlist bypassed: %d %s", got.status, got.body)
	}
	if got := taskDraftGet(t, b, "raw-video-id", testKey); got.status != 404 {
		t.Fatalf("new raw task identity was exposed: %d %s", got.status, got.body)
	}
	if len(a.up.keys()) != 1 || len(b.up.keys()) != 0 || pa.parseCalls.Load() != 1 || pb.parseCalls.Load() != 0 ||
		pa.extractCount() != 0 || pb.extractCount() != 0 || pb.buildCount() != 0 || pb.resolveCount() != 0 {
		t.Fatalf("query or async usage reached plugin/upstream: submit=%v query=%v parses=%d/%d builds=%d resolves=%d",
			a.up.keys(), b.up.keys(), pa.parseCalls.Load(), pb.parseCalls.Load(), pb.buildCount(), pb.resolveCount())
	}
}

func TestTaskGatewayNeverResubmitsAfterSending(t *testing.T) {
	db := testutil.DB(t)
	for _, mode := range []string{"parser_failure", "transport_eof", "header_timeout", "upstream_503"} {
		t.Run(mode, func(t *testing.T) {
			svc := usage.New(db, billing.New(db, nil, nil, nil, nil), nil, usage.Options{})
			e, pp := taskDraftEnv(t, svc, false)
			var hits atomic.Int64
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				_, _ = io.Copy(io.Discard, r.Body)
				hits.Add(1)
				switch mode {
				case "transport_eof":
					conn, _, err := w.(http.Hijacker).Hijack()
					if err == nil {
						_ = conn.Close()
					}
					return
				case "header_timeout":
					<-r.Context().Done()
					return
				case "upstream_503":
					w.WriteHeader(http.StatusServiceUnavailable)
				}
				_, _ = io.WriteString(w, `{"id":"raw-video-id","data":{"id":"raw-video-id"}}`)
			}))
			t.Cleanup(up.Close)
			pp.base = up.URL
			if mode == "parser_failure" {
				pp.parseError = errors.New("parser unavailable after task accepted")
			}
			if mode == "header_timeout" {
				e.gw.headerWait = func(bool) time.Duration { return 100 * time.Millisecond }
			}
			got := e.do("/task-draft/videos", map[string]any{"model": testModel}, nil)
			if got.status != 503 || hits.Load() != 1 || pp.buildCount() != 1 {
				t.Fatalf("task submit was retried: mode=%s status=%d hits=%d builds=%d body=%s",
					mode, got.status, hits.Load(), pp.buildCount(), got.body)
			}
			wantParses := int64(0)
			if mode == "parser_failure" {
				wantParses = 1
			}
			if pp.parseCalls.Load() != wantParses || pp.extractCount() != 0 {
				t.Fatalf("unexpected usage/parser replay: parses=%d extracts=%d", pp.parseCalls.Load(), pp.extractCount())
			}
			rec := e.record()
			if rec.Billable || rec.Reservation != nil || rec.Attempts != 1 {
				t.Fatalf("uncertain task was billed or resubmitted: %+v", rec)
			}
			var state string
			var response []byte
			if err := db.Pool.QueryRow(context.Background(), `SELECT state,response_body FROM task_submission_receipts WHERE request_id=$1`, rec.RequestID).
				Scan(&state, &response); err != nil || state != "uncertain" || (mode == "parser_failure" && len(response) == 0) {
				t.Fatalf("uncertain receipt lost: state=%q body=%s err=%v", state, response, err)
			}
		})
	}
}
