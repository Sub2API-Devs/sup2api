package convert

import "errors"

// TODO(convert-matrix T2): skeleton of the generic pair converter
// (CONVERT-MATRIX §3.1). Nothing declares or registers a pair yet; T2
// implements Prepare, Response and NewStream and the reader and writer
// tables.

var errPairNotImplemented = errors.New("convert: pair converter not implemented")

// requestFunc converts a client request body of one pair to the upstream
// protocol, recording losses in l, and returns what the response side needs.
// A request that cannot be expressed fails with RequestError.
type requestFunc func(body []byte, opt Options, l *losses) ([]byte, respOpts, error)

// respOpts is what the response side of a pair needs from the request. The
// request function returns it, Prepare binds it, and the reader and writer
// get it.
type respOpts struct {
	// model is the client model, echoed when the upstream reply lacks one.
	model string
	// includeUsage: a chat client asked for stream_options.include_usage.
	includeUsage bool
	// legacyFunctions: a chat client used functions/function_call, so the
	// reply carries message.function_call instead of tool_calls.
	legacyFunctions bool
	// customTools names the client's custom (free-form) tools that went
	// upstream wrapped as functions taking {"input": string}.
	customTools map[string]bool
}

// pairConverter is a Converter declared by its request function alone: the
// response side chains the upstream protocol's Reader into the client
// protocol's Writer.
type pairConverter struct {
	from, to string
	grade    Grade
	req      requestFunc
	reader   func(respOpts) Reader
	writer   func(respOpts) Writer

	// Set on the bound converter returned by Prepare.
	opts respOpts
	lost *losses // request losses, then response losses
}

// newPair declares the pair from -> to served by req, with the reader of
// to and the writer of from.
func newPair(from, to string, grade Grade, req requestFunc) *pairConverter {
	return &pairConverter{from: from, to: to, grade: grade, req: req, reader: readerFor(to), writer: writerFor(from)}
}

// readerFor returns the IR reader of an upstream protocol, nil when none.
func readerFor(protocol string) func(respOpts) Reader { return nil }

// writerFor returns the IR writer of a client protocol, nil when none.
func writerFor(protocol string) func(respOpts) Writer { return nil }

func (p *pairConverter) From() string { return p.from }
func (p *pairConverter) To() string   { return p.to }
func (p *pairConverter) Grade() Grade { return p.grade }

// Prepare runs req and returns a copy bound to its respOpts and losses.
func (p *pairConverter) Prepare(body []byte, opt Options) (Converter, []byte, error) {
	return nil, nil, errPairNotImplemented
}

// Response chains reader.JSON into writer.JSON.
func (p *pairConverter) Response(body []byte) ([]byte, error) {
	return nil, errPairNotImplemented
}

// NewStream chains a new reader into a new writer.
func (p *pairConverter) NewStream() StreamConverter { return pairStream{} }

// Losses implements LossReporter.
func (p *pairConverter) Losses() []Loss {
	if p.lost == nil {
		return nil
	}
	return p.lost.sorted()
}

// pairStream feeds upstream events through a Reader into a Writer.
type pairStream struct{}

func (pairStream) Event(Event) ([]Event, error) { return nil, errPairNotImplemented }
func (pairStream) Flush() ([]Event, error)      { return nil, errPairNotImplemented }
