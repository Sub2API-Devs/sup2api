// Package fakeguard is an in-memory guard for tests (02 §8.2, 05 §5): the
// guard HTTP API of 03 §3 served from a model of containers, networks,
// volumes, images and the shared gateway, with the same validation rules as
// the guard's policy package.
//
// Use Client() for a guardapi.Client wired to the fake in process (the real
// HTTP client and wire format, no network), or Handler() to serve it.
//
// Scripting:
//   - images: AddImage (local), AddPullable (pull succeeds), files inside
//     images for images/file;
//   - exec: OnExec(target, argvPrefix, fn) answers matching execs in an app
//     container ("app:<aid>", "app:*") or the gateway ("gateway"); without a
//     hook, a small emulation answers sha256sum, chmod, stat, mv, rm, mkdir,
//     xray api lso/lsi/ado/adi/adrules/rmo/rmi, ip -j -4 addr, ss and the nft
//     replacement; anything else exits 0 with no output;
//   - jobs: OnJob(fn); default exit 0, no output;
//   - faults: Fail(route, Fault{...}) makes the Nth matching call answer an
//     error (or a transport failure);
//   - lifecycle: RestartContainer, StopContainer, RecreateGatewayNow,
//     RestartGateway, SetQuotaSupported, ...
//
// Every call is recorded (Calls) with its route template, e.g.
// "PUT /v1/accounts/{aid}/app".
package fakeguard

import (
	"fmt"
	"net/netip"
	"sort"
	"strings"
	"sync"
	"time"

	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
)

// Token is the default guard token of a fake.
const Token = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"

// RuntimeHostRoot is where the guard keeps resolv.conf and app.nft.
const RuntimeHostRoot = "/opt/ccgateway-runtime"

// Features are the guard features the fake announces.
var Features = []string{"account-state-v1", "exec-combined-v1", "gateway-compose-v1", "raw-inspect-v1",
	"jobs-v1", "load-gzip-v1", "upgrade-compose-v1"}

type file struct {
	data     []byte
	mode     int64
	uid, gid int
}

type mount struct {
	typ, name, source, destination, driver, mode, propagation string
	rw                                                        bool
}

type endpoint struct {
	network string
	ip      string
}

type container struct {
	id, name, image, configImage, user string
	created, startedAt, status         string
	path                               string
	args                               []string // nil encodes as null
	labels                             map[string]string
	env                                []string
	networkMode                        string
	endpoints                          []endpoint // attach order
	mounts                             []mount
	files                              map[string]*file
	dirs                               map[string]bool
	processes                          [][]string
	managedBy                          string // gateway only
}

type network struct {
	id, name, created string
	internal          bool
	labels            map[string]string
	subnet            netip.Prefix
	gateway           string
}

type volume struct {
	name, driver, created string
	options               map[string]string
	labels                map[string]string
}

type image struct {
	id       string
	repoTags []string
	env      []string
	labels   map[string]string
	files    map[string][]byte
}

// ImageSpec describes an image added to the fake.
type ImageSpec struct {
	ID     string // sha256:<hex>; generated when empty
	Env    []string
	Labels map[string]string
	Files  map[string][]byte // path -> content, for images/file
}

type xrayState struct {
	ready     int // lso failures left before the API answers
	outbounds []string
	inbounds  []string
	rules     any
}

// Guard is the fake.
type Guard struct {
	mu sync.Mutex

	prefix        string
	token         string
	controlSubnet netip.Prefix
	hostRoutes    []netip.Prefix

	containers map[string]*container
	networks   map[string]*network
	volumes    map[string]*volume
	images     map[string]*image // by reference and by ID
	pullable   map[string]*image
	pullRepos  []string // nil: any repository may be pulled by tag
	loadRepos  []string // nil: any name may be loaded

	gatewayImage  string
	gatewayFiles  map[string][]byte
	resolv        map[string]string
	firewall      map[string]FirewallRecord
	xray          xrayState
	nftApplied    string
	quota         bool
	upgrade       guardapi.UpgradeStatus
	health        guardapi.Health
	establishedSS string
	listening     bool

	seq int

	hooksMu   sync.Mutex
	execHooks []execHook
	jobHook   func(aid string, job guardapi.Job) (int, []byte)
	loadHook  func(data []byte) ([]guardapi.LoadedImage, error)
	jobs      []JobRecord
	faults    []*faultRule
	calls     []Call
}

