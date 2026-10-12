package engine

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"io"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func resourceTestRunner(t *testing.T, handler http.HandlerFunc) *Runner {
	t.Helper()
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	up := httptest.NewServer(handler)
	t.Cleanup(up.Close)
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if v := os.Getenv(key); v != "" {
			base = append(base, key+"="+v)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-resource-fixture", "ANTHROPIC_BASE_URL": up.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1"})
	return &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
}

// x509 fallback roots are process-global and cannot be restored. Run each
// management integration in its own test subprocess so installing a fixture CA
// cannot change any native/model fixture's trust store. This is the same test
// binary and real CLI, not a substitute implementation or a skipped test.
func resourceManagedTestProcess(t *testing.T) bool {
	t.Helper()
	if os.Getenv("CCG_RESOURCE_MANAGEMENT_TEST_CHILD") == "1" || os.Getenv("CCG_REAL_CLI") == "" {
		return true
	}
	executable, err := os.Executable()
	require.NoError(t, err)
	ctx, cancel := context.WithTimeout(t.Context(), 2*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, executable, "-test.run=^"+regexp.QuoteMeta(t.Name())+"$", "-test.v", "-test.timeout=90s")
	cmd.Env = envWith(os.Environ(), map[string]string{"CCG_RESOURCE_MANAGEMENT_TEST_CHILD": "1", "GODEBUG": os.Getenv("GODEBUG") + ",x509usefallbackroots=1"})
	output, err := cmd.CombinedOutput()
	t.Log(string(output))
	require.NoError(t, err, "isolated management integration failed")
	return false
}

// The shared native/model runner above intentionally retains its HTTP server.
var resourceFixtureCertificate = sync.OnceValues(func() (tls.Certificate, error) {
	public, private, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return tls.Certificate{}, err
	}
	certificate := &x509.Certificate{SerialNumber: big.NewInt(1), DNSNames: []string{"api.anthropic.com"}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(24 * time.Hour), IsCA: true, BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign | x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}}
	raw, err := x509.CreateCertificate(rand.Reader, certificate, certificate, public, private)
	if err != nil {
		return tls.Certificate{}, err
	}
	parsed, err := x509.ParseCertificate(raw)
	if err != nil {
		return tls.Certificate{}, err
	}
	roots := x509.NewCertPool()
	roots.AddCert(parsed)
	x509.SetFallbackRoots(roots)
	return tls.Certificate{Certificate: [][]byte{raw}, PrivateKey: private}, nil
})

// Real auth status plus production TLS, proxy, credential binding and HTTP.
// The CONNECT fixture has exactly one destination, a local TLS resource server;
// it cannot reach the public provider or accept a model request silently.
func resourceManagedTestRunner(t *testing.T, handler http.HandlerFunc) *Runner {
	t.Helper()
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		t.Errorf("management escaped to native fixture: %s %s", r.Method, r.URL.Path)
		w.WriteHeader(http.StatusBadRequest)
	})
	require.Equal(t, "1", os.Getenv("CCG_RESOURCE_MANAGEMENT_TEST_CHILD"), "fixture CA requires an isolated test process")
	certificate, err := resourceFixtureCertificate()
	require.NoError(t, err)
	up := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.NotNil(t, r.TLS)
		assert.Equal(t, "api.anthropic.com", r.Host)
		if r.URL.Path == "/v1/messages" || r.URL.Path == "/v1/messages/count_tokens" {
			t.Errorf("resource operation attempted model IO: %s", r.URL.Path)
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		handler(w, r)
	}))
	up.TLS = &tls.Config{Certificates: []tls.Certificate{certificate}, MinVersion: tls.VersionTLS12}
	up.StartTLS()
	t.Cleanup(up.Close)
	var tunnels sync.Map
	proxy := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodConnect || r.Host != "api.anthropic.com:443" {
			t.Errorf("unexpected management proxy destination: %s %s", r.Method, r.Host)
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		upstream, err := net.DialTimeout("tcp", up.Listener.Addr().String(), 5*time.Second)
		if !assert.NoError(t, err) {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		defer upstream.Close()
		conn, buffer, err := w.(http.Hijacker).Hijack()
		if !assert.NoError(t, err) {
			return
		}
		defer conn.Close()
		tunnels.Store(conn, conn)
		defer tunnels.Delete(conn)
		_, err = buffer.WriteString("HTTP/1.1 200 Connection Established\r\n\r\n")
		if !assert.NoError(t, err) || !assert.NoError(t, buffer.Flush()) {
			return
		}
		go func() { _, _ = io.Copy(upstream, buffer); _ = upstream.Close() }()
		_, _ = io.Copy(conn, upstream)
	}))
	t.Cleanup(func() {
		proxy.Close()
		tunnels.Range(func(_, value any) bool { _ = value.(net.Conn).Close(); return true })
	})
	runner.Env = envWith(runner.Env, map[string]string{"ANTHROPIC_BASE_URL": "https://api.anthropic.com", "HTTPS_PROXY": proxy.URL, "HTTP_PROXY": proxy.URL, "CLAUDE_SECURESTORAGE_CONFIG_DIR": resourceEnv(runner.Env, "CLAUDE_CONFIG_DIR"), "CCG_RESOURCE_ISSUER_ID": "managed-resource-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1"})
	return runner
}

