package convert

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// sample is one recorded upstream reply (testdata/recorded).
type sample struct {
	protocol, name, path string
	stream               bool
}

func recordedSamples(t *testing.T) []sample {
	t.Helper()
	paths, _ := filepath.Glob(filepath.Join("testdata", "recorded", "*", "*"))
	var out []sample
	for _, p := range paths {
		base := filepath.Base(p)
		name, kind, ok := strings.Cut(base, ".")
		if !ok || kind == "request.json" {
			continue
		}
		out = append(out, sample{protocol: filepath.Base(filepath.Dir(p)), name: name, path: p, stream: kind == "stream.sse"})
	}
	if len(out) == 0 {
		t.Fatal("no recorded samples")
	}
	return out
}

// readSample reads a sample with its protocol's reader: a JSON body with
// Reader.JSON, a stream event by event into a Msg.
func readSample(t *testing.T, s sample) (*Msg, Reader, error) {
	t.Helper()
	r := readerFor(s.protocol)(respOpts{})
	body, err := os.ReadFile(s.path)
	if err != nil {
		t.Fatal(err)
	}
	if !s.stream {
		m, err := r.JSON(body)
		return m, r, err
	}
	var ds []Delta
	for _, ev := range parseSSE(body) {
		got, err := r.Event(ev)
		if err != nil {
			return nil, r, err
		}
		ds = append(ds, got...)
	}
	end, err := r.End()
	if err != nil {
		return nil, r, err
	}
	m, err := collect(append(ds, end...))
	return m, r, err
}

// essence describes the content of a reply in one line per block, for
// comparisons that ignore ids and layout.
func essence(m *Msg) string {
	var b strings.Builder
	for _, blk := range m.Blocks {
		state := ""
		if blk.HasState {
			state = "*"
		}
		switch blk.Kind {
		case BlockToolCall:
			args := blk.Args
			if blk.ToolKind == ToolFunction {
				args = compactJSON([]byte(args))
			}
			fmt.Fprintf(&b, "tool%s %s %s %s %s\n", state, blk.ToolKind, blk.ToolName, blk.ToolID, args)
		case BlockImage:
			fmt.Fprintf(&b, "image%s %s %d\n", state, blk.MIME, len(blk.Data))
		case BlockOpaque:
			fmt.Fprintf(&b, "opaque%s\n", state)
		default:
			fmt.Fprintf(&b, "%s%s %q", [...]string{"text", "reasoning", "", "refusal"}[blk.Kind], state, blk.Text)
			for _, c := range blk.Annotations {
				fmt.Fprintf(&b, " [%s %q %d-%d]", c.URL, c.Title, c.Start, c.End)
			}
			b.WriteString("\n")
		}
	}
	u := m.Usage
	fmt.Fprintf(&b, "finish %d %q %q\nusage %v in=%d cr=%d cw=%d/%d out=%d rs=%d\n", m.Finish.Reason, m.Finish.Raw,
		m.Finish.StopSequence, u.Set, u.Input, u.CacheRead, u.CacheWrite5m, u.CacheWrite1h, u.Output, u.Reasoning)
	return b.String()
}

// TestReadersAgree checks every recorded reply reads without error (the
// error_midstream streams as an upstream error) and that a protocol's
// JSON reply and stream of one case give the same reply.
func TestReadersAgree(t *testing.T) {
	byCase := map[string]string{}
	for _, s := range recordedSamples(t) {
		m, _, err := readSample(t, s)
		var ue *UpstreamError
		if s.name == "error_midstream" {
			if !errors.As(err, &ue) {
				t.Errorf("%s: want upstream error, got %v", s.path, err)
			}
			continue
		}
		if err != nil {
			t.Errorf("%s: %v", s.path, err)
			continue
		}
		key := strings.TrimSuffix(strings.TrimSuffix(s.protocol, ".generate"), ".stream_generate") + "/" + s.name
		got := essence(m)
		if prev, ok := byCase[key]; ok && prev != got {
			t.Errorf("%s: JSON and stream disagree:\n%s\nvs\n%s", key, prev, got)
		}
		byCase[key] = got
	}
}

