package engine

import (
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

// Resource payloads use an independent, non-model management HTTP transport.
// Neither a model request nor the model runner participates in resource IO.
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

func (op *resourceExchange) completed() bool {
	op.mu.Lock()
	defer op.mu.Unlock()
	return op.response != nil || (op.identity != nil && op.identity.local != nil)
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
		op.identity.issuer = resourceEnv(env, "CCG_RESOURCE_ISSUER_ID")
		op.identity.epoch = resourceEnv(env, "CCG_RESOURCE_ISSUER_GENERATION")
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
	ua := "claude-code/2.1.7" // same fallback as the existing usage management call
	if runner.Version != "" {
		ua = "claude-code/" + runner.Version
	}
	auth.header.Set("User-Agent", ua)
	client, transport := managementHTTPClient(env)
	defer transport.CloseIdleConnections()
	resp, err := resourceManagementHTTP(ctx, env, op, auth, client)
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
func resourceManagementHTTP(ctx context.Context, env []string, op *resourceExchange, auth *resourceAuthorization, client *http.Client) (*resourceResponse, error) {
	if op.identity != nil {
		if op.route.method != http.MethodGet || op.route.path != "/api/oauth/profile" || op.route.query != "" || op.input != nil {
			return nil, fmt.Errorf("invalid resource identity operation")
		}
	} else {
		upload, err := resources.ValidateOperation(resources.Operation{Method: op.route.method, Path: op.route.path, RawQuery: op.route.query})
		if err != nil {
			return nil, fmt.Errorf("unsupported resource management operation")
		}
		if upload != (op.input != nil) {
			return nil, fmt.Errorf("invalid resource management payload")
		}
		if upload {
			kind, params, err := mime.ParseMediaType(op.route.contentType)
			if err != nil || kind != "multipart/form-data" || params["boundary"] == "" {
				return nil, fmt.Errorf("resource upload requires multipart/form-data with a boundary")
			}
		}
	}
	base := resourceEnv(env, "ANTHROPIC_BASE_URL")
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
	// OAuth tokens are only sent to their first-party resource server. An
	// arbitrary custom base URL is not evidence of an equivalent issuer.
	if auth.method != "api_key" && (target.Hostname() != "api.anthropic.com" || (target.Port() != "" && target.Port() != "443") || basePath != "") {
		return nil, fmt.Errorf("resource OAuth management requires the first-party API origin")
	}
	target.Path, target.RawQuery = basePath+op.route.path, op.route.query
	var body io.Reader
	if op.input != nil {
		if op.input.size > op.limit || op.input.size > resourceHardLimit {
			return nil, fmt.Errorf("resource payload exceeds configured size limit")
		}
		body = io.NewSectionReader(op.input.File, 0, op.input.size)
	}
	req, err := http.NewRequestWithContext(ctx, op.route.method, target.String(), body)
	if err != nil {
		return nil, fmt.Errorf("resource management request could not be built")
	}
	req.Header = auth.header.Clone()
	if op.input != nil {
		req.ContentLength = op.input.size
	}
	if op.route.contentType != "" {
		req.Header.Set("Content-Type", op.route.contentType)
	}
	version := op.route.version
	if version == "" {
		version = "2023-06-01"
	}
	req.Header.Set("Anthropic-Version", version)
	beta := req.Header.Values("Anthropic-Beta")
	beta = append(beta, op.route.betas...)
	if len(beta) > 0 {
		req.Header.Set("Anthropic-Beta", strings.Join(beta, ","))
	}
	// Explicit identity avoids Go's automatic gzip decoding. The response body
	// is spooled verbatim, including multipart/binary and encoded downloads.
	req.Header.Set("Accept-Encoding", "identity")
	res, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("resource management API could not be reached")
	}
	defer res.Body.Close()
	spool, err := spoolResource(ctx, op.dir, res.Body, res.ContentLength, op.limit, op.budget)
	if err != nil {
		return nil, fmt.Errorf("resource response unavailable: read, size, or spool budget failure")
	}
	response := &resourceResponse{status: res.StatusCode, header: resourceResponseHeaders(res.Header), body: spool}
	op.mu.Lock()
	op.response = response
	op.mu.Unlock()
	return response, nil
}
