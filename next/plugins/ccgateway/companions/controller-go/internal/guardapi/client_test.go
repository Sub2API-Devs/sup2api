package guardapi_test

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
)

const token = fakeguard.Token

func serve(t *testing.T, h http.HandlerFunc) *guardapi.HTTPClient {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	c, err := guardapi.New(srv.URL, token)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func answer(w http.ResponseWriter, status int, body string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	io.WriteString(w, body)
}

// covers: 03-§3.2 (bearer token on every request, no proxy, base URL checked)
func TestRequestShape(t *testing.T) {
	var seen *http.Request
	var body []byte
	c := serve(t, func(w http.ResponseWriter, r *http.Request) {
		seen = r
		body, _ = io.ReadAll(r.Body)
		answer(w, 200, `{"exit_code": 3, "output": "aGVsbG8="}`)
	})
	res, err := c.AppExec(context.Background(), "21", []string{"sha256sum", "/x"}, "0")
	if err != nil || res.ExitCode != 3 || string(res.Output) != "hello" {
		t.Fatal(res, err)
	}
	if seen.Header.Get("Authorization") != "Bearer "+token || seen.URL.Path != "/v1/accounts/21/app/exec" ||
		seen.Header.Get("Content-Type") != "application/json" || seen.Header.Get("Accept-Encoding") != "identity" {
		t.Fatalf("%v %v", seen.URL, seen.Header)
	}
	var req struct {
		Argv []string `json:"argv"`
		User string   `json:"user"`
	}
	if json.Unmarshal(body, &req) != nil || req.User != "0" || req.Argv[1] != "/x" {
		t.Fatal(string(body))
	}
	for _, bad := range []string{"https://172.29.255.1:8790", "http://guard:8790", "http://172.29.255.1"} {
		if _, err := guardapi.New(bad, token); err == nil {
			t.Errorf("%s accepted", bad)
		}
	}
	if _, err := guardapi.New("http://172.29.255.1:8790", "short"); err == nil {
		t.Error("short token")
	}
}

// covers: 02-§5.3 H10 (guard answers map to the controller's named failures)
func TestErrorMapping(t *testing.T) {
	cases := []struct {
		status int
		body   string
		check  func(error) bool
	}{
		{404, `{"error":"not_found","reason":"container","message":"x"}`, func(e error) bool { return guardapi.IsNotFound(e) && errs.KindOf(e) == 0 }},
		{409, `{"error":"conflict","reason":"ownership_mismatch","message":"x","names":["ccg-21-net"]}`, func(e error) bool {
			var n *errs.Error
			return errors.As(e, &n) && n.Kind == errs.OwnershipMismatch && n.Names[0] == "ccg-21-net"
		}},
		{409, `{"error":"conflict","reason":"resource_in_use","message":"x","names":["b","a"]}`, func(e error) bool {
			var n *errs.Error
			return errors.As(e, &n) && n.Kind == errs.ResourceInUse && strings.Join(n.Names, ",") == "a,b"
		}},
		{409, `{"error":"conflict","reason":"upgrade_in_progress","message":"x"}`, func(e error) bool { return errs.Is(e, errs.UpgradeInProgress) }},
		{409, `{"error":"conflict","reason":"not_running","message":"x"}`, func(e error) bool { return errors.Is(e, guardapi.ErrNotRunning) }},
		{409, `{"error":"conflict","reason":"exists","message":"x"}`, func(e error) bool { return errors.Is(e, guardapi.ErrExists) }},
		{409, `{"error":"conflict","reason":"subnet_overlap","message":"x"}`, func(e error) bool { return errors.Is(e, guardapi.ErrSubnetOverlap) }},
		{503, `{"error":"disk_quota_unavailable","message":"x"}`, func(e error) bool { return errs.Is(e, errs.DiskQuotaUnavailable) }},
		{503, `{"error":"busy","reason":"lock_timeout","message":"x"}`, func(e error) bool { return errs.Is(e, errs.RuntimeBusy) }},
		{502, `{"error":"docker_error","reason":"helper_failed","message":"x"}`, func(e error) bool {
			s, code, known := errs.Answer(e, errs.All)
			return s == 503 && code == "runtime_unavailable" && !known && guardapi.ReasonOf(e) == "helper_failed"
		}},
		{401, `{"error":"unauthorized","message":"x"}`, func(e error) bool { return errors.Is(e, guardapi.ErrUnauthorized) }},
		{403, `{"error":"forbidden","reason":"controller_unguarded","message":"x"}`, func(e error) bool { return errors.Is(e, guardapi.ErrUnguarded) }},
		{500, `not json`, func(e error) bool {
			ge, ok := guardapi.AsError(e)
			return ok && ge.Status == 500 && ge.Code == "internal_server_error"
		}},
	}
	for _, c := range cases {
		cl := serve(t, func(w http.ResponseWriter, r *http.Request) { answer(w, c.status, c.body) })
		_, err := cl.AppExec(context.Background(), "21", []string{"x"}, "")
		if err == nil || !c.check(err) {
			t.Errorf("%d %s: %v", c.status, c.body, err)
		}
		if strings.Contains(err.Error(), token) {
			t.Error("token in error text")
		}
	}
}

// covers: 02-§5.3 (endpoint-specific mappings: pull failures, upgrade 403)
func TestEndpointSpecificMappings(t *testing.T) {
	cl := serve(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/images/pull":
			answer(w, 403, `{"error":"forbidden","reason":"image_not_allowed","message":"x"}`)
		case "/v1/controller/upgrade":
			answer(w, 403, `{"error":"forbidden","reason":"image_not_guarded","message":"x"}`)
		}
	})
	if err := cl.ImagePull(context.Background(), "caddy:latest"); !errs.Is(err, errs.ImagePullFailed) {
		t.Fatal(err)
	}
	if err := cl.UpgradeController(context.Background(), "ctl:1"); !errs.Is(err, errs.InvalidImage) {
		t.Fatal(err)
	}
	dead, _ := guardapi.New("http://127.0.0.1:1", token)
	err := dead.ImagePull(context.Background(), "x:1")
	if !errs.Is(err, errs.ImagePullFailed) || !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("an unreachable guard during a pull:", err)
	}
}

