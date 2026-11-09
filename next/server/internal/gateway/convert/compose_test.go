package convert

import (
	"errors"
	"reflect"
	"strings"
	"testing"
)

// tagConv appends its name to request bodies, prepends it to responses and
// stream events, and reports one loss per Prepare.
type tagConv struct {
	from, to, name string
	err            error
	lost           []Loss
}

func (c *tagConv) From() string { return c.from }
func (c *tagConv) To() string   { return c.to }
func (c *tagConv) Grade() Grade { return GradeGood }

func (c *tagConv) Prepare(b []byte, opt Options) (Converter, []byte, error) {
	if c.err != nil {
		return nil, nil, c.err
	}
	bound := *c
	bound.lost = []Loss{{Category: LossOther, Path: c.name + "." + opt.Model}}
	return &bound, append(append([]byte{}, b...), "|"+c.name...), nil
}

func (c *tagConv) Response(b []byte) ([]byte, error) {
	return []byte(c.name + "(" + string(b) + ")"), nil
}
func (c *tagConv) NewStream() StreamConverter { return &tagStream{name: c.name} }
func (c *tagConv) Losses() []Loss             { return c.lost }

type tagStream struct{ name string }

// Event doubles each event, so a composition must feed every intermediate
// event to the next hop.
func (s *tagStream) Event(ev Event) ([]Event, error) {
	d := s.name + "(" + string(ev.Data) + ")"
	return []Event{{Data: []byte(d + "1")}, {Data: []byte(d + "2")}}, nil
}

func (s *tagStream) Flush() ([]Event, error) { return []Event{{Data: []byte(s.name + "!")}}, nil }

func TestComposeThroughResponses(t *testing.T) {
	a := &tagConv{from: "anthropic.messages", to: relay, name: "a"}
	b := &tagConv{from: relay, to: "gemini.generate", name: "b"}
	r := NewRegistry(a, b)

	c, ok := r.Resolve("anthropic.messages", "gemini.generate")
	if !ok || c.Grade() != GradeDiscouraged || c.From() != "anthropic.messages" || c.To() != "gemini.generate" {
		t.Fatalf("composition %v %v", c, ok)
	}
	if again, _ := r.Resolve("anthropic.messages", "gemini.generate"); again != c {
		t.Fatal("composition not cached")
	}
	if !reflect.DeepEqual(Hops(c), []string{"anthropic.messages", relay, "gemini.generate"}) {
		t.Fatalf("hops %v", Hops(c))
	}
	if r.CanConvert("gemini.generate", "anthropic.messages") || r.CanConvert("anthropic.messages", "anthropic.messages") {
		t.Fatal("composition without both hops")
	}
	// No composition between two protocols of one platform.
	same := NewRegistry(&tagConv{from: "gemini.generate", to: relay, name: "a"},
		&tagConv{from: relay, to: "gemini.stream_generate", name: "b"})
	if same.CanConvert("gemini.generate", "gemini.stream_generate") || len(same.Pairs()) != 2 {
		t.Fatalf("same-platform composition %v", same.Pairs())
	}

	bound, out, err := c.Prepare([]byte("in"), Options{Model: "m"})
	if err != nil || string(out) != "in|a|b" {
		t.Fatalf("prepare %q %v", out, err)
	}
	want := []Loss{{LossOther, "a.m", 0}, {LossOther, "b.m", 1}}
	if got := Losses(bound); !reflect.DeepEqual(got, want) {
		t.Fatalf("losses %v", got)
	}
	if resp, err := bound.Response([]byte("x")); err != nil || string(resp) != "a(b(x))" {
		t.Fatalf("response %q %v", resp, err)
	}

	s := bound.NewStream()
	evs, err := s.Event(Event{Data: []byte("e")})
	if err != nil || joinEvents(evs) != "a(b(e)1)1 a(b(e)1)2 a(b(e)2)1 a(b(e)2)2" {
		t.Fatalf("stream events %q %v", joinEvents(evs), err)
	}
	evs, err = s.Flush()
	if err != nil || joinEvents(evs) != "a(b!)1 a(b!)2 a!" {
		t.Fatalf("stream flush %q %v", joinEvents(evs), err)
	}
}

func TestComposeKeepsRequestError(t *testing.T) {
	refused := &RequestError{Cause: errors.New("previous_response_id")}
	r := NewRegistry(&tagConv{from: "anthropic.messages", to: relay, name: "a"},
		&tagConv{from: relay, to: "gemini.generate", name: "b", err: refused})
	c, _ := r.Resolve("anthropic.messages", "gemini.generate")
	_, out, err := c.Prepare([]byte("in"), Options{})
	var re *RequestError
	if out != nil || !errors.As(err, &re) || re != refused {
		t.Fatalf("prepare %q %v", out, err)
	}
}

func TestDirectConverterWinsOverComposition(t *testing.T) {
	direct := &tagConv{from: "openai.chat", to: "anthropic.messages", name: "d"}
	r := NewRegistry(&tagConv{from: "openai.chat", to: relay, name: "a"},
		&tagConv{from: relay, to: "anthropic.messages", name: "b"}, direct)
	if c, ok := r.Resolve("openai.chat", "anthropic.messages"); !ok || c != direct {
		t.Fatalf("resolve %v %v", c, ok)
	}
	var got []string
	for _, p := range r.Pairs() {
		got = append(got, p.From+">"+p.To+":"+p.Grade.String()+":"+strings.Join(p.Hops, ","))
	}
	want := []string{
		"openai.chat>anthropic.messages:good:openai.chat,anthropic.messages",
		"openai.chat>openai.responses:good:openai.chat,openai.responses",
		"openai.responses>anthropic.messages:good:openai.responses,anthropic.messages",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("pairs %v", got)
	}
	info, ok := r.Conversion("openai.chat", "anthropic.messages")
	if !ok || info.Rank != int(GradeGood) || info.Grade != "good" || len(info.Hops) != 2 {
		t.Fatalf("conversion %+v %v", info, ok)
	}
}

func joinEvents(evs []Event) string {
	parts := make([]string, len(evs))
	for i, ev := range evs {
		parts[i] = string(ev.Data)
	}
	return strings.Join(parts, " ")
}
