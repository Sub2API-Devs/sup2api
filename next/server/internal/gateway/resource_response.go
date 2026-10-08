package gateway

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usagerules"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"
)

type resourceResponseEvent struct {
	raw, data []byte
	name      string
}
type resourceResponseRegistry struct {
	c         *call
	known     map[string]core.ProviderResource
	container string
}

// Only stateful responses are buffered. Closing the Worker stream before a
// metadata GET releases its issuer lock and avoids a nested transport deadlock.
func (c *call) forwardResourceResponse(ctx context.Context, rt *typeRoute, resp *http.Response, u *usageAcc, capture *usageCapture) error {
	raw, readErr := io.ReadAll(io.LimitReader(resp.Body, maxUsageJSONBuf+1))
	closeErr := resp.Body.Close()
	sse := isSSE(resp.Header.Get("Content-Type"))
	events, parseErr := resourceResponseEvents(raw, sse)
	for _, ev := range events {
		if sse {
			u.ApplySSE(ev.name, ev.data)
			capture.addEvent(usagerules.EventName(ev.name, ev.data), ev.data)
		} else {
			u.ApplyJSON(ev.data)
			capture.setBody(ev.data)
		}
	}
	fail := func(err error) error {
		slog.WarnContext(ctx, "gateway: stateful response withheld", "request_id", c.rid, "reason", err.Error())
		return &convertError{err: fmt.Errorf("resource output registration: %w", err)}
	}
	if readErr != nil || closeErr != nil || len(raw) > maxUsageJSONBuf {
		return fail(fmt.Errorf("incomplete or oversized stateful response"))
	}
	if parseErr != nil {
		return fail(parseErr)
	}
	if c.resourceAccess != nil && c.resourceAccess.outputs {
		var err error
		events, err = c.rewriteResourceEvents(ctx, resp.Header, events)
		if err != nil {
			return fail(err)
		}
	}
	if err := c.observeFallbackCredit(ctx, resp, events, sse); err != nil {
		if _, storage := err.(*creditStorageError); storage {
			return err
		}
		return fail(err)
	}
	var output bytes.Buffer
	for _, ev := range events {
		if sse {
			output.Write(ev.raw)
		} else {
			output.Write(ev.data)
		}
	}
	resp.Body = io.NopCloser(bytes.NewReader(output.Bytes()))
	resp.ContentLength = int64(output.Len())
	resp.Header.Del("Content-Length")
	// Accounting already consumed original provider bytes, before registration.
	scratch := newUsageAcc(rt.usage)
	discard := newUsageCapture(rt)
	if sse {
		return c.forwardSSE(ctx, resp, scratch, rt.conv, discard)
	}
	if rt.conv != nil {
		return c.forwardJSONConverted(resp, scratch, discard, rt.conv)
	}
	return c.forwardJSON(resp, scratch, discard)
}

func (c *call) rewriteResourceEvents(ctx context.Context, header http.Header, events []resourceResponseEvent) ([]resourceResponseEvent, error) {
	access := c.resourceAccess
	if access == nil || header.Get(resources.PrincipalHeader) != access.binding.PrincipalID || header.Get(resources.GenerationHeader) != access.binding.Generation {
		return nil, fmt.Errorf("issuer evidence mismatch")
	}
	if c.g.d.Resources == nil || c.g.d.ResourceTransport == nil {
		return nil, fmt.Errorf("resource registry unavailable")
	}
	registry := resourceResponseRegistry{c: c, known: map[string]core.ProviderResource{}}
	for _, ref := range c.resourceRefs {
		registry.known[ref.resource.Kind+":"+ref.resource.RemoteID] = ref.resource
		if ref.resource.Kind == resources.KindContainer {
			registry.container = ref.resource.RemoteID
		}
	}
	// Container facts can arrive after file blocks in SSE; observe them first.
	for _, ev := range events {
		if err := registry.observeContainers(ctx, ev.data); err != nil {
			return nil, err
		}
	}
	for i := range events {
		changed, err := registry.rewrite(ctx, events[i].data)
		if err != nil {
			return nil, err
		}
		if !bytes.Equal(changed, events[i].data) {
			events[i].raw = rewriteResourceEvent(events[i].raw, changed)
			events[i].data = changed
		}
	}
	return events, nil
}

