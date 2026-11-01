// Package fakedocker is an in-memory Docker Engine API server for tests:
// the API handlers, the contract samples and the dockerapi client all run
// against it. It implements only the calls of 03 §5.2 and records every
// request so tests can assert that a rejected call changed nothing.
package fakedocker

import (
	"archive/tar"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"path"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// File is a file in a container or image.
type File struct {
	Data []byte
	Dir  bool
	Link string // symlink target
}

// Mount is a container mount.
type Mount struct {
	Type        string `json:"Type"`
	Name        string `json:"Name,omitempty"`
	Source      string `json:"Source"`
	Destination string `json:"Destination"`
	Mode        string `json:"Mode"`
	RW          bool   `json:"RW"`
	Propagation string `json:"Propagation"`
}

// Container is a fake container.
type Container struct {
	ID, Name     string
	Image        string // image id
	ConfigImage  string // reference used at create
	User         string
	Labels       map[string]string
	Env          []string
	Status       string // created, running, exited
	Pid          int
	StartedAt    string
	Created      string
	ExitCode     int
	RestartCount int
	Health       string // "" = no healthcheck
	NetworkMode  string
	Mounts       []Mount
	Networks     map[string]string // network name → ipv4
	Entrypoint   []string
	Cmd          []string
	Spec         json.RawMessage
	Stdout       []byte
	Stderr       []byte
	Files        map[string]File
	Hang         bool // a job that never exits by itself

	done chan struct{}
}

// Network is a fake network.
type Network struct {
	ID, Name string
	Driver   string
	Internal bool
	Labels   map[string]string
	Options  map[string]string
	Subnet   string
	Gateway  string
}

// Volume is a fake volume.
type Volume struct {
	Name    string
	Driver  string
	Labels  map[string]string
	Options map[string]string
}

// Image is a fake image.
type Image struct {
	ID       string
	RepoTags []string
	Labels   map[string]string
	Env      []string
	Files    map[string]File
}

// ExecFunc produces an exec's output.
type ExecFunc func(c *Container, argv []string, user string) (stdout, stderr []byte, code int, delay time.Duration)

// Fake is the daemon.
type Fake struct {
	mu         sync.Mutex
	Containers map[string]*Container
	Networks   map[string]*Network
	Volumes    map[string]*Volume
	Images     map[string]*Image // by id
	Requests   []string

	Version    string
	APIVersion string
	NoQuota    bool
	Exec       ExecFunc
	OnStart    func(c *Container)
	Pullable   map[string]string // "repo:tag" or "repo@digest" → image id
	LoadLines  []string
	LoadError  string
	LoadedBody []byte
	FailPaths  map[string]int // "METHOD /path" prefix → status
	nextPid    int
	execs      map[string]*execState
	subs       []chan []byte
	srv        *httptest.Server
}

type execState struct {
	c    *Container
	argv []string
	user string
	code int
	done bool
}

// New returns an empty daemon.
func New() *Fake {
	return &Fake{
		Containers: map[string]*Container{}, Networks: map[string]*Network{}, Volumes: map[string]*Volume{},
		Images: map[string]*Image{}, Version: "29.5.2", APIVersion: "1.54", nextPid: 1000,
		execs: map[string]*execState{}, Pullable: map[string]string{}, FailPaths: map[string]int{},
	}
}

// RandID returns 64 hex digits.
func RandID() string {
	var b [32]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// Start serves the fake on a loopback TCP listener.
func (f *Fake) Start() *httptest.Server {
	f.srv = httptest.NewServer(f)
	return f.srv
}

// Dial connects to the started server (for dockerapi.NewDialer).
func (f *Fake) Dial(ctx context.Context) (net.Conn, error) {
	var d net.Dialer
	return d.DialContext(ctx, "tcp", f.srv.Listener.Addr().String())
}

// Close stops the server.
func (f *Fake) Close() {
	f.mu.Lock()
	for _, s := range f.subs {
		close(s)
	}
	f.subs = nil
	f.mu.Unlock()
	if f.srv != nil {
		f.srv.CloseClientConnections()
		f.srv.Close()
	}
}

// Mutations returns the recorded non-GET requests.
func (f *Fake) Mutations() []string {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []string
	for _, r := range f.Requests {
		if !strings.HasPrefix(r, "GET ") {
			out = append(out, r)
		}
	}
	return out
}

// ResetRequests clears the request log.
func (f *Fake) ResetRequests() {
	f.mu.Lock()
	f.Requests = nil
	f.mu.Unlock()
}

// AddImage registers an image under refs.
func (f *Fake) AddImage(id string, labels map[string]string, refs ...string) *Image {
	f.mu.Lock()
	defer f.mu.Unlock()
	if !strings.HasPrefix(id, "sha256:") {
		id = "sha256:" + id
	}
	img := &Image{ID: id, RepoTags: refs, Labels: labels, Files: map[string]File{}}
	f.Images[id] = img
	return img
}

// AddNetwork registers a network.
func (f *Fake) AddNetwork(n *Network) *Network {
	f.mu.Lock()
	defer f.mu.Unlock()
	if n.ID == "" {
		n.ID = RandID()
	}
	if n.Driver == "" {
		n.Driver = "bridge"
	}
	if n.Gateway == "" && n.Subnet != "" {
		p := netip.MustParsePrefix(n.Subnet)
		n.Gateway = p.Addr().Next().String()
	}
	if n.Labels == nil {
		n.Labels = map[string]string{}
	}
	if n.Options == nil {
		n.Options = map[string]string{}
	}
	f.Networks[n.ID] = n
	return n
}

// AddVolume registers a volume.
func (f *Fake) AddVolume(v *Volume) *Volume {
	f.mu.Lock()
	defer f.mu.Unlock()
	if v.Driver == "" {
		v.Driver = "local"
	}
	if v.Labels == nil {
		v.Labels = map[string]string{}
	}
	f.Volumes[v.Name] = v
	return v
}

// AddContainer registers a container (running when Status is "running").
func (f *Fake) AddContainer(c *Container) *Container {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.addContainer(c)
	return c
}

func (f *Fake) addContainer(c *Container) {
	if c.ID == "" {
		c.ID = RandID()
	}
	if c.Labels == nil {
		c.Labels = map[string]string{}
	}
	if c.Networks == nil {
		c.Networks = map[string]string{}
	}
	if c.Files == nil {
		c.Files = map[string]File{"/": {Dir: true}, "/tmp": {Dir: true}}
	}
	if c.Status == "" {
		c.Status = "created"
	}
	if c.Created == "" {
		c.Created = time.Now().UTC().Format(time.RFC3339Nano)
	}
	c.done = make(chan struct{})
	if c.Status == "running" {
		f.nextPid++
		c.Pid = f.nextPid
		if c.StartedAt == "" {
			c.StartedAt = time.Now().UTC().Format(time.RFC3339Nano)
		}
	} else {
		close(c.done)
	}
	f.Containers[c.ID] = c
}

// Container finds a container by id or name.
func (f *Fake) Container(idOrName string) *Container {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.container(idOrName)
}

func (f *Fake) container(idOrName string) *Container {
	if c, ok := f.Containers[idOrName]; ok {
		return c
	}
	for _, c := range f.Containers {
		if c.Name == idOrName || (len(idOrName) >= 12 && strings.HasPrefix(c.ID, idOrName)) {
			return c
		}
	}
	return nil
}

// Network finds a network by id or name.
func (f *Fake) Network(idOrName string) *Network {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.network(idOrName)
}

func (f *Fake) network(idOrName string) *Network {
	if n, ok := f.Networks[idOrName]; ok {
		return n
	}
	for _, n := range f.Networks {
		if n.Name == idOrName {
			return n
		}
	}
	return nil
}

func (f *Fake) image(ref string) *Image {
	if img, ok := f.Images[ref]; ok {
		return img
	}
	if img, ok := f.Images["sha256:"+ref]; ok {
		return img
	}
	q := ref
	if !strings.Contains(path.Base(q), ":") && !strings.Contains(q, "@") {
		q += ":latest"
	}
	for _, img := range f.Images {
		for _, t := range img.RepoTags {
			if t == ref || t == q {
				return img
			}
		}
	}
	return nil
}

// Do runs fn under the lock (tests mutate state through it).
func (f *Fake) Do(fn func()) {
	f.mu.Lock()
	defer f.mu.Unlock()
	fn()
}

// Emit sends an event to every subscriber.
func (f *Fake) Emit(typ, action, id string, attrs map[string]string) {
	b, _ := json.Marshal(map[string]any{"Type": typ, "Action": action,
		"Actor": map[string]any{"ID": id, "Attributes": attrs}, "time": time.Now().Unix(), "timeNano": time.Now().UnixNano()})
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, s := range f.subs {
		select {
		case s <- b:
		default:
		}
	}
}

// DropEvents closes every event stream (simulates a dockerd restart).
func (f *Fake) DropEvents() {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, s := range f.subs {
		close(s)
	}
	f.subs = nil
}

// Subscribers is the number of open event streams.
func (f *Fake) Subscribers() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.subs)
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func errMsg(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"message": msg})
}

