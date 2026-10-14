package proxy

import (
	"context"
	"encoding/base64"
	"strconv"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestProbeCandidates(t *testing.T) {
	protocols := func(specs []Spec) string {
		var out []string
		for _, s := range specs {
			out = append(out, s.Protocol)
		}
		return strings.Join(out, ",")
	}
	// A scheme is kept as given; the long-username form of some providers parses.
	specs, err := probeCandidates("https://erio___accel.ipflygates.com___5001___gXJTnq2rsQhI2i:FgIkcAOi@host.clicodeplus.com:8443")
	if err != nil || protocols(specs) != "https" {
		t.Fatalf("url: %v %v", specs, err)
	}
	if s := specs[0]; s.Host != "host.clicodeplus.com" || s.Port != 8443 || s.Username != "erio___accel.ipflygates.com___5001___gXJTnq2rsQhI2i" || s.Password != "FgIkcAOi" {
		t.Fatalf("url spec: %+v", s)
	}
	// Without a scheme: socks5, then http, then https.
	for raw, want := range map[string][3]string{
		"1.2.3.4:5001:user:p:ss":                                {"1.2.3.4", "user", "p:ss"},
		"user:pa@ss@proxy.example.com:5001":                     {"proxy.example.com", "user", "pa@ss"},
		" proxy.example.com:5001 ":                              {"proxy.example.com", "", ""},
		"proxy.example.com:5001:erio___a.example___5001___x:pw": {"proxy.example.com", "erio___a.example___5001___x", "pw"},
	} {
		specs, err := probeCandidates(raw)
		if err != nil || protocols(specs) != "socks5,http,https" {
			t.Fatalf("%q: %v %v", raw, specs, err)
		}
		for _, s := range specs {
			if s.Host != want[0] || s.Port != 5001 || s.Username != want[1] || s.Password != want[2] {
				t.Fatalf("%q: %+v", raw, s)
			}
		}
	}
	for _, raw := range []string{"", "host", "host:1:user", "ftp://host:1", "host:0:u:p", "host:x:u:p", "a:b@host"} {
		if _, err := probeCandidates(raw); err == nil {
			t.Fatalf("%q accepted", raw)
		}
	}
}

// POST /proxies/probe finds the protocol of a schemeless proxy (the HTTP
// forward proxy answers neither SOCKS5 nor TLS), saves nothing by default and
// finds or creates the proxy with save.
func TestProbeEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	svc := New(db, testCipher(t), nil, Options{ProbeURL: "http://probe.example.invalid/generate_204", AllowPrivate: true})
	engine := gin.New()
	svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{}))
	admin := addUser(t, db, "probe@x.com")
	fp, auth, _ := forwardProxy(t)
	hostport := strings.TrimPrefix(fp.URL, "http://")

	code, out := do(t, engine, admin, "POST", "/proxies/probe", map[string]any{"proxy_url": hostport + ":bob:s3cret"})
	res := data(out)
	if code != 200 || res["ok"] != true || res["protocol"] != "http" || res["proxy_url"] != "http://bob:s3cret@"+hostport {
		t.Fatalf("probe: %d %v", code, out)
	}
	if attempts := res["attempts"].([]any); len(attempts) != 3 || attempts[0].(map[string]any)["ok"] != false || attempts[1].(map[string]any)["ok"] != true {
		t.Fatalf("attempts: %v", attempts)
	}
	if auth.Load() != "Basic "+base64.StdEncoding.EncodeToString([]byte("bob:s3cret")) {
		t.Fatalf("proxy auth %q", auth.Load())
	}
	var n int
	_ = db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM proxies`).Scan(&n)
	if n != 0 || res["proxy_id"] != nil {
		t.Fatalf("probe without save stored a proxy: %d %v", n, res)
	}

	// save: created once, then found.
	var ids []string
	for i, created := range []bool{true, false} {
		code, out = do(t, engine, admin, "POST", "/proxies/probe", map[string]any{"proxy_url": "http://bob:s3cret@" + hostport, "save": true})
		res = data(out)
		if code != 200 || res["ok"] != true || res["proxy_created"] != created || res["proxy_id"] == nil {
			t.Fatalf("save %d: %d %v", i, code, out)
		}
		ids = append(ids, strconv.FormatFloat(res["proxy_id"].(float64), 'f', 0, 64))
	}
	if ids[0] != ids[1] {
		t.Fatalf("save created a duplicate: %v", ids)
	}

	// Nothing answers: 200 ok=false with every attempt, nothing saved.
	fp.Close()
	code, out = do(t, engine, admin, "POST", "/proxies/probe", map[string]any{"proxy_url": hostport, "save": true})
	res = data(out)
	if code != 200 || res["ok"] != false || len(res["attempts"].([]any)) != 3 || res["proxy_id"] != nil {
		t.Fatalf("dead proxy: %d %v", code, out)
	}
	if code, _ = do(t, engine, admin, "POST", "/proxies/probe", map[string]any{"proxy_url": "not a proxy"}); code != 400 {
		t.Fatalf("invalid input: %d", code)
	}
}

// Without AllowPrivate a private address needs proxy:manage.
func TestProbePrivateAddress(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	svc := New(db, testCipher(t), nil, Options{ProbeURL: "http://probe.example.invalid/generate_204"})
	engine := gin.New()
	own := addUser(t, db, "own-probe@x.com")
	svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{keys: map[int64][]string{own: {"proxy:own:manage", "proxy:own:read"}}}))
	if code, out := do(t, engine, own, "POST", "/proxies/probe", map[string]any{"proxy_url": "127.0.0.1:9:u:p"}); code != 403 {
		t.Fatalf("private probe: %d %v", code, out)
	}
}
