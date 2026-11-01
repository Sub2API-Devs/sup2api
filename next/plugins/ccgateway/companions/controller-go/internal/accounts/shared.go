package accounts

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/xrayconf"
)

// Xray API readiness after a gateway (re)start (G3): 40 x 0.25 s.
const (
	xrayTries = 40
	xrayPause = 250 * time.Millisecond
)

// shared is the shared Xray gateway's orchestration (Python SharedEgress).
//
// op (sharedOp) serialises every change of the gateway: configure, sync,
// fence, remove, collect, ensure. mu (sharedMu) guards data, boot and the
// loaded sets; it is a leaf held without I/O. Writers hold op and take mu
// around each mutation; the request path only reads under mu (BUG-1 fixed).
type shared struct {
	m  *Manager
	op chan struct{}

	mu          sync.RWMutex
	data        *store.SharedState
	boot        [2]string // (gateway ID, StartedAt) whose Xray inventory is loaded
	loadedNodes map[string]bool
	loadedPorts map[string]bool

	kick chan struct{}
}

func newShared(m *Manager, data *store.SharedState) *shared {
	return &shared{m: m, op: make(chan struct{}, 1), data: data,
		loadedNodes: map[string]bool{}, loadedPorts: map[string]bool{}, kick: make(chan struct{}, 1)}
}

// lock takes sharedOp until ctx ends.
func (s *shared) lock(ctx context.Context) error {
	select {
	case s.op <- struct{}{}:
		return nil
	default:
	}
	select {
	case s.op <- struct{}{}:
		return nil
	case <-ctx.Done():
		return errs.Wrap(errs.RuntimeBusy, "shared gateway is busy", ctx.Err())
	}
}

func (s *shared) unlock() { <-s.op }

// save writes the whole state (S33). Caller holds op.
func (s *shared) save() error {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.m.st.SaveShared(s.data)
}

// errCommand is the RuntimeError of a failed gateway command: never its
// output (configuration and credentials stay out of errors).
func errCommand(argv []string) error { return errors.New("shared egress command failed: " + argv[0]) }

func (s *shared) exec(ctx context.Context, argv []string) ([]byte, error) {
	r, err := s.m.g.GatewayExec(ctx, argv)
	if err != nil {
		return nil, err
	}
	if r.ExitCode != 0 {
		return nil, errCommand(argv)
	}
	return r.Output, nil
}

// api is `xray api <action>`; obj is written to /config/operation.json first.
func (s *shared) api(ctx context.Context, action string, obj any, tag string) ([]byte, error) {
	if obj != nil {
		b, err := pyjson.Marshal(obj)
		if err != nil {
			return nil, err
		}
		if err := s.m.g.WriteGatewayFile(ctx, guardapi.FileOperation, b); err != nil {
			return nil, err
		}
	}
	return s.exec(ctx, xrayconf.APICommand(action, obj != nil, tag))
}

// ensure (02 §7.2): the running gateway; compose starts or creates it
// unless existingOnly; a new boot reloads the Xray inventory. Caller holds op.
func (s *shared) ensure(ctx context.Context, existingOnly bool, policy *netplan.Policy) (*guardapi.Container, error) {
	gw, err := s.m.g.Gateway(ctx)
	if err != nil {
		return nil, err
	}
	c := gw.Container
	if c == nil || !c.Running() {
		if existingOnly {
			if c == nil {
				return nil, errGatewayMissing
			}
			return nil, errors.New("shared gateway stopped during cleanup")
		}
		if c == nil {
			// Only for a new gateway: a running one holds the active DNS map.
			if err := s.writeBootFiles(ctx); err != nil {
				return nil, err
			}
		}
		if c, err = s.ensureGateway(ctx, policy); err != nil {
			return nil, err
		}
		if c == nil || !c.Running() {
			return nil, errors.New("shared gateway did not start")
		}
	}
	boot := [2]string{c.ID, c.StartedAt}
	s.mu.RLock()
	same := boot == s.boot
	s.mu.RUnlock()
	if !same {
		if err := s.loadInventory(ctx); err != nil {
			return nil, err
		}
		s.mu.Lock()
		s.boot = boot
		s.mu.Unlock()
	}
	return c, nil
}

