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
		if value := resourceEnv(g.Runner.baseEnv(), setting.name); value != "" {
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
	if !b.g.authorized(r) {
		apiError(w, 401, "authentication_error", "Invalid Worker API key")
		return
	}
	identityOnly := r.Method == "GET" && r.URL.Path == resources.IdentityPath && r.URL.RawQuery == "" && r.ContentLength == 0
	var route resourceRoute
	var err error
	if !identityOnly {
		route, err = parseResourceRoute(r)
		if err != nil {
			apiError(w, 400, "invalid_request_error", err.Error())
			return
		}
	}
	if r.ContentLength > b.limit {
		apiError(w, 413, "invalid_request_error", "Resource payload exceeds configured size limit")
		return
	}
	deadline := time.Now().Add(resourceTimeout)
	controller := http.NewResponseController(w)
	_ = controller.SetReadDeadline(deadline)
	_ = controller.SetWriteDeadline(deadline)
	ctx, cancel := context.WithDeadline(r.Context(), deadline)
	defer cancel()
	var input *resourceSpool
	if route.upload {
		input, err = spoolResource(ctx, b.dir, r.Body, r.ContentLength, b.limit, b.budget)
		if err != nil {
			resourceDiagnostic(ctx).trace("resource_upload_failed", Object{"error": err.Error(), "body_hash_unavailable": true})
			apiError(w, 413, "invalid_request_error", err.Error())
			return
		}
		defer input.Close()
		recordResourceInput(ctx, input, route.contentType)
	}
	// The managed authorization writer and resource operation share a lock;
	// a controlled reauthorization cannot switch issuer between profile and IO.
	if err := lockResourceAuthority(ctx, &b.authority.mu); err != nil {
		return
	}
	defer b.authority.mu.Unlock()
	if err := waitResourceSlot(ctx, b.g.Slots); err != nil {
		return
	}
	defer func() { <-b.g.Slots }()
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
		return
	}
	d.trace("resource_identity_verified", id)
	if identityOnly {
		w.Header().Set(resources.PrincipalHeader, id.PrincipalID)
		w.Header().Set(resources.GenerationHeader, id.Generation)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(id)
		return
	}
	if err = verifyExpectedResourceIdentity(r.Header, id); err != nil {
		d.trace("resource_issuer_mismatch", nil)
		apiError(w, 409, "invalid_request_error", err.Error())
		return
	}
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
