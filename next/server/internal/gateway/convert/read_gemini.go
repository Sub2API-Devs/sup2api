package convert

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"
)

// Gemini generateContent wire shapes, shared by the gemini reader and
// writer.

type geminiResponseJSON struct {
	Candidates     []geminiCandidateJSON `json:"candidates,omitempty"`
	PromptFeedback *struct {
		BlockReason string `json:"blockReason"`
	} `json:"promptFeedback,omitempty"`
	UsageMetadata *geminiUsageJSON `json:"usageMetadata,omitempty"`
	ModelVersion  string           `json:"modelVersion,omitempty"`
	ResponseID    string           `json:"responseId,omitempty"`
}

type geminiCandidateJSON struct {
	Content           *geminiContentJSON   `json:"content,omitempty"`
	FinishReason      string               `json:"finishReason,omitempty"`
	Index             int                  `json:"index"`
	GroundingMetadata *geminiGroundingJSON `json:"groundingMetadata,omitempty"`
}

type geminiContentJSON struct {
	Role  string            `json:"role,omitempty"`
	Parts []json.RawMessage `json:"parts"`
}

type geminiPartJSON struct {
	Text             *string             `json:"text,omitempty"`
	Thought          bool                `json:"thought,omitempty"`
	ThoughtSignature string              `json:"thoughtSignature,omitempty"`
	FunctionCall     *geminiFunctionCall `json:"functionCall,omitempty"`
	InlineData       *geminiBlob         `json:"inlineData,omitempty"`
}

type geminiFunctionCall struct {
	ID   string          `json:"id,omitempty"`
	Name string          `json:"name"`
	Args json.RawMessage `json:"args"`
}

type geminiBlob struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type geminiGroundingJSON struct {
	GroundingChunks []struct {
		Web *struct {
			URI   string `json:"uri"`
			Title string `json:"title"`
		} `json:"web"`
	} `json:"groundingChunks"`
	GroundingSupports []struct {
		Segment struct {
			StartIndex int    `json:"startIndex"`
			EndIndex   int    `json:"endIndex"`
			Text       string `json:"text"`
		} `json:"segment"`
		GroundingChunkIndices []int `json:"groundingChunkIndices"`
	} `json:"groundingSupports"`
}

type geminiUsageJSON struct {
	PromptTokenCount        int64 `json:"promptTokenCount"`
	CandidatesTokenCount    int64 `json:"candidatesTokenCount"`
	ThoughtsTokenCount      int64 `json:"thoughtsTokenCount,omitempty"`
	CachedContentTokenCount int64 `json:"cachedContentTokenCount,omitempty"`
	ToolUsePromptTokenCount int64 `json:"toolUsePromptTokenCount,omitempty"`
	TotalTokenCount         int64 `json:"totalTokenCount"`
}

func (u *geminiUsageJSON) ir() Usage {
	return Usage{Input: u.PromptTokenCount + u.ToolUsePromptTokenCount, CacheRead: u.CachedContentTokenCount,
		Output: u.CandidatesTokenCount + u.ThoughtsTokenCount, Reasoning: u.ThoughtsTokenCount}
}

var geminiFinishReasons = map[string]FinishReason{
	"STOP": FinishStop, "MAX_TOKENS": FinishLength,
	"SAFETY": FinishFilter, "RECITATION": FinishFilter, "BLOCKLIST": FinishFilter, "PROHIBITED_CONTENT": FinishFilter,
	"SPII": FinishFilter, "IMAGE_SAFETY": FinishFilter, "LANGUAGE": FinishFilter,
}

// geminiReader reads generateContent replies (CONVERT-MATRIX §9.7): every
// stream event is a complete GenerateContentResponse, and so is a
// non-stream body. Consecutive text (or thought) parts form one block.
type geminiReader struct {
	readerBase
	id      string
	parts   int // parts seen, for Src
	text    strings.Builder
	pending *Finish // finishReason seen, waiting for usage or the end
}

func newGeminiReader(respOpts) Reader { return &geminiReader{} }

func (r *geminiReader) JSON(body []byte) (*Msg, error) {
	ds, err := r.Event(Event{Data: body})
	if err != nil {
		return nil, err
	}
	end, _ := r.End()
	return collect(append(ds, end...))
}

func (r *geminiReader) End() ([]Delta, error) {
	if r.pending != nil {
		r.finish(*r.pending)
	}
	return r.take(), nil
}

func (r *geminiReader) Event(ev Event) ([]Delta, error) {
	d, ok := eventData(ev)
	if r.done || !ok {
		return nil, nil
	}
	if ue, ok := errorPayload(d); ok {
		r.fail(ue)
		return r.take(), nil
	}
	var resp geminiResponseJSON
	if err := decodeUpstream(d, &resp, "gemini response"); err != nil {
		return nil, err
	}
	if r.id == "" {
		r.id = resp.ResponseID
	}
	r.start(resp.ResponseID, resp.ModelVersion, 0)
	if len(resp.Candidates) > 0 {
		if err := r.candidate(&resp.Candidates[0]); err != nil {
			return nil, err
		}
	} else if pf := resp.PromptFeedback; pf != nil && pf.BlockReason != "" {
		r.pending = &Finish{Reason: FinishFilter, Raw: pf.BlockReason}
	}
	if u := resp.UsageMetadata; u != nil {
		r.usage(u.ir())
		if r.pending != nil {
			r.finish(*r.pending)
		}
	}
	return r.take(), nil
}

