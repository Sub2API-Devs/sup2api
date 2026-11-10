package moderation

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/gif"
	"slices"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
	"github.com/tidwall/gjson"
)

// The LLM auditors (llm_questions, llm_verdict) send the images of their
// input unless review_images is false (owner's decision, 2026-11-10).

// padded is image data (base64) grown to size bytes, ending in tail: bytes
// behind the end of an image do not change its header.
func padded(t testing.TB, data string, size int, tail byte) string {
	t.Helper()
	raw, err := base64.StdEncoding.DecodeString(data)
	if err != nil || size <= len(raw) {
		t.Fatalf("cannot pad %d bytes to %d (%v)", len(raw), size, err)
	}
	out := make([]byte, size)
	copy(out, raw)
	out[len(out)-1] = tail
	return b64(out)
}

// llmImageInput is a text with one image of every kind: a PNG, a JPEG
// without a declared type, the PNG again, a URL, an image over the size
// limit, one over the side limit and one of no known format. The first two
// are sent, the third counts as received with the first.
func llmImageInput(t testing.TB) (in *Input, pngData, jpegData string) {
	pngData, jpegData = encodePNG(t, filled(40, 30, red)), encodeJPEG(t, filled(50, 20, red))
	return &Input{Text: "the text", Images: []Image{
		{MediaType: "image/png", Data: pngData},
		{Data: jpegData},
		{MediaType: "image/png", Data: pngData},
		{URL: "https://x/y.png"},
		{MediaType: "image/png", Data: padded(t, pngData, llmImageMaxBytes+1, 0)},
		{MediaType: "image/png", Data: encodePNG(t, image.NewGray(image.Rect(0, 0, llmImageMaxSide+1, 1)))},
		{MediaType: "image/png", Data: b64([]byte("not an image at all"))},
	}}, pngData, jpegData
}

// llmUserContent is the content of the first user message of a request, in
// the shape of its protocol: a string, or the parts.
func llmUserContent(proto string, r protoReq) gjson.Result {
	switch proto {
	case ProtocolOpenAIResponses:
		return gjson.GetBytes(r.Body["input"], "0.content")
	case ProtocolAnthropic:
		return gjson.GetBytes(r.Body["messages"], "0.content")
	}
	return gjson.GetBytes(r.Body["messages"], "1.content")
}

// llmImagePart is an image part as the protocol takes it (the keys in the
// order encoding/json writes them).
func llmImagePart(proto, mediaType, data string) string {
	switch proto {
	case ProtocolOpenAIResponses:
		return `{"image_url":"data:` + mediaType + `;base64,` + data + `","type":"input_image"}`
	case ProtocolAnthropic:
		return `{"source":{"data":"` + data + `","media_type":"` + mediaType + `","type":"base64"},"type":"image"}`
	}
	return `{"image_url":{"url":"data:` + mediaType + `;base64,` + data + `"},"type":"image_url"}`
}

// llmAuditors runs both LLM auditor types on in over the channel of f, with
// the image switch as given: the question-table auditor and the verdict
// agent. The fake must answer both tools (llmAnyVerdict).
func llmAuditors(t *testing.T, f *fakeProto, images bool) map[string]func(in *Input) (EngineResult, error) {
	t.Helper()
	ch := llmqChannel(f)
	def, _ := DefaultQuestions(nil)
	verdict, err := compileAuditor(1, "v", AuditorLLMVerdict, 1, AuditorConfig{ReviewImages: &images}, ch, &def)
	if err != nil {
		t.Fatal(err)
	}
	p := &Plugin{agent: newAgent()}
	return map[string]func(in *Input) (EngineResult, error){
		AuditorLLMQuestions: func(in *Input) (EngineResult, error) {
			return llmQuestionsAudit(context.Background(), ch, llmqQuestions(), images, in, nil)
		},
		AuditorLLMVerdict: func(in *Input) (EngineResult, error) { return p.llmAudit(context.Background(), verdict, in) },
	}
}

// llmAnyVerdict answers either auditor type with a pass: the arguments hold
// the answers of the question table and the verdict of the agent.
func llmAnyVerdict() scriptTurn {
	return verdictCall(`{"q1":false,"q2":false,"reason":"fine","verdict":"pass","categories":[]}`)
}

