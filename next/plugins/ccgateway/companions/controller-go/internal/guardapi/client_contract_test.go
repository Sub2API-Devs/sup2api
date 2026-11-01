package guardapi_test

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"testing"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
)

// The guard's API contract samples (05 §5) replayed to the client: for
// every sample an httptest server answers the sample's status, headers and
// body, and the client method of the sample's route is called with the
// sample's arguments. Rules:
//   - an error answer is the sample's body plus a "message"; the client must
//     return an *Error with the sample's status, code, reason and names,
//     mapped to the controller sentinel or named failure (expectError);
//   - a success answer is the sample's body; keys the sample lists without
//     a value get a neutral filler (null, or [] / {} where the client needs
//     that type); body_base64 is sent verbatim. The client must succeed
//     and decode the values the sample gives (checkDecoded);
//   - for a success sample, the request the client sends must be the
//     sample's request: method, path, query, Content-Type, the raw body, and
//     the JSON body (each key of the sample with an equal value; a key the
//     sample does not send must appear in another sample of the route).
//     Error samples often carry requests the client cannot make (bad
//     tokens, unknown fields, chunked bodies); their requests are not
//     compared.

const contractDir = "../../../guard/testdata/api-contract"

type sampleReq struct {
	Method      string              `json:"method"`
	Path        string              `json:"path"`
	JSON        json.RawMessage     `json:"json,omitempty"`
	Text        *string             `json:"text,omitempty"`
	BodyBase64  string              `json:"body_base64,omitempty"`
	ContentType string              `json:"content_type,omitempty"`
	Length      *int64              `json:"content_length,omitempty"`
	Chunked     bool                `json:"chunked,omitempty"`
	Auth        string              `json:"auth,omitempty"`
	Remote      string              `json:"remote,omitempty"`
	Headers     map[string][]string `json:"headers,omitempty"`
}

type sampleResp struct {
	Status     int               `json:"status"`
	Body       map[string]any    `json:"body,omitempty"`
	Keys       []string          `json:"keys,omitempty"`
	Headers    map[string]string `json:"headers,omitempty"`
	BodyBase64 string            `json:"body_base64,omitempty"`
}

type sample struct {
	dir      string
	Name     string     `json:"name"`
	Request  sampleReq  `json:"request"`
	Response sampleResp `json:"response"`
}

func loadSamples(t *testing.T) []sample {
	t.Helper()
	var out []sample
	err := filepath.WalkDir(contractDir, func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(p, ".json") {
			return err
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		var s sample
		if err := json.Unmarshal(b, &s); err != nil {
			return fmt.Errorf("%s: %w", p, err)
		}
		s.dir = filepath.Base(filepath.Dir(p))
		out = append(out, s)
		return nil
	})
	if err != nil {
		t.Fatalf("contract samples (%s): %v", contractDir, err)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].dir < out[j].dir })
	return out
}

// filler is the value of a key the sample lists without giving it.
func filler(key string) any {
	switch key {
	case "volume":
		return map[string]any{}
	case "images", "containers", "networks", "volumes", "host_routes", "others", "volume_users", "network_foreign",
		"features", "Titles", "Processes":
		return []any{}
	}
	return nil
}

// answerBody is the JSON body the replay server sends.
func answerBody(r sampleResp) []byte {
	if r.BodyBase64 != "" {
		b, _ := base64.StdEncoding.DecodeString(r.BodyBase64)
		return b
	}
	if r.Body == nil && r.Keys == nil {
		return nil
	}
	m := map[string]any{}
	for k, v := range r.Body {
		m[k] = v
	}
	for _, k := range r.Keys {
		if _, ok := m[k]; !ok {
			m[k] = filler(k)
		}
	}
	if r.Status >= 400 {
		if _, ok := m["message"]; !ok {
			m["message"] = "sample"
		}
	}
	b, _ := json.Marshal(m)
	return b
}

type seenReq struct {
	method, path, query, ctype string
	length                     int64
	chunked                    bool
	body                       []byte
}

