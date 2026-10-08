package engine

import (
	"bytes"
	"encoding/json"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

// Reads actual public output after internal-round usage aggregation. It never
// substitutes CLI text estimates or a fabricated zero for unknown accounting.
type helperAccounting struct {
	evidence helperhistory.AccountingEvidence
	line     []byte
	discard  bool
	bytes    int
	limited  bool
}

func (a *helperAccounting) observe(contentType string, p []byte) {
	a.evidence.Source = helperhistory.AccountingPublic
	a.evidence.SSE = strings.HasPrefix(contentType, "text/event-stream")
	if !a.evidence.SSE {
		// The normal JSON writer emits one complete encoded public object.
		if json.Valid(p) {
			a.capture(p, false)
			a.evidence.Complete = a.evidence.Known && !a.limited
		}
		return
	}
	for len(p) > 0 {
		i := bytes.IndexByte(p, '\n')
		end := len(p)
		if i >= 0 {
			end = i
		}
		if !a.discard {
			if end > helperhistory.MaxAccountingBytes-len(a.line) {
				a.discard = true
				a.limited = true
				a.evidence.Complete = false
				a.line = nil
			} else {
				a.line = append(a.line, p[:end]...)
			}
		}
		if i < 0 {
			return
		}
		if !a.discard && bytes.HasPrefix(a.line, []byte("data:")) {
			a.capture(bytes.TrimSpace(a.line[5:]), true)
		}
		a.line = nil
		a.discard = false
		p = p[i+1:]
	}
}

func (x *helperHistoryExecution) observeProviderAccounting(call **helperAccounting, raw []byte) {
	x.mu.Lock()
	defer x.mu.Unlock()
	if *call == nil {
		if len(x.providerAccounting) >= 128 {
			x.accountingLimited = true
			return
		}
		*call = &helperAccounting{}
		x.providerAccounting = append(x.providerAccounting, *call)
	}
	a := *call
	beforeBytes, beforeFrames := a.bytes, len(a.evidence.Frames)
	a.capture(raw, true)
	if a.bytes-beforeBytes > helperhistory.MaxAccountingBytes-x.accountingBytes || len(a.evidence.Frames)-beforeFrames > 128-x.accountingFrames {
		a.evidence.Frames = a.evidence.Frames[:beforeFrames]
		a.bytes = beforeBytes
		a.evidence.Known = beforeFrames > 0
		a.evidence.Complete = false
		a.limited = true
		x.accountingLimited = true
		return
	}
	x.accountingBytes += a.bytes - beforeBytes
	x.accountingFrames += len(a.evidence.Frames) - beforeFrames
}

func (x *helperHistoryExecution) failureAccounting(public helperhistory.AccountingEvidence) *helperhistory.AccountingEvidence {
	public.Source = helperhistory.AccountingPublic
	if public.Known && public.Complete {
		return &public
	}
	x.mu.Lock()
	defer x.mu.Unlock()
	// A failed exchange cannot certify complete accounting for all generation,
	// even when the preceding successful hidden call has a real message_stop.
	provider := helperhistory.AccountingEvidence{Source: helperhistory.AccountingProviderCalls}
	for _, a := range x.providerAccounting {
		if len(a.evidence.Frames) == 0 {
			continue
		}
		frames := make([]json.RawMessage, len(a.evidence.Frames))
		for i, raw := range a.evidence.Frames {
			frames[i] = append(json.RawMessage(nil), raw...)
		}
		provider.Calls = append(provider.Calls, helperhistory.AccountingCall{SSE: true, Complete: a.evidence.Complete && !a.limited, Frames: frames})
	}
	provider.Known = len(provider.Calls) > 0
	if provider.Known {
		return &provider
	}
	public.Complete = false
	return &public
}
func (a *helperAccounting) capture(raw []byte, sse bool) {
	var event map[string]json.RawMessage
	if json.Unmarshal(raw, &event) != nil {
		return
	}
	var kind string
	_ = json.Unmarshal(event["type"], &kind)
	if sse && kind == "message_stop" {
		a.evidence.Complete = a.evidence.Known && !a.limited
		return
	}
	projection := map[string]json.RawMessage{}
	if sse && kind == "message_start" {
		var message map[string]json.RawMessage
		if json.Unmarshal(event["message"], &message) != nil || !helperUsageFacts(message["usage"]) {
			return
		}
		m := map[string]json.RawMessage{"usage": message["usage"]}
		if model := message["model"]; len(model) > 0 {
			m["model"] = model
		}
		projection["message"], _ = json.Marshal(m)
		projection["type"] = event["type"]
	} else {
		if sse && kind != "message_delta" || !helperUsageFacts(event["usage"]) {
			return
		}
		projection["usage"] = event["usage"]
		if model := event["model"]; len(model) > 0 {
			projection["model"] = model
		}
		if sse {
			projection["type"] = event["type"]
		}
	}
	frame, err := json.Marshal(projection)
	if err != nil {
		return
	}
	if len(a.evidence.Frames) >= 128 || len(frame) > helperhistory.MaxAccountingBytes-a.bytes {
		a.limited = true
		a.evidence.Complete = false
		return
	}
	a.bytes += len(frame)
	a.evidence.Frames = append(a.evidence.Frames, frame)
	a.evidence.Known = true
}

func helperUsageFacts(raw json.RawMessage) bool {
	var facts map[string]json.RawMessage
	return json.Unmarshal(raw, &facts) == nil && len(facts) > 0
}
