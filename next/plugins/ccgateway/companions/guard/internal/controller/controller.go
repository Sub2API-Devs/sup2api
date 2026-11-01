// Package controller is the controller self-upgrade state machine (03
// §9.2): .env → compose up → wait healthy → roll back on failure.
package controller

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"sync"
	"time"

	"ccgateway/guard/internal/apierr"
	"ccgateway/guard/internal/compose"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/obs"
	"ccgateway/guard/internal/policy"
)

// Docker is what the upgrader reads.
type Docker interface {
	ContainerInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.ContainerInfo, error)
	ImageInspect(ctx context.Context, ref string) (dockerapi.Raw, *dockerapi.ImageInfo, error)
}

// Compose is the part of compose.Runner the upgrader uses.
type Compose interface {
	Up(ctx context.Context, service string, force bool) error
	EnvValue(key string) (string, error)
	SetEnv(key, value string, drop ...string) ([]byte, error)
	RestoreEnv(old []byte) error
}

// Store keeps the guard's state files.
type Store interface {
	Read(name string) ([]byte, error)
	Write(name string, data []byte) error
	Remove(name string) error
}

// Status is GET /v1/controller/upgrade (03 §3.8.2).
type Status struct {
	State     string `json:"state"`
	Image     string `json:"image"`
	Previous  string `json:"previous"`
	Step      string `json:"step"`
	Result    string `json:"result"`
	Rollback  string `json:"rollback"`
	StartedAt string `json:"started_at"`
	EndedAt   string `json:"ended_at"`
}

type persisted struct {
	Status
	OldContainer string `json:"old_container"`
}

// StateFile is the persisted status.
const StateFile = "upgrade.json"

// Upgrader runs one upgrade at a time.
type Upgrader struct {
	N      names.Names
	D      Docker
	C      Compose
	Lock   compose.Locker
	Life   *compose.Lifecycle
	Store  Store
	Log    *obs.Logger
	Poll   time.Duration // 1 s
	Wait   time.Duration // 60 s
	Now    func() time.Time
	OnDone func() // tests

	mu sync.Mutex
	p  persisted
	wg sync.WaitGroup
}

func (u *Upgrader) defaults() {
	if u.Poll == 0 {
		u.Poll = time.Second
	}
	if u.Wait == 0 {
		u.Wait = 60 * time.Second
	}
	if u.Now == nil {
		u.Now = time.Now
	}
	if u.Log == nil {
		u.Log = obs.Discard()
	}
}

// Status returns the current status (idle when nothing ran).
func (u *Upgrader) Status() Status {
	u.mu.Lock()
	defer u.mu.Unlock()
	if u.p.State == "" {
		return Status{State: "idle"}
	}
	return u.p.Status
}

// Load reads upgrade.json (startup).
func (u *Upgrader) Load() {
	b, err := u.Store.Read(StateFile)
	if err != nil {
		return
	}
	var p persisted
	if json.Unmarshal(b, &p) == nil {
		u.mu.Lock()
		u.p = p
		u.mu.Unlock()
	}
}

func (u *Upgrader) save() {
	u.mu.Lock()
	b, _ := json.Marshal(u.p)
	u.mu.Unlock()
	if err := u.Store.Write(StateFile, b); err != nil {
		u.Log.Error("upgrade_state_write_failed", nil)
	}
}

func (u *Upgrader) set(f func(p *persisted)) {
	u.mu.Lock()
	f(&u.p)
	u.mu.Unlock()
	u.save()
}

// RequiredLabels are the two image labels of a guarded controller (R14).
func RequiredLabels(info *dockerapi.ImageInfo) bool {
	return info.Config.Labels[names.LabelGuardAPI] == "1" && info.Config.Labels[names.LabelSharedEgr] == "1"
}

// Start validates synchronously (202 or an error) and runs the upgrade in
// the background.
func (u *Upgrader) Start(ctx context.Context, image string) error {
	u.defaults()
	if !policy.ValidImage(image) {
		return apierr.Invalid("invalid image reference")
	}
	_, info, err := u.D.ImageInspect(ctx, image)
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return apierr.NotFound("image", "image not found")
		}
		return apierr.ErrDocker
	}
	if !RequiredLabels(info) {
		return apierr.Forbidden("image_not_guarded", "controller image lacks the guard-api and shared-egress labels")
	}
	if !u.Life.Begin("upgrade") {
		return apierr.Conflict("upgrade_in_progress", "an upgrade or gateway recreate is running")
	}
	unlock, err := u.Lock.Lock(ctx)
	if err != nil {
		u.Life.End()
		return apierr.ErrLockTimeout
	}
	prev, err := u.C.EnvValue("CCG_CONTROLLER_IMAGE")
	if err != nil {
		unlock()
		u.Life.End()
		return apierr.Docker("compose_failed", "cannot read .env")
	}
	oldID := ""
	if _, c, err := u.D.ContainerInspect(ctx, u.N.Controller()); err == nil {
		oldID = c.ID
	}
	u.set(func(p *persisted) {
		*p = persisted{Status: Status{State: "running", Image: image, Previous: prev, Step: "env_written",
			StartedAt: u.Now().UTC().Format(time.RFC3339)}, OldContainer: oldID}
	})
	u.wg.Add(1)
	go func() {
		defer u.wg.Done()
		defer u.Life.End()
		defer unlock()
		u.run(context.Background(), true)
	}()
	return nil
}

