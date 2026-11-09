package convert

import "encoding/json"

// The response side of a conversion goes through one internal
// representation (IR, CONVERT-MATRIX §3): a Reader per upstream protocol
// turns upstream replies into IR, a Writer per client protocol turns IR into
// client replies. Request conversions are written per pair and do not use
// the IR.

// Msg is one complete model reply.
type Msg struct {
	ID, Model string
	Created   int64 // Unix seconds, 0 when unknown
	Blocks    []Block
	Finish    Finish
	Usage     Usage
}

// BlockKind is the kind of a reply Block.
type BlockKind uint8

const (
	BlockText      BlockKind = iota // assistant text
	BlockReasoning                  // reasoning text (summary or full)
	BlockToolCall                   // a function or custom tool call
	BlockRefusal                    // a refusal message
	BlockImage                      // an output image (base64)
	BlockOpaque                     // anything else, e.g. a server tool block
)

// Tool kinds of a BlockToolCall.
const (
	ToolFunction = "function" // Args is JSON
	ToolCustom   = "custom"   // Args is the free-form input
)

// Block is one content block of a reply. Only the fields of its Kind are
// set.
type Block struct {
	Kind BlockKind
	// Text is the text of a BlockText, BlockReasoning or BlockRefusal.
	Text string
	// HasState marks a BlockReasoning whose upstream carried a signature or
	// encrypted reasoning. The state never crosses protocols; a writer
	// records a reasoning loss for it.
	HasState bool
	// ToolID, ToolName, ToolKind (ToolFunction or ToolCustom) and Args
	// describe a BlockToolCall.
	ToolID   string
	ToolName string
	ToolKind string
	Args     string
	// Annotations are the url citations of a BlockText.
	Annotations []Citation
	// MIME and Data (base64) hold a BlockImage.
	MIME, Data string
	// Raw is a BlockOpaque as the upstream sent it; a writer drops it and
	// records the loss.
	Raw json.RawMessage
}

// Citation is a url citation in one shape for all protocols. Start and End
// are character offsets into the block text, both 0 when the upstream gives
// none.
type Citation struct {
	URL, Title string
	Start, End int
}

// FinishReason is why the model stopped (CONVERT-MATRIX §9.5).
type FinishReason uint8

const (
	FinishStop    FinishReason = iota // natural end or stop sequence
	FinishToolUse                     // stopped to call tools
	FinishLength                      // output or context limit
	FinishFilter                      // content filter or refusal
	FinishPause                       // Anthropic pause_turn
	FinishError                       // the upstream failed the reply
)

// Finish is the end of a reply. Raw is the upstream's own reason;
// StopSequence is the matched stop sequence, if any.
type Finish struct {
	Reason       FinishReason
	Raw          string
	StopSequence string
}

// Usage is the token usage of a reply, in OpenAI terms: Input includes the
// cached tokens and Output the reasoning tokens. Set reports whether the
// upstream gave any.
type Usage struct {
	Set                                   bool
	Input                                 int64
	CacheRead, CacheWrite5m, CacheWrite1h int64
	Output                                int64
	Reasoning                             int64
}

// DeltaOp is the kind of a stream Delta.
type DeltaOp uint8

const (
	DeltaStart          DeltaOp = iota // reply started: Start
	DeltaBlockStart                    // block Index started: Block
	DeltaText                          // text appended to block Index
	DeltaReasoning                     // reasoning text appended to block Index
	DeltaReasoningState                // block Index carries reasoning state (no content)
	DeltaArgs                          // tool arguments appended to block Index
	DeltaCitation                      // citation added to block Index: Cite
	DeltaBlockStop                     // block Index ended
	DeltaUsage                         // cumulative usage so far: Usage
	DeltaFinish                        // reply ended: Finish
	DeltaError                         // upstream failed: Err
)

// Delta is one step of a streamed reply.
type Delta struct {
	Op DeltaOp
	// Index numbers blocks from 0 in order of appearance.
	Index int
	// Block of a DeltaBlockStart: Kind, and ToolID, ToolName and ToolKind
	// for a tool call.
	Block *Block
	// Text is the increment of a DeltaText, DeltaReasoning or DeltaArgs.
	Text string
	Cite *Citation
	// Usage is cumulative; a later value replaces an earlier one.
	Usage  *Usage
	Finish *Finish
	Err    *UpstreamError
	// Start of a DeltaStart: ID, Model and Created.
	Start *Msg
}

// UpstreamError is an error the upstream reported in place of or within a
// reply.
type UpstreamError struct {
	Status  int // HTTP status or the protocol's error code, 0 when unknown
	Type    string
	Message string
}

// Reader turns one upstream protocol into IR. A reader emits DeltaUsage as
// soon as usage is known and DeltaFinish only at the protocol's end point
// (CONVERT-MATRIX §3.1). One Reader serves one stream or one JSON body.
type Reader interface {
	// Event converts one upstream SSE event. ev.Data is only valid during
	// the call.
	Event(ev Event) ([]Delta, error)
	// End is called once when the upstream stream ended.
	End() ([]Delta, error)
	// JSON converts a complete non-stream upstream body.
	JSON(body []byte) (*Msg, error)
}

// Writer turns IR into one client protocol. It writes the terminal event at
// DeltaFinish and drops later deltas; End without a prior DeltaFinish is a
// conversion failure (the client sees a truncated stream). DeltaError is
// written as the client protocol's error event and ends the stream. One
// Writer serves one stream or one JSON body.
type Writer interface {
	Write(ds []Delta) ([]Event, error)
	End() ([]Event, error)
	JSON(m *Msg) ([]byte, error)
	// Losses lists the response losses (paths starting with "response.").
	Losses() []Loss
}
