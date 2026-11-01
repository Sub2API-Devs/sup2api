package accounts

import (
	"context"
	"errors"
	"io/fs"
	"time"

	"ccgateway/controller/internal/cliprofile"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/scripts"
	"ccgateway/controller/internal/store"
)

// Activation waits (A8): 30 x 0.2 s for the gateway's transparent port.
const (
	activationTries = 30
	activationPause = 200 * time.Millisecond
)

// Apply is PUT config (A1-A8). A refused or failed configuration also drops
// readiness: the runtime is not at what the core asked for.
func (m *Manager) Apply(ctx context.Context, aid string, desired any) (pyjson.Valuer, error) {
	h, err := m.Lock(ctx, aid)
	if err != nil {
		return nil, err
	}
	defer h.Release()
	out, err := m.apply(ctx, h, desired)
	if err != nil {
		m.GoOffline(aid)
		return nil, err
	}
	return out, nil
}

// applyRequest is a validated configuration.
type applyRequest struct {
	desired  pyjson.Ordered
	revision string
	policy   netplan.Policy
	direct   bool
}

func (m *Manager) apply(ctx context.Context, h *keylock.Held, raw any) (pyjson.Valuer, error) {
	aid := h.Key()
	req, err := m.validateDesired(aid, raw)
	if err != nil {
		return nil, err
	}
	st, err := m.State(aid)
	if err != nil {
		return nil, err
	}
	enabled, ok := req.desired.Get("enabled")
	if !ok {
		enabled = true
	}
	proxy, _ := req.desired.Get("proxy")
	if !(pyjson.Truthy(proxy) || req.direct) || !pyjson.Truthy(enabled) {
		// BUG-3 fixed: the configuration is recorded before a block only;
		// every other one after it was activated.
		if st != nil {
			if err := m.st.SaveDesired(aid, req.desired); err != nil {
				return nil, err
			}
		}
		return m.block(ctx, aid)
	}
	return m.applyShared(ctx, h, st, req)
}

// validateDesired is _validate_desired (A2), plus the proxy check at the
// entry (BUG-5 fixed: 400 before anything is built).
func (m *Manager) validateDesired(aid string, raw any) (*applyRequest, error) {
	if st, err := m.State(aid); err != nil {
		return nil, err
	} else if st != nil {
		if v, ok := st.MigrationFailed.Get(); ok && pyjson.Truthy(v) {
			return nil, errs.New(errs.BadRequest, "failed migration draft must be discarded")
		}
	}
	desired, ok := raw.(pyjson.Ordered)
	if !ok {
		return nil, errs.New(errs.BadRequest, "invalid configuration")
	}
	cli, _ := desired.Get("cli")
	if _, err := cliprofile.Validate(cli); err != nil {
		return nil, errs.Wrap(errs.BadRequest, err.Error(), err)
	}
	revValue, ok := desired.Get("revision")
	if !ok {
		revValue = ""
	}
	revision, isStr := revValue.(string)
	if !isStr || !names.Revision.MatchString(revision) {
		return nil, errs.New(errs.BadRequest, "invalid revision")
	}
	network, _ := desired.Get("network")
	policy, err := netplan.ParsePolicy(network)
	if err != nil {
		return nil, errs.Wrap(errs.BadRequest, "invalid network policy", err)
	}
	proxy, _ := desired.Get("proxy")
	direct, _ := desired.Get("direct")
	enabled, present := desired.Get("enabled")
	if pyjson.Truthy(proxy) && (!present || pyjson.Truthy(enabled)) {
		if _, err := netplan.ValidateProxy(proxy); err != nil {
			return nil, errs.Wrap(errs.BadRequest, "invalid proxy", err)
		}
	}
	return &applyRequest{desired: desired, revision: revision, policy: policy,
		direct: pyjson.IsTrue(direct) && !pyjson.Truthy(proxy)}, nil
}

func samePolicy(st *store.AccountState, p netplan.Policy) bool {
	v, ok := st.Network.Get()
	return ok && v == p
}

func (m *Manager) applyShared(ctx context.Context, h *keylock.Held, st *store.AccountState, req *applyRequest) (pyjson.Valuer, error) {
	aid := h.Key()
	if st != nil && !samePolicy(st, req.policy) {
		// The gateway holds an endpoint on the account's own network: it
		// has to leave before that network is replaced.
		if err := m.detachShared(ctx, aid); err != nil {
			return nil, err
		}
	}
	authRaw, _ := req.desired.Get("auth")
	cliRaw, _ := req.desired.Get("cli")
	st, err := m.provision(ctx, aid, authRaw, req.policy, cliRaw)
	if err != nil {
		return nil, err
	}
	rev, err := m.Readiness(ctx, aid, st)
	if err != nil {
		return nil, err
	}
	if rev == req.revision {
		if err := m.st.SaveDesired(aid, req.desired); err != nil {
			return nil, err
		}
		return m.Public(ctx, aid) // readiness checked that app and gateway still run
	}
	out, err := m.sharedApply(ctx, aid, st, req.desired)
	if err != nil {
		return nil, err
	}
	// BUG-3 fixed: only an activated configuration is what the background
	// recovery and the proxy recheck read back.
	if err := m.st.SaveDesired(aid, req.desired); err != nil {
		return nil, err
	}
	return out, nil
}

