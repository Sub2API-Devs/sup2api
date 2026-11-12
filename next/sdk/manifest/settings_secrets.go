package manifest

import (
	"encoding/json"
	"slices"
	"sort"
	"strconv"
	"strings"
)

// SecretField is a masked plugin setting (CONTRACTS §75.1). Credentials
// (writeOnly or format password) are values the plugin presents to someone
// else; sensitive fields (x-sensitive only) are addresses such as webhook
// URLs: masked on read, but not credentials themselves.
type SecretField struct {
	Path       []string
	Credential bool
}

// Pointer is the field's JSON pointer below the values ("a/b"; "~" and "/" in
// names escaped as in RFC 6901), the form schema errors use too.
func (f SecretField) Pointer() string {
	parts := make([]string, len(f.Path))
	for i, p := range f.Path {
		parts[i] = pointerEscaper.Replace(p)
	}
	return strings.Join(parts, "/")
}

var (
	pointerEscaper   = strings.NewReplacer("~", "~0", "/", "~1")
	pointerUnescaper = strings.NewReplacer("~1", "/", "~0", "~")
)

// MaxSecretDepth bounds the walk through nested object properties: a field
// may sit at most this many properties deep to be masked on its own.
const MaxSecretDepth = 8

// SettingsSecrets reads the secret markers (writeOnly, format password,
// x-sensitive) of a settings JSON Schema. It is the one reading of them: the
// packaging check and the core's masking both call it.
//
// fields are the markers a value path leads to - properties of nested object
// properties, at most MaxSecretDepth deep - sorted by pointer. A marked field
// is masked as a whole, so nothing below it is listed.
//
// unreachable are the schema locations (JSON pointers, sorted) of the markers
// no fixed value path leads to, which therefore cannot be masked one by one:
// those under items, additionalProperties, patternProperties, allOf/anyOf/
// oneOf, if/then/else, $defs and every other keyword holding a schema, and
// those deeper than MaxSecretDepth. In a schema that holds any marker, every
// reference ("$ref", "$dynamicRef", "$recursiveRef") is unreachable too: where
// it leads is not worked out, so a schema with secrets does without them. The
// root itself ("") is unreachable when it is marked or the schema is not a
// JSON object. A package whose settings schema has any is refused at
// packaging time; UnmaskableFields says what the core masks for one that is
// already installed.
//
// The walk visits every schema node once; each level copies its location
// path, so the cost also grows with the nesting depth.
func SettingsSecrets(schema []byte) (fields []SecretField, unreachable []string) {
	var root map[string]any
	if json.Unmarshal(schema, &root) != nil || root == nil {
		return []SecretField{}, []string{""}
	}
	w := &secretWalk{refsUnreachable: holdsMarker(root), fields: []SecretField{}}
	if secret, _ := marked(root); secret {
		w.unreachable = append(w.unreachable, "")
	}
	w.object(root, nil, "")
	sort.Slice(w.fields, func(i, j int) bool { return w.fields[i].Pointer() < w.fields[j].Pointer() })
	slices.Sort(w.unreachable)
	return w.fields, slices.Compact(w.unreachable)
}

// UnmaskableFields turns the unreachable markers of SettingsSecrets into what
// has to be masked instead: the top-level settings that contain them, or all
// of them when a marker is not below one top-level property. Markers inside
// $defs/definitions are skipped: they only matter where a reference uses
// them, and every reference of such a schema is reported on its own.
func UnmaskableFields(unreachable []string) (fields []string, all bool) {
	for _, loc := range unreachable {
		parts := strings.Split(strings.TrimPrefix(loc, "/"), "/")
		switch {
		case parts[0] == "$defs" || parts[0] == "definitions":
		case parts[0] == "properties" && len(parts) > 1:
			fields = append(fields, pointerUnescaper.Replace(parts[1]))
		default:
			all = true
		}
	}
	slices.Sort(fields)
	return slices.Compact(fields), all
}