// hasImagePart reports whether a request body carries an image part.
func hasImagePart(r protoReq) bool {
	body, _ := json.Marshal(r.Body)
	return bytes.Contains(body, []byte(`"image_url"`)) || bytes.Contains(body, []byte(`"type":"image"`))
}

func TestLLMAuditorsSendImages(t *testing.T) {
	in, pngData, jpegData := llmImageInput(t)
	for _, proto := range []string{ProtocolOpenAIChat, ProtocolOpenAIResponses, ProtocolAnthropic} {
		f := newFakeProto(t, proto, func(int, protoReq) (int, scriptTurn) { return 200, llmAnyVerdict() })
		for typ, audit := range llmAuditors(t, f, true) {
			t.Run(proto+"/"+typ, func(t *testing.T) {
				before := len(f.requests())
				res, err := audit(in)
				if err != nil {
					t.Fatal(err)
				}
				// Two parts for the three images that were received (the PNG
				// stands for its duplicate); the other four were skipped.
				if res.SentImages != 2 || res.SkippedImages != 5 || !slices.Equal(res.received, []int{0, 1, 2}) || res.Calls != 1 {
					t.Fatalf("result = %+v", res)
				}
				reqs := f.requests()[before:]
				if len(reqs) != 1 {
					t.Fatalf("%d calls, want one", len(reqs))
				}
				parts := llmUserContent(proto, reqs[0]).Array()
				textType := "text"
				if proto == ProtocolOpenAIResponses {
					textType = "input_text"
				}
				if len(parts) != 3 || parts[0].Get("type").String() != textType || !strings.Contains(parts[0].Get("text").String(), "the text") {
					t.Fatalf("user message = %.300s", llmUserContent(proto, reqs[0]).Raw)
				}
				// The images follow the text, each in the shape of the
				// protocol; the type of the JPEG is read from its header.
				if parts[1].Raw != llmImagePart(proto, "image/png", pngData) || parts[2].Raw != llmImagePart(proto, "image/jpeg", jpegData) {
					t.Fatalf("image parts = %.300s\n%.300s", parts[1].Raw, parts[2].Raw)
				}
				// The marker is in the text part: the hook knows the call as
				// its own.
				if !isSelfRequest(markerKey("sk-x"), parts[0].Get("text").String()) {
					t.Fatal("the text part carries no self-request marker")
				}
			})
		}
	}
}