// FirewallRecord is the last PUT firewall of an account.
type FirewallRecord struct {
	Rules          string
	DefaultGateway string
	HelperImage    string
	AppID          string
}

// JobRecord is one POST jobs.
type JobRecord struct {
	AID string
	Job guardapi.Job
}

// New is an empty fake with prefix "ccg" and a gateway image
// "ccgateway-egress:test" (labelled shared-egress=1).
func New() *Guard {
	g := &Guard{
		prefix:        names.DefaultPrefix,
		token:         Token,
		controlSubnet: netip.MustParsePrefix("172.29.255.0/29"),
		containers:    map[string]*container{},
		networks:      map[string]*network{},
		volumes:       map[string]*volume{},
		images:        map[string]*image{},
		pullable:      map[string]*image{},
		gatewayFiles:  map[string][]byte{},
		resolv:        map[string]string{},
		firewall:      map[string]FirewallRecord{},
		quota:         true,
		listening:     true,
		gatewayImage:  "ccgateway-egress:test",
		upgrade:       guardapi.UpgradeStatus{State: "idle"},
	}
	g.health = guardapi.Health{Version: "fake", Prefix: g.prefix, Features: append([]string(nil), Features...),
		Docker: "29.5.2", Firewall: "ok", Controller: "ok"}
	g.addImageLocked("ccgateway-egress:test", ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1"}})
	return g
}

// Prefix is the resource name prefix.
func (g *Guard) Prefix() string { return g.prefix }

// SetPrefix changes the prefix (before any resource exists).
func (g *Guard) SetPrefix(p string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.prefix = p
	g.health.Prefix = p
}

func (g *Guard) nextID() string {
	g.seq++
	return fmt.Sprintf("%016x%048x", g.seq, g.seq*7919)
}

func (g *Guard) nextTime() string {
	g.seq++
	t := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC).Add(time.Duration(g.seq) * time.Second)
	return t.Format("2006-01-02T15:04:05.000000000Z")
}

// AddImage makes ref a local image.
func (g *Guard) AddImage(ref string, spec ImageSpec) string {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.addImageLocked(ref, spec)
}

func (g *Guard) addImageLocked(ref string, spec ImageSpec) string {
	img := g.newImage(ref, spec)
	g.images[ref] = img
	g.images[img.id] = img
	return img.id
}

func (g *Guard) newImage(ref string, spec ImageSpec) *image {
	id := spec.ID
	if id == "" {
		g.seq++
		id = fmt.Sprintf("sha256:%064x", 0xabc000000+g.seq)
	}
	labels := map[string]string{}
	for k, v := range spec.Labels {
		labels[k] = v
	}
	files := map[string][]byte{}
	for k, v := range spec.Files {
		files[k] = append([]byte(nil), v...)
	}
	img := &image{id: id, env: append([]string(nil), spec.Env...), labels: labels, files: files}
	if ref != "" && !strings.HasPrefix(ref, "sha256:") {
		img.repoTags = []string{ref}
	}
	return img
}

// AddPullable makes ref pullable (not yet local).
func (g *Guard) AddPullable(ref string, spec ImageSpec) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.pullable[ref] = g.newImage(ref, spec)
}

// RemoveImage forgets a local image reference.
func (g *Guard) RemoveImage(ref string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	delete(g.images, ref)
}

// ImageID is the ID of a local image ("" when absent).
func (g *Guard) ImageID(ref string) string {
	g.mu.Lock()
	defer g.mu.Unlock()
	if img := g.images[ref]; img != nil {
		return img.id
	}
	return ""
}

// SetPullRepos restricts tag pulls to these repositories (03 §3.6.2).
func (g *Guard) SetPullRepos(repos ...string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.pullRepos = repos
}

// SetLoadRepos restricts image loads to these repositories.
func (g *Guard) SetLoadRepos(repos ...string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.loadRepos = repos
}

// SetQuotaSupported makes new volumes fail with "no quota support" when false.
func (g *Guard) SetQuotaSupported(ok bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.quota = ok
}

// SetHostRoutes sets the host routing table (GET subnets).
func (g *Guard) SetHostRoutes(cidrs ...string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.hostRoutes = nil
	for _, c := range cidrs {
		g.hostRoutes = append(g.hostRoutes, netip.MustParsePrefix(c))
	}
}