// WaitIdle waits for a background upgrade (tests, shutdown).
func (u *Upgrader) WaitIdle() { u.wg.Wait() }

func (u *Upgrader) run(ctx context.Context, fresh bool) {
	u.mu.Lock()
	p := u.p
	u.mu.Unlock()
	result := ""
	if fresh {
		if _, err := u.C.SetEnv("CCG_CONTROLLER_IMAGE", p.Image, "CCG_CONTROLLER_VERSION"); err != nil {
			u.rollback(ctx, "env_failed")
			return
		}
		u.set(func(p *persisted) { p.Step = "compose_up" })
		if err := u.C.Up(ctx, "controller", false); err != nil {
			u.logCompose(err)
			result = "compose_failed"
		}
	}
	if result == "" {
		u.set(func(p *persisted) { p.Step = "waiting_health" })
		if err := u.waitHealthy(ctx, p.Image, p.OldContainer, true); err != nil {
			result = "unhealthy"
		}
	}
	if result != "" {
		u.rollback(ctx, result)
		return
	}
	u.finish("done", "started", "")
}

func (u *Upgrader) logCompose(err error) {
	var ce *compose.Error
	if errors.As(err, &ce) {
		u.Log.Warn("compose_failed", obs.Fields{"step": ce.Step, "stderr": ce.Stderr})
		return
	}
	u.Log.Warn("compose_failed", nil)
}

func (u *Upgrader) finish(state, result, rollback string) {
	u.set(func(p *persisted) {
		p.State, p.Step, p.Result, p.Rollback = state, "finished", result, rollback
		p.EndedAt = u.Now().UTC().Format(time.RFC3339)
	})
	if state == "done" {
		if _, c, err := u.D.ContainerInspect(context.Background(), u.N.Controller()); err == nil {
			for _, e := range c.Config.Env {
				if strings.HasPrefix(e, "CCG_CONTROLLER_VERSION=") {
					u.Log.Warn("controller_version_pinned", nil)
				}
			}
		}
	}
	u.Log.Info("controller_upgrade_finished", obs.Fields{"state": state, "result": result, "rollback": rollback})
	if u.OnDone != nil {
		u.OnDone()
	}
}

func (u *Upgrader) rollback(ctx context.Context, result string) {
	u.set(func(p *persisted) { p.State, p.Step, p.Result = "running", "rolling_back", result })
	u.mu.Lock()
	prev := u.p.Previous
	u.mu.Unlock()
	ok := prev != ""
	if ok {
		if _, err := u.C.SetEnv("CCG_CONTROLLER_IMAGE", prev); err != nil {
			ok = false
		}
	}
	if ok {
		if err := u.C.Up(ctx, "controller", false); err != nil {
			u.logCompose(err)
			ok = false
		}
	}
	if ok {
		ok = u.waitHealthy(ctx, prev, "", false) == nil
	}
	if !ok {
		u.Log.Alert("controller_restore_failed", nil)
		u.finish("failed", result, "restore_failed")
		return
	}
	u.finish("failed", result, "restored")
}

var errUnhealthy = errors.New("controller not healthy")

// waitHealthy polls the controller (03 §9.2.2 step 4). changed requires a
// new container id; health must exist and be healthy; unhealthy or exited
// fails at once.
func (u *Upgrader) waitHealthy(ctx context.Context, image, oldID string, changed bool) error {
	deadline := u.Now().Add(u.Wait)
	for {
		_, c, err := u.D.ContainerInspect(ctx, u.N.Controller())
		if err == nil && (!changed || c.ID != oldID) && c.Config.Image == image {
			if c.State.Health == nil {
				return errUnhealthy
			}
			if c.State.Status == "exited" || c.State.Status == "dead" || c.State.Health.Status == "unhealthy" {
				return errUnhealthy
			}
			if c.State.Running && c.State.Health.Status == "healthy" {
				return nil
			}
		}
		if !u.Now().Before(deadline) {
			return errUnhealthy
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(u.Poll):
		}
	}
}

// Resume finishes an upgrade interrupted by a guard restart (03 §9.2.4).
func (u *Upgrader) Resume(ctx context.Context) {
	u.defaults()
	u.Load()
	u.mu.Lock()
	p := u.p
	u.mu.Unlock()
	if p.State != "running" {
		return
	}
	if !u.Life.Begin("upgrade") {
		return
	}
	defer u.Life.End()
	unlock, err := u.Lock.Lock(ctx)
	if err != nil {
		u.Log.Error("upgrade_resume_lock_failed", nil)
		return
	}
	defer unlock()
	u.Log.Info("controller_upgrade_resume", obs.Fields{"step": p.Step})
	switch p.Step {
	case "env_written", "compose_up":
		saved := u.Wait
		u.Wait = 0
		err := u.waitHealthy(ctx, p.Image, p.OldContainer, true)
		u.Wait = saved
		if err == nil {
			u.finish("done", "started", "")
			return
		}
		u.rollback(ctx, "compose_failed")
	case "waiting_health":
		if err := u.waitHealthy(ctx, p.Image, p.OldContainer, true); err != nil {
			u.rollback(ctx, "unhealthy")
			return
		}
		u.finish("done", "started", "")
	case "rolling_back":
		u.rollback(ctx, p.Result)
	default:
		u.finish("failed", p.Result, "restore_failed")
	}
}

// ErrNotExist re-exports os.ErrNotExist for stores.
var ErrNotExist = os.ErrNotExist