func TestLLMImageLimits(t *testing.T) {
	small := encodePNG(t, filled(40, 30, red))
	sent := func(images ...Image) (types []string, received []int) {
		parts, received := llmImages(&Input{Images: images})
		for _, p := range parts {
			if p.URL != "" || p.Data == "" {
				t.Fatalf("part = %+v", p)
			}
			types = append(types, p.MediaType)
		}
		return types, received
	}
	inline := func(data ...string) (images []Image) {
		for _, d := range data {
			images = append(images, Image{Data: d})
		}
		return images
	}

	// The four formats, by their header: a wrong declared type is corrected,
	// a missing one filled in. Anything else is skipped.
	var g bytes.Buffer
	if err := gif.Encode(&g, image.NewPaletted(image.Rect(0, 0, 4, 4), color.Palette{white, red}), nil); err != nil {
		t.Fatal(err)
	}
	types, received := sent(Image{MediaType: "image/jpeg", Data: small}, Image{MediaType: "image/png", Data: encodeJPEG(t, filled(8, 8, red))},
		Image{Data: b64(g.Bytes())}, Image{Data: b64(tinyWebP)}, Image{MediaType: "image/png", Data: b64([]byte("GIF but not really"))},
		Image{MediaType: "image/bmp", Data: b64([]byte("BM\x00\x00\x00\x00"))}, Image{URL: "https://x/y.png"}, Image{MediaType: "image/png", Data: "@@@"},
		Image{URL: "https://x/z.png", Data: encodePNG(t, filled(9, 9, red))}) // an image by reference is one, whatever else it holds
	if strings.Join(types, " ") != "image/png image/jpeg image/gif image/webp" || !slices.Equal(received, []int{0, 1, 2, 3}) {
		t.Fatalf("formats: sent %v, received %v", types, received)
	}

	// The size limit is on the decoded image, read off the length of the
	// base64 (with one, two or no padding characters): exactly the limit is
	// sent, a byte more is not.
	atLimit, over := padded(t, small, llmImageMaxBytes, 1), padded(t, small, llmImageMaxBytes+1, 1)
	for size := 1; size <= 7; size++ {
		if got := decodedLen(b64(make([]byte, size))); got != size {
			t.Fatalf("decodedLen of %d bytes = %d", size, got)
		}
	}
	if decodedLen("") != 0 || decodedLen(atLimit) != llmImageMaxBytes || decodedLen(over) != llmImageMaxBytes+1 {
		t.Fatalf("decodedLen = %d, %d, %d", decodedLen(""), decodedLen(atLimit), decodedLen(over))
	}
	if types, received := sent(inline(over, atLimit, padded(t, small, llmImageMaxBytes-1, 1))...); len(types) != 2 || !slices.Equal(received, []int{1, 2}) {
		t.Fatalf("size limit: sent %v, received %v", types, received)
	}

	// 8000 px on either side is sent, 8001 is not.
	wide := func(w, h int) string { return encodePNG(t, image.NewGray(image.Rect(0, 0, w, h))) }
	if types, received := sent(inline(wide(llmImageMaxSide+1, 1), wide(1, llmImageMaxSide+1), wide(llmImageMaxSide, 2), wide(2, llmImageMaxSide))...); len(types) != 2 ||
		!slices.Equal(received, []int{2, 3}) {
		t.Fatalf("side limit: sent %v, received %v", types, received)
	}

	// Identical images are sent once and all count as received; the copy of
	// an image that was skipped is skipped too.
	if types, received := sent(inline(small, over, small, over, small)...); len(types) != 1 || !slices.Equal(received, []int{0, 2, 4}) {
		t.Fatalf("duplicates: sent %v, received %v", types, received)
	}

	// The images of a call together stay within llmImagesMaxBase64: the one
	// that does not fit is skipped, a smaller one after it still goes.
	var album []Image
	each := 4<<20 - 4096 // characters of base64
	fit := llmImagesMaxBase64 / each
	for i := range fit + 1 {
		album = append(album, Image{Data: padded(t, small, each/4*3, byte(i+1))})
	}
	album = append(album, Image{Data: small})
	want := make([]int, 0, fit+1)
	for i := range fit {
		want = append(want, i)
	}
	want = append(want, fit+1)
	if types, received := sent(album...); len(types) != fit+1 || !slices.Equal(received, want) {
		t.Fatalf("total limit: sent %d, received %v, want %v", len(types), received, want)
	}

	// At most llmMaxImages go in one call.
	var many []Image
	for i := range llmMaxImages + 2 {
		many = append(many, Image{Data: encodePNG(t, filled(4, 4+i, red))})
	}
	if types, received := sent(many...); len(types) != llmMaxImages || len(received) != llmMaxImages || received[llmMaxImages-1] != llmMaxImages-1 {
		t.Fatalf("image count: sent %d, received %v", len(types), received)
	}
}

// With review_images false nothing changes for an LLM auditor: no image
// part, every image counted as skipped, images alone are no input.
func TestLLMAuditorsImagesOff(t *testing.T) {
	in, _, _ := llmImageInput(t)
	for _, proto := range []string{ProtocolOpenAIChat, ProtocolOpenAIResponses, ProtocolAnthropic} {
		f := newFakeProto(t, proto, func(int, protoReq) (int, scriptTurn) { return 200, llmAnyVerdict() })
		for typ, audit := range llmAuditors(t, f, false) {
			t.Run(proto+"/"+typ, func(t *testing.T) {
				before := len(f.requests())
				res, err := audit(in)
				if err != nil || res.SentImages != 0 || res.SkippedImages != len(in.Images) || res.received != nil || res.Calls != 1 {
					t.Fatalf("text and images: %+v %v", res, err)
				}
				reqs := f.requests()[before:]
				if len(reqs) != 1 || hasImagePart(reqs[0]) {
					t.Fatalf("%d calls, an image part in the first: %v", len(reqs), len(reqs) > 0 && hasImagePart(reqs[0]))
				}
				// The user message is the plain string it always was.
				if c := llmUserContent(proto, reqs[0]); c.Type != gjson.String || !strings.Contains(c.String(), "the text") {
					t.Fatalf("user message = %.300s", c.Raw)
				}
				res, err = audit(&Input{Images: in.Images})
				if !errors.Is(err, ErrNoInput) || res.Calls != 0 || res.SkippedImages != len(in.Images) || res.SentImages != 0 || len(f.requests()) != before+1 {
					t.Fatalf("images only: %+v %v, %d calls", res, err, len(f.requests())-before-1)
				}
			})
		}
	}
}