func resourceResponseEvents(raw []byte, sse bool) ([]resourceResponseEvent, error) {
	if !sse {
		if !json.Valid(raw) {
			return nil, fmt.Errorf("invalid response JSON")
		}
		return []resourceResponseEvent{{raw: raw, data: raw}}, nil
	}
	var events []resourceResponseEvent
	start := 0
	var data []byte
	name := ""
	stopped := false
	for at := 0; at < len(raw); {
		end := bytes.IndexByte(raw[at:], '\n')
		if end < 0 {
			break
		}
		end += at + 1
		line := bytes.TrimRight(raw[at:end], "\r\n")
		if len(line) == 0 {
			if len(data) > 0 {
				if !json.Valid(data) {
					return events, fmt.Errorf("invalid SSE data")
				}
				typ := gjson.GetBytes(data, "type").String()
				if stopped && typ != "ping" {
					return events, fmt.Errorf("stateful SSE continued after terminal event")
				}
				if name != "" && name != typ {
					return events, fmt.Errorf("stateful SSE event type mismatch")
				}
				stopped = stopped || typ == "message_stop" || typ == "error"
			}
			events = append(events, resourceResponseEvent{raw: raw[start:end], data: append([]byte(nil), data...), name: name})
			start = end
			data = nil
			name = ""
		} else if bytes.HasPrefix(line, []byte("event:")) {
			name = strings.TrimSpace(string(line[6:]))
		} else if bytes.HasPrefix(line, []byte("data:")) {
			if len(data) > 0 {
				data = append(data, '\n')
			}
			data = append(data, bytes.TrimPrefix(line[5:], []byte(" "))...)
		}
		at = end
	}
	if start != len(raw) || !stopped {
		return events, fmt.Errorf("incomplete stateful SSE")
	}
	return events, nil
}
func rewriteResourceEvent(raw, data []byte) []byte {
	if len(data) == 0 {
		return raw
	}
	var out bytes.Buffer
	written := false
	for _, line := range bytes.SplitAfter(raw, []byte("\n")) {
		if bytes.HasPrefix(line, []byte("data:")) {
			if !written {
				out.WriteString("data: ")
				out.Write(data)
				out.WriteByte('\n')
				written = true
			}
			continue
		}
		out.Write(line)
	}
	return out.Bytes()
}
func (r *resourceResponseRegistry) observeContainers(ctx context.Context, raw []byte) error {
	if len(raw) == 0 {
		return nil
	}
	refs, err := resources.ScanResponseReferences(raw)
	if err != nil {
		return err
	}
	for _, ref := range refs {
		if ref.Kind != resources.KindContainer {
			continue
		}
		if r.container != "" && r.container != ref.ID {
			return fmt.Errorf("response changed admitted container")
		}
		base := strings.TrimSuffix(ref.Path, ".id")
		expiry := gjson.GetBytes(raw, base+".expires_at")
		t, err := time.Parse(time.RFC3339, expiry.String())
		if err != nil || !t.After(r.c.g.now()) {
			r.reconcile(ref, fmt.Errorf("invalid provider container expiry"))
			return fmt.Errorf("container expiry missing or invalid")
		}
		metadata, _ := json.Marshal(map[string]any{"expires_at": expiry.String()})
		observed, err := r.c.g.d.Resources.RegisterObserved(ctx, core.ResourceObservation{Owner: r.c.resourceOwner(), Binding: r.c.resourceAccess.binding, PluginKey: "ccgateway", Kind: ref.Kind, RemoteID: ref.ID, Metadata: metadata, ExpiresAt: &t, RequestStartedAt: r.c.resourceAccess.dispatchedAt})
		if err != nil {
			r.reconcile(ref, err)
			return fmt.Errorf("container observation failed")
		}
		r.known[ref.Kind+":"+ref.ID] = observed
		r.container = ref.ID
	}
	return nil
}
func (r *resourceResponseRegistry) rewrite(ctx context.Context, raw []byte) ([]byte, error) {
	if len(raw) == 0 {
		return raw, nil
	}
	refs, err := resources.ScanResponseReferences(raw)
	if err != nil {
		return nil, err
	}
	parents, err := resources.ResponsePTCParents(raw)
	if err != nil {
		return nil, err
	}
	for _, parent := range parents {
		container, ok := r.known[resources.KindContainer+":"+r.container]
		if !ok {
			return nil, fmt.Errorf("programmatic output missing container")
		}
		if err := r.c.g.d.Resources.BindContext(ctx, core.ResourceContext{Owner: r.c.resourceOwner(), Binding: r.c.resourceAccess.binding, PluginKey: "ccgateway", Kind: "ptc", ParentID: parent, ResourceID: container.PublicID}); err != nil {
			return nil, fmt.Errorf("programmatic context registration failed")
		}
	}
	out := raw
	for _, ref := range refs {
		stored, ok := r.known[ref.Kind+":"+ref.ID]
		if !ok && len(r.known) >= 100 {
			r.reconcile(ref, fmt.Errorf("resource output limit"))
			return nil, fmt.Errorf("too many output resources")
		}
		if !ok && ref.Kind == resources.KindFile {
			stored, err = r.observeFile(ctx, ref)
			if err != nil {
				r.reconcile(ref, err)
				return nil, fmt.Errorf("generated file observation failed")
			}
			r.known[ref.Kind+":"+ref.ID] = stored
			ok = true
		}
		if !ok && ref.Kind == resources.KindSkill {
			stored, err = r.c.g.d.Resources.FindOwnedRemote(ctx, r.c.resourceOwner(), r.c.resourceAccess.binding, resources.KindSkill, ref.ID)
			if err != nil {
				return nil, fmt.Errorf("output skill is not registered to this owner")
			}
			r.known[ref.Kind+":"+ref.ID] = stored
			ok = true
		}
		if !ok {
			return nil, fmt.Errorf("unknown output resource")
		}
		out, err = sjson.SetBytes(out, ref.Path, stored.PublicID)
		if err != nil {
			return nil, err
		}
	}
	return r.c.rewriteResourceSkillVersions(ctx, out)
}
func (r *resourceResponseRegistry) observeFile(ctx context.Context, ref resources.Reference) (core.ProviderResource, error) {
	c := r.c
	binding := c.resourceAccess.binding
	req, err := http.NewRequestWithContext(ctx, "GET", "/v1/files/"+url.PathEscape(ref.ID), nil)
	if err != nil {
		return core.ProviderResource{}, err
	}
	req.Header.Set("Anthropic-Version", "2023-06-01")
	resp, err := c.g.d.ResourceTransport.RoundTrip(binding.AccountID, binding, req)
	if err != nil {
		return core.ProviderResource{}, err
	}
	if resp == nil {
		return core.ProviderResource{}, fmt.Errorf("missing metadata response")
	}
	if resp.StatusCode != 200 || resp.Header.Get(resources.PrincipalHeader) != binding.PrincipalID || resp.Header.Get(resources.GenerationHeader) != binding.Generation {
		resp.Body.Close()
		return core.ProviderResource{}, fmt.Errorf("metadata failed or issuer changed")
	}
	body, err := readResourceJSON(resp)
	if err != nil {
		return core.ProviderResource{}, err
	}
	meta, err := resourceMetadata(body, ref.ID, -1)
	if err != nil {
		return core.ProviderResource{}, err
	}
	n, _ := body["size_bytes"].(json.Number)
	size, _ := n.Int64()
	var expiry *time.Time
	if text, ok := body["expires_at"].(string); ok {
		parsed, e := time.Parse(time.RFC3339, text)
		if e != nil {
			return core.ProviderResource{}, e
		}
		expiry = &parsed
	}
	return c.g.d.Resources.RegisterObserved(ctx, core.ResourceObservation{Owner: c.resourceOwner(), Binding: binding, PluginKey: "ccgateway", Kind: ref.Kind, RemoteID: ref.ID, Bytes: size, Metadata: meta, ExpiresAt: expiry, RequestStartedAt: c.resourceAccess.dispatchedAt})
}
func (r *resourceResponseRegistry) reconcile(ref resources.Reference, cause error) {
	ctx, cancel := resourceCleanupContext()
	defer cancel()
	c := r.c
	metadata, _ := json.Marshal(map[string]any{"remote_id": ref.ID, "source_request_id": c.rid, "reason": "output_registration_failed"})
	idempotency := sha256.Sum256([]byte(c.rid + "\x00" + ref.Kind + "\x00" + ref.ID))
	reservation, err := c.g.d.Resources.Reserve(ctx, core.ResourceIntent{Owner: c.resourceOwner(), Binding: c.resourceAccess.binding, PluginKey: "ccgateway", Kind: ref.Kind, RequestID: fmt.Sprintf("output:%x", idempotency), Metadata: metadata})
	if err == nil {
		err = c.g.d.Resources.MarkUncertain(ctx, c.resourceOwner(), reservation.Resource.PublicID, reservation.Resource.OperationID)
	}
	slog.WarnContext(ctx, "gateway: resource output reconciliation required", "request_id", c.rid, "kind", ref.Kind, "account_id", c.resourceAccess.binding.AccountID, "recorded", err == nil, "cause_type", fmt.Sprintf("%T", cause))
}
