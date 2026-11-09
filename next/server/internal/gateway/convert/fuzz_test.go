package convert

import (
	"os"
	"path/filepath"
	"testing"
)

// fuzzReader feeds arbitrary bytes to a reader, as a stream (split into
// SSE events) and as a JSON body: it must not panic or hang, every delta
// it emits must keep the delta contract, and no writer may panic on them.
func fuzzReader(f *testing.F, dirs ...string) {
	for _, dir := range dirs {
		paths, _ := filepath.Glob(filepath.Join("testdata", "recorded", dir, "*"))
		for _, p := range paths {
			if b, err := os.ReadFile(p); err == nil {
				f.Add(b)
			}
		}
	}
	mk := readerFor(dirs[0])
	f.Fuzz(func(t *testing.T, data []byte) {
		r := mk(respOpts{})
		b := newMsgBuilder()
		ws := make([]Writer, len(clientProtocols))
		for i, p := range clientProtocols {
			ws[i] = writerFor(p)(respOpts{customTools: map[string]bool{"f": true}, includeUsage: true})
		}
		feed := func(ds []Delta) {
			for _, d := range ds {
				if err := b.apply(d); err != nil {
					t.Fatalf("reader broke the delta contract: %v", err)
				}
			}
			for _, w := range ws {
				_, _ = w.Write(ds)
			}
		}
		for _, ev := range parseSSE(data) {
			ds, err := r.Event(ev)
			if err != nil {
				break
			}
			feed(ds)
		}
		if ds, err := r.End(); err == nil {
			feed(ds)
		}
		for _, w := range ws {
			_, _ = w.End()
		}
		if m, err := mk(respOpts{}).JSON(data); err == nil {
			for _, p := range clientProtocols {
				_, _ = writerFor(p)(respOpts{legacyFunctions: true}).JSON(m)
			}
		}
	})
}

func FuzzReadChat(f *testing.F)      { fuzzReader(f, "openai.chat") }
func FuzzReadResponses(f *testing.F) { fuzzReader(f, "openai.responses") }
func FuzzReadAnthropic(f *testing.F) { fuzzReader(f, "anthropic.messages") }
func FuzzReadGemini(f *testing.F)    { fuzzReader(f, "gemini.stream_generate", "gemini.generate") }
