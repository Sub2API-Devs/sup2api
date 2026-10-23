package engine

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
)

type Object = map[string]any

func decodeObject(data []byte) (Object, error) {
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	var o Object
	if err := dec.Decode(&o); err != nil {
		return nil, err
	}
	if o == nil {
		return nil, fmt.Errorf("expected a JSON object")
	}
	var rest any
	if err := dec.Decode(&rest); err != io.EOF {
		return nil, fmt.Errorf("expected exactly one JSON object")
	}
	return o, nil
}
func keys(o Object, names ...string) error {
	for k := range o {
		found := false
		for _, n := range names {
			if k == n {
				found = true
				break
			}
		}
		if !found {
			return fmt.Errorf("unsupported field %q", k)
		}
	}
	return nil
}
func str(o Object, k string) string { s, _ := o[k].(string); return s }

func digest(v any) string {
	b, _ := json.Marshal(v)
	s := sha256.Sum256(b)
	return hex.EncodeToString(s[:])
}
