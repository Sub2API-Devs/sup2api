package convert

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
)

// requestFunc converts a client request body of one pair to the upstream
// protocol, recording losses in l, and returns what the response side needs.
// A request that cannot be expressed fails with RequestError.
type requestFunc func(body []byte, opt Options, l *losses) ([]byte, respOpts, error)

// respOpts is what the response side of a pair needs from the request. The
// request function returns it, Prepare binds it, and the reader and writer
// get it.
type respOpts struct {
	// model is the client model, echoed when the upstream reply lacks one
	// (Prepare fills it from Options.Model when the request function did
	// not).
	model string
	// includeUsage: a chat client asked for stream_options.include_usage.
	includeUsage bool
	// legacyFunctions: a chat client used functions/function_call, so the
	// reply carries message.function_call instead of tool_calls.
	legacyFunctions bool
	// customTools names the client's custom (free-form) tools that went
	// upstream wrapped as functions taking {"input": string}; their calls
	// are unwrapped before the writer sees them.
	customTools map[string]bool
}

// readers and writers are the IR reader of each upstream protocol and the
// IR writer of each client protocol.
var (
	readers = map[string]func(respOpts) Reader{
		"openai.chat": newChatReader, "openai.responses": newResponsesReader, "anthropic.messages": newAnthropicReader,
		"gemini.generate": newGeminiReader, "gemini.stream_generate": newGeminiReader,
	}
	writers = map[string]func(respOpts) Writer{
		"openai.chat": newChatWriter, "openai.responses": newResponsesWriter, "anthropic.messages": newAnthropicWriter,
		"gemini.generate": newGeminiWriter, "gemini.stream_generate": newGeminiWriter,
	}
)

// readerFor returns the IR reader of an upstream protocol, nil when none.
func readerFor(protocol string) func(respOpts) Reader { return readers[protocol] }

// writerFor returns the IR writer of a client protocol, nil when none.
func writerFor(protocol string) func(respOpts) Writer { return writers[protocol] }

var errUnbound = errors.New("convert: response requires a prepared request")

// pairConverter is a Converter declared by its request function alone: the
// response side chains the upstream protocol's Reader into the client
// protocol's Writer (CONVERT-MATRIX §3.1).
type pairConverter struct {
	from, to string
	grade    Grade
	req      requestFunc
	reader   func(respOpts) Reader
	writer   func(respOpts) Writer

	// Set on the bound converter returned by Prepare.
	bound    bool
	opts     respOpts
	reqLost  []Loss
	mu       sync.Mutex
	respLost []Loss // of the latest response or stream
}

// newPair declares the pair from -> to served by req, with the reader of
// to and the writer of from.
func newPair(from, to string, grade Grade, req requestFunc) *pairConverter {
	return &pairConverter{from: from, to: to, grade: grade, req: req, reader: readerFor(to), writer: writerFor(from)}
}

func (p *pairConverter) From() string { return p.from }
func (p *pairConverter) To() string   { return p.to }
func (p *pairConverter) Grade() Grade { return p.grade }

// Prepare runs req and returns a copy bound to its respOpts and losses.
func (p *pairConverter) Prepare(body []byte, opt Options) (Converter, []byte, error) {
	if p.req == nil || p.reader == nil || p.writer == nil {
		return nil, nil, fmt.Errorf("convert: pair %s -> %s has no request, reader or writer", p.from, p.to)
	}
	var l losses
	out, ro, err := p.req(body, opt, &l)
	if err != nil {
		return nil, nil, err
	}
	if ro.model == "" {
		ro.model = opt.Model
	}
	return &pairConverter{from: p.from, to: p.to, grade: p.grade, req: p.req, reader: p.reader, writer: p.writer,
		bound: true, opts: ro, reqLost: l.sorted()}, out, nil
}

// Response chains reader.JSON into writer.JSON.
func (p *pairConverter) Response(body []byte) ([]byte, error) {
	if !p.bound {
		return nil, errUnbound
	}
	r, w := p.reader(p.opts), p.writer(p.opts)
	m, err := r.JSON(body)
	if err != nil {
		return nil, err
	}
	unwrapCustom(m, p.opts.customTools)
	out, err := w.JSON(m)
	p.setRespLosses(r, w)
	return out, err
}

