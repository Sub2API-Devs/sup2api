package engine

// The response a request's log keeps (REQUEST-LOG-ASYNC-DESIGN.md §4): the
// bytes the client received are copied to the log's background writer, which
// assembles them once the request finished. An event stream becomes the one
// Messages response it carried; a JSON answer is kept as it is; anything else,
// or a stream that cannot be read, is kept as the raw bytes. The client's
// bytes are never touched.
import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"sort"
	"strings"
)

const (
	responseJSONFile = "response.json"
	responseBodyFile = "response.body"
)

// What became of a response's capture (metadata response_capture).
const (
	responseCaptureComplete  = "complete"
	responseCaptureTruncated = "truncated" // the request's budget ran out
	responseCaptureDropped   = "dropped"   // the background writer refused a chunk
	responseCaptureOmitted   = "omitted"   // credential-safe capture keeps no response
)

// responseKind is how a response is assembled, by its headers.
func responseKind(contentType, encoding string) string {
	if encoding != "" && !strings.EqualFold(encoding, "identity") {
		return "raw"
	}
	media, _, err := mime.ParseMediaType(contentType)
	switch {
	case err != nil:
		return "raw"
	case media == "text/event-stream":
		return "sse"
	case media == "application/json" || strings.HasSuffix(media, "+json"):
		return "json"
	}
	return "raw"
}

// assembledResponse is the file a response is kept as and what the metadata
// says about it.
type assembledResponse struct {
	name      string
	body      []byte
	assembled bool
	events    int
	stream    bool
}

// assembleResponse turns the captured chunks into the file the log keeps.
func assembleResponse(chunks [][]byte, contentType, encoding string) assembledResponse {
	switch responseKind(contentType, encoding) {
	case "sse":
		readers := make([]io.Reader, len(chunks))
		for i, chunk := range chunks {
			readers[i] = bytes.NewReader(chunk)
		}
		message, events, err := assembleSSE(io.MultiReader(readers...))
		if err == nil {
			if b, err := json.Marshal(message); err == nil {
				return assembledResponse{name: responseJSONFile, body: b, assembled: true, events: events, stream: true}
			}
		}
		return assembledResponse{name: responseBodyFile, body: bytes.Join(chunks, nil), events: events, stream: true}
	case "json":
		raw := bytes.Join(chunks, nil)
		if json.Valid(raw) {
			return assembledResponse{name: responseJSONFile, body: raw, assembled: true}
		}
		return assembledResponse{name: responseBodyFile, body: raw}
	}
	return assembledResponse{name: responseBodyFile, body: bytes.Join(chunks, nil)}
}

var errNoMessage = errors.New("the stream carried no message")

// sseAssembly rebuilds a Messages response from its stream events.
type sseAssembly struct {
	message map[string]any
	// failure is the error event's object when the stream carried no message.
	failure map[string]any
	blocks  map[int]map[string]any
	// texts collect a block's text, thinking and signature deltas; partial
	// its input_json_delta fragments.
	texts    map[int]map[string]*strings.Builder
	partial  map[int]*strings.Builder
	unparsed []any
	stopped  bool
	events   int
}

// assembleSSE reads an Anthropic Messages event stream and returns the
// response it carried: message_start's message with every content block
// rebuilt from its start and deltas, message_delta's fields and usage merged,
// an error event as "error". What it cannot place is kept in
// ccgateway_unparsed; a stream that ends before message_stop is marked
// ccgateway_incomplete. A data line that is not a JSON object fails the
// whole assembly: the raw bytes are kept instead.
func assembleSSE(r io.Reader) (map[string]any, int, error) {
	a := &sseAssembly{blocks: map[int]map[string]any{}, texts: map[int]map[string]*strings.Builder{}, partial: map[int]*strings.Builder{}}
	reader := bufio.NewReaderSize(r, 64<<10)
	var event string
	var data []string
	for {
		line, err := reader.ReadString('\n')
		if err != nil && err != io.EOF {
			return nil, a.events, err
		}
		complete := strings.HasSuffix(line, "\n")
		line = strings.TrimSuffix(strings.TrimSuffix(line, "\n"), "\r")
		switch {
		case !complete:
			// The stream ended inside a line: what it started is not an event.
		case line == "":
			if len(data) > 0 {
				if derr := a.dispatch(event, strings.Join(data, "\n")); derr != nil {
					return nil, a.events, derr
				}
			}
			event, data = "", nil
		case strings.HasPrefix(line, ":"):
		default:
			field, value, _ := strings.Cut(line, ":")
			value = strings.TrimPrefix(value, " ")
			switch field {
			case "event":
				event = value
			case "data":
				data = append(data, value)
			}
		}
		if err == io.EOF {
			break
		}
	}
	return a.result()
}

func (a *sseAssembly) dispatch(event, raw string) error {
	decoder := json.NewDecoder(strings.NewReader(raw))
	decoder.UseNumber()
	var data map[string]any
	if decoder.Decode(&data) != nil || data == nil || decoder.More() {
		return errors.New("event data is not a JSON object")
	}
	a.events++
	if event == "" {
		event, _ = data["type"].(string)
	}
	switch event {
	case "ping":
	case "message_start":
		message, ok := data["message"].(map[string]any)
		if !ok {
			a.keep(event, data)
			return nil
		}
		a.message = message
		if content, ok := message["content"].([]any); ok {
			for i, block := range content {
				if object, ok := block.(map[string]any); ok {
					a.blocks[i] = object
				}
			}
		}
	case "content_block_start":
		index, okIndex := blockIndex(data)
		block, ok := data["content_block"].(map[string]any)
		if !okIndex || !ok {
			a.keep(event, data)
			return nil
		}
		a.blocks[index] = block
		delete(a.texts, index)
		delete(a.partial, index)
	case "content_block_delta":
		a.delta(event, data)
	case "content_block_stop":
		index, ok := blockIndex(data)
		if !ok || a.blocks[index] == nil {
			a.keep(event, data)
			return nil
		}
		a.close(index)
	case "message_delta":
		a.messageDelta(event, data)
	case "message_stop":
		a.stopped = true
	case "error":
		if a.message != nil {
			a.message["error"] = data["error"]
		} else {
			a.failure = data
		}
	default:
		a.keep(event, data)
	}
	return nil
}

