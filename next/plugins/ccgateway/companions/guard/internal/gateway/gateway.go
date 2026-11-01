// Package gateway runs the shared gateway's ensure and recreate (03 §3.7,
// §9.3). The gateway is defined by compose; the guard never builds its
// create request. A stopped gateway is started through the Docker API so
// compose never recreates it by accident.
package gateway

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"ccgateway/guard/internal/apierr"
	"ccgateway/guard/internal/compose"
	"ccgateway/guard/internal/controller"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/files"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/obs"
	"ccgateway/guard/internal/policy"
)

// Docker is what the gateway package calls.
type Docker interface {
	ContainerInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.ContainerInfo, error)
	ContainerStart(ctx context.Context, id string) error
	NetworkInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.NetworkInfo, error)
	ImageInspect(ctx context.Context, ref string) (dockerapi.Raw, *dockerapi.ImageInfo, error)
}

// Files is the shared-egress directory.
type Files interface {
	EnsureGatewayDir() error
	VerifyGatewayDir() error
}

// Networks creates the uplink under the subnet allocation lock.
type Networks interface {
	CreateNetwork(ctx context.Context, spec policy.NetworkSpec) (dockerapi.Raw, error)
}

// Firewall is notified after changes.
type Firewall interface {
	Recompute(reason string, aids ...string)
}

// Locks is the "<gateway>" lock.
type Locks interface {
	Lock(ctx context.Context, key string) (func(), error)
}

// GatewayLock is the lock key of gateway operations.
const GatewayLock = "<gateway>"

// StateFile records an unfinished recreate.
const StateFile = "gateway.json"

// Manager runs gateway operations.
type Manager struct {
	N       names.Names
	Project string
	Root    string // RuntimeRoot
	D       Docker
	F       Files
	Nets    Networks
	C       controller.Compose
	CLock   compose.Locker
	Life    *compose.Lifecycle
	Locks   Locks
	FW      Firewall
	Store   controller.Store
	Log     *obs.Logger
	Wait    time.Duration // 30 s
	Stable  time.Duration // 3 s
	Poll    time.Duration // 250 ms
}

func (m *Manager) defaults() {
	if m.Wait == 0 {
		m.Wait = 30 * time.Second
	}
	if m.Stable == 0 {
		m.Stable = 3 * time.Second
	}
	if m.Poll == 0 {
		m.Poll = 250 * time.Millisecond
	}
	if m.Log == nil {
		m.Log = obs.Discard()
	}
}

// ManagedBy is "compose" for the compose egress service, "legacy" for the
// docker-py gateway, "" when there is none.
func (m *Manager) ManagedBy(c *dockerapi.ContainerInfo) string {
	if c == nil {
		return ""
	}
	if c.Label(names.LabelComposeProject) == m.Project && c.Label(names.LabelComposeService) == "egress" {
		return "compose"
	}
	return "legacy"
}

// Get inspects the gateway: (nil, nil, nil) when absent; 409
// ownership_mismatch when the shared label is not the prefix.
func (m *Manager) Get(ctx context.Context) (dockerapi.Raw, *dockerapi.ContainerInfo, error) {
	raw, c, err := m.D.ContainerInspect(ctx, m.N.Gateway())
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return nil, nil, nil
		}
		return nil, nil, apierr.ErrDocker
	}
	if c.TrimName() != m.N.Gateway() {
		return nil, nil, nil
	}
	if c.Label(names.LabelShared) != m.N.Prefix {
		return nil, nil, apierr.Conflict("ownership_mismatch", "gateway is owned by another instance").With(m.N.Gateway())
	}
	return raw, c, nil
}

func mountErr(err error) error {
	if _, ok := files.IsRejected(err); ok {
		return apierr.Forbidden("mount_source_rejected", "gateway configuration directory rejected")
	}
	return apierr.ErrDocker
}

// checkMounts: exactly one bind of <root>/shared-egress at /config.
func (m *Manager) checkMounts(c *dockerapi.ContainerInfo) error {
	if len(c.Mounts) != 1 || c.Mounts[0].Type != "bind" || c.Mounts[0].Destination != "/config" ||
		c.Mounts[0].Source != m.Root+"/shared-egress" {
		return apierr.Forbidden("mount_source_rejected", "gateway mounts are not the expected configuration directory")
	}
	return nil
}

