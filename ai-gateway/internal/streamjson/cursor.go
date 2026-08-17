package streamjson

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

// Cursor is a bounded-memory structural JSON reader. Methods consume exactly
// one token/value and leave the following delimiter unread unless documented.
type Cursor struct {
	input *bufio.Reader
}

func NewCursor(input io.Reader) *Cursor {
	if buffered, ok := input.(*bufio.Reader); ok {
		return &Cursor{input: buffered}
	}
	return &Cursor{input: bufio.NewReaderSize(input, 32<<10)}
}

func (c *Cursor) Next() (byte, error) { return ReadNonSpace(c.input) }

func (c *Cursor) Expect(expected byte) error {
	got, err := c.Next()
	if err != nil {
		return err
	}
	if got != expected {
		return fmt.Errorf("expected JSON token %q, got %q", expected, got)
	}
	return nil
}

func (c *Cursor) Unread() error { return c.input.UnreadByte() }

func (c *Cursor) ReadString() (string, error) {
	first, err := c.Next()
	if err != nil {
		return "", err
	}
	_, value, err := ReadString(c.input, first)
	return value, err
}

// ReadStringPrefix returns a decoded prefix while validating and skipping the
// complete JSON string. It never retains more than maxRaw bytes, which keeps
// accidental huge text/base64 strings bounded in the analysis pass.
func (c *Cursor) ReadStringPrefix(maxRaw int) (string, error) {
	if maxRaw < 128 {
		maxRaw = 128
	}
	first, err := c.Next()
	if err != nil {
		return "", err
	}
	if first != '"' {
		return "", fmt.Errorf("expected JSON string")
	}
	raw := make([]byte, 0, maxRaw)
	raw = append(raw, first)
	escaped := false
	for {
		current, err := c.input.ReadByte()
		if err != nil {
			return "", err
		}
		if current < 0x20 {
			return "", fmt.Errorf("unescaped control byte in JSON string")
		}
		if len(raw) < maxRaw {
			raw = append(raw, current)
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
			break
		}
	}
	if raw[len(raw)-1] == '"' {
		var value string
		if err := json.Unmarshal(raw, &value); err != nil {
			return "", err
		}
		return value, nil
	}
	// The string exceeded maxRaw. Find the longest syntactically complete raw
	// prefix and close it with a quote; only its beginning is needed by callers.
	for end := len(raw); end > 1; end-- {
		candidate := append(append([]byte(nil), raw[:end]...), '"')
		var value string
		if json.Unmarshal(candidate, &value) == nil {
			return value, nil
		}
	}
	return "", fmt.Errorf("cannot decode JSON string prefix")
}

// CopyValue copies one raw JSON value and leaves its delimiter unread.
func (c *Cursor) CopyValue(output io.Writer) error {
	first, err := c.Next()
	if err != nil {
		return err
	}
	if first == ',' || first == '}' || first == ']' {
		return fmt.Errorf("empty JSON value")
	}
	if _, err := output.Write([]byte{first}); err != nil {
		return err
	}
	if first == '"' {
		return copyStringValue(c.input, output)
	}
	if first == '{' || first == '[' {
		return copyCompositeValue(c.input, output, first)
	}
	primitive := []byte{first}
	for {
		current, err := c.input.ReadByte()
		if err == io.EOF {
			if !json.Valid(primitive) {
				return fmt.Errorf("invalid JSON primitive")
			}
			return nil
		}
		if err != nil {
			return err
		}
		if current == ',' || current == '}' || current == ']' {
			if !json.Valid(primitive) {
				return fmt.Errorf("invalid JSON primitive")
			}
			return c.input.UnreadByte()
		}
		if IsSpace(current) {
			if !json.Valid(primitive) {
				return fmt.Errorf("invalid JSON primitive")
			}
			return nil
		}
		if len(primitive) >= 1024 {
			return fmt.Errorf("JSON primitive exceeds limit")
		}
		primitive = append(primitive, current)
		if _, err := output.Write([]byte{current}); err != nil {
			return err
		}
	}
}

func (c *Cursor) SkipValue() error { return c.CopyValue(io.Discard) }

func (c *Cursor) ReadRawValue(maxBytes int) ([]byte, error) {
	if maxBytes <= 0 {
		return nil, fmt.Errorf("raw JSON value limit must be positive")
	}
	var value bytes.Buffer
	limited := &boundedWriter{writer: &value, remaining: int64(maxBytes)}
	if err := c.CopyValue(limited); err != nil {
		return nil, err
	}
	return value.Bytes(), nil
}

// Delimiter consumes a comma or the provided closing token. It returns true
// when another array/object element follows.
func (c *Cursor) Delimiter(closing byte) (bool, error) {
	next, err := c.Next()
	if err != nil {
		return false, err
	}
	switch next {
	case ',':
		return true, nil
	case closing:
		return false, nil
	default:
		return false, fmt.Errorf("expected comma or %q, got %q", closing, next)
	}
}

func (c *Cursor) EnsureEOF() error { return EnsureEOF(c.input) }

type boundedWriter struct {
	writer    io.Writer
	remaining int64
}

func (w *boundedWriter) Write(p []byte) (int, error) {
	if int64(len(p)) > w.remaining {
		return 0, fmt.Errorf("JSON value exceeds configured limit")
	}
	n, err := w.writer.Write(p)
	w.remaining -= int64(n)
	return n, err
}
