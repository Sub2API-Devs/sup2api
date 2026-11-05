package accounts

import (
	"context"
	"errors"
	"net/netip"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"ccgateway/controller/internal/auth"
	"ccgateway/controller/internal/cliprofile"
	"ccgateway/controller/internal/containerfs"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/rnd"
	"ccgateway/controller/internal/scripts"
	"ccgateway/controller/internal/store"
)

// plan is _plan_container's result: everything validated, nothing removed.
type plan struct {
	imageRef  string
	image     *guardapi.Image
	cli       *cliprofile.Profile
	cliEnv    map[string]string
	diskBytes int64
	legacy    bool
	// stateEnv: the guard mounts the session Valkey socket into the new
	// container, so it gets a password, a user and the Worker settings
	// (session_state.go).
	stateEnv bool
}

// addresses are the account network and its two addresses.
type addresses struct {
	network   *guardapi.Network
	gatewayIP string
	appIP     string
}

// unnamed hides a named failure behind a plain error: the Python call
// raised a docker APIError (503 runtime_unavailable) where the guard answers
// with a 409 the client maps to a named kind.
type unnamed struct {
	msg string
	err error
}

func (e *unnamed) Error() string { return e.msg + ": " + e.err.Error() }

// provision (PV1): _provision under the network lock, then the in-place
// environment change outside it.
func (m *Manager) provision(ctx context.Context, aid string, authRaw any, policy netplan.Policy, cliRaw any) (*store.AccountState, error) {
	m.networkMu.Lock()
	st, err := m.provisionLocked(ctx, aid, authRaw, policy, cliRaw)
	m.networkMu.Unlock()
	if err != nil {
		return nil, err
	}
	if st.EnvironmentPending.Set && st.EnvironmentPending.V && st.EnvironmentDesired.Set {
		if err := m.syncEnvironment(ctx, aid, st); err != nil {
			return nil, err
		}
	}
	return st, nil
}

// syncEnvironment is _sync_environment (PV7): never fails the apply except
// when the state cannot be written.
func (m *Manager) syncEnvironment(ctx context.Context, aid string, st *store.AccountState) error {
	desired := st.EnvironmentDesired.V
	created := st.EnvironmentCreated.V
	if desired.Locale == "" && created.Locale != "" || desired.Timezone == "" && created.Timezone != "" {
		return nil
	}
	app, err := m.App(ctx, aid)
	if err != nil || !app.Running() {
		return nil
	}
	if !m.worker.PutEnvironment(ctx, st, desired) {
		return nil
	}
	st.Environment = store.Some(desired)
	st.EnvironmentPending = store.Some(false)
	st.Mark("environment", "environment_pending")
	st.Pop("environment_desired")
	return m.save(aid, st)
}