// Ensure brings the gateway up without ever recreating a running one.
func (m *Manager) Ensure(ctx context.Context, uplink *policy.NetworkInput) (dockerapi.Raw, string, error) {
	m.defaults()
	unlock, err := m.Locks.Lock(ctx, GatewayLock)
	if err != nil {
		return nil, "", apierr.ErrLockTimeout
	}
	defer unlock()
	_, c, err := m.Get(ctx)
	if err != nil {
		return nil, "", err
	}
	action := ""
	switch {
	case c != nil && c.State.Running:
		raw, _, err := m.Get(ctx)
		return raw, "none", err
	case c != nil:
		if err := m.checkMounts(c); err != nil {
			return nil, "", err
		}
		if err := m.F.VerifyGatewayDir(); err != nil {
			return nil, "", mountErr(err)
		}
		if err := m.D.ContainerStart(ctx, c.ID); err != nil {
			return nil, "", apierr.Docker("compose_failed", "gateway did not start")
		}
		action = "started"
	default:
		if _, _, err := m.D.NetworkInspect(ctx, m.N.GatewayUplink()); err != nil {
			if !dockerapi.IsNotFound(err) {
				return nil, "", apierr.ErrDocker
			}
			if uplink == nil {
				return nil, "", apierr.Conflict("uplink_missing", "the gateway uplink network does not exist")
			}
			spec, err := policy.GatewayUplink(m.N, *uplink)
			if err != nil {
				return nil, "", apierr.Invalid(err.Error())
			}
			if _, err := m.Nets.CreateNetwork(ctx, spec); err != nil {
				return nil, "", err
			}
		}
		if err := m.F.EnsureGatewayDir(); err != nil {
			return nil, "", mountErr(err)
		}
		if err := m.F.VerifyGatewayDir(); err != nil {
			return nil, "", mountErr(err)
		}
		if !m.Life.Begin("ensure") {
			return nil, "", apierr.Conflict("upgrade_in_progress", "a controller upgrade is running")
		}
		defer m.Life.End()
		cunlock, err := m.CLock.Lock(ctx)
		if err != nil {
			return nil, "", apierr.ErrLockTimeout
		}
		err = m.C.Up(ctx, "egress", false)
		cunlock()
		if err != nil {
			m.logCompose(err)
			return nil, "", apierr.Docker("compose_failed", "compose could not create the gateway")
		}
		action = "created"
	}
	if err := m.waitStable(ctx, ""); err != nil {
		return nil, "", apierr.Docker("compose_failed", "gateway did not stay running")
	}
	m.FW.Recompute("gateway_" + action)
	raw, _, err := m.Get(ctx)
	return raw, action, err
}

func (m *Manager) logCompose(err error) {
	var ce *compose.Error
	if errors.As(err, &ce) {
		m.Log.Warn("compose_failed", obs.Fields{"step": ce.Step, "stderr": ce.Stderr})
	}
}

// waitStable waits until the gateway has been running for Stable with
// the same StartedAt and RestartCount; imageID, when set, must match.
func (m *Manager) waitStable(ctx context.Context, imageID string) error {
	deadline := time.Now().Add(m.Wait)
	var since time.Time
	key := ""
	for {
		_, c, err := m.D.ContainerInspect(ctx, m.N.Gateway())
		if err == nil && c.State.Running && (imageID == "" || c.Image == imageID) {
			k := c.ID + "|" + c.State.StartedAt + "|" + itoa(c.RestartCount)
			if k != key {
				key, since = k, time.Now()
			}
			if time.Since(since) >= m.Stable {
				return nil
			}
		} else {
			key = ""
		}
		if time.Now().After(deadline) {
			return errors.New("gateway not stable")
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(m.Poll):
		}
	}
}

func itoa(n int) string { return strconv.Itoa(n) }

type recreateRecord struct {
	Old string `json:"old"`
	New string `json:"new"`
}