func (s *shared) writeBootFiles(ctx context.Context) error {
	empty := &store.Bindings{}
	nft, err := xrayconf.Firewall(empty, &store.Nodes{})
	if err != nil {
		return err
	}
	files := []struct {
		name string
		data []byte
	}{
		{guardapi.FileBootJSON, pyjson.MustMarshal(xrayconf.Base())},
		{guardapi.FileBootNFT, []byte(nft)},
		{guardapi.FileDNSJSON, pyjson.MustMarshal(pyjson.Ordered{})},
	}
	for _, f := range files {
		if err := s.m.g.WriteGatewayFile(ctx, f.name, f.data); err != nil {
			return err
		}
	}
	return nil
}

// ensureGateway is POST gateway/ensure, with an uplink allocated from the
// triggering account's policy when the guard asks for one (G1, G2).
func (s *shared) ensureGateway(ctx context.Context, policy *netplan.Policy) (*guardapi.Container, error) {
	res, err := s.m.g.EnsureGateway(ctx, nil)
	if err == nil {
		return res.Gateway, nil
	}
	if !errors.Is(err, guardapi.ErrUplinkMissing) {
		return nil, err
	}
	p := netplan.Policy{Pool: "10.0.0.0/8", Allocation: netplan.Random}
	if policy != nil {
		p = *policy
	}
	// Lock order: account -> sharedOp -> network.
	s.m.networkMu.Lock()
	defer s.m.networkMu.Unlock()
	for attempt := 0; ; attempt++ {
		subnet, err := s.m.freeSubnet(ctx, p)
		if err != nil {
			return nil, err
		}
		res, err = s.m.g.EnsureGateway(ctx, &guardapi.UplinkRequest{Subnet: subnet.String(),
			Gateway: hostAt(subnet, 1).String(), PolicyLabel: p.Label()})
		if err == nil {
			return res.Gateway, nil
		}
		if attempt > 0 || !errors.Is(err, guardapi.ErrSubnetOverlap) {
			return nil, err
		}
	}
}

// loadInventory (G3): wait for the Xray API, then read which outbounds and
// inbounds the process already has. Caller holds op.
func (s *shared) loadInventory(ctx context.Context) error {
	lso := xrayconf.APICommand("lso", false, "")
	var out []byte
	ok := false
	for i := 0; i < xrayTries; i++ {
		r, err := s.m.g.GatewayExec(ctx, lso)
		if err != nil {
			return err
		}
		if r.ExitCode == 0 {
			out, ok = r.Output, true
			break
		}
		if err := s.m.clock.Sleep(ctx, xrayPause); err != nil {
			return err
		}
	}
	if !ok {
		return errors.New("Xray unavailable")
	}
	nodes, err := tagsIn(out, "outbounds")
	if err != nil {
		return err
	}
	in, err := s.api(ctx, "lsi", nil, "")
	if err != nil {
		return err
	}
	ports, err := tagsIn(in, "inbounds")
	if err != nil {
		return err
	}
	s.mu.Lock()
	s.loadedNodes, s.loadedPorts = nodes, ports
	s.mu.Unlock()
	return nil
}

func tagsIn(raw []byte, key string) (map[string]bool, error) {
	o, err := pyjson.DecodeObject(raw)
	if err != nil {
		return nil, fmt.Errorf("xray api answer: %w", err)
	}
	out := map[string]bool{}
	list, _ := field(o, key).([]any)
	for _, item := range list {
		if it, ok := item.(pyjson.Ordered); ok {
			if t, ok := field(it, "tag").(string); ok {
				out[t] = true
			}
		}
	}
	return out, nil
}

