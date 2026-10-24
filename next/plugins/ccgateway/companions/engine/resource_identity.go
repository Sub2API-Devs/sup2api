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
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

var errManagedResourceIssuerMissing = errors.New("API key resources require managed issuer ID and generation")

// resourceIdentityTTL bounds how long a verified identity is reused while the
// credential stays the same. A changed credential (a refresh, a
// reauthorization, another source) always verifies again, so a model request
// that needs the identity (diagnostics) does not start a CLI and call the
// profile endpoint every time.
const resourceIdentityTTL = 10 * time.Minute

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
	if cached := b.cachedIdentity(env); cached != nil {
		bindResourceAuthorization(ctx, cached.auth)
		return cached.identity, nil
	}
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
	id := resources.Identity{AuthType: "oauth"}
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