// replay serves the sample's answer and records the request.
func replay(t *testing.T, s sample) (*guardapi.HTTPClient, *seenReq) {
	t.Helper()
	seen := &seenReq{}
	body := answerBody(s.Response)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		*seen = seenReq{method: r.Method, path: r.URL.EscapedPath(), query: r.URL.RawQuery, ctype: r.Header.Get("Content-Type"),
			length: r.ContentLength, chunked: len(r.TransferEncoding) > 0, body: b}
		for k, v := range s.Response.Headers {
			w.Header().Set(k, v)
		}
		if body != nil && w.Header().Get("Content-Type") == "" {
			w.Header().Set("Content-Type", "application/json")
		}
		if s.Response.Status != http.StatusNoContent && w.Header().Get("Content-Length") == "" {
			w.Header().Set("Content-Length", strconv.Itoa(len(body)))
		}
		w.WriteHeader(s.Response.Status)
		w.Write(body)
	}))
	t.Cleanup(srv.Close)
	c, err := guardapi.New(srv.URL, token)
	if err != nil {
		t.Fatal(err)
	}
	return c, seen
}

func pathAID(p string) string {
	parts := strings.Split(strings.TrimPrefix(p, "/"), "/")
	if len(parts) >= 3 && (parts[1] == "accounts" || parts[1] == "gateway" && parts[2] == "networks") {
		if parts[1] == "accounts" {
			return parts[2]
		}
		if len(parts) >= 4 {
			return parts[3]
		}
	}
	return ""
}

func rawBody(r sampleReq) []byte {
	switch {
	case r.BodyBase64 != "":
		b, _ := base64.StdEncoding.DecodeString(r.BodyBase64)
		return b
	case r.Text != nil:
		return []byte(*r.Text)
	}
	return nil
}

// outcome is what a client call returned, for the decode checks.
type outcome struct {
	err   error
	value any
	data  []byte // stream content
	size  int64
}

