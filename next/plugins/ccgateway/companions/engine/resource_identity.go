package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func resourceEnv(env []string, key string) string {
	for _, entry := range env {
		if name, value, ok := strings.Cut(entry, "="); ok && strings.EqualFold(name, key) {
			return value
		}
	}
	return ""
}

func (b *resourceBroker) identity(ctx context.Context) (resources.Identity, error) {
	statusCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	cmd := exec.CommandContext(statusCtx, b.g.Runner.CLI, "auth", "status", "--json")
	cmd.Env = b.g.Runner.baseEnv()
	// Only parsed authentication mode is consumed; identifiers never enter logs.
	raw, err := cmd.Output()
	var status struct {
		LoggedIn    bool   `json:"loggedIn"`
		AuthMethod  string `json:"authMethod"`
		APIProvider string `json:"apiProvider"`
	}
	if err != nil || json.Unmarshal(raw, &status) != nil || !status.LoggedIn || status.APIProvider != "firstParty" {
		return resources.Identity{}, fmt.Errorf("resource authentication identity unavailable")
	}
	id := resources.Identity{AuthType: status.AuthMethod}
	if status.AuthMethod == "api_key" {
		issuer := resourceEnv(cmd.Env, "CCG_RESOURCE_ISSUER_ID")
		managedEpoch := resourceEnv(cmd.Env, "CCG_RESOURCE_ISSUER_GENERATION")
		if issuer == "" || managedEpoch == "" {
			return resources.Identity{}, fmt.Errorf("API key resources require managed issuer ID and generation")
		}
		id.PrincipalID = digest([]string{"resource-api-issuer-v1", issuer})
		return b.persistIdentity(id, managedEpoch)
	}
	if status.AuthMethod != "oauth_token" && status.AuthMethod != "claude.ai" {
		return resources.Identity{}, fmt.Errorf("resource authentication mode unsupported")
	}
	op := &resourceExchange{route: resourceRoute{method: "GET", path: "/api/oauth/profile"}, dir: b.dir, limit: 1 << 20, budget: b.budget}
	resp, err := b.g.Runner.runResource(ctx, op)
	if err != nil {
		return resources.Identity{}, err
	}
	defer resp.body.Close()
	if resp.status != http.StatusOK {
		return resources.Identity{}, fmt.Errorf("authenticated provider profile unavailable")
	}
	raw, err = io.ReadAll(resp.body)
	if err != nil {
		return resources.Identity{}, err
	}
	profile, err := decodeObject(raw)
	if err != nil {
		return resources.Identity{}, fmt.Errorf("invalid authenticated provider profile")
	}
	id.PrincipalID, err = resourceProfilePrincipal(profile)
	if err != nil {
		return resources.Identity{}, err
	}
	return b.persistIdentity(id, "")
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
	principal, generation := h.Get(resources.PrincipalHeader), h.Get(resources.GenerationHeader)
	if principal == "" || generation == "" || principal != actual.PrincipalID || generation != actual.Generation {
		return fmt.Errorf("resource issuer or authorization generation does not match")
	}
	return nil
}
