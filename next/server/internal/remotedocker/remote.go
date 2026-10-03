// Package remotedocker provides pinned SSH Docker operations and loopback HTTP forwarding.
package remotedocker

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/ssh"
)

type Config struct {
	Host               string
	Port               int
	User               string
	AuthMode           string
	Password           string
	PrivateKey         string
	Passphrase         string
	HostKeyFingerprint string
}

const maxOutput = 64 << 10
const timeout = 30 * time.Second

func address(host string, port int) (string, error) {
	if port < 1 || port > 65535 {
		return "", errors.New("SSH port must be between 1 and 65535")
	}
	if host == "" || len(host) > 253 || strings.TrimSpace(host) != host {
		return "", errors.New("invalid SSH host")
	}
	if net.ParseIP(host) == nil {
		for _, label := range strings.Split(host, ".") {
			if len(label) == 0 || len(label) > 63 || label[0] == '-' || label[len(label)-1] == '-' {
				return "", errors.New("invalid SSH host")
			}
			for _, c := range label {
				if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '-') {
					return "", errors.New("invalid SSH host")
				}
			}
		}
	}
	return net.JoinHostPort(host, strconv.Itoa(port)), nil
}

// ProbeFingerprint observes a key without authenticating the server or sending
// credentials. The caller must verify this fingerprint out of band before saving it.
func ProbeFingerprint(ctx context.Context, host string, port int) (string, error) {
	addr, err := address(host, port)
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	conn, err := (&net.Dialer{}).DialContext(ctx, "tcp", addr)
	if err != nil {
		return "", safeError(ctx, "SSH connection failed")
	}
	defer conn.Close()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()
	var fingerprint string
	_, _, _, _ = ssh.NewClientConn(conn, addr, &ssh.ClientConfig{User: "fingerprint-probe", HostKeyCallback: func(_ string, _ net.Addr, key ssh.PublicKey) error {
		fingerprint = ssh.FingerprintSHA256(key)
		return errors.New("fingerprint probe stops before authentication")
	}})
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	if fingerprint == "" {
		return "", errors.New("SSH fingerprint probe failed")
	}
	return fingerprint, nil
}

func safeError(ctx context.Context, message string) error {
	if ctx.Err() != nil {
		return ctx.Err()
	}
	return errors.New(message)
}

// shellQuote is only applied to fixed operands; callers cannot supply shell code.
func shellQuote(s string) string { return "'" + strings.ReplaceAll(s, "'", "'\"'\"'") + "'" }

func command(container, action string) (string, error) {
	if container == "" || len(container) > 128 {
		return "", errors.New("invalid container name")
	}
	for _, c := range container {
		if !(c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '_' || c == '-' || c == '.') {
			return "", errors.New("invalid container name")
		}
	}
	if container[0] == '-' || container[0] == '.' {
		return "", errors.New("invalid container name")
	}
	name := shellQuote(container)
	switch action {
	case "test":
		return "docker version --format '{{.Server.Version}}' && docker compose version --short", nil
	case "status":
		return "docker inspect --type container --format '{{json .State.Status}} {{json .Config.Image}}' " + name, nil
	case "start", "stop", "restart":
		return "docker " + action + " " + name, nil
	case "logs":
		return "docker logs --tail 200 --timestamps " + name, nil
	default:
		return "", errors.New("unsupported container action")
	}
}

func clientConfig(cfg Config) (*ssh.ClientConfig, error) {
	if cfg.User == "" || len(cfg.User) > 128 || strings.ContainsAny(cfg.User, "\x00\r\n\t ") {
		return nil, errors.New("invalid SSH user")
	}
	fp, err := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(cfg.HostKeyFingerprint, "SHA256:"))
	if !strings.HasPrefix(cfg.HostKeyFingerprint, "SHA256:") || err != nil || len(fp) != 32 {
		return nil, errors.New("SSH host key SHA256 fingerprint is required")
	}
	var auth ssh.AuthMethod
	switch cfg.AuthMode {
	case "password":
		if cfg.Password == "" {
			return nil, errors.New("SSH password is required")
		}
		auth = ssh.Password(cfg.Password)
	case "private_key":
		var signer ssh.Signer
		if cfg.Passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(cfg.PrivateKey), []byte(cfg.Passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(cfg.PrivateKey))
		}
		if err != nil {
			return nil, errors.New("invalid SSH private key or passphrase")
		}
		auth = ssh.PublicKeys(signer)
	default:
		return nil, errors.New("SSH auth mode must be password or private_key")
	}
	return &ssh.ClientConfig{User: cfg.User, Auth: []ssh.AuthMethod{auth}, HostKeyCallback: func(_ string, _ net.Addr, key ssh.PublicKey) error {
		if ssh.FingerprintSHA256(key) != cfg.HostKeyFingerprint {
			return errors.New("SSH host key fingerprint mismatch")
		}
		return nil
	}}, nil
}

type boundedOutput struct {
	mu        sync.Mutex
	data      []byte
	truncated bool
}

func (b *boundedOutput) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	n := len(p)
	remaining := maxOutput - len(b.data)
	if n > remaining {
		b.truncated = true
		p = p[:remaining]
	}
	b.data = append(b.data, p...)
	return n, nil
}

// Execute authenticates only after checking the configured host key. Remote
// errors deliberately omit stderr and connection details to avoid secret leaks.
func Execute(ctx context.Context, cfg Config, container, action string) (string, error) {
	cmd, err := command(container, action)
	if err != nil {
		return "", err
	}
	addr, err := address(cfg.Host, cfg.Port)
	if err != nil {
		return "", err
	}
	sshCfg, err := clientConfig(cfg)
	if err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	conn, err := (&net.Dialer{}).DialContext(ctx, "tcp", addr)
	if err != nil {
		return "", safeError(ctx, "SSH connection failed")
	}
	defer conn.Close()
	stop := context.AfterFunc(ctx, func() { _ = conn.Close() })
	defer stop()
	cc, chans, reqs, err := ssh.NewClientConn(conn, addr, sshCfg)
	if err != nil {
		return "", safeError(ctx, "SSH handshake, host key verification, or authentication failed")
	}
	client := ssh.NewClient(cc, chans, reqs)
	defer client.Close()
	session, err := client.NewSession()
	if err != nil {
		return "", safeError(ctx, "SSH session failed")
	}
	defer session.Close()
	var out boundedOutput
	session.Stdout = &out
	// Docker emits container logs on stderr as well; no stderr is returned for
	// other actions since it can expose connection or daemon configuration.
	if action == "logs" {
		session.Stderr = &out
	}
	if err = session.Run(cmd); err != nil {
		return "", safeError(ctx, "remote Docker command failed")
	}
	result := string(out.data)
	for _, secret := range []string{cfg.Password, cfg.PrivateKey, cfg.Passphrase} {
		if secret != "" {
			result = strings.ReplaceAll(result, secret, "[REDACTED]")
		}
	}
	if out.truncated {
		result += "\n[output truncated]"
	}
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	return result, nil
}

// Validate checks connection inputs without contacting a host.
func Validate(cfg Config) error {
	if _, err := address(cfg.Host, cfg.Port); err != nil {
		return err
	}
	_, err := clientConfig(cfg)
	if err != nil {
		return fmt.Errorf("invalid SSH configuration: %w", err)
	}
	return nil
}