func resourceManagedTestBroker(t *testing.T, runner *Runner) *resourceBroker {
	t.Helper()
	g := &Gateway{Runner: runner, Key: "worker-fixture", Slots: make(chan struct{}, 1)}
	broker, err := newResourceBroker(g, &authManager{}, t.TempDir())
	require.NoError(t, err)
	g.resources = broker
	t.Cleanup(func() { require.NoError(t, broker.lease.Close()) })
	return broker
}

func assertResourceSpoolReleased(t *testing.T, dir string, budget *resourceSpoolBudget) {
	t.Helper()
	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	assert.Empty(t, entries, "resource spool files leaked")
	assert.Zero(t, budget.used, "resource spool reservation leaked")
}

func TestRealCLIResourceCarrierNeverGenerates(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	for _, tc := range []struct{ method, path string }{
		{"GET", "/v1/files"}, {"GET", "/v1/files/file_fixture/content"},
		{"POST", "/v1/files"}, {"DELETE", "/v1/files/file_fixture"},
		{"POST", "/v1/skills"}, {"POST", "/v1/skills/skill_fixture/versions"},
	} {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			var calls atomic.Int32
			payload := []byte("\x1f\x8b\x00binary\xffresource")
			requestBody := []byte("--fixture\r\nContent-Disposition: form-data; name=\"file\"; filename=\"hello.bin\"\r\n\r\nhello\x00\xff\r\n--fixture--\r\n")
			runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				assert.Equal(t, tc.path, r.URL.Path)
				assert.Equal(t, tc.method, r.Method)
				assert.Equal(t, "dummy-resource-fixture", r.Header.Get("X-Api-Key"))
				assert.Empty(t, r.Header.Get("Authorization"))
				assert.Equal(t, "fixture-version-to-preserve", r.Header.Get("Anthropic-Version"))
				assert.Equal(t, "fixture-product-beta", r.Header.Get("Anthropic-Beta"))
				assert.Equal(t, "identity", r.Header.Get("Accept-Encoding"))
				body, err := io.ReadAll(r.Body)
				assert.NoError(t, err)
				if tc.method == "POST" {
					assert.Equal(t, requestBody, body)
					assert.Equal(t, int64(len(requestBody)), r.ContentLength)
					assert.Equal(t, "multipart/form-data; boundary=fixture", r.Header.Get("Content-Type"))
				} else {
					assert.Empty(t, body, "model request body leaked")
				}
				w.Header().Set("Content-Type", "application/octet-stream")
				w.Header().Set("Content-Encoding", "gzip")
				w.Header().Set("Request-Id", "request_resource_test")
				w.Header().Set("Set-Cookie", "do-not-copy")
				_, err = w.Write(payload)
				assert.NoError(t, err)
			})
			broker := resourceManagedTestBroker(t, runner)
			ctx, cancel := context.WithTimeout(t.Context(), 20*time.Second)
			defer cancel()
			ctx = withResourceAuthorization(ctx)
			id, err := broker.identity(ctx)
			require.NoError(t, err)
			assert.Equal(t, "api_key", id.AuthType)
			assert.Zero(t, calls.Load(), "API key identity must not call a model or profile")
			incoming := httptest.NewRequest(tc.method, resourcePrefix+tc.path, nil)
			incoming.Header.Set("Anthropic-Version", "fixture-version-to-preserve")
			incoming.Header.Set("Anthropic-Beta", "fixture-product-beta")
			if tc.method == "POST" {
				incoming.Header.Set("Content-Type", "multipart/form-data; boundary=fixture")
			}
			route, err := parseResourceRoute(incoming)
			require.NoError(t, err)
			op := &resourceExchange{route: route, dir: broker.dir, limit: broker.limit, budget: broker.budget}
			if tc.method == "POST" {
				op.input, err = spoolResource(ctx, op.dir, io.NopCloser(bytes.NewReader(requestBody)), int64(len(requestBody)), op.limit, op.budget)
				require.NoError(t, err)
				defer op.input.Close()
			}
			resp, err := runner.runResource(ctx, op)
			require.NoError(t, err)
			defer resp.body.Close()
			got, err := io.ReadAll(resp.body)
			require.NoError(t, err)
			assert.Equal(t, payload, got)
			assert.Equal(t, 200, resp.status)
			assert.Equal(t, int32(1), calls.Load())
			assert.Equal(t, "gzip", resp.header.Get("Content-Encoding"))
			assert.Empty(t, resp.header.Get("Set-Cookie"))
			assert.Equal(t, "request_resource_test", resp.header.Get("Request-Id"))
			assert.True(t, op.completed())
			_, err = runner.runResource(ctx, op)
			require.ErrorContains(t, err, "already consumed")
			assert.Equal(t, int32(1), calls.Load(), "consumed exchange was dispatched twice")
			require.NoError(t, resp.body.Close())
			if op.input != nil {
				require.NoError(t, op.input.Close())
			}
			assertResourceSpoolReleased(t, op.dir, op.budget)
		})
	}
}
