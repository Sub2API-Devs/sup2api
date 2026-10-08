package gateway

import (
	"fmt"
	"sync"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

type requestBoundConverter struct{ option string }

func (c requestBoundConverter) From() string { return "openai.chat" }
func (c requestBoundConverter) To() string   { return "anthropic.messages" }
func (c requestBoundConverter) Request([]byte) ([]byte, error) {
	return nil, fmt.Errorf("shared Request must not be called after Prepare")
}
func (c requestBoundConverter) Prepare(body []byte) (convert.Converter, []byte, error) {
	return requestBoundConverter{option: string(body)}, append([]byte(nil), body...), nil
}
func (c requestBoundConverter) Response([]byte) ([]byte, error)    { return []byte(c.option), nil }
func (c requestBoundConverter) NewStream() convert.StreamConverter { return nil }

func TestPreparedConversionDoesNotShareRequestOptions(t *testing.T) {
	shared := requestBoundConverter{}
	var wg sync.WaitGroup
	for i := range 32 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			want := fmt.Sprintf("request-%d", i)
			route := &typeRoute{conv: shared}
			out, err := route.upstreamBody([]byte(want))
			if err != nil || string(out) != want {
				t.Errorf("prepare %s: %s %v", want, out, err)
				return
			}
			// Retrying a route cannot bind a different request or reuse a
			// concurrent route's include_usage/model/format options.
			if _, err := route.upstreamBody([]byte("retry carrier")); err != nil {
				t.Error(err)
			}
			got, err := route.conv.Response(nil)
			if err != nil || string(got) != want {
				t.Errorf("response %s: %s %v", want, got, err)
			}
		}()
	}
	wg.Wait()
}
