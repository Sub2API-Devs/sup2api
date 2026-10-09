package ccgateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Calls to the controller's own API (images, uploads, self-upgrade) in
// control panel mode (CONTRACTS §53.5 / §53.6).

var (
	errConfigChanged = errors.New("CCGateway configuration changed meanwhile")
	// errNotSent: the request never left the core.
	errNotSent = errors.New("controller request not sent")

	controllerUpgradeWait  = 90 * time.Second
	controllerUpgradeEvery = 3 * time.Second
)

// controllerCall sends one request to the controller. body may be nil; a
// non-negative length is its exact size.
func (s *Service) controllerCall(ctx context.Context, cfg Config, method, path string, body io.Reader, length int64, header http.Header) (*http.Response, func() error, error) {
	client, base, close, e := s.openControllerClient(ctx, cfg)
	if e != nil {
		return nil, nil, fmt.Errorf("%w: %v", errNotSent, e)
	}
	req, e := http.NewRequestWithContext(ctx, method, base+path, body)
	if e != nil {
		close()
		return nil, nil, fmt.Errorf("%w: %v", errNotSent, e)
	}
	if body != nil && length >= 0 {
		req.ContentLength = length
		if length == 0 {
			req.Body = http.NoBody
		}
	}
	for k, v := range header {
		req.Header[k] = v
	}
	req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	res, e := client.Do(req)
	if e != nil {
		close()
		return nil, nil, e
	}
	return res, close, nil
}

// controllerJSON sends in (nil: no body) and decodes a 2xx answer into out
// (nil: ignored). Failures are mapped to the console's error shape.
func (s *Service) controllerJSON(ctx context.Context, cfg Config, method, path string, in, out any) *core.Error {
	var body io.Reader
	length := int64(-1)
	header := http.Header{}
	if in != nil {
		raw, _ := json.Marshal(in)
		body, length = bytes.NewReader(raw), int64(len(raw))
		header.Set("Content-Type", "application/json")
	}
	res, close, e := s.controllerCall(ctx, cfg, method, path, body, length, header)
	if e != nil {
		return reasonError(core.ErrUnavailable, "controller_unhealthy")
	}
	defer close()
	defer res.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(res.Body, 1<<20+1))
	if e != nil || len(raw) > 1<<20 {
		return reasonError(core.ErrUnavailable, "controller_unhealthy")
	}
	if res.StatusCode < 200 || res.StatusCode > 299 {
		return controllerAPIError(res.StatusCode, raw)
	}
	if out != nil && json.Unmarshal(raw, out) != nil {
		return reasonError(core.ErrUnavailable, "controller_unhealthy")
	}
	return nil
}

// controllerAPIError maps a controller answer {"error": "<code>"} to the
// console: the code becomes details.reason, the status class is kept.
func controllerAPIError(status int, raw []byte) *core.Error {
	var answer struct {
		Error  string `json:"error"`
		Offset *int64 `json:"offset"`
	}
	_ = json.Unmarshal(raw, &answer)
	code := answer.Error
	if !codePattern.MatchString(code) {
		code = ""
	}
	var base *core.Error
	switch status {
	case http.StatusBadRequest:
		base = core.ErrInvalidArgument
		if code == "" {
			code = "invalid_request"
		}
	case http.StatusNotFound:
		base = core.ErrNotFound
		if code == "" {
			code = "not_found"
		}
	case http.StatusConflict:
		base = core.ErrConflict
		if code == "" {
			code = "conflict"
		}
	default:
		base = core.ErrUnavailable
		if code == "" {
			code = "controller_unhealthy"
		}
	}
	err := reasonError(base, code)
	if status == http.StatusConflict && answer.Offset != nil && *answer.Offset >= 0 {
		err = err.WithDetails(map[string]any{"offset": *answer.Offset})
	}
	return err
}

// updateConfig changes the saved configuration under its row lock and audits
// ccgateway.config.update with fields.
func (s *Service) updateConfig(ctx context.Context, uid int64, fields []string, change func(*Config) error) (Config, error) {
	return s.updateConfigAt(ctx, uid, fields, nil, change)
}

// panelUpgrade is the one-click upgrade in control panel mode: the
// controller switches to the effective app / egress images (pulling them if
// needed), then upgrades itself when its image differs.
func (s *Service) panelUpgrade(ctx context.Context, cfg Config) *core.Error {
	img := cfg.EffectiveImages()
	var h controllerHealth
	if err := s.controllerJSON(ctx, cfg, "PUT", "/runtime/images", map[string]string{"app": img.App, "egress": img.Egress}, &h); err != nil {
		return err
	}
	if h.ControllerImage == img.Controller {
		return nil
	}
	return s.upgradeController(ctx, cfg, img.Controller)
}

// upgradeController asks the controller to replace itself with image and
// waits until /health reports it (the helper container rolls back alone).
func (s *Service) upgradeController(ctx context.Context, cfg Config, image string) *core.Error {
	if err := s.requestUpgrade(ctx, cfg, image); err != nil {
		return err
	}
	deadline := time.Now().Add(controllerUpgradeWait)
	for {
		if h, e := s.health(ctx, cfg); e == nil && h.ControllerImage == image {
			return nil
		}
		if !time.Now().Add(controllerUpgradeEvery).Before(deadline) {
			return reasonError(core.ErrUnavailable, "controller_unhealthy")
		}
		select {
		case <-ctx.Done():
			return reasonError(core.ErrUnavailable, "controller_unhealthy")
		case <-time.After(controllerUpgradeEvery):
		}
	}
}

// requestUpgrade sends POST /runtime/controller. The helper container may
// stop the old controller before its 202 arrives, so only an explicit error
// answer ({"error": ...} with a 4xx/5xx status) or failing to reach the
// control panel at all counts as a refusal; a connection cut after the
// request (EOF, reset, unreadable or non-JSON answer such as the gateway's
// 502) counts as accepted.
func (s *Service) requestUpgrade(ctx context.Context, cfg Config, image string) *core.Error {
	raw, _ := json.Marshal(map[string]string{"image": image})
	header := http.Header{}
	header.Set("Content-Type", "application/json")
	callCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	res, close, e := s.controllerCall(callCtx, cfg, "POST", "/runtime/controller", bytes.NewReader(raw), int64(len(raw)), header)
	if e != nil {
		var se *stageError
		if errors.As(e, &se) || errors.Is(e, errNotSent) {
			return reasonError(core.ErrUnavailable, "controller_unhealthy")
		}
		return nil
	}
	defer close()
	defer res.Body.Close()
	if res.StatusCode >= 200 && res.StatusCode <= 299 {
		return nil
	}
	body, e := io.ReadAll(io.LimitReader(res.Body, 65537))
	var answer struct {
		Error string `json:"error"`
	}
	if e != nil || len(body) > 65536 || json.Unmarshal(body, &answer) != nil || answer.Error == "" {
		return nil
	}
	return controllerAPIError(res.StatusCode, body)
}
