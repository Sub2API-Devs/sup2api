package engine

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"mime"
	"regexp"
)

// answerObserver reads, from the bytes a converted request's answer streams
// to the client (features.FirstPartyShapeCapability, 2026-11-03), the two
// facts the next requests of the conversation need that only the answer
// carries: its message ID (diagnostics.previous_message_id of the thread's
// next request) and the Agent calls it made (the prompt ID and agent type of
// the subagents they spawn). The client's bytes are never changed; reading
// them is bounded, and an answer it cannot read leaves the facts out
// (session_state.go keeps a thread's memory without them).
type answerObserver struct {
	kind string // "sse" or "json", by the answer's content type
	// line is a partial event-stream line carried between writes.
	line bytes.Buffer
	// body is a JSON answer, kept whole up to answerJSONMax.
	body bytes.Buffer
	// blocks are the Agent calls of a stream being read, by content index.
	blocks    map[int]*agentCall
	messageID string
	spawns    []agentSpawn
	failed    bool // the answer could not be read whole: no spawns
	// complete: the answer has ended (a stream's message_stop, a JSON answer
	// whole), as the client will see it once these bytes reach it.
	complete bool
}

// agentCall is one tool_use block of a streamed answer that calls Claude
// Code's Agent tool, its input as the stream sent it.
type agentCall struct {
	input bytes.Buffer
}

// agentSpawn is an Agent call of an answer: its prompt (the subagent's
// first prompt, by digest) and the agent type it asked for ("" for none).
type agentSpawn struct {
	prompt    [32]byte
	agentType string
}

const (
	// answerLineMax bounds one event-stream line (a data line carries one
	// event; a text delta can be long, but an Agent call's input arrives in
	// small partial_json pieces).
	answerLineMax = 4 << 20
	// answerJSONMax bounds a non-streamed answer the observer keeps.
	answerJSONMax = 8 << 20
	// agentInputMax bounds one Agent call's input.
	agentInputMax = 256 << 10
	// agentSpawnsMax bounds the Agent calls one answer is remembered with.
	agentSpawnsMax = 16
)

