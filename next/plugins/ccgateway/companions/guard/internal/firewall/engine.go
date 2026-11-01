package firewall

import (
	"context"
	"encoding/json"
	"errors"
	"net/netip"
	"sort"
	"strconv"
	"sync"
	"time"

	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/obs"
)

// Docker is what the engine reads from the daemon.
type Docker interface {
	ContainerList(ctx context.Context, f dockerapi.Filters, all bool) ([]dockerapi.ContainerSummary, error)
	ContainerInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.ContainerInfo, error)
	NetworkInspect(ctx context.Context, id string) (dockerapi.Raw, *dockerapi.NetworkInfo, error)
}

// Options configure an Engine.
type Options struct {
	Prefix  string
	Chains  Chains
	Control Control
	// DNS returns the controller's upstream DNS servers (D1); nil disables
	// the DNS rules.
	DNS    func() ([]netip.Addr, error)
	Tools  Tools
	Docker Docker
	NS     Runner // nsenter (5 s, 1 MiB)
	IPT    Runner // iptables and iptables-restore (15 s)
	Links  Links
	Log    *obs.Logger
	// RetryDelay is the account retry delay (500 ms) and FailDelay the
	// global retry delay (2 s); tests shorten them.
	RetryDelay time.Duration
	FailDelay  time.Duration
}

type acct struct {
	bridge  []Rule
	control []Rule
	skipped bool
}

type vethKey struct{ id, started, endpoint, addr, bridge string }
type routeKey struct {
	id, started string
	gen         uint64
}

// Engine is the single writer of the three chains.
type Engine struct {
	o Options
	n names.Names

	mu       sync.Mutex
	status   string
	written  map[string][]Rule // last applied per chain; absent = must write
	accounts map[string]acct
	veth     map[vethKey]string
	routes   map[routeKey]string
	routeGen map[string]uint64
	retried  map[string]bool
	all      bool
	aids     map[string]bool
	recon    bool
	wake     chan struct{}
	dnsErr   bool
}

// New returns an engine; Run must be started for Recompute to take effect.
func New(o Options) *Engine {
	if o.RetryDelay == 0 {
		o.RetryDelay = 500 * time.Millisecond
	}
	if o.FailDelay == 0 {
		o.FailDelay = 2 * time.Second
	}
	if o.Log == nil {
		o.Log = obs.Discard()
	}
	return &Engine{
		o: o, n: names.Names{Prefix: o.Prefix}, status: "starting",
		written: map[string][]Rule{}, accounts: map[string]acct{},
		veth: map[vethKey]string{}, routes: map[routeKey]string{}, routeGen: map[string]uint64{},
		retried: map[string]bool{}, aids: map[string]bool{}, wake: make(chan struct{}, 1),
	}
}

// Status is ok, degraded (an account was skipped), failed (fail closed or
// a write failed) or starting.
func (e *Engine) Status() string {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.status
}

// Recompute asks the writer to recompute aids (none = every account).
func (e *Engine) Recompute(reason string, aids ...string) {
	e.mu.Lock()
	if len(aids) == 0 {
		e.all = true
	}
	for _, a := range aids {
		e.aids[a] = true
	}
	e.mu.Unlock()
	e.o.Log.Debug("firewall_recompute", obs.Fields{"reason": reason, "accounts": len(aids)})
	e.signal()
}

// Reconcile asks for a full recompute plus chain drift and jump checks.
func (e *Engine) Reconcile() {
	e.mu.Lock()
	e.recon = true
	e.mu.Unlock()
	e.signal()
}

func (e *Engine) signal() {
	select {
	case e.wake <- struct{}{}:
	default:
	}
}

// InvalidateRoute drops the cached default route of an account (after the
// firewall helper, start or restart).
func (e *Engine) InvalidateRoute(aid string) {
	e.mu.Lock()
	e.routeGen[aid]++
	e.mu.Unlock()
}

