package ccgateway

import (
	"context"
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
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
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
		"underscore":      {Mode: "controller", Host: "bad_host.example.com", AccountRuntimes: true, AdminKey: "k"},
		"wildcard":        {Mode: "controller", Host: "*.example.com", AccountRuntimes: true, AdminKey: "k"},
		"single label":    {Mode: "controller", Host: "localhost", AccountRuntimes: true, AdminKey: "k"},
		"brackets":        {Mode: "controller", Host: "[2001:db8::1]", AccountRuntimes: true, AdminKey: "k"},
		"trailing dot":    {Mode: "controller", Host: "example.com.", AccountRuntimes: true, AdminKey: "k"},
		"url":             {Mode: "controller", Host: "https://example.com", AccountRuntimes: true, AdminKey: "k"},
		"empty host":      {Mode: "controller", AccountRuntimes: true, AdminKey: "k"},
		"port":            {Mode: "controller", Host: "example.com", Port: 70000, AccountRuntimes: true, AdminKey: "k"},
		"scheme":          {Mode: "controller", Scheme: "ftp", Host: "example.com", AccountRuntimes: true, AdminKey: "k"},
		"scheme case":     {Mode: "controller", Scheme: "HTTP", Host: "example.com", AccountRuntimes: true, AdminKey: "k"},
		"garbage CA":      {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k", ControllerCA: "not a certificate"},
		"key block":       {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k", ControllerCA: ca + "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n"},
		"bad certificate": {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k", ControllerCA: "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n"},
		"oversized CA":    {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k", ControllerCA: strings.Repeat(ca, maxControllerCA/len(ca)+1)},
		"key with CRLF":   {Mode: "controller", Host: "example.com", AccountRuntimes: true, AdminKey: "k\r\nX: y"},
		// Legacy modes are never saved again (§53.9), with or without
		// account runtimes; nor is the in-memory local install target.
		"local":          {Mode: "local", AccountRuntimes: true},
		"local shared":   {Mode: "local"},
		"ssh":            sshConfig,
		"ssh shared":     {Mode: "ssh", Host: sshConfig.Host, Port: 22, User: "ops", AuthMode: "password", Password: "x", HostKeyFingerprint: sshConfig.HostKeyFingerprint},
		"no mode":        {AccountRuntimes: true},
		"install target": {Mode: localInstallMode, AccountRuntimes: true, AdminKey: "k"},
	} {
		if _, err := mergeConfig(in, Config{Mode: "disabled"}); err == nil {
			t.Errorf("%s accepted", name)
		}
	}
	// account_runtimes is always saved as true.
	if got, err := mergeConfig(Config{Mode: "controller", Host: "203.0.113.7", AdminKey: "k"}, Config{}); err != nil || !got.AccountRuntimes {
		t.Fatalf("runtimes not forced on: %+v %v", got, err)
	}
	// Leaving controller mode: disabled drops the target and the keys, keeps
	// the target-independent settings.
	withCA.Images = &RuntimeImages{App: "ccgateway:x"}
	got, err := mergeConfig(Config{Mode: "disabled", AccountRuntimes: false}, withCA)
	if err != nil || got.ControllerCA != "" || got.Host != "" || got.Port != 0 || got.AdminKey != "" || got.Scheme != "" || !got.AccountRuntimes ||
		got.Images == nil || got.Images.App != "ccgateway:x" || got.Network == nil || got.RequestPolicy == nil {
		t.Fatalf("controller -> disabled: %+v %v", got, err)
	}
	// images.gateway: validated like the others, Caddy by default.
	if got, err := mergeConfig(Config{Mode: "disabled", Images: &RuntimeImages{Gateway: "caddy:2.8-alpine"}}, Config{}); err != nil || got.EffectiveImages().Gateway != "caddy:2.8-alpine" {
		t.Fatalf("gateway image: %v", err)
	}
	if (Config{}).EffectiveImages().Gateway != GatewayImage || !validImage(GatewayImage) {
		t.Fatal("default gateway image")
	}
	if _, err := mergeConfig(Config{Mode: "disabled", Images: &RuntimeImages{Gateway: "caddy:$(id)"}}, Config{}); err == nil {
		t.Fatal("invalid gateway image accepted")
	}
}

// TestControllerSchemeConfig: plain HTTP panels (§53.9).
func TestControllerSchemeConfig(t *testing.T) {
	_, _, _, ca := tlsPanel(t, func(http.ResponseWriter, *http.Request) {})
	https, err := mergeConfig(Config{Mode: "controller", Host: "10.0.0.5", Port: 18443, AdminKey: panelKey, ControllerCA: ca}, Config{})
	if err != nil || https.Scheme != "https" || https.Public()["scheme"] != "https" {
		t.Fatalf("default scheme: %+v %v", https, err)
	}
	// HTTP: no pinned certificate, port 80 by default, and the scheme is part
	// of the endpoint the key is kept for.
	if _, err := mergeConfig(Config{Mode: "controller", Scheme: "http", Host: "10.0.0.5", Port: 18443}, https); err == nil {
		t.Fatal("https -> http kept the saved key")
	}
	plain, err := mergeConfig(Config{Mode: "controller", Scheme: "http", Host: "10.0.0.5", Port: 18443, AdminKey: panelKey, ControllerCA: ca}, https)
	if err != nil || plain.Scheme != "http" || plain.ControllerCA != "" || plain.Public()["scheme"] != "http" || plain.Public()["has_controller_ca"] != false {
		t.Fatalf("http: %+v %v", plain, err)
	}
	if got, err := mergeConfig(Config{Mode: "controller", Scheme: "http", Host: "10.0.0.5", AdminKey: panelKey}, Config{}); err != nil || got.Port != 80 {
		t.Fatalf("http default port: %+v %v", got, err)
	}
	kept, err := mergeConfig(Config{Mode: "controller", Scheme: "http", Host: "10.0.0.5", Port: 18443}, plain)
	if err != nil || kept.AdminKey != panelKey || kept.Scheme != "http" {
		t.Fatalf("same http endpoint: %+v %v", kept, err)
	}
	if _, err := mergeConfig(Config{Mode: "controller", Host: "10.0.0.5", Port: 18443}, plain); err == nil {
		t.Fatal("http -> https kept the saved key")
	}
	// A controller saved before §53.9 (no scheme) is HTTPS.
	old := Config{Mode: "controller", Host: "10.0.0.5", Port: 18443, AdminKey: panelKey, AccountRuntimes: true}
	if got, err := mergeConfig(Config{Mode: "controller", Scheme: "https", Host: "10.0.0.5", Port: 18443}, old); err != nil || got.AdminKey != panelKey {
		t.Fatalf("legacy https: %+v %v", got, err)
	}
	if old.Public()["scheme"] != "https" {
		t.Fatal("legacy scheme")
	}
	if validateControllerConfig(Config{Mode: "controller", Scheme: "http", Host: "10.0.0.5", Port: 1, AdminKey: "k", AccountRuntimes: true, ControllerCA: ca}) == nil {
		t.Fatal("http with a pinned CA validated")
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

func TestCaddyfileHTTP(t *testing.T) {
	got, err := caddyfileHTTP(18080)
	want := "{\n\tadmin off\n\tauto_https off\n}\nhttp://:18080 {\n\treverse_proxy 127.0.0.1:8787 {\n\t\tflush_interval -1\n\t}\n}\n"
	if err != nil || got != want {
		t.Fatalf("%q %v", got, err)
	}
	for _, port := range []int{0, -1, 65536} {
		if _, err := caddyfileHTTP(port); err == nil {
			t.Errorf("port %d accepted", port)
		}
	}
}

// TestPortScript runs the real port script with a fake docker (a shell
// function) and fake /proc/net/tcp{,6} files.
func TestPortScript(t *testing.T) {
	dir := filepath.ToSlash(t.TempDir())
	listen := func(hexPort string, v6 bool) string {
		if v6 {
			return "   0: 00000000000000000000000000000000:" + hexPort + " 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 1 1\n"
		}
		return "   0: 00000000:" + hexPort + " 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 1 1\n"
	}
	header := "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode\n"
	// 8787 and 18443 (IPv4), 18444 (IPv6, lowercase hex); 18445 only as
	// an established connection.
	tcp := header + listen("2253", false) + listen("480B", false) +
		"   2: 0100007F:480D 0100007F:A000 01 00000000:00000000 00:00000000 00000000     0        0 1 1\n"
	tcp6 := header + listen("480c", true)
	full := header
	for p := httpPortStart; p < httpPortStart+portRange; p++ {
		full += listen(strings.ToUpper(strconv.FormatInt(int64(p), 16)), false)
	}
	write := func(name, content string) {
		if err := os.WriteFile(dir+"/"+name, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("tcp", tcp)
	write("tcp6", tcp6)
	write("full", full)
	// ACME: 80 and 443 both listening (IPv4, or 80 on IPv4 and 443 on IPv6)
	// / only 80 / only 443.
	for _, name := range []string{"full", "acme", "only80", "only443"} {
		write(name+"6", header)
	}
	write("acme", header+listen("0050", false)+listen("01BB", false))
	write("mixed", header+listen("0050", false))
	write("mixed6", header+listen("01bb", true))
	write("only80", header+listen("0050", false))
	write("only443", header+listen("01BB", false))
	run := func(procTCP, dockerInfo, gateway, stdin string) (string, int) {
		t.Helper()
		escaped := strings.NewReplacer("\n", `\n`, "\t", `\t`).Replace(gateway)
		running := "false"
		if gateway != "" {
			running = "true"
		}
		fake := "docker() {\n  case \"$1\" in\n    info) return " + dockerInfo + " ;;\n    inspect) echo " + running + " ;;\n    exec) printf '" + escaped + "' ;;\n  esac\n}\n"
		script := fake + strings.ReplaceAll(portScript, "/proc/net/tcp", dir+"/"+procTCP)
		res, err := remotedocker.RunLocalScript(context.Background(), script, []byte(stdin), 30*time.Second)
		if err != nil {
			t.Fatal(err)
		}
		return res.Output, res.ExitStatus
	}
	ipGateway, _ := caddyfile("203.0.113.7", 18443, "")
	domainGateway, _ := caddyfile("panel.example.com", 18443, "ops@example.com")
	v6Gateway, _ := caddyfile("2001:db8::1", 18443, "")
	httpGateway, _ := caddyfileHTTP(18444)
	for _, tc := range []struct {
		name, proc, info, gateway, stdin, want string
		exit                                   int
	}{
		{"automatic", "tcp", "0", "", "0 18443 0\n", "CCG_PORT=18445\nCCG_RESULT=ok\n", 0},
		{"wanted free", "tcp", "0", "", "18446 18443 0\n", "CCG_PORT=18446\nCCG_RESULT=ok\n", 0},
		{"wanted in use", "tcp", "0", "", "18443 18443 0\n", "CCG_RESULT=port_in_use\n", 1},
		{"wanted in use (IPv6)", "tcp", "0", "", "18444 18443 0\n", "CCG_RESULT=port_in_use\n", 1},
		{"controller port", "tcp", "0", "", "8787 18443 0\n", "CCG_RESULT=port_in_use\n", 1},
		{"own gateway (IP)", "tcp", "0", ipGateway, "18443 18443 0\n", "CCG_PORT=18443\nCCG_RESULT=ok\n", 0},
		{"own gateway (domain)", "tcp", "0", domainGateway, "18443 18443 1\n", "CCG_PORT=18443\nCCG_RESULT=ok\n", 0},
		{"own gateway (IPv6)", "tcp", "0", v6Gateway, "0 18443 0\n", "CCG_PORT=18443\nCCG_RESULT=ok\n", 0},
		{"own gateway (http)", "tcp", "0", httpGateway, "18443 18443 0\n", "CCG_RESULT=port_in_use\n", 1},
		{"own gateway (http) is free", "tcp", "0", httpGateway, "18444 18443 0\n", "CCG_PORT=18444\nCCG_RESULT=ok\n", 0},
		{"range used up", "full", "0", "", "0 18080 0\n", "CCG_RESULT=no_free_port\n", 1},
		// Domains over HTTPS: port 80 or 443 must be free for ACME.
		{"acme ports taken", "acme", "0", "", "0 18443 1\n", "CCG_RESULT=acme_ports_unavailable\n", 1},
		{"acme ports taken (IPv6)", "mixed", "0", "", "18450 18443 1\n", "CCG_RESULT=acme_ports_unavailable\n", 1},
		{"acme ports taken, IP", "acme", "0", "", "0 18443 0\n", "CCG_PORT=18443\nCCG_RESULT=ok\n", 0},
		{"acme 443 free", "only80", "0", "", "0 18443 1\n", "CCG_PORT=18443\nCCG_RESULT=ok\n", 0},
		{"acme 80 free", "only443", "0", "", "0 18443 1\n", "CCG_PORT=18443\nCCG_RESULT=ok\n", 0},
		{"acme on 443 itself", "only80", "0", "", "443 18443 1\n", "CCG_PORT=443\nCCG_RESULT=ok\n", 0},
		{"acme ports of the own domain gateway", "acme", "0", "panel.example.com:443 {\n", "0 18443 1\n", "CCG_PORT=18443\nCCG_RESULT=ok\n", 0},
		{"acme 80 of the own domain gateway", "acme", "0", domainGateway, "0 18443 1\n", "CCG_PORT=18443\nCCG_RESULT=ok\n", 0},
		{"acme ports of the own IP gateway", "acme", "0", ipGateway, "0 18443 1\n", "CCG_RESULT=acme_ports_unavailable\n", 1},
		{"docker not running", "tcp", "1", "", "0 18443 0\n", "CCG_RESULT=docker_not_running\n", 1},
		{"bad input", "tcp", "0", "", "x 18443 0\n", "CCG_RESULT=install_failed\n", 1},
		{"bad acme flag", "tcp", "0", "", "0 18443 2\n", "CCG_RESULT=install_failed\n", 1},
		{"no input", "tcp", "0", "", "", "CCG_RESULT=install_failed\n", 1},
		{"no proc", "missing", "0", "", "0 18443 0\n", "CCG_RESULT=install_failed\n", 1},
	} {
		if out, exit := run(tc.proc, tc.info, tc.gateway, tc.stdin); out != tc.want || exit != tc.exit {
			t.Errorf("%s: %q exit %d", tc.name, out, exit)
		}
	}
	// The script is fixed text: the port and the range start come on stdin.
	if strings.Contains(portScript, "18443") || strings.Contains(portScript, "18080") || !strings.Contains(portScript, "read -r WANT START ACME") {
		t.Fatal("port script embeds input")
	}
}

// TestLegacyConfigSave: a saved ssh / local configuration can still save
// its other settings while mode and target stay the same; switching to a
// legacy mode or target is refused (§53.9).
func TestLegacyConfigSave(t *testing.T) {
	oldSSH := sshConfig
	oldSSH.AccountRuntimes, oldSSH.AdminKey, oldSSH.APIKey = false, "admin-k", "api-k"
	policy := Config{}.EffectiveRequestPolicy()
	policy.PassUpstreamErrors = true
	same := Config{Mode: "ssh", Host: oldSSH.Host, User: oldSSH.User, AuthMode: oldSSH.AuthMode, HostKeyFingerprint: oldSSH.HostKeyFingerprint,
		Network: &RuntimeNetwork{Pool: "10.80.0.0/16", Allocation: "sequential"}, RequestPolicy: &policy, Images: &RuntimeImages{App: "ccgateway:x"}}
	got, err := mergeConfig(same, oldSSH)
	if err != nil || got.Mode != "ssh" || got.Port != 22 || got.Password != "ssh-secret" || got.AdminKey != "admin-k" || got.APIKey != "api-k" || !got.AccountRuntimes ||
		got.Network.Pool != "10.80.0.0/16" || !got.RequestPolicy.PassUpstreamErrors || got.Images.App != "ccgateway:x" {
		t.Fatalf("same ssh target: %+v %v", got, err)
	}
	typed := same
	typed.Password = "new-secret"
	if got, err := mergeConfig(typed, oldSSH); err != nil || got.Password != "new-secret" {
		t.Fatalf("typed password: %+v %v", got, err)
	}
	for name, change := range map[string]func(*Config){
		"host":        func(c *Config) { c.Host = "other.example" },
		"port":        func(c *Config) { c.Port = 2222 },
		"user":        func(c *Config) { c.User = "root" },
		"auth mode":   func(c *Config) { c.AuthMode = "private_key" },
		"fingerprint": func(c *Config) { c.HostKeyFingerprint = "SHA256:" + strings.Repeat("C", 43) },
		"to local":    func(c *Config) { *c = Config{Mode: "local"} },
	} {
		moved := same
		change(&moved)
		if _, err := mergeConfig(moved, oldSSH); err == nil {
			t.Errorf("ssh %s change saved", name)
		}
	}
	oldLocal := Config{Mode: "local", AdminKey: "admin-k", APIKey: "api-k"}
	if got, err := mergeConfig(Config{Mode: "local", RequestPolicy: &policy}, oldLocal); err != nil || got.Mode != "local" || got.AdminKey != "admin-k" || got.Host != "" || !got.AccountRuntimes {
		t.Fatalf("same local: %+v %v", got, err)
	}
	if _, err := mergeConfig(same, oldLocal); err == nil {
		t.Fatal("local -> ssh saved")
	}
	for _, old := range []Config{{Mode: "disabled"}, testPanelConfig("203.0.113.7", 443, "")} {
		if _, err := mergeConfig(Config{Mode: "local"}, old); err == nil {
			t.Fatalf("%s -> local saved", old.Mode)
		}
		if _, err := mergeConfig(sshConfig, old); err == nil {
			t.Fatalf("%s -> ssh saved", old.Mode)
		}
	}
}

func TestControllerBasePathConfig(t *testing.T) {
	for in, want := range map[string]string{"": "", "/": "", "/controller": "/controller", "/controller/": "/controller", "/a/b.c/d~e_f-g": "/a/b.c/d~e_f-g",
		"/1/2/3/4/5/6/7/8": "/1/2/3/4/5/6/7/8", "/" + strings.Repeat("a", 255): "/" + strings.Repeat("a", 255)} {
		if got, ok := normalizeBasePath(in); !ok || got != want {
			t.Errorf("%q: %q %v", in, got, ok)
		}
	}
	for _, in := range []string{"controller", "/a/../b", "/..", "/.", "/a/./b", "/a?x=1", "/a#f", "/a b", "/a%2fb", "//a", "/a//b", "/1/2/3/4/5/6/7/8/9",
		"/" + strings.Repeat("a", 256), "/ä", "/a\b", "/a;b"} {
		if got, ok := normalizeBasePath(in); ok {
			t.Errorf("%q accepted as %q", in, got)
		}
	}
	old, err := mergeConfig(Config{Mode: "controller", Host: "15.204.107.38", Port: 18443, BasePath: "/controller/", AdminKey: panelKey}, Config{})
	if err != nil || old.BasePath != "/controller" || old.Public()["base_path"] != "/controller" {
		t.Fatalf("base path: %+v %v", old, err)
	}
	if got, err := mergeConfig(Config{Mode: "controller", Host: "15.204.107.38", Port: 18443, BasePath: "/controller"}, old); err != nil || got.AdminKey != panelKey {
		t.Fatalf("same base path: %v", err)
	}
	for _, p := range []string{"", "/other"} {
		if _, err := mergeConfig(Config{Mode: "controller", Host: "15.204.107.38", Port: 18443, BasePath: p}, old); err == nil {
			t.Errorf("base path %q kept the saved key", p)
		}
		if got, err := mergeConfig(Config{Mode: "controller", Host: "15.204.107.38", Port: 18443, BasePath: p, AdminKey: "new"}, old); err != nil || got.BasePath != p {
			t.Errorf("base path %q: %v", p, err)
		}
	}
	if _, err := mergeConfig(Config{Mode: "controller", Host: "15.204.107.38", BasePath: "/a/../b", AdminKey: "k"}, Config{}); err == nil {
		t.Fatal("invalid base path saved")
	}
	// Port omitted: the scheme's default.
	if got, _ := mergeConfig(Config{Mode: "controller", Host: "15.204.107.38", BasePath: "/controller", AdminKey: "k"}, Config{}); got.Port != 443 {
		t.Fatalf("default port %d", got.Port)
	}
	if got, _ := mergeConfig(Config{Mode: "disabled"}, old); got.BasePath != "" {
		t.Fatal("disabled kept the base path")
	}
}