// call invokes the client method of the sample's route.
func call(c *guardapi.HTTPClient, s sample) outcome {
	ctx := context.Background()
	path, rawQuery, _ := strings.Cut(s.Request.Path, "?")
	q, _ := url.ParseQuery(rawQuery)
	aid := pathAID(path)
	last := path[strings.LastIndexByte(path, '/')+1:]
	js := s.Request.JSON
	dec := func(v any) { _ = json.Unmarshal(js, v) }
	m, p := s.Request.Method, path
	switch {
	case p == "/v1/health":
		v, err := c.Health(ctx)
		return outcome{err: err, value: v}
	case p == "/v1/subnets":
		v, err := c.Subnets(ctx)
		return outcome{err: err, value: v}
	case p == "/v1/inventory":
		v, err := c.Inventory(ctx)
		return outcome{err: err, value: v}
	case p == "/v1/images/inspect":
		v, err := c.ImageInspect(ctx, q.Get("ref"))
		return outcome{err: err, value: v}
	case p == "/v1/images/pull":
		var r struct{ Ref string }
		dec(&r)
		return outcome{err: c.ImagePull(ctx, r.Ref)}
	case p == "/v1/images/file":
		limit, _ := strconv.ParseInt(q.Get("limit"), 10, 64)
		rc, size, err := c.ImageFile(ctx, q.Get("ref"), q.Get("path"), limit)
		if err != nil {
			return outcome{err: err}
		}
		defer rc.Close()
		data, err := io.ReadAll(rc)
		return outcome{err: err, data: data, size: size}
	case p == "/v1/images/load":
		b := rawBody(s.Request)
		v, err := c.ImageLoad(ctx, bytes.NewReader(b), int64(len(b)))
		return outcome{err: err, value: v}
	case strings.HasPrefix(p, "/v1/accounts/") && strings.Count(p, "/") == 3 && m == "GET":
		if q.Get("fields") == "state" {
			v, err := c.AccountState(ctx, aid)
			return outcome{err: err, value: v}
		}
		v, err := c.Account(ctx, aid)
		return outcome{err: err, value: v}
	case strings.HasSuffix(p, "/network") && m == "PUT":
		var r guardapi.NetworkRequest
		dec(&r)
		v, err := c.CreateNetwork(ctx, aid, r)
		return outcome{err: err, value: v}
	case strings.HasSuffix(p, "/network") && m == "DELETE":
		return outcome{err: c.DeleteNetwork(ctx, aid, q.Get("role"))}
	case strings.HasSuffix(p, "/volume") && m == "PUT":
		var r guardapi.VolumeRequest
		dec(&r)
		v, err := c.EnsureVolume(ctx, aid, r)
		return outcome{err: err, value: v}
	case strings.HasSuffix(p, "/volume") && m == "DELETE":
		return outcome{err: c.DeleteVolume(ctx, aid)}
	case strings.HasSuffix(p, "/app") && m == "PUT":
		var r guardapi.AppRequest
		dec(&r)
		v, err := c.CreateApp(ctx, aid, r)
		return outcome{err: err, value: v}
	case strings.HasSuffix(p, "/app/exec"):
		var r struct {
			Argv []string
			User string
		}
		dec(&r)
		v, err := c.AppExec(ctx, aid, r.Argv, r.User)
		return outcome{err: err, value: v}
	case strings.HasSuffix(p, "/app/archive") && m == "GET":
		rc, err := c.AppArchiveGet(ctx, aid, q.Get("path"))
		if err != nil {
			return outcome{err: err}
		}
		defer rc.Close()
		data, err := io.ReadAll(rc)
		return outcome{err: err, data: data}
	case strings.HasSuffix(p, "/app/archive") && m == "PUT":
		b := rawBody(s.Request)
		return outcome{err: c.AppArchivePut(ctx, aid, q.Get("path"), bytes.NewReader(b), int64(len(b)))}
	case strings.HasSuffix(p, "/app/top"):
		v, err := c.AppTop(ctx, aid)
		return outcome{err: err, value: v}
	case strings.Contains(p, "/app/"):
		var r struct{ Timeout *int }
		dec(&r)
		return outcome{err: c.AppAction(ctx, aid, last, r.Timeout)}
	case strings.Contains(p, "/containers/"):
		return outcome{err: c.DeleteContainer(ctx, aid, last)}
	case strings.HasSuffix(p, "/resolv"):
		var r struct{ Nameserver string }
		dec(&r)
		return outcome{err: c.WriteResolv(ctx, aid, r.Nameserver)}
	case strings.HasSuffix(p, "/firewall"):
		var r struct {
			Rules          string
			DefaultGateway string `json:"default_gateway"`
		}
		dec(&r)
		return outcome{err: c.InstallFirewall(ctx, aid, r.Rules, r.DefaultGateway)}
	case strings.HasSuffix(p, "/jobs"):
		var r guardapi.Job
		dec(&r)
		v, err := c.RunJob(ctx, aid, r)
		return outcome{err: err, value: v}
	case p == "/v1/gateway":
		v, err := c.Gateway(ctx)
		return outcome{err: err, value: v}
	case p == "/v1/gateway/ensure":
		var r struct{ Uplink *guardapi.UplinkRequest }
		dec(&r)
		v, err := c.EnsureGateway(ctx, r.Uplink)
		return outcome{err: err, value: v}
	case p == "/v1/gateway/recreate":
		var r struct{ Image string }
		dec(&r)
		v, err := c.RecreateGateway(ctx, r.Image)
		return outcome{err: err, value: v}
	case p == "/v1/gateway/exec":
		var r struct{ Argv []string }
		dec(&r)
		v, err := c.GatewayExec(ctx, r.Argv)
		return outcome{err: err, value: v}
	case strings.HasPrefix(p, "/v1/gateway/networks/") && m == "PUT":
		var r struct{ IPv4 string }
		dec(&r)
		return outcome{err: c.ConnectGateway(ctx, aid, r.IPv4)}
	case strings.HasPrefix(p, "/v1/gateway/networks/"):
		return outcome{err: c.DisconnectGateway(ctx, aid)}
	case strings.HasPrefix(p, "/v1/gateway/files/"):
		return outcome{err: c.WriteGatewayFile(ctx, strings.TrimPrefix(p, "/v1/gateway/files/"), rawBody(s.Request))}
	case p == "/v1/controller/upgrade" && m == "POST":
		var r struct{ Image string }
		dec(&r)
		return outcome{err: c.UpgradeController(ctx, r.Image)}
	case p == "/v1/controller/upgrade":
		v, err := c.UpgradeStatus(ctx)
		return outcome{err: err, value: v}
	}
	// unknown endpoints: any call carries the answer back
	v, err := c.Health(ctx)
	return outcome{err: err, value: v}
}