func (m *Manager) provisionLocked(ctx context.Context, aid string, authRaw any, policy netplan.Policy, cliRaw any) (*store.AccountState, error) {
	cli, err := cliprofile.Validate(cliRaw)
	if err != nil {
		return nil, errs.Wrap(errs.BadRequest, err.Error(), err)
	}
	a, err := auth.Parse(authRaw)
	if err != nil {
		return nil, err
	}
	if err := m.st.EnsureAccountDir(aid); err != nil {
		return nil, err
	}
	st, err := m.State(aid)
	if err != nil {
		return nil, err
	}
	salt := ""
	if st != nil {
		salt = st.AdminKey
	} else {
		salt = rnd.TokenURLSafe(m.rand, 32)
	}
	fingerprint := auth.Fingerprint(salt, a)
	env := store.Environment{Locale: a.Locale, Timezone: a.Timezone}
	var existing *guardapi.Container
	if st != nil {
		acct, err := m.g.Account(ctx, aid)
		if err != nil {
			return nil, err
		}
		existing = acct.App
		keep, err := m.keepExisting(aid, st, existing, policy, fingerprint, cli, env)
		if err != nil || keep {
			return st, err
		}
	}
	// Everything is validated before a working container or network goes.
	p, err := m.planContainer(ctx, aid, st, existing, cli)
	if err != nil {
		return nil, err
	}
	if st == nil || !samePolicy(st, policy) {
		if err := m.checkSubnetCapacity(ctx, aid, policy); err != nil {
			return nil, err
		}
	}
	if err := m.removeReplaced(ctx, aid, st, existing, policy); err != nil {
		return nil, err
	}
	addr, err := m.addresses(ctx, aid, st, policy)
	if err != nil {
		return nil, err
	}
	p.stateEnv = m.sessionGuard(ctx)
	st, err = m.recordRuntime(aid, st, salt, policy, addr, p)
	if err != nil {
		return nil, err
	}
	// The user exists before the Worker starts (best effort: a Valkey that
	// is down gets it from the background pass).
	m.setStateUser(ctx, aid, st)
	if err := m.createApp(ctx, aid, st, a, fingerprint, p, addr); err != nil {
		return nil, err
	}
	st.AuthMode = store.Some(a.Mode)
	st.Mark("auth_mode")
	if p.cli != nil {
		st.CLI = store.Some[any](p.cli.Raw)
		st.Mark("cli")
	}
	st.RuntimeImage = store.Some(p.imageRef)
	if p.image.ID != "" {
		st.RuntimeImage = store.Some(p.image.ID) // a tag may later name another image
	}
	st.Environment = store.Some(env)
	st.EnvironmentCreated = store.Some(env)
	st.EnvironmentPending = store.Some(false)
	st.Mark("environment", "environment_created", "environment_pending")
	st.Pop("environment_desired")
	if err := m.save(aid, st); err != nil {
		return nil, err
	}
	return st, nil
}

// orderedOf is a decoded JSON object or an empty one (`x or {}`).
func orderedOf(v any, ok bool) pyjson.Ordered {
	if o, isObj := v.(pyjson.Ordered); ok && isObj {
		return o
	}
	return pyjson.Ordered{}
}

func field(o pyjson.Ordered, key string) any {
	v, _ := o.Get(key)
	return v
}

func directOrBuild(v any) bool {
	return pyjson.Equal(v, cliprofile.ModeDirect) || pyjson.Equal(v, cliprofile.ModeBuild)
}

// identityOf is container_identity(c) ("" when it cannot be computed).
func identityOf(c *guardapi.Container) string {
	if c == nil {
		return ""
	}
	id, err := containerfs.Identity(c)
	if err != nil {
		return ""
	}
	return id
}

// sameRuntime is _same_runtime (PV4).
func sameRuntime(st *store.AccountState, existing *guardapi.Container, cli *cliprofile.Profile) bool {
	if cli == nil {
		return true
	}
	active := orderedOf(st.ActiveRuntime.Get())
	activeMatches := existing != nil && pyjson.Equal(field(active, "container_identity"), identityOf(existing)) &&
		pyjson.Equal(cli.Version, field(active, "version"))
	saved := orderedOf(st.CLI.Get())
	return pyjson.Equal(saved, cli.Raw) || activeMatches ||
		pyjson.Equal(cli.Version, field(saved, "version")) && directOrBuild(cli.RequestMode) && directOrBuild(field(saved, "request_mode"))
}

// keepExisting is _keep_existing (PV5).
func (m *Manager) keepExisting(aid string, st *store.AccountState, existing *guardapi.Container, policy netplan.Policy,
	fingerprint string, cli *cliprofile.Profile, env store.Environment) (bool, error) {
	same := sameRuntime(st, existing, cli)
	if existing != nil && samePolicy(st, policy) && existing.Labels[names.LabelAuth] == fingerprint {
		if !same {
			return false, errs.New(errs.InvalidCLIProfile, "CLI version changes require a packaged in-place Worker+CLI activation")
		}
		return true, m.noteEnvironment(aid, st, env)
	}
	active := orderedOf(st.ActiveRuntime.Get())
	if existing != nil && pyjson.Equal(field(active, "container_identity"), identityOf(existing)) && cli != nil && !same {
		return false, errs.New(errs.InvalidCLIProfile, "activate a packaged Worker+CLI pair before selecting a different CLI version")
	}
	return false, nil
}

