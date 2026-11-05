package api

import (
	"slices"
	"testing"

	"ccgateway/guard/internal/dockerapi/fakedocker"
)

// The session state mount (SESSION-MEMORY-TOOLS-USED-DESIGN.md §7.4):
// CCG_GUARD_SESSION_STATE decides what new containers get; start/restart
// accepts both shapes regardless.

func sessionSetup() setup {
	return setup{
		Images:   []setupImage{{Ref: "ccgateway-app:1"}},
		Networks: []setupNet{{AID: "21", Subnet: "10.52.74.0/24"}},
		Volumes:  []setupVol{{AID: "21", Quota: true}},
		Files:    map[string]string{"21/resolv.conf": "ok"},
	}
}

var putAppBody = map[string]any{
	"auth_label": "fp-1", "env": map[string]string{"TZ": "UTC"}, "image": "ccgateway-app:1",
	"image_label": "sha256:1111111111111111111111111111111111111111111111111111111111111111", "ipv4": "10.52.74.5",
}

var (
	resolvMount = fakedocker.Mount{Type: "bind", Source: "/opt/ccgateway-runtime/21/resolv.conf", Destination: "/etc/resolv.conf",
		Mode: "ro", Propagation: "rprivate"}
	volMount = fakedocker.Mount{Type: "volume", Name: "ccg-21-data", Source: "/var/lib/docker/volumes/ccg-21-data/_data",
		Destination: "/work", Mode: "rw", RW: true}
	stateMount = fakedocker.Mount{Type: "bind", Source: "/opt/ccgateway-runtime/state", Destination: "/run/ccg-state",
		Mode: "ro", Propagation: "rprivate"}
)

func (h *harness) appMountsOf(name string) []fakedocker.Mount {
	c := h.f.Container(name)
	if c == nil {
		return nil
	}
	var out []fakedocker.Mount
	h.f.Do(func() { out = append(out, c.Mounts...) })
	return out
}

// covers: SESSION-MEMORY §7.4 switch off: two mounts, state/ never looked at
func TestSessionStateSwitchOff(t *testing.T) {
	h := newHarness(t)
	h.apply(sessionSetup())
	h.files.bad["state"] = "missing" // must not matter with the switch off
	if w := h.do(req{method: "PUT", path: "/v1/accounts/21/app", body: putAppBody}); w.Code != 201 {
		t.Fatalf("put: %d %s", w.Code, w.Body)
	}
	if m := h.appMountsOf("ccg-21-app"); len(m) != 2 {
		t.Fatalf("mounts = %+v", m)
	}
	if w := h.do(req{method: "POST", path: "/v1/accounts/21/app/start", body: map[string]any{}}); w.Code != 204 {
		t.Fatalf("start: %d %s", w.Code, w.Body)
	}
	if h.files.stateChecks != 0 {
		t.Fatalf("state/ checked %d times with the switch off", h.files.stateChecks)
	}
	feats := decodeBody(t, h.do(req{method: "GET", path: "/v1/health"}))["features"].([]any)
	for _, f := range feats {
		if f == FeatureSessionState {
			t.Fatal("session-state-v1 reported with the switch off")
		}
	}
}

// covers: SESSION-MEMORY §7.4 switch on: three mounts, state/ checked on
// create and start, session-state-v1 reported
func TestSessionStateSwitchOn(t *testing.T) {
	h := newHarness(t)
	h.srv.Cfg.SessionState = true
	h.apply(sessionSetup())
	if w := h.do(req{method: "PUT", path: "/v1/accounts/21/app", body: putAppBody}); w.Code != 201 {
		t.Fatalf("put: %d %s", w.Code, w.Body)
	}
	m := h.appMountsOf("ccg-21-app")
	if len(m) != 3 || !slices.Contains(m, stateMount) {
		t.Fatalf("mounts = %+v", m)
	}
	if h.files.stateChecks != 1 {
		t.Fatalf("state checks after create = %d", h.files.stateChecks)
	}
	if w := h.do(req{method: "POST", path: "/v1/accounts/21/app/start", body: map[string]any{}}); w.Code != 204 {
		t.Fatalf("start: %d %s", w.Code, w.Body)
	}
	if w := h.do(req{method: "POST", path: "/v1/accounts/21/app/restart", body: map[string]any{}}); w.Code != 204 {
		t.Fatalf("restart: %d %s", w.Code, w.Body)
	}
	if h.files.stateChecks != 3 {
		t.Fatalf("state checks after start+restart = %d", h.files.stateChecks)
	}
	feats := decodeBody(t, h.do(req{method: "GET", path: "/v1/health"}))["features"].([]any)
	if !slices.Contains(feats, any(FeatureSessionState)) {
		t.Fatalf("features = %v", feats)
	}
	if slices.Contains(Features, FeatureSessionState) {
		t.Fatal("the shared Features list was modified")
	}

	// A rejected socket directory: no container, nothing started.
	h2 := newHarness(t)
	h2.srv.Cfg.SessionState = true
	h2.apply(sessionSetup())
	h2.files.bad["state"] = "owner"
	w := h2.do(req{method: "PUT", path: "/v1/accounts/21/app", body: putAppBody})
	if w.Code != 403 || decodeBody(t, w)["reason"] != "mount_source_rejected" {
		t.Fatalf("put with bad state/: %d %s", w.Code, w.Body)
	}
	if h2.f.Container("ccg-21-app") != nil {
		t.Fatal("container created although state/ was rejected")
	}
}