// expectError checks the error mapping of an error sample.
func expectError(t *testing.T, s sample, err error) {
	t.Helper()
	if err == nil {
		t.Fatal("no error")
	}
	ge, ok := guardapi.AsError(err)
	if !ok {
		t.Fatalf("not a guard *Error: %v", err)
	}
	code, _ := s.Response.Body["error"].(string)
	reason, _ := s.Response.Body["reason"].(string)
	var nm []string
	if list, ok := s.Response.Body["names"].([]any); ok {
		for _, n := range list {
			nm = append(nm, n.(string))
		}
	}
	if ge.Status != s.Response.Status || (code != "" && ge.Code != code) || ge.Reason != reason {
		t.Fatalf("*Error %d %s/%s, want %d %s/%s", ge.Status, ge.Code, ge.Reason, s.Response.Status, code, reason)
	}
	if nm != nil && strings.Join(ge.Names, ",") != strings.Join(nm, ",") {
		t.Fatalf("names %v, want %v", ge.Names, nm)
	}
	route := s.Request.Method + " " + strings.SplitN(s.Request.Path, "?", 2)[0]
	is := func(target error) bool { return errors.Is(err, target) }
	named := errs.KindOf(err)
	switch {
	case route == "POST /v1/images/pull":
		if !errs.Is(err, errs.ImagePullFailed) {
			t.Fatalf("pull: %v is not ImagePullFailed", err)
		}
		return
	case route == "POST /v1/controller/upgrade" && s.Response.Status == 403:
		if !errs.Is(err, errs.InvalidImage) {
			t.Fatalf("upgrade 403: %v is not InvalidImage", err)
		}
		return
	}
	want := map[string]bool{}
	switch key := fmt.Sprintf("%d %s/%s", s.Response.Status, code, reason); {
	case s.Response.Status == 404:
		want["notfound"] = is(guardapi.ErrNotFound) && guardapi.IsNotFound(err) && named == 0
	case key == "409 conflict/ownership_mismatch":
		var n *errs.Error
		want["mismatch"] = errors.As(err, &n) && n.Kind == errs.OwnershipMismatch && strings.Join(n.Names, ",") == strings.Join(nm, ",")
	case key == "409 conflict/resource_in_use":
		var n *errs.Error
		want["inuse"] = errors.As(err, &n) && n.Kind == errs.ResourceInUse
	case key == "409 conflict/upgrade_in_progress":
		want["upgrade"] = errs.Is(err, errs.UpgradeInProgress)
	case key == "409 conflict/exists":
		want["exists"] = is(guardapi.ErrExists) && named == 0
	case key == "409 conflict/subnet_overlap":
		want["overlap"] = is(guardapi.ErrSubnetOverlap) && named == 0
	case key == "409 conflict/uplink_missing":
		want["uplink"] = is(guardapi.ErrUplinkMissing) && named == 0
	case key == "409 conflict/not_running":
		want["notrunning"] = is(guardapi.ErrNotRunning) && named == 0
	case key == "409 conflict/mount_source_replaced":
		want["replaced"] = is(guardapi.ErrMountReplaced) && named == 0
	case key == "409 conflict/gateway_not_compose":
		want["notcompose"] = guardapi.ReasonOf(err) == guardapi.ReasonGatewayNotCompose && named == 0
	case strings.HasPrefix(key, "503 disk_quota_unavailable"):
		want["quota"] = errs.Is(err, errs.DiskQuotaUnavailable)
	case strings.HasPrefix(key, "503 busy"):
		want["busy"] = errs.Is(err, errs.RuntimeBusy)
	case key == "503 unavailable/starting":
		want["starting"] = is(guardapi.ErrStarting) && is(guardapi.ErrUnavailable) && named == 0
	case s.Response.Status == 401:
		want["unauthorized"] = is(guardapi.ErrUnauthorized) && named == 0
	case key == "403 forbidden/controller_unguarded":
		want["unguarded"] = is(guardapi.ErrUnguarded) && named == 0
	case key == "403 forbidden/load_forbidden":
		want["load"] = is(guardapi.ErrLoadForbidden) && named == 0
	case key == "403 forbidden/mount_source_rejected":
		want["mount"] = is(guardapi.ErrMountRejected) && named == 0
	case key == "422 unprocessable/not_regular_file":
		want["notfile"] = is(guardapi.ErrNotRegularFile)
	case key == "422 unprocessable/too_large":
		want["toolarge"] = is(guardapi.ErrFileTooLarge)
	default:
		// 400, 405, 413, other 403, 502, 504: unnamed (503 runtime_unavailable upstream)
		st, c, known := errs.Answer(err, errs.All)
		want["unnamed"] = named == 0 && !known && st == 503 && c == "runtime_unavailable" && !is(guardapi.ErrUnavailable)
	}
	for k, ok := range want {
		if !ok {
			t.Fatalf("%s: mapping %s failed: %v", s.Request.Path, k, err)
		}
	}
}

