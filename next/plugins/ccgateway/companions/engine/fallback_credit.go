package engine

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
)

type creditExecution struct {
	mu               sync.Mutex
	registry         *creditRegistry
	previous         *creditSnapshot
	raw              []byte
	headers          []string
	wire             json.RawMessage
	wireBetas        []string
	hash             string
	config           string
	events           []Object
	eventBytes       int
	released         bool
	messageID        string
	stopReason       string
	stopDetails      Object
	observationError error
	observedAt       time.Time
	creditUsages     []any
}

func (p *RequestPlan) takeCredit(o Object) error {
	value, exists := o["fallback_credit_token"]
	if !exists {
		return nil
	}
	parameter, err := credits.ParseParameter(value)
	if err != nil {
		return err
	}
	p.creditParameter = parameter
	if !parameter.Present {
		p.fields["fallback_credit_token"] = json.RawMessage("null")
	} else {
		if _, exists := o["fallbacks"]; exists {
			return fmt.Errorf("credit redemption must omit fallbacks")
		}
		p.creditToken = parameter.Token
	}
	delete(o, "fallback_credit_token")
	return nil
}

func (x *exchange) admitCredit(body []byte) error {
	h := x.r.Header
	for _, name := range []string{credits.TrackingHeader, credits.AdmissionHeader} {
		if len(h.Values(name)) > 1 {
			return fmt.Errorf("duplicate credit capability header")
		}
	}
	tracked := h.Get(credits.TrackingHeader)
	token := ""
	if x.req.Plan != nil {
		token = x.req.Plan.creditToken
	}
	if tracked == "" && token == "" {
		if h.Get(credits.AdmissionHeader) != "" {
			return fmt.Errorf("credit admission without redemption")
		}
		return nil
	}
	if tracked != "1" || !credits.Enabled(h.Values("Anthropic-Beta")) {
		return fmt.Errorf("fallback credit requires trusted tracking and its registered beta")
	}
	if x.req.CountTokens || x.req.CacheWarmup || x.req.toolSearchEnabled() || x.req.structuredOutput() {
		return fmt.Errorf("fallback credit requires one Messages generation without internal tool rounds")
	}
	clientDigest, err := credits.Digest(body, h.Values("Anthropic-Beta"))
	if err != nil {
		return err
	}
	if x.resources == nil {
		if x.g.resources == nil {
			return fmt.Errorf("fallback credit issuer verification unavailable")
		}
		ctx, cancel := context.WithTimeout(x.r.Context(), 30*time.Second)
		defer cancel()
		broker := x.g.resources
		if err := lockResourceAuthority(ctx, &broker.authority.mu); err != nil {
			return err
		}
		grant := &resourceAdmission{unlock: broker.authority.mu.Unlock}
		if err := waitResourceSlot(ctx, x.g.Slots); err != nil {
			grant.close()
			return err
		}
		identity, err := broker.identity(ctx)
		<-x.g.Slots
		if err == nil {
			err = verifyExpectedResourceIdentity(h, identity)
		}
		if err != nil {
			grant.close()
			return err
		}
		grant.identity = identity
		x.resources = grant
		x.req.resources = grant
		grant.applyResponseHeaders(x.w.Header())
	}
	x.g.mu.Lock()
	if x.g.credits == nil {
		registry, err := newCreditRegistry(x.g.resources.creditDir, x.g.Key, 128<<20)
		if err != nil {
			x.g.mu.Unlock()
			return &creditLocalStorageError{err}
		}
		x.g.credits = registry
	}
	registry := x.g.credits
	x.g.mu.Unlock()
	state := &creditExecution{registry: registry, raw: append([]byte(nil), body...), headers: append([]string(nil), h.Values("Anthropic-Beta")...)}
	policy, err := requestPolicy(h)
	if err != nil {
		return err
	}
	state.config = digest([]any{x.g.Runner.Version, resourceEnv(x.g.Runner.baseEnv(), "ANTHROPIC_BASE_URL"), policy, x.req.Native, x.req.customToolServer(), x.req.AttachmentSource, x.req.AttachmentSources, x.req.EnvironmentFields, x.req.UnknownClientAttachment, x.req.UnknownGatewayAttachment})
	if token != "" {
		hash, _ := credits.TokenHash(token)
		if h.Get(credits.AdmissionHeader) != hash {
			return fmt.Errorf("fallback credit redemption requires verified owner and original request binding")
		}
		bestEffort := x.req.Plan.creditParameter.Mode == "best_effort"
		snapshot, active, err := registry.lookup(hash)
		if err != nil && !errors.Is(err, errCreditSnapshotMissing) {
			return &creditLocalStorageError{err}
		}
		if snapshot != nil && snapshot.Identity != x.resources.identity {
			return fmt.Errorf("fallback credit issuer changed")
		}
		matches := err == nil && active && snapshot.ConfigHash == state.config && slices.Contains(snapshot.ClientDigests, clientDigest)
		if !matches && !bestEffort {
			return fmt.Errorf("fallback credit snapshot, policy or original request changed or expired")
		}
		state.hash = hash
		if matches {
			state.previous = snapshot
		}

	}
	x.req.credit = state
	return nil
}