// Recreate replaces a compose gateway with image (explicit maintenance).
func (m *Manager) Recreate(ctx context.Context, image string) (dockerapi.Raw, error) {
	m.defaults()
	if !policy.ValidImage(image) {
		return nil, apierr.Invalid("invalid image reference")
	}
	_, img, err := m.D.ImageInspect(ctx, image)
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return nil, apierr.NotFound("image", "image not found")
		}
		return nil, apierr.ErrDocker
	}
	if img.Config.Labels[names.LabelSharedEgr] != "1" {
		return nil, apierr.Forbidden("image_not_gateway", "image lacks the shared-egress label")
	}
	unlock, err := m.Locks.Lock(ctx, GatewayLock)
	if err != nil {
		return nil, apierr.ErrLockTimeout
	}
	defer unlock()
	_, c, err := m.Get(ctx)
	if err != nil {
		return nil, err
	}
	if c != nil && m.ManagedBy(c) == "legacy" {
		return nil, apierr.Conflict("gateway_not_compose", "the running gateway is not managed by compose")
	}
	if _, _, err := m.D.NetworkInspect(ctx, m.N.GatewayUplink()); err != nil {
		if dockerapi.IsNotFound(err) {
			return nil, apierr.Conflict("uplink_missing", "the gateway uplink network does not exist")
		}
		return nil, apierr.ErrDocker
	}
	if err := m.F.EnsureGatewayDir(); err != nil {
		return nil, mountErr(err)
	}
	if err := m.F.VerifyGatewayDir(); err != nil {
		return nil, mountErr(err)
	}
	if !m.Life.Begin("recreate") {
		return nil, apierr.Conflict("upgrade_in_progress", "a controller upgrade is running")
	}
	defer m.Life.End()
	cunlock, err := m.CLock.Lock(ctx)
	if err != nil {
		return nil, apierr.ErrLockTimeout
	}
	defer cunlock()
	old, err := m.C.EnvValue("CCG_GATEWAY_IMAGE")
	if err != nil {
		return nil, apierr.Docker("compose_failed", "cannot read .env")
	}
	rec, _ := json.Marshal(recreateRecord{Old: old, New: image})
	if err := m.Store.Write(StateFile, rec); err != nil {
		return nil, apierr.Docker("compose_failed", "cannot record the recreate")
	}
	oldEnv, err := m.C.SetEnv("CCG_GATEWAY_IMAGE", image)
	if err != nil {
		_ = m.Store.Remove(StateFile)
		return nil, apierr.Docker("compose_failed", "cannot write .env")
	}
	err = m.C.Up(ctx, "egress", true)
	if err == nil {
		err = m.waitStable(ctx, img.ID)
	} else {
		m.logCompose(err)
	}
	if err != nil {
		restored := m.C.RestoreEnv(oldEnv) == nil && m.C.Up(ctx, "egress", true) == nil
		_ = m.Store.Remove(StateFile)
		m.FW.Recompute("gateway_recreate_failed")
		if restored {
			return nil, apierr.Docker("compose_failed", "gateway recreate failed; previous image restored")
		}
		m.Log.Alert("gateway_restore_failed", nil)
		return nil, apierr.Docker("compose_failed", "gateway recreate failed; previous image not restored")
	}
	_ = m.Store.Remove(StateFile)
	m.FW.Recompute("gateway_recreated")
	raw, _, err := m.Get(ctx)
	return raw, err
}

// Resume finishes a recreate interrupted by a guard restart.
func (m *Manager) Resume(ctx context.Context) {
	m.defaults()
	b, err := m.Store.Read(StateFile)
	if err != nil {
		return
	}
	var rec recreateRecord
	if json.Unmarshal(b, &rec) != nil {
		_ = m.Store.Remove(StateFile)
		return
	}
	_, img, ierr := m.D.ImageInspect(ctx, rec.New)
	_, c, cerr := m.Get(ctx)
	if ierr == nil && cerr == nil && c != nil && c.State.Running && c.Image == img.ID {
		_ = m.Store.Remove(StateFile)
		return
	}
	m.Log.Warn("gateway_recreate_resume_restore", nil)
	cunlock, err := m.CLock.Lock(ctx)
	if err != nil {
		return
	}
	defer cunlock()
	if rec.Old != "" && policy.ValidImage(rec.Old) {
		if _, err := m.C.SetEnv("CCG_GATEWAY_IMAGE", rec.Old); err == nil {
			_ = m.C.Up(ctx, "egress", true)
		}
	}
	_ = m.Store.Remove(StateFile)
}