func bodyString(s sample, k string) (string, bool) {
	v, ok := s.Response.Body[k].(string)
	return v, ok
}

// checkDecoded compares what the client decoded with the sample's values.
func checkDecoded(t *testing.T, s sample, o outcome) {
	t.Helper()
	b := s.Response.Body
	fail := func(format string, a ...any) { t.Helper(); t.Fatalf(format, a...) }
	switch v := o.value.(type) {
	case *guardapi.Health:
		if c, ok := bodyString(s, "controller"); ok && v.Controller != c {
			fail("controller %q", v.Controller)
		}
		if f, ok := b["features"].([]any); ok {
			if len(v.Features) != len(f) || len(v.Missing(guardapi.RequiredFeatures)) != 0 {
				fail("features %v", v.Features)
			}
		}
	case *guardapi.VolumeResult:
		if v.Volume == nil || v.Created != b["created"].(bool) {
			fail("%+v", v)
		}
		if q, ok := b["quota_supported"].(bool); ok {
			if v.QuotaSupported == nil || *v.QuotaSupported != q {
				fail("quota_supported %v", v.QuotaSupported)
			}
		} else if v.QuotaSupported != nil {
			fail("quota_supported null decodes as nil, got %v", *v.QuotaSupported)
		}
		if (s.Response.Status == 201) != v.Created {
			fail("201 is created, 200 existing: %+v", v)
		}
	case *guardapi.ExecResult:
		out, _ := base64.StdEncoding.DecodeString(b["output"].(string))
		if v.ExitCode != int(b["exit_code"].(float64)) || !bytes.Equal(v.Output, out) {
			fail("%+v", v)
		}
	case *guardapi.JobResult:
		out, _ := base64.StdEncoding.DecodeString(b["stdout"].(string))
		if v.ExitCode != int(b["exit_code"].(float64)) || !bytes.Equal(v.Stdout, out) {
			fail("%+v", v)
		}
	case *guardapi.UpgradeStatus:
		if st, ok := bodyString(s, "state"); ok && v.State != st {
			fail("state %q", v.State)
		}
	case *guardapi.Gateway:
		if mb, ok := bodyString(s, "managed_by"); ok && v.ManagedBy != mb {
			fail("managed_by %q", v.ManagedBy)
		}
		if g, ok := b["gateway"]; ok && g == nil && v.Container != nil {
			fail("gateway null decodes as nil")
		}
	case *guardapi.EnsureResult:
		if a, ok := bodyString(s, "action"); ok && v.Action != a {
			fail("action %q", v.Action)
		}
	case *guardapi.Account:
		if a, ok := b["app"]; ok && a == nil && v.App != nil {
			fail("app null decodes as nil")
		}
		if ga, ok := b["gateway_attached"].(bool); ok && v.GatewayAttached != ga {
			fail("gateway_attached %v", v.GatewayAttached)
		}
	case *guardapi.AccountState:
		if a, ok := b["app"]; ok && a == nil && v.App != nil {
			fail("app null decodes as nil")
		}
		if g, ok := b["gateway"]; ok && g == nil && v.Gateway != nil {
			fail("gateway null decodes as nil")
		}
	case *guardapi.Image:
		if tags, ok := b["RepoTags"].([]any); ok && (len(v.RepoTags) != len(tags) || v.RepoTags[0] != tags[0]) {
			fail("RepoTags %v", v.RepoTags)
		}
	case *guardapi.Container:
		if n, ok := bodyString(s, "Name"); ok && "/"+v.Name != n {
			fail("Name %q", v.Name)
		}
	}
	if s.Response.BodyBase64 != "" {
		want, _ := base64.StdEncoding.DecodeString(s.Response.BodyBase64)
		if !bytes.Equal(o.data, want) {
			fail("stream %q", o.data)
		}
		if cl, ok := s.Response.Headers["Content-Length"]; ok && strconv.FormatInt(o.size, 10) != cl {
			fail("size %d, want %s", o.size, cl)
		}
	}
}

