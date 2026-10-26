package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

const resourceTimeout = 10 * time.Minute

type resourceBroker struct {
	g            *Gateway
	authority    *authManager
	dir          string
	identityPath string
	creditDir    string
	limit        int64
	budget       *resourceSpoolBudget
	lease        *resourceLease
	// verified is the last verified identity (cachedIdentity).
	verified atomic.Pointer[verifiedResourceIdentity]
	// verifying lets one verification run at a time: requests that share the
	// authority (tracked requests, identity probes) would otherwise start the
	// verification CLI together on a cold cache, refreshing the login and
	// writing the identity file concurrently (2026-10-25 audit r3 P2-2).
	verifying sync.Mutex
	// used is when the account last served a request (UnixNano, touch).
	used atomic.Int64
}

func newResourceBroker(g *Gateway, authority *authManager, root string) (*resourceBroker, error) {
	limit, budget := resourceHardLimit, 2*resourceHardLimit
	for _, setting := range []struct {
		name    string
		target  *int64
		maximum int64
	}{
		{"CCG_RESOURCE_BODY_LIMIT_BYTES", &limit, resourceHardLimit},
		{"CCG_RESOURCE_SPOOL_LIMIT_BYTES", &budget, 8 * resourceHardLimit},
	} {
		if value := environmentValue(g.Runner.baseEnv(), setting.name); value != "" {
			n, err := strconv.ParseInt(value, 10, 64)
			if err != nil || n <= 0 || n > setting.maximum {
				return nil, fmt.Errorf("invalid %s", setting.name)
			}
			*setting.target = n
		}
	}
	identityDir := filepath.Join(root, "resource-identity")
	if err := os.MkdirAll(identityDir, 0700); err != nil {
		return nil, err
	}
	lease, err := openResourceSpool(filepath.Join(root, "resource-spool"))
	if err != nil {
		return nil, err
	}
	return &resourceBroker{g: g, authority: authority, dir: lease.dir, identityPath: filepath.Join(identityDir, "identity-v1.json"), creditDir: filepath.Join(root, "fallback-credit"), lease: lease, limit: limit, budget: &resourceSpoolBudget{limit: budget}}, nil
}

func (b *resourceBroker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w, r, finish := b.resourceDiagnostic(w, r)
	defer finish()
	route, identityOnly, ok := b.admitResource(w, r)
	if !ok {
		return
	}
	deadline := time.Now().Add(resourceTimeout)
	controller := http.NewResponseController(w)
	_ = controller.SetReadDeadline(deadline)
	_ = controller.SetWriteDeadline(deadline)
	ctx, cancel := context.WithDeadline(r.Context(), deadline)
	defer cancel()
	ctx = withResourceAuthorization(ctx)
	input, ok := b.spoolInput(w, r, ctx, route)
	if !ok {
		return
	}
	if input != nil {
		defer input.Close()
	}
	// The managed authorization writer and resource operation share a lock;
	// a controlled reauthorization cannot switch issuer between profile and IO.
	// An identity probe only reads the issuer, so it shares the authority like
	// a tracked request: the core's probe for a second tracked request does not
	// wait for the first (2026-10-25 audit P2-2).
	// A wait that ends without either is answered, never an empty 200.
	lock, unlock := b.authority.mu.TryLock, b.authority.mu.Unlock
	if identityOnly {
		lock, unlock = b.authority.mu.TryRLock, b.authority.mu.RUnlock
	}
	if err := lockResourceAuthority(ctx, lock); err != nil {
		apiError(w, 503, "api_error", "Resource authority unavailable")
		return
	}
	defer unlock()
	if err := waitResourceSlot(ctx, b.g.Slots); err != nil {
		apiError(w, 503, "api_error", "Worker resource slot unavailable")
		return
	}
	defer func() { <-b.g.Slots }()
	id, ok := b.verifiedIdentity(w, ctx)
	if !ok {
		return
	}
	if identityOnly {
		serveResourceIdentity(w, id)
		return
	}
	if err := verifyExpectedResourceIdentity(r.Header, id); err != nil {
		resourceDiagnostic(ctx).trace("resource_issuer_mismatch", nil)
		apiError(w, 409, "invalid_request_error", err.Error())
		return
	}
	b.dispatchResource(w, ctx, id, route, input)
}

