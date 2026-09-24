package convert

import (
	"errors"
	"testing"
)

type stub struct{ from, to string }

func (s stub) From() string                      { return s.from }
func (s stub) To() string                        { return s.to }
func (s stub) Request(b []byte) ([]byte, error)  { return b, nil }
func (s stub) Response(b []byte) ([]byte, error) { return b, nil }
func (s stub) NewStream() StreamConverter        { return nil }

func TestRegistry(t *testing.T) {
	var nilReg *Registry
	if nilReg.CanConvert("a", "b") || len(nilReg.Pairs()) != 0 {
		t.Fatal("nil registry must be empty")
	}
	if len(Default().Pairs()) != len(builtins) {
		t.Fatal("default registry must hold the builtins")
	}

	r := NewRegistry(stub{"anthropic.messages", "openai.chat"})
	if err := r.Register(stub{"openai.chat", "anthropic.messages"}); err != nil {
		t.Fatal(err)
	}
	if err := r.Register(stub{"anthropic.messages", "openai.chat"}); !errors.Is(err, ErrDuplicate) {
		t.Fatalf("duplicate: %v", err)
	}
	for _, bad := range []stub{{"", "x"}, {"x", ""}, {"x", "x"}} {
		if err := r.Register(bad); err == nil {
			t.Fatalf("invalid converter %v accepted", bad)
		}
	}
	if err := r.Register(nil); err == nil {
		t.Fatal("nil converter accepted")
	}
	c, ok := r.Lookup("anthropic.messages", "openai.chat")
	if !ok || c.From() != "anthropic.messages" || c.To() != "openai.chat" {
		t.Fatalf("lookup: %v %v", c, ok)
	}
	if r.CanConvert("anthropic.messages", "gemini.generate") || r.CanConvert("anthropic.messages", "anthropic.messages") {
		t.Fatal("unexpected conversion")
	}
	if !r.CanConvert("openai.chat", "anthropic.messages") {
		t.Fatal("reverse pair missing")
	}
	if p := r.Pairs(); len(p) != 2 || p[0] != [2]string{"anthropic.messages", "openai.chat"} {
		t.Fatalf("pairs %v", p)
	}
	var zero Registry
	if zero.CanConvert("a", "b") {
		t.Fatal("zero registry must be empty")
	}
	if err := zero.Register(stub{"a", "b"}); err != nil || !zero.CanConvert("a", "b") {
		t.Fatalf("zero registry register: %v", err)
	}
}

func TestAppendSSE(t *testing.T) {
	got := string(AppendSSE(nil, Event{Name: "message_start", Data: []byte(`{"a":1}`)}))
	if got != "event: message_start\ndata: {\"a\":1}\n\n" {
		t.Fatalf("named event %q", got)
	}
	got = string(AppendSSE([]byte("x"), Event{Data: []byte("l1\nl2")}))
	if got != "xdata: l1\ndata: l2\n\n" {
		t.Fatalf("multi-line event %q", got)
	}
	if got = string(AppendSSE(nil, Event{})); got != "data: \n\n" {
		t.Fatalf("empty event %q", got)
	}
}