// routeKeys are the JSON keys any sample sends to a route.
func routeKeys(all []sample) map[string]map[string]bool {
	out := map[string]map[string]bool{}
	for _, s := range all {
		var m map[string]any
		if json.Unmarshal(s.Request.JSON, &m) != nil {
			continue
		}
		r := s.Request.Method + " " + s.dir
		if out[r] == nil {
			out[r] = map[string]bool{}
		}
		for k := range m {
			out[r][k] = true
		}
	}
	return out
}

// checkRequest: the client sent the sample's request.
func checkRequest(t *testing.T, s sample, got *seenReq, keys map[string]map[string]bool) {
	t.Helper()
	path, rawQuery, _ := strings.Cut(s.Request.Path, "?")
	if got.method != s.Request.Method || got.path != path {
		t.Fatalf("request %s %s, want %s %s", got.method, got.path, s.Request.Method, path)
	}
	wq, _ := url.ParseQuery(rawQuery)
	gq, _ := url.ParseQuery(got.query)
	if fmt.Sprint(wq) != fmt.Sprint(gq) {
		t.Fatalf("query %v, want %v", gq, wq)
	}
	if got.chunked || (len(got.body) > 0 && got.length != int64(len(got.body))) {
		t.Fatalf("body sent chunked or with a wrong Content-Length (%d, %d bytes)", got.length, len(got.body))
	}
	switch {
	case s.Request.JSON != nil:
		if got.ctype != "application/json" {
			t.Fatalf("Content-Type %q", got.ctype)
		}
		var want, sent map[string]any
		json.Unmarshal(s.Request.JSON, &want)
		if err := json.Unmarshal(got.body, &sent); err != nil {
			t.Fatalf("body %q", got.body)
		}
		for k, v := range want {
			if !jsonEq(sent[k], v) {
				t.Fatalf("body[%s] = %v, want %v", k, sent[k], v)
			}
		}
		for k := range sent {
			if !keys[s.Request.Method+" "+s.dir][k] {
				t.Fatalf("the client sends %q, which no sample of the route sends", k)
			}
		}
	case s.Request.BodyBase64 != "":
		if !bytes.Equal(got.body, rawBody(s.Request)) || got.ctype != s.Request.ContentType {
			t.Fatalf("raw body (%s) differs", got.ctype)
		}
	}
}

func jsonEq(a, b any) bool {
	ja, _ := json.Marshal(a)
	jb, _ := json.Marshal(b)
	return bytes.Equal(ja, jb)
}