// noteEnvironment is _note_environment (PV6).
func (m *Manager) noteEnvironment(aid string, st *store.AccountState, env store.Environment) error {
	current := st.Environment.Or(store.Environment{})
	if !st.EnvironmentCreated.Set {
		st.EnvironmentCreated = store.Some(current)
		st.Mark("environment_created")
	}
	pending := env != current
	st.EnvironmentPending = store.Some(pending)
	st.Mark("environment_pending")
	if pending {
		st.EnvironmentDesired = store.Some(env)
		st.Mark("environment_desired")
	} else {
		st.Pop("environment_desired")
	}
	return m.save(aid, st)
}

// planContainer is _plan_container (PV8); runtimeImage picks the image and
// the CLI.
func (m *Manager) planContainer(ctx context.Context, aid string, st *store.AccountState, existing *guardapi.Container,
	cli *cliprofile.Profile) (*plan, error) {
	imageRef, image, cli, cliEnv, err := m.runtimeImage(ctx, aid, st, existing, cli)
	if err != nil {
		return nil, err
	}
	// An enforced quota never silently becomes unbounded; legacy data
	// always stays usable, and unbounded storage only while not required.
	recorded := ""
	if st != nil {
		recorded = store.QuotaLegacyUnbounded
		if dq, ok := st.DiskQuota.Get(); ok && dq.Status != "" {
			recorded = dq.Status
		}
	}
	legacy := recorded == store.QuotaLegacyUnbounded
	unbounded := legacy || (recorded == "" || recorded == store.QuotaUnbounded) && !m.cfg.RequireDiskQuota
	diskBytes, err := m.accountVolume(ctx, aid, unbounded)
	if err != nil {
		return nil, err
	}
	if err := m.verifyDiskQuota(ctx, aid, imageRef, diskBytes); err != nil {
		return nil, err
	}
	return &plan{imageRef: imageRef, image: image, cli: cli, cliEnv: cliEnv, diskBytes: diskBytes, legacy: legacy}, nil
}

// runtimeImage picks the image and the CLI of the app container to create
// and resolves the CLI in that image.
//
// A configuration naming a CLI (cores before cli-from-image-v1) keeps the
// pinned rules: a new version or a retired mode takes the target image,
// anything else the existing container's image (credential/network changes
// must not incidentally upgrade it).
//
// Without one the image decides (2026-11-02): a new runtime (or one leaving
// a retired mode) runs the CLI the target image packages; a recreated one
// keeps the CLI it runs (runningProfile) from the first image packaging it
// among the one its Worker came from (RuntimeImage), the existing
// container's and the target. A container from before CLI profiles stays
// as it is.
func (m *Manager) runtimeImage(ctx context.Context, aid string, st *store.AccountState, existing *guardapi.Container,
	cli *cliprofile.Profile) (string, *guardapi.Image, *cliprofile.Profile, map[string]string, error) {
	var candidates []string
	if cli != nil {
		var saved pyjson.Ordered
		if st != nil {
			saved = orderedOf(st.CLI.Get())
		}
		versionChanged := !pyjson.Equal(field(saved, "version"), cli.Version)
		retired := !directOrBuild(field(saved, "request_mode"))
		ref := m.images.App()
		if existing != nil && !versionChanged && !retired {
			ref = existing.ImageOf()
		}
		candidates = []string{ref}
	} else {
		running, legacy, err := runningProfile(st, existing)
		if err != nil {
			return "", nil, nil, nil, err
		}
		switch {
		case running != nil:
			cli = running
			if ref, ok := st.RuntimeImage.Get(); ok && ref != "" {
				candidates = append(candidates, ref)
			}
			if existing != nil {
				candidates = append(candidates, existing.ImageOf())
			}
			candidates = append(candidates, m.images.App())
		case legacy:
			candidates = []string{existing.ImageOf()}
		default:
			ref := m.images.App()
			if _, err := m.businessImage(ctx, ref); err != nil {
				return "", nil, nil, nil, err
			}
			if cli, err = cliprofile.Packaged(ctx, m.g, aid, ref); err != nil {
				return "", nil, nil, nil, cliUnavailable(err)
			}
			candidates = []string{ref}
		}
	}
	candidates = slices.Compact(candidates)
	for i, ref := range candidates {
		last := i == len(candidates)-1
		image, err := m.businessImage(ctx, ref)
		if err != nil {
			if last {
				return "", nil, nil, nil, err
			}
			continue // gone or not ours: the next one
		}
		cliEnv, err := cliprofile.Resolve(ctx, m.g, aid, ref, cli)
		if err == nil {
			return ref, image, cli, cliEnv, nil
		}
		if last || !errors.Is(err, cliprofile.ErrUnavailable) {
			return "", nil, nil, nil, cliUnavailable(err)
		}
	}
	return "", nil, nil, nil, errors.New("no runtime image")
}

