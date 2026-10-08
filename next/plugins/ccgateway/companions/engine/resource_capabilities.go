package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

const resourceAdmissionLimit = 100

func decodeResourceCapability(raw string, out any) error {
	if len(raw) > 128<<10 {
		return fmt.Errorf("resource capability header exceeds limit")
	}
	if !strings.HasPrefix(strings.TrimSpace(raw), "[") {
		return fmt.Errorf("resource capability must be an array")
	}
	d := json.NewDecoder(bytes.NewBufferString(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(out); err != nil {
		return fmt.Errorf("invalid resource capability header")
	}
	if err := d.Decode(new(any)); err != io.EOF {
		return fmt.Errorf("invalid trailing resource capability value")
	}
	return nil
}

func parseResourceCapabilities(h http.Header) (*resourceAdmission, error) {
	grant := &resourceAdmission{ids: map[string]bool{}, kinds: map[string]map[string]bool{}}
	for _, name := range []string{resources.ResourceOutputsHeader, resources.ResourceRefsHeader, resources.ResourceIDsHeader, resources.ResourceContextsHeader, resources.ResourceSkillVersionsHeader} {
		if len(h.Values(name)) > 1 {
			return nil, fmt.Errorf("duplicate resource capability header")
		}
	}
	output := h.Get(resources.ResourceOutputsHeader)
	if h.Get(resources.ResourceRefsHeader) != "" && h.Get(resources.ResourceIDsHeader) != "" {
		return nil, fmt.Errorf("legacy and typed resource capabilities cannot be combined")
	}
	if output != "" && output != "1" {
		return nil, fmt.Errorf("resource output capability must be 1")
	}
	grant.outputs = output == "1"
	var refs []resources.AdmissionReference
	if raw := h.Get(resources.ResourceRefsHeader); raw != "" {
		if err := decodeResourceCapability(raw, &refs); err != nil {
			return nil, err
		}
	}
	if len(refs) > resourceAdmissionLimit {
		return nil, fmt.Errorf("resource capability exceeds distinct resource limit")
	}
	for _, ref := range refs {
		switch ref.Kind {
		case resources.KindFile, resources.KindContainer, resources.KindSkill:
		default:
			return nil, fmt.Errorf("unknown resource capability kind")
		}
		if ref.ID == "" || len(ref.ID) > 256 || strings.ContainsAny(ref.ID, "\x00\r\n") {
			return nil, fmt.Errorf("invalid resource capability ID")
		}
		if grant.kinds[ref.Kind] == nil {
			grant.kinds[ref.Kind] = map[string]bool{}
		}
		if grant.kinds[ref.Kind][ref.ID] {
			return nil, fmt.Errorf("duplicate resource capability reference")
		}
		grant.kinds[ref.Kind][ref.ID] = true
	}
	var legacy []string
	if raw := h.Get(resources.ResourceIDsHeader); raw != "" {
		if err := decodeResourceCapability(raw, &legacy); err != nil {
			return nil, err
		}
	}
	if len(legacy) > resourceAdmissionLimit {
		return nil, fmt.Errorf("legacy resource capability exceeds distinct resource limit")
	}
	for _, id := range legacy {
		if id == "" || len(id) > 256 || strings.ContainsAny(id, "\x00\r\n") || grant.ids[id] {
			return nil, fmt.Errorf("invalid legacy file capability ID")
		}
		grant.ids[id] = true
	}
	if grant.kinds[resources.KindFile] == nil {
		grant.kinds[resources.KindFile] = map[string]bool{}
	}
	for id := range grant.ids {
		grant.kinds[resources.KindFile][id] = true
	}
	grant.ids = grant.kinds[resources.KindFile]
	count := 0
	for _, ids := range grant.kinds {
		count += len(ids)
	}
	if count > resourceAdmissionLimit {
		return nil, fmt.Errorf("resource capability exceeds distinct resource limit")
	}
	if err := parseResourceContexts(h, grant); err != nil {
		return nil, err
	}
	if err := parseResourceSkillVersions(h, grant); err != nil {
		return nil, err
	}
	return grant, nil
}

func parseResourceSkillVersions(h http.Header, grant *resourceAdmission) error {
	var versions []resources.AdmissionSkillVersion
	if raw := h.Get(resources.ResourceSkillVersionsHeader); raw != "" {
		if err := decodeResourceCapability(raw, &versions); err != nil {
			return err
		}
	}
	if len(versions) > resourceAdmissionLimit {
		return fmt.Errorf("skill version capability exceeds limit")
	}
	grant.skillVersions = map[resources.AdmissionSkillVersion]bool{}
	for _, version := range versions {
		if !providerResourceID(version.Version) || version.Version == "latest" || grant.require(resources.KindSkill, version.SkillID) != nil {
			return fmt.Errorf("skill version capability requires an owned parent and concrete version")
		}
		if grant.skillVersions[version] {
			return fmt.Errorf("duplicate skill version capability")
		}
		grant.skillVersions[version] = true
	}
	return nil
}

func parseResourceContexts(h http.Header, grant *resourceAdmission) error {
	var contexts []resources.AdmissionContext
	if raw := h.Get(resources.ResourceContextsHeader); raw != "" {
		if err := decodeResourceCapability(raw, &contexts); err != nil {
			return err
		}
	}
	if len(contexts) > resourceAdmissionLimit {
		return fmt.Errorf("resource context count exceeds limit")
	}
	grant.contexts = map[string]string{}
	for _, entry := range contexts {
		if entry.Kind != "ptc" || entry.ParentID == "" || len(entry.ParentID) > 256 || strings.ContainsAny(entry.ParentID, "\x00\r\n") {
			return fmt.Errorf("invalid resource context identity")
		}
		if _, exists := grant.contexts[entry.ParentID]; exists {
			return fmt.Errorf("duplicate resource context parent")
		}
		if err := grant.require(resources.KindContainer, entry.ResourceID); err != nil {
			return fmt.Errorf("programmatic context needs an authorized container reference")
		}
		grant.contexts[entry.ParentID] = entry.ResourceID
	}
	return nil
}

func (a *resourceAdmission) applyResponseHeaders(header http.Header) {
	if a == nil {
		return
	}
	header.Set(resources.PrincipalHeader, a.identity.PrincipalID)
	header.Set(resources.GenerationHeader, a.identity.Generation)
}

func (a *resourceAdmission) diagnosticFacts() Object {
	counts := Object{}
	for kind, ids := range a.kinds {
		if len(ids) > 0 {
			counts[kind] = len(ids)
		}
	}
	return Object{"identity": a.identity, "allowed_resource_counts": counts, "resource_outputs": a.outputs, "programmatic_context_count": len(a.contexts)}
}