func (f *Fake) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Path
	if p != "/version" {
		rest, ok := strings.CutPrefix(p, "/v"+f.APIVersion)
		if !ok {
			if i := strings.Index(p[1:], "/"); i > 0 && strings.HasPrefix(p, "/v1.") {
				rest = p[i+1:]
			} else {
				errMsg(w, 400, "missing version")
				return
			}
		}
		p = rest
	}
	f.mu.Lock()
	f.Requests = append(f.Requests, r.Method+" "+p)
	for k, code := range f.FailPaths {
		if strings.HasPrefix(r.Method+" "+p, k) {
			f.mu.Unlock()
			errMsg(w, code, "injected failure")
			return
		}
	}
	f.mu.Unlock()
	seg := strings.Split(strings.Trim(p, "/"), "/")
	q := r.URL.Query()
	switch {
	case r.Method == "GET" && p == "/version":
		writeJSON(w, 200, map[string]string{"Version": f.Version, "ApiVersion": f.APIVersion, "MinAPIVersion": "1.40"})
	case seg[0] == "containers":
		f.containers(w, r, seg, q)
	case seg[0] == "exec":
		f.execRoute(w, r, seg)
	case seg[0] == "networks":
		f.networks(w, r, seg)
	case seg[0] == "volumes":
		f.volumes(w, r, seg, q)
	case seg[0] == "images":
		f.images(w, r, p, q)
	case seg[0] == "events":
		f.events(w, r)
	default:
		errMsg(w, 404, "page not found")
	}
}

