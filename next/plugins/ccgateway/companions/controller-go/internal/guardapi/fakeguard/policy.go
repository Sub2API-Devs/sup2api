package fakeguard

import (
	"net/netip"
	"path"
	"regexp"
	"strings"

	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
)

// apiError is an error answer of the guard (03 §3.3).
type apiError struct {
	status  int
	code    string
	reason  string
	message string
	names   []string
}

func (e *apiError) Error() string { return e.code + "/" + e.reason + ": " + e.message }

func badRequest(msg string) *apiError {
	return &apiError{status: 400, code: "invalid_request", message: msg}
}
func forbidden(reason, msg string) *apiError {
	return &apiError{status: 403, code: "forbidden", reason: reason, message: msg}
}
func notFound(reason string) *apiError {
	return &apiError{status: 404, code: "not_found", reason: reason, message: reason + " not found"}
}
func conflict(reason, msg string, nm ...string) *apiError {
	return &apiError{status: 409, code: "conflict", reason: reason, message: msg, names: nm}
}
func dockerError(reason, msg string) *apiError {
	return &apiError{status: 502, code: "docker_error", reason: reason, message: msg}
}

// Validation rules of the guard's policy package (03 §3.3, §3.5, §4).
var (
	envName     = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)
	privatePool = []netip.Prefix{netip.MustParsePrefix("10.0.0.0/8"), netip.MustParsePrefix("172.16.0.0/12"),
		netip.MustParsePrefix("192.168.0.0/16")}
)

const (
	maxEnv          = 128
	maxEnvBytes     = 64 << 10
	maxArgv         = 256
	maxArgBytes     = 128 << 10
	maxArgvBytes    = 1 << 20
	maxJobArgv      = 64
	maxRules        = 64 << 10
	maxLabel        = 4096
	maxAuthLabel    = 256
	maxPath         = 4096
	minAppMemory    = 256 << 20
	maxAppMemory    = 4 << 30
	minNanoCPUs     = 1e8
	maxNanoCPUs     = 4e9
	maxJobMemory    = 2 << 30
	minVolume       = 1 << 30
	maxVolume       = 1 << 40
	maxImageFile    = 512 << 20
	maxGatewayFile  = 4 << 20
	maxArchivePut   = 600 << 20
	maxLoad         = 4 << 30
	gatewayLockName = "<gateway>"
)

func checkAID(aid string) *apiError {
	if !names.Key.MatchString(aid) {
		return badRequest("invalid account key")
	}
	return nil
}

func checkSubnet(subnet, gateway string) (netip.Prefix, *apiError) {
	p, err := netip.ParsePrefix(subnet)
	if err != nil || !p.Addr().Is4() || p.Masked() != p {
		return netip.Prefix{}, badRequest("subnet must be an IPv4 CIDR")
	}
	if p.Bits() < 24 || p.Bits() > 29 {
		return netip.Prefix{}, badRequest("subnet prefix length must be 24..29")
	}
	inside := false
	for _, pool := range privatePool {
		if pyjson.SubnetOf(p, pool) {
			inside = true
		}
	}
	if !inside {
		return netip.Prefix{}, badRequest("subnet must be RFC 1918")
	}
	if gateway != hostAt(p, 1).String() {
		return netip.Prefix{}, badRequest("gateway must be the subnet's .1")
	}
	return p, nil
}

func checkPolicyLabel(label string) *apiError {
	if len(label) > maxLabel {
		return badRequest("policy_label too long")
	}
	v, err := pyjson.Decode([]byte(label))
	if err != nil {
		return badRequest("policy_label must be a JSON object")
	}
	if _, ok := v.(pyjson.Ordered); !ok {
		return badRequest("policy_label must be a JSON object")
	}
	return nil
}

// hostInSubnet: in the subnet, not the network address, .1 or broadcast.
func hostInSubnet(ip string, p netip.Prefix) (netip.Addr, *apiError) {
	a, err := pyjson.IPv4Address(ip)
	if err != nil {
		return netip.Addr{}, badRequest("invalid IPv4 address")
	}
	if !p.Contains(a) || a == p.Masked().Addr() || a == hostAt(p, 1) || a == broadcast(p) {
		return netip.Addr{}, badRequest("address outside the account subnet")
	}
	return a, nil
}

func checkEnv(env map[string]string) *apiError {
	if len(env) > maxEnv {
		return badRequest("too many environment variables")
	}
	total := 0
	for k, v := range env {
		if !envName.MatchString(k) {
			return badRequest("invalid environment variable name")
		}
		if strings.ContainsRune(v, 0) {
			return badRequest("environment value contains NUL")
		}
		total += len(k) + len(v)
	}
	if total > maxEnvBytes {
		return badRequest("environment too large")
	}
	return nil
}

func checkAuthLabel(s string) *apiError {
	if len(s) > maxAuthLabel {
		return badRequest("auth_label too long")
	}
	for i := 0; i < len(s); i++ {
		if s[i] < 0x20 || s[i] > 0x7e {
			return badRequest("auth_label must be printable ASCII")
		}
	}
	return nil
}

func checkArgv(argv []string, min, max int) *apiError {
	if len(argv) < min || len(argv) > max {
		return badRequest("invalid argv length")
	}
	total := 0
	for _, a := range argv {
		if len(a) > maxArgBytes || strings.ContainsRune(a, 0) {
			return badRequest("invalid argv item")
		}
		total += len(a)
	}
	if total > maxArgvBytes {
		return badRequest("argv too large")
	}
	return nil
}

func checkAbsPath(p string) *apiError {
	if p == "" || len(p) > maxPath || strings.ContainsRune(p, 0) || !strings.HasPrefix(p, "/") || path.Clean(p) != p {
		return badRequest("path must be absolute and clean")
	}
	return nil
}

func checkImageRef(ref string) *apiError {
	if !names.ValidImage(ref) {
		return badRequest("invalid image reference")
	}
	return nil
}

func validCaps(caps []string, volume string) *apiError {
	allowed := map[string]bool{"CHOWN": true, "DAC_OVERRIDE": true, "FOWNER": true}
	seen := map[string]bool{}
	for _, c := range caps {
		if !allowed[c] || seen[c] {
			return forbidden("policy", "capability not allowed")
		}
		seen[c] = true
	}
	if len(caps) > 0 && volume != "rw" {
		return forbidden("policy", "capabilities only with a writable volume")
	}
	return nil
}

// repoOf is the repository part of a reference (without tag and digest).
func repoOf(ref string) string {
	if i := strings.Index(ref, "@"); i >= 0 {
		ref = ref[:i]
	}
	last := strings.LastIndexByte(ref, '/')
	if i := strings.LastIndexByte(ref, ':'); i > last {
		ref = ref[:i]
	}
	return ref
}

// qualified is images._qualified: docker.io/library/x for x.
func qualified(repo string) string {
	first, _, hasSlash := strings.Cut(repo, "/")
	if hasSlash && (strings.Contains(first, ".") || strings.Contains(first, ":") || first == "localhost") {
		return repo
	}
	if hasSlash {
		return "docker.io/" + repo
	}
	return "docker.io/library/" + repo
}

func repoAllowed(ref string, repos []string) bool {
	if repos == nil {
		return true
	}
	repo := repoOf(ref)
	for _, r := range repos {
		if r == repo || r == qualified(repo) || qualified(r) == qualified(repo) {
			return true
		}
	}
	return false
}
