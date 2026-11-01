package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"

	"ccgateway/guard/internal/dockerapi/fakedocker"
	"ccgateway/guard/internal/names"
)

// The contract samples (05 §5): testdata/api-contract/<endpoint>/<case>.json.
// The guard runs them against its real handlers over the in-memory Docker
// fake; the Go controller's FakeGuard and guardapi decoder run the same
// files. Field meanings are documented on the types below and in
// companions/guard/README.md.

type contractCase struct {
	Name     string       `json:"name"`
	Covers   string       `json:"covers,omitempty"`
	Setup    setup        `json:"setup"`
	Request  contractReq  `json:"request"`
	Response contractResp `json:"response"`
	After    *after       `json:"after,omitempty"`
}

type setup struct {
	ControllerUnguarded bool              `json:"controller_unguarded,omitempty"`
	Starting            bool              `json:"starting,omitempty"`
	DiskFull            bool              `json:"disk_full,omitempty"`
	Images              []setupImage      `json:"images,omitempty"`
	Networks            []setupNet        `json:"networks,omitempty"`
	OtherNetworks       []setupOtherNet   `json:"other_networks,omitempty"`
	Volumes             []setupVol        `json:"volumes,omitempty"`
	Containers          []setupCtr        `json:"containers,omitempty"`
	Oneshots            []setupOneshot    `json:"oneshots,omitempty"`
	Gateway             *setupGw          `json:"gateway,omitempty"`
	Files               map[string]string `json:"files,omitempty"`
	NoQuota             bool              `json:"no_quota,omitempty"`
	Env                 map[string]string `json:"env,omitempty"`
	Exec                *setupExec        `json:"exec,omitempty"`
	Job                 *setupJob         `json:"job,omitempty"`
	Pullable            []string          `json:"pullable,omitempty"`
	LoadLines           []string          `json:"load_lines,omitempty"`
	LoadError           string            `json:"load_error,omitempty"`
	ControllerHealth    map[string]string `json:"controller_health,omitempty"`
	ComposeFails        []string          `json:"compose_fails,omitempty"`
	LifecycleBusy       bool              `json:"lifecycle_busy,omitempty"`
}

// setupImage: a local image. id defaults to sha256 of the ref.
type setupImage struct {
	Ref    string            `json:"ref"`
	ID     string            `json:"id,omitempty"`
	Labels map[string]string `json:"labels,omitempty"`
	Files  map[string]string `json:"files,omitempty"` // path → content; a value "<dir>" is a directory
}

// setupNet: <p>-<aid>-net (role net), <p>-<aid>-uplink (uplink) or the
// gateway uplink (role xray-uplink, aid d0000000000000000). owner is the
// account label (default aid); internal defaults to role == net.
type setupNet struct {
	AID      string `json:"aid"`
	Role     string `json:"role,omitempty"`
	Subnet   string `json:"subnet"`
	Owner    string `json:"owner,omitempty"`
	Internal *bool  `json:"internal,omitempty"`
}

type setupOtherNet struct {
	Name   string `json:"name"`
	Subnet string `json:"subnet"`
}

type setupVol struct {
	AID   string `json:"aid"`
	Owner string `json:"owner,omitempty"`
	Quota bool   `json:"quota,omitempty"`
}

// setupCtr: <p>-<aid>-<role>. status: created | running | exited.
// mounts (role app): "default" (resolv bind + volume), "extra" (plus a
// bind of /etc), "none". ipv4 attaches it to <p>-<aid>-net.
type setupCtr struct {
	AID    string            `json:"aid"`
	Role   string            `json:"role,omitempty"`
	Status string            `json:"status,omitempty"`
	IPv4   string            `json:"ipv4,omitempty"`
	Image  string            `json:"image,omitempty"`
	Owner  string            `json:"owner,omitempty"`
	Mounts string            `json:"mounts,omitempty"`
	Files  map[string]string `json:"files,omitempty"`
}

// setupOneshot: a Python-era helper <p>-oneshot-<hex> on an account's
// network and/or volume (R15).
type setupOneshot struct {
	Status  string `json:"status"`
	Network string `json:"network,omitempty"` // aid
	Volume  string `json:"volume,omitempty"`  // aid
}

