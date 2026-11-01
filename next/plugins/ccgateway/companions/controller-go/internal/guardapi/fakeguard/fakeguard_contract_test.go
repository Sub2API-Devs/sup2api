package fakeguard_test

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"sort"
	"strings"
	"testing"

	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/names"
)

// The guard's API contract samples (05 §5): the guard runs them against its
// real handlers (companions/guard/internal/api/contract_test.go), this test
// runs the same files against FakeGuard. The types below mirror the guard's
// contractCase and setup* types field for field; an unknown field fails the
// load, so a new sample feature is noticed here.
//
// Comparison rules (what FakeGuard does not model is listed explicitly):
//   - status: exact.
//   - response.headers: exact for every header the sample names.
//   - response.body_base64: the raw body, exact.
//   - response.body: a subset match on the top-level keys (as the guard).
//   - response.keys: the exact top-level key set, except for the answers that
//     are a raw Docker inspect at the top level (201 of PUT network and PUT
//     app): there the sample's keys must all be present and FakeGuard may
//     add more (its inspects carry Docker fields the guard's fake daemon
//     does not, e.g. Created, Scope, ResolvConfPath, Platform). Nested
//     inspects are not compared beyond the sample's body keys.
//   - every JSON answer has Content-Type application/json.
//   - after.docker_unchanged: FakeGuard.DockerState() (every container,
//     network, volume inspect and image reference) is the same before and
//     after the call.
//   - after.files: "<aid>/resolv.conf" is FakeGuard.Resolv, "<aid>/app.nft"
//     the rules of FakeGuard.Firewall, "shared-egress/<name>"
//     FakeGuard.GatewayFile.
//   - after.recompute: not compared (FakeGuard has no firewall engine).
//   - setup.env and setup.controller_health: not modelled; a sample using
//     them fails this test.
//
// Setup mapping: the guard's harness values are reproduced: token
// 0123…cdef, controller address 172.29.255.2, host routes 192.168.100.0/24
// and 172.17.0.0/16, control network 172.29.255.0/29, pull whitelist
// ghcr.io/sub2api-devs/ccgateway-*, load whitelist ccgateway-* and
// ghcr.io/sub2api-devs/ccgateway-*, compose gateway image ccgateway-xray:1;
// an image ID is sha256 of its reference unless given; setup.exec answers
// every exec (stdout then stderr as the merged output, hang = the time
// limit), setup.job every job and the firewall helper.

const (
	contractDir   = "../../../../guard/testdata/api-contract"
	contractToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
	controllerIP  = "172.29.255.2"
)

type contractCase struct {
	Name     string         `json:"name"`
	Covers   string         `json:"covers,omitempty"`
	Setup    contractSetup  `json:"setup"`
	Request  contractReq    `json:"request"`
	Response contractResp   `json:"response"`
	After    *contractAfter `json:"after,omitempty"`
}

type contractSetup struct {
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

type setupImage struct {
	Ref    string            `json:"ref"`
	ID     string            `json:"id,omitempty"`
	Labels map[string]string `json:"labels,omitempty"`
	Files  map[string]string `json:"files,omitempty"`
}

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

type setupOneshot struct {
	Status  string `json:"status"`
	Network string `json:"network,omitempty"`
	Volume  string `json:"volume,omitempty"`
}

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
	StdoutBytes int    `json:"stdout_bytes,omitempty"`
	Hang        bool   `json:"hang,omitempty"`
}

type setupJob struct {
	ExitCode    int    `json:"exit_code"`
	Stdout      string `json:"stdout,omitempty"`
	StdoutBytes int    `json:"stdout_bytes,omitempty"`
	Hang        bool   `json:"hang,omitempty"`
}

