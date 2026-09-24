// Package convert holds the core's built-in protocol converters
// (ARCHITECTURE 6.6). A converter lets a client endpoint speaking protocol P
// be served by an account type whose upstream speaks protocol Q: the gateway
// converts the request body P→Q before the account type's plugin builds the
// upstream request, and converts the upstream response (JSON or SSE) Q→P on
// the way back. Conversion never goes through a plugin.
//
// No concrete protocol pair ships yet; pairs are added (see builtins) when an
// account type with a matching upstream appears.
package convert

import (
	"bytes"
	"errors"
	"fmt"
	"sort"
	"sync"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Event is one server-sent event. Name is the "event:" field ("" when the
// event had none); Data is the joined "data:" lines without the trailing
// newline.
type Event struct {
	Name string
	Data []byte
}

// Converter converts between a client protocol (From) and an upstream
// protocol (To). Implementations must be safe for concurrent use; per-stream
// state lives in the StreamConverter returned by NewStream.
type Converter interface {
	// From is the client endpoint protocol, e.g. "anthropic.messages".
	From() string
	// To is the upstream protocol, e.g. "openai.chat".
	To() string
	// Request converts a client request body (From) to an upstream request
	// body (To).
	Request(body []byte) ([]byte, error)
	// Response converts a complete non-stream upstream response body (To)
	// to the client format (From).
	Response(body []byte) ([]byte, error)
	// NewStream starts converting one upstream event stream.
	NewStream() StreamConverter
}

// StreamConverter converts one upstream SSE stream event by event. It may
// emit zero or more client events per upstream event and hold state between
// events (e.g. to synthesize start/stop events).
type StreamConverter interface {
	// Event converts one upstream event. ev.Data is only valid during the
	// call; copy it to keep it.
	Event(ev Event) ([]Event, error)
	// Flush is called once when the upstream stream ended (normally or
	// not) and returns any trailing client events.
	Flush() ([]Event, error)
}

type pair struct{ from, to string }

// Registry holds converters keyed by (client protocol, upstream protocol).
// The zero value and a nil *Registry are empty registries. Registry
// implements core.ProtocolConverters.
type Registry struct {
	mu sync.RWMutex
	m  map[pair]Converter
}

var _ core.ProtocolConverters = (*Registry)(nil)

// ErrDuplicate is returned when a pair is registered twice.
var ErrDuplicate = errors.New("convert: converter already registered")

// NewRegistry returns a registry holding cs. It panics on invalid or
// duplicate converters (a programming error).
func NewRegistry(cs ...Converter) *Registry {
	r := &Registry{}
	for _, c := range cs {
		if err := r.Register(c); err != nil {
			panic(err)
		}
	}
	return r
}

// builtins are the core's built-in converters. Empty for now: no account
// type needs conversion yet (ARCHITECTURE 6.6).
var builtins []func() Converter

// Default returns a new registry with the built-in converters.
func Default() *Registry {
	r := &Registry{}
	for _, mk := range builtins {
		if err := r.Register(mk()); err != nil {
			panic(err)
		}
	}
	return r
}

// Register adds c. From and To must be non-empty and different.
func (r *Registry) Register(c Converter) error {
	if c == nil {
		return errors.New("convert: nil converter")
	}
	from, to := c.From(), c.To()
	if from == "" || to == "" || from == to {
		return fmt.Errorf("convert: invalid converter %q -> %q", from, to)
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.m == nil {
		r.m = map[pair]Converter{}
	}
	k := pair{from, to}
	if _, ok := r.m[k]; ok {
		return fmt.Errorf("%w: %s -> %s", ErrDuplicate, from, to)
	}
	r.m[k] = c
	return nil
}

// Lookup returns the converter serving a clientProtocol endpoint with an
// upstreamProtocol account. Identical protocols need no converter and
// report false.
func (r *Registry) Lookup(clientProtocol, upstreamProtocol string) (Converter, bool) {
	if r == nil || clientProtocol == upstreamProtocol {
		return nil, false
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, ok := r.m[pair{clientProtocol, upstreamProtocol}]
	return c, ok
}

// CanConvert implements core.ProtocolConverters.
func (r *Registry) CanConvert(clientProtocol, upstreamProtocol string) bool {
	_, ok := r.Lookup(clientProtocol, upstreamProtocol)
	return ok
}

// Pairs lists the registered (from, to) pairs, sorted.
func (r *Registry) Pairs() [][2]string {
	if r == nil {
		return nil
	}
	r.mu.RLock()
	out := make([][2]string, 0, len(r.m))
	for k := range r.m {
		out = append(out, [2]string{k.from, k.to})
	}
	r.mu.RUnlock()
	sort.Slice(out, func(i, j int) bool {
		if out[i][0] != out[j][0] {
			return out[i][0] < out[j][0]
		}
		return out[i][1] < out[j][1]
	})
	return out
}

// AppendSSE appends ev in wire format ("event: ...", one "data:" line per
// data line, blank line).
func AppendSSE(dst []byte, ev Event) []byte {
	if ev.Name != "" {
		dst = append(dst, "event: "...)
		dst = append(dst, ev.Name...)
		dst = append(dst, '\n')
	}
	data := ev.Data
	for {
		i := bytes.IndexByte(data, '\n')
		line := data
		if i >= 0 {
			line = data[:i]
		}
		dst = append(dst, "data: "...)
		dst = append(dst, line...)
		dst = append(dst, '\n')
		if i < 0 {
			break
		}
		data = data[i+1:]
	}
	return append(dst, '\n')
}
