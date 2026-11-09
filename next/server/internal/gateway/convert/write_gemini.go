package convert

import "strings"

// geminiWriter writes generateContent replies (CONVERT-MATRIX §9.8): one
// chunk per Write call holding the parts it produced, consecutive text
// (or thought) increments merged into one part, a tool call sent whole
// when its block stops; the last chunk carries finishReason and
// usageMetadata. Citations and reasoning state have no Gemini form.
type geminiWriter struct {
	writerBase
	parts []jmap // parts of the next chunk
}

func newGeminiWriter(o respOpts) Writer {
	w := &geminiWriter{}
	w.init(w, writerCaps{images: true}, o)
	return w
}

func geminiUsage(u Usage) *geminiUsageJSON {
	return &geminiUsageJSON{PromptTokenCount: u.Input, CandidatesTokenCount: max(0, u.Output-u.Reasoning),
		ThoughtsTokenCount: u.Reasoning, CachedContentTokenCount: u.CacheRead, TotalTokenCount: u.Input + u.Output}
}

func geminiFinishReason(f Finish) string {
	switch f.Reason {
	case FinishLength:
		return "MAX_TOKENS"
	case FinishFilter:
		return "SAFETY"
	case FinishError:
		return "OTHER"
	}
	return "STOP"
}

// addText appends text to the last part when it is of the same kind.
func (w *geminiWriter) addText(text string, thought bool) {
	if text == "" {
		return
	}
	if n := len(w.parts); n > 0 {
		last := w.parts[n-1]
		if s, ok := last["text"].(string); ok && (last["thought"] == true) == thought {
			last["text"] = s + text
			return
		}
	}
	p := jmap{"text": text}
	if thought {
		p["thought"] = true
	}
	w.parts = append(w.parts, p)
}

// blockPart is the part of a complete tool call or image block.
func (w *geminiWriter) blockPart(i int, b *Block) jmap {
	if b.Kind == BlockImage {
		return jmap{"inlineData": geminiBlob{MimeType: b.MIME, Data: b.Data}}
	}
	args, ok := toolObject(b)
	if !ok {
		w.lost.add(LossTool, w.src(i, b))
	}
	fc := jmap{"name": b.ToolName, "args": args}
	if b.ToolID != "" {
		fc["id"] = b.ToolID
	}
	return jmap{"functionCall": fc}
}

// chunk is a response holding parts; final adds the finish and usage.
func (w *geminiWriter) chunk(m *Msg, parts []jmap, final bool) Event {
	cand := jmap{"index": 0}
	if len(parts) > 0 {
		cand["content"] = jmap{"role": "model", "parts": parts}
	}
	out := jmap{"candidates": []any{cand}, "modelVersion": m.Model, "responseId": m.ID}
	if final {
		cand["finishReason"] = geminiFinishReason(m.Finish)
		if m.Usage.Set {
			out["usageMetadata"] = geminiUsage(m.Usage)
		}
	}
	return jsonEvent("", out)
}

func (w *geminiWriter) json(m *Msg) ([]byte, error) {
	for i := range m.Blocks {
		w.blockParts(i, &m.Blocks[i])
	}
	ev := w.chunk(m, w.parts, true)
	w.parts = nil
	return ev.Data, nil
}

// blockParts adds the parts of a complete block.
func (w *geminiWriter) blockParts(i int, b *Block) {
	switch b.Kind {
	case BlockText, BlockRefusal:
		w.addText(b.Text, false)
	case BlockReasoning:
		w.addText(b.Text, true)
	case BlockToolCall, BlockImage:
		w.parts = append(w.parts, w.blockPart(i, b))
	}
}

func (w *geminiWriter) start(*Msg) []Event { return nil }

func (w *geminiWriter) blockStart(i int, b *Block) []Event {
	if b.Kind == BlockImage {
		w.parts = append(w.parts, w.blockPart(i, b))
	}
	return nil
}

func (w *geminiWriter) content(d Delta, b *Block) []Event {
	if d.Op != DeltaArgs {
		w.addText(d.Text, b.Kind == BlockReasoning)
	}
	return nil
}

func (w *geminiWriter) blockStop(i int, b *Block) []Event {
	if b.Kind == BlockToolCall {
		w.parts = append(w.parts, w.blockPart(i, b))
	}
	return nil
}

func (w *geminiWriter) flush() []Event {
	if len(w.parts) == 0 {
		return nil
	}
	ev := w.chunk(&w.b.m, w.parts, false)
	w.parts = nil
	return []Event{ev}
}

func (w *geminiWriter) finish(m *Msg) []Event {
	ev := w.chunk(m, w.parts, true)
	w.parts = nil
	return []Event{ev}
}

func (w *geminiWriter) fail(e *UpstreamError) []Event {
	code := e.Status
	if code == 0 {
		code = 500
	}
	status := e.Type
	if status == "" || strings.ToUpper(status) != status {
		status = errorKind(code, 1, "INTERNAL")
	}
	return []Event{jsonEvent("", jmap{"error": jmap{"code": code, "message": e.Message, "status": status}})}
}