// attach (G4): the gateway on the account's network (its address there,
// or the first free host address), the account container's identity, and
// the gateway's interface on that network. Caller holds op.
func (s *shared) attach(ctx context.Context, aid string, st *store.AccountState, c *guardapi.Container) (gateway, netID, appID, iface string, err error) {
	acct, err := s.m.g.Account(ctx, aid)
	if err != nil {
		return "", "", "", "", err
	}
	net := acct.Network
	if net == nil {
		return "", "", "", "", fmt.Errorf("%s not found", s.m.name(aid, "net"))
	}
	if e, ok := net.Containers[c.ID]; ok {
		gateway, _, _ = strings.Cut(e.IPv4Address, "/")
	} else {
		subnet, err := net.FirstSubnet()
		if err != nil {
			return "", "", "", "", err
		}
		used := map[string]bool{hostAt(subnet, 1).String(): true, st.AppIP: true, st.GatewayIP: true}
		for _, a := range net.EndpointAddresses() {
			used[a] = true
		}
		subnet = subnet.Masked()
		size := uint32(1) << (32 - subnet.Bits())
		for off := uint32(1); off+1 < size; off++ {
			if a := hostAt(subnet, off).String(); !used[a] {
				gateway = a
				break
			}
		}
		if gateway == "" {
			return "", "", "", "", errors.New("no free address on the account network")
		}
		if err := s.m.g.ConnectGateway(ctx, aid, gateway); err != nil {
			return "", "", "", "", err
		}
	}
	app := acct.App
	if app == nil {
		return "", "", "", "", errNoApp(s.m.name(aid, "app"))
	}
	if app.IP(net.Name) != st.AppIP {
		return "", "", "", "", errors.New("account network identity changed")
	}
	out, err := s.exec(ctx, []string{"ip", "-j", "-4", "addr"})
	if err != nil {
		return "", "", "", "", err
	}
	iface, err = interfaceOf(out, gateway)
	if err != nil {
		return "", "", "", "", err
	}
	return gateway, net.ID, app.ID, iface, nil
}

func interfaceOf(raw []byte, address string) (string, error) {
	v, err := pyjson.Decode(raw)
	if err != nil {
		return "", err
	}
	list, _ := v.([]any)
	for _, item := range list {
		x, _ := item.(pyjson.Ordered)
		infos, _ := field(x, "addr_info").([]any)
		for _, info := range infos {
			if pyjson.Equal(field(orderedOf(info, true), "local"), address) {
				name, _ := field(x, "ifname").(string)
				return name, nil
			}
		}
	}
	return "", errors.New("gateway interface not found")
}

// sync (G8): deactivate bindings whose container or network changed, load
// missing outbounds and inbounds, replace the routes, dns.json, active.nft
// and the nft table. Caller holds op.
func (s *shared) sync(ctx context.Context) error {
	for _, aid := range s.data.Bindings.Keys() {
		b, _ := s.data.Bindings.Get(aid)
		if !b.Active {
			continue
		}
		acct, err := s.m.g.Account(ctx, aid)
		if err != nil && !guardapi.IsNotFound(err) {
			return err
		}
		stale := err != nil || acct.App == nil || acct.Network == nil
		if !stale {
			app, net := acct.App, acct.Network
			stale = app.ID != b.ContainerID || net.ID != b.NetworkID || app.IP(net.Name) != b.IP || !app.Running()
		}
		if stale {
			s.mu.Lock()
			b.Active = false
			s.mu.Unlock()
		}
	}
	if err := s.save(); err != nil {
		return err
	}
	for _, tag := range s.data.Nodes.Keys() {
		if s.loaded(s.loadedNodes, tag) {
			continue
		}
		n, _ := s.data.Nodes.Get(tag)
		if _, err := s.api(ctx, "ado", pyjson.Ordered{{Key: "outbounds", Value: []any{n.Outbound}}}, ""); err != nil {
			return err
		}
		s.markLoaded(s.loadedNodes, tag, true)
	}
	for _, aid := range s.data.Bindings.Keys() {
		b, _ := s.data.Bindings.Get(aid)
		tag := xrayconf.InboundTag(b.Port)
		if s.loaded(s.loadedPorts, tag) {
			continue
		}
		if _, err := s.api(ctx, "adi", pyjson.Ordered{{Key: "inbounds", Value: []any{xrayconf.Inbound(b.Port)}}}, ""); err != nil {
			return err
		}
		s.markLoaded(s.loadedPorts, tag, true)
	}
	if _, err := s.api(ctx, "adrules", xrayconf.Routes(&s.data.Bindings), ""); err != nil {
		return err
	}
	if err := s.m.g.WriteGatewayFile(ctx, guardapi.FileDNSJSON, pyjson.MustMarshal(xrayconf.DNSMap(&s.data.Bindings))); err != nil {
		return err
	}
	nft, err := xrayconf.Firewall(&s.data.Bindings, &s.data.Nodes)
	if err != nil {
		return err
	}
	if err := s.m.g.WriteGatewayFile(ctx, guardapi.FileActiveNFT, []byte(nft)); err != nil {
		return err
	}
	_, err = s.exec(ctx, []string{"sh", "-ec", xrayconf.NFTReplace})
	return err
}

