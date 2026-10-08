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
	positionEvidence                  map[int][]any
	payloadVersion                    int
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
	selected := envelope.EffectivePayloadVersion()
	x := &helperHistoryExecution{payloadVersion: selected, public: source["messages"], tools: source["tools"], imported: helperhistory.Payload{Version: selected}, delta: helperhistory.Payload{Version: selected}}
	if len(x.tools) == 0 {
		x.tools = json.RawMessage(`[]`)
	}
	for _, raw := range envelope.History {
		var payload helperhistory.Payload
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, err
		}
		if selected == helperhistory.PayloadVersion2 && payload.Version == helperhistory.PayloadVersion1 {
			for i := range payload.Segments {
				payload.Segments[i].Kind = helperhistory.SegmentWholeRound
			}
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
	if r.CountTokens || r.resources != nil || r.credit != nil || r.MCP != nil || r.structuredOutput() || r.hasContextControls() || r.hasCompactionHistory() || r.continuation != "" {
		return fmt.Errorf("helper history requires an ordinary client-tool conversation without resource, credit, MCP or continuation controls")
	}
	if r.InlineTools != nil && x.payloadVersion != helperhistory.PayloadVersion2 {
		return fmt.Errorf("helper inline history requires negotiated positional payload version 2")
	}
	if err := r.validateHelperInline(); err != nil {
		return err
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
	positions := map[int][]any{}
	if x.payloadVersion == helperhistory.PayloadVersion2 {
		var err error
		positions, err = helperInterleavedSystems(messages, boundaries)
		if err != nil {
			return err
		}
		for _, segment := range x.imported.Segments {
			// These systems are checked exactly by replay below, not captured twice.
			first, err := decodeObject(segment.Messages[0])
			if err != nil {
				return err
			}
			if str(first, "role") == "system" {
				delete(positions, segment.AfterMessage)
			}
		}
	}
	suffix := messages[boundaries[len(boundaries)-1]+1:]
	systems, pairs, err := splitHelperSystems(suffix)
	if err != nil {
		return err
	}
	if !x.systemObserved {
		if len(pairs) > 0 && (len(systems) > 0 || len(positions) > 0) {
			return fmt.Errorf("helper system has no prior attributed request evidence")
		}
		x.positionEvidence = make(map[int][]any, len(positions))
		for at, objects := range positions {
			x.positionEvidence[at] = cloneHelperMessages(objects)
		}
		x.systemEvidence = cloneHelperMessages(systems)
		x.systemObserved = true
	}
	if !sameHelperSystemPositions(x.positionEvidence, positions) {
		return fmt.Errorf("helper system changed its public position")
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
		x.delta.Segments = nil
		for after := range boundaries {
			if objects := positions[after]; len(objects) > 0 {
				pos, err := helperSystemSegment(x.public, x.tools, after, objects)
				if err != nil {
					return err
				}
				x.delta.Segments = append(x.delta.Segments, pos)
			}
		}
		if x.payloadVersion == helperhistory.PayloadVersion2 {
			segment.Kind = helperhistory.SegmentWholeRound
		}
		x.delta.Segments = append(x.delta.Segments, segment)
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