func TestReaderContent(t *testing.T) {
	const anthropicCalls = "tool function get_weather toolu_01T1x1fJ34qAmk2tNTrN7Up6 {\"city\":\"Paris\"}\n" +
		"tool function get_weather toolu_01KkV6nBQfcxBxNc5zNm4mVd {\"city\":\"Tokyo\"}\n"
	tests := []struct{ path, want string }{
		{"openai.chat/tools.stream.sse",
			"tool function get_weather call_FthC9qRpsL5kBpwwyw6c7j4k {\"city\":\"Paris\"}\n" +
				"tool function get_weather call_RpEDoB8O0FTL9JoKTuCVFOyR {\"city\":\"Tokyo\"}\n" +
				"finish 1 \"tool_calls\" \"\"\nusage true in=62 cr=0 cw=0/0 out=46 rs=0\n"},
		{"openai.chat/reasoning.stream.sse",
			"reasoning \"391 = 17 x 23, so it is not prime.\"\ntext \"No. 391 = 17 × 23.\"\n" +
				"finish 0 \"stop\" \"\"\nusage true in=12 cr=0 cw=0/0 out=40 rs=24\n"},
		{"openai.responses/reasoning.stream.sse",
			"reasoning* \"**Factoring 391**\\n\\n391 = 17 x 23.\\n\\n**Answer**\\n\\nSo it is not prime.\"\n" +
				"text \"No. 391 = 17 × 23.\"\nfinish 0 \"completed\" \"\"\nusage true in=12 cr=0 cw=0/0 out=140 rs=128\n"},
		{"openai.responses/web_search.stream.sse",
			"opaque\ntext \"Paris is sunny, 21 °C, according to forecasts.\" [https://example.com/paris-weather \"Paris weather today\" 0-23]\n" +
				"finish 0 \"completed\" \"\"\nusage true in=320 cr=0 cw=0/0 out=24 rs=0\n"},
		{"openai.responses/finish_length.response.json",
			"text \"The lighthouse stood alone on the\"\nfinish 2 \"max_output_tokens\" \"\"\nusage true in=15 cr=0 cw=0/0 out=16 rs=0\n"},
		{"anthropic.messages/tools.stream.sse",
			"text \"I'll check both cities.\"\n" + anthropicCalls + "finish 1 \"tool_use\" \"\"\nusage true in=380 cr=0 cw=0/0 out=96 rs=0\n"},
		{"anthropic.messages/reasoning.stream.sse",
			"reasoning* \"391 = 17 x 23, so it is not prime.\"\ntext \"No. 391 = 17 × 23.\"\n" +
				"finish 0 \"end_turn\" \"\"\nusage true in=40 cr=0 cw=0/0 out=60 rs=0\n"},
		{"anthropic.messages/usage_cache.response.json",
			"text \"Hello.\"\nfinish 0 \"end_turn\" \"\"\nusage true in=1290 cr=1024 cw=200/52 out=4 rs=0\n"},
		{"anthropic.messages/web_search.stream.sse",
			"opaque\nopaque\ntext \"Paris is sunny, 21 °C.\" [https://example.com/paris-weather \"Paris weather today\" 0-0]\n" +
				"finish 0 \"end_turn\" \"\"\nusage true in=2100 cr=0 cw=0/0 out=40 rs=0\n"},
		{"gemini.stream_generate/tools.stream.sse",
			"tool* function get_weather " + synthCallID("Ws0QacGWJdiVz7IPuv6E8Qo", 0) + " {\"city\":\"Paris\"}\n" +
				"tool function get_weather " + synthCallID("Ws0QacGWJdiVz7IPuv6E8Qo", 1) + " {\"city\":\"Tokyo\"}\n" +
				"finish 1 \"STOP\" \"\"\nusage true in=60 cr=0 cw=0/0 out=110 rs=80\n"},
		{"gemini.stream_generate/reasoning.stream.sse",
			"reasoning \"**Factoring**\\n\\n391 = 17 x 23, so it is not prime.\"\ntext* \"No. 391 = 17 × 23.\"\n" +
				"finish 0 \"STOP\" \"\"\nusage true in=9 cr=0 cw=0/0 out=132 rs=120\n"},
		{"gemini.generate/web_search.response.json",
			"text \"Paris is sunny and 21 °C today.\" [https://example.com/paris-weather \"example.com\" 0-24]\n" +
				"finish 0 \"STOP\" \"\"\nusage true in=12 cr=0 cw=0/0 out=10 rs=0\n"},
	}
	for _, tt := range tests {
		dir, file := filepath.Split(tt.path)
		name, kind, _ := strings.Cut(file, ".")
		s := sample{protocol: filepath.Base(dir), name: name, path: filepath.Join("testdata", "recorded", tt.path), stream: kind == "stream.sse"}
		m, _, err := readSample(t, s)
		if err != nil {
			t.Errorf("%s: %v", tt.path, err)
			continue
		}
		if got := essence(m); got != tt.want {
			t.Errorf("%s:\ngot:\n%s\nwant:\n%s", tt.path, got, tt.want)
		}
	}
}

