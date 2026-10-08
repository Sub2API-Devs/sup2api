package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

type approvedSkillVersion struct {
	reference   resources.SkillReference
	version     core.SkillVersion
	wireVersion string
}

func (c *call) freezeSkillVersions(ctx context.Context) *gwError {
	if len(c.resourceInfo.SkillVersions) == 0 {
		return nil
	}
	if c.g.d.Skills == nil {
		return fromCore(core.ErrUnavailable.WithMessage("skill version registry unavailable"), errTypeInvalidRequest)
	}
	for _, reference := range c.resourceInfo.SkillVersions {
		version, err := c.g.d.Skills.FindVersion(ctx, c.resourceOwner(), reference.ParentID, reference.Selector)
		if err != nil || !c.usableResource(version.Parent) || version.Parent.Kind != resources.KindSkill || version.State != "ready" {
			return fromCore(core.ErrNotFound, errTypeInvalidRequest)
		}
		wire := version.RemoteVersionID
		if legacySkills(c.c.Request.Header) {
			wire = version.LegacyEpoch
		}
		if wire == "" {
			return invalidModelReference("skill version has no verified identifier for this API version")
		}
		c.resourceVersions = append(c.resourceVersions, approvedSkillVersion{reference, version, wire})
	}
	return nil
}

func (c *call) mapSkillVersions(body []byte) ([]byte, error) {
	for _, approved := range c.resourceVersions {
		var err error
		body, err = sjson.SetBytes(body, approved.reference.Path, approved.wireVersion)
		if err != nil {
			return nil, err
		}
	}
	return body, nil
}

func (c *call) applySkillVersionHeaders(ctx context.Context, h http.Header, body []byte, binding core.ResourceBinding) error {
	if len(c.resourceVersions) == 0 {
		return nil
	}
	var admitted []resources.AdmissionSkillVersion
	seen := map[resources.AdmissionSkillVersion]bool{}
	for _, approved := range c.resourceVersions {
		version, err := c.g.d.Skills.FindVersion(ctx, c.resourceOwner(), approved.version.Parent.PublicID, approved.version.PublicVersionID)
		if err != nil || version.State != "ready" || version.Parent.Binding != binding || version.Parent.RemoteID != approved.version.Parent.RemoteID || version.RemoteVersionID != approved.version.RemoteVersionID || version.LegacyEpoch != approved.version.LegacyEpoch {
			return core.ErrNotFound
		}
		if gjson.GetBytes(body, approved.reference.Path).String() != approved.wireVersion {
			return fmt.Errorf("approved skill version changed before dispatch")
		}
		entry := resources.AdmissionSkillVersion{SkillID: version.Parent.RemoteID, Version: approved.wireVersion}
		if !seen[entry] {
			admitted = append(admitted, entry)
			seen[entry] = true
		}
	}
	if len(admitted) > 100 {
		return fmt.Errorf("too many skill versions")
	}
	raw, _ := json.Marshal(admitted)
	h.Set(resources.ResourceSkillVersionsHeader, string(raw))
	return nil
}

// Called after response skill IDs have been mapped to their owned public IDs.
// Provider-selected versions must already belong to those exact parents.
func (c *call) rewriteResourceSkillVersions(ctx context.Context, body []byte) ([]byte, error) {
	refs, err := resources.ScanResponseSkillVersions(body)
	if err != nil || len(refs) == 0 {
		return body, err
	}
	if c.g.d.Skills == nil {
		return nil, fmt.Errorf("skill version registry unavailable")
	}
	for _, ref := range refs {
		if ref.Selector == "latest" {
			return nil, fmt.Errorf("provider did not resolve a concrete skill version")
		}
		version, err := c.g.d.Skills.FindObservedVersion(ctx, c.resourceOwner(), ref.ParentID, ref.Selector)
		if err != nil || c.resourceAccess == nil || version.Parent.Binding != c.resourceAccess.binding {
			return nil, fmt.Errorf("provider skill version is not registered to this owner")
		}
		for _, approved := range c.resourceVersions {
			if approved.version.Parent.PublicID == ref.ParentID && approved.version.RemoteVersionID != version.RemoteVersionID {
				return nil, fmt.Errorf("provider changed the frozen skill version")
			}
		}
		public := version.PublicVersionID
		if legacySkills(c.c.Request.Header) {
			public = version.LegacyEpoch
			if public == "" {
				return nil, fmt.Errorf("provider skill version has no verified legacy identifier")
			}
		}
		body, err = sjson.SetBytes(body, ref.Path, public)
		if err != nil {
			return nil, err
		}
	}
	return body, nil
}