// setupGw: <p>-shared-egress. managed_by compose | legacy; owner is the
// shared label (default the prefix); networks: aid → address on
// <p>-<aid>-net.
type setupGw struct {
	Status    string            `json:"status,omitempty"`
	ManagedBy string            `json:"managed_by,omitempty"`
	Owner     string            `json:"owner,omitempty"`
	Image     string            `json:"image,omitempty"`
	Networks  map[string]string `json:"networks,omitempty"`
}

type setupExec struct {
	Stdout      string `json:"stdout,omitempty"`
	Stderr      string `json:"stderr,omitempty"`
	ExitCode    int    `json:"exit_code"`
	StdoutBytes int    `json:"stdout_bytes,omitempty"` // stdout of this many 'x' bytes instead
	Hang        bool   `json:"hang,omitempty"`         // never finishes (exec_timeout)
}

// setupJob: what every one-shot container (jobs, firewall helper) does.
type setupJob struct {
	ExitCode    int    `json:"exit_code"`
	Stdout      string `json:"stdout,omitempty"`
	StdoutBytes int    `json:"stdout_bytes,omitempty"`
	Hang        bool   `json:"hang,omitempty"`
}

// contractReq: auth "" = valid bearer token; "none" = no header; any other
// value is sent verbatim as the Authorization header. remote "" = the
// controller (172.29.255.2). The body is json, text or body_base64.
type contractReq struct {
	Method      string              `json:"method"`
	Path        string              `json:"path"`
	JSON        any                 `json:"json,omitempty"`
	Text        *string             `json:"text,omitempty"`
	BodyBase64  string              `json:"body_base64,omitempty"`
	ContentType string              `json:"content_type,omitempty"`
	Length      *int64              `json:"content_length,omitempty"` // overrides the header (no body is sent beyond the given bytes)
	Chunked     bool                `json:"chunked,omitempty"`
	Auth        string              `json:"auth,omitempty"`
	Remote      string              `json:"remote,omitempty"`
	Headers     map[string][]string `json:"headers,omitempty"`
}

// contractResp: body is a subset match (every key given must be equal);
// keys is the exact top-level key set; body_base64 is the exact raw body.
type contractResp struct {
	Status     int               `json:"status"`
	Body       map[string]any    `json:"body,omitempty"`
	Keys       []string          `json:"keys,omitempty"`
	Headers    map[string]string `json:"headers,omitempty"`
	BodyBase64 string            `json:"body_base64,omitempty"`
}

// after: docker_unchanged = no Docker request other than GET was made;
// files = runtime files after the call (rel → content).
type after struct {
	DockerUnchanged bool              `json:"docker_unchanged,omitempty"`
	Files           map[string]string `json:"files,omitempty"`
	Recompute       bool              `json:"recompute,omitempty"`
}

func imageID(ref string) string {
	sum := sha256.Sum256([]byte(ref))
	return "sha256:" + hex.EncodeToString(sum[:])
}