// covers: SESSION-MEMORY §7.4 §11 appMounts: the two-mount and three-mount
// shapes start whatever the switch says; every other shape is rejected
func TestAppMountShapes(t *testing.T) {
	with := func(m fakedocker.Mount, f func(*fakedocker.Mount)) fakedocker.Mount { f(&m); return m }
	cases := []struct {
		name   string
		mounts []fakedocker.Mount
		bad    string // h.files.bad["state"]
		ok     bool
	}{
		{"old two", []fakedocker.Mount{resolvMount, volMount}, "", true},
		{"new three", []fakedocker.Mount{resolvMount, volMount, stateMount}, "", true},
		{"new three, order", []fakedocker.Mount{stateMount, volMount, resolvMount}, "", true},
		{"old two ignores a bad state/", []fakedocker.Mount{resolvMount, volMount}, "owner", true},
		{"new three, bad state/", []fakedocker.Mount{resolvMount, volMount, stateMount}, "name", false},
		{"state rw", []fakedocker.Mount{resolvMount, volMount, with(stateMount, func(m *fakedocker.Mount) { m.RW, m.Mode = true, "rw" })}, "", false},
		{"state rshared", []fakedocker.Mount{resolvMount, volMount, with(stateMount, func(m *fakedocker.Mount) { m.Propagation = "rshared" })}, "", false},
		{"state rslave", []fakedocker.Mount{resolvMount, volMount, with(stateMount, func(m *fakedocker.Mount) { m.Propagation = "rslave" })}, "", false},
		{"state no propagation", []fakedocker.Mount{resolvMount, volMount, with(stateMount, func(m *fakedocker.Mount) { m.Propagation = "" })}, "", false},
		{"state source parent", []fakedocker.Mount{resolvMount, volMount, with(stateMount, func(m *fakedocker.Mount) { m.Source = "/opt/ccgateway-runtime" })}, "", false},
		{"state source account dir", []fakedocker.Mount{resolvMount, volMount, with(stateMount, func(m *fakedocker.Mount) { m.Source = "/opt/ccgateway-runtime/21" })}, "", false},
		{"state source socket file", []fakedocker.Mount{resolvMount, volMount, with(stateMount, func(m *fakedocker.Mount) { m.Source = "/opt/ccgateway-runtime/state/valkey.sock" })}, "", false},
		{"state other target", []fakedocker.Mount{resolvMount, volMount, with(stateMount, func(m *fakedocker.Mount) { m.Destination = "/run" })}, "", false},
		{"state as volume", []fakedocker.Mount{resolvMount, volMount, with(stateMount, func(m *fakedocker.Mount) { m.Type, m.Name = "volume", "ccg-state" })}, "", false},
		{"extra bind", []fakedocker.Mount{resolvMount, volMount, {Type: "bind", Source: "/etc", Destination: "/host-etc", Mode: "ro", Propagation: "rprivate"}}, "", false},
		{"state twice", []fakedocker.Mount{resolvMount, stateMount, with(stateMount, func(m *fakedocker.Mount) { m.Destination = "/work" })}, "", false},
		{"four", []fakedocker.Mount{resolvMount, volMount, stateMount, {Type: "bind", Source: "/etc", Destination: "/host-etc", Mode: "ro", Propagation: "rprivate"}}, "", false},
		{"state without volume", []fakedocker.Mount{resolvMount, stateMount}, "", false},
		{"state without resolv", []fakedocker.Mount{volMount, stateMount}, "", false},
		{"one", []fakedocker.Mount{volMount}, "", false},
		{"none", nil, "", false},
	}
	for _, sw := range []bool{false, true} {
		for _, c := range cases {
			h := newHarness(t)
			h.srv.Cfg.SessionState = sw
			s := sessionSetup()
			s.Containers = []setupCtr{{AID: "21", Status: "created", IPv4: "10.52.74.5", Mounts: "none"}}
			h.apply(s)
			ctr := h.f.Container("ccg-21-app")
			h.f.Do(func() { ctr.Mounts = append([]fakedocker.Mount(nil), c.mounts...) })
			if c.bad != "" {
				h.files.bad["state"] = c.bad
			}
			for _, action := range []string{"start", "restart"} {
				w := h.do(req{method: "POST", path: "/v1/accounts/21/app/" + action, body: map[string]any{}})
				switch {
				case c.ok && w.Code != 204:
					t.Errorf("switch=%v %s %s: %d %s", sw, c.name, action, w.Code, w.Body)
				case !c.ok && (w.Code != 403 || decodeBody(t, w)["reason"] != "mount_source_rejected"):
					t.Errorf("switch=%v %s %s: want 403 mount_source_rejected, got %d %s", sw, c.name, action, w.Code, w.Body)
				}
			}
			// stop never looks at mounts (an odd container can always be stopped).
			if w := h.do(req{method: "POST", path: "/v1/accounts/21/app/stop", body: map[string]any{}}); w.Code != 204 {
				t.Errorf("switch=%v %s stop: %d %s", sw, c.name, w.Code, w.Body)
			}
		}
	}
}