// secretWalk collects the result of SettingsSecrets.
type secretWalk struct {
	// refsUnreachable: the schema holds a marker somewhere, so no reference
	// in it can be trusted to lead away from one.
	refsUnreachable bool
	fields          []SecretField
	unreachable     []string
}

// dataKeywords hold instance data, not schemas: nothing in them is a marker.
var dataKeywords = map[string]bool{"default": true, "examples": true, "const": true, "enum": true}

// schemaMaps are the keywords whose value maps names to schemas: its keys are
// names chosen by the author, not keywords. ("dependencies" is the draft-07
// form of dependentSchemas.)
var schemaMaps = map[string]bool{"properties": true, "patternProperties": true, "$defs": true, "definitions": true,
	"dependentSchemas": true, "dependencies": true}

// refKeywords reference another schema.
var refKeywords = []string{"$ref", "$dynamicRef", "$recursiveRef"}

// marked classifies the node's own markers.
func marked(node map[string]any) (secret, credential bool) {
	writeOnly, _ := node["writeOnly"].(bool)
	format, _ := node["format"].(string)
	sensitive, _ := node["x-sensitive"].(bool)
	credential = writeOnly || format == "password"
	return credential || sensitive, credential
}

// holdsMarker reports whether any object below val looks marked. It reads
// every value, data keywords included: a reference may point anywhere.
func holdsMarker(val any) bool {
	switch v := val.(type) {
	case []any:
		return slices.ContainsFunc(v, holdsMarker)
	case map[string]any:
		if secret, _ := marked(v); secret {
			return true
		}
		for _, child := range v {
			if holdsMarker(child) {
				return true
			}
		}
	}
	return false
}

// refs records the references of a schema node when they count as unreachable.
func (w *secretWalk) refs(node map[string]any, loc string) {
	if !w.refsUnreachable {
		return
	}
	for _, kw := range refKeywords {
		if _, ok := node[kw].(string); ok {
			w.unreachable = append(w.unreachable, loc+"/"+kw)
		}
	}
}

// object walks a schema whose value is reached by path: its properties are
// reachable fields, everything else it holds is not.
func (w *secretWalk) object(node map[string]any, path []string, loc string) {
	w.refs(node, loc)
	for key, val := range node {
		if key != "properties" {
			w.scan(key, val, loc+"/"+pointerEscaper.Replace(key))
			continue
		}
		props, _ := val.(map[string]any)
		for name, raw := range props {
			prop, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			w.property(prop, append(slices.Clone(path), name), loc+"/properties/"+pointerEscaper.Replace(name))
		}
	}
}

// property handles one reachable property: a marked one is a field, an
// unmarked one is walked further while the depth allows.
func (w *secretWalk) property(prop map[string]any, path []string, loc string) {
	secret, credential := marked(prop)
	switch {
	case secret:
		w.fields = append(w.fields, SecretField{Path: path, Credential: credential})
	case len(path) >= MaxSecretDepth:
		w.scan("", prop, loc)
	default:
		w.object(prop, path, loc)
	}
}

// scan records every marker below val, the value of keyword key ("" for a
// schema) that no value path leads through, as unreachable.
func (w *secretWalk) scan(key string, val any, loc string) {
	if dataKeywords[key] {
		return
	}
	switch v := val.(type) {
	case []any:
		for i, item := range v {
			w.scan("", item, loc+"/"+strconv.Itoa(i))
		}
	case map[string]any:
		if schemaMaps[key] {
			for name, child := range v {
				w.scan("", child, loc+"/"+pointerEscaper.Replace(name))
			}
			return
		}
		if secret, _ := marked(v); secret {
			w.unreachable = append(w.unreachable, loc)
			return
		}
		w.refs(v, loc)
		for k, child := range v {
			w.scan(k, child, loc+"/"+pointerEscaper.Replace(k))
		}
	}
}