func (s *shared) loaded(set map[string]bool, tag string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return set[tag]
}

func (s *shared) markLoaded(set map[string]bool, tag string, on bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if on {
		set[tag] = true
	} else {
		delete(set, tag)
	}
}

// deactivate marks aid's binding inactive; false when there is none.
func (s *shared) deactivate(aid string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	b, ok := s.data.Bindings.Get(aid)
	if ok {
		b.Active = false
	}
	return ok
}

// fence (G9). Caller holds op.
func (s *shared) fence(ctx context.Context, aid string) error {
	if !s.deactivate(aid) {
		return nil
	}
	if err := s.save(); err != nil {
		return err
	}
	return s.sync(ctx)
}

// fenceQuietly is apply's failure path: under op, fence the binding through
// the existing gateway; every error is swallowed.
func (s *shared) fenceQuietly(ctx context.Context, aid string) {
	if s.lock(ctx) != nil {
		return
	}
	defer s.unlock()
	gw, err := s.m.g.Gateway(ctx)
	if err != nil || gw.Container == nil {
		if s.deactivate(aid) {
			_ = s.save()
		}
		return
	}
	_ = s.fence(ctx, aid)
}

// configure (G10): the caller holds the account lock. The gateway's address
// on the account network and the gateway container.
func (s *shared) configure(ctx context.Context, aid string, st *store.AccountState, desired pyjson.Ordered) (string, error) {
	if err := s.lock(ctx); err != nil {
		return "", err
	}
	defer s.unlock()
	var policy *netplan.Policy
	if p, ok := st.Network.Get(); ok {
		policy = &p
	}
	c, err := s.ensure(ctx, false, policy)
	if err != nil {
		return "", err
	}
	if err := s.fence(ctx, aid); err != nil {
		return "", err
	}
	gateway, netID, appID, iface, err := s.attach(ctx, aid, st, c)
	if err != nil {
		return "", err
	}
	proxy, _ := desired.Get("proxy")
	direct, _ := desired.Get("direct")
	if pyjson.Truthy(direct) && !pyjson.Truthy(proxy) {
		proxy = nil
	}
	s.mu.RLock()
	salt := s.data.Salt
	s.mu.RUnlock()
	n, err := xrayconf.Node(ctx, s.m.resolver, proxy, salt)
	if err != nil {
		return "", err
	}
	tag := n.Tag()
	revValue, _ := desired.Get("revision")
	revision, _ := revValue.(string)
	s.mu.Lock()
	if _, known := s.data.Nodes.Get(tag); !known {
		if s.data.Nodes.Len() >= xrayconf.MaxNodes {
			s.mu.Unlock()
			return "", errors.New("retained outbound limit; maintenance collection required")
		}
		s.data.Nodes.Set(tag, n)
	}
	var port int64
	if prev, ok := s.data.Bindings.Get(aid); ok && prev.Port != 0 {
		port = prev.Port
	} else {
		used := map[int64]bool{}
		for _, k := range s.data.Bindings.Keys() {
			b, _ := s.data.Bindings.Get(k)
			used[b.Port] = true
		}
		for p := int64(xrayconf.FirstDNSPort); p <= xrayconf.LastDNSPort; p++ {
			if !used[p] {
				port = p
				break
			}
		}
	}
	if port == 0 {
		s.mu.Unlock()
		return "", errors.New("no free DNS port")
	}
	s.data.Bindings.Set(aid, store.NewBinding(st.AppIP, gateway, netID, appID, iface, port, tag, revision, true))
	s.mu.Unlock()
	if err := s.save(); err != nil {
		return "", err
	}
	if err := s.sync(ctx); err != nil {
		s.deactivate(aid)
		_ = s.save()
		_ = s.sync(ctx) // best effort: close the source even if the API failed
		return "", err
	}
	return gateway, nil
}

// healthySnapshot is SharedEgress.healthy without I/O (Y2): the gateway
// state comes from the request path's single guard call.
func (s *shared) healthySnapshot(aid string, st *store.AccountState, appID string, gw *guardapi.StateGateway) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.data.Bindings.Get(aid)
	// gw.IP: the gateway still sits on the account network at the address
	// of the activation; detached (L7 IT-X06) the runtime cannot reach out
	// and must go offline so that recover re-attaches it (an intended
	// difference from Python, which kept such a runtime ready).
	return ok && gw != nil && gw.Status == "running" && s.boot == [2]string{gw.ID, gw.StartedAt} &&
		gw.IP != "" && gw.IP == st.GatewayIP &&
		b.Active && b.Revision == st.Revision && b.ContainerID == appID && b.IP == st.AppIP
}

