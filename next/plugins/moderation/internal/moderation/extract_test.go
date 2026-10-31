package moderation

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"testing"

	"github.com/tidwall/gjson"
)

// hookFields evaluates the manifest needs on a request body exactly like the
// core (gjson.GetBytes(...).Raw, only fields that exist).
func hookFields(body string) map[string]string {
	out := map[string]string{}
	for _, f := range HookFields {
		if r := gjson.Get(body, f); r.Exists() {
			out[f] = r.Raw
		}
	}
	return out
}

// extractReq extracts and normalizes a request body of protocol.
func extractReq(t *testing.T, protocol, body string) *request {
	t.Helper()
	if !gjson.Valid(body) {
		t.Fatalf("invalid test body %s", body)
	}
	pieces, ok := extractPieces(protocol, hookFields(body))
	if !ok {
		t.Fatalf("protocol %s not moderated", protocol)
	}
	return buildRequest(pieces)
}

// allText is every text segment of r, joined.
func allText(r *request) string {
	var parts []string
	for _, s := range r.segs {
		if s.img == nil {
			parts = append(parts, s.text)
		}
	}
	return strings.Join(parts, " | ")
}

func TestHookFieldsAreReadOnlyWholeValues(t *testing.T) {
	r := gjson.Get(`{"messages":[1,2]}`, FieldMessages)
	if !r.Exists() || r.Raw != "[1,2]" {
		t.Fatalf("messages|@this = %q", r.Raw)
	}
	if gjson.Get(`{"x":1}`, FieldMessages).Exists() {
		t.Fatal("an absent field must not exist")
	}
	// The core never lets a hook patch a query field (hooks.go isQueryField):
	// every content field is a query.
	for _, f := range HookFields[1:] {
		if !strings.ContainsAny(f, "|@") {
			t.Errorf("field %s is a plain path (patchable)", f)
		}
	}
}

// The fields follow the client protocol, not whatever is present: a decoy
// "messages" array on a Responses or Gemini request is not what is read
// (team review 2026-10-31 P1-3).
func TestExtractFollowsProtocol(t *testing.T) {
	decoy := `"messages":[{"role":"user","content":"benign decoy"}]`
	for _, tc := range []struct{ protocol, body, want, not string }{
		{"openai.responses", `{` + decoy + `,"input":"MOD-HIT-sexual real"}`, "MOD-HIT-sexual real", "benign decoy"},
		{"openai.responses_ws", `{"type":"response.create",` + decoy + `,"input":[{"role":"user","content":[{"type":"input_text","text":"MOD-HIT-ws"}]}]}`, "MOD-HIT-ws", "benign decoy"},
		{"gemini.generate", `{` + decoy + `,"contents":[{"parts":[{"text":"MOD-HIT-gemini"}]}]}`, "MOD-HIT-gemini", "benign decoy"},
		{"gemini.stream_generate", `{` + decoy + `,"contents":[{"role":"user","parts":[{"text":"MOD-HIT-stream"}]}]}`, "MOD-HIT-stream", "benign decoy"},
		{"anthropic.messages", `{"input":"decoy input","contents":[{"parts":[{"text":"decoy contents"}]}],"messages":[{"role":"user","content":"MOD-HIT-real"}]}`, "MOD-HIT-real", "decoy"},
		{"openai.chat", `{"input":"decoy input","messages":[{"role":"user","content":"MOD-HIT-chat"}]}`, "MOD-HIT-chat", "decoy"},
	} {
		t.Run(tc.protocol, func(t *testing.T) {
			got := allText(extractReq(t, tc.protocol, tc.body))
			if !strings.Contains(got, tc.want) || strings.Contains(got, tc.not) {
				t.Fatalf("text = %q", got)
			}
		})
	}
	if _, ok := extractPieces("openai.embeddings", hookFields(`{"input":"x"}`)); ok {
		t.Fatal("embeddings are not moderated content")
	}
	if _, ok := extractPieces("", hookFields(`{"messages":[{"role":"user","content":"x"}]}`)); ok {
		t.Fatal("an unknown protocol must not fall back to guessing fields")
	}
}