// ForgetContainer drops cache entries of a destroyed container.
func (e *Engine) ForgetContainer(id string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	for k := range e.veth {
		if k.id == id {
			delete(e.veth, k)
		}
	}
	for k := range e.routes {
		if k.id == id {
			delete(e.routes, k)
		}
	}
}

// Run is the writer loop.
func (e *Engine) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-e.wake:
		}
		e.mu.Lock()
		all, recon := e.all, e.recon
		aids := make([]string, 0, len(e.aids))
		for a := range e.aids {
			aids = append(aids, a)
		}
		e.all, e.recon, e.aids = false, false, map[string]bool{}
		e.mu.Unlock()
		e.cycle(ctx, all || recon, aids, recon)
	}
}

// Initial is the startup pass: full compute and write without flushing
// first (03 §2.4 step 6, C2). It returns the computation error, after
// failing closed.
func (e *Engine) Initial(ctx context.Context) error {
	return e.cycle(ctx, true, nil, true)
}

// errGlobal marks a failure of the whole computation.
type errGlobal struct{ err error }

func (g errGlobal) Error() string { return "firewall computation failed: " + g.err.Error() }
func (g errGlobal) Unwrap() error { return g.err }

func (e *Engine) cycle(ctx context.Context, full bool, aids []string, recon bool) error {
	desired, err := e.compute(ctx, full, aids)
	failed := false
	if err != nil {
		e.o.Log.Error("firewall_compute_failed", obs.Fields{"type": errType(err)})
		desired = e.failClosed()
		failed = true
		e.later(e.o.FailDelay, "", true)
	}
	if recon {
		e.checkDrift(ctx)
	}
	changed, aerr := e.apply(ctx, desired)
	if aerr != nil {
		e.o.Log.Error("firewall_apply_failed", obs.Fields{"type": errType(aerr)})
		failed = true
		e.later(e.o.FailDelay, "", true)
	}
	if aerr == nil && (changed || recon) {
		if jerr := e.ensureJumps(ctx); jerr != nil {
			e.o.Log.Error("firewall_jump_failed", obs.Fields{"type": errType(jerr)})
			failed = true
			e.later(e.o.FailDelay, "", true)
		}
	}
	e.mu.Lock()
	switch {
	case failed:
		e.status = "failed"
	case e.anySkipped():
		e.status = "degraded"
	default:
		e.status = "ok"
	}
	e.mu.Unlock()
	if err != nil {
		return err
	}
	return aerr
}

func (e *Engine) anySkipped() bool {
	for _, a := range e.accounts {
		if a.skipped {
			return true
		}
	}
	return false
}

func (e *Engine) later(d time.Duration, aid string, all bool) {
	time.AfterFunc(d, func() {
		if all {
			e.Recompute("retry")
		} else {
			e.Recompute("account_retry", aid)
		}
	})
}

func errType(err error) string {
	var de *dockerapi.Error
	var ee *ExecError
	switch {
	case errors.As(err, &de):
		return "docker_" + strconv.Itoa(de.Status)
	case errors.As(err, &ee):
		return "exec"
	case errors.Is(err, context.DeadlineExceeded):
		return "timeout"
	}
	return "error"
}

func (e *Engine) failClosed() map[string][]Rule {
	return map[string][]Rule{
		e.o.Chains.Bridge:     {},
		e.o.Chains.ControlFwd: ControlTail(e.o.Control),
		e.o.Chains.ControlIn:  ControlInRules(e.o.Control),
	}
}

// Desired computes every chain without writing (print-rules, diff-rules).
func (e *Engine) Desired(ctx context.Context) (map[string][]Rule, error) {
	return e.compute(ctx, true, nil)
}

