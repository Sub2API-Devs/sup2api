// Package names builds and parses every Docker resource name the guard
// touches. Names are always built by the guard; the controller only ever
// passes an account key and a role suffix (03 §2.3, §3.3).
package names

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"
	"strings"
)

// Labels shared with the Python controller (common.py) and compose.
const (
	LabelAccount   = "io.sup2api.ccgateway.account"
	LabelAuth      = "io.sup2api.ccgateway.auth"
	LabelImage     = "io.sup2api.ccgateway.image"
	LabelNetwork   = "io.sup2api.ccgateway.network"
	LabelDiskQuota = "io.sup2api.ccgateway.disk-quota-bytes"
	LabelShared    = "io.sup2api.ccgateway.shared"        // gateway owner = prefix
	LabelGuardAPI  = "io.sup2api.ccgateway.guard-api"     // controller image
	LabelSharedEgr = "io.sup2api.ccgateway.shared-egress" // controller and gateway image
	LabelJob       = "io.sup2api.ccgateway.guard-job"     // guard one-shot containers, value = prefix

	LabelComposeProject = "com.docker.compose.project"
	LabelComposeService = "com.docker.compose.service"

	// UplinkKey is the pseudo account of the shared gateway's uplink network.
	UplinkKey = "d0000000000000000"
)

// KEY is common.KEY_PATTERN anchored: an account id or a draft key.
var KEY = regexp.MustCompile(`^(?:[1-9][0-9]{0,17}|d[0-9a-f]{16})$`)

// ContainerRole is the role suffix of an account container name.
var ContainerRole = regexp.MustCompile(`^(?:app|egress)(?:-[A-Za-z0-9_.-]+)?$`)

// Prefix is the instance prefix rule (03 §10.1).
var Prefix = regexp.MustCompile(`^[a-z][a-z0-9-]{0,32}$`)

var oneshotSuffix = regexp.MustCompile(`^[0-9a-f]{16}$`)

// ValidKey reports whether aid is an account key.
func ValidKey(aid string) bool { return KEY.MatchString(aid) }

// Names builds resource names for one instance prefix.
type Names struct{ Prefix string }

func (n Names) App(aid string) string          { return n.Prefix + "-" + aid + "-app" }
func (n Names) Net(aid string) string          { return n.Prefix + "-" + aid + "-net" }
func (n Names) LegacyUplink(aid string) string { return n.Prefix + "-" + aid + "-uplink" }
func (n Names) Volume(aid string) string       { return n.Prefix + "-" + aid + "-data" }
func (n Names) Container(aid, suffix string) string {
	return n.Prefix + "-" + aid + "-" + suffix
}
func (n Names) Gateway() string       { return n.Prefix + "-shared-egress" }
func (n Names) GatewayUplink() string { return n.Prefix + "-" + UplinkKey + "-xray-uplink" }
func (n Names) Controller() string    { return n.Prefix + "-controller" }

// Oneshot returns a fresh <p>-oneshot-<16 hex> name (Python's helper name,
// 03 §4.1 item 5).
func (n Names) Oneshot() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err) // crypto/rand never fails on supported platforms
	}
	return n.Prefix + "-oneshot-" + hex.EncodeToString(b[:])
}

// OneshotPrefix is the name prefix of one-shot containers.
func (n Names) OneshotPrefix() string { return n.Prefix + "-oneshot-" }

// IsOneshot reports whether name (with or without the leading "/") is a
// one-shot container of this prefix.
func (n Names) IsOneshot(name string) bool {
	name = strings.TrimPrefix(name, "/")
	rest, ok := strings.CutPrefix(name, n.OneshotPrefix())
	return ok && oneshotSuffix.MatchString(rest)
}

// split cuts "<prefix>-<aid>-<role>" into its parts; aid must be a KEY.
func (n Names) split(name string) (aid, role string, ok bool) {
	name = strings.TrimPrefix(name, "/")
	rest, found := strings.CutPrefix(name, n.Prefix+"-")
	if !found {
		return "", "", false
	}
	aid, role, found = strings.Cut(rest, "-")
	if !found || !KEY.MatchString(aid) || role == "" {
		return "", "", false
	}
	return aid, role, true
}

// ParseContainer reverses Container: the whole name must be prefix, KEY and
// a ContainerRole.
func (n Names) ParseContainer(name string) (aid, role string, ok bool) {
	aid, role, ok = n.split(name)
	if !ok || !ContainerRole.MatchString(role) {
		return "", "", false
	}
	return aid, role, true
}

// ParseNetwork reverses Net, LegacyUplink and GatewayUplink; role is "net",
// "uplink" or "xray-uplink" (the last only for UplinkKey).
func (n Names) ParseNetwork(name string) (aid, role string, ok bool) {
	aid, role, ok = n.split(name)
	if !ok {
		return "", "", false
	}
	switch {
	case role == "net" || role == "uplink":
		return aid, role, true
	case role == "xray-uplink" && aid == UplinkKey:
		return aid, role, true
	}
	return "", "", false
}

// ParseVolume reverses Volume.
func (n Names) ParseVolume(name string) (aid string, ok bool) {
	aid, role, ok := n.split(name)
	if !ok || role != "data" {
		return "", false
	}
	return aid, true
}