func TestReaderLosses(t *testing.T) {
	r := newGeminiReader(respOpts{})
	_, err := r.JSON([]byte(`{"candidates":[{"content":{"parts":[{"text":"x"}]},"finishReason":"MALFORMED_FUNCTION_CALL"}]}`))
	if err != nil {
		t.Fatal(err)
	}
	if got := fmt.Sprint(r.(LossReporter).Losses()); got != "[{other response.candidates[0].finishReason 0}]" {
		t.Errorf("gemini losses %s", got)
	}
	a := newAnthropicReader(respOpts{})
	_, err = a.JSON([]byte(`{"id":"m","content":[{"type":"text","text":"x","citations":[{"type":"char_location"}]}],"stop_reason":"end_turn"}`))
	if err != nil {
		t.Fatal(err)
	}
	if got := fmt.Sprint(a.(LossReporter).Losses()); got != "[{other response.content[0].citations 0}]" {
		t.Errorf("anthropic losses %s", got)
	}
}

func TestChatReaderInterleavedCalls(t *testing.T) {
	r := newChatReader(respOpts{})
	for _, d := range []string{
		`{"id":"c","choices":[{"delta":{"tool_calls":[{"index":0,"id":"a","function":{"name":"f","arguments":"{"}}]}}]}`,
		`{"id":"c","choices":[{"delta":{"tool_calls":[{"index":1,"id":"b","function":{"name":"g","arguments":"{"}}]}}]}`,
	} {
		if _, err := r.Event(Event{Data: []byte(d)}); err != nil {
			t.Fatal(err)
		}
	}
	_, err := r.Event(Event{Data: []byte(`{"id":"c","choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"}"}}]}}]}`)})
	if err == nil {
		t.Fatal("arguments of an earlier call after a later one started must fail")
	}
}

func TestReaderTruncatedStream(t *testing.T) {
	for proto, data := range map[string]string{
		"openai.chat":        `{"id":"c","choices":[{"delta":{"content":"hi"}}]}`,
		"openai.responses":   `{"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"hi"}`,
		"anthropic.messages": `{"type":"content_block_start","index":0,"content_block":{"type":"text","text":"hi"}}`,
		"gemini.generate":    `{"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}`,
	} {
		r := readerFor(proto)(respOpts{})
		ds, err := r.Event(Event{Data: []byte(data)})
		if err != nil {
			t.Fatal(proto, err)
		}
		end, _ := r.End()
		if _, err := collect(append(ds, end...)); err == nil {
			t.Errorf("%s: a stream without its end must not complete", proto)
		}
	}
}