type contractReq struct {
	Method      string              `json:"method"`
	Path        string              `json:"path"`
	JSON        json.RawMessage     `json:"json,omitempty"`
	Text        *string             `json:"text,omitempty"`
	BodyBase64  string              `json:"body_base64,omitempty"`
	ContentType string              `json:"content_type,omitempty"`
	Length      *int64              `json:"content_length,omitempty"`
	Chunked     bool                `json:"chunked,omitempty"`
	Auth        string              `json:"auth,omitempty"`
	Remote      string              `json:"remote,omitempty"`
	Headers     map[string][]string `json:"headers,omitempty"`
}

type contractResp struct {
	Status     int               `json:"status"`
	Body       map[string]any    `json:"body,omitempty"`
	Keys       []string          `json:"keys,omitempty"`
	Headers    map[string]string `json:"headers,omitempty"`
	BodyBase64 string            `json:"body_base64,omitempty"`
}

type contractAfter struct {
	DockerUnchanged bool              `json:"docker_unchanged,omitempty"`
	Files           map[string]string `json:"files,omitempty"`
	Recompute       bool              `json:"recompute,omitempty"`
}

type loadedCase struct {
	dir string // endpoint directory
	contractCase
}

func loadContract(t *testing.T) []loadedCase {
	t.Helper()
	var out []loadedCase
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
		out = append(out, loadedCase{dir: filepath.Base(filepath.Dir(p)), contractCase: c})
		return nil
	})
	if err != nil {
		t.Fatalf("contract samples (%s): %v", contractDir, err)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].dir < out[j].dir })
	return out
}

func contractImageID(ref string) string {
	if strings.HasPrefix(ref, "sha256:") {
		return ref
	}
	sum := sha256.Sum256([]byte(ref))
	return "sha256:" + hex.EncodeToString(sum[:])
}

