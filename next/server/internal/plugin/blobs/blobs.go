// Package blobs keeps plugin package bytes outside PostgreSQL. PostgreSQL
// records each version's sha256 and, for market installs, its download URL;
// the bytes come from the market or from the cluster's primary node.
package blobs

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ErrNotFound reports that no reachable store holds the package.
var ErrNotFound = errors.New("plugin package is not available on this node")

// Store holds packages by lower-case hex sha256. Put returns only after the
// package is durable where other nodes fetch it from.
type Store interface {
	Put(ctx context.Context, sum string, data []byte) error
	Get(ctx context.Context, sum string) ([]byte, error)
}

func validSum(sum string) bool {
	if len(sum) != 64 {
		return false
	}
	_, err := hex.DecodeString(sum)
	return err == nil && strings.ToLower(sum) == sum
}

func check(sum string, data []byte) error {
	h := sha256.Sum256(data)
	if hex.EncodeToString(h[:]) != sum {
		return fmt.Errorf("plugin package sha256 mismatch for %s", sum)
	}
	return nil
}

// Dir is a local directory store. It serves one node only: a deployment of
// several nodes runs under the shell and uses Shell.
type Dir string

func (d Dir) path(sum string) string { return filepath.Join(string(d), sum[:2], sum) }

func (d Dir) Put(_ context.Context, sum string, data []byte) error {
	if !validSum(sum) {
		return fmt.Errorf("invalid plugin package sha256 %q", sum)
	}
	if err := check(sum, data); err != nil {
		return err
	}
	file := d.path(sum)
	if err := os.MkdirAll(filepath.Dir(file), 0o755); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(filepath.Dir(file), ".put-")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if _, err = tmp.Write(data); err == nil {
		err = tmp.Sync()
	}
	if cerr := tmp.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		return err
	}
	return os.Rename(tmp.Name(), file)
}

func (d Dir) Get(_ context.Context, sum string) ([]byte, error) {
	if !validSum(sum) {
		return nil, fmt.Errorf("invalid plugin package sha256 %q", sum)
	}
	data, err := os.ReadFile(d.path(sum))
	if errors.Is(err, os.ErrNotExist) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err = check(sum, data); err != nil {
		return nil, err
	}
	return data, nil
}

// Shell stores packages through the local shell's management socket. The
// shell keeps them on the primary: a follower's Put is forwarded there before
// it returns, and a follower's Get is fetched from there over the
// authenticated node network.
type Shell struct {
	socket string
	token  string // management socket token; "" sends none
	client *http.Client
	max    int64
}

// shellTimeout bounds one transfer through the shell, which may fetch the
// package from the primary first (1 GiB packages, CONTRACTS §53.10).
const shellTimeout = 30 * time.Minute

// defaultShellMax applies when NewShell or Source gets no limit (pkg's
// default).
const defaultShellMax = 1 << 30

// NewShell talks to the shell's management socket. token (config
// Managed.UpdaterToken) is sent as "Authorization: Bearer <token>"; empty
// sends none (older shells).
func NewShell(socket, token string, maxBytes int64) *Shell {
	dial := func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", socket)
	}
	s := newShell(dial, token, maxBytes)
	s.socket = socket
	return s
}

func newShell(dial func(ctx context.Context, network, addr string) (net.Conn, error), token string, maxBytes int64) *Shell {
	if maxBytes <= 0 {
		maxBytes = defaultShellMax
	}
	return &Shell{token: token, max: maxBytes, client: &http.Client{Timeout: shellTimeout, Transport: &http.Transport{DialContext: dial}}}
}

func (s *Shell) url(sum string) string { return "http://shell/system/plugin-blobs/" + sum }

func (s *Shell) authorize(req *http.Request) {
	if s.token != "" {
		req.Header.Set("Authorization", "Bearer "+s.token)
	}
}

func (s *Shell) Put(ctx context.Context, sum string, data []byte) error {
	if !validSum(sum) {
		return fmt.Errorf("invalid plugin package sha256 %q", sum)
	}
	if err := check(sum, data); err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, s.url(sum), bytes.NewReader(data))
	if err != nil {
		return err
	}
	s.authorize(req)
	res, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("store plugin package through the shell: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode/100 != 2 {
		msg, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return fmt.Errorf("store plugin package through the shell: HTTP %d %s", res.StatusCode, strings.TrimSpace(string(msg)))
	}
	return nil
}

func (s *Shell) Get(ctx context.Context, sum string) ([]byte, error) {
	if !validSum(sum) {
		return nil, fmt.Errorf("invalid plugin package sha256 %q", sum)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.url(sum), nil)
	if err != nil {
		return nil, err
	}
	s.authorize(req)
	res, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch plugin package through the shell: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode == http.StatusNotFound {
		return nil, ErrNotFound
	}
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch plugin package through the shell: HTTP %d", res.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, s.max+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > s.max {
		return nil, fmt.Errorf("plugin package exceeds %d bytes", s.max)
	}
	if err = check(sum, data); err != nil {
		return nil, err
	}
	return data, nil
}

// Source resolves the bytes of one plugin version. A market version is
// downloaded by each node from its market URL; anything else, and a market
// download that fails, comes from Store.
type Source struct {
	Store    Store
	Download func(ctx context.Context, url string, limit int64) ([]byte, error)
	MaxBytes int64
}

func (s *Source) Fetch(ctx context.Context, sum, url string) ([]byte, error) {
	if s == nil || s.Store == nil {
		return nil, errors.New("no plugin package store configured")
	}
	sum = strings.ToLower(sum)
	if url != "" && s.Download != nil {
		limit := s.MaxBytes
		if limit <= 0 {
			limit = defaultShellMax
		}
		if data, err := s.Download(ctx, url, limit); err == nil && check(sum, data) == nil {
			return data, nil
		}
	}
	data, err := s.Store.Get(ctx, sum)
	if err != nil {
		return nil, err
	}
	return data, check(sum, data)
}