// Images alone are an input of an LLM auditor that takes images: the call
// goes out with the marker text and the image. With nothing it can send -
// a URL image, an image outside the limits - there is no input.
func TestLLMAuditorsImageOnlyInput(t *testing.T) {
	in, pngData, _ := llmImageInput(t)
	f := newFakeProto(t, ProtocolAnthropic, func(int, protoReq) (int, scriptTurn) { return 200, llmAnyVerdict() })
	for typ, audit := range llmAuditors(t, f, true) {
		t.Run(typ, func(t *testing.T) {
			before := len(f.requests())
			res, err := audit(&Input{Images: in.Images[:1]})
			if err != nil || res.SentImages != 1 || res.SkippedImages != 0 || !slices.Equal(res.received, []int{0}) || res.Calls != 1 || res.Scores == nil {
				t.Fatalf("one image: %+v %v", res, err)
			}
			reqs := f.requests()[before:]
			if parts := llmUserContent(ProtocolAnthropic, reqs[0]).Array(); len(reqs) != 1 || len(parts) != 2 ||
				parts[1].Raw != llmImagePart(ProtocolAnthropic, "image/png", pngData) || !isSelfRequest(markerKey("sk-x"), parts[0].Get("text").String()) {
				t.Fatalf("%d calls, user message = %.300s", len(reqs), llmUserContent(ProtocolAnthropic, reqs[0]).Raw)
			}
			res, err = audit(&Input{Images: in.Images[3:]})
			if !errors.Is(err, ErrNoInput) || res.Calls != 0 || res.SkippedImages != 4 || len(f.requests()) != before+1 {
				t.Fatalf("no sendable image: %+v %v", res, err)
			}
		})
	}
}

// An upstream that answers the call with images 400 is asked once more with
// the text alone: the verdict is of that call, and no image was received.
// Nothing else is retried.
func TestLLMAuditorsImagesRefused(t *testing.T) {
	in, _, _ := llmImageInput(t)
	for _, proto := range []string{ProtocolOpenAIChat, ProtocolOpenAIResponses, ProtocolAnthropic} {
		status := 400
		f := newFakeProto(t, proto, func(_ int, r protoReq) (int, scriptTurn) {
			if hasImagePart(r) {
				return status, scriptTurn{}
			}
			return 200, verdictCall(`{"q1":true,"q2":false,"reason":"the text alone","verdict":"block","categories":["sexual"]}`)
		})
		for typ, audit := range llmAuditors(t, f, true) {
			t.Run(proto+"/"+typ, func(t *testing.T) {
				status = 400
				before := len(f.requests())
				res, err := audit(in)
				if err != nil || res.SentImages != 0 || res.SkippedImages != len(in.Images) || res.received != nil || res.Calls != 2 ||
					res.Scores["sexual"] != 1 || res.Reason != "the text alone" {
					t.Fatalf("refused images: %+v %v", res, err)
				}
				reqs := f.requests()[before:]
				if len(reqs) != 2 || !hasImagePart(reqs[0]) || hasImagePart(reqs[1]) {
					t.Fatalf("%d calls", len(reqs))
				}
				if c := llmUserContent(proto, reqs[1]); c.Type != gjson.String || !strings.Contains(c.String(), "the text") {
					t.Fatalf("the retry sent %.300s", c.Raw)
				}
				// Images alone: with the images refused nothing is left.
				before = len(f.requests())
				res, err = audit(&Input{Images: in.Images[:2]})
				if !errors.Is(err, ErrNoInput) || res.SentImages != 0 || res.SkippedImages != 2 || res.received != nil || res.Calls != 1 || len(f.requests()) != before+1 {
					t.Fatalf("refused images, no text: %+v %v (%d calls)", res, err, len(f.requests())-before)
				}
				// Any other failure is the result of the call.
				for _, other := range []int{413, 429, 500} {
					status = other
					before = len(f.requests())
					res, err = audit(in)
					if upstreamStatus(err) != other || len(f.requests()) != before+1 || res.Calls != 1 {
						t.Fatalf("status %d: %+v %v (%d calls)", other, res, err, len(f.requests())-before)
					}
				}
			})
		}
	}
	// A 400 to a call without images is not repeated either.
	f := newFakeProto(t, ProtocolOpenAIChat, func(int, protoReq) (int, scriptTurn) { return 400, scriptTurn{} })
	for typ, audit := range llmAuditors(t, f, true) {
		before := len(f.requests())
		if _, err := audit(&Input{Text: "text"}); upstreamStatus(err) != 400 || len(f.requests()) != before+1 {
			t.Fatalf("%s: a 400 without images: %v (%d calls)", typ, err, len(f.requests())-before)
		}
	}
}