// block is block(aid) (BL1).
func (m *Manager) block(ctx context.Context, aid string) (pyjson.Valuer, error) {
	m.GoOffline(aid)
	st, err := m.State(aid)
	if err != nil {
		return nil, err
	}
	if st != nil {
		timeout := stopTimeout
		if err := m.g.AppAction(ctx, aid, guardapi.ActionStop, &timeout); err != nil && !guardapi.IsNotFound(err) {
			return nil, err
		}
		st.Status = store.StatusBlocked
		if err := m.save(aid, st); err != nil {
			return nil, err
		}
		if err := m.shared.remove(ctx, aid, false); err != nil {
			return nil, err
		}
	}
	return &contract.Blocked{AccountID: aid}, nil
}

// sharedApply is SharedEgress.apply (A7): fence, attach, sync, resolv,
// firewall, probe and readiness at desired's revision.
func (m *Manager) sharedApply(ctx context.Context, aid string, st *store.AccountState, desired pyjson.Ordered) (*contract.Public, error) {
	m.GoOffline(aid)
	st.Status = store.StatusSyncing
	if err := m.save(aid, st); err != nil {
		return nil, err
	}
	if err := m.sharedActivate(ctx, aid, st, desired); err != nil {
		st.Status = store.StatusEgressError
		if serr := m.save(aid, st); serr != nil {
			m.log.Warn("save key=%s failed: %s", aid, failureText(serr))
		}
		m.shared.fenceQuietly(ctx, aid)
		return nil, err
	}
	return m.Public(ctx, aid)
}

func (m *Manager) sharedActivate(ctx context.Context, aid string, st *store.AccountState, desired pyjson.Ordered) error {
	app, err := m.App(ctx, aid)
	if err != nil {
		return err
	}
	if !app.Running() {
		if err := m.g.AppAction(ctx, aid, guardapi.ActionStart, nil); err != nil {
			return err
		}
	}
	gateway, err := m.shared.configure(ctx, aid, st, desired)
	if err != nil {
		return err
	}
	// egress_backend is only read by controllers up to ccgateway 0.1.117:
	// a plugin rolled back to one keeps this account on the gateway.
	st.GatewayIP = gateway
	st.EgressBackend = store.Some(names.SharedBackend)
	st.Mark("gateway_ip", "egress_backend")
	if err := m.save(aid, st); err != nil {
		return err
	}
	if err := m.g.WriteResolv(ctx, aid, gateway); err != nil {
		return err
	}
	revValue, _ := desired.Get("revision")
	revision, _ := revValue.(string)
	return m.activate(ctx, aid, st, revision)
}

// BusinessFirewall installs the account firewall and the default route via
// gatewayIP into the running app container (A8 ①, W9).
func (m *Manager) BusinessFirewall(ctx context.Context, h *keylock.Held, gatewayIP string) error {
	return m.businessFirewall(ctx, h.Key(), gatewayIP)
}

func (m *Manager) businessFirewall(ctx context.Context, aid, gatewayIP string) error {
	rules, err := m.rules(gatewayIP)
	if err != nil {
		return err
	}
	return m.g.InstallFirewall(ctx, aid, rules, gatewayIP)
}

// activate (A8): business firewall and default route, the gateway's
// transparent port, the proxied probe, then readiness at revision.
func (m *Manager) activate(ctx context.Context, aid string, st *store.AccountState, revision string) error {
	if err := m.businessFirewall(ctx, aid, st.GatewayIP); err != nil {
		return err
	}
	listening := false
	for i := 0; i < activationTries; i++ {
		gw, err := m.g.Gateway(ctx)
		if err != nil {
			return err
		}
		if gw.Container == nil {
			return errGatewayMissing
		}
		if !gw.Container.Running() {
			return errors.New("egress failed")
		}
		r, err := m.g.GatewayExec(ctx, scripts.SSListen)
		if err != nil {
			return err
		}
		if r.ExitCode == 0 {
			listening = true
			break
		}
		if err := m.clock.Sleep(ctx, activationPause); err != nil {
			return err
		}
	}
	if !listening {
		return errs.Activation(errs.CodeEgressNotReady, "egress not ready")
	}
	// Probe through the business namespace, not through host networking.
	r, err := m.g.AppExec(ctx, aid, []string{"node", "-e", scripts.Probe, m.cfg.ProbeURL}, guardapi.UserDefault)
	if err != nil {
		return err
	}
	if r.ExitCode != 0 {
		return errs.Activation(errs.CodeProxyCheckFailed, "account proxy connectivity check failed")
	}
	st.Revision = revision
	st.Status = store.StatusReady
	if err := m.save(aid, st); err != nil {
		return err
	}
	s, err := m.stateBoth(ctx, aid)
	if err != nil {
		return err
	}
	m.setOnline(aid, revision, [2]string{s.App.StartedAt, s.Gateway.StartedAt})
	return nil
}

// Reapply is shared.apply(aid, state, shared.desired(aid)) (W11): the last
// activated configuration again, at st's revision.
func (m *Manager) Reapply(ctx context.Context, h *keylock.Held, st *store.AccountState) error {
	desired, err := m.lastDesired(h.Key())
	if err != nil {
		return err
	}
	_, err = m.sharedApply(ctx, h.Key(), st, desired)
	return err
}

// errNotSynchronized is SharedEgress.desired's RuntimeError.
var errNotSynchronized = errors.New("core configuration must be synchronized before migration")

// lastDesired is shared.desired(aid): egress-desired.json.
func (m *Manager) lastDesired(aid string) (pyjson.Ordered, error) {
	d, err := m.st.LoadDesired(aid)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, errNotSynchronized
	}
	return d, err
}