// contractGuard is a FakeGuard set up as the guard's test harness and the
// sample's setup.
func contractGuard(t *testing.T, s contractSetup) *fakeguard.Guard {
	t.Helper()
	if len(s.Env) > 0 || len(s.ControllerHealth) > 0 {
		t.Fatal("setup.env / setup.controller_health are not modelled by FakeGuard")
	}
	const p = names.DefaultPrefix
	g := fakeguard.New()
	g.SetToken(contractToken)
	g.SetControllerAddr(controllerIP)
	g.SetHostRoutes("192.168.100.0/24", "172.17.0.0/16")
	g.SetPullRepos("ghcr.io/sub2api-devs/ccgateway-*")
	g.SetLoadRepos("ccgateway-*", "ghcr.io/sub2api-devs/ccgateway-*")
	g.SetGatewayImage("ccgateway-xray:1")
	g.SetControllerUnguarded(s.ControllerUnguarded)
	g.SetStarting(s.Starting)
	g.SetDiskFull(s.DiskFull)
	ensureImage := func(ref string, labels map[string]string) {
		if g.ImageID(ref) == "" {
			g.AddImage(ref, fakeguard.ImageSpec{ID: contractImageID(ref), Labels: labels})
		}
	}
	for _, img := range s.Images {
		spec := fakeguard.ImageSpec{ID: img.ID, Labels: img.Labels, Files: map[string][]byte{}}
		if spec.ID == "" {
			spec.ID = contractImageID(img.Ref)
		}
		for path, content := range img.Files {
			if content == "<dir>" {
				spec.Dirs = append(spec.Dirs, path)
			} else {
				spec.Files[path] = []byte(content)
			}
		}
		g.AddImage(img.Ref, spec)
	}
	for _, n := range s.Networks {
		role := n.Role
		if role == "" {
			role = "net"
		}
		owner := n.Owner
		if owner == "" {
			owner = n.AID
		}
		internal := role == "net"
		if n.Internal != nil {
			internal = *n.Internal
		}
		name := names.Name(p, n.AID, role)
		g.AddNetwork(name, n.Subnet, internal, map[string]string{names.LabelAccount: owner, names.LabelNetwork: "{}"})
	}
	for _, o := range s.OtherNetworks {
		g.AddNetwork(o.Name, o.Subnet, false, nil)
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
		g.AddVolume(names.Name(p, v.AID, "data"), opts, labels)
	}
	for _, c := range s.Containers {
		role, image, owner, status := c.Role, c.Image, c.Owner, c.Status
		if role == "" {
			role = "app"
		}
		if image == "" {
			image = "ccgateway-app:1"
		}
		if owner == "" {
			owner = c.AID
		}
		if status == "" {
			status = "running"
		}
		ensureImage(image, nil)
		spec := fakeguard.ContainerSpec{Name: names.Name(p, c.AID, role), Image: image, User: "1000:1000",
			Labels: map[string]string{names.LabelAccount: owner}, Status: status, NetworkMode: names.Name(p, c.AID, "net")}
		if c.IPv4 != "" {
			spec.Networks = map[string]string{names.Name(p, c.AID, "net"): c.IPv4}
		}
		mounts := c.Mounts
		if mounts == "" && role == "app" {
			mounts = "default"
		}
		if mounts == "default" || mounts == "extra" {
			spec.Volumes = map[string]string{names.Name(p, c.AID, "data"): "/work"}
			spec.Binds = map[string]string{fakeguard.RuntimeHostRoot + "/" + c.AID + "/resolv.conf": "/etc/resolv.conf"}
			if mounts == "extra" {
				spec.Binds["/etc"] = "/host-etc"
			}
		}
		g.AddContainer(spec)
		for path, content := range c.Files {
			if content == "<dir>" {
				g.MkDir(spec.Name, path)
			} else {
				g.PutFile(spec.Name, path, []byte(content), 0o644)
			}
		}
	}
	for i, o := range s.Oneshots {
		ensureImage("ccgateway-xray:1", nil)
		spec := fakeguard.ContainerSpec{Name: fmt.Sprintf("%s-oneshot-%016x", p, i+1), Image: "ccgateway-xray:1", Status: o.Status}
		if o.Network != "" {
			spec.Networks = map[string]string{names.Name(p, o.Network, "net"): ""}
		}
		if o.Volume != "" {
			spec.Volumes = map[string]string{names.Name(p, o.Volume, "data"): "/work"}
		}
		g.AddContainer(spec)
	}
	if gw := s.Gateway; gw != nil {
		image := gw.Image
		if image == "" {
			image = "ccgateway-xray:1"
		}
		ensureImage(image, map[string]string{names.LabelSharedSchema: "1"})
		managed := guardapi.ManagedByCompose
		if gw.ManagedBy == "legacy" {
			managed = guardapi.ManagedByLegacy
		}
		g.AddGatewaySpec(fakeguard.GatewaySpec{ManagedBy: managed, Owner: gw.Owner, Image: image, Status: gw.Status, Networks: gw.Networks})
	}
	for rel, state := range s.Files {
		switch {
		case state != "ok":
			g.RejectMountSource(rel, state)
		case strings.HasSuffix(rel, "/resolv.conf"):
			g.SetResolv(strings.TrimSuffix(rel, "/resolv.conf"), "nameserver 10.0.0.2\n")
		}
	}
	g.SetQuotaSupported(!s.NoQuota)
	if e := s.Exec; e != nil {
		fn := func([]string, string) (int, []byte) {
			if e.Hang {
				return fakeguard.ExitTimeout, nil
			}
			out := []byte(e.Stdout)
			if e.StdoutBytes > 0 {
				out = bytes.Repeat([]byte("x"), e.StdoutBytes)
			}
			return e.ExitCode, append(out, e.Stderr...)
		}
		g.OnExec("app:*", nil, fn)
		g.OnExec("gateway", nil, fn)
	}
	if j := s.Job; j != nil {
		g.OnJob(func(string, guardapi.Job) (int, []byte) {
			if j.Hang {
				return fakeguard.ExitTimeout, nil
			}
			out := []byte(j.Stdout)
			if j.StdoutBytes > 0 {
				out = bytes.Repeat([]byte("x"), j.StdoutBytes)
			}
			return j.ExitCode, out
		})
		g.OnFirewall(func(string, fakeguard.FirewallRecord) int {
			if j.Hang {
				return fakeguard.ExitTimeout
			}
			return j.ExitCode
		})
	}
	for _, ref := range s.Pullable {
		g.AddPullable(ref, fakeguard.ImageSpec{ID: contractImageID(ref)})
	}
	if s.LoadLines != nil || s.LoadError != "" {
		lines, loadErr := s.LoadLines, s.LoadError
		g.OnLoad(func([]byte) ([]guardapi.LoadedImage, error) {
			if loadErr != "" {
				return nil, errors.New(loadErr)
			}
			var out []guardapi.LoadedImage
			for _, l := range lines {
				if id, ok := strings.CutPrefix(l, "Loaded image ID: "); ok {
					out = append(out, guardapi.LoadedImage{ID: id, Tags: []string{}})
				} else if ref, ok := strings.CutPrefix(l, "Loaded image: "); ok {
					out = append(out, guardapi.LoadedImage{ID: contractImageID(ref), Tags: []string{ref}})
				}
			}
			return out, nil
		})
	}
	g.SetComposeFails(s.ComposeFails...)
	g.SetLifecycleBusy(s.LifecycleBusy)
	g.ResetCalls()
	return g
}