var (
	// answerMessageID is a message ID Claude Code accepts (native cc_prev_msg
	// test): anything else is not kept.
	answerMessageID = regexp.MustCompile(`^msg_[A-Za-z0-9_]{1,64}$`)
	agentTypeName   = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$`)
)

// agentToolNames are the names Claude Code's subagent tool goes by (Agent;
// Task in versions before 2.1.x renamed it).
var agentToolNames = map[string]bool{"Agent": true, "Task": true}

// newAnswerObserver observes an answer of contentType, or returns nil for one
// it cannot read (another media type).
//
// The bytes are the ones the CLI writes, which its fetch has already decoded;
// the CLI's recorded headers still name the upstream's Content-Encoding (Bun
// keeps the header when it decodes, 2026-11-03: Anthropic compresses its
// answers, so every real answer said gzip or br and v45's observer read none
// of them, live test on account 82), and the Worker never relays that header
// (httpfacts.Select). An answer whose bytes are not what its type says is
// simply not read (no facts).
func newAnswerObserver(contentType string) *answerObserver {
	media, _, err := mime.ParseMediaType(contentType)
	switch {
	case err != nil:
		return nil
	case media == "text/event-stream":
		return &answerObserver{kind: "sse", blocks: map[int]*agentCall{}}
	case media == "application/json":
		return &answerObserver{kind: "json"}
	}
	return nil
}

// write takes the next bytes of the answer.
func (o *answerObserver) write(p []byte) {
	if o == nil || o.failed {
		return
	}
	if o.kind == "json" {
		if o.body.Len()+len(p) > answerJSONMax {
			o.failed = true
			return
		}
		o.body.Write(p)
		// A JSON answer is whole once it parses (checked only when the bytes
		// so far end like an object).
		if end := bytes.TrimRight(o.body.Bytes(), " \t\r\n"); len(end) > 0 && end[len(end)-1] == '}' && json.Valid(end) {
			o.complete = true
		}
		return
	}
	for len(p) > 0 {
		at := bytes.IndexByte(p, '\n')
		if at < 0 {
			if o.line.Len()+len(p) > answerLineMax {
				o.failed = true
				return
			}
			o.line.Write(p)
			return
		}
		if o.line.Len()+at > answerLineMax {
			o.failed = true
			return
		}
		o.line.Write(p[:at])
		o.event(bytes.TrimRight(o.line.Bytes(), "\r"))
		o.line.Reset()
		p = p[at+1:]
	}
}

// event reads one event-stream line: only data lines carry what is read.
func (o *answerObserver) event(line []byte) {
	data, ok := bytes.CutPrefix(line, []byte("data:"))
	if !ok {
		return
	}
	var event struct {
		Type    string `json:"type"`
		Index   int    `json:"index"`
		Message struct {
			ID string `json:"id"`
		} `json:"message"`
		ContentBlock struct {
			Type string `json:"type"`
			Name string `json:"name"`
		} `json:"content_block"`
		Delta struct {
			Type        string `json:"type"`
			PartialJSON string `json:"partial_json"`
		} `json:"delta"`
	}
	if json.Unmarshal(bytes.TrimSpace(data), &event) != nil {
		return
	}
	switch event.Type {
	case "message_start":
		if o.messageID == "" && answerMessageID.MatchString(event.Message.ID) {
			o.messageID = event.Message.ID
		}
	case "content_block_start":
		if event.ContentBlock.Type == "tool_use" && agentToolNames[event.ContentBlock.Name] {
			o.blocks[event.Index] = &agentCall{}
		}
	case "content_block_delta":
		call := o.blocks[event.Index]
		if call == nil || event.Delta.Type != "input_json_delta" {
			return
		}
		if call.input.Len()+len(event.Delta.PartialJSON) > agentInputMax {
			o.failed = true
			return
		}
		call.input.WriteString(event.Delta.PartialJSON)
	case "content_block_stop":
		if call := o.blocks[event.Index]; call != nil {
			delete(o.blocks, event.Index)
			o.spawn(call.input.Bytes())
		}
	case "message_stop":
		o.complete = true
	}
}

// spawn keeps one Agent call's prompt and agent type.
func (o *answerObserver) spawn(raw []byte) {
	var input struct {
		Prompt       *string `json:"prompt"`
		SubagentType *string `json:"subagent_type"`
	}
	if json.Unmarshal(raw, &input) != nil || input.Prompt == nil || *input.Prompt == "" {
		return
	}
	if len(o.spawns) >= agentSpawnsMax {
		o.failed = true
		return
	}
	call := agentSpawn{prompt: sha256.Sum256([]byte(*input.Prompt))}
	if input.SubagentType != nil && agentTypeName.MatchString(*input.SubagentType) {
		call.agentType = *input.SubagentType
	}
	o.spawns = append(o.spawns, call)
}

// ended says the answer has ended: what it leaves can be kept before its
// last bytes reach the client, which may send the conversation's next request
// (a tool result, a subagent's first request) as soon as they do.
func (o *answerObserver) ended() bool {
	return o != nil && o.complete
}

// facts are what an answer read in full leaves: its message ID and its
// Agent calls (none when they could not all be read).
func (o *answerObserver) facts() (messageID string, spawns []agentSpawn) {
	if o == nil {
		return "", nil
	}
	if o.kind == "json" {
		if o.failed {
			return "", nil
		}
		var answer struct {
			ID      string `json:"id"`
			Content []struct {
				Type  string          `json:"type"`
				Name  string          `json:"name"`
				Input json.RawMessage `json:"input"`
			} `json:"content"`
		}
		if json.Unmarshal(o.body.Bytes(), &answer) != nil {
			return "", nil
		}
		if answerMessageID.MatchString(answer.ID) {
			o.messageID = answer.ID
		}
		for _, block := range answer.Content {
			if block.Type == "tool_use" && agentToolNames[block.Name] {
				o.spawn(block.Input)
			}
		}
	}
	if o.failed || len(o.blocks) > 0 {
		return o.messageID, nil
	}
	return o.messageID, o.spawns
}
