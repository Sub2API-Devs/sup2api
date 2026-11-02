// Package config reads and checks the controller's CCG_* environment
// (behaviour E1, E2, E5, V19-V22, V27 and the EV table; 02 §1.3).
//
// FROZEN: the Config fields are read by every business package.
package config

import (
	"errors"
	"fmt"
	"net/netip"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
)

// Defaults.
const (
	DefaultPort         = 8787
	DefaultBind         = "127.0.0.1"
	DefaultDiskGiB      = 10
	DefaultVersion      = "dev"
	DefaultProbeURL     = "https://www.gstatic.com/generate_204"
	MinControllerKeyLen = 32
	guardTokenHexLength = 64
)

// Config is the controller's configuration.
type Config struct {
	ControllerKey string // CCG_CONTROLLER_KEY, at least 32 characters
	Root          string // CCG_RUNTIME_ROOT (in the compose container: /data)
	Prefix        string // CCG_RUNTIME_PREFIX, default "ccg"
	Bind          string // CCG_CONTROLLER_BIND, default 127.0.0.1 (compose sets 0.0.0.0)
	Port          int    // CCG_CONTROLLER_PORT, default 8787
	Name          string // CCG_CONTROLLER_NAME, default ccg-controller (checked, otherwise unused)

	AppImage        string // CCG_APP_IMAGE (required): target app image at start
	EgressImage     string // CCG_EGRESS_IMAGE (required): target egress image at start
	ControllerImage string // CCG_CONTROLLER_IMAGE, default ""
	XrayImage       string // CCG_XRAY_IMAGE, optional: pinned gateway image
	Version         string // CCG_CONTROLLER_VERSION, else the build version, else "dev"

	AccountDiskBytes int64 // CCG_ACCOUNT_DISK_GIB << 30
	RequireDiskQuota bool  // CCG_ACCOUNT_DISK_QUOTA_REQUIRED == "1"

	GuardURL   string // CCG_GUARD_URL: http://<IPv4>:<port>
	GuardToken string // CCG_GUARD_TOKEN: 64 lower-case hex characters

	ProbeURL string // fixed https://www.gstatic.com/generate_204 (tests may change it)
}

// Error is a configuration failure: the controller exits with code 2.
type Error struct{ Msg string }

func (e *Error) Error() string { return e.Msg }

func fail(format string, args ...any) error { return &Error{Msg: fmt.Sprintf(format, args...)} }

var diskGiB = regexp.MustCompile(`^[1-9][0-9]{0,3}$`)
var hexToken = regexp.MustCompile(`^[0-9a-f]{64}$`)