// NewStream chains a new reader into a new writer.
func (p *pairConverter) NewStream() StreamConverter {
	if !p.bound {
		return &pairStream{p: p}
	}
	return &pairStream{p: p, r: p.reader(p.opts), w: p.writer(p.opts),
		custom: customStream{tools: p.opts.customTools, buf: map[int]*strings.Builder{}}}
}

// Losses implements LossReporter: the request losses, then those of the
// latest response or stream.
func (p *pairConverter) Losses() []Loss {
	p.mu.Lock()
	defer p.mu.Unlock()
	if len(p.reqLost)+len(p.respLost) == 0 {
		return nil
	}
	l := losses{list: append(append([]Loss(nil), p.reqLost...), p.respLost...)}
	return l.sorted()
}

// setRespLosses records the response losses of a reader and writer.
func (p *pairConverter) setRespLosses(r Reader, w Writer) {
	var list []Loss
	if lr, ok := r.(LossReporter); ok {
		list = lr.Losses()
	}
	list = append(list, w.Losses()...)
	p.mu.Lock()
	p.respLost = list
	p.mu.Unlock()
}

// pairStream feeds upstream events through a Reader into a Writer.
type pairStream struct {
	p      *pairConverter
	r      Reader
	w      Writer
	custom customStream
}

func (s *pairStream) Event(ev Event) ([]Event, error) {
	if !s.p.bound {
		return nil, errUnbound
	}
	ds, err := s.r.Event(ev)
	if err != nil {
		return nil, err
	}
	return s.w.Write(s.custom.apply(ds))
}

func (s *pairStream) Flush() ([]Event, error) {
	if !s.p.bound {
		return nil, errUnbound
	}
	defer s.p.setRespLosses(s.r, s.w)
	ds, err := s.r.End()
	if err != nil {
		return nil, err
	}
	out, err := s.w.Write(s.custom.apply(ds))
	if err != nil {
		return nil, err
	}
	end, err := s.w.End()
	return append(out, end...), err
}

// customInput returns the input of a custom tool call that went upstream
// as a function taking {"input": string}; other arguments stay as they are.
func customInput(args string) string {
	var v struct {
		Input *string `json:"input"`
	}
	if json.Unmarshal([]byte(args), &v) != nil || v.Input == nil {
		return args
	}
	return *v.Input
}

// isWrappedCustom reports whether b is a call of one of the custom tools.
func isWrappedCustom(b *Block, tools map[string]bool) bool {
	return b.Kind == BlockToolCall && b.ToolKind == ToolFunction && tools[b.ToolName]
}

// unwrapCustom turns the wrapped calls of the client's custom tools in m
// back into custom calls.
func unwrapCustom(m *Msg, tools map[string]bool) {
	for i := range m.Blocks {
		if b := &m.Blocks[i]; isWrappedCustom(b, tools) {
			b.ToolKind, b.Args = ToolCustom, customInput(b.Args)
		}
	}
}

// customStream does what unwrapCustom does on a stream: the arguments of a
// wrapped call are held until its block stops.
type customStream struct {
	tools map[string]bool
	buf   map[int]*strings.Builder
}

func (c *customStream) apply(ds []Delta) []Delta {
	if len(c.tools) == 0 {
		return ds
	}
	out := make([]Delta, 0, len(ds))
	for _, d := range ds {
		sb, held := c.buf[d.Index]
		switch {
		case d.Op == DeltaBlockStart && isWrappedCustom(d.Block, c.tools):
			b := *d.Block
			b.ToolKind = ToolCustom
			d.Block = &b
			c.buf[d.Index] = &strings.Builder{}
		case d.Op == DeltaArgs && held:
			sb.WriteString(d.Text)
			continue
		case d.Op == DeltaBlockStop && held:
			delete(c.buf, d.Index)
			if in := customInput(sb.String()); in != "" {
				out = append(out, Delta{Op: DeltaArgs, Index: d.Index, Text: in})
			}
		}
		out = append(out, d)
	}
	return out
}
