package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"io"
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

func (s *Service) openAccountModel(ctx context.Context, cfg Config, runtimeKey, revision string) (*http.Client, string, string, func() error, error) {
	if !accountKeyPattern.MatchString(runtimeKey) && !isDraftKey(runtimeKey) {
		return nil, "", "", nil, errors.New("invalid account runtime key")
	}
	controlCtx, cancelControl := context.WithTimeout(ctx, 15*time.Second)
	defer cancelControl()
	client, base, closeController, err := s.openControllerClient(controlCtx, cfg)
	if err != nil {
		return nil, "", "", nil, err
	}
	defer closeController()
	request, err := http.NewRequestWithContext(controlCtx, "GET", base+"/accounts/"+runtimeKey+"/connection", nil)
	if err != nil {
		return nil, "", "", nil, err
	}
	request.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	request.Header.Set("X-CCG-Revision", revision)
	response, err := client.Do(request)
	if err != nil {
		return nil, "", "", nil, errors.New("account connection unavailable")
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusConflict {
		return nil, "", "", nil, errAccountNotSynchronized
	}
	if response.StatusCode != 200 {
		return nil, "", "", nil, errors.New("account runtime is not synchronized")
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, 8193))
	if err != nil || len(data) > 8192 {
		return nil, "", "", nil, errors.New("invalid account connection response")
	}
	var connection accountConnection
	if err = json.Unmarshal(data, &connection); err != nil {
		return nil, "", "", nil, errors.New("invalid account connection response")
	}
	ip := net.ParseIP(connection.IP)
	policy, policyErr := validateNetwork(cfg.EffectiveNetwork())
	pool, poolErr := netip.ParsePrefix(policy.Pool)
	address, addressErr := netip.ParseAddr(connection.IP)
	if policyErr != nil || poolErr != nil || addressErr != nil || !address.Is4() || !pool.Contains(address) || ip == nil || !ip.IsPrivate() || connection.Port != 8787 || connection.Revision != revision || len(connection.Key) < 16 || len(connection.Key) > 512 {
		return nil, "", "", nil, errors.New("invalid account connection endpoint")
	}
	target := net.JoinHostPort(connection.IP, strconv.Itoa(connection.Port))
	if s.openAccount != nil {
		client, closeController, err = s.openAccount(ctx, cfg, target)
	} else if cfg.Mode == "ssh" {
		client, closeController, err = remotedocker.NewAccountHTTPClient(ctx, cfg.SSH(), target)
	} else if cfg.Mode == "controller" {
		client, closeController, err = accountTunnelClient(ctx, cfg, runtimeKey, revision, target)
	} else if cfg.Mode == "local" {
		transport := &http.Transport{Proxy: nil, MaxResponseHeaderBytes: 64 << 10}
		client = &http.Client{Transport: transport, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
		closeController = func() error { transport.CloseIdleConnections(); return nil }
	} else {
		err = errors.New("account transport is not configured")
	}
	if err != nil {
		return nil, "", "", nil, err
	}
	return client, "http://" + target, connection.Key, closeController, nil
}
