// Package streamjson provides bounded-memory JSON token copying for provider
// protocol plugins. It deliberately preserves raw value bytes so signed
// thinking blocks and large multimodal payloads are never re-encoded.
package streamjson

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
)

const (
	MaxKeyBytes = 4096
	MaxNesting  = 1024
)

// ReadString reads a JSON string after the opening quote has already been
// consumed. Raw includes both quotes; decoded contains the unescaped value.
func ReadString(input *bufio.Reader, first byte) (raw []byte, decoded string, err error) {
	if first != '"' {
		return nil, "", fmt.Errorf("JSON string must start with a quote")
	}
	raw = []byte{first}
	escaped := false
	for len(raw) <= MaxKeyBytes {
		current, readErr := input.ReadByte()
		if readErr != nil {
			return nil, "", fmt.Errorf("read JSON string: %w", readErr)
		}
		raw = append(raw, current)
		if escaped {
			escaped = false
			continue
		}
		if current == '\\' {
			escaped = true
			continue
		}
		if current == '"' {
			if decodeErr := json.Unmarshal(raw, &decoded); decodeErr != nil {
				return nil, "", fmt.Errorf("decode JSON string: %w", decodeErr)
			}
			return raw, decoded, nil
		}
	}
	return nil, "", fmt.Errorf("JSON string exceeds %d bytes", MaxKeyBytes)
}

// CopyValue copies one complete JSON value without materializing it. Input is
// positioned immediately before the value; the returned delimiter is the
// enclosing top-level object's comma or closing brace and is consumed.
func CopyValue(input *bufio.Reader, output io.Writer) (byte, error) {
	first, err := ReadNonSpace(input)
	if err != nil {
		return 0, err
	}
	if first == ',' || first == '}' {
		return 0, fmt.Errorf("empty JSON value")
	}
	if _, err := output.Write([]byte{first}); err != nil {
		return 0, err
	}
	if first == '"' {
		if err := copyStringValue(input, output); err != nil {
			return 0, err
		}
		return ReadValueDelimiter(input)
	}
	if first == '{' || first == '[' {
		if err := copyCompositeValue(input, output, first); err != nil {
			return 0, err
		}
		return ReadValueDelimiter(input)
	}
	primitive := []byte{first}
	for {
		current, err := input.ReadByte()
		if err != nil {
			return 0, err
		}
		if current == ',' || current == '}' {
			if !json.Valid(primitive) {
				return 0, fmt.Errorf("invalid JSON primitive")
			}
			return current, nil
		}
		if IsSpace(current) {
			if !json.Valid(primitive) {
				return 0, fmt.Errorf("invalid JSON primitive")
			}
			return ReadValueDelimiter(input)
		}
		if len(primitive) >= 1024 {
			return 0, fmt.Errorf("JSON primitive exceeds limit")
		}
		primitive = append(primitive, current)
		if _, err := output.Write([]byte{current}); err != nil {
			return 0, err
		}
	}
}

func copyStringValue(input *bufio.Reader, output io.Writer) error {
	escaped := false
	for {
		current, err := input.ReadByte()
		if err != nil {
			return err
		}
		if current < 0x20 {
			return fmt.Errorf("unescaped control byte in JSON string")
		}
		if _, err := output.Write([]byte{current}); err != nil {
			return err
		}
		if escaped {
			escaped = false
			continue
		}
		if current == '\\' {
			escaped = true
			continue
		}
		if current == '"' {
			return nil
		}
	}
}

func copyCompositeValue(input *bufio.Reader, output io.Writer, first byte) error {
	stack := []byte{first}
	inString := false
	escaped := false
	for len(stack) > 0 {
		current, err := input.ReadByte()
		if err != nil {
			return err
		}
		if _, err := output.Write([]byte{current}); err != nil {
			return err
		}
		if inString {
			if current < 0x20 {
				return fmt.Errorf("unescaped control byte in JSON string")
			}
			if escaped {
				escaped = false
			} else if current == '\\' {
				escaped = true
			} else if current == '"' {
				inString = false
			}
			continue
		}
		switch current {
		case '"':
			inString = true
		case '{', '[':
			if len(stack) >= MaxNesting {
				return fmt.Errorf("JSON nesting exceeds %d", MaxNesting)
			}
			stack = append(stack, current)
		case '}', ']':
			expected := byte('{')
			if current == ']' {
				expected = '['
			}
			if stack[len(stack)-1] != expected {
				return fmt.Errorf("mismatched JSON delimiter")
			}
			stack = stack[:len(stack)-1]
		}
	}
	return nil
}

func ReadValueDelimiter(input *bufio.Reader) (byte, error) {
	delimiter, err := ReadNonSpace(input)
	if err != nil {
		return 0, err
	}
	if delimiter != ',' && delimiter != '}' {
		return 0, fmt.Errorf("invalid JSON value delimiter")
	}
	return delimiter, nil
}

func ReadNonSpace(input *bufio.Reader) (byte, error) {
	for {
		value, err := input.ReadByte()
		if err != nil {
			return 0, err
		}
		if !IsSpace(value) {
			return value, nil
		}
	}
}

func IsSpace(value byte) bool {
	return value == ' ' || value == '\t' || value == '\r' || value == '\n'
}

// EnsureEOF rejects any non-whitespace bytes after a top-level JSON value.
func EnsureEOF(input *bufio.Reader) error {
	for {
		remaining, err := input.ReadByte()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		if !IsSpace(remaining) {
			return fmt.Errorf("JSON value contains trailing data")
		}
	}
}