// The verdict agent sends the images in its first user message only, keeps
// them there over the turns, and repeats a call at most once for each
// reason - the temperature the model refuses, the images the upstream
// answers 400 - in whichever order they come up: max_turns + 2 calls at most.
func TestAgentImagesAndRetries(t *testing.T) {
	img := Image{MediaType: "image/png", Data: encodePNG(t, filled(40, 30, red))}
	imageOf := func(m map[string]any) bool {
		parts, _ := m["content"].([]any)
		for _, p := range parts {
			if part, _ := p.(map[string]any); part["type"] == "image_url" {
				return true
			}
		}
		return false
	}
	firstUser := func(r fakeReq) map[string]any { return r.Messages[1] } // after the system message
	refuse := func(what string) (int, any) {
		return 400, map[string]any{"error": map[string]any{"message": what}}
	}
	temperature := func(r fakeReq) bool { _, sent := r.Raw["temperature"]; return sent }

	// Three turns: the images stay in the first user message, the later
	// user messages are plain.
	llm := newFakeLLM(t, func(_ fakeReq, n int) (int, any) {
		if n < 3 {
			return 200, textResp("hmm")
		}
		return 200, toolCallResp("c", ToolName, verdictFor(""))
	})
	res, err := newAgent().run(context.Background(), testConfig(llm.srv.URL, nil), "text", false, img)
	if err != nil || res.Turns != 3 || res.ImagesRefused || len(llm.reqs()) != 3 {
		t.Fatalf("three turns: %+v %v (%d calls)", res, err, len(llm.reqs()))
	}
	for i, r := range llm.reqs() {
		if !imageOf(firstUser(r)) {
			t.Fatalf("call %d: the first user message has no image", i)
		}
		for _, m := range r.Messages[2:] {
			if imageOf(m) {
				t.Fatalf("call %d: an image in a later message", i)
			}
		}
	}

	for _, tc := range []struct {
		name string
		// first: what the upstream complains about when a call has both.
		first string
	}{{"temperature first", "temperature"}, {"images first", "image"}} {
		t.Run(tc.name, func(t *testing.T) {
			llm := newFakeLLM(t, func(r fakeReq, _ int) (int, any) {
				hasImage, hasTemp := imageOf(firstUser(r)), temperature(r)
				switch {
				case hasTemp && (!hasImage || tc.first == "temperature"):
					return refuse("`temperature` is deprecated for this model.")
				case hasImage:
					return refuse("Could not process image")
				case len(r.Messages) < 4:
					return 200, textResp("hmm")
				}
				return 200, toolCallResp("c", ToolName, verdictFor(r.Messages[1]["content"].(string)))
			})
			c := testConfig(llm.srv.URL, func(s *AuditorConfig) { s.MaxTurns = 2 })
			res, err := newAgent().run(context.Background(), c, "please MOD-BLOCK", false, img)
			if err != nil || res.Verdict.Verdict != VerdictBlock || res.Turns != 2 || !res.ImagesRefused {
				t.Fatalf("res = %+v, err = %v", res, err)
			}
			// Turn one: the call, one more without the temperature and one
			// more without the images. Turn two: one call.
			reqs := llm.reqs()
			if len(reqs) != c.maxTurns+2 {
				t.Fatalf("%d upstream calls, want max_turns + 2 = %d", len(reqs), c.maxTurns+2)
			}
			if !imageOf(firstUser(reqs[0])) || !temperature(reqs[0]) || imageOf(firstUser(reqs[2])) || temperature(reqs[2]) ||
				imageOf(firstUser(reqs[3])) || temperature(reqs[3]) {
				t.Fatal("the retries did not drop the temperature and the images one after the other")
			}
			// The next run of the auditor: the temperature stays out, the
			// images are tried again (one more call than turns).
			res, err = newAgent().run(context.Background(), c, "please MOD-BLOCK", false, img)
			if err != nil || res.Turns != 2 || !res.ImagesRefused || len(llm.reqs()) != len(reqs)+3 {
				t.Fatalf("second run: %+v %v (%d calls)", res, err, len(llm.reqs())-len(reqs))
			}
		})
	}

	// An upstream that refuses everything: the call, one without the
	// images, and the error.
	always := newFakeLLM(t, func(fakeReq, int) (int, any) { return refuse("max_tokens is too large") })
	if res, err := newAgent().run(context.Background(), testConfig(always.srv.URL, nil), "hello", false, img); upstreamStatus(err) != 400 ||
		len(always.reqs()) != 2 || !res.ImagesRefused {
		t.Fatalf("err = %v, calls = %d", err, len(always.reqs()))
	}
	// Images alone, refused: nothing is left to judge.
	if _, err := newAgent().run(context.Background(), testConfig(always.srv.URL, nil), "", false, img); !errors.Is(err, ErrNoInput) || len(always.reqs()) != 3 {
		t.Fatalf("images alone: err = %v, calls = %d", err, len(always.reqs()))
	}
}