// covers: 05-§5 03-§3.3 02-§5.3 (the client decodes every contract sample's answer and maps every error to its sentinel)
func TestContractReplay(t *testing.T) {
	all := loadSamples(t)
	if len(all) < 252 {
		t.Fatalf("only %d contract samples", len(all))
	}
	keys := routeKeys(all)
	for _, s := range all {
		s := s
		t.Run(s.dir+"/"+s.Name, func(t *testing.T) {
			c, seen := replay(t, s)
			o := call(c, s)
			if s.Response.Status >= 400 {
				expectError(t, s, o.err)
				return
			}
			if o.err != nil {
				t.Fatalf("success sample: %v", o.err)
			}
			checkDecoded(t, s, o)
			checkRequest(t, s, seen, keys)
		})
	}
}

// covers: 03-§3.6.3 03-§3.5.10 02-§5.4 R20 (a transfer cut before its end is an error, never a short file)
func TestTruncatedStreams(t *testing.T) {
	cut := func(w http.ResponseWriter, declared string, data string) {
		if declared != "" {
			w.Header().Set("Content-Length", declared)
		}
		w.WriteHeader(200)
		w.Write([]byte(data))
		w.(http.Flusher).Flush()
		panic(http.ErrAbortHandler) // what the guard does when Docker's stream breaks
	}
	cl := serve(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/v1/images/file" && r.URL.Query().Get("path") == "/cut":
			cut(w, "10", "01234")
		case r.URL.Path == "/v1/images/file" && r.URL.Query().Get("path") == "/chunked":
			w.WriteHeader(200)
			w.Write([]byte("0123456789"))
			w.(http.Flusher).Flush()
		case r.URL.Path == "/v1/accounts/21/app/archive":
			w.Header().Set("Content-Type", "application/x-tar")
			w.Header().Set("X-Docker-Container-Path-Stat", "e30=")
			cut(w, "", strings.Repeat("t", 1024))
		}
	})
	ctx := context.Background()
	rc, size, err := cl.ImageFile(ctx, "x:1", "/cut", 100)
	if err != nil || size != 10 {
		t.Fatal(size, err)
	}
	if _, err := io.ReadAll(rc); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("images/file cut after 5 of 10 bytes:", err)
	}
	rc.Close()
	if _, _, err := cl.ImageFile(ctx, "x:1", "/chunked", 100); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("images/file without Content-Length:", err)
	}
	rc, err = cl.AppArchiveGet(ctx, "21", "/x")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := io.ReadAll(rc); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("archive stream cut before its last chunk:", err)
	}
	rc.Close()
}

