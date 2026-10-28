package engine

import (
	"context"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

// Resource payloads use an independent, non-model management call. Neither a
// model request nor the model runner participates in resource IO. The call is
// performed by the CLI (`claude ccgateway-mgmt`), which owns the credential
// and the HTTPS fingerprint; Go keeps the allowlist and every response limit.
type resourceExchange struct {
	route      resourceRoute
	input      *resourceSpool
	dir        string
	limit      int64
	budget     *resourceSpoolBudget
	mu         sync.Mutex
	dispatched bool
	response   *resourceResponse
	identity   *resourceIdentityProbe
}
type resourceResponse struct {
	status int
	header http.Header
	body   *resourceSpool
}

func resourceResponseHeaders(source http.Header) http.Header {
	h := httpfacts.Select(source)
	hop := map[string]bool{}
	for _, line := range source.Values("Connection") {
		for _, key := range strings.Split(line, ",") {
			hop[strings.ToLower(strings.TrimSpace(key))] = true
		}
	}
	for _, key := range []string{"Content-Type", "Content-Disposition", "Content-Encoding", "ETag", "Last-Modified"} {
		if hop[strings.ToLower(key)] {
			continue
		}
		for _, value := range source.Values(key) {
			if validResourceHeader(value) {
				h.Add(key, value)
			}
		}
	}
	return h
}
func validResourceHeader(value string) bool {
	for _, c := range value {
		if c < 32 && c != '\t' || c == 127 {
			return false
		}
	}
	return true
}

// firstPartyOrigin reports whether target is Anthropic's first-party API
// origin: HTTPS on api.anthropic.com with the default port only, and no base
// path, query, fragment, opaque or escaped path part. basePath is the URL path
// already trimmed of trailing slashes.
func firstPartyOrigin(target *url.URL, basePath string) bool {
	return target.Scheme == "https" && target.Hostname() == "api.anthropic.com" &&
		(target.Port() == "" || target.Port() == "443") && target.User == nil &&
		basePath == "" && target.RawPath == "" && target.RawQuery == "" &&
		target.Fragment == "" && target.Opaque == ""
}

func (runner *Runner) runResource(ctx context.Context, op *resourceExchange) (*resourceResponse, error) {
	op.mu.Lock()
	if op.dispatched {
		op.mu.Unlock()
		return nil, fmt.Errorf("resource operation already consumed")
	}
	op.dispatched = true
	op.mu.Unlock()
	env := runner.baseEnv()
	var auth *resourceAuthorization
	var err error
	if op.identity != nil {
		op.identity.issuer = environmentValue(env, "CCG_RESOURCE_ISSUER_ID")
		op.identity.epoch = environmentValue(env, "CCG_RESOURCE_ISSUER_GENERATION")
		auth, err = runner.selectResourceAuthorization(ctx, env)
		if err == nil {
			op.identity.auth = auth
			var local bool
			local, err = op.identity.classify(auth.header)
			if err == nil && local {
				return nil, nil
			}
		}
	} else {
		binding, _ := ctx.Value(resourceAuthorizationKey{}).(*resourceAuthorizationBinding)
		if binding == nil || binding.auth == nil {
			return nil, fmt.Errorf("resource IO requires a verified identity authorization binding")
		}
		auth, err = resourceAuthorizationCandidate(env)
		if err == nil && auth.fingerprint != binding.auth.fingerprint {
			return nil, fmt.Errorf("resource authorization changed after identity verification; retry")
		}
	}
	if err != nil {
		return nil, err
	}
	// An older CLI has no ccgateway-mgmt command: refuse instead of running a
	// process that can only fail.
	if !runner.SupportsManagement {
		return nil, fmt.Errorf("the installed Claude Code CLI does not support ccgateway management calls")
	}
	resp, err := resourceManagementHTTP(ctx, runner, env, op, auth)
	// Facts only: URLs, tokens, profile bodies, and transport errors can contain
	// secrets and must never enter resource diagnostics.
	facts := Object{"request_prepared": true, "response_received": resp != nil, "transport_failed": err != nil}
	if resp != nil {
		facts["response_status"] = resp.status
	}
	resourceDiagnostic(ctx).trace("resource_management_http_completed", facts)
	return resp, err
}

// resourceManagementHTTP has no model endpoint escape hatch: even internal
// callers must pass the Files/Skills operation allowlist or the identity probe.
// The CLI performs the call; Go supplies only the operation's own headers, never
// a credential, and spools the answer under the same limits as before.
func resourceManagementHTTP(ctx context.Context, runner *Runner, env []string, op *resourceExchange, auth *resourceAuthorization) (*resourceResponse, error) {
	if err := validateResourceExchange(op); err != nil {
		return nil, err
	}
	// The CLI uses this environment to reach the provider. A malformed or
	// conflicting proxy must never let a configured route silently go direct,
	// so the same fail-closed check applies before the process starts.
	if !validManagementProxy(env) {
		return nil, fmt.Errorf("invalid management HTTPS proxy configuration")
	}
	if _, err := resourceTarget(env, op.route, auth); err != nil {
		return nil, err
	}
	upload, err := resourceUploadPath(op)
	if err != nil {
		return nil, err
	}
	// The CLI resolves the path against the same ANTHROPIC_BASE_URL it already
	// uses, so Go passes the allowlisted API path, not a composed URL. This is
	// also the shape the CLI's own allowlist admits.
	call := cliManagementCall{Method: op.route.method, Path: op.route.path, Header: managementRequestHeaders(op), Body: upload, MaxBytes: op.limit}
	if op.route.query != "" {
		call.Path += "?" + op.route.query
	}
	if op.identity != nil {
		// The official profile read timeout and its 1 MiB body limit.
		call.Timeout = profileTimeout
		call.MaxBytes = profileCLIMaxBytes
	}
	answer, err := cliManagementRequest(ctx, runner, env, call)
	if err != nil {
		// Exit code 1 covers caller-side refusals (arguments, allowlist,
		// missing login, output write); 3 is the response size limit; 4 is a
		// missing login. Only 2 and crashes are provider reachability failures.
		switch {
		case errors.Is(err, errCLIManagementNotLoggedIn):
			return nil, fmt.Errorf("resource management requires a Claude Code login")
		case errors.Is(err, errCLIManagementTooLarge):
			return nil, fmt.Errorf("resource response exceeds the configured size limit")
		case errors.Is(err, errCLIManagementRejected):
			return nil, fmt.Errorf("resource management call was refused by the CLI")
		default:
			return nil, fmt.Errorf("resource management API could not be reached")
		}
	}
	defer answer.Close()
	// A declared Content-Length must still match the body the CLI wrote: a
	// truncated download is detected exactly as it was with the Go transport.
	declared := answer.size
	if value := answer.header.Get("Content-Length"); value != "" {
		if n, convErr := strconv.ParseInt(value, 10, 64); convErr == nil && n >= 0 {
			declared = n
		}
	}
	body, err := os.Open(answer.body)
	if err != nil {
		return nil, fmt.Errorf("resource response unavailable: read, size, or spool budget failure")
	}
	spool, err := spoolResource(ctx, op.dir, body, declared, op.limit, op.budget)
	if err != nil {
		return nil, fmt.Errorf("resource response unavailable: read, size, or spool budget failure")
	}
	response := &resourceResponse{status: answer.status, header: resourceResponseHeaders(answer.header), body: spool}
	op.mu.Lock()
	op.response = response
	op.mu.Unlock()
	return response, nil
}

// managementRequestHeaders are the headers the resource operation itself
// defines: its Content-Type, Anthropic-Version and Anthropic-Beta, and explicit
// identity so the response bytes stay exact. Credential headers (Authorization,
// X-Api-Key) and the User-Agent are never passed: the CLI sends its own login
// and its native User-Agent.
func managementRequestHeaders(op *resourceExchange) http.Header {
	h := http.Header{}
	if op.route.contentType != "" {
		h.Set("Content-Type", op.route.contentType)
	}
	version := op.route.version
	if version == "" {
		version = "2023-06-01"
	}
	h.Set("Anthropic-Version", version)
	if len(op.route.betas) > 0 {
		h.Set("Anthropic-Beta", strings.Join(op.route.betas, ","))
	}
	// A content download asks for bytes by name, as the official call does;
	// the CLI otherwise supplies its own endpoint default.
	if op.route.method == http.MethodGet && strings.HasSuffix(op.route.path, "/content") {
		h.Set("Accept", "application/binary")
	}
	h.Set("Accept-Encoding", "identity")
	return h
}

// validateResourceExchange admits the operation: the identity probe has one
// fixed shape, and every other operation must be on the Files/Skills
// allowlist with a payload that matches it.
func validateResourceExchange(op *resourceExchange) error {
	if op.identity != nil {
		if op.route.method != http.MethodGet || op.route.path != "/api/oauth/profile" || op.route.query != "" || op.input != nil {
			return fmt.Errorf("invalid resource identity operation")
		}
		return nil
	}
	upload, err := resources.ValidateOperation(resources.Operation{Method: op.route.method, Path: op.route.path, RawQuery: op.route.query})
	if err != nil {
		return fmt.Errorf("unsupported resource management operation")
	}
	if upload != (op.input != nil) {
		return fmt.Errorf("invalid resource management payload")
	}
	if upload {
		kind, params, err := mime.ParseMediaType(op.route.contentType)
		if err != nil || kind != "multipart/form-data" || params["boundary"] == "" {
			return fmt.Errorf("resource upload requires multipart/form-data with a boundary")
		}
	}
	return nil
}

// resourceTarget resolves the base API origin of the management call and
// applies the operation path. OAuth tokens are only sent to their first-party
// resource server: an arbitrary custom base URL is not evidence of an
// equivalent issuer.
func resourceTarget(env []string, route resourceRoute, auth *resourceAuthorization) (*url.URL, error) {
	base := environmentValue(env, "ANTHROPIC_BASE_URL")
	if base == "" {
		base = "https://api.anthropic.com"
	}
	target, err := url.Parse(base)
	if err != nil || target.Scheme != "https" || target.Hostname() == "" || target.User != nil || target.RawQuery != "" || target.Fragment != "" || target.Opaque != "" || target.RawPath != "" {
		return nil, fmt.Errorf("resource management requires a verified HTTPS API origin")
	}
	basePath := strings.TrimRight(target.Path, "/")
	for _, segment := range strings.Split(basePath, "/") {
		if segment == "." || segment == ".." || strings.Contains(segment, "\\") {
			return nil, fmt.Errorf("invalid resource management API base path")
		}
	}
	if auth.method != "api_key" && !firstPartyOrigin(target, basePath) {
		return nil, fmt.Errorf("resource OAuth management requires the first-party API origin")
	}
	target.Path, target.RawQuery = basePath+route.path, route.query
	return target, nil
}

// resourceUploadPath is the spooled upload the CLI reads the request body
// from, after enforcing its size limit.
func resourceUploadPath(op *resourceExchange) (string, error) {
	if op.input == nil {
		return "", nil
	}
	if op.input.size > op.limit || op.input.size > resourceHardLimit {
		return "", fmt.Errorf("resource payload exceeds configured size limit")
	}
	return op.input.File.Name(), nil
}
