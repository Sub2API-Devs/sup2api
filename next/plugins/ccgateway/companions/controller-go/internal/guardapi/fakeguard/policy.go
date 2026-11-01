package fakeguard

import (
	"mime"
	"net/http"
	"net/netip"
	"net/url"
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
	maxEnv         = 128
	maxEnvBytes    = 64 << 10
	maxArgv        = 256
	maxArgBytes    = 128 << 10
	maxArgvBytes   = 1 << 20
	maxJobArgv     = 64
	maxRules       = 64 << 10
	maxLabel       = 4096
	maxAuthLabel   = 256
	maxPath        = 4096
	minAppMemory   = 256 << 20
	maxAppMemory   = 4 << 30
	minNanoCPUs    = 1e8
	maxNanoCPUs    = 4e9
	minJobMemory   = 64 << 20
	maxJobMemory   = 2 << 30
	minVolume      = 1 << 30
	maxVolume      = 1 << 40
	maxImageFile   = 512 << 20
	maxGatewayFile = 4 << 20
	maxArchivePut  = 600 << 20
	maxLoad        = 4 << 30
	maxJSONBody    = 1 << 20
	maxExecOutput  = 16 << 20
	maxJobStdout   = 64 << 10
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
	if s == "" || len(s) > maxAuthLabel {
		return badRequest("invalid auth_label")
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

// validCaps is the guard's job capability rule (D5): only CHOWN and
// DAC_OVERRIDE, each once, and only with a writable volume; anything else
// is 400 (FOWNER included).
func validCaps(caps []string, volume string) *apiError {
	allowed := map[string]bool{"CHOWN": true, "DAC_OVERRIDE": true}
	seen := map[string]bool{}
	for _, c := range caps {
		if !allowed[c] {
			return badRequest("capability not allowed")
		}
		if seen[c] {
			return badRequest("duplicate capability")
		}
		seen[c] = true
	}
	if len(caps) > 0 && volume != "rw" {
		return badRequest("capabilities require volume rw")
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

// qualifiedRef is a reference with a qualified repository and the default
// tag latest (images.archive names compare this way).
func qualifiedRef(ref string) string {
	digest := ""
	if i := strings.Index(ref, "@"); i >= 0 {
		ref, digest = ref[:i], ref[i+1:]
	}
	repo, tag := ref, ""
	if i := strings.LastIndexByte(ref, ':'); i > strings.LastIndexByte(ref, '/') {
		repo, tag = ref[:i], ref[i+1:]
	}
	out := qualified(repo)
	if tag == "" && digest == "" {
		tag = "latest"
	}
	if tag != "" {
		out += ":" + tag
	}
	if digest != "" {
		out += "@" + digest
	}
	return out
}

// patternMatch is the guard's repository pattern (CCG_GUARD_PULL_REPOS,
// CCG_GUARD_LOAD_REPOS): an exact repository, or one ending in a single '*'
// that matches within the last path segment; both sides qualified.
func patternMatch(pattern, repo string) bool {
	q := qualified(repo)
	base, glob := strings.CutSuffix(pattern, "*")
	base = qualified(base)
	if !glob {
		return q == base
	}
	rest, ok := strings.CutPrefix(q, base)
	return ok && !strings.Contains(rest, "/")
}

// repoAllowed: nil repos allow any repository (the fake's default).
func repoAllowed(ref string, repos []string) bool {
	if repos == nil {
		return true
	}
	repo := repoOf(ref)
	for _, r := range repos {
		if patternMatch(r, repo) {
			return true
		}
	}
	return false
}

// validToken is the guard's token syntax: 64 lowercase hex characters.
func validToken(s string) bool {
	if len(s) != 64 {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if !(c >= '0' && c <= '9' || c >= 'a' && c <= 'f') {
			return false
		}
	}
	return true
}

func tooLarge(msg string) *apiError { return &apiError{status: 413, code: "too_large", message: msg} }

// parseIPv4 is the guard's address syntax (net/netip, IPv4 only).
func parseIPv4(s, field string) (netip.Addr, *apiError) {
	ip, err := netip.ParseAddr(s)
	if err != nil || !ip.Is4() {
		return netip.Addr{}, badRequest(field + " must be an IPv4 address")
	}
	return ip, nil
}

// inSubnet: a host address of the subnet other than .1 (03 §2.3).
func inSubnet(ip netip.Addr, p netip.Prefix, field string) *apiError {
	if !p.Contains(ip) || ip == p.Masked().Addr() || ip == hostAt(p, 1) || ip == broadcast(p) {
		return badRequest(field + " outside account subnet or reserved")
	}
	return nil
}

// mediaType is the request's Content-Type without parameters ("" when invalid).
func mediaType(r *http.Request) string {
	mt, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil {
		return ""
	}
	return mt
}

// rawBody is the guard's rule for byte-stream bodies: a Content-Length
// (never chunked), at most max bytes, one of the media types.
func rawBody(r *http.Request, max int64, types ...string) *apiError {
	if len(r.TransferEncoding) > 0 || r.ContentLength < 0 {
		return badRequest("Content-Length is required")
	}
	if r.ContentLength > max {
		return tooLarge("request body too large")
	}
	mt := mediaType(r)
	for _, t := range types {
		if mt == t {
			return nil
		}
	}
	return badRequest("unsupported content type")
}

// exactBody: the body read must have exactly Content-Length bytes.
func exactBody(r *http.Request, body []byte) *apiError {
	if int64(len(body)) != r.ContentLength {
		return badRequest("request body does not match Content-Length")
	}
	return nil
}

// routeQuery are the query parameters each route accepts (once each).
var routeQuery = map[string][]string{
	"GET /v1/images/inspect":              {"ref"},
	"GET /v1/images/file":                 {"ref", "path", "limit"},
	"GET /v1/accounts/{aid}":              {"fields"},
	"GET /v1/accounts/{aid}?fields=state": {"fields"},
	"DELETE /v1/accounts/{aid}/network":   {"role"},
	"GET /v1/accounts/{aid}/app/archive":  {"path"},
	"PUT /v1/accounts/{aid}/app/archive":  {"path"},
}

// checkQuery: unknown or repeated query parameters are 400.
func checkQuery(route, raw string) *apiError {
	q, err := url.ParseQuery(raw)
	if err != nil {
		return badRequest("invalid query")
	}
	for k, v := range q {
		ok := false
		for _, a := range routeQuery[route] {
			if a == k {
				ok = true
			}
		}
		if !ok {
			return badRequest("unknown query parameter")
		}
		if len(v) != 1 {
			return badRequest("repeated query parameter")
		}
	}
	return nil
}
