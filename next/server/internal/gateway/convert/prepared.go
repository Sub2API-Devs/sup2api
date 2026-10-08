package convert

import "fmt"

// RequestError rejects an input whose semantics cannot be expressed by a
// strict conversion. Trying a different account must not silently weaken it.
type RequestError struct{ Cause error }

func (e *RequestError) Error() string { return e.Cause.Error() }
func (e *RequestError) Unwrap() error { return e.Cause }

// PreparedConverter binds response options to one immutable request plan.
// Registry entries are shared; they must never store request-specific options.
// The returned converter belongs only to this request and creates independent
// stream state on each NewStream call.
type PreparedConverter interface {
	Prepare(body []byte) (Converter, []byte, error)
}

// Prepare preserves the existing stateless Converter contract while allowing
// protocols with request-dependent response formats to bind their options.
func Prepare(c Converter, body []byte) (Converter, []byte, error) {
	p, ok := c.(PreparedConverter)
	if !ok {
		out, err := c.Request(body)
		return c, out, err
	}
	bound, out, err := p.Prepare(body)
	if err != nil {
		return c, nil, err
	}
	if bound == nil || bound.From() != c.From() || bound.To() != c.To() {
		return c, nil, fmt.Errorf("convert: prepared converter changed protocol pair")
	}
	return bound, out, nil
}
