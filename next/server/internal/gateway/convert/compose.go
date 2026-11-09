package convert

import "slices"

// relay is the one protocol a composition passes through
// (CONVERT-MATRIX §4): a pair without a converter of its own is served by
// from -> relay -> to when both hops exist, never by more hops.
const relay = "openai.responses"

// composed chains a (client -> relay) and b (relay -> upstream). The
// registry builds one for every pair without a direct converter; Prepare
// returns one bound to the request.
type composed struct{ a, b Converter }

func (c *composed) From() string   { return c.a.From() }
func (c *composed) To() string     { return c.b.To() }
func (c *composed) Grade() Grade   { return GradeDiscouraged }
func (c *composed) Hops() []string { return []string{c.a.From(), relay, c.b.To()} }

// Prepare converts the request through both hops with the same options
// (model and stream do not change between them). The first error ends it,
// a RequestError keeping its type.
func (c *composed) Prepare(body []byte, opt Options) (Converter, []byte, error) {
	a, mid, err := c.a.Prepare(body, opt)
	if err != nil {
		return nil, nil, err
	}
	b, out, err := c.b.Prepare(mid, opt)
	if err != nil {
		return nil, nil, err
	}
	return &composed{a: a, b: b}, out, nil
}

// Response converts the upstream body back through b, then a.
func (c *composed) Response(body []byte) ([]byte, error) {
	mid, err := c.b.Response(body)
	if err != nil {
		return nil, err
	}
	return c.a.Response(mid)
}

func (c *composed) NewStream() StreamConverter {
	return &composedStream{a: c.a.NewStream(), b: c.b.NewStream()}
}

// Losses implements LossReporter: a's losses (hop 0), then b's as hop 1.
func (c *composed) Losses() []Loss {
	out := slices.Clone(Losses(c.a))
	for _, l := range Losses(c.b) {
		l.Hop = 1
		out = append(out, l)
	}
	return out
}

// composedStream feeds every event b produces into a. An intermediate
// event's Data is used within the call only, so nothing is copied.
type composedStream struct{ a, b StreamConverter }

func (s *composedStream) Event(ev Event) ([]Event, error) {
	mid, err := s.b.Event(ev)
	if err != nil {
		return nil, err
	}
	return s.feed(mid)
}

func (s *composedStream) Flush() ([]Event, error) {
	mid, err := s.b.Flush()
	if err != nil {
		return nil, err
	}
	out, err := s.feed(mid)
	if err != nil {
		return nil, err
	}
	tail, err := s.a.Flush()
	if err != nil {
		return nil, err
	}
	return append(out, tail...), nil
}

func (s *composedStream) feed(mid []Event) ([]Event, error) {
	var out []Event
	for _, ev := range mid {
		evs, err := s.a.Event(ev)
		if err != nil {
			return nil, err
		}
		out = append(out, evs...)
	}
	return out, nil
}