// contractRequest builds the request as the guard's harness does.
func contractRequest(t *testing.T, r contractReq) *http.Request {
	t.Helper()
	var raw []byte
	ctype := r.ContentType
	switch {
	case r.JSON != nil:
		var b bytes.Buffer
		if err := json.Compact(&b, r.JSON); err != nil {
			t.Fatal(err)
		}
		raw = b.Bytes()
		if ctype == "" {
			ctype = "application/json"
		}
	case r.Text != nil:
		raw = []byte(*r.Text)
	case r.BodyBase64 != "":
		b, err := base64.StdEncoding.DecodeString(r.BodyBase64)
		if err != nil {
			t.Fatal(err)
		}
		raw = b
	}
	req := httptest.NewRequest(r.Method, r.Path, bytes.NewReader(raw))
	req.ContentLength = int64(len(raw))
	if r.Chunked {
		req.ContentLength = -1
		req.TransferEncoding = []string{"chunked"}
	}
	if r.Length != nil {
		req.ContentLength = *r.Length
	}
	if ctype != "" {
		req.Header.Set("Content-Type", ctype)
	}
	switch r.Auth {
	case "":
		req.Header.Set("Authorization", "Bearer "+contractToken)
	case "none":
	default:
		req.Header.Set("Authorization", r.Auth)
	}
	for k, vs := range r.Headers {
		req.Header.Del(k)
		for _, v := range vs {
			req.Header.Add(k, v)
		}
	}
	req.RemoteAddr = controllerIP + ":40000"
	if r.Remote != "" {
		req.RemoteAddr = r.Remote
	}
	return req
}

func jsonEqual(a, b any) bool {
	ja, _ := json.Marshal(a)
	jb, _ := json.Marshal(b)
	return bytes.Equal(ja, jb)
}

// rawInspectAnswer: the answer is a Docker inspect at the top level.
func rawInspectAnswer(c loadedCase) bool {
	return c.Response.Status == 201 && (c.dir == "accounts-network-put" || c.dir == "accounts-app-put")
}