// SetGatewayImage is the image compose uses for a new gateway.
func (g *Guard) SetGatewayImage(ref string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.gatewayImage = ref
}

// SetHealth replaces the health answer.
func (g *Guard) SetHealth(h guardapi.Health) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.health = h
}

// SetXrayReadyAfter makes `xray api lso` fail n times after the next gateway start.
func (g *Guard) SetXrayReadyAfter(n int) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.xray.ready = n
}

// SetGatewayListening controls `ss -lnt | grep -q :15001`.
func (g *Guard) SetGatewayListening(ok bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.listening = ok
}

// SetEstablished is the output of `ss -Hnt state established` in the gateway.
func (g *Guard) SetEstablished(out string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.establishedSS = out
}

// AddNetwork adds a Docker network directly (a foreign network, or an
// account network prepared for a test). labels may be nil.
func (g *Guard) AddNetwork(name, subnet string, internal bool, labels map[string]string) string {
	g.mu.Lock()
	defer g.mu.Unlock()
	p := netip.MustParsePrefix(subnet).Masked()
	n := &network{id: g.nextID(), name: name, created: g.nextTime(), internal: internal, labels: copyMap(labels),
		subnet: p, gateway: hostAt(p, 1).String()}
	g.networks[name] = n
	return n.id
}

// ContainerSpec describes a container added directly.
type ContainerSpec struct {
	Name        string
	Image       string // reference; must be local
	User        string
	Labels      map[string]string
	Env         []string
	Path        string
	Args        []string
	Status      string // default running
	NetworkMode string
	Networks    map[string]string // network name -> IPv4
	Volumes     map[string]string // volume name -> destination
	Binds       map[string]string // host path -> destination (read-only)
}

// AddContainer adds a container directly (a foreign one, a legacy helper,
// an app container left by Python).
func (g *Guard) AddContainer(spec ContainerSpec) string {
	g.mu.Lock()
	defer g.mu.Unlock()
	img := g.images[spec.Image]
	imageID := spec.Image
	if img != nil {
		imageID = img.id
	}
	c := &container{id: g.nextID(), name: spec.Name, image: imageID, configImage: spec.Image, user: spec.User,
		created: g.nextTime(), path: spec.Path, args: spec.Args, labels: copyMap(spec.Labels),
		env: append([]string(nil), spec.Env...), networkMode: spec.NetworkMode, status: spec.Status,
		files: map[string]*file{}, dirs: defaultDirs()}
	if c.status == "" {
		c.status = "running"
	}
	if c.status == "running" {
		c.startedAt = g.nextTime()
	} else {
		c.startedAt = "0001-01-01T00:00:00Z"
	}
	for _, net := range sortedKeys(spec.Networks) {
		c.endpoints = append(c.endpoints, endpoint{network: net, ip: spec.Networks[net]})
		if c.networkMode == "" {
			c.networkMode = net
		}
	}
	for _, vol := range sortedKeys(spec.Volumes) {
		c.mounts = append(c.mounts, mount{typ: "volume", name: vol, source: "/var/lib/docker/volumes/" + vol + "/_data",
			destination: spec.Volumes[vol], driver: "local", mode: "rw", rw: true})
	}
	for _, src := range sortedKeys(spec.Binds) {
		c.mounts = append(c.mounts, mount{typ: "bind", source: src, destination: spec.Binds[src], mode: "ro",
			propagation: "rprivate"})
	}
	g.containers[c.name] = c
	return c.id
}

// AddVolume adds a volume directly.
func (g *Guard) AddVolume(name string, options, labels map[string]string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.volumes[name] = &volume{name: name, driver: "local", created: g.nextTime(), options: copyMap(options), labels: copyMap(labels)}
}

func defaultDirs() map[string]bool {
	return map[string]bool{"/": true, "/usr": true, "/usr/local": true, "/usr/local/bin": true, "/opt": true,
		"/opt/ccgateway": true, "/opt/ccgateway/cli": true, "/tmp": true, "/work": true, "/etc": true}
}

// PutFile writes a file into a container's file system.
func (g *Guard) PutFile(containerName, path string, data []byte, mode int64) {
	g.mu.Lock()
	defer g.mu.Unlock()
	c := g.containers[containerName]
	if c == nil {
		panic("fakeguard: no container " + containerName)
	}
	c.files[path] = &file{data: append([]byte(nil), data...), mode: mode}
	c.dirs[parentDir(path)] = true
}