// businessImage is the account image ref, present and an account runtime
// image (not a controller or gateway one).
func (m *Manager) businessImage(ctx context.Context, ref string) (*guardapi.Image, error) {
	image, err := m.EnsureImage(ctx, ref)
	if err != nil {
		return nil, err
	}
	if err := names.CheckBusinessImage(image.Config.Env); err != nil {
		return nil, err
	}
	return image, nil
}

// cliUnavailable names a CLI the selected image does not package (409
// cli_profile_unavailable); other failures stay as they are.
func cliUnavailable(err error) error {
	if errors.Is(err, cliprofile.ErrUnavailable) {
		return errs.Wrap(errs.InvalidCLIProfile, "requested CLI version/mode is unavailable or invalid in the selected image", err)
	}
	return err
}

// runningProfile is the CLI a runtime runs when nothing names one: the
// version of the pair activated in place in this very container, else the
// stored profile's, in the stored mode. nil for a new runtime and for a
// retired mode (both take the target image's CLI); legacy for a container
// from before CLI profiles (nothing stored or activated).
func runningProfile(st *store.AccountState, existing *guardapi.Container) (*cliprofile.Profile, bool, error) {
	if st == nil {
		return nil, false, nil
	}
	saved := orderedOf(st.CLI.Get())
	if st.CLI.Set && !directOrBuild(field(saved, "request_mode")) {
		return nil, false, nil
	}
	version := field(saved, "version")
	active := orderedOf(st.ActiveRuntime.Get())
	if existing != nil && pyjson.Equal(field(active, "container_identity"), identityOf(existing)) {
		if v, ok := field(active, "version").(string); ok && v != "" {
			version = v
		}
	}
	if v, ok := version.(string); !ok || v == "" {
		return nil, existing != nil, nil
	}
	mode := field(saved, "request_mode")
	if !directOrBuild(mode) {
		mode = cliprofile.ModeBuild
	}
	p, err := cliprofile.Validate(pyjson.Ordered{{Key: "version", Value: version}, {Key: "request_mode", Value: mode},
		{Key: "disable_auto_update", Value: true}})
	if err != nil {
		return nil, false, errs.Wrap(errs.InvalidCLIProfile, "the CLI this runtime runs is not a valid profile", err)
	}
	return p, false, nil
}

var volumeSize = regexp.MustCompile(`^[1-9][0-9]{0,14}$`)

// accountVolume is account_volume / _data_volume (PV9): the existing volume
// or a new one with a hard limit, unbounded only where allowed; the stored
// limit wins.
func (m *Manager) accountVolume(ctx context.Context, aid string, allowUnbounded bool) (int64, error) {
	res, err := m.g.EnsureVolume(ctx, aid, guardapi.VolumeRequest{SizeBytes: m.cfg.AccountDiskBytes,
		AllowUnbounded: allowUnbounded && !m.cfg.RequireDiskQuota})
	if err != nil {
		if errs.Is(err, errs.DiskQuotaUnavailable) {
			m.quota.Set(hoststate.QuotaUnavailable)
		}
		return 0, err
	}
	if res.QuotaSupported != nil && !*res.QuotaSupported {
		m.quota.Set(hoststate.QuotaUnavailable)
	}
	v := res.Volume
	if v.Labels[names.LabelAccount] != aid {
		return 0, errs.Mismatch(v.Name)
	}
	size, hasSize := v.Options["size"]
	label, hasLabel := v.Labels[names.LabelDiskQuota]
	if size == "" && !hasLabel && allowUnbounded {
		return 0, nil
	}
	n, perr := strconv.ParseInt(size, 10, 64)
	if v.Driver != "local" || !hasSize || !volumeSize.MatchString(size) || label != size || perr != nil ||
		n < 1<<30 || n > 1024<<30 {
		return 0, errs.New(errs.DiskQuotaUnavailable, "Existing volume requires explicit disk quota migration")
	}
	m.quota.Set(hoststate.QuotaAvailable)
	return n, nil
}

