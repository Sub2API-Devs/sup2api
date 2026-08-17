package grok

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"
)

const maxSSELineBytes = 16 << 20

type transformedBody struct {
	*io.PipeReader
	source io.ReadCloser
}

func (b *transformedBody) Close() error {
	readerErr := b.PipeReader.Close()
	sourceErr := b.source.Close()
	if readerErr != nil {
		return readerErr
	}
	return sourceErr
}

func transformSSEBody(source io.ReadCloser, mapping clientToolMapping) io.ReadCloser {
	reader, writer := io.Pipe()
	body := &transformedBody{PipeReader: reader, source: source}
	go func() {
		err := transformSSE(source, writer, mapping)
		_ = source.Close()
		_ = writer.CloseWithError(err)
	}()
	return body
}

func transformSSE(source io.Reader, destination io.Writer, mapping clientToolMapping) error {
	scanner := bufio.NewScanner(source)
	scanner.Buffer(make([]byte, 64<<10), maxSSELineBytes)
	writer := bufio.NewWriterSize(destination, 4<<10)
	restorer := newStreamRestorer(mapping)
	frame := make([]string, 0, 4)
	flush := func() error {
		if len(frame) == 0 {
			return nil
		}
		if err := transformSSEFrame(writer, frame, restorer); err != nil {
			return err
		}
		frame = frame[:0]
		return writer.Flush()
	}
	for scanner.Scan() {
		line := strings.TrimSuffix(scanner.Text(), "\r")
		if line == "" {
			if err := flush(); err != nil {
				return err
			}
			continue
		}
		frame = append(frame, line)
	}
	if err := flush(); err != nil {
		return err
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("read Grok SSE: %w", err)
	}
	return writer.Flush()
}

func transformSSEFrame(writer *bufio.Writer, lines []string, restorer *streamRestorer) error {
	fields := make([]string, 0, len(lines))
	dataLines := make([]string, 0, 1)
	hadEvent := false
	for _, line := range lines {
		if strings.HasPrefix(line, "data:") {
			dataLines = append(dataLines, strings.TrimPrefix(strings.TrimPrefix(line, "data:"), " "))
			continue
		}
		if strings.HasPrefix(line, "event:") {
			hadEvent = true
		}
		fields = append(fields, line)
	}
	if len(dataLines) == 0 {
		for _, line := range lines {
			if _, err := writer.WriteString(line + "\n"); err != nil {
				return err
			}
		}
		_, err := writer.WriteString("\n")
		return err
	}
	payload := []byte(strings.Join(dataLines, "\n"))
	if bytes.Equal(bytes.TrimSpace(payload), []byte("[DONE]")) || !json.Valid(payload) {
		for _, line := range lines {
			if _, err := writer.WriteString(line + "\n"); err != nil {
				return err
			}
		}
		_, err := writer.WriteString("\n")
		return err
	}
	payloads, err := restorer.restore(payload)
	if err != nil {
		return err
	}
	for index, output := range payloads {
		if index == 0 {
			for _, field := range fields {
				if strings.HasPrefix(field, "event:") {
					continue
				}
				if _, err := writer.WriteString(field + "\n"); err != nil {
					return err
				}
			}
		}
		if hadEvent {
			var wire map[string]any
			_ = json.Unmarshal(output, &wire)
			if typ := strings.TrimSpace(stringValue(wire["type"])); typ != "" {
				if _, err := writer.WriteString("event: " + typ + "\n"); err != nil {
					return err
				}
			}
		}
		if _, err := writer.WriteString("data: " + string(output) + "\n\n"); err != nil {
			return err
		}
	}
	return nil
}

type streamCall struct {
	kind        string
	name        string
	callID      string
	itemID      string
	outputIndex int
	arguments   strings.Builder
}

type streamRestorer struct {
	mapping  clientToolMapping
	nextSeq  int
	seenSeq  bool
	calls    map[string]*streamCall
	byOutput map[int]*streamCall
}

func newStreamRestorer(mapping clientToolMapping) *streamRestorer {
	return &streamRestorer{mapping: mapping, calls: make(map[string]*streamCall), byOutput: make(map[int]*streamCall)}
}