// File reads a file of a container's file system.
func (g *Guard) File(containerName, path string) ([]byte, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	c := g.containers[containerName]
	if c == nil {
		return nil, false
	}
	f, ok := c.files[path]
	if !ok {
		return nil, false
	}
	return append([]byte(nil), f.data...), true
}

// FileMode is a container file's mode and owner.
func (g *Guard) FileMode(containerName, path string) (mode int64, uid, gid int, ok bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	c := g.containers[containerName]
	if c == nil || c.files[path] == nil {
		return 0, 0, 0, false
	}
	f := c.files[path]
	return f.mode, f.uid, f.gid, true
}

// Files lists a container's files.
func (g *Guard) Files(containerName string) []string {
	g.mu.Lock()
	defer g.mu.Unlock()
	c := g.containers[containerName]
	if c == nil {
		return nil
	}
	return sortedKeys(c.files)
}

// SetProcesses sets a container's process list (top), rows of [pid, comm].
func (g *Guard) SetProcesses(containerName string, rows ...[]string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if c := g.containers[containerName]; c != nil {
		c.processes = rows
	}
}

// Exists reports whether a container, network or volume exists.
func (g *Guard) Exists(name string) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.containers[name] != nil || g.networks[name] != nil || g.volumes[name] != nil
}

// ContainerNames lists every container.
func (g *Guard) ContainerNames() []string {
	g.mu.Lock()
	defer g.mu.Unlock()
	return sortedKeys(g.containers)
}

// NetworkNames lists every network.
func (g *Guard) NetworkNames() []string {
	g.mu.Lock()
	defer g.mu.Unlock()
	return sortedKeys(g.networks)
}

// VolumeNames lists every volume.
func (g *Guard) VolumeNames() []string {
	g.mu.Lock()
	defer g.mu.Unlock()
	return sortedKeys(g.volumes)
}

// Inspect is a container's raw inspect (nil when absent).
func (g *Guard) Inspect(name string) pyjson.Ordered {
	g.mu.Lock()
	defer g.mu.Unlock()
	c := g.containers[name]
	if c == nil {
		return nil
	}
	return g.rawContainer(c)
}

// ContainerStatus is a container's State.Status ("" when absent).
func (g *Guard) ContainerStatus(name string) string {
	g.mu.Lock()
	defer g.mu.Unlock()
	if c := g.containers[name]; c != nil {
		return c.status
	}
	return ""
}

// StopContainer stops a container (a crash or `docker stop`).
func (g *Guard) StopContainer(name string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if c := g.containers[name]; c != nil {
		c.status = "exited"
		if c.name == names.SharedGateway(g.prefix) {
			g.resetXray()
		}
	}
}

// RestartContainer restarts a container (new StartedAt).
func (g *Guard) RestartContainer(name string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if c := g.containers[name]; c != nil {
		c.status = "running"
		c.startedAt = g.nextTime()
		if c.name == names.SharedGateway(g.prefix) {
			g.resetXray()
		}
	}
}

// RestartGateway restarts the shared gateway: same ID, new StartedAt, the
// networks stay attached, the Xray process state is empty.
func (g *Guard) RestartGateway() { g.RestartContainer(names.SharedGateway(g.prefix)) }

// RecreateGatewayNow is compose recreating the gateway: a new container ID
// and StartedAt, attached only to its uplink, empty Xray state (02 §7.3).
func (g *Guard) RecreateGatewayNow() {
	g.mu.Lock()
	defer g.mu.Unlock()
	if c := g.containers[names.SharedGateway(g.prefix)]; c != nil {
		g.recreateGatewayLocked(c, c.configImage)
	}
}

func (g *Guard) recreateGatewayLocked(c *container, ref string) {
	img := g.images[ref]
	c.id = g.nextID()
	c.created = g.nextTime()
	c.startedAt = g.nextTime()
	c.status = "running"
	c.configImage = ref
	if img != nil {
		c.image = img.id
	}
	var keep []endpoint
	for _, e := range c.endpoints {
		if e.network == g.uplinkName() {
			keep = append(keep, e)
		}
	}
	c.endpoints = keep
	g.resetXray()
}

func (g *Guard) resetXray() {
	g.xray.outbounds, g.xray.inbounds, g.xray.rules = nil, nil, nil
	g.nftApplied = ""
}