// ---- containers ----

func (f *Fake) inspect(c *Container) map[string]any {
	nets := map[string]any{}
	for name, ip := range c.Networks {
		n := f.network(name)
		nid, plen := "", 24
		if n != nil {
			nid = n.ID
			if pp, err := netip.ParsePrefix(n.Subnet); err == nil {
				plen = pp.Bits()
			}
		}
		ep := map[string]any{"NetworkID": nid, "EndpointID": "", "IPAddress": "", "IPPrefixLen": 0, "IPAMConfig": nil}
		if ip != "" {
			ep["IPAMConfig"] = map[string]string{"IPv4Address": ip}
		}
		if c.Status == "running" {
			ep["EndpointID"] = "ep" + c.ID[:12] + nid[:min(8, len(nid))]
			ep["IPAddress"] = ip
			ep["IPPrefixLen"] = plen
		}
		nets[name] = ep
	}
	state := map[string]any{"Status": c.Status, "Running": c.Status == "running", "Pid": 0, "ExitCode": c.ExitCode,
		"StartedAt": c.StartedAt}
	if c.Status == "running" {
		state["Pid"] = c.Pid
	}
	if c.Health != "" {
		state["Health"] = map[string]any{"Status": c.Health}
	}
	mounts := c.Mounts
	if mounts == nil {
		mounts = []Mount{}
	}
	labels := c.Labels
	return map[string]any{
		"Id": c.ID, "Name": "/" + c.Name, "Image": c.Image, "Created": c.Created, "RestartCount": c.RestartCount,
		"Path": strings.Join(c.Entrypoint, " "), "Args": []string{},
		"State":           state,
		"Config":          map[string]any{"Image": c.ConfigImage, "Labels": labels, "Env": c.Env, "User": c.User},
		"HostConfig":      map[string]any{"NetworkMode": c.NetworkMode},
		"Mounts":          mounts,
		"NetworkSettings": map[string]any{"Networks": nets},
	}
}

func matchLabel(labels map[string]string, filter string) bool {
	k, v, hasV := strings.Cut(filter, "=")
	got, ok := labels[k]
	return ok && (!hasV || got == v)
}