func checkContract(t *testing.T, g *fakeguard.Guard, c loadedCase) {
	t.Helper()
	before := g.DockerState()
	w := httptest.NewRecorder()
	g.Handler().ServeHTTP(w, contractRequest(t, c.Request))
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
			t.Fatalf("body %q, want %q", w.Body.String(), want)
		}
	}
	if c.Response.Body != nil || c.Response.Keys != nil {
		if ct := w.Header().Get("Content-Type"); ct != "application/json" {
			t.Fatalf("Content-Type %q", ct)
		}
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
			if rawInspectAnswer(c) {
				for _, k := range want {
					if _, ok := got[k]; !ok {
						t.Fatalf("inspect key %s missing: %v", k, keys)
					}
				}
			} else if !reflect.DeepEqual(keys, want) {
				t.Fatalf("keys %v, want %v", keys, want)
			}
		}
	}
	a := c.After
	if a == nil {
		return
	}
	if a.DockerUnchanged {
		if after := g.DockerState(); after != before {
			t.Fatalf("Docker state changed:\n%s\n---\n%s", before, after)
		}
	}
	for rel, want := range a.Files {
		var got string
		switch {
		case strings.HasSuffix(rel, "/resolv.conf"):
			got, _ = g.Resolv(strings.TrimSuffix(rel, "/resolv.conf"))
		case strings.HasSuffix(rel, "/app.nft"):
			fw, _ := g.Firewall(strings.TrimSuffix(rel, "/app.nft"))
			got = fw.Rules
		case strings.HasPrefix(rel, "shared-egress/"):
			b, _ := g.GatewayFile(strings.TrimPrefix(rel, "shared-egress/"))
			got = string(b)
		default:
			t.Fatalf("after.files %s is not modelled", rel)
		}
		if got != want {
			t.Fatalf("file %s = %q, want %q", rel, got, want)
		}
	}
}

// covers: 05-§5 03-§3 (FakeGuard answers every guard API contract sample as the guard does)
func TestContractSamples(t *testing.T) {
	cases := loadContract(t)
	if len(cases) < 252 {
		t.Fatalf("only %d contract samples", len(cases))
	}
	for _, c := range cases {
		c := c
		t.Run(c.dir+"/"+c.Name, func(t *testing.T) {
			checkContract(t, contractGuard(t, c.Setup), c)
		})
	}
}

