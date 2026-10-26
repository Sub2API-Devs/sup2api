package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"maps"
	"net"
	"net/http"
	"os"
	"reflect"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
)

const settingKey = "ccgateway_remote"

func (c Config) featureGroups() map[string]GroupFeaturePolicy {
	if c.CCFeatureGroups == nil {
		return map[string]GroupFeaturePolicy{}
	}
	return c.CCFeatureGroups
}

func sameRuntimeConfig(a, b Config) bool {
	av, bv := a.EffectiveRequestPolicy().CLIVersion, b.EffectiveRequestPolicy().CLIVersion
	an, bn := a.EffectiveNetwork(), b.EffectiveNetwork()
	ai, bi := a.EffectiveImages(), b.EffectiveImages()
	a.Network, b.Network = &an, &bn
	a.Images, b.Images = &ai, &bi
	a.RequestPolicy, b.RequestPolicy = nil, nil
	a.CCFeatureGroups, b.CCFeatureGroups = nil, nil
	a.FeatureRevision, b.FeatureRevision = 0, 0
	// The request log default travels with each request's policy: a change
	// needs no runtime reconciled, only the cached configuration dropped.
	a.RequestLogs, b.RequestLogs = nil, nil
	a.bundled, b.bundled = nil, nil
	return av == bv && reflect.DeepEqual(a, b)
}

// SensitiveEnv are the legacy local-mode keys. They are read once at program
// start, before main removes them from the process environment
// (procguard.ScrubEnv), so plugins and later child processes never see them.
var SensitiveEnv = []string{"CCG_ADMIN_KEY", "CCG_API_KEY"}

var localAdminKey, localAPIKey = os.Getenv("CCG_ADMIN_KEY"), os.Getenv("CCG_API_KEY")

var configAAD = []byte("system:ccgateway:v1")

type Config struct {
	AccountRuntimes bool `json:"account_runtimes"`
	// Mode: "controller" or "disabled"; "local" / "ssh" are legacy values
	// that still decode and run but are never saved again (§53.9).
	Mode string `json:"mode"`
	Host string `json:"host"`
	Port int    `json:"port"`
	// Scheme of the controller endpoint (controller mode): "https" (also
	// "") or "http" (§53.9).
	Scheme string `json:"scheme,omitempty"`
	// BasePath is the path prefix of the controller behind a reverse proxy
	// that strips it ("" or /seg[/seg...], no trailing slash).
	BasePath           string `json:"base_path,omitempty"`
	User               string `json:"user"`
	AuthMode           string `json:"auth_mode"`
	Password           string `json:"password,omitempty"`
	PrivateKey         string `json:"private_key,omitempty"`
	Passphrase         string `json:"passphrase,omitempty"`
	HostKeyFingerprint string `json:"host_key_fingerprint"`
	AdminKey           string `json:"admin_key,omitempty"`
	APIKey             string `json:"api_key,omitempty"`
	// ControllerCA (controller mode) holds the only root certificates the
	// control panel's HTTPS certificate may chain to; empty: system roots
	// (CONTRACTS §53.2).
	ControllerCA string `json:"controller_ca,omitempty"`
	// Images overrides the pinned runtime images (images.go) per role, e.g.
	// with tags built on the Docker host itself; empty fields use the
	// pinned references (CONTRACTS §49.16).
	Images          *RuntimeImages                `json:"images,omitempty"`
	Network         *RuntimeNetwork               `json:"network,omitempty"`
	RequestPolicy   *RequestPolicy                `json:"request_policy,omitempty"`
	CCFeatureGroups map[string]GroupFeaturePolicy `json:"cc_feature_groups,omitempty"`
	FeatureRevision int64                         `json:"feature_revision"`
	// RequestLogs is the default request log rule of every account without
	// its own setting (CONTRACTS §65); nil is off.
	RequestLogs *RequestLogDefault `json:"request_logs,omitempty"`

	// bundled holds the image references of the active plugin package
	// (§53.10), set when the configuration is loaded; never saved.
	bundled *RuntimeImages
}

