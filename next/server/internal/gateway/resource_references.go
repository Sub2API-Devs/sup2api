package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

type approvedResource struct {
	reference resources.Reference
	resource  core.ProviderResource
}

type modelResourceAccess struct {
	binding      core.ResourceBinding
	outputs      bool
	dispatchedAt time.Time
}

// Only a read-only identity lookup before model dispatch can try another
// account. References or credit redemption already bind the original account.
type resourceEligibilityError struct{ error }

func (e *resourceEligibilityError) Unwrap() error { return e.error }

func (c *call) resourceOwner() core.ResourceOwner {
	return core.ResourceOwner{UserID: c.principal.UserID, GroupID: c.principal.Group.ID}
}
func (c *call) usableResource(r core.ProviderResource) bool {
	return r.Owner == c.resourceOwner() && r.State == "ready" && r.PluginKey == "ccgateway" && r.RemoteID != "" && (r.ExpiresAt.IsZero() || r.ExpiresAt.After(c.g.now()))
}
func (c *call) checkResourceReferences(ctx context.Context) *gwError {
	c.resourceRefs = nil
	c.resourceInfo = resources.RequestInfo{}
	c.resourceVersions = nil
	if !fileReferenceProtocol(c.ep.Protocol) {
		return nil
	}
	info, err := c.resourceScans.inspect(c.body)
	if err != nil {
		return invalidModelReference(err.Error())
	}
	c.resourceInfo = info
	refs := info.References
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
			if err != nil || !c.usableResource(r) || r.Kind != ref.Kind {
				return fromCore(core.ErrNotFound, errTypeInvalidRequest)
			}
			known[ref.ID] = r
		}
		if r.Kind != ref.Kind {
			return fromCore(core.ErrNotFound, errTypeInvalidRequest)
		}
		if len(c.resourceRefs) > 0 && c.resourceRefs[0].resource.Binding != r.Binding {
			return invalidModelReference("resources must belong to one account and issuer")
		}
		c.resourceRefs = append(c.resourceRefs, approvedResource{ref, r})
	}
	return c.freezeSkillVersions(ctx)
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
		if err != nil || !c.usableResource(r) || r.Kind != ref.reference.Kind || r.Binding != binding || r.RemoteID != ref.resource.RemoteID {
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
	targetInfo, err := c.resourceScans.inspect(body)
	refs := targetInfo.References
	if err != nil {
		return nil, err
	}
	if rt.conv != nil && (len(refs) > 0 || targetInfo.Outputs || len(targetInfo.PendingPTCParents) > 0 || len(targetInfo.SkillVersions) > 0) {
		return nil, fmt.Errorf("conversion cannot introduce unadmitted resources or provider execution capabilities")
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
	return c.mapSkillVersions(body)
}

func validateResourceReferencePatches(protocol string, before, after []byte) error {
	return (&call{}).validateResourceReferencePatches(protocol, before, after)
}
func (c *call) validateResourceReferencePatches(protocol string, before, after []byte) error {
	if !fileReferenceProtocol(protocol) {
		return nil
	}
	a, err := c.resourceScans.inspect(before)
	if err != nil {
		return err
	}
	b, err := c.resourceScans.inspect(after)
	if err != nil {
		return err
	}
	if !slices.Equal(a.References, b.References) || !slices.Equal(a.SkillVersions, b.SkillVersions) || a.Outputs != b.Outputs || !slices.Equal(a.PendingPTCParents, b.PendingPTCParents) {
		return fmt.Errorf("plugin patches cannot change admitted resource references or execution capabilities")
	}
	return nil
}

func (c *call) applyResourceHeaders(ctx context.Context, req *http.Request, account *core.Account, body []byte) error {
	c.resourceAccess = nil
	for name := range req.Header {
		if strings.HasPrefix(strings.ToLower(name), "x-ccgateway-resource-") {
			req.Header.Del(name)
		}
	}
	outputs := c.resourceInfo.Outputs && c.ep.Protocol != "anthropic.count_tokens"
	if len(c.resourceRefs) == 0 && (!outputs || account.PluginKey != "ccgateway") {
		return nil
	}
	if account.PluginKey != "ccgateway" {
		return core.ErrNotFound
	}
	if c.g.d.Resources == nil || c.g.d.ResourceTransport == nil {
		return core.ErrUnavailable.WithMessage("provider resource registry unavailable")
	}
	if err := c.verifyResourceBinding(ctx, account.ID); err != nil {
		return err
	}
	ids := []resources.AdmissionReference{}
	seen := map[string]bool{}
	for _, ref := range c.resourceRefs {
		id := ref.resource.RemoteID
		if gjson.GetBytes(body, ref.reference.Path).String() != id {
			return fmt.Errorf("approved file reference changed")
		}
		key := ref.reference.Kind + ":" + id
		if !seen[key] {
			ids = append(ids, resources.AdmissionReference{Kind: ref.reference.Kind, ID: id})
			seen[key] = true
		}
	}
	if len(ids) > 100 {
		return fmt.Errorf("too many distinct resources")
	}
	raw, _ := json.Marshal(ids)
	var binding core.ResourceBinding
	if len(c.resourceRefs) > 0 {
		binding = c.resourceRefs[0].resource.Binding
	} else {
		var err error
		binding, err = c.g.d.ResourceTransport.Identity(ctx, account.ID)
		if err != nil {
			return &resourceEligibilityError{err}
		}
	}
	req.Header.Set(resources.PrincipalHeader, binding.PrincipalID)
	req.Header.Set(resources.GenerationHeader, binding.Generation)
	if len(ids) > 0 {
		req.Header.Set(resources.ResourceRefsHeader, string(raw))
	}
	if outputs {
		req.Header.Set(resources.ResourceOutputsHeader, "1")
	}
	if err := c.applyResourceContexts(ctx, req.Header, binding); err != nil {
		return err
	}
	if err := c.applySkillVersionHeaders(ctx, req.Header, body, binding); err != nil {
		return err
	}
	c.resourceAccess = &modelResourceAccess{binding: binding, outputs: outputs, dispatchedAt: c.g.now()}
	return nil
}

func (c *call) applyResourceContexts(ctx context.Context, h http.Header, binding core.ResourceBinding) error {
	if len(c.resourceInfo.PendingPTCParents) == 0 {
		return nil
	}
	if c.creditPromptVerified(binding) {
		// A verified credit binds this exact refusal echo to its original
		// provider attempt. Adding a container would change the credit prompt.
		// Worker rechecks its saved wire and ended-attempt parent ledger.
		return nil
	}
	var container *core.ProviderResource
	for i := range c.resourceRefs {
		if c.resourceRefs[i].reference.Kind == resources.KindContainer {
			container = &c.resourceRefs[i].resource
			break
		}
	}
	if container == nil {
		return core.ErrInvalidArgument.WithMessage("programmatic continuation requires its registered container")
	}
	contexts := make([]resources.AdmissionContext, 0, len(c.resourceInfo.PendingPTCParents))
	for _, parent := range c.resourceInfo.PendingPTCParents {
		owned, err := c.g.d.Resources.ResolveContext(ctx, core.ResourceContext{Owner: c.resourceOwner(), Binding: binding, PluginKey: "ccgateway", Kind: "ptc", ParentID: parent})
		if err != nil || owned.PublicID != container.PublicID {
			return core.ErrNotFound.WithMessage("programmatic parent does not belong to this container")
		}
		contexts = append(contexts, resources.AdmissionContext{Kind: "ptc", ParentID: parent, ResourceID: owned.RemoteID})
	}
	raw, _ := json.Marshal(contexts)
	h.Set(resources.ResourceContextsHeader, string(raw))
	return nil
}

func fileReferenceProtocol(protocol string) bool {
	return protocol == "anthropic.messages" || protocol == "anthropic.count_tokens"
}
