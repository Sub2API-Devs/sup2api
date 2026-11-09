package convert

import (
	"errors"
	"reflect"
	"testing"
)

type stub struct{ from, to string }

func (s stub) From() string                                           { return s.from }
func (s stub) To() string                                             { return s.to }
func (s stub) Grade() Grade                                           { return GradeGood }
func (s stub) Prepare(b []byte, _ Options) (Converter, []byte, error) { return s, b, nil }
func (s stub) Response(b []byte) ([]byte, error)                      { return b, nil }
func (s stub) NewStream() StreamConverter                             { return nil }

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
	c, ok := r.Resolve("anthropic.messages", "openai.chat")
	if !ok || c.From() != "anthropic.messages" || c.To() != "openai.chat" {
		t.Fatalf("resolve: %v %v", c, ok)
	}
	if r.CanConvert("anthropic.messages", "gemini.generate") || r.CanConvert("anthropic.messages", "anthropic.messages") {
		t.Fatal("unexpected conversion")
	}
	if !r.CanConvert("openai.chat", "anthropic.messages") {
		t.Fatal("reverse pair missing")
	}
	want := PairInfo{From: "anthropic.messages", To: "openai.chat", Grade: GradeGood, Hops: []string{"anthropic.messages", "openai.chat"}}
	if p := r.Pairs(); len(p) != 2 || !reflect.DeepEqual(p[0], want) {
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

type gradedStub struct {
	stub
	grade Grade
}

func (s gradedStub) Grade() Grade { return s.grade }

func TestGradesAndLosses(t *testing.T) {
	for _, g := range []Grade{GradeNative, GradeLocal, 7} {
		if err := (&Registry{}).Register(gradedStub{stub{"a", "b"}, g}); err == nil {
			t.Errorf("grade %s accepted", g)
		}
	}
	if GradeDiscouraged.String() != "discouraged" || Grade(7).String() != "grade(7)" {
		t.Fatal("grade names")
	}

	var l losses
	l.add(LossOther, "top_k")
	l.add(LossTool, "tools[1]")
	l.add(LossOther, "top_k")
	l.add(LossImage, "messages[0].content[1]")
	want := []Loss{{LossImage, "messages[0].content[1]", 0}, {LossTool, "tools[1]", 0}, {LossOther, "top_k", 0}}
	if got := l.sorted(); !reflect.DeepEqual(got, want) {
		t.Fatalf("losses %v", got)
	}

	s := stub{"a", "b"}
	if Losses(s) != nil || !reflect.DeepEqual(Hops(s), []string{"a", "b"}) {
		t.Fatal("defaults for a converter without reporters")
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