// RuntimeImages are image references of the per-account runtime.
type RuntimeImages struct {
	App        string `json:"app"`
	Egress     string `json:"egress"`
	Controller string `json:"controller"`
	// Gateway is the Caddy image of the control panel (§53.3).
	Gateway string `json:"gateway"`
}

var (
	imageRefPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?$`)
	imageIDPattern  = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)
)

// validImage reports whether ref may be put into the install script: a
// repository[:tag][@digest] or a local image id.
func validImage(ref string) bool {
	return imageRefPattern.MatchString(ref) || imageIDPattern.MatchString(ref)
}

// EffectiveImages are the images installed, per role: the configured
// override, else the reference bundled in the active plugin package
// (§53.10), else the pinned references.
func (c Config) EffectiveImages() RuntimeImages {
	out := RuntimeImages{App: AppImage, Egress: EgressImage, Controller: ControllerImage, Gateway: GatewayImage}
	for _, img := range []*RuntimeImages{c.bundled, c.Images} {
		if img == nil {
			continue
		}
		if img.App != "" {
			out.App = img.App
		}
		if img.Egress != "" {
			out.Egress = img.Egress
		}
		if img.Controller != "" {
			out.Controller = img.Controller
		}
		if img.Gateway != "" {
			out.Gateway = img.Gateway
		}
	}
	return out
}

func (c Config) publicImages() RuntimeImages {
	if c.Images == nil {
		return RuntimeImages{}
	}
	return *c.Images
}

func (c Config) SSH() remotedocker.Config {
	return remotedocker.Config{Host: c.Host, Port: c.Port, User: c.User, AuthMode: c.AuthMode, Password: c.Password, PrivateKey: c.PrivateKey, Passphrase: c.Passphrase, HostKeyFingerprint: c.HostKeyFingerprint}
}

// panelScheme is the controller endpoint's scheme: "http" or "https".
func (c Config) panelScheme() string {
	if c.Scheme == "http" {
		return "http"
	}
	return "https"
}

func (c Config) Public() map[string]any {
	_, caFingerprint, _ := parseControllerCA(c.ControllerCA)
	return map[string]any{
		"account_runtimes":          c.AccountRuntimes,
		"mode":                      c.Mode,
		"scheme":                    c.panelScheme(),
		"base_path":                 c.BasePath,
		"host":                      c.Host,
		"port":                      c.Port,
		"user":                      c.User,
		"auth_mode":                 c.AuthMode,
		"host_key_fingerprint":      c.HostKeyFingerprint,
		"has_password":              c.Password != "",
		"has_private_key":           c.PrivateKey != "",
		"has_passphrase":            c.Passphrase != "",
		"has_admin_key":             c.AdminKey != "",
		"has_api_key":               c.APIKey != "",
		"has_controller_ca":         c.ControllerCA != "",
		"controller_ca_fingerprint": caFingerprint,
		"images":                    c.publicImages(),
		"effective_images":          c.EffectiveImages(),
		"network":                   c.EffectiveNetwork(),
		"request_policy":            c.EffectiveRequestPolicy(),
		"cc_feature_groups":         c.featureGroups(),
		"feature_revision":          c.FeatureRevision,
		"request_logs":              RequestLogDefault{Level: c.DefaultRequestLog()},
	}
}

type Service struct {
	DB     *store.DB
	Cipher *secret.Cipher
	// Authorizer answers the proxy visibility questions of the draft
	// endpoints (CONTRACTS §21.4); nil: callers without account:create see
	// no proxy.
	Authorizer core.Authorizer
	// Locker lets one node at a time sweep abandoned drafts (§49.13); nil:
	// this node only (single-node tests).
	Locker core.Locker
	// CanWork admits the draft sweep (managed cores sweep only once
	// admitted); nil always allows.
	CanWork func() bool
	// kick feeds Kick; nil (zero Service in tests) disables it.
	kick chan string
	// installMu serializes runtime installs without a Locker.
	installMu sync.Mutex
	// logReads: when each caller last read a request log file (one audit row
	// per file and window, request_log_viewer.go).
	logReads sync.Map
	// runScript / runLocalScript / openController replace
	// remotedocker.RunScript, remotedocker.RunLocalScript and the tunnel to
	// the controller in tests (nil: the real ones).
	runScript      scriptRunner
	runLocalScript localScriptRunner
	openController func(context.Context, Config) (*http.Client, string, func() error, error)
	openAccount    func(context.Context, Config, string) (*http.Client, func() error, error)
	// lookupIP replaces net.DefaultResolver.LookupIPAddr in tests.
	lookupIP func(context.Context, string) ([]net.IPAddr, error)
	// Bundle locates the active ccgateway plugin package of this node, whose
	// images/ carry the runtime images (CONTRACTS §53.10); nil: none.
	Bundle  func() (BundlePackage, bool)
	bundles bundleCache
	// Bus carries configuration and account changes between nodes (the
	// request cache and immediate reconciles); nil: this node only.
	Bus core.Bus
	// FactsObserved is called after an account's runtime was observed again
	// (re-authorization, health) and what it reported committed (CONTRACTS
	// §59): observed is what the runtime reported, subscriptionChanged that
	// the recorded subscription type changed. The account service gives the
	// plugin the facts (automatic models, read-only extensions such as the
	// login email); nil: nothing happens.
	FactsObserved func(ctx context.Context, accountID int64, observed core.AccountPreparationFacts, subscriptionChanged bool)
	// cache keeps what forwarding a model request needs (request_cache.go).
	cache requestCache
	// sweepNow asks Run for a reconcile pass of every runtime now.
	sweepNow chan struct{}
	// blocked: runtimes this node blocked, by key (Reconcile).
	blockedMu sync.Mutex
	blocked   map[string]blockedMark
}

func New(db *store.DB, cipher *secret.Cipher) *Service {
	return &Service{DB: db, Cipher: cipher, kick: make(chan string, 64), sweepNow: make(chan struct{}, 1)}
}
func (s *Service) decode(raw []byte) (Config, error) {
	c, err := s.decodeStored(raw)
	c.bundled = s.bundledImages()
	return c, err
}

// bundledImages are the references bundled in the active plugin package,
// nil without one.
func (s *Service) bundledImages() *RuntimeImages {
	b := s.bundle()
	if b == nil {
		return nil
	}
	refs := b.refs()
	return &refs
}

func (s *Service) decodeStored(raw []byte) (Config, error) {
	c := Config{Mode: "disabled", Port: 22}
	var envelope struct {
		Cipher []byte `json:"cipher"`
	}
	if len(raw) == 0 {
		p := newRequestPolicy()
		c.RequestPolicy = &p
		return c, nil
	}
	if json.Unmarshal(raw, &envelope) != nil {
		return c, errors.New("invalid configuration")
	}
	if len(envelope.Cipher) == 0 {
		p := newRequestPolicy()
		c.RequestPolicy = &p
		return c, nil
	}
	if s.Cipher == nil {
		return c, errors.New("encryption unavailable")
	}
	plain, e := s.Cipher.Decrypt(envelope.Cipher, configAAD)
	if e != nil {
		return c, errors.New("cannot decrypt configuration")
	}
	e = json.Unmarshal(plain, &c)
	return c, e
}
func (s *Service) Load(ctx context.Context) (Config, error) {
	c, _, e := s.loadVersioned(ctx)
	return c, e
}

// loadVersioned is Load plus the stored value as read: every write changes
// it (fresh ciphertext), so comparing it later under the row lock tells
// whether anyone saved meanwhile (§53.9 config_changed).
func (s *Service) loadVersioned(ctx context.Context) (Config, []byte, error) {
	if s == nil || s.DB == nil || s.DB.Pool == nil {
		return Config{}, nil, errors.New("configuration storage unavailable")
	}
	return s.loadIn(ctx, s.DB.Pool, false)
}

// loadIn is the stored configuration read through q (a transaction sees its
// own changes; forShare keeps it from changing until the transaction ends)
// and the stored value as read.
func (s *Service) loadIn(ctx context.Context, q store.Querier, forShare bool) (Config, []byte, error) {
	query := "SELECT value FROM settings WHERE key=$1"
	if forShare {
		query += " FOR SHARE"
	}
	var raw []byte
	e := q.QueryRow(ctx, query, settingKey).Scan(&raw)
	if store.IsNoRows(e) {
		// The row a later update creates holds {}.
		raw, e = []byte("{}"), nil
	}
	if e != nil {
		return Config{}, nil, e
	}
	c, e := s.decode(raw)
	if c.Mode == "local" {
		if c.AdminKey == "" {
			c.AdminKey = localAdminKey
		}
		if c.APIKey == "" {
			c.APIKey = localAPIKey
		}
	}
	return c, raw, e
}

// mergeConfig applies a PUT remote-config body to the saved configuration
// (§53.2 / §53.9). Per-account runtimes are the only mode: account_runtimes
// is always saved as true, and the mode is "controller" (connected) or
// "disabled" (not configured). A saved legacy "local" / "ssh" configuration
// keeps working and its other settings can still be saved while mode and
// target stay the same, but nothing can switch to a legacy mode; installing
// a controller migrates it.
func mergeConfig(c, old Config) (Config, error) {
	if err := mergeFeatureGroups(&c, old); err != nil {
		return c, err
	}
	c.AccountRuntimes = true
	if c.Mode == "ssh" && c.Port == 0 {
		c.Port = 22
	}
	legacy := (c.Mode == "ssh" || c.Mode == "local") && c.Mode == old.Mode &&
		(c.Mode == "local" || (c.Host == old.Host && c.Port == old.Port && c.User == old.User && c.AuthMode == old.AuthMode && c.HostKeyFingerprint == old.HostKeyFingerprint))
	if c.Mode != "disabled" && c.Mode != "controller" && !legacy {
		// Switching to a legacy mode (or to another legacy target).
		return c, errors.New("invalid mode")
	}
	// Network, request policy and images are independent of the target and
	// kept when disconnected too (the install uses the saved images).
	for _, merge := range []func(*Config, Config) error{mergeNetwork, mergeRequestPolicy, mergeImages, mergeRequestLogs} {
		if err := merge(&c, old); err != nil {
			return c, err
		}
	}
	if c.Mode == "disabled" {
		// Not configured: no target, no keys.
		return Config{Mode: "disabled", AccountRuntimes: true, Network: c.Network, RequestPolicy: c.RequestPolicy, Images: c.Images, CCFeatureGroups: c.CCFeatureGroups, FeatureRevision: c.FeatureRevision, RequestLogs: c.RequestLogs}, nil
	}
	if legacy {
		return mergeLegacy(c, old)
	}
	return mergeController(c, old)
}

// mergeFeatureGroups: omitted keeps the stored group policies; each named
// one must be a group id with valid overrides.
func mergeFeatureGroups(c *Config, old Config) error {
	if c.CCFeatureGroups == nil {
		// A copy: pruneFeatureGroups deletes from the saved map, and old
		// must stay what was stored.
		c.CCFeatureGroups = maps.Clone(old.CCFeatureGroups)
	}
	for key, group := range c.CCFeatureGroups {
		id, err := strconv.ParseInt(key, 10, 64)
		if err != nil || id <= 0 || strconv.FormatInt(id, 10) != key {
			return errors.New("invalid feature group id")
		}
		if err := group.Overrides.Validate(); err != nil {
			return err
		}
	}
	return nil
}

func mergeNetwork(c *Config, old Config) error {
	if c.Network == nil {
		c.Network = old.Network
	}
	network, err := validateNetwork(c.EffectiveNetwork())
	if err != nil {
		return err
	}
	c.Network = &network
	return nil
}

// mergeRequestPolicy merges the global policy (mergeStoredPolicy), validates
// it and moves the feature revision when the CC settings changed.
func mergeRequestPolicy(c *Config, old Config) error {
	// Checked before EffectiveRequestPolicy, which reads any other stored
	// relay mode as build (a saved one only migrates a policy from before
	// levels): a body naming one is still wrong.
	if c.RequestPolicy != nil && c.RequestPolicy.RelayMode != "" && c.RequestPolicy.RelayMode != "build" && c.RequestPolicy.RelayMode != "direct" {
		return errors.New("invalid relay_mode: must be build or direct")
	}
	if c.RequestPolicy == nil {
		c.RequestPolicy = old.RequestPolicy
	} else if old.RequestPolicy != nil {
		mergeStoredPolicy(c.RequestPolicy, *old.RequestPolicy)
	}
	policy := c.EffectiveRequestPolicy()
	if err := validateRequestPolicy(policy); err != nil {
		return err
	}
	c.RequestPolicy = &policy
	featureChanged := !reflect.DeepEqual(c.EffectiveRequestPolicy(), old.EffectiveRequestPolicy()) || !reflect.DeepEqual(c.CCFeatureGroups, old.CCFeatureGroups)
	if featureChanged && c.FeatureRevision != old.FeatureRevision {
		return featureRevisionConflict()
	}
	c.FeatureRevision = old.FeatureRevision
	if featureChanged {
		c.FeatureRevision++
	}
	return nil
}

// mergeStoredPolicy keeps what a body leaves out. Older clients do not know
// the newer fields: omission preserves them, while an explicit {} remains an
// intentional reset of a source map.
func mergeStoredPolicy(p *RequestPolicy, old RequestPolicy) {
	p.BuildBillingSources = mergeSourceMap(p.BuildBillingSources, old.BuildBillingSources)
	p.BuildIdentityLines = mergeSourceMap(p.BuildIdentityLines, old.BuildIdentityLines)
	if p.BuildInjection == nil {
		p.BuildInjection = old.BuildInjection
	}
	if p.BuildBillingEntrypoint == "" {
		p.BuildBillingEntrypoint = old.BuildBillingEntrypoint
	}
	p.BuildAttachmentSources = mergeSourceMap(p.BuildAttachmentSources, old.BuildAttachmentSources)
	p.RequestIdentitySources = mergeSourceMap(p.RequestIdentitySources, old.RequestIdentitySources)
	// A save without a level (a console from before levels) keeps the stored
	// one; the saved relay_mode then only applies to a stored policy from
	// before levels too, through the migration on read.
	if p.Level == "" {
		p.Level = old.Level
	}
	// Omitted keeps the stored Claude Code version too: it is never reset to
	// the pinned one by a body that does not name it (audit B3).
	if p.CLIVersion == "" {
		p.CLIVersion = old.CLIVersion
	}
}

// mergeImages: omitted keeps the saved ones, {} (empty fields) returns to the
// pinned references.
func mergeImages(c *Config, old Config) error {
	if c.Images == nil {
		c.Images = old.Images
	}
	if c.Images == nil {
		return nil
	}
	for _, ref := range []string{c.Images.App, c.Images.Egress, c.Images.Controller, c.Images.Gateway} {
		if ref != "" && !validImage(ref) {
			return errors.New("invalid runtime image reference")
		}
	}
	if *c.Images == (RuntimeImages{}) {
		c.Images = nil
	}
	return nil
}

// mergeController saves a control panel endpoint (§53.2 / §53.9).
func mergeController(c, old Config) (Config, error) {
	// The controller is reached over HTTP(S) only: no SSH credentials.
	c.clearSSH()
	c.Host = normalizeControllerHost(c.Host)
	switch c.Scheme {
	case "", "https":
		c.Scheme = "https"
	case "http":
	default:
		return c, errors.New("invalid control panel scheme")
	}
	if c.Port == 0 {
		c.Port = 443
		if c.Scheme == "http" {
			c.Port = 80
		}
	}
	basePath, ok := normalizeBasePath(c.BasePath)
	if !ok {
		return c, errors.New("invalid control panel base path")
	}
	c.BasePath = basePath
	if err := mergeControllerKeys(&c, old); err != nil {
		return c, err
	}
	if e := validateControllerConfig(c); e != nil {
		return c, e
	}
	return c, nil
}

// mergeControllerKeys: the keys are kept only for the same saved endpoint
// (scheme, address, port, base path) and trust. The panel is public and the
// key reaches the accounts, so pointing the core elsewhere (or leaving a
// legacy mode) needs it typed again; the install endpoint sets it itself.
func mergeControllerKeys(c *Config, old Config) error {
	same := old.Mode == "controller" && c.Host == old.Host && c.Port == old.Port && c.Scheme == old.panelScheme() && c.BasePath == old.BasePath
	typedKey := c.AdminKey != ""
	if same {
		if c.AdminKey == "" {
			c.AdminKey = old.AdminKey
		}
		if c.APIKey == "" {
			c.APIKey = old.APIKey
		}
		if c.ControllerCA == "" {
			c.ControllerCA = old.ControllerCA
		}
	}
	if c.Scheme == "http" {
		c.ControllerCA = "" // no TLS, nothing to pin
	}
	if err := checkSidecarKeys(c.AdminKey, c.APIKey); err != nil {
		return err
	}
	if c.ControllerCA != "" {
		normalized, _, e := parseControllerCA(c.ControllerCA)
		if e != nil {
			return e
		}
		c.ControllerCA = normalized
	}
	if !typedKey && c.ControllerCA != old.ControllerCA {
		c.AdminKey = "" // new trust anchor: the key must be typed again
	}
	return nil
}

// checkSidecarKeys bounds the management and API keys (they travel in
// headers) and keeps them apart.
func checkSidecarKeys(admin, api string) error {
	if len(admin) > 8192 || len(api) > 8192 || strings.ContainsAny(admin+api, "\r\n") {
		return errors.New("invalid sidecar keys")
	}
	if admin != "" && admin == api {
		return errors.New("API and management keys must differ")
	}
	return nil
}

// mergeLegacy saves the other settings of a configuration still on a legacy
// "ssh" / "local" target (same mode and target as saved, §53.9): typed
// credentials and keys replace the saved ones, omitted ones are kept.
func mergeLegacy(c, old Config) (Config, error) {
	c.Scheme, c.BasePath, c.ControllerCA = "", "", ""
	if c.Password == "" {
		c.Password = old.Password
	}
	if c.PrivateKey == "" {
		c.PrivateKey = old.PrivateKey
		if c.Passphrase == "" {
			c.Passphrase = old.Passphrase
		}
	}
	if c.AdminKey == "" {
		c.AdminKey = old.AdminKey
	}
	if c.APIKey == "" {
		c.APIKey = old.APIKey
	}
	if err := checkSidecarKeys(c.AdminKey, c.APIKey); err != nil {
		return c, err
	}
	if c.Mode == "local" {
		c.Host, c.Port = "", old.Port
		c.clearSSH()
		return c, nil
	}
	if e := remotedocker.Validate(c.SSH()); e != nil {
		return c, e
	}
	if c.AuthMode == "password" {
		c.PrivateKey, c.Passphrase = "", ""
	} else {
		c.Password = ""
	}
	return c, nil
}

func (c *Config) clearSSH() {
	c.User = ""
	c.AuthMode = ""
	c.Password = ""
	c.PrivateKey = ""
	c.Passphrase = ""
	c.HostKeyFingerprint = ""
}

// pruneFeatureGroups checks the saved CC feature groups against the groups
// table: a key the body names must exist; a key only the stored configuration
// still holds (its group was deleted meanwhile) is dropped here, the next
// time anyone saves, so orphans do not accumulate (audit A5).
func pruneFeatureGroups(ctx context.Context, tx pgx.Tx, saved *Config, named map[string]GroupFeaturePolicy) error {
	if len(saved.CCFeatureGroups) == 0 {
		return nil
	}
	ids := make([]int64, 0, len(saved.CCFeatureGroups))
	for key := range saved.CCFeatureGroups {
		id, _ := strconv.ParseInt(key, 10, 64)
		ids = append(ids, id)
	}
	rows, err := tx.Query(ctx, "SELECT id FROM groups WHERE id = ANY($1)", ids)
	if err != nil {
		return err
	}
	existing, err := pgx.CollectRows(rows, pgx.RowTo[int64])
	if err != nil {
		return err
	}
	live := map[string]bool{}
	for _, id := range existing {
		live[strconv.FormatInt(id, 10)] = true
	}
	for key := range saved.CCFeatureGroups {
		if live[key] {
			continue
		}
		if _, inBody := named[key]; inBody {
			return core.ErrInvalidArgument.WithMessage("Unknown CC feature group.").WithDetails(map[string]any{"group_id": key})
		}
		delete(saved.CCFeatureGroups, key)
	}
	return nil
}

// admitSavedCLIVersion checks the cli_version a PUT remote-config body
// changes (admitCLIVersion); admitted is the version checked ("" when the
// body keeps the stored one). A stored configuration that cannot be read is
// that error, not a later config_changed.
func (s *Service) admitSavedCLIVersion(ctx context.Context, in Config) (admitted string, err error) {
	requested := requestedCLIVersion(in)
	if requested == "" {
		return "", nil
	}
	current, err := s.Load(ctx)
	if err != nil {
		return "", err
	}
	if requested == current.EffectiveRequestPolicy().CLIVersion {
		return "", nil
	}
	if err := s.admitCLIVersion(ctx, current, requested); err != nil {
		return "", err
	}
	return requested, nil
}

// mergeStored is one save under the settings row lock: the stored
// configuration (raw) merged with the body, its feature groups checked. A
// cli_version change other than the admitted one (someone saved another
// meanwhile) is refused.
func (s *Service) mergeStored(ctx context.Context, tx pgx.Tx, in Config, raw json.RawMessage, admitted string) (saved, old Config, err error) {
	old, err = s.decode(raw)
	if err != nil {
		return saved, old, err
	}
	saved, err = mergeConfig(in, old)
	if err != nil {
		// mergeConfig's errors name what is wrong with the body: the caller
		// gets the text (audit A5); a conflict keeps its code.
		if core.AsError(err).Code == core.ErrInternal.Code {
			err = core.ErrInvalidArgument.WithMessage(err.Error())
		}
		return saved, old, err
	}
	if v := saved.EffectiveRequestPolicy().CLIVersion; v != old.EffectiveRequestPolicy().CLIVersion && v != admitted {
		return saved, old, reasonError(core.ErrConflict, "config_changed")
	}
	if err := pruneFeatureGroups(ctx, tx, &saved, in.CCFeatureGroups); err != nil {
		return saved, old, err
	}
	saved.bundled = old.bundled
	return saved, old, nil
}

// sealConfig is the stored form of c: {"cipher": <encrypted JSON>}.
func (s *Service) sealConfig(c Config) (json.RawMessage, error) {
	if s.Cipher == nil {
		return nil, errors.New("encryption unavailable")
	}
	plain, _ := json.Marshal(c)
	enc, err := s.Cipher.Encrypt(plain, configAAD)
	if err != nil {
		return nil, err
	}
	return json.Marshal(map[string]any{"cipher": enc})
}

func (s *Service) save(c *gin.Context) {
	httpapi.NoStore(c)
	var in Config
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 192<<10)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	ctx := audit.Context(c)
	uid, _ := core.UserID(ctx)
	var updatedBy *int64
	if uid > 0 {
		updatedBy = &uid
	}
	// A changed Claude Code version is checked against what the runtimes run
	// before anything is written (audit B3): asking the Workers takes a while
	// and must not hold the settings row.
	admitted, e := s.admitSavedCLIVersion(c.Request.Context(), in)
	if e != nil {
		httpapi.Fail(c, e)
		return
	}
	var saved Config
	var runtimeChanged bool
	e = s.DB.Tx(ctx, func(tx pgx.Tx) error {
		_, e := store.UpdateSettingJSONTx(ctx, tx, settingKey, updatedBy, func(raw json.RawMessage) (json.RawMessage, error) {
			var old Config
			var e error
			saved, old, e = s.mergeStored(ctx, tx, in, raw, admitted)
			if e != nil {
				return nil, e
			}
			runtimeChanged = !sameRuntimeConfig(saved, old)
			return s.sealConfig(saved)
		})
		if e != nil {
			return e
		}
		return audit.Audit(ctx, tx, uid, "ccgateway.config.update", "system", "ccgateway", nil)
	})
	if e != nil {
		// Validation and conflicts carry their own message; anything else
		// (storage, encryption) is a server fault: Fail renders it as a
		// generic internal error and logs the cause.
		httpapi.Fail(c, e)
		return
	}
	if runtimeChanged {
		s.configChanged(ctx)
	} else {
		s.featureConfigChanged(ctx)
	}
	if runtimeChanged && saved.AccountRuntimes {
		if keys, err := s.runtimeKeys(ctx); err == nil {
			for _, key := range keys {
				s.Kick(key)
			}
		}
	}
	httpapi.OK(c, saved.Public())
}