// The fixed instructions of both LLM auditors say that the images are judged.
func TestLLMPromptsNameTheImages(t *testing.T) {
	if sys := llmqSystem(llmqQuestions()); !strings.Contains(sys, "消息里附带的图片同样是待审内容") {
		t.Fatalf("llm_questions instructions:\n%s", sys)
	}
	if !strings.Contains(DefaultSystemPrompt, "消息里附带的图片同样是待审核的输入") {
		t.Fatalf("llm_verdict default prompt:\n%s", DefaultSystemPrompt)
	}
}

// ---------------------------------------------------------------- in a flow

// llmImageFlow is a flow in which every auditor takes images: the OpenAI
// auditor of imageMod (every image violates) and a question-table LLM
// reviewer that confirms a request whose text says CONFIRM and passes
// anything else. It returns the reviewer and the bodies of its calls.
func llmImageFlow(t *testing.T, h *pluginsdktest.Harness, modBase string, group int64) (reviewer AuditorView, flow int64, reviewed func() []protoReq) {
	t.Helper()
	llm := newFakeProto(t, ProtocolAnthropic, func(_ int, r protoReq) (int, scriptTurn) {
		if strings.Contains(llmUserContent(ProtocolAnthropic, r).Raw, "CONFIRM") {
			return 200, verdictCall(`{"q1":true,"q2":false,"reason":"confirmed"}`)
		}
		return 200, verdictCall(`{"q1":false,"q2":false,"reason":"nothing wrong"}`)
	})
	oc := decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": ChannelOpenAI, "name": "o", "base_url": modBase, "api_key": "k1"}))
	lc := decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": ChannelLLM, "protocol": ProtocolAnthropic, "name": "l",
		"base_url": llm.srv.URL, "model": "m1", "api_key": "k2"}))
	oa := decodeData[AuditorView](t, h.Do("POST", "/auditors", nil, map[string]any{"name": "o", "type": AuditorOpenAI, "channel_id": oc.ID}))
	reviewer = decodeData[AuditorView](t, h.Do("POST", "/auditors", nil, map[string]any{"name": "q", "type": AuditorLLMQuestions, "channel_id": lc.ID,
		"config": map[string]any{"questions": llmqQuestions()}}))
	flow = publishFlow(t, h, Spec{Stages: []Stage{stageOf(false, oa.ID), stageOf(false, reviewer.ID)}}, group)
	return reviewer, flow, llm.requests
}