func (e *Engine) compute(ctx context.Context, full bool, aids []string) (map[string][]Rule, error) {
	_, gw, err := e.o.Docker.ContainerInspect(ctx, e.n.Gateway())
	if err != nil {
		if !dockerapi.IsNotFound(err) {
			return nil, errGlobal{err}
		}
		gw = nil
	} else if gw.TrimName() != e.n.Gateway() {
		gw = nil
	}
	accounts := map[string]acct{}
	if full {
		list, err := e.o.Docker.ContainerList(ctx, dockerapi.Filters{"label": {names.LabelAccount}}, true)
		if err != nil {
			return nil, errGlobal{err}
		}
		var keys []string
		for _, c := range list {
			if aid, role, ok := e.n.ParseContainer(c.Name()); ok && role == "app" {
				keys = append(keys, aid)
			}
		}
		sort.Strings(keys)
		for _, aid := range keys {
			accounts[aid] = e.account(ctx, aid, gw)
		}
	} else {
		e.mu.Lock()
		for k, v := range e.accounts {
			accounts[k] = v
		}
		e.mu.Unlock()
		for _, aid := range aids {
			if !names.ValidKey(aid) {
				continue
			}
			a := e.account(ctx, aid, gw)
			if a.bridge == nil && a.control == nil && !a.skipped {
				delete(accounts, aid)
			} else {
				accounts[aid] = a
			}
		}
	}
	e.mu.Lock()
	e.accounts = accounts
	e.mu.Unlock()

	keys := make([]string, 0, len(accounts))
	for k := range accounts {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	bridge := []Rule{}
	control := []Rule{}
	for _, k := range keys {
		bridge = append(bridge, accounts[k].bridge...)
		control = append(control, accounts[k].control...)
	}
	if e.o.DNS != nil {
		servers, err := e.o.DNS()
		e.mu.Lock()
		report := (err != nil) != e.dnsErr
		e.dnsErr = err != nil
		e.mu.Unlock()
		if err != nil && report {
			e.o.Log.Warn("control_dns_upstream_unavailable", nil)
		}
		control = append(control, ControlDNSRules(servers, e.o.Control)...)
	}
	control = append(control, ControlTail(e.o.Control)...)
	return map[string][]Rule{
		e.o.Chains.Bridge:     bridge,
		e.o.Chains.ControlFwd: control,
		e.o.Chains.ControlIn:  ControlInRules(e.o.Control),
	}, nil
}

// account computes one account. Bridge data failures (nsenter, an
// ambiguous address, a vanished container) only drop this account's
// bridge rules; the account is retried once after RetryDelay.
func (e *Engine) account(ctx context.Context, aid string, gw *dockerapi.ContainerInfo) acct {
	a, err := e.accountRules(ctx, aid, gw)
	e.mu.Lock()
	retried := e.retried[aid]
	if err == nil {
		delete(e.retried, aid)
	} else {
		e.retried[aid] = true
	}
	e.mu.Unlock()
	if err != nil {
		a.skipped = true
		a.bridge = nil
		e.o.Log.Warn("account_bridge_skipped", obs.Fields{"aid": aid, "type": errType(err)})
		if !retried {
			e.later(e.o.RetryDelay, aid, false)
		}
	}
	return a
}

func (e *Engine) accountRules(ctx context.Context, aid string, gw *dockerapi.ContainerInfo) (acct, error) {
	_, app, err := e.o.Docker.ContainerInspect(ctx, e.n.App(aid))
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return acct{}, nil
		}
		return acct{}, err
	}
	if app.TrimName() != e.n.App(aid) || app.State.Status != "running" {
		return acct{}, nil
	}
	_, net, err := e.o.Docker.NetworkInspect(ctx, e.n.Net(aid))
	if err != nil {
		if dockerapi.IsNotFound(err) {
			return acct{}, nil
		}
		return acct{}, err
	}
	out := acct{control: ControlAccountRules(aid, e.o.Prefix, app, net, e.o.Control)}
	appAddr, ok := accountApp(aid, e.o.Prefix, app, net)
	if !ok || gw == nil || gw.State.Status != "running" || gw.Label(names.LabelShared) != e.o.Prefix {
		return out, nil
	}
	gwAddr, ok := endpoint(gw, net)
	if !ok {
		return out, nil
	}
	appVeth, err := e.vethFor(ctx, app, net, appAddr)
	if err != nil {
		return out, err
	}
	gwVeth, err := e.vethFor(ctx, gw, net, gwAddr)
	if err != nil {
		return out, err
	}
	route, err := e.routeFor(ctx, aid, app)
	if err != nil {
		return out, err
	}
	out.bridge = BridgeRules(BridgeInput{AID: aid, App: app, Gateway: gw, Network: net,
		AppVeth: appVeth, GatewayVeth: gwVeth, DefaultRoute: route, Prefix: e.o.Prefix})
	return out, nil
}