// admitResource authenticates the call and resolves its route and size. An
// identity-only probe is a bare GET of the identity path.
func (b *resourceBroker) admitResource(w http.ResponseWriter, r *http.Request) (route resourceRoute, identityOnly, ok bool) {
	if !b.g.authorized(r) {
		apiError(w, 401, "authentication_error", "Invalid Worker API key")
		return route, false, false
	}
	identityOnly = r.Method == "GET" && r.URL.Path == resources.IdentityPath && r.URL.RawQuery == "" && r.ContentLength == 0
	if !identityOnly {
		parsed, err := parseResourceRoute(r)
		if err != nil {
			apiError(w, 400, "invalid_request_error", err.Error())
			return resourceRoute{}, false, false
		}
		route = parsed
	}
	if r.ContentLength > b.limit {
		apiError(w, 413, "invalid_request_error", "Resource payload exceeds configured size limit")
		return resourceRoute{}, false, false
	}
	return route, identityOnly, true
}

// spoolInput spools an upload body to disk before any CLI process or slot is
// reserved. Non-upload operations have no body.
func (b *resourceBroker) spoolInput(w http.ResponseWriter, r *http.Request, ctx context.Context, route resourceRoute) (*resourceSpool, bool) {
	if !route.upload {
		return nil, true
	}
	input, err := spoolResource(ctx, b.dir, r.Body, r.ContentLength, b.limit, b.budget)
	if err != nil {
		resourceDiagnostic(ctx).trace("resource_upload_failed", Object{"error": err.Error(), "body_hash_unavailable": true})
		apiError(w, 413, "invalid_request_error", err.Error())
		return nil, false
	}
	recordResourceInput(ctx, input, route.contentType)
	return input, true
}

// verifiedIdentity runs the identity step; failures are already answered.
func (b *resourceBroker) verifiedIdentity(w http.ResponseWriter, ctx context.Context) (resources.Identity, bool) {
	d := resourceDiagnostic(ctx)
	d.trace("resource_identity_verifying", nil)
	id, err := b.identity(ctx)
	if err != nil {
		d.trace("resource_identity_failed", Object{"error": err.Error()})
		typ := "api_error"
		if errors.Is(err, errManagedResourceIssuerMissing) {
			typ = resources.IdentityUnsupportedErrorType
		}
		apiError(w, 503, typ, err.Error())
		return resources.Identity{}, false
	}
	d.trace("resource_identity_verified", id)
	return id, true
}

// serveResourceIdentity answers the identity-only probe.
func serveResourceIdentity(w http.ResponseWriter, id resources.Identity) {
	w.Header().Set(resources.PrincipalHeader, id.PrincipalID)
	w.Header().Set(resources.GenerationHeader, id.Generation)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(id)
}

// dispatchResource performs the management operation and streams the spooled
// response back.
func (b *resourceBroker) dispatchResource(w http.ResponseWriter, ctx context.Context, id resources.Identity, route resourceRoute, input *resourceSpool) {
	d := resourceDiagnostic(ctx)
	op := &resourceExchange{route: route, input: input, dir: b.dir, limit: b.limit, budget: b.budget}
	d.trace("resource_dispatch", Object{"method": route.method, "path": route.path, "query": route.query})
	resp, err := b.g.Runner.runResource(ctx, op)
	if err != nil {
		d.trace("resource_dispatch_failed", Object{"error": err.Error()})
		apiError(w, 502, "api_error", err.Error())
		return
	}
	defer resp.body.Close()
	for key, values := range resp.header {
		w.Header()[key] = values
	}
	w.Header().Set(resources.PrincipalHeader, id.PrincipalID)
	w.Header().Set(resources.GenerationHeader, id.Generation)
	w.Header().Set("Content-Length", strconv.FormatInt(resp.body.size, 10))
	w.WriteHeader(resp.status)
	io.Copy(w, resp.body)
}