// verifyDiskQuota (PV10): statfs of /work in a read-only job must report
// the enforced limit, before any running container or network is replaced.
func (m *Manager) verifyDiskQuota(ctx context.Context, aid, imageRef string, diskBytes int64) error {
	if diskBytes == 0 {
		return nil
	}
	res, err := m.g.RunJob(ctx, aid, guardapi.Job{Image: imageRef, Entrypoint: []string{"node"},
		Argv: []string{"-e", scripts.DiskQuota(strconv.FormatInt(diskBytes, 10))}, User: guardapi.JobUserWorker,
		Volume: guardapi.VolumeRO, Caps: []string{}})
	if err != nil {
		if _, ok := guardapi.AsError(err); ok || errs.KindOf(err) != 0 {
			return errs.Wrap(errs.DiskQuotaUnavailable, "The account volume does not expose its enforced quota", err)
		}
		return err
	}
	if res.ExitCode != 0 {
		return errs.New(errs.DiskQuotaUnavailable, "The account volume does not expose its enforced quota")
	}
	return nil
}

// checkSubnetCapacity (PV11): a free subnet for a new network policy,
// before anything goes. Exhaustion stays 503 runtime_unavailable (BUG-22 kept).
func (m *Manager) checkSubnetCapacity(ctx context.Context, aid string, policy netplan.Policy) error {
	s, err := m.g.Subnets(ctx)
	if err != nil {
		return err
	}
	networks, own, routes := s.Prefixes(aid)
	occupied := append([]netip.Prefix(nil), networks...)
	for _, r := range routes {
		if !containsPrefix(own, r) {
			occupied = append(occupied, r)
		}
	}
	if _, err := netplan.AllocateSubnet(policy, occupied, m.rand); err != nil {
		m.log.Warn("network pool of key=%s: %s", aid, err)
		return err
	}
	return nil
}

func containsPrefix(list []netip.Prefix, p netip.Prefix) bool {
	for _, q := range list {
		if q == p {
			return true
		}
	}
	return false
}

// removeReplaced is _remove_replaced (PV12).
func (m *Manager) removeReplaced(ctx context.Context, aid string, st *store.AccountState, existing *guardapi.Container, policy netplan.Policy) error {
	if existing != nil {
		m.GoOffline(aid)
		if err := m.g.DeleteContainer(ctx, aid, "app"); err != nil && !guardapi.IsNotFound(err) {
			return err
		}
	}
	if st != nil && samePolicy(st, policy) {
		return nil
	}
	m.dropReadiness(aid)
	if err := m.dropOwnEgress(ctx, aid); err != nil {
		return err
	}
	return m.deleteNetwork(ctx, aid, "net")
}

// deleteNetwork removes <p>-<aid>-<role>; absent is fine; a network still
// in use is a plain failure (Python's APIError), not resource_in_use.
func (m *Manager) deleteNetwork(ctx context.Context, aid, role string) error {
	err := m.g.DeleteNetwork(ctx, aid, role)
	switch {
	case err == nil, guardapi.IsNotFound(err):
		return nil
	case errs.Is(err, errs.ResourceInUse):
		return &unnamed{msg: "remove network " + m.name(aid, role), err: err}
	}
	return err
}

