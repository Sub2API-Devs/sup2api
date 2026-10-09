package ccgateway

import (
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"net"
	"regexp"
	"strconv"
	"strings"
)

// Control panel mode (CONTRACTS §53): the core reaches the controller
// through a Caddy HTTPS gateway on the Docker host instead of SSH.

const maxControllerCA = 64 << 10

var (
	dnsNamePattern   = regexp.MustCompile(`^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$`)
	acmeEmailPattern = regexp.MustCompile(`^[^@\s]{1,64}@[A-Za-z0-9.-]{1,190}$`)
)

// validControllerHost accepts an IP literal (IPv6 without brackets) or a DNS
// name; no underscores, wildcards or single labels.
func validControllerHost(host string) bool {
	if net.ParseIP(host) != nil {
		return true
	}
	return len(host) >= 1 && len(host) <= 253 && dnsNamePattern.MatchString(host)
}

// normalizeControllerHost writes IPs canonically and names in lowercase, the
// form http.Transport dials.
func normalizeControllerHost(host string) string {
	if ip := net.ParseIP(host); ip != nil {
		return ip.String()
	}
	return strings.ToLower(host)
}

// validACMEEmail is the contract pattern plus a ban on characters the
// Caddyfile lexer treats specially (quotes, braces, comments, escapes,
// heredocs) and on anything outside printable ASCII.
func validACMEEmail(email string) bool {
	if !acmeEmailPattern.MatchString(email) {
		return false
	}
	for _, r := range email {
		if r <= 0x20 || r >= 0x7f || strings.ContainsRune("\"`{}#\\<>", r) {
			return false
		}
	}
	return true
}

// controllerCerts parses the pinned root certificates: every PEM block must
// be a parseable CERTIFICATE, and there must be at least one.
func controllerCerts(text string) ([]*x509.Certificate, error) {
	if len(text) > maxControllerCA {
		return nil, errors.New("controller certificate too large")
	}
	var certs []*x509.Certificate
	rest := []byte(text)
	for {
		var block *pem.Block
		block, rest = pem.Decode(rest)
		if block == nil {
			break
		}
		if block.Type != "CERTIFICATE" {
			return nil, errors.New("controller certificate PEM holds a non-certificate block")
		}
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			return nil, errors.New("invalid controller certificate")
		}
		certs = append(certs, cert)
	}
	if len(certs) == 0 {
		return nil, errors.New("no controller certificate")
	}
	return certs, nil
}

// parseControllerCA returns the certificates re-encoded as PEM and the
// SHA-256 of the first one's DER (lowercase hex); "" is no pinned CA.
func parseControllerCA(text string) (string, string, error) {
	if text == "" {
		return "", "", nil
	}
	certs, err := controllerCerts(text)
	if err != nil {
		return "", "", err
	}
	var b strings.Builder
	for _, cert := range certs {
		b.Write(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: cert.Raw}))
	}
	sum := sha256.Sum256(certs[0].Raw)
	return b.String(), hex.EncodeToString(sum[:]), nil
}

// validateControllerConfig checks a merged controller-mode configuration.
func validateControllerConfig(c Config) error {
	if !c.AccountRuntimes {
		return errors.New("control panel mode requires account runtimes")
	}
	if !validControllerHost(c.Host) || c.Host != normalizeControllerHost(c.Host) {
		return errors.New("invalid control panel host")
	}
	if c.Port < 1 || c.Port > 65535 {
		return errors.New("invalid control panel port")
	}
	if c.AdminKey == "" {
		return errors.New("control panel management key required")
	}
	if c.ControllerCA != "" {
		if _, err := controllerCerts(c.ControllerCA); err != nil {
			return err
		}
	}
	return nil
}

// caddyfile is the gateway configuration for host:port (validated input
// only): automatic certificates for a DNS name, Caddy's internal CA for an
// IP literal.
func caddyfile(host string, port int, email string) (string, error) {
	if !validControllerHost(host) || port < 1 || port > 65535 {
		return "", errors.New("invalid control panel address")
	}
	if email != "" && !validACMEEmail(email) {
		return "", errors.New("invalid ACME email")
	}
	ip := net.ParseIP(host)
	var b strings.Builder
	b.WriteString("{\n\tadmin off\n\tauto_https disable_redirects\n\tskip_install_trust\n")
	if email != "" {
		b.WriteString("\temail " + email + "\n")
	}
	site := strings.ToLower(host) + ":" + strconv.Itoa(port)
	if ip != nil {
		b.WriteString("\tdefault_sni " + ip.String() + "\n")
		site = "https://" + net.JoinHostPort(ip.String(), strconv.Itoa(port))
	}
	b.WriteString("}\n" + site + " {\n")
	if ip != nil {
		b.WriteString("\ttls internal\n")
	}
	b.WriteString("\treverse_proxy 127.0.0.1:8787 {\n\t\tflush_interval -1\n\t}\n}\n")
	return b.String(), nil
}
