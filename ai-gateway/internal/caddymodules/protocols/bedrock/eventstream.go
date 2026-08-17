package bedrock

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"hash/crc32"
	"io"
	"strings"
)

const (
	maxEventStreamFrameBytes   = 16 << 20
	maxEventStreamHeadersBytes = 128 << 10
)

type translatedReadCloser struct {
	*io.PipeReader
	source io.ReadCloser
}

func (r *translatedReadCloser) Close() error {
	readerErr := r.PipeReader.Close()
	sourceErr := r.source.Close()
	if readerErr != nil {
		return readerErr
	}
	return sourceErr
}

func translateEventStream(source io.ReadCloser) io.ReadCloser {
	reader, writer := io.Pipe()
	result := &translatedReadCloser{PipeReader: reader, source: source}
	go func() {
		defer source.Close()
		decoder := newEventStreamDecoder(source)
		for {
			payload, err := decoder.Decode()
			if err == io.EOF {
				_ = writer.Close()
				return
			}
			if err != nil {
				_ = writer.CloseWithError(err)
				return
			}
			data := extractChunkBytes(payload)
			if len(data) == 0 {
				continue
			}
			data = transformInvocationMetrics(data)
			var envelope map[string]any
			_ = json.Unmarshal(data, &envelope)
			eventType := stringValue(envelope["type"])
			if eventType != "" {
				if _, err := fmt.Fprintf(writer, "event: %s\ndata: %s\n\n", eventType, data); err != nil {
					_ = writer.CloseWithError(err)
					return
				}
			} else if _, err := fmt.Fprintf(writer, "data: %s\n\n", data); err != nil {
				_ = writer.CloseWithError(err)
				return
			}
		}
	}()
	return result
}

func extractChunkBytes(payload []byte) []byte {
	var envelope struct {
		Bytes string `json:"bytes"`
	}
	if json.Unmarshal(payload, &envelope) != nil || envelope.Bytes == "" {
		return nil
	}
	decoded, err := base64.StdEncoding.DecodeString(envelope.Bytes)
	if err != nil {
		return nil
	}
	return decoded
}

func transformInvocationMetrics(payload []byte) []byte {
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	var value map[string]any
	if decoder.Decode(&value) != nil || value == nil {
		return payload
	}
	metrics, ok := value["amazon-bedrock-invocationMetrics"].(map[string]any)
	if !ok {
		return payload
	}
	delete(value, "amazon-bedrock-invocationMetrics")
	if _, exists := value["usage"]; !exists {
		usage := make(map[string]any)
		if input := metrics["inputTokenCount"]; input != nil {
			usage["input_tokens"] = input
		}
		if output := metrics["outputTokenCount"]; output != nil {
			usage["output_tokens"] = output
		}
		if len(usage) > 0 {
			value["usage"] = usage
		}
	}
	transformed, err := json.Marshal(value)
	if err != nil {
		return payload
	}
	return transformed
}

type eventStreamDecoder struct{ reader *bufio.Reader }

func newEventStreamDecoder(reader io.Reader) *eventStreamDecoder {
	return &eventStreamDecoder{reader: bufio.NewReaderSize(reader, 64<<10)}
}

func (d *eventStreamDecoder) Decode() ([]byte, error) {
	for {
		prelude := make([]byte, 12)
		if _, err := io.ReadFull(d.reader, prelude); err != nil {
			return nil, err
		}
		if crc32.ChecksumIEEE(prelude[:8]) != binary.BigEndian.Uint32(prelude[8:]) {
			return nil, fmt.Errorf("AWS EventStream prelude CRC mismatch")
		}
		totalLength := int(binary.BigEndian.Uint32(prelude[:4]))
		headersLength := int(binary.BigEndian.Uint32(prelude[4:8]))
		if totalLength < 16 || totalLength > maxEventStreamFrameBytes || headersLength < 0 || headersLength > maxEventStreamHeadersBytes || headersLength > totalLength-16 {
			return nil, fmt.Errorf("invalid AWS EventStream frame lengths")
		}
		remaining := make([]byte, totalLength-12)
		if _, err := io.ReadFull(d.reader, remaining); err != nil {
			return nil, err
		}
		messageCRC := binary.BigEndian.Uint32(remaining[len(remaining)-4:])
		checksum := crc32.NewIEEE()
		_, _ = checksum.Write(prelude)
		_, _ = checksum.Write(remaining[:len(remaining)-4])
		if checksum.Sum32() != messageCRC {
			return nil, fmt.Errorf("AWS EventStream message CRC mismatch")
		}
		headers := remaining[:headersLength]
		payload := remaining[headersLength : len(remaining)-4]
		eventType := eventStreamHeader(headers, ":event-type")
		if eventType == "chunk" {
			return payload, nil
		}
		if exception := eventStreamHeader(headers, ":exception-type"); exception != "" {
			return nil, fmt.Errorf("Bedrock exception %s: %s", exception, boundedErrorPayload(payload))
		}
		messageType := eventStreamHeader(headers, ":message-type")
		if messageType == "exception" || messageType == "error" {
			return nil, fmt.Errorf("Bedrock EventStream error: %s", boundedErrorPayload(payload))
		}
	}
}

func eventStreamHeader(headers []byte, target string) string {
	position := 0
	for position < len(headers) {
		nameLength := int(headers[position])
		position++
		if nameLength == 0 || position+nameLength+1 > len(headers) {
			return ""
		}
		name := string(headers[position : position+nameLength])
		position += nameLength
		valueType := headers[position]
		position++
		switch valueType {
		case 0:
			if name == target {
				return "true"
			}
		case 1:
			if name == target {
				return "false"
			}
		case 2:
			position++
		case 3:
			position += 2
		case 4:
			position += 4
		case 5, 8:
			position += 8
		case 6, 7:
			if position+2 > len(headers) {
				return ""
			}
			length := int(binary.BigEndian.Uint16(headers[position : position+2]))
			position += 2
			if position+length > len(headers) {
				return ""
			}
			if name == target && valueType == 7 {
				return string(headers[position : position+length])
			}
			position += length
		case 9:
			position += 16
		default:
			return ""
		}
		if position > len(headers) {
			return ""
		}
	}
	return ""
}

func boundedErrorPayload(payload []byte) string {
	const limit = 2048
	if len(payload) > limit {
		payload = payload[:limit]
	}
	return strings.TrimSpace(string(payload))
}