func blockIndex(data map[string]any) (int, bool) {
	number, ok := data["index"].(json.Number)
	if !ok {
		return 0, false
	}
	index, err := number.Int64()
	if err != nil || index < 0 || index > 1<<20 {
		return 0, false
	}
	return int(index), true
}

// keep records an event the assembly cannot place, as it came.
func (a *sseAssembly) keep(event string, data map[string]any) {
	a.unparsed = append(a.unparsed, map[string]any{"event": event, "data": data})
}

func (a *sseAssembly) delta(event string, data map[string]any) {
	index, okIndex := blockIndex(data)
	delta, ok := data["delta"].(map[string]any)
	block := a.blocks[index]
	if !okIndex || !ok || block == nil {
		a.keep(event, data)
		return
	}
	kind, _ := delta["type"].(string)
	text := func(key, field string) {
		value, ok := delta[field].(string)
		if !ok {
			unparsedOn(block, delta)
			return
		}
		a.text(index, key).WriteString(value)
	}
	switch kind {
	case "text_delta":
		text("text", "text")
	case "thinking_delta":
		text("thinking", "thinking")
	case "signature_delta":
		text("signature", "signature")
	case "input_json_delta":
		value, ok := delta["partial_json"].(string)
		if !ok {
			unparsedOn(block, delta)
			return
		}
		if a.partial[index] == nil {
			a.partial[index] = &strings.Builder{}
		}
		a.partial[index].WriteString(value)
	case "citations_delta":
		citations, _ := block["citations"].([]any)
		block["citations"] = append(citations, delta["citation"])
	default:
		unparsedOn(block, delta)
	}
}

// text is the builder of a block's text field, started from what the block
// already holds.
func (a *sseAssembly) text(index int, key string) *strings.Builder {
	fields := a.texts[index]
	if fields == nil {
		fields = map[string]*strings.Builder{}
		a.texts[index] = fields
	}
	builder := fields[key]
	if builder == nil {
		builder = &strings.Builder{}
		if start, ok := a.blocks[index][key].(string); ok {
			builder.WriteString(start)
		}
		fields[key] = builder
	}
	return builder
}

// close completes a block: its texts, and its input from the JSON fragments.
func (a *sseAssembly) close(index int) {
	block := a.blocks[index]
	for key, builder := range a.texts[index] {
		block[key] = builder.String()
	}
	delete(a.texts, index)
	if partial := a.partial[index]; partial != nil {
		raw := partial.String()
		if strings.TrimSpace(raw) != "" {
			decoder := json.NewDecoder(strings.NewReader(raw))
			decoder.UseNumber()
			var input any
			if decoder.Decode(&input) == nil && !decoder.More() {
				block["input"] = input
			} else {
				unparsedOn(block, map[string]any{"type": "input_json_delta", "partial_json": raw})
			}
		}
		delete(a.partial, index)
	}
}

// unparsedOn keeps a delta the block cannot take, as it came.
func unparsedOn(block map[string]any, delta any) {
	kept, _ := block["ccgateway_unparsed"].([]any)
	block["ccgateway_unparsed"] = append(kept, delta)
}

func (a *sseAssembly) messageDelta(event string, data map[string]any) {
	if a.message == nil {
		a.keep(event, data)
		return
	}
	extra := false
	for key, value := range data {
		switch key {
		case "type":
		case "delta":
			delta, ok := value.(map[string]any)
			if !ok {
				extra = true
				continue
			}
			for field, v := range delta {
				a.message[field] = v
			}
		case "usage":
			usage, ok := value.(map[string]any)
			if !ok {
				extra = true
				continue
			}
			merged, _ := a.message["usage"].(map[string]any)
			if merged == nil {
				merged = map[string]any{}
				a.message["usage"] = merged
			}
			for field, v := range usage {
				merged[field] = v
			}
		default:
			extra = true
		}
	}
	if extra {
		a.keep(event, data)
	}
}

func (a *sseAssembly) result() (map[string]any, int, error) {
	if a.message == nil {
		if a.failure != nil {
			return a.failure, a.events, nil
		}
		return nil, a.events, errNoMessage
	}
	indexes := make([]int, 0, len(a.blocks))
	for index := range a.blocks {
		indexes = append(indexes, index)
	}
	sort.Ints(indexes)
	content := make([]any, 0, len(indexes))
	for _, index := range indexes {
		// A block the stream did not stop (it was cut off) keeps what arrived.
		if a.texts[index] != nil || a.partial[index] != nil {
			a.close(index)
		}
		content = append(content, a.blocks[index])
	}
	a.message["content"] = content
	if len(a.unparsed) > 0 {
		a.message["ccgateway_unparsed"] = a.unparsed
	}
	if !a.stopped {
		a.message["ccgateway_incomplete"] = true
	}
	return a.message, a.events, nil
}