// AddGateway creates the shared gateway directly, running, attached to a
// new uplink network; managedBy is guardapi.ManagedByCompose or ManagedByLegacy.
func (g *Guard) AddGateway(managedBy string) string {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.networks[g.uplinkName()] == nil {
		p := netip.MustParsePrefix("10.250.0.0/24")
		g.networks[g.uplinkName()] = &network{id: g.nextID(), name: g.uplinkName(), created: g.nextTime(),
			labels: map[string]string{names.LabelAccount: names.UplinkKey}, subnet: p, gateway: "10.250.0.1"}
	}
	return g.createGatewayLocked(managedBy).id
}

func (g *Guard) uplinkName() string { return names.Name(g.prefix, names.UplinkKey, "xray-uplink") }

func (g *Guard) createGatewayLocked(managedBy string) *container {
	img := g.images[g.gatewayImage]
	labels := map[string]string{names.LabelSharedOwner: g.prefix}
	if managedBy == guardapi.ManagedByCompose {
		labels["com.docker.compose.project"] = "ccgateway"
		labels["com.docker.compose.service"] = "egress"
	}
	c := &container{id: g.nextID(), name: names.SharedGateway(g.prefix), configImage: g.gatewayImage,
		created: g.nextTime(), startedAt: g.nextTime(), status: "running", labels: labels,
		path: "/usr/local/bin/xray", args: []string{"run", "-c", "/config/boot.json"},
		networkMode: g.uplinkName(), managedBy: managedBy, files: map[string]*file{}, dirs: defaultDirs(),
		mounts: []mount{{typ: "bind", source: RuntimeHostRoot + "/shared-egress", destination: "/config", mode: "ro",
			propagation: "rprivate"}}}
	if img != nil {
		c.image = img.id
	}
	up := g.networks[g.uplinkName()]
	c.endpoints = []endpoint{{network: up.name, ip: hostAt(up.subnet, 2).String()}}
	g.containers[c.name] = c
	g.resetXray()
	return c
}

// GatewayFile is a file written through PUT gateway/files.
func (g *Guard) GatewayFile(name string) ([]byte, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	b, ok := g.gatewayFiles[name]
	return append([]byte(nil), b...), ok
}

// Resolv is the resolv.conf the guard wrote for aid.
func (g *Guard) Resolv(aid string) (string, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	s, ok := g.resolv[aid]
	return s, ok
}

// Firewall is the last firewall installed for aid.
func (g *Guard) Firewall(aid string) (FirewallRecord, bool) {
	g.mu.Lock()
	defer g.mu.Unlock()
	r, ok := g.firewall[aid]
	return r, ok
}

// Jobs are the jobs run so far.
func (g *Guard) Jobs() []JobRecord {
	g.hooksMu.Lock()
	defer g.hooksMu.Unlock()
	return append([]JobRecord(nil), g.jobs...)
}

// Xray is the emulated Xray process state: loaded outbound and inbound tags
// and the last routing rules.
func (g *Guard) Xray() (outbounds, inbounds []string, rules any) {
	g.mu.Lock()
	defer g.mu.Unlock()
	return append([]string(nil), g.xray.outbounds...), append([]string(nil), g.xray.inbounds...), g.xray.rules
}

// AppliedNFT is the active.nft content the gateway last loaded.
func (g *Guard) AppliedNFT() string {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.nftApplied
}

// UpgradeRequested is the image of the last accepted controller upgrade.
func (g *Guard) UpgradeRequested() guardapi.UpgradeStatus {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.upgrade
}

// SetUpgradeState sets the controller upgrade state (running blocks
// upgrade and recreate with 409 upgrade_in_progress).
func (g *Guard) SetUpgradeState(state string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.upgrade.State = state
}

func copyMap(m map[string]string) map[string]string {
	out := map[string]string{}
	for k, v := range m {
		out[k] = v
	}
	return out
}

func sortedKeys[T any](m map[string]T) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func parentDir(p string) string {
	i := strings.LastIndexByte(p, '/')
	if i <= 0 {
		return "/"
	}
	return p[:i]
}

func hostAt(p netip.Prefix, offset uint32) netip.Addr {
	b := p.Masked().Addr().As4()
	v := uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	v += offset
	return netip.AddrFrom4([4]byte{byte(v >> 24), byte(v >> 16), byte(v >> 8), byte(v)})
}

func broadcast(p netip.Prefix) netip.Addr {
	return hostAt(p, uint32(1)<<(32-p.Bits())-1)
}
