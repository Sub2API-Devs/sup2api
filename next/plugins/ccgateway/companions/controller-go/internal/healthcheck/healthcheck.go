// Package healthcheck is the `ccg-controller healthcheck` subcommand used by
// the compose health check (02 §7.5): GET http://127.0.0.1:<port>/health
// with the controller key, 3 s; healthy only when it answers 200 and its
// controller_image equals CCG_CONTROLLER_IMAGE.
package healthcheck

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"strconv"
	"time"
)

// Timeout of the whole check.
const Timeout = 3 * time.Second

// Run returns the exit code: 0 healthy, 1 not. getenv reads the environment.
func Run(ctx context.Context, getenv func(string) string) int {
	return check(ctx, getenv, "127.0.0.1")
}

func check(ctx context.Context, getenv func(string) string, host string) int {
	key, image := getenv("CCG_CONTROLLER_KEY"), getenv("CCG_CONTROLLER_IMAGE")
	port := 8787
	if raw := getenv("CCG_CONTROLLER_PORT"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 65535 {
			return 1
		}
		port = n
	}
	if key == "" {
		return 1
	}
	ctx, cancel := context.WithTimeout(ctx, Timeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://"+net.JoinHostPort(host, strconv.Itoa(port))+"/health", nil)
	if err != nil {
		return 1
	}
	req.Header.Set("Authorization", "Bearer "+key)
	client := &http.Client{Transport: &http.Transport{Proxy: nil, DisableKeepAlives: true},
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	resp, err := client.Do(req)
	if err != nil {
		return 1
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 1
	}
	var health struct {
		ControllerImage *string `json:"controller_image"`
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil || json.Unmarshal(raw, &health) != nil || health.ControllerImage == nil || *health.ControllerImage != image {
		return 1
	}
	return 0
}