func (h *harness) apply(s setup) {
	n := names.Names{Prefix: "ccg"}
	h.ctl.ok = !s.ControllerUnguarded
	h.srv.SetStarting(s.Starting)
	if s.DiskFull {
		h.srv.State = fullState{tmpState{dir: h.t.TempDir()}}
	}
	ensureImage := func(ref string, labels map[string]string) string {
		id := imageID(ref)
		if strings.HasPrefix(ref, "sha256:") {
			id = ref
		}
		var exists bool
		h.f.Do(func() { _, exists = h.f.Images[id] })
		if !exists {
			h.f.AddImage(id, labels, ref)
		}
		return id
	}
	for _, img := range s.Images {
		id := img.ID
		if id == "" {
			id = imageID(img.Ref)
		}
		i := h.f.AddImage(id, img.Labels, img.Ref)
		for p, c := range img.Files {
			if c == "<dir>" {
				i.Files[p] = fakedocker.File{Dir: true}
			} else {
				i.Files[p] = fakedocker.File{Data: []byte(c)}
			}
		}
	}
	for _, nw := range s.Networks {
		role := nw.Role
		if role == "" {
			role = "net"
		}
		name := map[string]string{"net": n.Net(nw.AID), "uplink": n.LegacyUplink(nw.AID), "xray-uplink": n.GatewayUplink()}[role]
		owner := nw.Owner
		if owner == "" {
			owner = nw.AID
		}
		internal := role == "net"
		if nw.Internal != nil {
			internal = *nw.Internal
		}
		h.f.AddNetwork(&fakedocker.Network{Name: name, Subnet: nw.Subnet, Internal: internal,
			Labels: map[string]string{names.LabelAccount: owner, names.LabelNetwork: "{}"}})
	}
	for _, o := range s.OtherNetworks {
		h.f.AddNetwork(&fakedocker.Network{Name: o.Name, Subnet: o.Subnet})
	}
	for _, v := range s.Volumes {
		owner := v.Owner
		if owner == "" {
			owner = v.AID
		}
		labels := map[string]string{names.LabelAccount: owner}
		opts := map[string]string{}
		if v.Quota {
			labels[names.LabelDiskQuota] = "10737418240"
			opts["size"] = "10737418240"
		}
		h.f.AddVolume(&fakedocker.Volume{Name: n.Volume(v.AID), Labels: labels, Options: opts})
	}
	for _, c := range s.Containers {
		role := c.Role
		if role == "" {
			role = "app"
		}
		image := c.Image
		if image == "" {
			image = "ccgateway-app:1"
		}
		owner := c.Owner
		if owner == "" {
			owner = c.AID
		}
		status := c.Status
		if status == "" {
			status = "running"
		}
		ctr := &fakedocker.Container{Name: n.Container(c.AID, role), Image: ensureImage(image, nil), ConfigImage: image,
			Status: status, Labels: map[string]string{names.LabelAccount: owner}, User: "1000:1000",
			NetworkMode: n.Net(c.AID), Files: map[string]fakedocker.File{"/": {Dir: true}, "/tmp": {Dir: true}}}
		if c.IPv4 != "" {
			ctr.Networks = map[string]string{n.Net(c.AID): c.IPv4}
		}
		mounts := c.Mounts
		if mounts == "" && role == "app" {
			mounts = "default"
		}
		if mounts == "default" || mounts == "extra" {
			ctr.Mounts = []fakedocker.Mount{
				{Type: "bind", Source: "/opt/ccgateway-runtime/" + c.AID + "/resolv.conf", Destination: "/etc/resolv.conf", Mode: "ro", Propagation: "rprivate"},
				{Type: "volume", Name: n.Volume(c.AID), Source: "/var/lib/docker/volumes/" + n.Volume(c.AID) + "/_data", Destination: "/work", Mode: "rw", RW: true},
			}
			if mounts == "extra" {
				ctr.Mounts = append(ctr.Mounts, fakedocker.Mount{Type: "bind", Source: "/etc", Destination: "/host-etc", Mode: "ro"})
			}
		}
		for p, content := range c.Files {
			if content == "<dir>" {
				ctr.Files[p] = fakedocker.File{Dir: true}
			} else {
				ctr.Files[p] = fakedocker.File{Data: []byte(content)}
			}
		}
		h.f.AddContainer(ctr)
	}
	for _, o := range s.Oneshots {
		c := &fakedocker.Container{Name: n.Oneshot(), Image: ensureImage("ccgateway-xray:1", nil), ConfigImage: "ccgateway-xray:1",
			Status: o.Status}
		if o.Network != "" {
			c.Networks = map[string]string{n.Net(o.Network): ""}
		}
		if o.Volume != "" {
			c.Mounts = []fakedocker.Mount{{Type: "volume", Name: n.Volume(o.Volume), Destination: "/work", Mode: "rw", RW: true}}
		}
		h.f.AddContainer(c)
	}
	if g := s.Gateway; g != nil {
		image := g.Image
		if image == "" {
			image = "ccgateway-xray:1"
		}
		owner := g.Owner
		if owner == "" {
			owner = "ccg"
		}
		status := g.Status
		if status == "" {
			status = "running"
		}
		labels := map[string]string{names.LabelShared: owner}
		if g.ManagedBy != "legacy" {
			labels[names.LabelComposeProject] = "ccgateway"
			labels[names.LabelComposeService] = "egress"
		}
		nets := map[string]string{n.GatewayUplink(): ""}
		for aid, ip := range g.Networks {
			nets[n.Net(aid)] = ip
		}
		h.f.AddContainer(&fakedocker.Container{Name: n.Gateway(), Image: ensureImage(image, map[string]string{names.LabelSharedEgr: "1"}),
			ConfigImage: image, Status: status, Labels: labels, Networks: nets,
			Mounts: []fakedocker.Mount{{Type: "bind", Source: "/opt/ccgateway-runtime/shared-egress", Destination: "/config", Mode: "ro"}}})
	}
	for rel, state := range s.Files {
		if state == "ok" {
			h.files.files[rel] = []byte("nameserver 10.0.0.2\n")
		} else {
			h.files.bad[rel] = state
		}
	}
	h.f.NoQuota = s.NoQuota
	for k, v := range s.Env {
		next, err := rewriteEnv(h.env, k, v)
		if err != nil {
			h.t.Fatal(err)
		}
		_ = next
	}
	if e := s.Exec; e != nil {
		h.f.Exec = func(*fakedocker.Container, []string, string) ([]byte, []byte, int, timeDur) {
			out := []byte(e.Stdout)
			if e.StdoutBytes > 0 {
				out = bytes.Repeat([]byte("x"), e.StdoutBytes)
			}
			var delay timeDur
			if e.Hang {
				delay = 1 << 40
			}
			return out, []byte(e.Stderr), e.ExitCode, delay
		}
	}
	if j := s.Job; j != nil {
		h.f.OnStart = func(c *fakedocker.Container) {
			if c.Labels[names.LabelJob] != "" {
				c.ExitCode, c.Stdout, c.Hang = j.ExitCode, []byte(j.Stdout), j.Hang
				if j.StdoutBytes > 0 {
					c.Stdout = bytes.Repeat([]byte("x"), j.StdoutBytes)
				}
			}
		}
	}
	for _, p := range s.Pullable {
		h.f.Pullable[p] = imageID(p)
	}
	h.f.LoadLines, h.f.LoadError = s.LoadLines, s.LoadError
	for img, health := range s.ControllerHealth {
		h.cs.health[img] = health
	}
	for _, img := range s.ComposeFails {
		h.cs.fail[img] = true
	}
	if s.LifecycleBusy {
		h.srv.Upgrader.Life.Begin("upgrade")
	}
	h.f.ResetRequests()
}