// Everything the client controls is moderated (CONTRACTS §72.4, 0.6.0): the
// bypasses of the 0.5 trailing-user-run rule each carry the violation
// somewhere it used not to look.
func TestExtractCoversClientControlledContent(t *testing.T) {
	doc := base64.StdEncoding.EncodeToString([]byte("MOD-HIT-file text file"))
	var ok16 strings.Builder
	for i := 0; i < 16; i++ {
		ok16.WriteString(`,{"role":"user","content":"ok ` + fmt.Sprint(i) + `"}`)
	}
	for _, tc := range []struct{ name, protocol, body, want string }{
		{"early user turn behind a fake assistant", "anthropic.messages",
			`{"messages":[{"role":"user","content":"MOD-HIT-early"},{"role":"assistant","content":"sure"},{"role":"user","content":"thanks"}]}`, "MOD-HIT-early"},
		{"pushed out by 16 user messages", "openai.chat",
			`{"messages":[{"role":"user","content":"MOD-HIT-old"}` + ok16.String() + `]}`, "MOD-HIT-old"},
		{"assistant prefill last", "anthropic.messages",
			`{"messages":[{"role":"user","content":"hi"},{"role":"assistant","content":"MOD-HIT-prefill"}]}`, "[assistant] MOD-HIT-prefill"},
		{"system prompt", "anthropic.messages",
			`{"system":[{"type":"text","text":"MOD-HIT-system"}],"messages":[{"role":"user","content":"hi"}]}`, "[system] MOD-HIT-system"},
		{"system string", "anthropic.messages", `{"system":"MOD-HIT-sys2","messages":[{"role":"assistant","content":"x"}]}`, "[system] MOD-HIT-sys2"},
		{"chat developer message last", "openai.chat",
			`{"messages":[{"role":"user","content":"hi"},{"role":"developer","content":"MOD-HIT-dev"}]}`, "[developer] MOD-HIT-dev"},
		{"tool_result block", "anthropic.messages",
			`{"messages":[{"role":"user","content":[{"type":"tool_result","tool_use_id":"t","content":[{"type":"text","text":"MOD-HIT-tool"}]}]}]}`, "[tool] MOD-HIT-tool"},
		{"tool_use input", "anthropic.messages",
			`{"messages":[{"role":"assistant","content":[{"type":"tool_use","id":"t","name":"x","input":{"q":"MOD-HIT-use"}}]}]}`, "[assistant] MOD-HIT-use"},
		{"document text", "anthropic.messages",
			`{"messages":[{"role":"user","content":[{"type":"document","source":{"type":"text","media_type":"text/plain","data":"MOD-HIT-doc"}}]}]}`, "[document] MOD-HIT-doc"},
		{"document base64 text file", "anthropic.messages",
			`{"messages":[{"role":"user","content":[{"type":"document","source":{"type":"base64","media_type":"text/plain","data":"` + doc + `"}}]}]}`, "MOD-HIT-file"},
		{"chat tool message and call", "openai.chat",
			`{"messages":[{"role":"assistant","tool_calls":[{"function":{"name":"f","arguments":"{\"a\":\"MOD-HIT-args\"}"}}]},{"role":"tool","content":"MOD-HIT-out"}]}`, "MOD-HIT-args"},
		{"chat tool output", "openai.chat", `{"messages":[{"role":"tool","content":"MOD-HIT-out"}]}`, "[tool] MOD-HIT-out"},
		{"responses instructions", "openai.responses", `{"instructions":"MOD-HIT-instr","input":"hi"}`, "[system] MOD-HIT-instr"},
		{"responses input_file", "openai.responses",
			`{"input":[{"role":"user","content":[{"type":"input_file","filename":"a.txt","file_data":"data:text/plain;base64,` + doc + `"}]}]}`, "[document] MOD-HIT-file"},
		{"responses function output", "openai.responses",
			`{"input":[{"type":"function_call_output","call_id":"c","output":"MOD-HIT-fco"}]}`, "[tool] MOD-HIT-fco"},
		{"responses assistant item", "openai.responses",
			`{"input":[{"role":"assistant","content":[{"type":"output_text","text":"MOD-HIT-asst"}]},{"role":"user","content":"go on"}]}`, "[assistant] MOD-HIT-asst"},
		{"gemini system instruction", "gemini.generate",
			`{"systemInstruction":{"parts":[{"text":"MOD-HIT-gsys"}]},"contents":[{"parts":[{"text":"hi"}]}]}`, "[system] MOD-HIT-gsys"},
		{"gemini function response", "gemini.generate",
			`{"contents":[{"role":"function","parts":[{"functionResponse":{"name":"f","response":{"r":"MOD-HIT-fr"}}}]}]}`, "[tool] MOD-HIT-fr"},
		{"gemini model turn", "gemini.generate",
			`{"contents":[{"role":"model","parts":[{"text":"MOD-HIT-model"}]},{"parts":[{"text":"ok"}]}]}`, "[assistant] MOD-HIT-model"},
		{"tool definitions", "openai.chat",
			`{"messages":[{"role":"user","content":"hi"}],"tools":[{"type":"function","function":{"name":"f","description":"MOD-HIT-tooldef","parameters":{"type":"object"}}}]}`, "[tools] f MOD-HIT-tooldef"},
		{"volcengine image prompt", "volcengine.images", `{"model":"seedream","prompt":"MOD-HIT-image"}`, "MOD-HIT-image"},
		{"volcengine video content", "volcengine.video_submit", `{"model":"seedance","content":[{"type":"text","text":"MOD-HIT-video"}]}`, "MOD-HIT-video"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := allText(extractReq(t, tc.protocol, tc.body)); !strings.Contains(got, tc.want) {
				t.Fatalf("text = %q, want %q in it", got, tc.want)
			}
		})
	}
}