// covers: 02-§5.4 IT-X09 (timeouts: a stalled guard fails the call, transport errors are ErrUnavailable)
func TestTimeoutsAndTransport(t *testing.T) {
	release := make(chan struct{})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-release
	}))
	defer srv.Close()
	defer close(release)
	tm := guardapi.DefaultTimeouts
	tm.Ready, tm.Normal = 50*time.Millisecond, 50*time.Millisecond
	cl, _ := guardapi.New(srv.URL, token, guardapi.WithTimeouts(tm))
	start := time.Now()
	_, err := cl.AccountState(context.Background(), "21")
	if !errors.Is(err, guardapi.ErrUnavailable) || time.Since(start) > 2*time.Second {
		t.Fatalf("readiness probe: %v after %v", err, time.Since(start))
	}
	if _, err := cl.Subnets(context.Background()); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := cl.Health(ctx); err == nil {
		t.Fatal("a cancelled context")
	}
	bad := serve(t, func(w http.ResponseWriter, r *http.Request) { answer(w, 200, `{"exit_code": "x"}`) })
	if _, err := bad.AppExec(context.Background(), "21", []string{"x"}, ""); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("malformed answer:", err)
	}
	trunc := serve(t, func(w http.ResponseWriter, r *http.Request) { answer(w, 200, `{"exit_co`) })
	if _, err := trunc.Health(context.Background()); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal(err)
	}
}

// covers: 02-§5.4 R20 (streams: idle limit, not total; oversized streams are cut)
func TestStreams(t *testing.T) {
	cl := serve(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/v1/images/file":
			w.Header().Set("Content-Length", "10")
			w.WriteHeader(200)
			w.Write([]byte("0123456789"))
		case "/v1/accounts/21/app/archive":
			if r.Method == http.MethodPut {
				b, _ := io.ReadAll(r.Body)
				if r.ContentLength != int64(len(b)) || r.Header.Get("Content-Type") != "application/x-tar" {
					answer(w, 400, `{"error":"invalid_request","message":"len"}`)
					return
				}
				w.WriteHeader(204)
				return
			}
			w.WriteHeader(200)
			for i := 0; i < 3; i++ {
				w.Write([]byte("chunk"))
				w.(http.Flusher).Flush()
				time.Sleep(30 * time.Millisecond)
			}
		case "/v1/images/load":
			b, _ := io.ReadAll(r.Body)
			if r.Header.Get("Content-Type") != "application/gzip" || int64(len(b)) != r.ContentLength {
				answer(w, 400, `{"error":"invalid_request","message":"ctype"}`)
				return
			}
			answer(w, 200, `{"images": [{"id": "sha256:aa", "tags": ["x:1"]}]}`)
		}
	})
	ctx := context.Background()
	if _, _, err := cl.ImageFile(ctx, "x:1", "/f", 5); err == nil {
		t.Fatal("a file over its limit")
	}
	rc, size, err := cl.ImageFile(ctx, "x:1", "/f", 10)
	if err != nil || size != 10 {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(rc)
	rc.Close()
	if string(b) != "0123456789" {
		t.Fatal(string(b))
	}
	tm := guardapi.DefaultTimeouts
	tm.StreamIdle = 500 * time.Millisecond
	slow, _ := guardapi.New(cl.BaseURL(), token, guardapi.WithTimeouts(tm))
	rc, err = slow.AppArchiveGet(ctx, "21", "/x")
	if err != nil {
		t.Fatal(err)
	}
	b, err = io.ReadAll(rc)
	rc.Close()
	if err != nil || string(b) != "chunkchunkchunk" {
		t.Fatal("a slow stream within the idle limit:", err)
	}
	if err := cl.AppArchivePut(ctx, "21", "/usr/local/bin", strings.NewReader("tarbytes"), 8); err != nil {
		t.Fatal(err)
	}
	var gz bytes.Buffer
	zw := gzip.NewWriter(&gz)
	zw.Write([]byte("archive"))
	zw.Close()
	imgs, err := cl.ImageLoad(ctx, bytes.NewReader(gz.Bytes()), int64(gz.Len()))
	if err != nil || len(imgs) != 1 || imgs[0].Tags[0] != "x:1" {
		t.Fatal(imgs, err)
	}
}

// covers: 02-§5.4 (an idle stream past its limit fails)
func TestStreamIdleTimeout(t *testing.T) {
	hold := make(chan struct{})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
		w.Write([]byte("x"))
		w.(http.Flusher).Flush()
		<-hold
	}))
	defer srv.Close()
	defer close(hold)
	tm := guardapi.DefaultTimeouts
	tm.StreamIdle = 80 * time.Millisecond
	cl, _ := guardapi.New(srv.URL, token, guardapi.WithTimeouts(tm))
	rc, err := cl.AppArchiveGet(context.Background(), "21", "/x")
	if err != nil {
		t.Fatal(err)
	}
	defer rc.Close()
	_, err = io.ReadAll(rc)
	var ne net.Error
	if err == nil || !(errors.As(err, &ne) && ne.Timeout() || errors.Is(err, guardapi.ErrUnavailable)) {
		t.Fatal("idle stream:", err)
	}
}
