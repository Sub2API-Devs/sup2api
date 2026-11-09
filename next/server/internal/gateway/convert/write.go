package convert

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

// sink is the protocol half of a Writer: writerBase drives it with a
// normalized delta stream (started before any block, blocks sequential and
// stopped before the finish) and keeps the accumulated reply in m.
type sink interface {
	// start writes the opening events; m has the header and the usage
	// known so far.
	start(m *Msg) []Event
	blockStart(i int, b *Block) []Event
	// content writes a DeltaText, DeltaReasoning, DeltaArgs or
	// DeltaCitation of the open block b (already applied to b).
	content(d Delta, b *Block) []Event
	blockStop(i int, b *Block) []Event
	// finish writes the terminal events of the complete reply m.
	finish(m *Msg) []Event
	fail(e *UpstreamError) []Event
	json(m *Msg) ([]byte, error)
}

// batcher is a sink that writes one event per Write call (Gemini chunks).
type batcher interface{ flush() []Event }

// writerCaps are the block contents a client protocol can carry; the rest
// is dropped as a response loss (CONVERT-MATRIX §9.8).
type writerCaps struct {
	images, citations bool
}

// writerBase implements Writer around a sink: lifecycle, accumulation,
// header defaults and the response losses every writer shares.
type writerBase struct {
	sink    sink
	caps    writerCaps
	opts    respOpts
	b       msgBuilder
	started bool // sink.start called
	done    bool
	lost    losses
}

func (w *writerBase) init(s sink, caps writerCaps, o respOpts) {
	w.sink, w.caps, w.opts, w.b = s, caps, o, newMsgBuilder()
}

var errNoFinish = errors.New("convert: upstream stream ended before the reply finished")

func (w *writerBase) Write(ds []Delta) ([]Event, error) {
	var out []Event
	for _, d := range ds {
		if w.done {
			break
		}
		evs, err := w.write(d)
		if err != nil {
			return nil, err
		}
		out = append(out, evs...)
	}
	if bt, ok := w.sink.(batcher); ok && w.started && !w.done {
		out = append(out, bt.flush()...)
	}
	return out, nil
}

func (w *writerBase) write(d Delta) ([]Event, error) {
	switch d.Op {
	case DeltaStart, DeltaUsage:
		return nil, w.b.apply(d)
	case DeltaError:
		w.done = true
		e := d.Err
		if e == nil {
			e = &UpstreamError{Message: "upstream error"}
		}
		return w.sink.fail(e), nil
	}
	out := w.start()
	switch {
	case d.Op == DeltaBlockStart || d.Op == DeltaFinish:
		out = append(out, w.stopOpen()...)
	case d.Op == DeltaBlockStop && d.Index != w.b.open:
		return out, nil
	}
	if err := w.b.apply(d); err != nil {
		return nil, err
	}
	switch d.Op {
	case DeltaBlockStart:
		blk := &w.b.m.Blocks[d.Index]
		w.noteBlock(d.Index, blk)
		return append(out, w.sink.blockStart(d.Index, blk)...), nil
	case DeltaBlockStop:
		return append(out, w.sink.blockStop(d.Index, &w.b.m.Blocks[d.Index])...), nil
	case DeltaFinish:
		w.done = true
		w.b.m.Finish = finalFinish(&w.b.m)
		return append(out, w.sink.finish(&w.b.m)...), nil
	case DeltaReasoningState:
		w.noteState(d.Index, &w.b.m.Blocks[d.Index])
		return out, nil
	case DeltaCitation:
		if !w.caps.citations {
			w.lost.add(LossOther, w.src(d.Index, &w.b.m.Blocks[d.Index])+".annotations")
			return out, nil
		}
	}
	return append(out, w.sink.content(d, &w.b.m.Blocks[d.Index])...), nil
}

// start calls sink.start once, before the first event that needs it.
func (w *writerBase) start() []Event {
	if w.started {
		return nil
	}
	w.started = true
	w.header(&w.b.m)
	return w.sink.start(&w.b.m)
}

// stopOpen stops the open block, for readers that did not.
func (w *writerBase) stopOpen() []Event {
	i := w.b.open
	if i < 0 {
		return nil
	}
	w.b.open = -1
	return w.sink.blockStop(i, &w.b.m.Blocks[i])
}

