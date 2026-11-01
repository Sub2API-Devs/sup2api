package api

import (
	"context"
	"encoding/json"
	"go/ast"
	"go/parser"
	"go/token"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// covers: A1 03§2.2 api, gateway and controller never build Docker request bodies
func TestNoRequestBodiesOutsidePolicy(t *testing.T) {
	banned := []string{"HostConfig", "CapAdd", "Binds", "Privileged", "SecurityOpt"}
	for _, dir := range []string{".", "../gateway", "../controller", "../watch", "../firewall"} {
		entries, err := os.ReadDir(dir)
		if err != nil {
			t.Fatal(err)
		}
		for _, e := range entries {
			name := e.Name()
			if !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
				continue
			}
			fset := token.NewFileSet()
			f, err := parser.ParseFile(fset, filepath.Join(dir, name), nil, 0)
			if err != nil {
				t.Fatal(err)
			}
			ast.Inspect(f, func(n ast.Node) bool {
				switch x := n.(type) {
				case *ast.CompositeLit:
					if sel, ok := x.Type.(*ast.SelectorExpr); ok && sel.Sel.Name == "HostConfig" {
						t.Errorf("%s: HostConfig literal at %v", name, fset.Position(x.Pos()))
					}
					if id, ok := x.Type.(*ast.Ident); ok && id.Name == "HostConfig" {
						t.Errorf("%s: HostConfig literal", name)
					}
				case *ast.KeyValueExpr:
					if id, ok := x.Key.(*ast.Ident); ok {
						for _, b := range banned {
							if id.Name == b {
								t.Errorf("%s: field %s set at %v", name, b, fset.Position(x.Pos()))
							}
						}
					}
				case *ast.BasicLit:
					for _, b := range banned {
						if x.Kind == token.STRING && strings.Contains(x.Value, `"`+b+`"`) {
							t.Errorf("%s: literal %s at %v", name, b, fset.Position(x.Pos()))
						}
					}
				}
				return true
			})
		}
	}
}

// covers: 03§3.11 exactly the 31 endpoints
func TestRouteTable(t *testing.T) {
	h := newHarness(t)
	r := h.srv.Routes()
	if len(r) != 31 {
		t.Fatalf("%d routes: %v", len(r), r)
	}
	seen := map[string]bool{}
	for _, x := range r {
		if seen[x] {
			t.Fatal("duplicate", x)
		}
		seen[x] = true
	}
	for _, removed := range []string{"PUT /v1/gateway", "POST /v1/gateway/start"} {
		if seen[removed] {
			t.Fatal(removed)
		}
	}
}

// covers: A15 03§3.1 semaphore full → 503 busy
func TestBusySemaphore(t *testing.T) {
	h := newHarness(t)
	for i := 0; i < cap(h.srv.sem); i++ {
		h.srv.sem <- struct{}{}
	}
	w := h.do(req{method: "GET", path: "/v1/inventory"})
	if w.Code != 503 || decodeBody(t, w)["error"] != "busy" {
		t.Fatal(w.Code, w.Body.String())
	}
	// Health shares the semaphore but load has its own.
	h.srv.loadSem <- struct{}{}
	w = h.do(req{method: "POST", path: "/v1/images/load", raw: []byte("x"), ctype: "application/x-tar"})
	if w.Code != 503 {
		t.Fatal(w.Code)
	}
}

// covers: A14 03§3.3 per-account lock wait → 503 busy/lock_timeout
func TestLockTimeout(t *testing.T) {
	h := newHarness(t)
	h.srv.LockWait = 50 * time.Millisecond
	unlock, err := h.srv.locks.Lock(context.Background(), "21")
	if err != nil {
		t.Fatal(err)
	}
	defer unlock()
	w := h.do(req{method: "PUT", path: "/v1/accounts/21/volume", body: map[string]any{"size_bytes": 1 << 30}})
	b := decodeBody(t, w)
	if w.Code != 503 || b["error"] != "busy" || b["reason"] != "lock_timeout" {
		t.Fatal(w.Code, b)
	}
	// Another account is not blocked.
	w = h.do(req{method: "PUT", path: "/v1/accounts/22/volume", body: map[string]any{"size_bytes": 1 << 30}})
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body.String())
	}
}

// covers: 03§3.3 error bodies never carry Docker's text
func TestErrorsHideDockerMessages(t *testing.T) {
	h := newHarness(t)
	h.f.FailPaths["GET /containers/json"] = 500
	w := h.do(req{method: "GET", path: "/v1/inventory"})
	if w.Code != 502 || strings.Contains(w.Body.String(), "injected") {
		t.Fatal(w.Code, w.Body.String())
	}
	var b ErrorBody
	_ = json.Unmarshal(w.Body.Bytes(), &b)
	if b.Error != "docker_error" || b.Message == "" {
		t.Fatal(b)
	}
}

// covers: 03§3.4.2 /proc/net/route parsing (network.host_routes)
func TestParseRoutes(t *testing.T) {
	in := "Iface\tDestination\tGateway\tFlags\tRefCnt\tUse\tMetric\tMask\tMTU\tWindow\tIRTT\n" +
		"eth0\t00000000\t0101A8C0\t0003\t0\t0\t0\t00000000\t0\t0\t0\n" +
		"eth0\t0001A8C0\t00000000\t0001\t0\t0\t0\t00FFFFFF\t0\t0\t0\n" +
		"docker0\t000011AC\t00000000\t0001\t0\t0\t0\t0000FFFF\t0\t0\t0\n"
	got, err := ParseRoutes(strings.NewReader(in))
	if err != nil || len(got) != 2 || got[0].String() != "192.168.1.0/24" || got[1].String() != "172.17.0.0/16" {
		t.Fatal(got, err)
	}
	if _, err := ParseRoutes(strings.NewReader("h\neth0\tzz\t0\t0\t0\t0\t0\tzz\n")); err == nil {
		t.Fatal("garbage")
	}
}

// covers: 03§3.3 the request log line has the route template, never bodies or tokens
func TestRequestLog(t *testing.T) {
	h := newHarness(t)
	var buf strings.Builder
	h.srv.Log = newTestLogger(&buf)
	h.do(req{method: "PUT", path: "/v1/accounts/21/resolv", body: map[string]any{"nameserver": "10.0.0.2"}})
	line := buf.String()
	if !strings.Contains(line, `"route":"/v1/accounts/{aid}/resolv"`) || !strings.Contains(line, `"aid":"21"`) ||
		strings.Contains(line, "10.0.0.2") || strings.Contains(line, testToken) {
		t.Fatal(line)
	}
}

var _ = http.MethodGet
