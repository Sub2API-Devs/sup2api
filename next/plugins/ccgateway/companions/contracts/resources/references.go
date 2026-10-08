package resources

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
)

const ResourceIDsHeader = "X-CCGateway-Resource-Ids"

type Reference struct{ Path, ID, Kind string }

// ScanReferences follows only Anthropic content-block positions. It never
// interprets arbitrary keys inside tool inputs, tool schemas, or text as IDs.
func ScanReferences(body []byte) ([]Reference, error) {
	dec := json.NewDecoder(bytes.NewReader(body))
	dec.UseNumber()
	v, err := readJSONValue(dec, 0)
	if err != nil {
		return nil, err
	}
	if _, err = dec.Token(); err != io.EOF {
		return nil, fmt.Errorf("invalid trailing JSON")
	}
	root, ok := v.(map[string]any)
	if !ok {
		return nil, fmt.Errorf("request must be an object")
	}
	var refs []Reference
	var blocks func(any, string, int) error
	blocks = func(value any, path string, depth int) error {
		if depth > 32 {
			return fmt.Errorf("resource content nesting exceeds limit")
		}
		items, _ := value.([]any)
		for i, item := range items {
			b, _ := item.(map[string]any)
			p := path + "." + strconv.Itoa(i)
			kind, _ := b["type"].(string)
			add := func(id any, where string) error {
				value, ok := id.(string)
				if !ok || !segment.MatchString(value) {
					return fmt.Errorf("invalid file reference at %s", where)
				}
				if len(refs) >= 1024 {
					return fmt.Errorf("too many file references")
				}
				refs = append(refs, Reference{where, value, "file"})
				return nil
			}
			switch kind {
			case "image", "document":
				source, _ := b["source"].(map[string]any)
				if source["type"] == "file" {
					if err := add(source["file_id"], p+".source.file_id"); err != nil {
						return err
					}
				}
				if kind == "document" && source["type"] == "content" {
					if err := blocks(source["content"], p+".source.content", depth+1); err != nil {
						return err
					}
				}
			case "tool_result":
				if err := blocks(b["content"], p+".content", depth+1); err != nil {
					return err
				}
			case "container_upload":
				if err := add(b["file_id"], p+".file_id"); err != nil {
					return err
				}
			}
		}
		return nil
	}
	messages, _ := root["messages"].([]any)
	for i, item := range messages {
		m, _ := item.(map[string]any)
		if err := blocks(m["content"], "messages."+strconv.Itoa(i)+".content", 0); err != nil {
			return nil, err
		}
	}
	return refs, nil
}

// Duplicate members would let independent JSON parsers disagree about the
// authorized path. Reject them before either scanning or rewriting a body.
func readJSONValue(d *json.Decoder, depth int) (any, error) {
	if depth > 128 {
		return nil, fmt.Errorf("JSON nesting exceeds limit")
	}
	t, err := d.Token()
	if err != nil {
		return nil, err
	}
	delim, ok := t.(json.Delim)
	if !ok {
		return t, nil
	}
	if delim == '{' {
		obj := map[string]any{}
		for d.More() {
			key, e := d.Token()
			if e != nil {
				return nil, e
			}
			k, ok := key.(string)
			if !ok {
				return nil, fmt.Errorf("invalid JSON key")
			}
			if _, exists := obj[k]; exists {
				return nil, fmt.Errorf("duplicate JSON member")
			}
			value, e := readJSONValue(d, depth+1)
			if e != nil {
				return nil, e
			}
			obj[k] = value
		}
		_, e := d.Token()
		return obj, e
	}
	if delim == '[' {
		var items []any
		for d.More() {
			v, e := readJSONValue(d, depth+1)
			if e != nil {
				return nil, e
			}
			items = append(items, v)
		}
		_, e := d.Token()
		return items, e
	}
	return nil, fmt.Errorf("unexpected JSON delimiter")
}