func (w *writerBase) End() ([]Event, error) {
	if !w.done {
		return nil, errNoFinish
	}
	return nil, nil
}

func (w *writerBase) JSON(m *Msg) ([]byte, error) {
	if m == nil {
		return nil, errors.New("convert: no reply")
	}
	c := *m
	w.header(&c)
	c.Finish = finalFinish(&c)
	for i := range c.Blocks {
		b := &c.Blocks[i]
		w.noteBlock(i, b)
		if b.HasState {
			w.noteState(i, b)
		}
		if len(b.Annotations) > 0 && !w.caps.citations {
			w.lost.add(LossOther, w.src(i, b)+".annotations")
		}
	}
	return w.sink.json(&c)
}

func (w *writerBase) Losses() []Loss { return w.lost.sorted() }

// header fills what the upstream reply left out: the client model, the
// current time and a generated id.
func (w *writerBase) header(m *Msg) {
	if m.Model == "" {
		m.Model = w.opts.model
	}
	if m.Created == 0 {
		m.Created = time.Now().Unix()
	}
	if m.ID == "" {
		var b [16]byte
		_, _ = rand.Read(b[:])
		m.ID = hex.EncodeToString(b[:])
	}
}

// noteBlock records the loss of a block the client protocol cannot carry.
func (w *writerBase) noteBlock(i int, b *Block) {
	switch {
	case b.Kind == BlockOpaque:
		w.lost.add(LossTool, w.src(i, b))
	case b.Kind == BlockImage && !w.caps.images:
		w.lost.add(LossImage, w.src(i, b))
	}
}

// noteState records the reasoning state that never crosses protocols.
func (w *writerBase) noteState(i int, b *Block) { w.lost.add(LossReasoning, w.src(i, b)) }

func (w *writerBase) src(i int, b *Block) string {
	if b.Src == "" {
		return fmt.Sprintf("response.blocks[%d]", i)
	}
	return "response." + b.Src
}

// finalFinish is the finish a client sees: a natural stop after tool calls
// is a tool-use stop (CONVERT-MATRIX §9.5).
func finalFinish(m *Msg) Finish {
	f := m.Finish
	if f.Reason == FinishStop && hasToolCall(m.Blocks) {
		f.Reason = FinishToolUse
	}
	return f
}

func hasToolCall(bs []Block) bool {
	for _, b := range bs {
		if b.Kind == BlockToolCall {
			return true
		}
	}
	return false
}

// toolObject returns the arguments of a tool call as a JSON object, a
// custom tool's input wrapped as {"input": ...}; false when function
// arguments are not a JSON object (the caller writes {} and a tool loss).
func toolObject(b *Block) (json.RawMessage, bool) {
	if b.ToolKind == ToolCustom {
		raw, _ := json.Marshal(map[string]string{"input": b.Args})
		return raw, true
	}
	var obj map[string]json.RawMessage
	if b.Args == "" {
		return json.RawMessage("{}"), true
	}
	if json.Unmarshal([]byte(b.Args), &obj) != nil || obj == nil {
		return json.RawMessage("{}"), false
	}
	return json.RawMessage(compactJSON(json.RawMessage(b.Args))), true
}

// event marshals v as the data of an event named name.
func jsonEvent(name string, v any) Event {
	data, err := json.Marshal(v)
	if err != nil {
		data = []byte(`{}`)
	}
	return Event{Name: name, Data: data}
}

// errorKinds names an HTTP status in Anthropic error types and Gemini
// statuses, for upstream errors that came from another protocol.
var errorKinds = map[int][2]string{
	400: {"invalid_request_error", "INVALID_ARGUMENT"}, 401: {"authentication_error", "UNAUTHENTICATED"},
	403: {"permission_error", "PERMISSION_DENIED"}, 404: {"not_found_error", "NOT_FOUND"},
	429: {"rate_limit_error", "RESOURCE_EXHAUSTED"}, 500: {"api_error", "INTERNAL"},
	503: {"overloaded_error", "UNAVAILABLE"}, 529: {"overloaded_error", "UNAVAILABLE"},
}

// errorKind returns errorKinds[status][which], or def.
func errorKind(status, which int, def string) string {
	if k, ok := errorKinds[status]; ok {
		return k[which]
	}
	return def
}