// endpoint (G11): [address, port] aid's outbound is pinned to; nil for
// direct or no binding.
func (s *shared) endpoint(aid string) *store.Endpoint {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.data.Bindings.Get(aid)
	if !ok {
		return nil
	}
	n, ok := s.data.Nodes.Get(b.Tag)
	if !ok || n.Endpoint == nil {
		return nil
	}
	e := *n.Endpoint
	return &e
}

// remove (G12): the binding goes inactive (and is deleted with disconnect);
// never creates or starts the gateway.
func (s *shared) remove(ctx context.Context, aid string, disconnect bool) error {
	if err := s.lock(ctx); err != nil {
		return err
	}
	defer s.unlock()
	if !s.deactivate(aid) {
		return nil
	}
	if err := s.save(); err != nil {
		return err
	}
	gw, err := s.m.g.Gateway(ctx)
	if err != nil {
		// BUG-13 kept: a gateway that is not ours is 503, not 409.
		return &unnamed{msg: "shared gateway", err: err}
	}
	c := gw.Container
	if c != nil && c.Running() {
		var policy *netplan.Policy
		if st, err := s.m.State(aid); err == nil && st != nil {
			if p, ok := st.Network.Get(); ok {
				policy = &p
			}
		}
		if c, err = s.ensure(ctx, true, policy); err != nil {
			return err
		}
		if err := s.sync(ctx); err != nil {
			return err
		}
	}
	if disconnect {
		if c != nil {
			if err := s.m.g.DisconnectGateway(ctx, aid); err != nil {
				return err
			}
		}
		s.mu.Lock()
		s.data.Bindings.Delete(aid)
		s.mu.Unlock()
		return s.save()
	}
	return nil
}

// collect (G14): reclaim unused outbounds and DNS inbounds only when the
// whole gateway has no established TCP connection. No gateway: nothing to
// do (BUG-16 fixed: no warning every 10 s).
func (s *shared) collect(ctx context.Context) error {
	if err := s.lock(ctx); err != nil {
		return err
	}
	defer s.unlock()
	gw, err := s.m.g.Gateway(ctx)
	if err != nil {
		return err
	}
	if gw.Container == nil || !gw.Container.Running() {
		return nil
	}
	out, err := s.exec(ctx, []string{"ss", "-Hnt", "state", "established"})
	if err != nil {
		return err
	}
	if strings.TrimSpace(string(out)) != "" {
		return nil
	}
	tags, ports := map[string]bool{}, map[string]bool{}
	for _, k := range s.data.Bindings.Keys() {
		b, _ := s.data.Bindings.Get(k)
		tags[b.Tag] = true
		ports[xrayconf.InboundTag(b.Port)] = true
	}
	changed := false
	for _, tag := range s.data.Nodes.Keys() {
		if tags[tag] {
			continue
		}
		if s.loaded(s.loadedNodes, tag) {
			if _, err := s.api(ctx, "rmo", nil, tag); err != nil {
				return err
			}
			s.markLoaded(s.loadedNodes, tag, false)
		}
		s.mu.Lock()
		s.data.Nodes.Delete(tag)
		s.mu.Unlock()
		changed = true
	}
	s.mu.RLock()
	var loadedPorts []string
	for t := range s.loadedPorts {
		loadedPorts = append(loadedPorts, t)
	}
	s.mu.RUnlock()
	sort.Strings(loadedPorts)
	for _, tag := range loadedPorts {
		if strings.HasPrefix(tag, "dns-") && !ports[tag] {
			if _, err := s.api(ctx, "rmi", nil, tag); err != nil {
				return err
			}
			s.markLoaded(s.loadedPorts, tag, false)
		}
	}
	if changed {
		if err := s.save(); err != nil {
			return err
		}
		return s.sync(ctx)
	}
	return nil
}