// covers: 03-§3.3 03-§3.6.4 03-§3.5.10 03-§3.7.7 (raw bodies carry Content-Length and their media type, never chunked; JSON bodies are application/json, at most 1 MiB)
func TestRequestBodies(t *testing.T) {
	type got struct {
		path, ctype string
		length      int64
		te          []string
		n           int
	}
	var seen []got
	cl := serve(t, func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		seen = append(seen, got{r.URL.Path, r.Header.Get("Content-Type"), r.ContentLength, r.TransferEncoding, len(b)})
		switch r.URL.Path {
		case "/v1/images/load":
			answer(w, 200, `{"images": []}`)
		default:
			w.WriteHeader(204)
		}
	})
	ctx := context.Background()
	var gz bytes.Buffer
	zw := gzip.NewWriter(&gz)
	zw.Write([]byte("tar"))
	zw.Close()
	// readers without a known length (not *bytes.Reader) must still go out with Content-Length
	if _, err := cl.ImageLoad(ctx, io.MultiReader(strings.NewReader("plain tar")), 9); err != nil {
		t.Fatal(err)
	}
	if _, err := cl.ImageLoad(ctx, io.MultiReader(bytes.NewReader(gz.Bytes())), int64(gz.Len())); err != nil {
		t.Fatal(err)
	}
	if err := cl.AppArchivePut(ctx, "21", "/work", io.MultiReader(strings.NewReader("tarbytes")), 8); err != nil {
		t.Fatal(err)
	}
	if err := cl.WriteGatewayFile(ctx, guardapi.FileBootJSON, []byte(`{"v":1}`)); err != nil {
		t.Fatal(err)
	}
	if err := cl.WriteGatewayFile(ctx, guardapi.FileOperation, nil); err != nil {
		t.Fatal(err)
	}
	if err := cl.AppAction(ctx, "21", guardapi.ActionStart, nil); err != nil {
		t.Fatal(err)
	}
	want := []got{
		{"/v1/images/load", "application/x-tar", 9, nil, 9},
		{"/v1/images/load", "application/gzip", int64(gz.Len()), nil, gz.Len()},
		{"/v1/accounts/21/app/archive", "application/x-tar", 8, nil, 8},
		{"/v1/gateway/files/boot.json", "application/octet-stream", 7, nil, 7},
		{"/v1/gateway/files/operation.json", "application/octet-stream", 0, nil, 0},
		{"/v1/accounts/21/app/start", "application/json", 2, nil, 2},
	}
	if fmt.Sprint(seen) != fmt.Sprint(want) {
		t.Fatalf("requests\n%v\nwant\n%v", seen, want)
	}
	seen = nil
	if _, err := cl.ImageLoad(ctx, strings.NewReader("x"), -1); err == nil {
		t.Fatal("a raw body of unknown size would be chunked")
	}
	if err := cl.AppArchivePut(ctx, "21", "/work", strings.NewReader("short"), 50); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("a body shorter than its size:", err)
	}
	big := make([]string, 300)
	for i := range big {
		big[i] = strings.Repeat("a", 4096)
	}
	_, err := cl.AppExec(ctx, "21", big, "")
	if e, ok := guardapi.AsError(err); !ok || e.Status != 413 || e.Code != guardapi.CodeTooLarge {
		t.Fatal("a JSON body over 1 MiB:", err)
	}
	for _, s := range seen {
		if s.path == "/v1/images/load" || s.path == "/v1/accounts/21/app/exec" {
			t.Fatalf("%s was sent", s.path)
		}
	}
}

// covers: 03-§3.2 03-§3.4 (token syntax, exact success statuses, upgrade accepted)
func TestStatusesAndToken(t *testing.T) {
	for _, bad := range []string{strings.Repeat("A", 64), strings.Repeat("g", 64), strings.Repeat("a", 63), "Bearer " + strings.Repeat("a", 57)} {
		if _, err := guardapi.New("http://172.29.255.1:8790", bad); err == nil {
			t.Errorf("token %q accepted", bad)
		}
	}
	status := 200
	body := ""
	cl := serve(t, func(w http.ResponseWriter, r *http.Request) {
		if body == "" {
			w.WriteHeader(status)
			return
		}
		answer(w, status, body)
	})
	ctx := context.Background()
	// a 200 where the guard answers 204, 201 or 202 is a protocol error
	if err := cl.DeleteVolume(ctx, "21"); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("200 for a 204 endpoint:", err)
	}
	body = `{"Name": "ccg-21-net"}`
	if _, err := cl.CreateNetwork(ctx, "21", guardapi.NetworkRequest{}); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("200 for PUT network (201):", err)
	}
	status = 201
	if n, err := cl.CreateNetwork(ctx, "21", guardapi.NetworkRequest{}); err != nil || n.Name != "ccg-21-net" {
		t.Fatal("PUT network answers the raw inspect itself:", n, err)
	}
	body = `{"Name": "/ccg-21-app", "Id": "abc"}`
	if a, err := cl.CreateApp(ctx, "21", guardapi.AppRequest{}); err != nil || a.Name != "ccg-21-app" || a.ID != "abc" {
		t.Fatal("PUT app answers the raw inspect itself:", a, err)
	}
	status, body = 202, `{"accepted": true}`
	if err := cl.UpgradeController(ctx, "ctl:2"); err != nil {
		t.Fatal(err)
	}
	body = `{"accepted": false}`
	if err := cl.UpgradeController(ctx, "ctl:2"); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("202 without accepted:", err)
	}
	status, body = 200, `{"Id": "x"}`
	if _, err := cl.RecreateGateway(ctx, "egress:2"); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("recreate answers {\"gateway\": ...}:", err)
	}
}
