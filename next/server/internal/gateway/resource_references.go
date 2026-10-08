package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

type approvedResource struct {
	reference resources.Reference
	resource  core.ProviderResource
}

func (c *call) resourceOwner() core.ResourceOwner {
	return core.ResourceOwner{UserID: c.principal.UserID, GroupID: c.principal.Group.ID}
}
func (c *call) usableResource(r core.ProviderResource) bool {
	return r.Owner == c.resourceOwner() && r.State == "ready" && r.PluginKey == "ccgateway" && r.Kind == "file" && r.RemoteID != "" && (r.ExpiresAt.IsZero() || r.ExpiresAt.After(c.g.now()))
}
func (c *call) checkResourceReferences(ctx context.Context) *gwError {
	c.resourceRefs = nil
	if !fileReferenceProtocol(c.ep.Protocol) {
		return nil
	}
	refs, err := c.resourceScans.scan(c.body)
	if err != nil {
		return invalidModelReference(err.Error())
	}
	if len(refs) == 0 {
		return nil
	}
	if c.g.d.Resources == nil || c.g.d.ResourceTransport == nil {
		return fromCore(core.ErrNotFound, errTypeInvalidRequest)
	}
	known := map[string]core.ProviderResource{}
	for _, ref := range refs {
		r, ok := known[ref.ID]
		if !ok {
			r, err = c.g.d.Resources.Get(ctx, c.resourceOwner(), ref.ID)
			if err != nil || !c.usableResource(r) {
				return fromCore(core.ErrNotFound, errTypeInvalidRequest)
			}
			known[ref.ID] = r
		}
		if len(c.resourceRefs) > 0 && c.resourceRefs[0].resource.Binding != r.Binding {
			return invalidModelReference("file resources must belong to one account and issuer")
		}
		c.resourceRefs = append(c.resourceRefs, approvedResource{ref, r})
	}
	return nil
}

func (c *call) resourceAccountAllowed(account *core.AccountRef) bool {
	return len(c.resourceRefs) == 0 || (account.ID == c.resourceRefs[0].resource.Binding.AccountID && account.PluginKey == "ccgateway")
}

func (c *call) verifyResourceBinding(ctx context.Context, accountID int64) error {
	if len(c.resourceRefs) == 0 {
		return nil
	}
	binding := c.resourceRefs[0].resource.Binding
	if accountID != binding.AccountID {
		return core.ErrNotFound
	}
	seen := map[string]bool{}
	for _, ref := range c.resourceRefs {
		if seen[ref.reference.ID] {
			continue
		}
		seen[ref.reference.ID] = true
		r, err := c.g.d.Resources.Get(ctx, c.resourceOwner(), ref.reference.ID)
		if err != nil || !c.usableResource(r) || r.Binding != binding || r.RemoteID != ref.resource.RemoteID {
			return core.ErrNotFound
		}
	}
	actual, err := c.g.d.ResourceTransport.Identity(ctx, accountID)
	if err != nil {
		return err
	}
	if actual != binding {
		return core.ErrNotFound
	}
	return nil
}

func (c *call) mapResourceReferences(ctx context.Context, body []byte, account *core.AccountRef, rt *typeRoute) ([]byte, error) {
	if !fileReferenceProtocol(rt.upstream) {
		if len(c.resourceRefs) > 0 {
			return nil, fmt.Errorf("file resources cannot be converted to this protocol")
		}
		return body, nil
	}
	refs, err := c.resourceScans.scan(body)
	if err != nil {
		return nil, err
	}
	if rt.conv != nil && len(refs) > 0 {
		return nil, fmt.Errorf("conversion cannot introduce unadmitted file resources")
	}
	if len(refs) != len(c.resourceRefs) {
		return nil, fmt.Errorf("file reference locations changed before mapping")
	}
	if !c.resourceAccountAllowed(account) {
		return nil, core.ErrNotFound
	}
	if err = c.verifyResourceBinding(ctx, account.ID); err != nil {
		return nil, err
	}
	for i, ref := range refs {
		approved := c.resourceRefs[i]
		if ref != approved.reference {
			return nil, fmt.Errorf("file reference identity changed before mapping")
		}
		body, err = sjson.SetBytes(body, ref.Path, approved.resource.RemoteID)
		if err != nil {
			return nil, err
		}
	}
	return body, nil
}

func validateResourceReferencePatches(protocol string, before, after []byte) error {
	return (&call{}).validateResourceReferencePatches(protocol, before, after)
}
func (c *call) validateResourceReferencePatches(protocol string, before, after []byte) error {
	if !fileReferenceProtocol(protocol) {
		return nil
	}
	a, err := c.resourceScans.scan(before)
	if err != nil {
		return err
	}
	b, err := c.resourceScans.scan(after)
	if err != nil {
		return err
	}
	if !slices.Equal(a, b) {
		return fmt.Errorf("plugin patches cannot change admitted file references")
	}
	return nil
}

func (c *call) applyResourceHeaders(ctx context.Context, req *http.Request, account *core.Account, body []byte) error {
	for name := range req.Header {
		if strings.HasPrefix(strings.ToLower(name), "x-ccgateway-resource-") {
			req.Header.Del(name)
		}
	}
	if len(c.resourceRefs) == 0 {
		return nil
	}
	if account.PluginKey != "ccgateway" {
		return core.ErrNotFound
	}
	if err := c.verifyResourceBinding(ctx, account.ID); err != nil {
		return err
	}
	ids := []string{}
	seen := map[string]bool{}
	for _, ref := range c.resourceRefs {
		id := ref.resource.RemoteID
		if gjson.GetBytes(body, ref.reference.Path).String() != id {
			return fmt.Errorf("approved file reference changed")
		}
		if !seen[id] {
			ids = append(ids, id)
			seen[id] = true
		}
	}
	if len(ids) > 100 {
		return fmt.Errorf("too many distinct file resources")
	}
	raw, _ := json.Marshal(ids)
	binding := c.resourceRefs[0].resource.Binding
	req.Header.Set(resources.PrincipalHeader, binding.PrincipalID)
	req.Header.Set(resources.GenerationHeader, binding.Generation)
	req.Header.Set(resources.ResourceIDsHeader, string(raw))
	return nil
}

func fileReferenceProtocol(protocol string) bool {
	return protocol == "anthropic.messages" || protocol == "anthropic.count_tokens"
}