func (f *Fake) containers(w http.ResponseWriter, r *http.Request, seg []string, q map[string][]string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(seg) == 2 && seg[1] == "json" && r.Method == "GET" {
		var filters map[string][]string
		if v := firstQ(q, "filters"); v != "" {
			_ = json.Unmarshal([]byte(v), &filters)
		}
		all := firstQ(q, "all") == "1" || firstQ(q, "all") == "true"
		var out []map[string]any
		ids := make([]string, 0, len(f.Containers))
		for id := range f.Containers {
			ids = append(ids, id)
		}
		sort.Strings(ids)
		for _, id := range ids {
			c := f.Containers[id]
			if !all && c.Status != "running" {
				continue
			}
			if !f.matches(c, filters) {
				continue
			}
			ms := c.Mounts
			if ms == nil {
				ms = []Mount{}
			}
			out = append(out, map[string]any{"Id": c.ID, "Names": []string{"/" + c.Name}, "Image": c.ConfigImage,
				"State": c.Status, "Labels": c.Labels, "Mounts": ms})
		}
		if out == nil {
			out = []map[string]any{}
		}
		writeJSON(w, 200, out)
		return
	}
	if len(seg) == 2 && seg[1] == "create" && r.Method == "POST" {
		f.create(w, r, firstQ(q, "name"))
		return
	}
	if len(seg) < 2 {
		errMsg(w, 404, "not found")
		return
	}
	c := f.container(seg[1])
	if c == nil {
		errMsg(w, 404, "No such container: "+seg[1])
		return
	}
	if len(seg) == 2 && r.Method == "DELETE" {
		if c.Status == "running" && firstQ(q, "force") != "1" {
			errMsg(w, 409, "container is running")
			return
		}
		f.stop(c, 0)
		delete(f.Containers, c.ID)
		w.WriteHeader(204)
		return
	}
	action := seg[2]
	switch {
	case action == "json" && r.Method == "GET":
		writeJSON(w, 200, f.inspect(c))
	case action == "start" && r.Method == "POST":
		if c.Status == "running" {
			w.WriteHeader(304)
			return
		}
		if c.NetworkMode != "" && !strings.HasPrefix(c.NetworkMode, "container:") && c.NetworkMode != "none" {
			if f.network(c.NetworkMode) == nil {
				errMsg(w, 404, "network "+c.NetworkMode+" not found")
				return
			}
		}
		f.run(c)
		w.WriteHeader(204)
	case (action == "stop" || action == "kill") && r.Method == "POST":
		if c.Status != "running" {
			if action == "kill" {
				errMsg(w, 409, "container is not running")
				return
			}
			w.WriteHeader(304)
			return
		}
		code := 0
		if action == "kill" {
			code = 137
		}
		f.stop(c, code)
		w.WriteHeader(204)
	case action == "restart" && r.Method == "POST":
		if c.Status == "running" {
			f.stop(c, 0)
		}
		f.run(c)
		c.RestartCount++
		w.WriteHeader(204)
	case action == "wait" && r.Method == "POST":
		done := c.done
		f.mu.Unlock()
		select {
		case <-done:
		case <-r.Context().Done():
			f.mu.Lock()
			return
		}
		f.mu.Lock()
		writeJSON(w, 200, map[string]any{"StatusCode": c.ExitCode})
	case action == "top" && r.Method == "GET":
		if c.Status != "running" {
			errMsg(w, 409, "container is not running")
			return
		}
		writeJSON(w, 200, map[string]any{"Titles": []string{"PID", "COMMAND"}, "Processes": [][]string{{"1", "tini"}, {"7", "worker"}}})
	case action == "logs" && r.Method == "GET":
		w.Header().Set("Content-Type", "application/vnd.docker.multiplexed-stream")
		w.WriteHeader(200)
		if firstQ(q, "stdout") == "1" {
			_, _ = w.Write(Frame(1, c.Stdout))
		}
		if firstQ(q, "stderr") == "1" {
			_, _ = w.Write(Frame(2, c.Stderr))
		}
	case action == "archive" && r.Method == "GET":
		f.archiveGet(w, c, firstQ(q, "path"))
	case action == "archive" && r.Method == "PUT":
		f.archivePut(w, r, c, firstQ(q, "path"))
	case action == "exec" && r.Method == "POST":
		if c.Status != "running" {
			errMsg(w, 409, "Container "+c.ID+" is not running")
			return
		}
		var body struct {
			Cmd  []string
			User string
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		id := RandID()
		f.execs[id] = &execState{c: c, argv: body.Cmd, user: body.User}
		writeJSON(w, 201, map[string]string{"Id": id})
	default:
		errMsg(w, 404, "not found")
	}
}

func (f *Fake) run(c *Container) {
	f.nextPid++
	c.Pid = f.nextPid
	c.Status = "running"
	c.ExitCode = 0
	c.StartedAt = time.Now().UTC().Format(time.RFC3339Nano)
	c.done = make(chan struct{})
	if f.OnStart != nil {
		f.OnStart(c)
	}
	if c.Labels["io.sup2api.ccgateway.guard-job"] != "" && !c.Hang {
		f.stop(c, c.ExitCode)
	}
}

func (f *Fake) stop(c *Container, code int) {
	if c.Status == "running" {
		c.Status = "exited"
		c.ExitCode = code
		c.Pid = 0
		close(c.done)
	}
}

// Stop stops a container from a test.
func (f *Fake) Stop(id string, code int) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if c := f.container(id); c != nil {
		f.stop(c, code)
	}
}

func (f *Fake) matches(c *Container, filters map[string][]string) bool {
	for k, vals := range filters {
		ok := false
		for _, v := range vals {
			switch k {
			case "label":
				ok = ok || matchLabel(c.Labels, v)
			case "name":
				ok = ok || strings.Contains(c.Name, v)
			case "volume":
				for _, m := range c.Mounts {
					if m.Name == v || m.Source == v {
						ok = true
					}
				}
			case "network":
				for name := range c.Networks {
					if n := f.network(name); n != nil && (n.ID == v || n.Name == v) {
						ok = true
					}
				}
			}
		}
		if !ok {
			return false
		}
	}
	return true
}