func TestExtractImagesAndDedup(t *testing.T) {
	png1 := "iVBORw0KGgo="
	r := extractReq(t, "anthropic.messages", `{"messages":[
		{"role":"user","content":[{"type":"text","text":"same reminder"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"`+png1+`"}}]},
		{"role":"assistant","content":"a"},
		{"role":"user","content":[{"type":"text","text":"same   reminder"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"`+png1+`"}},{"type":"image","source":{"type":"url","url":"https://x/y.png"}}]}]}`)
	if r.images != 2 || !r.hasURL || allText(r) != "same reminder | [assistant] a" {
		t.Fatalf("images %d url %v text %q", r.images, r.hasURL, allText(r))
	}
	chat := extractReq(t, "openai.chat", `{"messages":[{"role":"user","content":[{"type":"image_url","image_url":{"url":"data:image/png;base64,`+png1+`"}}]}]}`)
	if chat.images != 1 || chat.segs[0].img.MediaType != "image/png" || chat.segs[0].img.Data != png1 {
		t.Fatalf("chat image = %+v", chat.segs)
	}
	resp := extractReq(t, "openai.responses", `{"input":[{"role":"user","content":[{"type":"input_image","image_url":"https://a/b.png"}]}]}`)
	if resp.images != 1 || resp.segs[0].img.URL != "https://a/b.png" {
		t.Fatalf("responses image = %+v", resp.segs)
	}
	gem := extractReq(t, "gemini.generate", `{"contents":[{"parts":[{"inlineData":{"mimeType":"image/jpeg","data":"abc"}},{"fileData":{"mimeType":"image/png","fileUri":"gs://x"}}]}]}`)
	if gem.images != 2 {
		t.Fatalf("gemini images = %d", gem.images)
	}
	// The same content hashes the same whatever the whitespace.
	a := extractReq(t, "openai.chat", `{"messages":[{"role":"user","content":"one two"}]}`)
	b := extractReq(t, "openai.chat", `{"messages":[{"role":"user","content":"one   two"}]}`)
	if a.hash != b.hash {
		t.Fatal("same normalized text must hash the same")
	}
}

// Text with NUL, other control characters, zero-width characters or
// invalid UTF-8 normalizes to what a PostgreSQL text column accepts.
func TestNormalizeText(t *testing.T) {
	for _, tc := range []struct {
		in    []string
		limit int
		want  string
	}{
		{[]string{"  a \n b ", "c"}, 0, "a b c"},
		{[]string{"abcdef"}, 3, "abc"},
		{[]string{"ab", "cd"}, 3, "ab "},
		{[]string{"MOD\x00-HIT\x00-sexual"}, 0, "MOD-HIT-sexual"},
		{[]string{"k" + string(rune(0x200B)) + "i" + string(rune(0x200D)) + "l" + string(rune(0xFEFF)) + "l\x07"}, 0, "kill"},
		{[]string{"bad \xff\xfe utf8"}, 0, "bad �� utf8"},
	} {
		if got := normalizeText(tc.in, tc.limit); got != tc.want {
			t.Errorf("normalizeText(%q, %d) = %q, want %q", tc.in, tc.limit, got, tc.want)
		}
	}
	if got := pgText("a\x00b\xff"); got != "ab�" {
		t.Fatalf("pgText = %q", got)
	}
	doc := pgJSON([]byte(`{"reason":"x\u0000y","list":["\u0000"]}`))
	if strings.Contains(string(doc), `\u0000`) || !json.Valid(doc) {
		t.Fatalf("pgJSON = %s", doc)
	}
	if same := []byte(`{"a":"b"}`); string(pgJSON(same)) != string(same) {
		t.Fatal("a clean document is kept as it is")
	}
}