// covers: 05-§5 (every route FakeGuard serves has a success sample, and every error code and reason of the guard a sample)
func TestContractCoverage(t *testing.T) {
	cases := loadContract(t)
	success := map[string]bool{}
	codes, reasons := map[string]bool{}, map[string]bool{}
	for _, c := range cases {
		path, query, _ := strings.Cut(c.Request.Path, "?")
		if c.Response.Status < 300 {
			success[c.Request.Method+" "+path+"?"+query] = true
		}
		if e, ok := c.Response.Body["error"].(string); ok {
			codes[e] = true
		}
		if r, ok := c.Response.Body["reason"].(string); ok {
			reasons[r] = true
		}
	}
	// One request per route template FakeGuard knows; each must match a
	// success sample's method and path shape.
	for route, re := range map[string]string{
		"GET /v1/health": `GET /v1/health\?`, "GET /v1/subnets": `GET /v1/subnets\?`, "GET /v1/inventory": `GET /v1/inventory\?`,
		"GET /v1/images/inspect": `GET /v1/images/inspect\?`, "POST /v1/images/pull": `POST /v1/images/pull\?`,
		"GET /v1/images/file": `GET /v1/images/file\?`, "POST /v1/images/load": `POST /v1/images/load\?`,
		"GET /v1/accounts/{aid}": `GET /v1/accounts/\d+\?$`, "GET /v1/accounts/{aid}?fields=state": `GET /v1/accounts/\d+\?fields=state`,
		"PUT /v1/accounts/{aid}/network": `PUT /v1/accounts/\d+/network\?`, "DELETE /v1/accounts/{aid}/network": `DELETE /v1/accounts/\d+/network\?`,
		"PUT /v1/accounts/{aid}/volume": `PUT /v1/accounts/\d+/volume\?`, "DELETE /v1/accounts/{aid}/volume": `DELETE /v1/accounts/\d+/volume\?`,
		"PUT /v1/accounts/{aid}/app": `PUT /v1/accounts/\d+/app\?`, "POST /v1/accounts/{aid}/app/{action}": `POST /v1/accounts/\d+/app/(start|stop|restart)\?`,
		"DELETE /v1/accounts/{aid}/containers/{suffix}": `DELETE /v1/accounts/\d+/containers/`,
		"POST /v1/accounts/{aid}/app/exec":              `POST /v1/accounts/\d+/app/exec\?`,
		"GET /v1/accounts/{aid}/app/archive":            `GET /v1/accounts/\d+/app/archive\?`, "PUT /v1/accounts/{aid}/app/archive": `PUT /v1/accounts/\d+/app/archive\?`,
		"GET /v1/accounts/{aid}/app/top": `GET /v1/accounts/\d+/app/top\?`, "PUT /v1/accounts/{aid}/resolv": `PUT /v1/accounts/\d+/resolv\?`,
		"PUT /v1/accounts/{aid}/firewall": `PUT /v1/accounts/\d+/firewall\?`, "POST /v1/accounts/{aid}/jobs": `POST /v1/accounts/\d+/jobs\?`,
		"GET /v1/gateway": `GET /v1/gateway\?`, "POST /v1/gateway/ensure": `POST /v1/gateway/ensure\?`,
		"POST /v1/gateway/recreate": `POST /v1/gateway/recreate\?`, "POST /v1/gateway/exec": `POST /v1/gateway/exec\?`,
		"PUT /v1/gateway/networks/{aid}": `PUT /v1/gateway/networks/\d+\?`, "DELETE /v1/gateway/networks/{aid}": `DELETE /v1/gateway/networks/\d+\?`,
		"PUT /v1/gateway/files/{name}": `PUT /v1/gateway/files/[a-z.]+\?`, "POST /v1/controller/upgrade": `POST /v1/controller/upgrade\?`,
		"GET /v1/controller/upgrade": `GET /v1/controller/upgrade\?`,
	} {
		found := false
		for s := range success {
			if matchRoute(re, s) {
				found = true
			}
		}
		if !found {
			t.Errorf("no success sample for %s", route)
		}
	}
	for _, c := range []string{"invalid_request", "unauthorized", "forbidden", "not_found", "method_not_allowed", "conflict",
		"too_large", "unprocessable", "docker_error", "busy", "disk_quota_unavailable", "unavailable", "timeout"} {
		if !codes[c] {
			t.Errorf("no sample for error %s", c)
		}
	}
	for _, r := range []string{guardapi.ReasonControllerUnguarded, guardapi.ReasonImageNotAllowed, guardapi.ReasonLoadForbidden,
		guardapi.ReasonImageNotGuarded, guardapi.ReasonImageNotGateway, guardapi.ReasonMountSourceRejected, guardapi.ReasonPolicy,
		guardapi.ReasonContainer, guardapi.ReasonNetwork, guardapi.ReasonVolume, guardapi.ReasonImage, guardapi.ReasonPath,
		guardapi.ReasonGateway, guardapi.ReasonOwnershipMismatch, guardapi.ReasonResourceInUse, guardapi.ReasonExists,
		guardapi.ReasonNotRunning, guardapi.ReasonUpgradeInProgress, guardapi.ReasonGatewayNotCompose, guardapi.ReasonUplinkMissing,
		guardapi.ReasonSubnetOverlap, guardapi.ReasonMountSourceReplaced, guardapi.ReasonNotRegularFile, guardapi.ReasonTooLarge,
		guardapi.ReasonPullFailed, guardapi.ReasonLoadFailed, guardapi.ReasonHelperFailed, guardapi.ReasonJobFailed,
		guardapi.ReasonOutputTooLarge, guardapi.ReasonComposeFailed, guardapi.ReasonStarting, guardapi.ReasonExecTimeout,
		guardapi.ReasonJobTimeout} {
		if !reasons[r] {
			t.Errorf("no sample for reason %s", r)
		}
	}
}

func matchRoute(re, s string) bool { return regexp.MustCompile("^" + re).MatchString(s) }