func (r *geminiReader) candidate(c *geminiCandidateJSON) error {
	if c.Content != nil {
		for _, raw := range c.Content.Parts {
			if err := r.part(raw); err != nil {
				return err
			}
		}
	}
	if g := c.GroundingMetadata; g != nil {
		r.grounding(g)
	}
	if c.FinishReason != "" {
		reason, ok := geminiFinishReasons[c.FinishReason]
		if !ok {
			r.lost.add(LossOther, "response.candidates[0].finishReason")
		}
		r.pending = &Finish{Reason: reason, Raw: c.FinishReason}
	}
	return nil
}

func (r *geminiReader) part(raw json.RawMessage) error {
	var p geminiPartJSON
	if err := decodeUpstream(raw, &p, "gemini part"); err != nil {
		return err
	}
	n := r.parts
	r.parts++
	src := fmt.Sprintf("candidates[0].content.parts[%d]", n)
	signed := p.ThoughtSignature != ""
	switch {
	case p.FunctionCall != nil:
		fc := p.FunctionCall
		id := fc.ID
		if id == "" {
			id = synthCallID(r.id, n)
		}
		r.emitBlock(fmt.Sprintf("f%d", n), Block{Kind: BlockToolCall, ToolID: id, ToolName: fc.Name, ToolKind: ToolFunction,
			Args: compactJSON(fc.Args), HasState: signed, Src: src})
	case p.InlineData != nil:
		r.emitBlock(fmt.Sprintf("i%d", n), Block{Kind: BlockImage, MIME: p.InlineData.MimeType, Data: p.InlineData.Data,
			HasState: signed, Src: src})
	case p.Text != nil:
		r.textPart(p, src)
	default:
		r.emitBlock(fmt.Sprintf("x%d", n), Block{Kind: BlockOpaque, Raw: append(json.RawMessage(nil), raw...), HasState: signed, Src: src})
	}
	return nil
}

// textPart appends a text or thought part to the open block of its kind.
// A signature on an empty part belongs to the open block.
func (r *geminiReader) textPart(p geminiPartJSON, src string) {
	key, b, op := "text", Block{Kind: BlockText, Src: src}, DeltaText
	if p.Thought {
		key, b, op = "thought", Block{Kind: BlockReasoning, Src: src}, DeltaReasoning
	}
	if *p.Text != "" {
		if r.open != key && key == "text" {
			r.text.Reset()
		}
		r.add(key, b, op, *p.Text)
		if key == "text" {
			r.text.WriteString(*p.Text)
		}
	}
	switch {
	case p.ThoughtSignature == "":
	case r.open != "":
		r.state(r.open)
	default:
		r.lost.add(LossReasoning, "response."+src)
	}
}

// grounding adds the web sources of the open text block as citations,
// located by the supported segment's text; sources it cannot locate are
// given without offsets.
func (r *geminiReader) grounding(g *geminiGroundingJSON) {
	const path = "response.candidates[0].groundingMetadata"
	if r.open != "text" {
		if len(g.GroundingChunks) > 0 {
			r.lost.add(LossOther, path)
		}
		return
	}
	i := r.keys["text"]
	text := r.text.String()
	cited := map[int]bool{}
	seen := map[Citation]bool{}
	cite := func(c Citation) {
		if !seen[c] {
			seen[c] = true
			r.emit(Delta{Op: DeltaCitation, Index: i, Cite: &c})
		}
	}
	for _, s := range g.GroundingSupports {
		start, end, ok := locateSegment(text, s.Segment.Text, s.Segment.StartIndex, s.Segment.EndIndex)
		for _, ci := range s.GroundingChunkIndices {
			if ci < 0 || ci >= len(g.GroundingChunks) || g.GroundingChunks[ci].Web == nil || !ok {
				continue
			}
			web := g.GroundingChunks[ci].Web
			cited[ci] = true
			cite(Citation{URL: web.URI, Title: web.Title, Start: start, End: end})
		}
	}
	for ci, ch := range g.GroundingChunks {
		if ch.Web == nil || cited[ci] {
			continue
		}
		r.lost.add(LossOther, path)
		cite(Citation{URL: ch.Web.URI, Title: ch.Web.Title})
	}
}

// locate returns the character range of a segment of text given by byte
// offsets, checked against (or else searched for by) its text.
func locateSegment(text, seg string, start, end int) (int, int, bool) {
	if start < 0 || end > len(text) || start > end || (seg != "" && text[start:end] != seg) {
		if seg == "" {
			return 0, 0, false
		}
		if start = strings.Index(text, seg); start < 0 {
			return 0, 0, false
		}
		end = start + len(seg)
	}
	from := utf8.RuneCountInString(text[:start])
	return from, from + utf8.RuneCountInString(text[start:end]), true
}