// dropOwnEgress is drop_own_egress (PV13): what a runtime created while
// accounts had their own sing-box egress leaves behind. The shared gateway
// and its uplink stay.
func (m *Manager) dropOwnEgress(ctx context.Context, aid string) error {
	if err := m.g.DeleteContainer(ctx, aid, "egress"); err != nil && !guardapi.IsNotFound(err) {
		return err
	}
	if err := m.deleteNetwork(ctx, aid, "uplink"); err != nil {
		return err
	}
	if err := m.st.RemoveLegacyOwnEgressFiles(aid); err != nil {
		return err
	}
	st, err := m.State(aid)
	if err != nil {
		return err
	}
	if st != nil && st.DropLegacyOwnEgress() {
		return m.save(aid, st)
	}
	return nil
}

// ensureNetwork is ensure_network(aid, 'net', policy, internal=True) under
// the network lock: the existing network, or a new one in a free subnet.
func (m *Manager) ensureNetwork(ctx context.Context, aid string, policy netplan.Policy) (*guardapi.Network, error) {
	for attempt := 0; ; attempt++ {
		acct, err := m.g.Account(ctx, aid)
		if err != nil {
			return nil, err
		}
		if acct.Network != nil {
			return acct.Network, nil
		}
		subnet, err := m.freeSubnet(ctx, policy)
		if err != nil {
			return nil, err
		}
		n, err := m.g.CreateNetwork(ctx, aid, guardapi.NetworkRequest{Subnet: subnet.String(),
			Gateway: hostAt(subnet, 1).String(), PolicyLabel: policy.Label()})
		if err == nil {
			return n, nil
		}
		if attempt == 0 && (errors.Is(err, guardapi.ErrExists) || errors.Is(err, guardapi.ErrSubnetOverlap)) {
			continue // re-query (exists) or re-read the subnets (overlap), once
		}
		return nil, err
	}
}

// freeSubnet allocates in policy against every Docker subnet and host route.
func (m *Manager) freeSubnet(ctx context.Context, policy netplan.Policy) (netip.Prefix, error) {
	s, err := m.g.Subnets(ctx)
	if err != nil {
		return netip.Prefix{}, err
	}
	networks, _, routes := s.Prefixes("")
	return netplan.AllocateSubnet(policy, append(routes, networks...), m.rand)
}

func hostAt(p netip.Prefix, offset uint32) netip.Addr {
	b := p.Masked().Addr().As4()
	v := uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])
	v += offset
	return netip.AddrFrom4([4]byte{byte(v >> 24), byte(v >> 16), byte(v >> 8), byte(v)})
}

// addresses is _addresses (PV14).
func (m *Manager) addresses(ctx context.Context, aid string, st *store.AccountState, policy netplan.Policy) (*addresses, error) {
	network, err := m.ensureNetwork(ctx, aid, policy)
	if err != nil {
		return nil, err
	}
	if st != nil && samePolicy(st, policy) {
		return &addresses{network: network, gatewayIP: st.GatewayIP, appIP: st.AppIP}, nil
	}
	subnet, err := network.FirstSubnet()
	if err != nil {
		return nil, err
	}
	gw, app, err := netplan.AllocateAddresses(subnet, policy.Allocation, m.rand)
	if err != nil {
		return nil, err
	}
	return &addresses{network: network, gatewayIP: gw.String(), appIP: app.String()}, nil
}

// recordRuntime is _record_runtime (PV15). resolv.conf is the guard's
// (written before the container is created, createApp).
func (m *Manager) recordRuntime(aid string, st *store.AccountState, salt string, policy netplan.Policy, addr *addresses, p *plan) (*store.AccountState, error) {
	if st == nil {
		st = store.NewAccountState(rnd.TokenURLSafe(m.rand, 32), salt, addr.appIP, addr.gatewayIP, names.RFC3339(m.clock.Now()))
	}
	st.Network = store.Some(policy)
	st.GatewayIP, st.AppIP = addr.gatewayIP, addr.appIP
	st.Revision, st.Status = "", store.StatusPending
	st.Mark("network", "gateway_ip", "app_ip", "revision", "status")
	st.DropLegacyOwnEgress() // the in-memory state predates drop_own_egress
	status := store.QuotaUnbounded
	switch {
	case p.diskBytes != 0:
		status = store.QuotaEnforced
	case p.legacy:
		status = store.QuotaLegacyUnbounded
	}
	st.DiskQuota = store.Some(store.DiskQuota{LimitBytes: p.diskBytes, Status: status})
	st.Mark("disk_quota")
	if p.stateEnv {
		m.ensureStatePassword(st) // an existing one is kept
	}
	return st, m.save(aid, st)
}