func (r *streamRestorer) restore(payload []byte) ([][]byte, error) {
	root, err := decodeEvent(payload)
	if err != nil {
		return nil, err
	}
	typ := stringValue(root["type"])
	sequence := intValue(root["sequence_number"])
	if !r.seenSeq {
		r.nextSeq, r.seenSeq = sequence, true
	}
	if typ == "response.completed" || typ == "response.incomplete" || typ == "response.failed" {
		restoreClientToolValue(root, r.mapping)
		return r.emit(root)
	}
	switch typ {
	case "response.output_item.added":
		if call := r.recordItem(root); call != nil {
			restoreStreamItem(eventItem(root), call, false)
		} else {
			restoreNamespaceItem(eventItem(root), r.mapping.NamespaceTools)
		}
		return r.emit(root)
	case "response.function_call_arguments.delta":
		if call := r.callFor(root); call != nil {
			call.arguments.WriteString(stringValue(root["delta"]))
			return nil, nil
		}
		restoreNamespaceArgumentEvent(root, r.mapping.NamespaceTools)
		return r.emit(root)
	case "response.function_call_arguments.done":
		if call := r.callFor(root); call != nil {
			if arguments := stringValue(root["arguments"]); arguments != "" {
				call.arguments.Reset()
				call.arguments.WriteString(arguments)
			}
			if call.kind != "custom" {
				return nil, nil
			}
			input := extractCustomInput(call.arguments.String())
			outputs := make([][]byte, 0, 2)
			if input != "" {
				delta := map[string]any{"type": "response.custom_tool_call_input.delta", "output_index": call.outputIndex, "item_id": call.itemID, "delta": input}
				encoded, emitErr := r.emit(delta)
				if emitErr != nil {
					return nil, emitErr
				}
				outputs = append(outputs, encoded...)
			}
			done := map[string]any{"type": "response.custom_tool_call_input.done", "output_index": call.outputIndex, "item_id": call.itemID, "call_id": call.callID, "name": call.name, "input": input}
			encoded, emitErr := r.emit(done)
			if emitErr != nil {
				return nil, emitErr
			}
			return append(outputs, encoded...), nil
		}
	case "response.output_item.done":
		if call := r.recordItem(root); call != nil {
			restoreStreamItem(eventItem(root), call, true)
			delete(r.calls, call.itemID)
			delete(r.calls, call.callID)
			delete(r.byOutput, call.outputIndex)
		} else {
			restoreNamespaceItem(eventItem(root), r.mapping.NamespaceTools)
		}
		return r.emit(root)
	default:
		restoreClientToolValue(root, r.mapping)
		return r.emit(root)
	}
	return nil, nil
}

func (r *streamRestorer) emit(root map[string]any) ([][]byte, error) {
	root["sequence_number"] = r.nextSeq
	r.nextSeq++
	encoded, err := marshalJSON(root)
	if err != nil {
		return nil, err
	}
	return [][]byte{encoded}, nil
}

func (r *streamRestorer) recordItem(root map[string]any) *streamCall {
	item := eventItem(root)
	if stringValue(item["type"]) != "function_call" {
		return nil
	}
	name := stringValue(item["name"])
	kind := ""
	if r.mapping.CustomTools[name] {
		kind = "custom"
	} else if r.mapping.ToolSearch && name == toolSearchProxyName {
		kind = "tool_search"
	}
	if kind == "" {
		return nil
	}
	itemID, callID := stringValue(item["id"]), stringValue(item["call_id"])
	call := r.calls[itemID]
	if call == nil {
		call = r.calls[callID]
	}
	if call == nil {
		call = &streamCall{kind: kind, name: name, itemID: itemID, callID: callID, outputIndex: intValue(root["output_index"])}
		if itemID != "" {
			r.calls[itemID] = call
		}
		if callID != "" {
			r.calls[callID] = call
		}
		r.byOutput[call.outputIndex] = call
	}
	if arguments := stringValue(item["arguments"]); arguments != "" {
		call.arguments.Reset()
		call.arguments.WriteString(arguments)
	}
	return call
}

func (r *streamRestorer) callFor(root map[string]any) *streamCall {
	if call := r.calls[stringValue(root["item_id"])]; call != nil {
		return call
	}
	if call := r.calls[stringValue(root["call_id"])]; call != nil {
		return call
	}
	return r.byOutput[intValue(root["output_index"])]
}

func restoreStreamItem(item map[string]any, call *streamCall, done bool) {
	if item == nil || call == nil {
		return
	}
	if call.kind == "custom" {
		item["type"] = "custom_tool_call"
		if done {
			item["input"] = extractCustomInput(call.arguments.String())
		} else {
			item["input"] = ""
		}
		delete(item, "arguments")
		delete(item, "namespace")
		return
	}
	item["type"] = "tool_search_call"
	item["execution"] = "client"
	delete(item, "name")
	delete(item, "namespace")
	if done {
		item["arguments"] = toolSearchArguments(call.arguments.String())
	} else {
		item["arguments"] = map[string]any{}
	}
}

func restoreNamespaceItem(item map[string]any, names map[string]namespaceName) {
	if item == nil || stringValue(item["type"]) != "function_call" {
		return
	}
	if entry, exists := names[stringValue(item["name"])]; exists {
		item["name"] = entry.Name
		item["namespace"] = entry.Namespace
	}
}

func restoreNamespaceArgumentEvent(root map[string]any, names map[string]namespaceName) {
	if entry, exists := names[stringValue(root["name"])]; exists {
		root["name"] = entry.Name
	}
}

func eventItem(root map[string]any) map[string]any {
	item, _ := root["item"].(map[string]any)
	return item
}

func decodeEvent(payload []byte) (map[string]any, error) {
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	var root map[string]any
	if err := decoder.Decode(&root); err != nil {
		return nil, err
	}
	return root, nil
}

func intValue(value any) int {
	switch typed := value.(type) {
	case json.Number:
		result, _ := strconv.Atoi(typed.String())
		return result
	case float64:
		return int(typed)
	case int:
		return typed
	default:
		return 0
	}
}
