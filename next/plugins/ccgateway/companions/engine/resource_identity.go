package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

var (
	errManagedResourceIssuerMissing = errors.New("API key resources require managed issuer ID and generation")
	errIdentityVerifying            = errors.New("resource identity verification already running")
)

// resourceIdentityTTL bounds how long a verified identity is reused while the
// credential stays the same. A changed credential (a refresh, a
// reauthorization, another source) always verifies again, so a model request
// that needs the identity (diagnostics) does not start a CLI and call the
// profile endpoint every time.
const resourceIdentityTTL = 10 * time.Minute

// A verified identity this old is verified again in the background while the
// account was used within identityKeepWarm (keepIdentityWarm), so a request
// that needs it seldom waits for the CLI and the profile call (CONTRACTS
// §63.4). An idle account lets it expire.
const (
	identityRefreshAge = resourceIdentityTTL - 2*time.Minute
	identityKeepWarm   = 30 * time.Minute
)

// identityFailureBackoff bounds how often a failing verification starts a CLI
// process for the same credential. The profile call now costs a process, and
// the core retries a failed identity after 60 s; requests in between answer
// with the recorded failure instead of each spawning a CLI.
const identityFailureBackoff = time.Minute

type identityFailure struct {
	fingerprint string
	at          time.Time
	err         error
}

type verifiedResourceIdentity struct {
	identity resources.Identity
	auth     *resourceAuthorization
	at       time.Time
}

// apiKeyOnly reports whether the account's only credential is an API key
// from the environment.
func apiKeyOnly(env []string) bool {
	snapshot, err := localAuthSnapshot(env)
	if err != nil {
		return false
	}
	sources, _ := snapshot["credential_sources"].([]string)
	return len(sources) == 1 && sources[0] == "api_key_env"
}

// cachedIdentity is the last verified identity when the credential it was
// verified with is still the current one and it is recent.
func (b *resourceBroker) cachedIdentity(env []string) *verifiedResourceIdentity {
	cached := b.verified.Load()
	if cached == nil || time.Since(cached.at) > resourceIdentityTTL {
		return nil
	}
	auth, err := resourceAuthorizationCandidate(env)
	if err != nil || auth.fingerprint != cached.auth.fingerprint {
		return nil
	}
	return cached
}

func (b *resourceBroker) identity(ctx context.Context) (resources.Identity, error) {
	return b.verifyIdentity(ctx, false)
}

// touch records that the account served a request (keepIdentityWarm).
func (b *resourceBroker) touch() { b.used.Store(time.Now().UnixNano()) }

// keepIdentityWarm verifies an identity about to expire again while the
// account is in use. It never waits: an authorization change in progress, a
// Worker without a free slot or a verification already running skips the
// round, and a failure leaves the cached identity to expire as before.
func (b *resourceBroker) keepIdentityWarm(ctx context.Context) {
	cached := b.verified.Load()
	if cached == nil || time.Since(cached.at) < identityRefreshAge || time.Since(time.Unix(0, b.used.Load())) > identityKeepWarm {
		return
	}
	if !b.authority.mu.TryRLock() {
		return
	}
	defer b.authority.mu.RUnlock()
	select {
	case b.g.Slots <- struct{}{}:
		defer func() { <-b.g.Slots }()
	default:
		return
	}
	if _, err := b.verifyIdentity(ctx, true); err != nil && !errors.Is(err, errIdentityVerifying) {
		log.Printf("resource identity refresh failed: %v", err)
	}
}