// A hit of the first stage on an image is reviewed by an LLM auditor that
// gets the image too: its pass overturns the hit and is stored for the image,
// its hit confirms it. Such a flow is not mixed, so an image that is not
// cached does not bring the cached text of its request back into the plan.
func TestLLMReviewerSeesTheImage(t *testing.T) {
	base, _, calls := imageMod(t)
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce, "record_pass": true})
	reviewer, flow, reviewed := llmImageFlow(t, h, base, 9)
	if snap := p.snap.Load(); snap.mixedImages(snap.flows[flow]) || !snap.sendsImages(snap.flows[flow]) {
		t.Fatal("a flow of an OpenAI auditor and an LLM auditor with images on is mixed, or sends no images")
	}
	const cachedPass = notePrefix + "pass (cached)"
	picture := func(n int) (data string, part map[string]any) {
		data = encodePNG(t, filled(60, 40+n, red))
		return data, map[string]any{"type": "image", "source": map[string]any{"type": "base64", "media_type": "image/png", "data": data}}
	}
	text := func(s string) map[string]any { return map[string]any{"type": "text", "text": s} }
	send := func(rid string, content ...any) *pluginv1.GatewayRequestHookResponse {
		t.Helper()
		b, _ := json.Marshal(map[string]any{"messages": []any{map[string]any{"role": "user", "content": content}}})
		r := mustHook(t, h, rawReq(3, rid, "anthropic.messages", string(b)))
		written(t, p)
		return r
	}
	// made checks that n upstream calls were made since it was last asked
	// (the OpenAI auditor's and the reviewer's); last is the user message of
	// the latest review call.
	var seen int64
	made := func(n int64) {
		t.Helper()
		total := calls.Load() + int64(len(reviewed()))
		if total-seen != n {
			t.Fatalf("%d upstream calls, want %d", total-seen, n)
		}
		seen = total
	}
	last := func() gjson.Result {
		reqs := reviewed()
		return llmUserContent(ProtocolAnthropic, reqs[len(reqs)-1])
	}

	t.Run("overturned and stored as passed", func(t *testing.T) {
		data, image := picture(1)
		r := send("overturn", text("a harmless caption"), image)
		if denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+ResultOverturned+" flow=") {
			t.Fatalf("first = %+v", r)
		}
		// The reviewer got the text and the image.
		made(2)
		parts := last().Array()
		if len(parts) != 2 || !strings.Contains(parts[0].Get("text").String(), "a harmless caption") || parts[1].Raw != llmImagePart(ProtocolAnthropic, "image/png", data) {
			t.Fatalf("the review call sent %.300s", parts)
		}
		tr := traceOf(t, recordOf(t, h, "overturn"))
		if o := tr.Stages[1].Outcomes[0]; len(tr.Stages) != 2 || o.SentImages != 1 || o.SkippedImages != 0 || o.Hit {
			t.Fatalf("trace = %+v", tr.Stages)
		}
		// The passing auditor received the image: text and image are cached
		// passes, and the same request calls nothing.
		if segs := flowSegs(t, fh, flow); segs != 2 {
			t.Fatalf("%d segment keys of the flow", segs)
		}
		if r := send("", text("a harmless caption"), image); r.GetNote() != cachedPass {
			t.Fatalf("the same request again = %+v", r)
		}
		made(0)
	})

	t.Run("confirmed and refused", func(t *testing.T) {
		_, image := picture(2)
		r := send("confirm", text("CONFIRM this caption"), image)
		if !denied(r) || replayed(r) {
			t.Fatalf("first = %+v", r)
		}
		made(2)
		if parts := last().Array(); len(parts) != 2 || parts[1].Get("type").String() != "image" {
			t.Fatalf("the review call sent %.300s", parts)
		}
		// The hit set is the text and the image; the next one is replayed.
		if tr := traceOf(t, recordOf(t, h, "confirm")); tr.Cache == nil || len(tr.Cache.Segs) != 2 {
			t.Fatalf("hit set = %+v", tr.Cache)
		}
		if r := send("", text("CONFIRM this caption"), image); !denied(r) || !replayed(r) {
			t.Fatalf("the same request again = %+v", r)
		}
		made(0)
	})

	t.Run("cached text is left out", func(t *testing.T) {
		// The fifth-round sequence: the text is cached as passed by a
		// request of its own, then comes the request with the image.
		data, image := picture(3)
		caption := text("a caption other requests cache")
		if r := send("", caption); denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+"pass flow=") {
			t.Fatalf("the text alone = %+v", r)
		}
		made(1) // the OpenAI auditor passed it: no review
		r := send("alone", caption, image)
		if denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+ResultOverturned+" flow=") {
			t.Fatalf("the text and the image = %+v", r)
		}
		// The image went alone, to both auditors: the reviewer judged it
		// without the text, which had passed.
		made(2)
		parts := last().Array()
		if len(parts) != 2 || strings.Contains(parts[0].Get("text").String(), "a caption other requests cache") || parts[1].Raw != llmImagePart(ProtocolAnthropic, "image/png", data) {
			t.Fatalf("the review call sent %.300s", parts)
		}
		if tr := traceOf(t, recordOf(t, h, "alone")); tr.Input.Cached != 1 || tr.Input.Images != 1 || tr.Input.Chars != 0 {
			t.Fatalf("input = %+v", tr.Input)
		}
		// The same verdict every time; the image has passed with the reviewer.
		for range 2 {
			if r := send("", caption, image); r.GetNote() != cachedPass {
				t.Fatalf("again = %+v", r)
			}
		}
		made(0)
	})

	t.Run("try and test report the images", func(t *testing.T) {
		data, _ := picture(4)
		body := map[string]any{"text": "a caption", "images": []string{"data:image/png;base64," + data, "https://x/y.png"}}
		try := decodeData[TryResult](t, h.Do("POST", fmt.Sprintf("/auditors/%d/try", reviewer.ID), nil, body))
		if try.Error != "" || try.SentImages != 1 || try.SkippedImages != 1 || try.Hit {
			t.Fatalf("try = %+v", try)
		}
		reqs := reviewed()
		if parts := llmUserContent(ProtocolAnthropic, reqs[len(reqs)-1]).Array(); len(parts) != 2 || parts[1].Raw != llmImagePart(ProtocolAnthropic, "image/png", data) {
			t.Fatalf("the try sent %.300s", parts)
		}
		// The unsaved switch of a draft is tried as it is.
		body["draft"] = map[string]any{"config": map[string]any{"questions": llmqQuestions(), "review_images": false}}
		try = decodeData[TryResult](t, h.Do("POST", fmt.Sprintf("/auditors/%d/try", reviewer.ID), nil, body))
		if try.Error != "" || try.SentImages != 0 || try.SkippedImages != 2 || hasImagePart(reviewed()[len(reqs)]) {
			t.Fatalf("try with the images off = %+v", try)
		}
		delete(body, "draft")
		body["flow_id"] = flow
		test := decodeData[TestResult](t, h.Do("POST", "/test", nil, body))
		if test.Result != ResultOverturned || len(test.Trace.Stages) != 2 {
			t.Fatalf("test = %+v", test)
		}
		if o := test.Trace.Stages[1].Outcomes[0]; o.SentImages != 1 || o.SkippedImages != 1 {
			t.Fatalf("test, the reviewer's outcome = %+v", o.EngineResult)
		}
	})

	t.Run("the switch is part of the fingerprint", func(t *testing.T) {
		fp := func() string { return p.snap.Load().flows[flow].fp }
		before := fp()
		decodeData[AuditorView](t, h.Do("PUT", fmt.Sprintf("/auditors/%d", reviewer.ID), nil, map[string]any{"name": "q", "type": AuditorLLMQuestions,
			"channel_id": reviewer.ChannelID, "config": map[string]any{"questions": llmqQuestions(), "review_images": false}}))
		snap := p.snap.Load()
		if fp() == before || !snap.mixedImages(snap.flows[flow]) || snap.auditors[reviewer.ID].images {
			t.Fatalf("review_images false: fingerprint %s -> %s, mixed %v", before, fp(), snap.mixedImages(snap.flows[flow]))
		}
		// The reviewer now gets the text alone, and what it passes is not
		// stored for the image.
		data, image := picture(5)
		r := send("blind", text("a caption for the blind reviewer"), image)
		if denied(r) || !strings.HasPrefix(r.GetNote(), notePrefix+ResultOverturned+" flow=") {
			t.Fatalf("with the images off = %+v", r)
		}
		reqs := reviewed()
		if hasImagePart(reqs[len(reqs)-1]) || strings.Contains(string(reqs[len(reqs)-1].Body["messages"]), data) {
			t.Fatal("the reviewer got the image although its switch is off")
		}
		if tr := traceOf(t, recordOf(t, h, "blind")); tr.Stages[1].Outcomes[0].SentImages != 0 || tr.Stages[1].Outcomes[0].SkippedImages != 1 {
			t.Fatalf("trace = %+v", tr.Stages[1].Outcomes[0].EngineResult)
		}
		if r := send("", text("a caption for the blind reviewer"), image); r.GetNote() == cachedPass || denied(r) {
			t.Fatalf("again with the images off = %+v", r)
		}
	})
}
