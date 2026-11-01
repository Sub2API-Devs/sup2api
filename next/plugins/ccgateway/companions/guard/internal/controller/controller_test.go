package controller

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/guard/internal/apierr"
	"ccgateway/guard/internal/compose"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/names"
)

// sim simulates compose + Docker for the controller service: Up replaces
// the controller with the image in .env; health per image.
type sim struct {
	mu         sync.Mutex
	env        *compose.MemEnv
	runner     *compose.Runner
	current    *dockerapi.ContainerInfo
	health     map[string]string // image → healthy | unhealthy | starting | none | exit
	upFail     map[string]bool   // image → compose up fails
	images     map[string]map[string]string
	ups        []string
	gen        int
	setEnvFail bool
}

func newSim() *sim {
	s := &sim{env: &compose.MemEnv{Data: []byte("CCG_GUARD_TOKEN=x\nCCG_CONTROLLER_IMAGE=ctl:1\nCCG_CONTROLLER_VERSION=0.1.1\n")},
		health: map[string]string{"ctl:1": "healthy"}, upFail: map[string]bool{},
		images: map[string]map[string]string{}}
	s.runner = &compose.Runner{Env: s.env}
	s.current = s.make("ctl:1")
	return s
}

func (s *sim) make(image string) *dockerapi.ContainerInfo {
	s.gen++
	c := &dockerapi.ContainerInfo{ID: "c" + strings.Repeat("0", s.gen), Name: "/ccg-controller", Image: "sha256:x"}
	c.Config.Image = image
	h := s.health[image]
	switch h {
	case "exit":
		c.State.Status = "exited"
	default:
		c.State.Status, c.State.Running = "running", true
	}
	if h != "none" && h != "exit" {
		c.State.Health = &struct {
			Status string `json:"Status"`
		}{Status: h}
	}
	return c
}

func (s *sim) ContainerInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.ContainerInfo, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.current == nil {
		return nil, nil, &dockerapi.Error{Status: 404}
	}
	cp := *s.current
	return nil, &cp, nil
}

func (s *sim) ImageInspect(ctx context.Context, ref string) (dockerapi.Raw, *dockerapi.ImageInfo, error) {
	labels, ok := s.images[ref]
	if !ok {
		return nil, nil, &dockerapi.Error{Status: 404}
	}
	i := &dockerapi.ImageInfo{ID: "sha256:" + ref}
	i.Config.Labels = labels
	return nil, i, nil
}

func (s *sim) Up(ctx context.Context, service string, force bool) error {
	img, _ := s.runner.EnvValue("CCG_CONTROLLER_IMAGE")
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ups = append(s.ups, img)
	if s.upFail[img] {
		return &compose.Error{Step: "up", Err: errors.New("exit 1")}
	}
	if s.current == nil || s.current.Config.Image != img {
		s.current = s.make(img)
	}
	return nil
}

func (s *sim) EnvValue(k string) (string, error) { return s.runner.EnvValue(k) }
func (s *sim) SetEnv(k, v string, drop ...string) ([]byte, error) {
	if s.setEnvFail {
		return nil, errors.New("disk full")
	}
	return s.runner.SetEnv(k, v, drop...)
}
func (s *sim) RestoreEnv(old []byte) error { return s.runner.RestoreEnv(old) }

type memStore struct {
	mu sync.Mutex
	m  map[string][]byte
}

func (m *memStore) Read(n string) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	b, ok := m.m[n]
	if !ok {
		return nil, os.ErrNotExist
	}
	return b, nil
}
func (m *memStore) Write(n string, d []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.m[n] = append([]byte(nil), d...)
	return nil
}
func (m *memStore) Remove(n string) error { m.mu.Lock(); delete(m.m, n); m.mu.Unlock(); return nil }

var guarded = map[string]string{names.LabelGuardAPI: "1", names.LabelSharedEgr: "1"}

func upgrader(s *sim) (*Upgrader, *memStore) {
	st := &memStore{m: map[string][]byte{}}
	return &Upgrader{N: names.Names{Prefix: "ccg"}, D: s, C: s, Lock: &compose.MutexLocker{}, Life: &compose.Lifecycle{},
		Store: st, Poll: time.Millisecond, Wait: 50 * time.Millisecond}, st
}

func run(t *testing.T, u *Upgrader, image string) Status {
	t.Helper()
	if err := u.Start(context.Background(), image); err != nil {
		t.Fatal(err)
	}
	u.WaitIdle()
	return u.Status()
}

// covers: R14 C2 03§9.2 success: .env rewritten (VERSION dropped), new container healthy
func TestUpgradeSuccess(t *testing.T) {
	s := newSim()
	s.images["ctl:2"] = guarded
	s.health["ctl:2"] = "healthy"
	u, st := upgrader(s)
	got := run(t, u, "ctl:2")
	if got.State != "done" || got.Result != "started" || got.Previous != "ctl:1" || got.Step != "finished" || got.EndedAt == "" {
		t.Fatalf("%+v", got)
	}
	env, _ := s.env.Read()
	if strings.Contains(string(env), "CCG_CONTROLLER_VERSION") || compose.Value(env, "CCG_CONTROLLER_IMAGE") != "ctl:2" {
		t.Fatalf("%s", env)
	}
	var p persisted
	_ = json.Unmarshal(st.m[StateFile], &p)
	if p.State != "done" {
		t.Fatal("not persisted")
	}
}