var errAmbiguous = errors.New("ambiguous container address")

func (e *Engine) vethFor(ctx context.Context, c *dockerapi.ContainerInfo, net *dockerapi.NetworkInfo, addr netip.Addr) (string, error) {
	ep := c.NetworkSettings.Networks[net.Name]
	key := vethKey{c.ID, c.State.StartedAt, ep.EndpointID, addr.String(), net.BridgeName()}
	e.mu.Lock()
	v, ok := e.veth[key]
	e.mu.Unlock()
	if ok {
		return v, nil
	}
	if c.State.Pid <= 0 {
		return "", errAmbiguous
	}
	out, err := e.o.NS.Run(ctx, []string{e.o.Tools.Nsenter, "-t", strconv.Itoa(c.State.Pid), "-n", e.o.Tools.IP, "-j", "address"}, nil)
	if err != nil {
		return "", err
	}
	var ifs []struct {
		LinkIndex int `json:"link_index"`
		AddrInfo  []struct {
			Local string `json:"local"`
		} `json:"addr_info"`
	}
	if err := json.Unmarshal(out, &ifs); err != nil {
		return "", err
	}
	idx, n := 0, 0
	for _, i := range ifs {
		for _, a := range i.AddrInfo {
			if a.Local == addr.String() {
				idx = i.LinkIndex
				n++
				break
			}
		}
	}
	if n != 1 || idx <= 0 {
		return "", errAmbiguous
	}
	links, err := e.o.Links.Ifindexes()
	if err != nil {
		return "", err
	}
	name, ok := links[idx]
	if !ok || !ValidVeth(name) {
		return "", errAmbiguous
	}
	master, err := e.o.Links.Master(name)
	if err != nil || master != net.BridgeName() {
		return "", errAmbiguous
	}
	e.mu.Lock()
	e.veth[key] = name
	e.mu.Unlock()
	return name, nil
}

func (e *Engine) routeFor(ctx context.Context, aid string, app *dockerapi.ContainerInfo) (string, error) {
	e.mu.Lock()
	key := routeKey{app.ID, app.State.StartedAt, e.routeGen[aid]}
	v, ok := e.routes[key]
	e.mu.Unlock()
	if ok {
		return v, nil
	}
	out, err := e.o.NS.Run(ctx, []string{e.o.Tools.Nsenter, "-t", strconv.Itoa(app.State.Pid), "-n", e.o.Tools.IP, "-j", "route", "show", "default"}, nil)
	if err != nil {
		return "", err
	}
	var routes []struct {
		Gateway string `json:"gateway"`
	}
	if len(out) > 0 {
		if err := json.Unmarshal(out, &routes); err != nil {
			return "", err
		}
	}
	gw := ""
	if len(routes) == 1 {
		gw = routes[0].Gateway
	}
	e.mu.Lock()
	e.routes[key] = gw
	e.mu.Unlock()
	return gw, nil
}

func sameRules(a, b []Rule) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i].String() != b[i].String() {
			return false
		}
	}
	return true
}

