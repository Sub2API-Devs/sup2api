package convert

import (
	"bytes"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// clientProtocols are the protocols a writer serves.
var clientProtocols = []string{"openai.chat", "openai.responses", "anthropic.messages", "gemini.generate"}

func family(protocol string) string {
	if strings.HasPrefix(protocol, "gemini.") {
		return "gemini"
	}
	return protocol
}

// irOpts are the request facts the IR tests give writers.
var irOpts = respOpts{model: "client-model", includeUsage: true}

// convertSample runs a recorded reply through its reader and the writer of
// client, as a pair converter does.
func convertSample(t *testing.T, s sample, client string, o respOpts) ([]byte, []Loss, error) {
	t.Helper()
	p := &pairConverter{from: client, to: s.protocol, reader: readerFor(s.protocol), writer: writerFor(client), bound: true, opts: o}
	body, err := os.ReadFile(s.path)
	if err != nil {
		t.Fatal(err)
	}
	var out []byte
	if s.stream {
		out, err = runStream(p, parseSSE(body))
	} else {
		out, err = p.Response(body)
	}
	return out, p.Losses(), err
}

// TestWriterSnapshots converts every recorded reply to every other client
// protocol and compares with testdata/ir/<protocol>/<case>.<kind>.txt
// (-update rewrites them).
func TestWriterSnapshots(t *testing.T) {
	for _, s := range recordedSamples(t) {
		var b bytes.Buffer
		for _, client := range clientProtocols {
			if family(client) == family(s.protocol) {
				continue
			}
			out, lost, err := convertSample(t, s, client, irOpts)
			fmt.Fprintf(&b, "=== %s\n%s", client, normalizeOutput(out))
			if err != nil {
				fmt.Fprintf(&b, "--- error: %v\n", err)
			}
			fmt.Fprintf(&b, "--- losses: %s\n\n", lossJSON(lost, true))
		}
		kind := "json"
		if s.stream {
			kind = "sse"
		}
		dir := filepath.Join("testdata", "ir", s.protocol)
		if *update {
			_ = os.MkdirAll(dir, 0o755)
		}
		checkFile(t, dir, s.name+"."+kind+".txt", b.Bytes(), func(b []byte) []byte { return b })
	}
}

// TestWriterRoundTrip checks a writer's output is valid input for the same
// protocol's reader (CONVERT-MATRIX §4) and keeps what the client protocol
// can carry.
func TestWriterRoundTrip(t *testing.T) {
	for _, s := range recordedSamples(t) {
		orig, _, origErr := readSample(t, s)
		for _, client := range clientProtocols {
			if family(client) == family(s.protocol) {
				continue
			}
			out, _, err := convertSample(t, s, client, irOpts)
			if err != nil {
				t.Errorf("%s -> %s: %v", s.path, client, err)
				continue
			}
			back := sample{protocol: client, path: filepath.Join(t.TempDir(), "out"), stream: s.stream}
			if err := os.WriteFile(back.path, out, 0o644); err != nil {
				t.Fatal(err)
			}
			got, _, gotErr := readSample(t, back)
			var ue *UpstreamError
			if origErr != nil {
				if !errors.As(gotErr, &ue) {
					t.Errorf("%s -> %s: upstream error not carried: %v", s.path, client, gotErr)
				}
				continue
			}
			if gotErr != nil {
				t.Errorf("%s -> %s: reading back: %v\n%s", s.path, client, gotErr, out)
				continue
			}
			want := carried(orig, client, s.stream)
			got.Finish.Raw = ""
			if essence(got) != essence(want) {
				t.Errorf("%s -> %s:\ngot:\n%s\nwant:\n%s", s.path, client, essence(got), essence(want))
			}
		}
	}
}

// carried is what a reply keeps after a client protocol's writer and
// reader: ids and raw finish reasons aside, the documented drops of
// CONVERT-MATRIX §9.5, §9.6 and §9.8.
func carried(m *Msg, client string, stream bool) *Msg {
	fam := family(client)
	wraps := fam == "anthropic.messages" || fam == "gemini" // refusals as text, tool input as an object
	out := &Msg{Finish: finalFinish(m), Usage: m.Usage}
	out.Finish.Raw, out.Usage.Set = "", true
	if fam != "anthropic.messages" {
		out.Usage.CacheWrite5m, out.Usage.CacheWrite1h = 0, 0
		out.Finish.StopSequence = ""
		if out.Finish.Reason == FinishPause {
			out.Finish.Reason = FinishStop
		}
	} else {
		out.Usage.Reasoning = 0
	}
	for _, b := range m.Blocks {
		if b.Kind == BlockOpaque || (b.Kind == BlockImage && fam != "gemini") {
			continue
		}
		b.HasState, b.Src, b.Raw = false, "", nil
		switch {
		case fam == "gemini":
			b.Annotations = nil
		case fam == "anthropic.messages":
			for i := range b.Annotations {
				b.Annotations[i].Start, b.Annotations[i].End = 0, 0
			}
		}
		if wraps && b.Kind == BlockRefusal {
			b.Kind = BlockText
		}
		if wraps && b.Kind == BlockToolCall {
			obj, _ := toolObject(&b)
			b.ToolKind, b.Args = ToolFunction, string(obj)
		}
		out.Blocks = append(out.Blocks, b)
	}
	if fam == "gemini" || (fam == "openai.chat" && !stream) {
		out.Blocks = mergeText(out.Blocks, fam == "openai.chat")
	}
	return out
}

// mergeText merges adjacent text (and adjacent reasoning) blocks, as a
// Gemini reply does; byKind gathers all blocks of a kind instead, in chat
// message order (reasoning, content, refusal, tool calls).
func mergeText(bs []Block, byKind bool) []Block {
	if byKind {
		var out []Block
		for _, k := range []BlockKind{BlockReasoning, BlockText, BlockRefusal} {
			var merged *Block
			for _, b := range bs {
				if b.Kind != k {
					continue
				}
				if merged == nil {
					c := b
					merged = &c
					continue
				}
				merged.Text += b.Text
			}
			if merged != nil {
				out = append(out, *merged)
			}
		}
		for _, b := range bs {
			if b.Kind == BlockToolCall {
				out = append(out, b)
			}
		}
		return out
	}
	var out []Block
	for _, b := range bs {
		if n := len(out); n > 0 && b.Kind == out[n-1].Kind && (b.Kind == BlockText || b.Kind == BlockReasoning) {
			out[n-1].Text += b.Text
			continue
		}
		out = append(out, b)
	}
	return out
}

func TestWriterContract(t *testing.T) {
	start := Delta{Op: DeltaStart, Start: &Msg{ID: "x", Model: "m", Created: 1}}
	text := Block{Kind: BlockText}
	for _, client := range clientProtocols {
		w := writerFor(client)(respOpts{})
		if _, err := w.Write([]Delta{start, {Op: DeltaBlockStart, Index: 0, Block: &text}, {Op: DeltaText, Index: 0, Text: "a"}}); err != nil {
			t.Fatal(client, err)
		}
		if _, err := w.End(); !errors.Is(err, errNoFinish) {
			t.Errorf("%s: End without finish: %v", client, err)
		}
		if _, err := w.Write([]Delta{{Op: DeltaText, Index: 3, Text: "b"}}); err == nil {
			t.Errorf("%s: a delta for a block that is not open must fail", client)
		}
		w = writerFor(client)(respOpts{})
		evs, err := w.Write([]Delta{start, {Op: DeltaError, Err: &UpstreamError{Status: 429, Message: "slow down"}},
			{Op: DeltaBlockStart, Index: 0, Block: &text}})
		if err != nil || len(evs) != 1 || !strings.Contains(string(evs[0].Data), "slow down") {
			t.Errorf("%s: error not written alone: %v %q", client, err, evs)
		}
		if _, err := w.End(); err != nil {
			t.Errorf("%s: End after an error: %v", client, err)
		}
	}
}

func TestWriterLegacyFunctions(t *testing.T) {
	s := sample{protocol: "anthropic.messages", path: "testdata/recorded/anthropic.messages/tools.response.json"}
	out, lost, err := convertSample(t, s, "openai.chat", respOpts{legacyFunctions: true})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(out), `"function_call":{"name":"get_weather","arguments":"{\"city\":\"Paris\"}"}`) ||
		!strings.Contains(string(out), `"finish_reason":"function_call"`) || strings.Contains(string(out), "tool_calls") {
		t.Errorf("legacy reply %s", out)
	}
	if got := fmt.Sprint(lost); got != "[{tool response.content[2] 0}]" {
		t.Errorf("losses %s", got)
	}
}

func TestWriterInvalidArguments(t *testing.T) {
	m := &Msg{ID: "x", Blocks: []Block{{Kind: BlockToolCall, ToolID: "c", ToolName: "f", ToolKind: ToolFunction, Args: "{bad", Src: "s"}},
		Finish: Finish{Reason: FinishToolUse}}
	for _, client := range []string{"anthropic.messages", "gemini.generate"} {
		w := writerFor(client)(respOpts{})
		out, err := w.JSON(m)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(out), `{}`) || fmt.Sprint(w.Losses()) != "[{tool response.s 0}]" {
			t.Errorf("%s: %s %v", client, out, w.Losses())
		}
	}
}
