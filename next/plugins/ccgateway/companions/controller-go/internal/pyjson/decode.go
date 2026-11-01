package pyjson

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
)

// Decode is json.loads: objects become Ordered (insertion order; a repeated
// key keeps its first position and takes the last value, like a dict),
// arrays []any, numbers json.Number, strings, bools and nil. Exactly one
// value surrounded by optional whitespace is accepted.
//
// Deviations from Python, all for input the core never sends: NaN and
// Infinity literals are refused; invalid UTF-8 and lone surrogate escapes
// become U+FFFD instead of raising or being kept.
func Decode(data []byte) (any, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	v, err := decodeValue(dec, 0)
	if err != nil {
		return nil, err
	}
	if _, err := dec.Token(); err != io.EOF {
		if err == nil {
			return nil, errors.New("pyjson: extra data")
		}
		return nil, err
	}
	return v, nil
}

// DecodeObject is Decode for a document that must be a JSON object.
func DecodeObject(data []byte) (Ordered, error) {
	v, err := Decode(data)
	if err != nil {
		return nil, err
	}
	o, ok := v.(Ordered)
	if !ok {
		return nil, errors.New("pyjson: not a JSON object")
	}
	return o, nil
}

func decodeValue(dec *json.Decoder, depth int) (any, error) {
	if depth > maxDepth {
		return nil, errors.New("pyjson: nesting too deep")
	}
	tok, err := dec.Token()
	if err != nil {
		if err == io.EOF {
			return nil, io.ErrUnexpectedEOF
		}
		return nil, err
	}
	switch t := tok.(type) {
	case json.Delim:
		switch t {
		case '{':
			o := Ordered{}
			for dec.More() {
				kt, err := dec.Token()
				if err != nil {
					return nil, err
				}
				key, ok := kt.(string)
				if !ok {
					return nil, fmt.Errorf("pyjson: object key %v", kt)
				}
				v, err := decodeValue(dec, depth+1)
				if err != nil {
					return nil, err
				}
				o.Set(key, v)
			}
			if _, err := dec.Token(); err != nil { // '}'
				return nil, err
			}
			return o, nil
		case '[':
			list := []any{}
			for dec.More() {
				v, err := decodeValue(dec, depth+1)
				if err != nil {
					return nil, err
				}
				list = append(list, v)
			}
			if _, err := dec.Token(); err != nil { // ']'
				return nil, err
			}
			return list, nil
		}
		return nil, fmt.Errorf("pyjson: unexpected %v", t)
	default:
		return tok, nil // string, json.Number, bool, nil
	}
}

// Plain converts Ordered objects in v to map[string]any, recursively (for
// callers that do not care about key order).
func Plain(v any) any {
	switch x := v.(type) {
	case Ordered:
		m := make(map[string]any, len(x))
		for _, kv := range x {
			m[kv.Key] = Plain(kv.Value)
		}
		return m
	case []any:
		out := make([]any, len(x))
		for i, item := range x {
			out[i] = Plain(item)
		}
		return out
	}
	return v
}

// FromGo converts a value built from Go types (maps, slices, structs, typed
// numbers) into the decoded form (Ordered, []any, json.Number, ...) by
// encoding and decoding it.
func FromGo(v any) (any, error) {
	b, err := Marshal(v)
	if err != nil {
		return nil, err
	}
	return Decode(b)
}
