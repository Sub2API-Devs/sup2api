package resources

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)

const ResourceIDsHeader = "X-CCGateway-Resource-Ids"

type Reference struct{ Path, ID, Kind string }

// ScanReferences follows only Anthropic content-block positions. It never
// interprets arbitrary keys inside tool inputs, tool schemas, or text as IDs.
func ScanReferences(body []byte) ([]Reference, error) {
	info, err := InspectRequest(body)
	return info.References, err
}

type RequestInfo struct {
	References        []Reference
	SkillVersions     []SkillReference
	Outputs           bool
	PendingPTCParents []string
}

func InspectRequest(body []byte) (RequestInfo, error) {
	var info RequestInfo
	root, err := referenceObject(body)
	if err != nil {
		return info, err
	}
	scan := &referenceScanner{}
	if err := scan.container(root["container"], "container"); err != nil {
		return info, err
	}
	if err := scan.messages(root["messages"]); err != nil {
		return info, err
	}
	info.References = scan.refs
	info.SkillVersions = scan.versions
	info.Outputs, info.PendingPTCParents, err = requestResourceCapabilities(root)
	return info, err
}

func referenceObject(body []byte) (map[string]any, error) {
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
	return root, nil
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
