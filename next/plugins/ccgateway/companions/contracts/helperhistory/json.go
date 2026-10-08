package helperhistory

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

// CanonicalDigest hashes strict JSON with sorted object keys, ordered arrays and
// original number lexemes. Object whitespace is insignificant, not string bytes.
func CanonicalDigest(raw []byte) (string, error) {
	v, e := strictValue(raw)
	if e != nil {
		return "", e
	}
	b, e := json.Marshal(v)
	if e != nil {
		return "", e
	}
	return Digest(b), nil
}
func strictValue(raw []byte) (any, error) {
	return strictValueBound(raw, MaxPayloadBytes)
}
func strictValueBound(raw []byte, limit int) (any, error) {
	if len(raw) > limit {
		return nil, fmt.Errorf("helper history JSON too large")
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.UseNumber()
	v, e := readValue(d, 0)
	if e != nil {
		return nil, e
	}
	if _, e = d.Token(); e != io.EOF {
		return nil, fmt.Errorf("trailing helper history JSON")
	}
	return v, nil
}
func readValue(d *json.Decoder, depth int) (any, error) {
	if depth > 128 {
		return nil, fmt.Errorf("helper history nesting exceeds limit")
	}
	token, e := d.Token()
	if e != nil {
		return nil, e
	}
	delim, ok := token.(json.Delim)
	if !ok {
		return token, nil
	}
	switch delim {
	case '{':
		out := map[string]any{}
		for d.More() {
			key, e := d.Token()
			if e != nil {
				return nil, e
			}
			s, ok := key.(string)
			if !ok {
				return nil, fmt.Errorf("invalid JSON key")
			}
			if _, ok = out[s]; ok {
				return nil, fmt.Errorf("duplicate helper history JSON key")
			}
			v, e := readValue(d, depth+1)
			if e != nil {
				return nil, e
			}
			out[s] = v
		}
		_, e = d.Token()
		return out, e
	case '[':
		out := []any{}
		for d.More() {
			v, e := readValue(d, depth+1)
			if e != nil {
				return nil, e
			}
			out = append(out, v)
		}
		_, e = d.Token()
		return out, e
	default:
		return nil, fmt.Errorf("unexpected JSON delimiter")
	}
}