func (r *Request) bindCreditWire(raw []byte, h http.Header) ([]byte, error) {
	state := r.credit
	if state == nil {
		return raw, nil
	}
	state.mu.Lock()
	defer state.mu.Unlock()
	object, err := decodeObject(raw)
	if err != nil {
		return nil, err
	}
	if state.previous != nil {
		original, err := decodeObject(state.previous.WirePrompt)
		if err != nil {
			return nil, err
		}
		current, err := credits.Prompt(raw)
		if err != nil {
			return nil, err
		}
		prompt, err := decodeObject(current)
		if err != nil {
			return nil, err
		}
		for key := range prompt {
			delete(object, key)
		}
		for key, value := range original {
			object[key] = value
		}
		incomingDigest, err := credits.Digest(state.raw, state.headers)
		if err != nil {
			return nil, err
		}
		if incomingDigest != state.previous.BaseDigest {
			echo, exists := state.previous.Echoes[incomingDigest]
			if !exists {
				return nil, fmt.Errorf("credit continuation wire shape unavailable")
			}
			decoded, err := decodePlannedValue(echo)
			if err != nil {
				return nil, err
			}
			content, ok := decoded.([]any)
			if !ok {
				return nil, fmt.Errorf("invalid credit wire content")
			}
			messages, _ := original["messages"].([]any)
			object["messages"] = append(append([]any{}, messages...), Object{"role": "assistant", "content": content})
		}
		betas := credits.MatchingBetas(state.previous.Betas)
		for _, header := range state.headers {
			for _, beta := range strings.Split(header, ",") {
				beta = strings.TrimSpace(beta)
				if strings.HasPrefix(beta, "fallback-credit-") || strings.HasPrefix(beta, "server-side-fallback-") {
					betas = append(betas, beta)
				}
			}
		}
		h.Set("Anthropic-Beta", strings.Join(betas, ","))
	}
	if r.Plan != nil && r.Plan.creditToken != "" {
		value, err := decodePlannedValue(r.Plan.creditParameter.Raw)
		if err != nil {
			return nil, fmt.Errorf("invalid credit parameter encoding")
		}
		object["fallback_credit_token"] = value
	}
	adapted, err := json.Marshal(object)
	if err != nil {
		return nil, err
	}
	prompt, err := credits.Prompt(adapted)
	if err != nil {
		return nil, err
	}
	if state.wire != nil && digest(state.wire) != digest(prompt) {
		return nil, fmt.Errorf("multiple different main requests cannot share a credit operation")
	}
	state.wire = prompt
	state.wireBetas = append([]string(nil), h.Values("Anthropic-Beta")...)
	return adapted, nil
}

func (x *exchange) completeCredit(answer Object) error {
	state := x.req.credit
	if state == nil {
		return nil
	}
	if err := state.restoreStopDetails(answer); err != nil {
		return err
	}
	raw, err := json.Marshal(answer)
	if err != nil {
		return err
	}
	claim, err := credits.ClaimForResponse(state.raw, raw, state.headers)
	if err != nil {
		return err
	}
	if claim != nil {
		blocks, err := historyContent(answer["content"])
		if err != nil {
			return err
		}
		wireBlocks := x.req.wireMessage(Message{Role: "assistant", Content: blocks}).Content
		if wireBlocks == nil {
			wireBlocks = []Object{}
		}
		wireContent, _ := json.Marshal(wireBlocks)
		decoded, err := decodePlannedValue(wireContent)
		if err != nil {
			return err
		}
		wireValues, ok := decoded.([]any)
		if !ok {
			return fmt.Errorf("invalid credit response wire content")
		}
		response, _ := credits.Object(raw)
		clientValues, _ := response["content"].([]any)
		source, err := credits.Object(state.raw)
		if err != nil {
			return err
		}
		messages, _ := source["messages"].([]any)
		echoes := map[string]json.RawMessage{}
		for i, echo := range [][]any{clientValues, credits.ContinuationContent(clientValues)} {
			source["messages"] = append(append([]any{}, messages...), Object{"role": "assistant", "content": echo})
			retry, _ := json.Marshal(source)
			hash, err := credits.Digest(retry, state.headers)
			if err != nil {
				return err
			}
			wireEcho := wireValues
			if i == 1 {
				wireEcho = credits.ContinuationContent(wireValues)
			}
			encoded, _ := json.Marshal(wireEcho)
			echoes[hash] = encoded
		}
		state.mu.Lock()
		issuedAt := state.observedAt
		if issuedAt.IsZero() {
			issuedAt = time.Now()
		}
		snapshot := creditSnapshot{Hash: claim.TokenHash, Identity: x.resources.identity, ConfigHash: state.config, ClientDigests: claim.Digests, BaseDigest: claim.Digests[0], Echoes: echoes, WirePrompt: append(json.RawMessage(nil), state.wire...), WireContent: wireContent, Prefill: claim.Prefill, Betas: append([]string(nil), state.wireBetas...), ExpiresAt: issuedAt.Add(credits.Lifetime)}
		state.mu.Unlock()
		if err = state.registry.Save(snapshot); err != nil {
			return err
		}
		x.w.Header().Set(credits.ReadyHeader, claim.TokenHash)
	}
	state.released = true
	return nil
}