type fullState struct{ tmpState }

func (fullState) FreeBytes() (uint64, error) { return 0, nil }

func (h *harness) run(t *testing.T, c contractCase) {
	h.apply(c.Setup)
	r := req{method: c.Request.Method, path: c.Request.Path, ctype: c.Request.ContentType, auth: c.Request.Auth,
		remote: c.Request.Remote, headers: c.Request.Headers, noLength: c.Request.Chunked}
	switch {
	case c.Request.JSON != nil:
		b, _ := json.Marshal(c.Request.JSON)
		r.raw = b
		if r.ctype == "" {
			r.ctype = "application/json"
		}
	case c.Request.Text != nil:
		r.raw = []byte(*c.Request.Text)
	case c.Request.BodyBase64 != "":
		b, err := base64.StdEncoding.DecodeString(c.Request.BodyBase64)
		if err != nil {
			t.Fatal(err)
		}
		r.raw = b
	}
	if c.Request.Length != nil {
		r.lengthOverride = c.Request.Length
	}
	w := h.do(r)
	if c.Request.Method == "POST" && strings.HasSuffix(c.Request.Path, "/controller/upgrade") {
		h.srv.Upgrader.WaitIdle()
	}
	if w.Code != c.Response.Status {
		t.Fatalf("status %d, want %d: %s", w.Code, c.Response.Status, w.Body.String())
	}
	for k, v := range c.Response.Headers {
		if got := w.Header().Get(k); got != v {
			t.Fatalf("header %s = %q, want %q", k, got, v)
		}
	}
	if c.Response.BodyBase64 != "" {
		want, _ := base64.StdEncoding.DecodeString(c.Response.BodyBase64)
		if !bytes.Equal(w.Body.Bytes(), want) {
			t.Fatalf("body %q", w.Body.String())
		}
	}
	if c.Response.Body != nil || c.Response.Keys != nil {
		var got map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
			t.Fatalf("body is not a JSON object: %q", w.Body.String())
		}
		for k, v := range c.Response.Body {
			if !jsonEqual(got[k], v) {
				t.Fatalf("body[%s] = %v, want %v (%s)", k, got[k], v, w.Body.String())
			}
		}
		if c.Response.Keys != nil {
			keys := make([]string, 0, len(got))
			for k := range got {
				keys = append(keys, k)
			}
			sort.Strings(keys)
			want := append([]string(nil), c.Response.Keys...)
			sort.Strings(want)
			if !reflect.DeepEqual(keys, want) {
				t.Fatalf("keys %v, want %v", keys, want)
			}
		}
	}
	if a := c.After; a != nil {
		if a.DockerUnchanged {
			if m := h.f.Mutations(); len(m) > 0 {
				t.Fatalf("docker changed: %v", m)
			}
		}
		for rel, content := range a.Files {
			if got := h.files.get(rel); got != content {
				t.Fatalf("file %s = %q, want %q", rel, got, content)
			}
		}
		if a.Recompute && h.fw.count() == 0 {
			t.Fatal("no firewall recompute")
		}
	}
}

