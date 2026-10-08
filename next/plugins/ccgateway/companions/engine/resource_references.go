package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

type resourceAdmission struct {
	identity resources.Identity
	ids      map[string]bool
	unlock   func()
	once     sync.Once
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
	if id == "" || len(access) == 0 || access[0] == nil || !access[0].ids[id] {
		return fmt.Errorf("file_id requires verified client-scoped Files API resource mapping")
	}
	return nil
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
	if len(refs) == 0 {
		return nil, nil
	}
	if g.resources == nil {
		return nil, fmt.Errorf("resource ownership verification unavailable")
	}
	var ids []string
	encoded := h.Get(resources.ResourceIDsHeader)
	if len(encoded) > 128<<10 || json.Unmarshal([]byte(encoded), &ids) != nil || len(ids) == 0 || len(ids) > 1024 {
		return nil, fmt.Errorf("invalid verified resource ID allowlist")
	}
	allowed := map[string]bool{}
	for _, id := range ids {
		if id == "" || allowed[id] {
			return nil, fmt.Errorf("invalid verified resource ID allowlist")
		}
		allowed[id] = true
	}
	for _, ref := range refs {
		if ref.Kind != "file" || !allowed[ref.ID] {
			return nil, fmt.Errorf("resource reference is not in the verified ID allowlist")
		}
	}
	b := g.resources
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	if err := lockResourceAuthority(ctx, &b.authority.mu); err != nil {
		return nil, err
	}
	grant := &resourceAdmission{ids: allowed, unlock: b.authority.mu.Unlock}
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
	return grant, nil
}

func (r *Request) validateOutboundResources(raw []byte) error {
	refs, err := resources.ScanReferences(raw)
	if err != nil {
		return err
	}
	for _, ref := range refs {
		if err := checkAdmittedFile(ref.ID, r.resources); err != nil {
			return err
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
