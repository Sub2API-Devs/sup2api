package engine

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

type helperHistoryExecution struct {
	mu                                sync.Mutex
	public, tools                     json.RawMessage
	imported                          helperhistory.Payload
	delta                             helperhistory.Payload
	namespace                         string
	authenticated                     bool
	systemEvidence                    []any
	systemObserved                    bool
	err                               error
	providerAccounting                []*helperAccounting
	accountingBytes, accountingFrames int
	accountingLimited                 bool
}

func newHelperHistoryExecution(envelope helperhistory.RequestEnvelope) (*helperHistoryExecution, error) {
	if err := envelope.Validate(); err != nil {
		return nil, err
	}
	var source map[string]json.RawMessage
	if err := json.Unmarshal(envelope.Request, &source); err != nil {
		return nil, err
	}
	x := &helperHistoryExecution{public: source["messages"], tools: source["tools"], imported: helperhistory.Payload{Version: helperhistory.Version}, delta: helperhistory.Payload{Version: helperhistory.Version}}
	if len(x.tools) == 0 {
		x.tools = json.RawMessage(`[]`)
	}
	for _, raw := range envelope.History {
		var payload helperhistory.Payload
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, err
		}
		x.imported.Segments = append(x.imported.Segments, payload.Segments...)
	}
	raw, err := json.Marshal(x.imported)
	if err != nil {
		return nil, err
	}
	if err = helperhistory.Validate(raw); err != nil {
		return nil, err
	}
	chain, err := helperhistory.CanonicalDigest(raw)
	if err != nil {
		return nil, err
	}
	x.namespace = digest([]string{"helper-history-v1", envelope.Namespace, envelope.Identity.PrincipalID, envelope.Identity.Generation, chain})
	return x, nil
}

func (r *Request) admitHelperHistory(x *helperHistoryExecution) error {
	if x == nil {
		return nil
	}
	if r.CountTokens || r.resources != nil || r.credit != nil || r.MCP != nil || r.InlineTools != nil || r.structuredOutput() || r.hasContextControls() || r.hasCompactionHistory() || r.continuation != "" {
		return fmt.Errorf("helper history requires an ordinary client-tool conversation without resource, credit, MCP, inline or continuation controls")
	}
	if _, err := r.replayHelperHistory(x.public, x.tools, x.imported); err != nil {
		return err
	}
	var public []json.RawMessage
	if err := json.Unmarshal(x.public, &public); err != nil || len(public) != len(r.Messages) {
		return fmt.Errorf("helper public message normalization changed its boundary")
	}
	r.helperHistory = x
	return nil
}

// Runs after ordinary client/cache restoration, before final serialization.
// The CLI sees its own native transcript; only the authenticated provider view
// receives earlier whole hidden rounds, at verified public boundaries.
func (r *Request) applyHelperHistory(body Object) error {
	x := r.helperHistory
	if x == nil {
		return nil
	}
	x.mu.Lock()
	defer x.mu.Unlock()
	if x.err != nil {
		return x.err
	}
	var boundaries []int
	if _, err := alignClientHistory(r, body, &boundaries); err != nil {
		return err
	}
	messages, ok := body["messages"].([]any)
	if !ok || len(messages) < len(r.Messages) {
		return fmt.Errorf("helper public history is incomplete")
	}
	if len(boundaries) != len(r.Messages) || len(boundaries) == 0 {
		return fmt.Errorf("helper public message boundary changed")
	}
	suffix := messages[boundaries[len(boundaries)-1]+1:]
	systems, pairs, err := splitHelperSystems(suffix)
	if err != nil {
		return err
	}
	if !x.systemObserved {
		if len(pairs) > 0 && len(systems) > 0 {
			return fmt.Errorf("helper system has no prior attributed request evidence")
		}
		x.systemEvidence = cloneHelperMessages(systems)
		x.systemObserved = true
	}
	if !helperSystemsMatchSource(x.systemEvidence, systems) {
		return fmt.Errorf("helper system changed at its public boundary")
	}
	if len(pairs) > 0 {
		segment, err := r.captureHelperHistory(x.public, x.tools, len(r.Messages)-1, suffix)
		if err != nil {
			x.err = err
			return err
		}
		x.delta.Segments = []helperhistory.Segment{segment}
	}
	insertions := make(map[int][]any)
	skipped := make(map[int]bool)
	publicIndices := make(map[int]bool)
	for _, index := range boundaries {
		publicIndices[index] = true
	}
	for _, s := range x.imported.Segments {
		var segmentMessages []any
		for _, raw := range s.Messages {
			message, err := decodeObject(raw)
			if err != nil {
				return err
			}
			segmentMessages = append(segmentMessages, message)
		}

		index := boundaries[s.AfterMessage]
		leading, _, err := splitHelperSystems(segmentMessages)
		if err != nil {
			return err
		}
		if err := matchReplayedHelperSystems(messages, publicIndices, skipped, index+1, leading); err != nil {
			return err
		}
		insertions[index] = append(insertions[index], segmentMessages...)
	}
	var restored []any
	for i, message := range messages {
		if skipped[i] {
			continue
		}
		restored = append(restored, message)
		restored = append(restored, insertions[i]...)
	}
	body["messages"] = restored
	return nil
}

func (x *helperHistoryExecution) exportDelta() (json.RawMessage, error) {
	x.mu.Lock()
	defer x.mu.Unlock()
	if x.err != nil {
		return nil, x.err
	}
	raw, err := json.Marshal(x.delta)
	if err != nil {
		return nil, err
	}
	return raw, helperhistory.Validate(raw)
}