// verifyIdentity is the verified identity: the cached one unless refresh, then
// one the CLI verifies. A refresh never waits for a running verification.
func (b *resourceBroker) verifyIdentity(ctx context.Context, refresh bool) (id resources.Identity, err error) {
	bindResourceAuthorization(ctx, nil)
	env := b.g.Runner.baseEnv()
	if !resourceBackendSupported(env) {
		return resources.Identity{}, fmt.Errorf("resource authentication backend unsupported")
	}
	probe := &resourceIdentityProbe{issuer: environmentValue(env, "CCG_RESOURCE_ISSUER_ID"), epoch: environmentValue(env, "CCG_RESOURCE_ISSUER_GENERATION")}
	// An API key without a managed issuer can never prove an identity; say so
	// at once instead of after the CLI verification.
	if (probe.issuer == "" || probe.epoch == "") && apiKeyOnly(env) {
		return resources.Identity{}, errManagedResourceIssuerMissing
	}
	if cached := b.cachedIdentity(env); cached != nil && !refresh {
		bindResourceAuthorization(ctx, cached.auth)
		return cached.identity, nil
	}
	// One verification at a time; a request that waited takes the identity
	// the one before it verified.
	if refresh {
		if !b.verifying.TryLock() {
			return resources.Identity{}, errIdentityVerifying
		}
	} else if err := waitLock(ctx, "identity", b.verifying.TryLock); err != nil {
		return resources.Identity{}, err
	}
	defer b.verifying.Unlock()
	if cached := b.cachedIdentity(env); cached != nil && !refresh {
		bindResourceAuthorization(ctx, cached.auth)
		return cached.identity, nil
	}
	// A verification of this very credential failed moments ago: answer with
	// that failure instead of starting another CLI process for every request.
	fingerprint := ""
	if candidate, candidateErr := resourceAuthorizationCandidate(env); candidateErr == nil {
		fingerprint = candidate.fingerprint
		if failed := b.failed.Load(); !refresh && fingerprint != "" && failed != nil &&
			failed.fingerprint == fingerprint && time.Since(failed.at) < identityFailureBackoff {
			return resources.Identity{}, failed.err
		}
	}
	defer func() {
		if err != nil {
			b.failed.Store(&identityFailure{fingerprint: fingerprint, at: time.Now(), err: err})
			return
		}
		b.failed.Store(nil)
	}()
	remember := func(id resources.Identity, err error) (resources.Identity, error) {
		if err == nil {
			bindResourceAuthorization(ctx, probe.auth)
			b.verified.Store(&verifiedResourceIdentity{identity: id, auth: probe.auth, at: time.Now()})
		}
		return id, err
	}
	op := &resourceExchange{route: resourceRoute{method: "GET", path: "/api/oauth/profile"}, dir: b.dir, limit: 1 << 20, budget: b.budget, identity: probe}
	resp, err := b.g.Runner.runResource(ctx, op)
	if err != nil {
		return resources.Identity{}, err
	}
	if probe.local != nil {
		return remember(b.persistIdentity(*probe.local, probe.epoch))
	}
	defer resp.body.Close()
	if resp.status == http.StatusUnauthorized {
		return resources.Identity{}, fmt.Errorf("resource OAuth token rejected after CLI verification; reauthorization is required")
	}
	if resp.status != http.StatusOK {
		return resources.Identity{}, fmt.Errorf("authenticated provider profile unavailable")
	}
	raw, err := io.ReadAll(resp.body)
	if err != nil {
		return resources.Identity{}, err
	}
	profile, err := decodeObject(raw)
	if err != nil {
		return resources.Identity{}, fmt.Errorf("invalid authenticated provider profile")
	}
	id = resources.Identity{AuthType: "oauth"}
	id.PrincipalID, err = resourceProfilePrincipal(profile)
	if err != nil {
		return resources.Identity{}, err
	}
	after, err := resourceAuthorizationCandidate(env)
	if err != nil || probe.auth == nil || after.fingerprint != probe.auth.fingerprint {
		return resources.Identity{}, fmt.Errorf("resource authorization changed during profile verification; retry with a stable CLI identity")
	}
	return remember(b.persistIdentity(id, ""))
}

// Provider resource ownership survives refresh and verified reauthorization to
// the same issuer. Diagnostics' per-login epoch is deliberately independent.
func (b *resourceBroker) persistIdentity(id resources.Identity, managedEpoch string) (resources.Identity, error) {
	path := b.identityPath
	if path == "" {
		return resources.Identity{}, fmt.Errorf("resource identity persistence unavailable")
	}
	lock, err := os.OpenFile(path+".lock", os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return resources.Identity{}, fmt.Errorf("resource identity persistence unavailable")
	}
	defer lock.Close()
	if lockResourceLease(lock) != nil {
		return resources.Identity{}, fmt.Errorf("resource identity update is busy")
	}
	var old struct {
		Identity     resources.Identity `json:"identity"`
		ManagedEpoch string             `json:"managed_epoch,omitempty"`
	}
	raw, err := os.ReadFile(path)
	if err == nil {
		if len(raw) > 8192 || json.Unmarshal(raw, &old) != nil || old.Identity.PrincipalID == "" || old.Identity.Generation == "" {
			return resources.Identity{}, fmt.Errorf("invalid persistent resource identity")
		}
	} else if !os.IsNotExist(err) {
		return resources.Identity{}, fmt.Errorf("resource identity persistence unavailable")
	}
	id.Generation = uuid()
	if old.Identity.PrincipalID == id.PrincipalID && old.ManagedEpoch == digest(managedEpoch) {
		id.Generation = old.Identity.Generation
		return id, nil
	}
	old.Identity, old.ManagedEpoch = id, digest(managedEpoch)
	raw, _ = json.Marshal(old)
	f, err := os.CreateTemp(filepath.Dir(path), ".resource-identity-*")
	if err != nil {
		return resources.Identity{}, fmt.Errorf("resource identity persistence unavailable")
	}
	defer os.Remove(f.Name())
	if _, err = f.Write(raw); err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err == nil {
		err = closeErr
	}
	if err == nil {
		err = os.Rename(f.Name(), path)
	}
	if err != nil {
		return resources.Identity{}, fmt.Errorf("resource identity persistence unavailable")
	}
	return id, nil
}

func resourceProfilePrincipal(profile Object) (string, error) {
	account, _ := profile["account"].(Object)
	organization, _ := profile["organization"].(Object)
	accountID, organizationID := str(account, "uuid"), str(organization, "uuid")
	if accountID == "" || organizationID == "" {
		return "", fmt.Errorf("authenticated profile lacks stable account and organization identity")
	}
	return digest([]string{"resource-oauth-issuer-v1", accountID, organizationID}), nil
}

func verifyExpectedResourceIdentity(h http.Header, actual resources.Identity) error {
	return resources.ValidateIdentityHeaders(h, actual)
}