func jsonEqual(a, b any) bool {
	ja, _ := json.Marshal(a)
	jb, _ := json.Marshal(b)
	return bytes.Equal(ja, jb)
}

const contractDir = "../../testdata/api-contract"

func loadContract(t *testing.T) map[string][]contractCase {
	out := map[string][]contractCase{}
	err := filepath.WalkDir(contractDir, func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || !strings.HasSuffix(p, ".json") {
			return err
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		var c contractCase
		dec := json.NewDecoder(bytes.NewReader(b))
		dec.DisallowUnknownFields()
		if err := dec.Decode(&c); err != nil {
			return fmt.Errorf("%s: %w", p, err)
		}
		dir := filepath.Base(filepath.Dir(p))
		out[dir] = append(out[dir], c)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return out
}

// covers: L2 05§5 every contract sample against the real handlers
func TestContract(t *testing.T) {
	all := loadContract(t)
	if len(all) == 0 {
		t.Fatal("no contract samples")
	}
	dirs := make([]string, 0, len(all))
	for d := range all {
		dirs = append(dirs, d)
	}
	sort.Strings(dirs)
	total := 0
	for _, dir := range dirs {
		for _, c := range all[dir] {
			total++
			c := c
			t.Run(dir+"/"+c.Name, func(t *testing.T) {
				h := newHarness(t)
				h.run(t, c)
			})
		}
	}
	if total < 150 {
		t.Fatalf("only %d samples", total)
	}
}

// covers: 05§5 coverage: every endpoint has a success sample; every error code and reason a sample
func TestContractCoverage(t *testing.T) {
	all := loadContract(t)
	h := newHarness(t)
	success := map[string]bool{}
	codes := map[string]bool{}
	reasons := map[string]bool{}
	for _, cases := range all {
		for _, c := range cases {
			if c.Response.Status < 300 {
				success[routeOf(h.srv, c.Request.Method, c.Request.Path)] = true
			}
			if e, ok := c.Response.Body["error"].(string); ok {
				codes[e] = true
			}
			if r, ok := c.Response.Body["reason"].(string); ok {
				reasons[r] = true
			}
		}
	}
	for _, r := range h.srv.Routes() {
		if !success[r] {
			t.Errorf("no success sample for %s", r)
		}
	}
	for _, c := range []string{"invalid_request", "unauthorized", "forbidden", "not_found", "method_not_allowed", "conflict",
		"too_large", "unprocessable", "docker_error", "busy", "disk_quota_unavailable", "unavailable", "timeout"} {
		if !codes[c] {
			t.Errorf("no sample for error %s", c)
		}
	}
	for _, r := range []string{"controller_unguarded", "image_not_allowed", "load_forbidden", "image_not_guarded", "image_not_gateway",
		"mount_source_rejected", "policy", "container", "network", "volume", "image", "path", "gateway", "ownership_mismatch",
		"resource_in_use", "exists", "not_running", "upgrade_in_progress", "gateway_not_compose", "uplink_missing",
		"subnet_overlap", "mount_source_replaced", "not_regular_file", "too_large", "pull_failed", "load_failed",
		"helper_failed", "job_failed", "output_too_large", "compose_failed", "starting", "exec_timeout", "job_timeout"} {
		if !reasons[r] {
			t.Errorf("no sample for reason %s", r)
		}
	}
}

func routeOf(s *Server, method, path string) string {
	if i := strings.IndexByte(path, '?'); i >= 0 {
		path = path[:i]
	}
	for _, r := range s.routes {
		if _, ok := match(r.segs, path); ok && r.method == method {
			return r.method + " " + r.pattern
		}
	}
	return ""
}
