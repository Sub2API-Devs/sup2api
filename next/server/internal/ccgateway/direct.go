package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"net/netip"
	"strconv"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
)

// accountConnection comes only from the authenticated controller, in memory.
// It is never persisted, logged or returned through the public account API.
type accountConnection struct {
	IP       string `json:"app_ip"`
	Port     int    `json:"port"`
	Key      string `json:"api_key"`
	Revision string `json:"revision"`
}

var errAccountNotSynchronized = errors.New("account runtime is not synchronized")

func (c accountConnection) target() string { return net.JoinHostPort(c.IP, strconv.Itoa(c.Port)) }

// fetchConnection asks the controller where runtime key runs at revision
// and with which Worker key; a runtime at another revision is
// errAccountNotSynchronized.
func (s *Service) fetchConnection(ctx context.Context, cfg Config, runtimeKey, revision string) (accountConnection, error) {
	var connection accountConnection
	if !accountKeyPattern.MatchString(runtimeKey) && !isDraftKey(runtimeKey) {
		return connection, errors.New("invalid account runtime key")
	}
	controlCtx, cancelControl := context.WithTimeout(ctx, 15*time.Second)
	defer cancelControl()
	client, base, closeController, err := s.openControllerClient(controlCtx, cfg)
	if err != nil {
		return connection, err
	}
	defer closeController()
	request, err := http.NewRequestWithContext(controlCtx, "GET", base+"/accounts/"+runtimeKey+"/connection", nil)
	if err != nil {
		return connection, err
	}
	request.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	request.Header.Set("X-CCG-Revision", revision)
	response, err := client.Do(request)
	if err != nil {
		return connection, errors.New("account connection unavailable")
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusConflict {
		return connection, errAccountNotSynchronized
	}
	if response.StatusCode != 200 {
		return connection, errors.New("account runtime is not synchronized")
	}
	data, err := readBounded(response.Body, 8192)
	if err != nil {
		return connection, errors.New("invalid account connection response")
	}
	if err = json.Unmarshal(data, &connection); err != nil {
		return connection, errors.New("invalid account connection response")
	}
	ip := net.ParseIP(connection.IP)
	policy, policyErr := validateNetwork(cfg.EffectiveNetwork())
	pool, poolErr := netip.ParsePrefix(policy.Pool)
	address, addressErr := netip.ParseAddr(connection.IP)
	if policyErr != nil || poolErr != nil || addressErr != nil || !address.Is4() || !pool.Contains(address) || ip == nil || !ip.IsPrivate() || connection.Port != 8787 || connection.Revision != revision || len(connection.Key) < 16 || len(connection.Key) > 512 {
		return accountConnection{}, errors.New("invalid account connection endpoint")
	}
	return connection, nil
}

// openAccountTransport opens a client of the runtime at target (app_ip:8787)
// for one request.
func (s *Service) openAccountTransport(ctx context.Context, cfg Config, runtimeKey, revision, target string) (*http.Client, func() error, error) {
	switch {
	case s.openAccount != nil:
		return s.openAccount(ctx, cfg, target)
	case cfg.Mode == "ssh":
		return remotedocker.NewAccountHTTPClient(ctx, cfg.SSH(), target)
	case cfg.Mode == "controller":
		return accountTunnelClient(ctx, cfg, runtimeKey, revision, target)
	case cfg.Mode == "local":
		transport := &http.Transport{Proxy: nil, MaxResponseHeaderBytes: 64 << 10}
		client := newNoRedirectClient(transport)
		return client, func() error { transport.CloseIdleConnections(); return nil }, nil
	}
	return nil, nil, errors.New("account transport is not configured")
}
