package engine

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"hash"
	"mime"
	"regexp"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// answerObserver reads, from the bytes a converted request's answer streams
// to the client (features.FirstPartyShapeCapability, 2026-11-03), the two
// facts the next requests of the conversation need that only the answer
// carries: its message ID (diagnostics.previous_message_id of the thread's
// next request) and the Agent calls it made (the prompt ID and agent type of
// the subagents they spawn). The client's bytes are never changed; reading
// them is bounded, and an answer it cannot read leaves the facts out
// (session_state.go keeps a thread's memory without them).
//
// It also reads the names of the tools the answer calls (tool_use,
// server_tool_use, mcp_tool_use blocks, in their order), which the session's
// tools-used set keeps (tools_used.go): only a block's type and name, never
// its input.
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
	// broken: the answer cannot be read on (a line or a JSON answer too
	// large): no tool names either.
	broken bool
	// noCalls: the Agent calls are not wanted (only the tool names are).
	noCalls bool
	// tools are the answer's tool blocks in order; a streamed one counts once
	// its block has ended.
	tools []toolBlock
	// keyBlocks are the text and tool blocks of a stream being read, for its
	// key (answerKey), by content index in the order they started.
	keyBlocks []*keyBlock
	// complete: the answer has ended (a stream's message_stop, a JSON answer
	// whole), as the client will see it once these bytes reach it.
	complete bool
}

// toolBlock is one tool block of an answer: its index in a stream, the name
// the session's set keeps, and whether it ended.
type toolBlock struct {
	index int
	name  string
	done  bool
}

// keyBlock is one text or tool block of a streamed answer: a text's running
// SHA-256 (empty: no text yet) or a tool block's ID.
type keyBlock struct {
	index int
	text  hash.Hash
	size  int
	id    string
}

// answerToolsMax bounds the tool blocks one answer is read for.
const answerToolsMax = 256

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
	if o == nil || o.broken {
		return
	}
	if o.kind == "json" {
		if o.body.Len()+len(p) > answerJSONMax {
			o.failed, o.broken = true, true
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
				o.failed, o.broken = true, true
				return
			}
			o.line.Write(p)
			return
		}
		if o.line.Len()+at > answerLineMax {
			o.failed, o.broken = true, true
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
			Type       string `json:"type"`
			Name       string `json:"name"`
			ServerName string `json:"server_name"`
			ID         string `json:"id"`
			Text       string `json:"text"`
		} `json:"content_block"`
		Delta struct {
			Type        string `json:"type"`
			PartialJSON string `json:"partial_json"`
			Text        string `json:"text"`
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
		o.keyStart(event.Index, event.ContentBlock.Type, event.ContentBlock.ID, event.ContentBlock.Text)
		if name, ok := answerToolName(event.ContentBlock.Type, event.ContentBlock.Name, event.ContentBlock.ServerName); ok && len(o.tools) < answerToolsMax {
			o.tools = append(o.tools, toolBlock{index: event.Index, name: name})
		}
		if !o.noCalls && !o.failed && event.ContentBlock.Type == "tool_use" && agentToolNames[event.ContentBlock.Name] {
			o.blocks[event.Index] = &agentCall{}
		}
	case "content_block_delta":
		if event.Delta.Type == "text_delta" {
			o.keyText(event.Index, event.Delta.Text)
		}
		call := o.blocks[event.Index]
		if call == nil || o.failed || event.Delta.Type != "input_json_delta" {
			return
		}
		if call.input.Len()+len(event.Delta.PartialJSON) > agentInputMax {
			o.failed = true
			return
		}
		call.input.WriteString(event.Delta.PartialJSON)
	case "content_block_stop":
		for i := range o.tools {
			if o.tools[i].index == event.Index {
				o.tools[i].done = true
			}
		}
		if call := o.blocks[event.Index]; call != nil {
			delete(o.blocks, event.Index)
			if !o.failed {
				o.spawn(call.input.Bytes())
			}
		}
	case "message_stop":
		o.complete = true
	}
}