// FromEnv reads the configuration through lookup (os.LookupEnv in
// production). buildVersion is the version linked into the binary (used when
// CCG_CONTROLLER_VERSION is unset or empty). Like Python, an empty
// CCG_RUNTIME_PREFIX, CCG_ACCOUNT_DISK_GIB or CCG_ACCOUNT_DISK_QUOTA_REQUIRED
// is invalid (os.getenv(name, default) returns the empty value), while an
// empty CCG_CONTROLLER_NAME, CCG_CONTROLLER_PORT or CCG_CONTROLLER_VERSION
// means the default (`or default`).
func FromEnv(lookup func(string) (string, bool), buildVersion string) (Config, error) {
	getenv := func(name string) string { v, _ := lookup(name); return v }
	getenvDefault := func(name, def string) string {
		if v, ok := lookup(name); ok {
			return v
		}
		return def
	}
	c := Config{ProbeURL: DefaultProbeURL}
	c.ControllerKey = getenv("CCG_CONTROLLER_KEY")
	if c.ControllerKey == "" {
		return c, fail("CCG_CONTROLLER_KEY is required")
	}
	if len([]rune(c.ControllerKey)) < MinControllerKeyLen {
		return c, fail("controller key must contain at least 32 characters")
	}
	c.Root = getenv("CCG_RUNTIME_ROOT")
	if c.Root == "" {
		return c, fail("CCG_RUNTIME_ROOT is required")
	}
	c.AppImage = getenv("CCG_APP_IMAGE")
	c.EgressImage = getenv("CCG_EGRESS_IMAGE")
	if c.AppImage == "" || c.EgressImage == "" {
		return c, fail("CCG_APP_IMAGE and CCG_EGRESS_IMAGE are required")
	}
	c.Prefix = getenvDefault("CCG_RUNTIME_PREFIX", names.DefaultPrefix)
	if !names.Prefix.MatchString(c.Prefix) {
		return c, fail("invalid prefix")
	}
	disk := getenvDefault("CCG_ACCOUNT_DISK_GIB", strconv.Itoa(DefaultDiskGiB))
	n, _ := strconv.Atoi(disk)
	if !diskGiB.MatchString(disk) || n < 1 || n > 1024 {
		return c, fail("CCG_ACCOUNT_DISK_GIB must be an integer between 1 and 1024")
	}
	c.AccountDiskBytes = int64(n) << 30
	switch required := getenvDefault("CCG_ACCOUNT_DISK_QUOTA_REQUIRED", "0"); required {
	case "0":
	case "1":
		c.RequireDiskQuota = true
	default:
		return c, fail("CCG_ACCOUNT_DISK_QUOTA_REQUIRED must be 0 or 1")
	}
	c.Name = getenv("CCG_CONTROLLER_NAME")
	if c.Name == "" {
		c.Name = names.DefaultControllerName
	}
	if !names.ControllerName.MatchString(c.Name) {
		return c, fail("invalid controller name")
	}
	c.Port = DefaultPort
	if raw := getenv("CCG_CONTROLLER_PORT"); raw != "" {
		port, err := pyjson.IntOf(raw) // int(): ' 8787' and '+8787' are accepted
		if err != nil || port < 1 || port > 65535 {
			return c, fail("invalid CCG_CONTROLLER_PORT")
		}
		c.Port = int(port)
	}
	c.Bind = getenv("CCG_CONTROLLER_BIND")
	if c.Bind == "" {
		c.Bind = DefaultBind
	}
	if _, err := netip.ParseAddr(c.Bind); err != nil {
		return c, fail("invalid CCG_CONTROLLER_BIND")
	}
	c.Version = getenv("CCG_CONTROLLER_VERSION")
	if c.Version == "" {
		c.Version = buildVersion
	}
	if c.Version == "" {
		c.Version = DefaultVersion
	}
	c.ControllerImage = getenv("CCG_CONTROLLER_IMAGE")
	c.XrayImage = getenv("CCG_XRAY_IMAGE")
	var err error
	if c.GuardURL, err = CheckGuardURL(getenv("CCG_GUARD_URL")); err != nil {
		return c, err
	}
	c.GuardToken = getenv("CCG_GUARD_TOKEN")
	if !hexToken.MatchString(c.GuardToken) {
		return c, fail("CCG_GUARD_TOKEN must be 64 lower-case hex characters")
	}
	return c, nil
}

// CheckGuardURL accepts exactly http://<IPv4>:<port> (an optional trailing
// slash is dropped) and returns it without the slash.
func CheckGuardURL(raw string) (string, error) {
	if raw == "" {
		return "", fail("CCG_GUARD_URL is required")
	}
	raw = strings.TrimSuffix(raw, "/")
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "http" || u.User != nil || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || u.Opaque != "" {
		return "", fail("CCG_GUARD_URL must be http://<IPv4>:<port>")
	}
	host, portText := u.Hostname(), u.Port()
	addr, err := netip.ParseAddr(host)
	port, perr := strconv.Atoi(portText)
	if err != nil || !addr.Is4() || perr != nil || port < 1 || port > 65535 || u.Host != host+":"+portText {
		return "", fail("CCG_GUARD_URL must be http://<IPv4>:<port>")
	}
	return raw, nil
}

// IsConfigError reports whether err is a configuration failure.
func IsConfigError(err error) bool {
	var e *Error
	return errors.As(err, &e)
}