// recover (G15): every runtime with a binding or a state directory (not a
// symbolic link, BUG-18 fixed), in key order, under its account lock.
func (m *Manager) recover(ctx context.Context) error {
	keys := map[string]bool{}
	for _, k := range m.SharedBindingKeys() {
		keys[k] = true
	}
	entries, err := m.st.AccountEntries()
	if err != nil {
		return err
	}
	for _, e := range entries {
		if e.IsDir && !e.IsSymlink {
			keys[e.Name] = true
		}
	}
	list := make([]string, 0, len(keys))
	for k := range keys {
		list = append(list, k)
	}
	sort.Strings(list)
	for _, key := range list {
		if err := m.recoverKey(ctx, key); err != nil {
			return err
		}
	}
	return nil
}

func (m *Manager) recoverKey(ctx context.Context, key string) error {
	h, err := m.Lock(ctx, key)
	if err != nil {
		return err
	}
	defer h.Release()
	m.dropOwnEgressOnce(ctx, key)
	st, err := m.State(key)
	if err != nil {
		return err
	}
	if st == nil || st.Status == store.StatusBlocked {
		return nil
	}
	if err := m.recoverOne(ctx, key, st); err != nil {
		m.log.Warn("shared egress recover key=%s: %s", key, failureText(err))
		if !errors.Is(err, guardapi.ErrUnavailable) {
			m.GoOffline(key)
		}
	}
	return nil
}

// recoverOne: only ready runtimes whose container runs (failed new
// configurations follow the core's retry policy; a stopped account is
// never started here).
func (m *Manager) recoverOne(ctx context.Context, key string, st *store.AccountState) error {
	if st.Status != store.StatusReady {
		return nil
	}
	app, err := m.App(ctx, key)
	if err != nil {
		return err
	}
	if !app.Running() {
		return nil
	}
	ready, err := m.isReady(ctx, key, st)
	if err != nil {
		return err
	}
	if ready {
		return nil
	}
	desired, err := m.lastDesired(key)
	if err != nil {
		return err
	}
	_, err = m.sharedApply(ctx, key, st, desired)
	return err
}

// dropOwnEgressOnce (G16): once per process and runtime; a failure is
// retried on the next pass and never takes the account offline.
func (m *Manager) dropOwnEgressOnce(ctx context.Context, key string) {
	m.memMu.Lock()
	done := m.dropped[key]
	m.memMu.Unlock()
	if done {
		return
	}
	if err := m.dropOwnEgress(ctx, key); err != nil {
		m.log.Warn("own egress cleanup key=%s: %s", key, failureText(err))
		return
	}
	m.memMu.Lock()
	m.dropped[key] = true
	m.memMu.Unlock()
}

// ---------------------------------------------------------------------------
// CleanupHost and AdminHost.

// SharedBindingKeys are the keys of the shared gateway's bindings.
func (m *Manager) SharedBindingKeys() []string {
	m.shared.mu.RLock()
	defer m.shared.mu.RUnlock()
	return m.shared.data.Bindings.Keys()
}

// SharedBinding is a copy of aid's binding as Python stores it.
func (m *Manager) SharedBinding(aid string) (pyjson.Ordered, bool) {
	m.shared.mu.RLock()
	defer m.shared.mu.RUnlock()
	b, ok := m.shared.data.Bindings.Get(aid)
	if !ok {
		return nil, false
	}
	return b.Clone().PyValue().(pyjson.Ordered), true
}

// HasSharedBindings is bool(shared_bindings()) (C2).
func (m *Manager) HasSharedBindings() bool { return len(m.SharedBindingKeys()) > 0 }

// WithSharedOp runs fn holding the shared gateway operation lock.
func (m *Manager) WithSharedOp(ctx context.Context, fn func(ctx context.Context) error) error {
	if err := m.shared.lock(ctx); err != nil {
		return err
	}
	defer m.shared.unlock()
	return fn(ctx)
}

// GatewayRecreated forgets the gateway boot, takes every runtime offline and
// starts a recover pass at once (02 §7.3, §7.4).
func (m *Manager) GatewayRecreated() {
	m.shared.mu.Lock()
	m.shared.boot = [2]string{}
	m.shared.mu.Unlock()
	m.forgetAllReadiness()
	m.kickRecover()
}

// kickRecover makes the background loop run a recover pass now.
func (m *Manager) kickRecover() {
	select {
	case m.shared.kick <- struct{}{}:
	default:
	}
}