func (f *Fake) create(w http.ResponseWriter, r *http.Request, name string) {
	raw, _ := io.ReadAll(r.Body)
	var spec struct {
		Image      string
		Entrypoint []string
		Cmd        []string
		User       string
		Env        []string
		Labels     map[string]string
		HostConfig struct {
			Binds       []string
			NetworkMode string
		}
		NetworkingConfig *struct {
			EndpointsConfig map[string]struct {
				IPAMConfig struct{ IPv4Address string }
			}
		}
	}
	if err := json.Unmarshal(raw, &spec); err != nil {
		errMsg(w, 400, "bad body")
		return
	}
	if name != "" && f.container(name) != nil {
		errMsg(w, 409, "Conflict. The container name \"/"+name+"\" is already in use")
		return
	}
	img := f.image(spec.Image)
	if img == nil {
		errMsg(w, 404, "No such image: "+spec.Image)
		return
	}
	c := &Container{Name: name, Image: img.ID, ConfigImage: spec.Image, User: spec.User, Labels: spec.Labels,
		Env: spec.Env, NetworkMode: spec.HostConfig.NetworkMode, Entrypoint: spec.Entrypoint, Cmd: spec.Cmd, Spec: raw,
		Files: map[string]File{}}
	for k, v := range img.Files {
		c.Files[k] = v
	}
	if _, ok := c.Files["/"]; !ok {
		c.Files["/"] = File{Dir: true}
	}
	for _, b := range spec.HostConfig.Binds {
		parts := strings.Split(b, ":")
		if len(parts) != 3 {
			errMsg(w, 400, "invalid bind")
			return
		}
		m := Mount{Source: parts[0], Destination: parts[1], Mode: parts[2], RW: parts[2] == "rw"}
		if strings.HasPrefix(parts[0], "/") {
			m.Type, m.Propagation = "bind", "rprivate"
		} else {
			v, ok := f.Volumes[parts[0]]
			if !ok {
				v = &Volume{Name: parts[0], Driver: "local", Labels: map[string]string{}}
				f.Volumes[parts[0]] = v
			}
			m.Type, m.Name, m.Source = "volume", v.Name, "/var/lib/docker/volumes/"+v.Name+"/_data"
		}
		c.Mounts = append(c.Mounts, m)
	}
	if spec.HostConfig.NetworkMode != "" && spec.HostConfig.NetworkMode != "none" && !strings.HasPrefix(spec.HostConfig.NetworkMode, "container:") {
		ip := ""
		if spec.NetworkingConfig != nil {
			ip = spec.NetworkingConfig.EndpointsConfig[spec.HostConfig.NetworkMode].IPAMConfig.IPv4Address
		}
		c.Networks = map[string]string{spec.HostConfig.NetworkMode: ip}
	}
	f.addContainer(c)
	writeJSON(w, 201, map[string]any{"Id": c.ID, "Warnings": []string{}})
}

// Frame encodes one multiplexed stream frame.
func Frame(stream byte, data []byte) []byte {
	if len(data) == 0 {
		return nil
	}
	h := make([]byte, 8, 8+len(data))
	h[0] = stream
	binary.BigEndian.PutUint32(h[4:], uint32(len(data)))
	return append(h, data...)
}

func (f *Fake) archiveGet(w http.ResponseWriter, c *Container, p string) {
	file, ok := c.Files[p]
	if !ok {
		errMsg(w, 404, "Could not find the file "+p+" in container "+c.Name)
		return
	}
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	base := path.Base(p)
	switch {
	case file.Dir:
		_ = tw.WriteHeader(&tar.Header{Name: base + "/", Typeflag: tar.TypeDir, Mode: 0o755})
		for k, v := range c.Files {
			if strings.HasPrefix(k, p+"/") && !v.Dir {
				_ = tw.WriteHeader(&tar.Header{Name: base + "/" + strings.TrimPrefix(k, p+"/"), Typeflag: tar.TypeReg, Mode: 0o644, Size: int64(len(v.Data))})
				_, _ = tw.Write(v.Data)
			}
		}
	case file.Link != "":
		_ = tw.WriteHeader(&tar.Header{Name: base, Typeflag: tar.TypeSymlink, Linkname: file.Link, Mode: 0o777})
	default:
		_ = tw.WriteHeader(&tar.Header{Name: base, Typeflag: tar.TypeReg, Mode: 0o644, Size: int64(len(file.Data))})
		_, _ = tw.Write(file.Data)
	}
	_ = tw.Close()
	stat, _ := json.Marshal(map[string]any{"name": base, "size": len(file.Data), "mode": 420})
	w.Header().Set("X-Docker-Container-Path-Stat", base64.StdEncoding.EncodeToString(stat))
	w.Header().Set("Content-Type", "application/x-tar")
	w.WriteHeader(200)
	_, _ = w.Write(buf.Bytes())
}

