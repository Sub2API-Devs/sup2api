package ccgateway

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"math/big"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

const panelKey = "configured-controller-key"

// tlsPanel starts an HTTPS server (HTTP/2 offered too) and returns its IP,
// port and certificate as PEM (usable as controller_ca).
func tlsPanel(t *testing.T, h http.HandlerFunc) (*httptest.Server, string, int, string) {
	t.Helper()
	srv := httptest.NewUnstartedServer(h)
	srv.EnableHTTP2 = true
	srv.StartTLS()
	t.Cleanup(srv.Close)
	host, port, _ := net.SplitHostPort(srv.Listener.Addr().String())
	p, _ := strconv.Atoi(port)
	return srv, host, p, string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: srv.Certificate().Raw}))
}

func testPanelConfig(host string, port int, ca string) Config {
	return Config{Mode: "controller", Host: host, Port: port, AdminKey: panelKey, ControllerCA: ca, AccountRuntimes: true}
}

// otherCA is a self-signed root unrelated to the certificate every httptest
// TLS server shares.
func otherCA(t *testing.T) string {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	tpl := &x509.Certificate{SerialNumber: big.NewInt(7), Subject: pkix.Name{CommonName: "Other Root"}, NotBefore: time.Now().Add(-time.Hour),
		NotAfter: time.Now().Add(time.Hour), IsCA: true, BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign,
		IPAddresses: []net.IP{net.ParseIP("127.0.0.1")}}
	der, err := x509.CreateCertificate(rand.Reader, tpl, tpl, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	return string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}))
}