// covers: R14 C2 03§3.8.1 rejections: labels, missing image, busy
func TestUpgradeRejects(t *testing.T) {
	s := newSim()
	s.images["half"] = map[string]string{names.LabelGuardAPI: "1"}
	s.images["other"] = map[string]string{names.LabelSharedEgr: "1"}
	u, _ := upgrader(s)
	for img, reason := range map[string]string{"half": "image_not_guarded", "other": "image_not_guarded", "absent:1": "image"} {
		err := u.Start(context.Background(), img)
		e, ok := apierr.As(err)
		if !ok || e.Reason != reason {
			t.Errorf("%s: %v", img, err)
		}
	}
	if e, _ := apierr.As(u.Start(context.Background(), "Bad Ref")); e == nil || e.Status != 400 {
		t.Fatal("bad ref")
	}
	s.images["ctl:2"] = guarded
	u.Life.Begin("recreate")
	if e, _ := apierr.As(u.Start(context.Background(), "ctl:2")); e == nil || e.Reason != "upgrade_in_progress" {
		t.Fatal("busy")
	}
	if len(s.ups) != 0 {
		t.Fatal("rejected upgrades ran compose")
	}
}

// covers: 03§9.2.2 compose_failed → rolled back and restored
func TestUpgradeComposeFailed(t *testing.T) {
	s := newSim()
	s.images["ctl:2"] = guarded
	s.upFail["ctl:2"] = true
	u, _ := upgrader(s)
	got := run(t, u, "ctl:2")
	if got.State != "failed" || got.Result != "compose_failed" || got.Rollback != "restored" {
		t.Fatalf("%+v", got)
	}
	env, _ := s.env.Read()
	if compose.Value(env, "CCG_CONTROLLER_IMAGE") != "ctl:1" {
		t.Fatal("env not restored")
	}
}

// covers: 03§9.2.2 health timeout, unhealthy early failure, missing healthcheck
func TestUpgradeUnhealthy(t *testing.T) {
	for _, h := range []string{"starting", "unhealthy", "none", "exit"} {
		s := newSim()
		s.images["ctl:2"] = guarded
		s.health["ctl:2"] = h
		u, _ := upgrader(s)
		if h == "unhealthy" {
			u.Wait = time.Hour // must fail early, not time out
		}
		got := run(t, u, "ctl:2")
		if got.State != "failed" || got.Result != "unhealthy" || got.Rollback != "restored" {
			t.Fatalf("%s: %+v", h, got)
		}
		if s.current.Config.Image != "ctl:1" {
			t.Fatalf("%s: controller not restored", h)
		}
	}
}

// covers: 03§9.2.2 rollback fails → restore_failed
func TestUpgradeRestoreFailed(t *testing.T) {
	s := newSim()
	s.images["ctl:2"] = guarded
	s.health["ctl:2"] = "unhealthy"
	s.health["ctl:1"] = "unhealthy"
	u, _ := upgrader(s)
	s.mu.Lock()
	s.current = s.make("ctl:1")
	s.mu.Unlock()
	got := run(t, u, "ctl:2")
	if got.State != "failed" || got.Rollback != "restore_failed" {
		t.Fatalf("%+v", got)
	}
	s2 := newSim()
	s2.images["ctl:2"] = guarded
	s2.setEnvFail = true
	u2, _ := upgrader(s2)
	if got := run(t, u2, "ctl:2"); got.Result != "env_failed" || got.Rollback != "restore_failed" {
		t.Fatalf("%+v", got)
	}
}

// covers: 03§9.2.4 Resume for each step
func TestResume(t *testing.T) {
	cases := []struct {
		step, health, state, result string
	}{
		{"compose_up", "healthy", "done", "started"},
		{"env_written", "unhealthy", "failed", "compose_failed"},
		{"waiting_health", "healthy", "done", "started"},
		{"rolling_back", "healthy", "failed", "unhealthy"},
	}
	for _, c := range cases {
		s := newSim()
		s.health["ctl:2"] = c.health
		_, _ = s.runner.SetEnv("CCG_CONTROLLER_IMAGE", "ctl:2")
		if c.step != "env_written" {
			_ = s.Up(context.Background(), "controller", false)
		}
		u, st := upgrader(s)
		p := persisted{Status: Status{State: "running", Image: "ctl:2", Previous: "ctl:1", Step: c.step, Result: "unhealthy"}, OldContainer: "old"}
		b, _ := json.Marshal(p)
		st.m[StateFile] = b
		u.Resume(context.Background())
		got := u.Status()
		if got.State != c.state || got.Result != c.result {
			t.Fatalf("%s: %+v", c.step, got)
		}
		if c.state == "failed" && s.current.Config.Image != "ctl:1" {
			t.Fatalf("%s: not rolled back", c.step)
		}
	}
	// Nothing to resume.
	s := newSim()
	u, _ := upgrader(s)
	u.Resume(context.Background())
	if u.Status().State != "idle" || len(s.ups) != 0 {
		t.Fatal("idle resume")
	}
}