func (f *Fake) archivePut(w http.ResponseWriter, r *http.Request, c *Container, p string) {
	dir, ok := c.Files[p]
	if !ok || !dir.Dir {
		errMsg(w, 404, "Could not find the file "+p+" in container "+c.Name)
		return
	}
	f.mu.Unlock()
	data, err := io.ReadAll(r.Body)
	f.mu.Lock()
	if err != nil {
		errMsg(w, 400, "short body")
		return
	}
	tr := tar.NewReader(bytes.NewReader(data))
	for {
		h, err := tr.Next()
		if err != nil {
			break
		}
		b, _ := io.ReadAll(tr)
		target := path.Join(p, h.Name)
		if h.Typeflag == tar.TypeDir {
			c.Files[target] = File{Dir: true}
		} else {
			c.Files[target] = File{Data: b}
		}
	}
	w.WriteHeader(200)
}

// ---- exec ----

func (f *Fake) execRoute(w http.ResponseWriter, r *http.Request, seg []string) {
	f.mu.Lock()
	if len(seg) != 3 {
		f.mu.Unlock()
		errMsg(w, 404, "not found")
		return
	}
	e, ok := f.execs[seg[1]]
	if !ok {
		f.mu.Unlock()
		errMsg(w, 404, "No such exec instance")
		return
	}
	if seg[2] == "json" {
		defer f.mu.Unlock()
		writeJSON(w, 200, map[string]any{"Running": !e.done, "ExitCode": e.code})
		return
	}
	if e.c.Status != "running" {
		f.mu.Unlock()
		errMsg(w, 409, "container not running")
		return
	}
	fn := f.Exec
	c := e.c
	f.mu.Unlock()
	stdout, stderr, code := []byte(strings.Join(e.argv, " ")+"\n"), []byte(nil), 0
	var delay time.Duration
	if fn != nil {
		stdout, stderr, code, delay = fn(c, e.argv, e.user)
	}
	w.Header().Set("Content-Type", "application/vnd.docker.raw-stream")
	w.WriteHeader(200)
	if fl, ok := w.(http.Flusher); ok {
		fl.Flush()
	}
	if delay > 0 {
		select {
		case <-time.After(delay):
		case <-r.Context().Done():
			return
		}
	}
	// stdout, then stderr, then stdout again when both are present: the
	// guard must keep the arrival order (R5).
	_, _ = w.Write(Frame(1, stdout))
	_, _ = w.Write(Frame(2, stderr))
	f.mu.Lock()
	e.code, e.done = code, true
	f.mu.Unlock()
}

// ---- networks ----

func (f *Fake) netInspect(n *Network) map[string]any {
	cs := map[string]any{}
	for _, c := range f.Containers {
		if ip, ok := c.Networks[n.Name]; ok && c.Status == "running" {
			plen := 24
			if p, err := netip.ParsePrefix(n.Subnet); err == nil {
				plen = p.Bits()
			}
			cs[c.ID] = map[string]any{"Name": c.Name, "IPv4Address": ip + "/" + strconv.Itoa(plen)}
		}
	}
	cfg := []map[string]string{}
	if n.Subnet != "" {
		cfg = append(cfg, map[string]string{"Subnet": n.Subnet, "Gateway": n.Gateway})
	}
	return map[string]any{"Name": n.Name, "Id": n.ID, "Driver": n.Driver, "Internal": n.Internal, "EnableIPv6": false,
		"Labels": n.Labels, "Options": n.Options, "IPAM": map[string]any{"Driver": "default", "Config": cfg},
		"Containers": cs}
}