// answerToolName is the name the session's set keeps of a content block that
// calls a tool (ok false for another block): a client or server tool's name,
// an MCP connector tool's server:name (Claude Code's own form), the stand-in
// for a name Claude Code would not keep.
func answerToolName(kind, name, server string) (string, bool) {
	switch kind {
	case "tool_use", "server_tool_use":
	case "mcp_tool_use":
		if name == "" || server == "" {
			return features.ToolsUsedUnreadable, true
		}
		name = server + ":" + name
	default:
		return "", false
	}
	if !features.ToolNamePattern.MatchString(name) {
		return features.ToolsUsedUnreadable, true
	}
	return name, true
}

// toolNames are the names of the tool blocks the answer made in full, in
// their order.
func (o *answerObserver) toolNames() []string {
	if o == nil || o.broken {
		return nil
	}
	if o.kind == "json" {
		o.readJSONTools()
	}
	out := []string{}
	for _, block := range o.tools {
		if block.done {
			out = append(out, block.name)
		}
	}
	return out
}

// readJSONTools reads a whole JSON answer's tool blocks, once.
func (o *answerObserver) readJSONTools() {
	if o.tools != nil || !o.complete {
		return
	}
	var answer struct {
		Content []struct {
			Type       string `json:"type"`
			Name       string `json:"name"`
			ServerName string `json:"server_name"`
		} `json:"content"`
	}
	o.tools = []toolBlock{}
	if json.Unmarshal(o.body.Bytes(), &answer) != nil {
		return
	}
	for i, block := range answer.Content {
		if name, ok := answerToolName(block.Type, block.Name, block.ServerName); ok && len(o.tools) < answerToolsMax {
			o.tools = append(o.tools, toolBlock{index: i, name: name, done: true})
		}
	}
}

// keyStart begins a streamed block of the answer's key.
func (o *answerObserver) keyStart(index int, kind, id, text string) {
	if len(o.keyBlocks) >= answerToolsMax {
		return
	}
	switch kind {
	case "text":
		block := &keyBlock{index: index, text: sha256.New()}
		o.keyBlocks = append(o.keyBlocks, block)
		o.keyText(index, text)
	case "tool_use", "server_tool_use", "mcp_tool_use":
		o.keyBlocks = append(o.keyBlocks, &keyBlock{index: index, id: id})
	}
}

// keyText adds a text delta to its block.
func (o *answerObserver) keyText(index int, text string) {
	for i := len(o.keyBlocks) - 1; i >= 0; i-- {
		if block := o.keyBlocks[i]; block.index == index && block.text != nil {
			block.text.Write([]byte(text))
			block.size += len(text)
			return
		}
	}
}

// answerKey is the answer's key (answerKeyer: what the client sends of it
// again), for an answer read in full; zero otherwise.
func (o *answerObserver) answerKey() [32]byte {
	if o == nil || o.broken || !o.complete {
		return [32]byte{}
	}
	var k answerKeyer
	if o.kind == "json" {
		var answer struct {
			Content []struct {
				Type string `json:"type"`
				ID   string `json:"id"`
				Text string `json:"text"`
			} `json:"content"`
		}
		if json.Unmarshal(o.body.Bytes(), &answer) != nil {
			return [32]byte{}
		}
		for _, block := range answer.Content {
			switch block.Type {
			case "text":
				k.text(block.Text)
			case "tool_use", "server_tool_use", "mcp_tool_use":
				k.call(block.ID)
			}
		}
		return k.key()
	}
	for _, block := range o.keyBlocks {
		if block.text == nil {
			k.call(block.id)
			continue
		}
		if block.size > 0 {
			var digest [32]byte
			copy(digest[:], block.text.Sum(nil))
			k.textDigest(digest)
		}
	}
	return k.key()
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
			if !o.noCalls && block.Type == "tool_use" && agentToolNames[block.Name] {
				o.spawn(block.Input)
			}
		}
	}
	if o.failed || len(o.blocks) > 0 {
		return o.messageID, nil
	}
	return o.messageID, o.spawns
}