func TestControllerModeConfig(t *testing.T) {
	srv, _, _, ca := tlsPanel(t, func(http.ResponseWriter, *http.Request) {})
	other := otherCA(t)
	old := sshConfig
	old.AdminKey = panelKey

	// From SSH by hand: the key must be typed again (the panel is public and
	// the key reaches the accounts); SSH credentials go, the port defaults to 443.
	if _, err := mergeConfig(Config{Mode: "controller", Host: "2001:DB8::1", AccountRuntimes: true}, old); err == nil {
		t.Fatal("ssh -> controller kept the saved key")
	}
	c, err := mergeConfig(Config{Mode: "controller", Host: "2001:DB8::1", AccountRuntimes: true, AdminKey: panelKey, User: "ops", AuthMode: "password", Password: "x", HostKeyFingerprint: old.HostKeyFingerprint}, old)
	if err != nil || c.AdminKey != panelKey || c.Port != 443 || c.Host != "2001:db8::1" || c.ControllerCA != "" ||
		c.User != "" || c.AuthMode != "" || c.Password != "" || c.PrivateKey != "" || c.Passphrase != "" || c.HostKeyFingerprint != "" {
		t.Fatalf("ssh -> controller: %+v %v", c, err)
	}
	withCA, err := mergeConfig(Config{Mode: "controller", Host: "Panel.Example.com", Port: 8443, AccountRuntimes: true, AdminKey: panelKey, ControllerCA: "subject=x\n" + ca}, old)
	if err != nil || withCA.Host != "panel.example.com" || withCA.ControllerCA != ca {
		t.Fatalf("pinned CA: %+v %v", withCA, err)
	}
	sum := sha256.Sum256(srv.Certificate().Raw)
	pub := withCA.Public()
	raw, _ := json.Marshal(pub)
	if pub["has_controller_ca"] != true || pub["controller_ca_fingerprint"] != hex.EncodeToString(sum[:]) || strings.Contains(string(raw), "CERTIFICATE") || strings.Contains(string(raw), panelKey) {
		t.Fatalf("public view: %s", raw)
	}
	if p := c.Public(); p["has_controller_ca"] != false || p["controller_ca_fingerprint"] != "" {
		t.Fatalf("public view without CA: %v", p)
	}
	// Same address: CA and key kept; another host or port: both dropped, so
	// the key must come with the request.
	kept, err := mergeConfig(Config{Mode: "controller", Host: "panel.example.com", Port: 8443, AccountRuntimes: true}, withCA)
	if err != nil || kept.ControllerCA != ca || kept.AdminKey != panelKey {
		t.Fatalf("same address: %+v %v", kept, err)
	}
	for _, moved := range []Config{{Host: "other.example.com", Port: 8443}, {Host: "panel.example.com", Port: 443}} {
		moved.Mode, moved.AccountRuntimes = "controller", true
		if _, err := mergeConfig(moved, withCA); err == nil {
			t.Fatalf("moved %s:%d kept the key", moved.Host, moved.Port)
		}
		moved.AdminKey = panelKey
		got, err := mergeConfig(moved, withCA)
		if err != nil || got.ControllerCA != "" || got.AdminKey != panelKey {
			t.Fatalf("moved %s:%d: %+v %v", moved.Host, moved.Port, got, err)
		}
	}
	if _, err := mergeConfig(Config{Mode: "controller", Host: "panel.example.com", Port: 8443, AccountRuntimes: true, ControllerCA: other}, withCA); err == nil {
		t.Fatal("replaced CA kept the saved key")
	}
	if got, err := mergeConfig(Config{Mode: "controller", Host: "panel.example.com", Port: 8443, AccountRuntimes: true, AdminKey: panelKey, ControllerCA: other}, withCA); err != nil || got.ControllerCA != other {
		t.Fatalf("replaced CA: %v", err)
	}
	if got, err := mergeConfig(Config{Mode: "controller", Host: "panel.example.com", Port: 8443, AccountRuntimes: true, ControllerCA: "\n" + ca}, withCA); err != nil || got.AdminKey != panelKey {
		t.Fatalf("same CA pasted again: %v", err)
	}
	if got, err := mergeConfig(Config{Mode: "controller", Host: "panel.example.com", Port: 8443, AccountRuntimes: true, AdminKey: "new-key"}, withCA); err != nil || got.AdminKey != "new-key" {
		t.Fatalf("new key: %v", err)
	}
	if _, err := mergeConfig(Config{Mode: "controller", Host: "panel.example.com", AccountRuntimes: true}, Config{Mode: "local", AdminKey: "local-key"}); err == nil {
		t.Fatal("local -> controller kept the saved key")
	}

	for name, in := range map[string]Config{
		"no key":          {Mode: "controller", Host: "203.0.113.7", AccountRuntimes: true},
		"runtimes off":    {Mode: "controller", Host: "203.0.113.7", AdminKey: "k"},
		"underscore":      {Mode: "controller", Host: "bad_host.example.com", AccountRuntimes: true, AdminKey: "k"},
		"wildcard":        {Mode: "controller", Host: "*.example.com", AccountRuntimes: true, AdminKey: "k"},
		"single label":    {Mode: "controller", Host: "localhost", AccountRuntimes: true, AdminKey: "k"},
		"brackets":        {Mode: "controller", Host: "[2001:db8::1]", AccountRuntimes: true, AdminKey: "k"},
		"trailing dot":    {Mode: "controller", Host: "example.com.", AccountRuntimes: true, AdminKey: "k"},
		"url":             {Mode: "controller", Host: "https://example.com", AccountRuntimes: true, AdminKey: "k"},
		"empty host":      {Mode: "controller", AccountRuntimes: true, AdminKey: "k"},
		"port":            {Mode: "controller", Host: "example.com", Port: 70000, AccountRuntimes: true, AdminKey: "k"},
		"garbage CA":      {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k", ControllerCA: "not a certificate"},
		"key block":       {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k", ControllerCA: ca + "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n"},
		"bad certificate": {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k", ControllerCA: "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n"},
		"oversized CA":    {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k", ControllerCA: strings.Repeat(ca, maxControllerCA/len(ca)+1)},
		"key with CRLF":   {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k\r\nX: y"},
	} {
		if _, err := mergeConfig(in, Config{Mode: "local"}); err == nil {
			t.Errorf("%s accepted", name)
		}
	}
	// Leaving controller mode drops the pinned CA.
	if got, err := mergeConfig(sshConfig, withCA); err != nil || got.ControllerCA != "" || got.Host != sshConfig.Host {
		t.Fatalf("controller -> ssh: %+v %v", got, err)
	}
	if got, err := mergeConfig(Config{Mode: "local"}, withCA); err != nil || got.ControllerCA != "" || got.Host != "" {
		t.Fatalf("controller -> local: %+v %v", got, err)
	}
	// images.gateway: validated like the others, Caddy by default.
	if got, err := mergeConfig(Config{Mode: "local", Images: &RuntimeImages{Gateway: "caddy:2.8-alpine"}}, Config{}); err != nil || got.EffectiveImages().Gateway != "caddy:2.8-alpine" {
		t.Fatalf("gateway image: %v", err)
	}
	if (Config{}).EffectiveImages().Gateway != GatewayImage || !validImage(GatewayImage) {
		t.Fatal("default gateway image")
	}
	if _, err := mergeConfig(Config{Mode: "local", Images: &RuntimeImages{Gateway: "caddy:$(id)"}}, Config{}); err == nil {
		t.Fatal("invalid gateway image accepted")
	}
}

func TestCaddyfile(t *testing.T) {
	for _, tc := range []struct {
		host  string
		port  int
		email string
		want  string
	}{
		{"panel.example.com", 443, "", "{\n\tadmin off\n\tauto_https disable_redirects\n\tskip_install_trust\n}\n" +
			"panel.example.com:443 {\n\treverse_proxy 127.0.0.1:8787 {\n\t\tflush_interval -1\n\t}\n}\n"},
		{"Panel.Example.com", 8443, "ops+ccg@example.com", "{\n\tadmin off\n\tauto_https disable_redirects\n\tskip_install_trust\n\temail ops+ccg@example.com\n}\n" +
			"panel.example.com:8443 {\n\treverse_proxy 127.0.0.1:8787 {\n\t\tflush_interval -1\n\t}\n}\n"},
		{"203.0.113.7", 8443, "", "{\n\tadmin off\n\tauto_https disable_redirects\n\tskip_install_trust\n\tdefault_sni 203.0.113.7\n}\n" +
			"https://203.0.113.7:8443 {\n\ttls internal\n\treverse_proxy 127.0.0.1:8787 {\n\t\tflush_interval -1\n\t}\n}\n"},
		{"2001:db8::1", 443, "ops@example.com", "{\n\tadmin off\n\tauto_https disable_redirects\n\tskip_install_trust\n\temail ops@example.com\n\tdefault_sni 2001:db8::1\n}\n" +
			"https://[2001:db8::1]:443 {\n\ttls internal\n\treverse_proxy 127.0.0.1:8787 {\n\t\tflush_interval -1\n\t}\n}\n"},
	} {
		got, err := caddyfile(tc.host, tc.port, tc.email)
		if err != nil || got != tc.want {
			t.Errorf("%s:%d %q:\n%s\nwant:\n%s (%v)", tc.host, tc.port, tc.email, got, tc.want, err)
		}
	}
	for _, email := range []string{"a b@example.com", "a{b@example.com", "#a@example.com", `a"b@example.com`, "a`b@example.com", `a\b@example.com`, "<<EOF@example.com", "é@example.com", "a@exa_mple.com", "a@b@example.com", strings.Repeat("a", 65) + "@example.com", "a\x0b@example.com"} {
		if validACMEEmail(email) {
			t.Errorf("email %q accepted", email)
		}
		if _, err := caddyfile("example.com", 443, email); err == nil {
			t.Errorf("caddyfile with email %q", email)
		}
	}
	for _, host := range []string{"bad_host.example.com", "*.example.com", "example.com {", "example.com\n}", ""} {
		if _, err := caddyfile(host, 443, ""); err == nil {
			t.Errorf("host %q accepted", host)
		}
	}
	if _, err := caddyfile("example.com", 0, ""); err == nil {
		t.Error("port 0 accepted")
	}
}

func TestGatewayScripts(t *testing.T) {
	script, err := gatewayScript(GatewayImage)
	if err != nil {
		t.Fatal(err)
	}
	// Everything but the image reference is fixed text.
	again, _ := gatewayScript("gw:1")
	if strings.ReplaceAll(script, GatewayImage, "<GW>") != strings.ReplaceAll(again, "gw:1", "<GW>") {
		t.Fatal("gateway script depends on more than the image reference")
	}
	for _, want := range []string{
		`docker image inspect "$GW" >/dev/null 2>&1 || docker pull -q "$GW"`,
		`cat > "$DIR/Caddyfile.tmp"`,
		`docker run -d --name ccg-gateway --restart unless-stopped --network host`,
		`-v "$DIR/Caddyfile:/etc/caddy/Caddyfile:ro" -v ccg-gateway-data:/data -v ccg-gateway-config:/config`,
		`--log-opt max-size=20m --log-opt max-file=3 "$GW"`,
		"DIR='/opt/ccgateway-gateway'",
	} {
		if !strings.Contains(script, want) {
			t.Errorf("gateway script lacks %q", want)
		}
	}
	if _, err = gatewayScript("caddy:'x'"); err == nil {
		t.Fatal("unsafe gateway image accepted")
	}
	if !strings.Contains(gatewayCAScript, "docker exec ccg-gateway cat /data/caddy/pki/authorities/local/root.crt") {
		t.Fatal("CA script reads another file")
	}
}