func (f *Fake) networks(w http.ResponseWriter, r *http.Request, seg []string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	switch {
	case len(seg) == 1 && r.Method == "GET":
		var filters map[string][]string
		if v := r.URL.Query().Get("filters"); v != "" {
			_ = json.Unmarshal([]byte(v), &filters)
		}
		out := []map[string]any{}
		ids := make([]string, 0, len(f.Networks))
		for id := range f.Networks {
			ids = append(ids, id)
		}
		sort.Strings(ids)
		for _, id := range ids {
			n := f.Networks[id]
			ok := true
			for _, v := range filters["label"] {
				ok = ok && matchLabel(n.Labels, v)
			}
			if ok {
				ni := f.netInspect(n)
				ni["Containers"] = map[string]any{}
				out = append(out, ni)
			}
		}
		writeJSON(w, 200, out)
	case len(seg) == 2 && seg[1] == "create" && r.Method == "POST":
		var spec struct {
			Name     string
			Driver   string
			Internal bool
			Labels   map[string]string
			IPAM     struct {
				Config []struct{ Subnet, Gateway string }
			}
		}
		if err := json.NewDecoder(r.Body).Decode(&spec); err != nil {
			errMsg(w, 400, "bad body")
			return
		}
		if f.network(spec.Name) != nil {
			errMsg(w, 409, "network with name "+spec.Name+" already exists")
			return
		}
		n := &Network{ID: RandID(), Name: spec.Name, Driver: spec.Driver, Internal: spec.Internal, Labels: spec.Labels, Options: map[string]string{}}
		if len(spec.IPAM.Config) > 0 {
			n.Subnet, n.Gateway = spec.IPAM.Config[0].Subnet, spec.IPAM.Config[0].Gateway
		}
		f.Networks[n.ID] = n
		writeJSON(w, 201, map[string]string{"Id": n.ID})
	case len(seg) >= 2:
		n := f.network(seg[1])
		if n == nil {
			errMsg(w, 404, "network "+seg[1]+" not found")
			return
		}
		switch {
		case len(seg) == 2 && r.Method == "GET":
			writeJSON(w, 200, f.netInspect(n))
		case len(seg) == 2 && r.Method == "DELETE":
			for _, c := range f.Containers {
				if _, ok := c.Networks[n.Name]; ok && c.Status == "running" {
					errMsg(w, 403, "error while removing network: network has active endpoints")
					return
				}
			}
			delete(f.Networks, n.ID)
			w.WriteHeader(204)
		case len(seg) == 3 && (seg[2] == "connect" || seg[2] == "disconnect"):
			var body struct {
				Container      string
				EndpointConfig struct{ IPAMConfig struct{ IPv4Address string } }
			}
			_ = json.NewDecoder(r.Body).Decode(&body)
			c := f.container(body.Container)
			if c == nil {
				errMsg(w, 404, "No such container")
				return
			}
			if seg[2] == "connect" {
				if _, ok := c.Networks[n.Name]; ok {
					errMsg(w, 403, "endpoint already exists in network")
					return
				}
				c.Networks[n.Name] = body.EndpointConfig.IPAMConfig.IPv4Address
			} else {
				if _, ok := c.Networks[n.Name]; !ok {
					errMsg(w, 403, "container is not connected to the network")
					return
				}
				delete(c.Networks, n.Name)
			}
			w.WriteHeader(200)
		default:
			errMsg(w, 404, "not found")
		}
	default:
		errMsg(w, 404, "not found")
	}
}

// ---- volumes ----

func volInspect(v *Volume) map[string]any {
	return map[string]any{"Name": v.Name, "Driver": v.Driver, "Labels": v.Labels, "Options": v.Options,
		"Mountpoint": "/var/lib/docker/volumes/" + v.Name + "/_data", "Scope": "local"}
}

func (f *Fake) volumes(w http.ResponseWriter, r *http.Request, seg []string, q map[string][]string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	switch {
	case len(seg) == 1 && r.Method == "GET":
		var filters map[string][]string
		if v := firstQ(q, "filters"); v != "" {
			_ = json.Unmarshal([]byte(v), &filters)
		}
		out := []map[string]any{}
		keys := make([]string, 0, len(f.Volumes))
		for k := range f.Volumes {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			v := f.Volumes[k]
			ok := true
			for _, l := range filters["label"] {
				ok = ok && matchLabel(v.Labels, l)
			}
			if ok {
				out = append(out, volInspect(v))
			}
		}
		writeJSON(w, 200, map[string]any{"Volumes": out, "Warnings": nil})
	case len(seg) == 2 && seg[1] == "create" && r.Method == "POST":
		var spec struct {
			Name       string
			Driver     string
			DriverOpts map[string]string
			Labels     map[string]string
		}
		_ = json.NewDecoder(r.Body).Decode(&spec)
		if spec.DriverOpts["size"] != "" && f.NoQuota {
			errMsg(w, 500, "create "+spec.Name+": quota size requested but no quota support")
			return
		}
		if v, ok := f.Volumes[spec.Name]; ok {
			writeJSON(w, 201, volInspect(v))
			return
		}
		v := &Volume{Name: spec.Name, Driver: spec.Driver, Labels: spec.Labels, Options: spec.DriverOpts}
		if v.Labels == nil {
			v.Labels = map[string]string{}
		}
		f.Volumes[v.Name] = v
		writeJSON(w, 201, volInspect(v))
	case len(seg) == 2:
		v, ok := f.Volumes[seg[1]]
		if !ok {
			errMsg(w, 404, "get "+seg[1]+": no such volume")
			return
		}
		if r.Method == "DELETE" {
			for _, c := range f.Containers {
				for _, m := range c.Mounts {
					if m.Name == v.Name {
						errMsg(w, 409, "remove "+v.Name+": volume is in use")
						return
					}
				}
			}
			delete(f.Volumes, v.Name)
			w.WriteHeader(204)
			return
		}
		writeJSON(w, 200, volInspect(v))
	default:
		errMsg(w, 404, "not found")
	}
}

