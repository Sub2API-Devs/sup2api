package engine

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

type resourceAdmission struct {
	identity      resources.Identity
	ids           map[string]bool
	kinds         map[string]map[string]bool
	outputs       bool
	contexts      map[string]string
	skillVersions map[resources.AdmissionSkillVersion]bool
	references    []resources.Reference
	unlock        func()
	once          sync.Once
}

func (a *resourceAdmission) close() {
	if a != nil {
		a.once.Do(func() {
			if a.unlock != nil {
				a.unlock()
			}
		})
	}
}
func checkAdmittedFile(id string, access ...*resourceAdmission) error {
	if len(access) == 0 || access[0].require(resources.KindFile, id) != nil {
		return fmt.Errorf("file_id requires verified client-scoped Files API resource mapping")
	}
	return nil
}

func (a *resourceAdmission) require(kind, id string) error {
	if a != nil && id != "" && (a.kinds[kind][id] || kind == resources.KindFile && a.ids[id]) {
		return nil
	}
	return fmt.Errorf("%s resource requires verified client-scoped ownership", kind)
}
func (r *Request) requireResourceKind(kind, id string) error { return r.resources.require(kind, id) }

func (r *Request) requireSkillVersion(id, version string) error {
	if r.resources == nil || !r.resources.skillVersions[resources.AdmissionSkillVersion{SkillID: id, Version: version}] {
		return fmt.Errorf("custom skill version requires verified parent-scoped registration")
	}
	return r.requireResourceKind(resources.KindSkill, id)
}
func (r *Request) resourceOutputsAllowed() bool { return r.resources != nil && r.resources.outputs }
func (r *Request) checkResourceContext(parent, containerID string) error {
	if r.resources == nil || parent == "" || containerID == "" || r.resources.contexts[parent] != containerID {
		return fmt.Errorf("pending programmatic tool parent requires verified container context")
	}
	return r.requireResourceKind(resources.KindContainer, containerID)
}
func checkFileSource(source Object, access ...*resourceAdmission) error {
	if err := keys(source, "type", "file_id"); err != nil {
		return err
	}
	return checkAdmittedFile(str(source, "file_id"), access...)
}

func (g *Gateway) admitResourceReferences(ctx context.Context, raw []byte, h http.Header) (*resourceAdmission, error) {
	refs, err := resources.ScanReferences(raw)
	if err != nil {
		return nil, err
	}
	grant, err := parseResourceCapabilities(h)
	if err != nil {
		return nil, err
	}
	if len(refs) == 0 && !grant.outputs {
		return nil, nil
	}
	if g.resources == nil {
		return nil, fmt.Errorf("resource ownership verification unavailable")
	}
	for _, ref := range refs {
		if grant.require(ref.Kind, ref.ID) != nil {
			return nil, fmt.Errorf("resource reference is not in the verified ID allowlist")
		}
	}
	b := g.resources
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err := lockResourceAuthority(ctx, &b.authority.mu); err != nil {
		return nil, err
	}
	grant.unlock = b.authority.mu.Unlock
	if err := waitResourceSlot(ctx, g.Slots); err != nil {
		grant.close()
		return nil, err
	}
	defer func() { <-g.Slots }()
	identity, err := b.identity(ctx)
	if err == nil {
		err = verifyExpectedResourceIdentity(h, identity)
	}
	if err != nil {
		grant.close()
		return nil, err
	}
	grant.identity = identity
	grant.references = append([]resources.Reference(nil), refs...)
	return grant, nil
}

func (r *Request) validateOutboundResources(raw []byte) error {
	info, err := resources.InspectRequest(raw)
	if err != nil {
		return err
	}
	refs := info.References
	for _, version := range info.SkillVersions {
		if err := r.requireSkillVersion(version.ParentID, version.Selector); err != nil {
			return err
		}
	}
	for _, ref := range refs {
		if err := r.requireResourceKind(ref.Kind, ref.ID); err != nil {
			return err
		}
	}
	if r.resources != nil && r.resources.references != nil {
		if digest(topLevelResourceRefs(refs)) != digest(topLevelResourceRefs(r.resources.references)) {
			return fmt.Errorf("top-level resource identity or position changed")
		}
	}
	body, err := decodeObject(raw)
	if err != nil {
		return err
	}
	// Remove only gateway-owned discovery turns for comparison. The actual
	// outbound body is untouched, and declared client ToolSearch is never hidden.
	wire, _ := body["messages"].([]any)
	var client []any
	internalIDs := map[string]bool{}
	for _, value := range wire {
		message, _ := value.(Object)
		content, err := historyContent(message["content"])
		if err != nil {
			return err
		}
		if str(message, "role") == "assistant" && internalHistoryAssistant(r, message) {
			for _, block := range content {
				if str(block, "type") == "tool_use" {
					internalIDs[str(block, "id")] = true
				}
			}
			continue
		}
		if str(message, "role") == "user" {
			filtered := []Object{}
			for _, block := range content {
				if str(block, "type") == "tool_result" && internalIDs[str(block, "tool_use_id")] {
					continue
				}
				filtered = append(filtered, block)
			}
			if len(filtered) == 0 {
				continue
			}
			message["content"] = filtered
		}
		client = append(client, message)
	}
	body["messages"] = client
	if _, err := alignClientHistory(r, body); err != nil {
		return fmt.Errorf("resource history identity changed: %w", err)
	}
	return nil
}

func topLevelResourceRefs(values []resources.Reference) []resources.Reference {
	var out []resources.Reference
	for _, ref := range values {
		if !strings.HasPrefix(ref.Path, "messages.") {
			out = append(out, ref)
		}
	}
	return out
}