func planOf(r *request, maxChars, maxChunks, maxImages int, cached func([32]byte) bool) *plan {
	return r.makePlan(planLimits{maxChars: maxChars, maxChunks: maxChunks, maxImages: maxImages}, cached)
}

// Long content is moderated in chunks, not cut at input_max_chars: padding
// 12000 harmless characters in front of a violation no longer hides it.
func TestPlanChunksLongContent(t *testing.T) {
	pad := strings.Repeat("harmless ", 1400) // ~12600 runes
	r := extractReq(t, "anthropic.messages", `{"messages":[{"role":"user","content":"`+pad+`MOD-HIT-tail"}]}`)
	pl := planOf(r, 12000, 8, 8, nil)
	if pl.trace.ChunksTotal != 2 || pl.trace.Sampled || pl.pieces[0] != 2 {
		t.Fatalf("plan = %+v pieces %v", pl.trace, pl.pieces)
	}
	if !strings.Contains(pl.chunks[1].in.Text, "MOD-HIT-tail") || !strings.Contains(pl.chunks[0].in.Text, "harmless") {
		t.Fatal("the tail must be moderated")
	}
	for _, c := range pl.chunks {
		if n := len([]rune(c.in.Text)); n > 12000 {
			t.Fatalf("chunk of %d runes", n)
		}
	}
	// Small segments share a chunk.
	small := extractReq(t, "openai.chat", `{"messages":[{"role":"system","content":"s"},{"role":"user","content":"one"},{"role":"user","content":"two"}]}`)
	if sp := planOf(small, 12000, 8, 8, nil); len(sp.chunks) != 1 || sp.chunks[0].in.Text != "[system] s one two" {
		t.Fatalf("small = %+v", sp.chunks[0].in)
	}
}

// Beyond input_max_chunks the first, the last and evenly spread chunks run.
func TestPlanSamplesBeyondMaxChunks(t *testing.T) {
	var msgs []string
	for i := 0; i < 20; i++ {
		msgs = append(msgs, fmt.Sprintf(`{"role":"user","content":"m%02d %s"}`, i, strings.Repeat("x", 90)))
	}
	r := extractReq(t, "openai.chat", `{"messages":[`+strings.Join(msgs, ",")+`]}`)
	pl := planOf(r, 100, 4, 8, nil)
	if pl.trace.ChunksTotal != 20 || pl.trace.Chunks != 4 || !pl.trace.Sampled {
		t.Fatalf("plan = %+v", pl.trace)
	}
	if !strings.HasPrefix(pl.chunks[0].in.Text, "m00") || !strings.HasPrefix(pl.chunks[3].in.Text, "m19") {
		t.Fatalf("first and last chunks: %q %q", pl.chunks[0].in.Text[:3], pl.chunks[3].in.Text[:3])
	}
	for _, tc := range []struct{ n, k int }{{20, 4}, {9, 8}, {3, 2}, {100, 32}, {5, 1}} {
		got := spread(tc.n, tc.k)
		if len(got) != tc.k || got[len(got)-1] != tc.n-1 || (tc.k > 1 && got[0] != 0) || !slices.IsSorted(got) || len(slices.Compact(slices.Clone(got))) != tc.k {
			t.Errorf("spread(%d,%d) = %v", tc.n, tc.k, got)
		}
	}
}