// apply writes the chains that differ from the last successful write, in
// one iptables-restore transaction.
func (e *Engine) apply(ctx context.Context, desired map[string][]Rule) (bool, error) {
	e.mu.Lock()
	changed := map[string][]Rule{}
	for _, ch := range e.o.Chains.All() {
		rules := desired[ch]
		if old, ok := e.written[ch]; !ok || !sameRules(old, rules) {
			changed[ch] = rules
		}
	}
	e.mu.Unlock()
	if len(changed) == 0 {
		return false, nil
	}
	script := RestoreScript(e.o.Chains.All(), changed)
	if _, err := e.o.IPT.Run(ctx, []string{e.o.Tools.IptablesRestore, "-w", "5", "--noflush"}, []byte(script)); err != nil {
		return false, err
	}
	e.mu.Lock()
	for ch, rules := range changed {
		e.written[ch] = rules
	}
	e.mu.Unlock()
	for ch, rules := range changed {
		e.o.Log.Info("chain_written", obs.Fields{"chain": ch, "rules": len(rules)})
	}
	return true, nil
}

// checkDrift compares the kernel's chains with the last write and forces a
// rewrite of any chain that differs (03 §7.6).
func (e *Engine) checkDrift(ctx context.Context) {
	for _, ch := range e.o.Chains.All() {
		e.mu.Lock()
		want, ok := e.written[ch]
		e.mu.Unlock()
		if !ok {
			continue
		}
		out, err := e.o.IPT.Run(ctx, []string{e.o.Tools.Iptables, "-w", "5", "-S", ch}, nil)
		drift := err != nil
		if err == nil {
			drift = len(Diff(want, ParseChain(string(out), ch), ch != e.o.Chains.Bridge)) > 0
		}
		if drift {
			e.o.Log.Warn("chain_drift", obs.Fields{"chain": ch})
			e.mu.Lock()
			delete(e.written, ch)
			e.mu.Unlock()
		}
	}
}

// Rewrite forgets the last writes so the next cycle writes every chain.
func (e *Engine) Rewrite() {
	e.mu.Lock()
	e.written = map[string][]Rule{}
	e.mu.Unlock()
	e.Reconcile()
}

// ensureJumps keeps exactly one jump per chain at its parent (03 §7.1).
func (e *Engine) ensureJumps(ctx context.Context) error {
	byParent := map[string][]Jump{}
	var parents []string
	for _, j := range e.o.Chains.Jumps() {
		if _, ok := byParent[j.Parent]; !ok {
			parents = append(parents, j.Parent)
		}
		byParent[j.Parent] = append(byParent[j.Parent], j)
	}
	for _, p := range parents {
		out, err := e.o.IPT.Run(ctx, []string{e.o.Tools.Iptables, "-w", "5", "-S", p}, nil)
		if err != nil {
			return err
		}
		have := ParseChain(string(out), p)
		for _, j := range byParent[p] {
			want := Normalize(j.Args())
			n := 0
			for _, r := range have {
				if Normalize(r) == want {
					n++
				}
			}
			if n == 0 {
				args := append([]string{e.o.Tools.Iptables, "-w", "5", "-I", p, "1"}, j.Args()...)
				if _, err := e.o.IPT.Run(ctx, args, nil); err != nil {
					return err
				}
				e.o.Log.Info("jump_inserted", obs.Fields{"chain": j.Chain, "parent": p})
			}
			for ; n > 1; n-- {
				args := append([]string{e.o.Tools.Iptables, "-w", "5", "-D", p}, j.Args()...)
				if _, err := e.o.IPT.Run(ctx, args, nil); err != nil {
					return err
				}
				e.o.Log.Warn("jump_duplicate_removed", obs.Fields{"chain": j.Chain, "parent": p})
			}
		}
	}
	return nil
}

// Written returns a copy of the last write (tests, diagnostics).
func (e *Engine) Written() map[string][]Rule {
	e.mu.Lock()
	defer e.mu.Unlock()
	out := map[string][]Rule{}
	for k, v := range e.written {
		out[k] = append([]Rule(nil), v...)
	}
	return out
}