// appEnvironment is app_environment (PV16), plus the session Valkey
// settings when the guard mounts its socket.
func (m *Manager) appEnvironment(aid string, st *store.AccountState, a auth.Auth, p *plan) map[string]string {
	env := map[string]string{}
	for k, v := range p.cliEnv {
		env[k] = v
	}
	for _, kv := range scripts.Telemetry {
		env[kv[0]] = kv[1]
	}
	env["CCG_API_KEY"] = st.APIKey
	env["CCG_ADMIN_KEY"] = st.AdminKey
	env["CCG_EXTERNAL_EGRESS"] = "1"
	if p.diskBytes != 0 {
		env["CCG_ACCOUNT_DISK_QUOTA_BYTES"] = strconv.FormatInt(p.diskBytes, 10)
	}
	if a.Mode == auth.ModeAPIKey {
		env["ANTHROPIC_API_KEY"] = a.APIKey
		env["ANTHROPIC_BASE_URL"] = a.BaseURL
	}
	if a.Locale != "" {
		lang := a.Locale
		if !strings.Contains(lang, ".") {
			lang += ".UTF-8"
		}
		env["LANG"], env["LC_ALL"] = lang, lang
	}
	if a.Timezone != "" {
		env["TZ"] = a.Timezone
	}
	if p.stateEnv && st.StatePassword != "" {
		stateEnvironment(env, aid, st)
	}
	return env
}

// createApp is _create_app (PV17): the volume layout job, resolv.conf, then
// the container (created, not started; started by the shared apply).
func (m *Manager) createApp(ctx context.Context, aid string, st *store.AccountState, a auth.Auth, fingerprint string, p *plan, addr *addresses) error {
	res, err := m.g.RunJob(ctx, aid, guardapi.Job{Image: p.imageRef, Entrypoint: []string{"sh", "-ec"},
		Argv: []string{scripts.PrepareVolume}, User: guardapi.JobUserRoot, Volume: guardapi.VolumeRW,
		Caps: []string{guardapi.CapChown, guardapi.CapDACOverride}})
	if err != nil {
		return err
	}
	if res.ExitCode != 0 {
		return errors.New("volume preparation exited with " + strconv.Itoa(res.ExitCode))
	}
	// No container uses resolv.conf yet: a file the guard had to replace
	// (mount_source_replaced) is simply the new one.
	if err := m.g.WriteResolv(ctx, aid, addr.gatewayIP); err != nil && !errors.Is(err, guardapi.ErrMountReplaced) {
		return err
	}
	return m.createContainer(ctx, aid, guardapi.AppRequest{Image: p.imageRef, IPv4: addr.appIP,
		Env: m.appEnvironment(aid, st, a, p), AuthLabel: fingerprint, ImageLabel: p.image.ID})
}

// createContainer is PUT app. A lost answer of an earlier attempt makes the
// retry fail: the guard checks the address (400 in use) before the name
// (409 exists); the container found with this address and fingerprint is
// the one created.
func (m *Manager) createContainer(ctx context.Context, aid string, req guardapi.AppRequest) error {
	_, err := m.g.CreateApp(ctx, aid, req)
	if err != nil && (errors.Is(err, guardapi.ErrExists) || isInvalidRequest(err)) {
		if acct, qerr := m.g.Account(ctx, aid); qerr == nil && acct.App != nil &&
			acct.App.Labels[names.LabelAuth] == req.AuthLabel && acct.App.IP(m.name(aid, "net")) == req.IPv4 {
			return nil
		}
	}
	return err
}

func isInvalidRequest(err error) bool {
	e, ok := guardapi.AsError(err)
	return ok && e.Status == 400 && e.Code == guardapi.CodeInvalidRequest
}
