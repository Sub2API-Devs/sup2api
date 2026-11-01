// Package names holds the controller's patterns, labels, ports and resource
// names (the constant part of Python common.py and manager.py).
//
// Python's re.fullmatch is written as an anchored RE2 pattern: RE2's `$`
// never matches before a trailing newline, the same as fullmatch.
//
// FROZEN: shared by every package.
package names

import (
	"regexp"
	"strings"
	"time"

	"ccgateway/controller/internal/errs"
)

// KeyPattern is a runtime key: an account id or a draft key (V1).
const KeyPattern = `(?:[1-9][0-9]{0,17}|d[0-9a-f]{16})`

var (
	Key            = regexp.MustCompile(`^` + KeyPattern + `$`)
	Draft          = regexp.MustCompile(`^d[0-9a-f]{16}$`)
	Revision       = regexp.MustCompile(`^[a-f0-9]{64}$`)
	SHA256Hex      = regexp.MustCompile(`^[0-9a-f]{64}$`)
	Version        = regexp.MustCompile(`^[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}$`) // a CLI version (V4)
	ImageRef       = regexp.MustCompile(`^[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?$`)
	ImageID        = regexp.MustCompile(`^sha256:[0-9a-f]{64}$`)
	ControllerName = regexp.MustCompile(`^[a-z][a-z0-9-]{0,40}$`) // V19
	Prefix         = regexp.MustCompile(`^[a-z][a-z0-9-]{0,24}$`) // V20
	// AccountContainerRole is what follows <prefix>-<key>- in the name of a
	// runtime's container: its role, optionally suffixed (D2).
	AccountContainerRole = regexp.MustCompile(`^(?:app|egress)(?:-[A-Za-z0-9_.-]+)?$`)
	Lease                = regexp.MustCompile(`^[a-f0-9]{48}$`)         // V26
	Patch                = regexp.MustCompile(`^ccgateway-[a-z0-9-]+$`) // V25
	UploadID             = regexp.MustCompile(`^[A-Za-z0-9_-]{22}$`)    // V11
	WorkerBackupName     = regexp.MustCompile(`^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}$`)
)

// Docker labels (S39).
const (
	LabelAccount      = "io.sup2api.ccgateway.account"
	LabelAuth         = "io.sup2api.ccgateway.auth"
	LabelImage        = "io.sup2api.ccgateway.image"
	LabelNetwork      = "io.sup2api.ccgateway.network"
	LabelDiskQuota    = "io.sup2api.ccgateway.disk-quota-bytes"
	LabelSharedOwner  = "io.sup2api.ccgateway.shared"
	LabelSharedSchema = "io.sup2api.ccgateway.shared-egress"
	LabelGuardAPI     = "io.sup2api.ccgateway.guard-api"
	LabelGuardJob     = "io.sup2api.ccgateway.guard-job"
)

const (
	// WorkerPort is where every account Worker listens on its private network.
	WorkerPort = 8787
	// UplinkKey is the account label value of the gateway's own uplink network.
	UplinkKey = "d0000000000000000"
	// SharedBackend is state.egress_backend (S21).
	SharedBackend = "shared_xray"
	// DefaultPrefix of every resource name.
	DefaultPrefix = "ccg"
	// DefaultControllerName is CCG_CONTROLLER_NAME's default.
	DefaultControllerName = "ccg-controller"
	// ELFMagic starts every Linux executable.
	ELFMagic = "\x7fELF"
)

// Image environment variables a business image must not carry (V9).
var (
	ProxyVars = []string{"HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
		"http_proxy", "https_proxy", "all_proxy", "no_proxy"}
	AuthVars = []string{"ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN",
		"CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR"}
)

// CheckKey is common.check: BadRequest unless aid is a runtime key.
func CheckKey(aid string) error {
	if !Key.MatchString(aid) {
		return errs.New(errs.BadRequest, "invalid runtime key")
	}
	return nil
}

// IsDraft reports whether aid is a draft key.
func IsDraft(aid string) bool { return Draft.MatchString(aid) }

// ValidImage is common.valid_image: a reference or a local image ID (V3).
func ValidImage(ref string) bool { return ImageRef.MatchString(ref) || ImageID.MatchString(ref) }

// Name is <prefix>-<aid>-<role> (Manager.name); aid must already be checked.
func Name(prefix, aid, role string) string { return prefix + "-" + aid + "-" + role }

// SharedGateway is the shared gateway container's name.
func SharedGateway(prefix string) string { return prefix + "-shared-egress" }

// OneshotPrefix starts the name of every one-shot helper (Python and guard).
func OneshotPrefix(prefix string) string { return prefix + "-oneshot-" }

// ContainerOf is Manager.container_of: whether name is a container name of
// runtime aid (its role, optionally suffixed).
func ContainerOf(prefix, aid, name string) bool {
	head := prefix + "-" + aid + "-"
	return strings.HasPrefix(name, head) && AccountContainerRole.MatchString(name[len(head):])
}

// CheckBusinessImage is common.check_business_image on an image's
// Config.Env: InvalidImage when it names a proxy or credential variable.
func CheckBusinessImage(env []string) error {
	for _, v := range env {
		name, _, _ := strings.Cut(v, "=")
		for _, bad := range ProxyVars {
			if name == bad {
				return errs.New(errs.InvalidImage, "business image contains account credentials or proxy environment variables")
			}
		}
		for _, bad := range AuthVars {
			if name == bad {
				return errs.New(errs.InvalidImage, "business image contains account credentials or proxy environment variables")
			}
		}
	}
	return nil
}

// RFC3339 is common.rfc3339: UTC, second precision.
func RFC3339(t time.Time) string { return t.UTC().Format("2006-01-02T15:04:05Z") }

// ResolvConf is common.resolv_conf (the guard writes the file; kept for tests
// and the documentation of the format, R11).
func ResolvConf(nameserver string) string {
	return "nameserver " + nameserver + "\noptions timeout:2 attempts:2\n"
}
