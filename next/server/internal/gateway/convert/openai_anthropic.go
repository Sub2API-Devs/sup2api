package convert

import (
	"errors"

	"github.com/Sub2API-Devs/sup2api/next/protocol-codec/strict"
)

var errUnprepared = errors.New("convert: response requires a prepared request")

type openAIAnthropic struct {
	protocol string
	plan     *strict.Plan
}

func (c *openAIAnthropic) From() string { return c.protocol }
func (c *openAIAnthropic) To() string   { return "anthropic.messages" }
func (c *openAIAnthropic) Grade() Grade { return GradeFair }

// Prepare ignores opt: the strict plan needs none. T3 replaces this
// converter with the lenient one of CONVERT-MATRIX §9.9.
func (c *openAIAnthropic) Prepare(body []byte, _ Options) (Converter, []byte, error) {
	plan, out, err := strict.Prepare(c.protocol, body)
	if err != nil {
		return nil, nil, &RequestError{Cause: err}
	}
	return &openAIAnthropic{protocol: c.protocol, plan: plan}, out, nil
}

func (c *openAIAnthropic) Response(body []byte) ([]byte, error) {
	if c.plan == nil {
		return nil, errUnprepared
	}
	return c.plan.JSON(body)
}

func (c *openAIAnthropic) NewStream() StreamConverter {
	if c.plan == nil {
		return &openAIAnthropicStream{}
	}
	return &openAIAnthropicStream{stream: c.plan.NewStream()}
}

type openAIAnthropicStream struct{ stream *strict.Stream }

func (s *openAIAnthropicStream) Event(e Event) ([]Event, error) {
	if s.stream == nil {
		return nil, errUnprepared
	}
	events, err := s.stream.Event(strict.Event{Name: e.Name, Data: e.Data})
	return adaptEvents(events), err
}

func (s *openAIAnthropicStream) Flush() ([]Event, error) {
	if s.stream == nil {
		return nil, errUnprepared
	}
	events, err := s.stream.Flush()
	return adaptEvents(events), err
}

func adaptEvents(events []strict.Event) []Event {
	out := make([]Event, len(events))
	for i, event := range events {
		out[i] = Event{Name: event.Name, Data: event.Data}
	}
	return out
}