// Segments in the pass cache are not sent again: a conversation only
// moderates what is new each turn.
func TestPlanSkipsCachedSegments(t *testing.T) {
	turn1 := extractReq(t, "anthropic.messages", `{"system":"sys","messages":[{"role":"user","content":"hello"}]}`)
	cached := map[[32]byte]bool{}
	for _, s := range turn1.segs {
		cached[s.key] = true
	}
	turn2 := extractReq(t, "anthropic.messages", `{"system":"sys","messages":[{"role":"user","content":"hello"},{"role":"assistant","content":"hi"},{"role":"user","content":"MOD-HIT-new"}]}`)
	pl := planOf(turn2, 12000, 8, 8, func(h [32]byte) bool { return cached[h] })
	if len(pl.chunks) != 1 || pl.chunks[0].in.Text != "[assistant] hi MOD-HIT-new" || pl.trace.Cached != 2 {
		t.Fatalf("plan = %+v text %q", pl.trace, pl.chunks[0].in.Text)
	}
	all := planOf(turn1, 12000, 8, 8, func(h [32]byte) bool { return cached[h] })
	if len(all.chunks) != 0 || all.trace.Cached != 2 {
		t.Fatalf("fully cached = %+v", all.trace)
	}
}

func TestPlanImageLimit(t *testing.T) {
	var parts []string
	for i := 0; i < 5; i++ {
		parts = append(parts, fmt.Sprintf(`{"type":"image_url","image_url":{"url":"https://x/%d.png"}}`, i))
	}
	r := extractReq(t, "openai.chat", `{"messages":[{"role":"user","content":[`+strings.Join(parts, ",")+`]}]}`)
	pl := planOf(r, 12000, 8, 3, nil)
	if pl.trace.Images != 3 || pl.trace.DroppedImages != 2 {
		t.Fatalf("plan = %+v", pl.trace)
	}
	if none := planOf(r, 12000, 8, 0, nil); len(none.chunks) != 0 || none.trace.DroppedImages != 5 {
		t.Fatalf("no images = %+v", none.trace)
	}
}

// The record keeps the moderated chunk as chat messages, which the detail
// reads back.
func TestChunkMessagesRoundTrip(t *testing.T) {
	r := extractReq(t, "anthropic.messages", `{"system":"be nice","messages":[{"role":"user","content":[{"type":"text","text":"look"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"iVBORw0KGgo="}}]}]}`)
	pl := planOf(r, 12000, 8, 8, nil)
	raw := string(pl.chunks[0].messages())
	parts, ok := MessageParts("anthropic.messages", raw)
	if !ok || len(parts) != 3 || parts[0].Role != RoleSystem || parts[0].Text != "be nice" || parts[1].Text != "look" || parts[2].Type != "image" || parts[2].Kind != "base64" || parts[2].Src != "data:image/png;base64,iVBORw0KGgo=" {
		t.Fatalf("parts = %+v (%s)", parts, raw)
	}
	if got := MessageText("", raw); got != "be nice look [图片]" {
		t.Fatalf("text = %q", got)
	}
	// Records before 0.6.0 stored Gemini contents as sent.
	old, ok := MessageParts("gemini.generate", `[{"parts":[{"text":"g1"},{"inlineData":{"mimeType":"image/jpeg","data":"abc"}}]}]`)
	if !ok || len(old) != 2 || old[0].Role != RoleUser || old[0].Text != "g1" || old[1].Type != "image" {
		t.Fatalf("old gemini parts = %+v", old)
	}
}

func TestCombineTraces(t *testing.T) {
	pass := Trace{Final: Pass, Decider: -1, LatencyMs: 10}
	hitTr := Trace{Final: Hit, Decider: 0, LatencyMs: 30, Stages: []StageTrace{{Result: Hit, Outcomes: []Outcome{hit("sexual", 0.9)}}}}
	errTr := Trace{Final: Pass, Decider: -1, Errored: true, LatencyMs: 20}
	tr := combineTraces([]Trace{pass, errTr, hitTr})
	if tr.Final != Hit || tr.Chunk != 3 || !tr.Errored || tr.LatencyMs != 30 || len(tr.Chunks) != 2 || len(tr.runs()) != 3 {
		t.Fatalf("combined = %+v", tr)
	}
	if hc := tr.HitCategories(); len(hc) != 1 || hc[0].Category != "sexual" {
		t.Fatalf("hits = %+v", hc)
	}
	tr = combineTraces([]Trace{pass, errTr})
	if tr.Final != Pass || !tr.Errored || tr.Chunk != 2 {
		t.Fatalf("errored = %+v", tr)
	}
	if one := combineTraces([]Trace{pass}); one.Chunk != 0 || one.Chunks != nil {
		t.Fatalf("single = %+v", one)
	}
}