// ---- images ----

func (f *Fake) images(w http.ResponseWriter, r *http.Request, p string, q map[string][]string) {
	switch {
	case r.Method == "GET" && strings.HasSuffix(p, "/json"):
		ref := strings.TrimSuffix(strings.TrimPrefix(p, "/images/"), "/json")
		f.mu.Lock()
		defer f.mu.Unlock()
		img := f.image(ref)
		if img == nil {
			errMsg(w, 404, "No such image: "+ref)
			return
		}
		tags := img.RepoTags
		if tags == nil {
			tags = []string{}
		}
		writeJSON(w, 200, map[string]any{"Id": img.ID, "RepoTags": tags, "RepoDigests": []string{},
			"Config": map[string]any{"Env": img.Env, "Labels": img.Labels}, "Os": "linux"})
	case r.Method == "POST" && p == "/images/create":
		ref := firstQ(q, "fromImage")
		if t := firstQ(q, "tag"); t != "" {
			ref += ":" + t
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		f.mu.Lock()
		id, ok := f.Pullable[ref]
		if ok {
			if img := f.Images[id]; img != nil {
				img.RepoTags = appendUnique(img.RepoTags, ref)
			} else {
				f.Images[id] = &Image{ID: id, RepoTags: []string{ref}, Labels: map[string]string{}, Files: map[string]File{}}
			}
		}
		f.mu.Unlock()
		_, _ = io.WriteString(w, `{"status":"Pulling from x"}`+"\n")
		if !ok {
			_, _ = io.WriteString(w, `{"errorDetail":{"message":"manifest unknown"},"error":"manifest unknown"}`+"\n")
			return
		}
		_, _ = io.WriteString(w, `{"status":"Digest: sha256:00"}`+"\n"+`{"status":"Status: Downloaded newer image"}`+"\n")
	case r.Method == "POST" && p == "/images/load":
		body, _ := io.ReadAll(r.Body)
		f.mu.Lock()
		f.LoadedBody = body
		lines, lerr := f.LoadLines, f.LoadError
		for _, l := range lines {
			if name, ok := strings.CutPrefix(l, "Loaded image: "); ok {
				if img := f.image(name); img == nil {
					id := "sha256:" + RandID()
					f.Images[id] = &Image{ID: id, RepoTags: []string{name}, Labels: map[string]string{}, Files: map[string]File{}}
				}
			}
		}
		f.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		for _, l := range lines {
			b, _ := json.Marshal(map[string]string{"stream": l + "\n"})
			_, _ = w.Write(append(b, '\n'))
		}
		if lerr != "" {
			b, _ := json.Marshal(map[string]any{"errorDetail": map[string]string{"message": lerr}, "error": lerr})
			_, _ = w.Write(append(b, '\n'))
		}
	default:
		errMsg(w, 404, "not found")
	}
}

func appendUnique(list []string, s string) []string {
	for _, x := range list {
		if x == s {
			return list
		}
	}
	return append(list, s)
}

// ---- events ----

func (f *Fake) events(w http.ResponseWriter, r *http.Request) {
	ch := make(chan []byte, 64)
	f.mu.Lock()
	f.subs = append(f.subs, ch)
	f.mu.Unlock()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
	fl, _ := w.(http.Flusher)
	if fl != nil {
		fl.Flush()
	}
	for {
		select {
		case <-r.Context().Done():
			f.mu.Lock()
			for i, s := range f.subs {
				if s == ch {
					f.subs = append(f.subs[:i], f.subs[i+1:]...)
					break
				}
			}
			f.mu.Unlock()
			return
		case b, ok := <-ch:
			if !ok {
				return
			}
			_, _ = w.Write(append(b, '\n'))
			if fl != nil {
				fl.Flush()
			}
		}
	}
}

func firstQ(q map[string][]string, k string) string {
	if v := q[k]; len(v) > 0 {
		return v[0]
	}
	return ""
}

// MustJSON marshals or panics (test helper).
func MustJSON(v any) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(fmt.Sprint(err))
	}
	return b
}