func (x *exchange) flushCreditEvents() error {
	state := x.req.credit
	if state == nil {
		return nil
	}
	for _, event := range state.events {
		if err := x.send(event); err != nil {
			return err
		}
	}
	state.events = nil
	return nil
}

func (x *exchange) bufferCreditEvent(event Object) (bool, error) {
	if x.req.credit == nil || x.req.credit.released {
		return false, nil
	}
	state := x.req.credit
	raw, err := json.Marshal(event)
	if err != nil {
		return true, err
	}
	state.eventBytes += len(raw)
	if state.eventBytes > 64<<20 {
		return true, fmt.Errorf("credit response buffer exceeds limit")
	}
	copy, err := decodeObject(raw)
	if err != nil {
		return true, err
	}
	state.events = append(state.events, copy)
	return true, nil
}

// Only the attributed main-provider observer may record credit credentials.
// CLI omission is repaired against the same message and unchanged other facts.
func (r *Request) observeCreditEvent(event Object) {
	if r == nil || r.credit == nil {
		return
	}
	s := r.credit
	s.mu.Lock()
	defer s.mu.Unlock()
	facts := event
	if str(event, "type") == "message_start" {
		facts, _ = event["message"].(Object)
	}
	if usage, ok := facts["usage"].(Object); ok {
		if value, exists := usage["fallback_credit"]; exists {
			raw, _ := json.Marshal(value)
			copy, err := decodePlannedValue(raw)
			if err != nil {
				s.observationError = fmt.Errorf("invalid credit outcome")
				return
			}
			s.creditUsages = append(s.creditUsages, copy)
		}
	}
	switch str(event, "type") {
	case "message_start":
		message, _ := event["message"].(Object)
		id := str(message, "id")
		if s.messageID != "" && s.messageID != id {
			s.observationError = fmt.Errorf("credit response changed message identity")
		}
		s.messageID = id
	case "message_delta":
		delta, _ := event["delta"].(Object)
		if details, ok := delta["stop_details"].(Object); ok {
			if _, exists := details["fallback_credit_token"]; exists {
				raw, _ := json.Marshal(details)
				copy, err := decodeObject(raw)
				if err != nil || s.stopDetails != nil && digest(s.stopDetails) != digest(copy) {
					s.observationError = fmt.Errorf("credit response changed stop details")
					return
				}
				if s.observedAt.IsZero() {
					s.observedAt = time.Now()
				}
				s.stopDetails = copy
				s.stopReason = str(delta, "stop_reason")
			}
		}
	}
}
func (s *creditExecution) restoreStopDetails(answer Object) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.observationError != nil {
		return s.observationError
	}
	if len(s.creditUsages) > 0 {
		if s.messageID == "" || str(answer, "id") != s.messageID {
			return fmt.Errorf("credit outcome response identity changed")
		}
		if err := restoreCreditUsage(answer, s.creditUsages[len(s.creditUsages)-1]); err != nil {
			return err
		}
		index := 0
		for _, event := range s.events {
			facts := event
			if str(event, "type") == "message_start" {
				facts, _ = event["message"].(Object)
			}
			if usage, ok := facts["usage"].(Object); ok {
				if _, exists := usage["fallback_credit"]; exists {
					if index >= len(s.creditUsages) {
						return fmt.Errorf("extra credit outcome event")
					}
					if err := restoreCreditUsage(facts, s.creditUsages[index]); err != nil {
						return err
					}
					index++
				}
			}
		}
		if len(s.events) > 0 && index != len(s.creditUsages) {
			return fmt.Errorf("credit outcome event missing")
		}
	}
	if s.stopDetails == nil {
		return nil
	}
	if s.messageID == "" || str(answer, "id") != s.messageID || str(answer, "stop_reason") != s.stopReason {
		return fmt.Errorf("credit response identity changed")
	}
	if err := restoreCreditDetails(answer, s.stopDetails); err != nil {
		return err
	}
	for _, event := range s.events {
		if str(event, "type") == "message_delta" {
			delta, _ := event["delta"].(Object)
			if str(delta, "stop_reason") == s.stopReason {
				if err := restoreCreditDetails(delta, s.stopDetails); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

// Only observed main-provider credentials can end an interrupted original
// attempt. A client-supplied stop reason or token alone is not proof.
func (r *Request) verifiedCreditRefusal(message Object) bool {
	if r == nil || r.credit == nil {
		return false
	}
	s := r.credit
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.observationError != nil || s.stopReason != "refusal" || str(message, "stop_reason") != "refusal" || s.messageID == "" || str(message, "id") != s.messageID {
		return false
	}
	if _, err := credits.TokenHash(str(s.stopDetails, "fallback_credit_token")); err != nil {
		return false
	}
	copy := Object{"stop_details": message["stop_details"]}
	return restoreCreditDetails(copy, s.stopDetails) == nil
}

func (r *Request) verifiedCreditEcho() bool {
	if r == nil || r.credit == nil || r.credit.previous == nil {
		return false
	}
	hash, err := credits.Digest(r.credit.raw, r.credit.headers)
	if err != nil || hash == r.credit.previous.BaseDigest {
		return false
	}
	_, ok := r.credit.previous.Echoes[hash]
	return ok
}
func restoreCreditDetails(target Object, source Object) error {
	raw, err := json.Marshal(target["stop_details"])
	actual, decodeErr := decodeObject(raw)
	if err != nil || decodeErr != nil {
		return fmt.Errorf("credit stop details missing")
	}
	sourceView := Object{}
	actualView := Object{}
	for k, v := range source {
		if k != "fallback_credit_token" {
			sourceView[k] = v
		}
	}
	for k, v := range actual {
		if k != "fallback_credit_token" {
			actualView[k] = v
		}
	}
	if digest(sourceView) != digest(actualView) {
		return fmt.Errorf("credit stop details changed")
	}
	if token, exists := actual["fallback_credit_token"]; exists && digest(token) != digest(source["fallback_credit_token"]) {
		return fmt.Errorf("credit token changed")
	}
	actual["fallback_credit_token"] = source["fallback_credit_token"]
	target["stop_details"] = actual
	return nil
}

// Only a request authenticated by Worker and granted tracking by core enters
// this protocol. Preserve real provider accounting; core consumes this private
// failure signal before exposing any response or unregistered token publicly.
func (x *exchange) creditCustodyFailed() {
	x.w.Header().Del(credits.ReadyHeader)
	x.w.Header().Set(credits.FailureHeader, "storage")
	x.diagnostic.setField("credit_custody_failed", true)
	x.req.credit.released = true
}

type creditLocalStorageError struct{ cause error }

func (e *creditLocalStorageError) Error() string {
	return "fallback credit custody storage is unavailable"
}
func (e *creditLocalStorageError) Unwrap() error { return e.cause }

// Known CLI JSON numeric normalization may affect opaque outcome counters.
// Keep the source value only when every non-numeric field and shape agrees.
func restoreCreditUsage(target Object, source any) error {
	usage, ok := target["usage"].(Object)
	if !ok {
		return fmt.Errorf("credit outcome usage missing")
	}
	actual, exists := usage["fallback_credit"]
	if !exists || !creditUsageMatchesSource(source, actual) {
		return fmt.Errorf("credit outcome changed")
	}
	raw, _ := json.Marshal(source)
	copy, err := decodePlannedValue(raw)
	if err != nil {
		return err
	}
	usage["fallback_credit"] = copy
	return nil
}

// Compare in the provider-to-CLI direction: only a number from the trusted
// source may undergo JSON.parse/stringify normalization. A source null cannot
// become an overflowing number merely because both have the same JS view.
func creditUsageMatchesSource(source, actual any) bool {
	if digest(source) == digest(actual) {
		return true
	}
	switch source := source.(type) {
	case json.Number:
		if actual == nil {
			return jsNumberView(source) == nil
		}
		switch actual.(type) {
		case json.Number, float64:
			return digest(jsNumberView(source)) == digest(jsNumberView(actual))
		}
	case map[string]any:
		object, ok := actual.(map[string]any)
		if !ok || len(source) != len(object) {
			return false
		}
		for key, value := range source {
			candidate, exists := object[key]
			if !exists || !creditUsageMatchesSource(value, candidate) {
				return false
			}
		}
		return true
	case []any:
		array, ok := actual.([]any)
		if !ok || len(source) != len(array) {
			return false
		}
		for i, value := range source {
			if !creditUsageMatchesSource(value, array[i]) {
				return false
			}
		}
		return true
	}
	return false
}
